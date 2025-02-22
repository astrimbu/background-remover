from flask import Flask, request, send_file, render_template, jsonify
from flask_cors import CORS
from rembg import remove, new_session
from PIL import Image
import io
import numpy as np
import json
import requests
import base64
from pathlib import Path
import time
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Available models matching frontend's AVAILABLE_MODELS
AVAILABLE_MODELS = {
    "u2net": "General Purpose (Balanced)",
    "u2net_human_seg": "Human/Portrait (Fast)",
    "isnet-general-use": "General Purpose (Fast)",
    "silueta": "General Purpose (Fastest)",
}

# ComfyUI API settings
COMFYUI_API = "http://127.0.0.1:8188"
STYLIZE_WORKFLOW_FILE = "stylize_workflow.json"
GENERATE_WORKFLOW_FILE = "generate_workflow.json"
BASE_IMAGES_DIR = "base-img"

def fit_to_canvas(image, padding_percent):
    """Fits image within the existing canvas with specified padding percentage.
    padding_percent: 0 means image extends to canvas edges, 50 means 25% padding on each side
    The canvas size stays constant - the image is scaled to create the padding effect.
    For background-removed images, considers the actual content bounds.
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # If padding is 0, return the original image
    if padding_percent == 0:
        # For transparent images, we need to scale content to canvas edges
        alpha = image.getchannel('A')
        bbox = alpha.getbbox()  # Returns (left, top, right, bottom)
        if bbox:  # If there is non-transparent content
            # Calculate content dimensions
            content_width = bbox[2] - bbox[0]
            content_height = bbox[3] - bbox[1]
            canvas_width, canvas_height = image.size
            
            # Calculate scale to fit content to canvas edges
            width_ratio = canvas_width / content_width
            height_ratio = canvas_height / content_height
            scale = min(width_ratio, height_ratio)
            
            # Calculate final dimensions
            final_width = int(content_width * scale)
            final_height = int(content_height * scale)
            
            # Create new image with original canvas dimensions
            new_image = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))
            
            # Extract and scale content
            content = image.crop(bbox)
            resized_content = content.resize((final_width, final_height), Image.Resampling.LANCZOS)
            
            # Center the content
            paste_x = (canvas_width - final_width) // 2
            paste_y = (canvas_height - final_height) // 2
            
            # Paste the resized content
            new_image.paste(resized_content, (paste_x, paste_y))
            return new_image
            
        return image
    
    # Get canvas dimensions (original image dimensions)
    canvas_width, canvas_height = image.size
    
    # Check if image has transparency by looking at alpha channel
    alpha = image.getchannel('A')
    has_transparency = alpha.getextrema()[0] < 255  # True if any pixel is not fully opaque
    
    if has_transparency:
        # For background-removed images, use content bounds
        bbox = alpha.getbbox()  # Returns (left, top, right, bottom)
        if bbox is None:  # Image is completely transparent
            return image
            
        # Calculate content dimensions
        content_width = bbox[2] - bbox[0]
        content_height = bbox[3] - bbox[1]
        
        # Calculate the target size based on padding percentage
        # padding_percent of 50 means the content should take up 50% of the canvas
        target_width = int(canvas_width * (1 - padding_percent / 100))
        target_height = int(canvas_height * (1 - padding_percent / 100))
        
        # Calculate scale ratios to fit content within target size while maintaining aspect ratio
        width_ratio = target_width / content_width
        height_ratio = target_height / content_height
        scale = min(width_ratio, height_ratio)
        
        # Calculate final dimensions
        final_width = int(content_width * scale)
        final_height = int(content_height * scale)
        
        # Create new image with original canvas dimensions and transparent background
        new_image = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))
        
        # Extract content using bbox and resize it
        content = image.crop(bbox)
        resized_content = content.resize((final_width, final_height), Image.Resampling.LANCZOS)
        
        # Calculate paste position to center the content
        paste_x = (canvas_width - final_width) // 2
        paste_y = (canvas_height - final_height) // 2
        
        # Paste the resized content
        new_image.paste(resized_content, (paste_x, paste_y))
        
        return new_image
    else:
        # For regular images, use the original padding behavior
        # Calculate the target size based on padding percentage
        target_width = int(canvas_width * (1 - padding_percent / 100))
        target_height = int(canvas_height * (1 - padding_percent / 100))
        
        # Create new image with original dimensions and transparent background
        new_image = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))
        
        # Resize the original image
        resized_content = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Calculate paste position to center the content
        paste_x = (canvas_width - target_width) // 2
        paste_y = (canvas_height - target_height) // 2
        
        # Paste the resized content
        new_image.paste(resized_content, (paste_x, paste_y))
        
        return new_image

# Initialize with default model
session = new_session("u2net")

def load_workflow(workflow_file):
    try:
        with open(workflow_file, 'r') as f:
            workflow = json.load(f)
            print(f"Loaded workflow from {workflow_file}")
            print(f"Workflow contains {len(workflow)} nodes")
            return workflow
    except Exception as e:
        print(f"Error loading workflow: {str(e)}")
        raise

def get_base_images():
    """Get list of base images from the base-img directory"""
    base_dir = Path(BASE_IMAGES_DIR)
    if not base_dir.exists():
        base_dir.mkdir(exist_ok=True)
    return [f.name for f in base_dir.glob("base-*.png")]

def modify_workflow(workflow, style_image_path=None, base_image=None, prompt=None, negative_prompt=None, steps=20, batch_size=1, weight_style=0.5):
    """Modify the workflow with the given parameters"""
    print("Starting workflow modification...")
    workflow_copy = json.loads(json.dumps(workflow))
    
    # Add random seed generation
    if '3' in workflow_copy:
        random_seed = np.random.randint(np.iinfo(np.int32).max)
        print(f"Setting random seed: {random_seed}")
        workflow_copy['3']['inputs']['seed'] = int(random_seed)
    
    # Update empty latent image batch size (node 5)
    if '5' in workflow_copy:
        print(f"Setting batch size: {batch_size}")
        workflow_copy['5']['inputs']['batch_size'] = int(batch_size)
        print(f"Updated empty latent node: {workflow_copy['5']}")
    
    # Update style image path (node 12)
    if style_image_path and '12' in workflow_copy:
        print(f"Setting style image path: {style_image_path}")
        workflow_copy['12']['inputs']['image'] = style_image_path
        workflow_copy['12']['inputs']['upload'] = 'file'
        print(f"Updated style image node: {workflow_copy['12']}")
    
    # Update base image path (node 47)
    if base_image and '47' in workflow_copy:
        print(f"Setting base image: {base_image}")
        workflow_copy['47']['inputs']['image'] = base_image
        print(f"Updated base image node: {workflow_copy['47']}")
    
    # Update positive prompt (node 6)
    if prompt and '6' in workflow_copy:
        print(f"Setting prompt: {prompt}")
        workflow_copy['6']['inputs']['text'] = prompt
        print(f"Updated positive prompt node: {workflow_copy['6']}")
    
    # Update negative prompt (node 7)
    if negative_prompt and '7' in workflow_copy:
        print(f"Setting negative prompt: {negative_prompt}")
        workflow_copy['7']['inputs']['text'] = negative_prompt
        print(f"Updated negative prompt node: {workflow_copy['7']}")
    
    # Update steps (node 3)
    if steps and '3' in workflow_copy:
        print(f"Setting steps: {steps}")
        workflow_copy['3']['inputs']['steps'] = int(steps)
        print(f"Updated KSampler node: {workflow_copy['3']}")
    
    # Update weight_style (node 32)
    if '32' in workflow_copy:
        print(f"Setting weight_style: {weight_style}")
        workflow_copy['32']['inputs']['weight_style'] = float(weight_style)
        print(f"Updated IPAdapter node: {workflow_copy['32']}")
    
    print("Workflow modification complete")
    return workflow_copy

def modify_generate_workflow(workflow, prompt=None, negative_prompt=None, steps=10, batch_size=1, cfg=4, checkpoint=None, width=800, height=800):
    """Modify the generation workflow with the given parameters"""
    print("Starting generation workflow modification...")
    workflow_copy = json.loads(json.dumps(workflow))
    
    # Add random seed generation
    if '3' in workflow_copy:
        random_seed = np.random.randint(np.iinfo(np.int32).max)
        print(f"Setting random seed: {random_seed}")
        workflow_copy['3']['inputs']['seed'] = int(random_seed)
        
        # Update cfg
        print(f"Setting cfg: {cfg}")
        workflow_copy['3']['inputs']['cfg'] = float(cfg)
    
    # Update empty latent image batch size and dimensions (node 5)
    if '5' in workflow_copy:
        print(f"Setting batch size: {batch_size}")
        workflow_copy['5']['inputs']['batch_size'] = int(batch_size)
        print(f"Setting dimensions: {width}x{height}")
        workflow_copy['5']['inputs']['width'] = int(width)
        workflow_copy['5']['inputs']['height'] = int(height)
    
    # Update checkpoint (node 4)
    if checkpoint and '4' in workflow_copy:
        print(f"Setting checkpoint: {checkpoint}")
        workflow_copy['4']['inputs']['ckpt_name'] = checkpoint
    
    # Update positive prompt (node 6)
    if prompt and '6' in workflow_copy:
        print(f"Setting prompt: {prompt}")
        workflow_copy['6']['inputs']['text'] = prompt
    
    # Update negative prompt (node 7)
    if negative_prompt and '7' in workflow_copy:
        print(f"Setting negative prompt: {negative_prompt}")
        workflow_copy['7']['inputs']['text'] = negative_prompt
    
    # Update steps (node 3)
    if steps and '3' in workflow_copy:
        print(f"Setting steps: {steps}")
        workflow_copy['3']['inputs']['steps'] = int(steps)
    
    print("Generation workflow modification complete")
    return workflow_copy

@app.route('/')
def index():
    return render_template('index.html', models=AVAILABLE_MODELS)

@app.route('/switch-model', methods=['POST'])
def switch_model():
    try:
        model_name = request.json.get('model')
        global session
        session = new_session(model_name)
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500

@app.route('/models', methods=['GET'])
def get_models():
    return jsonify(AVAILABLE_MODELS)

def process_image(image, settings):
    """Process image with background removal and optional fitting/resizing"""
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Create a new session with the selected model
    session = new_session(settings['model'])
    
    # Remove background using settings from frontend
    output = remove(
        image,
        session=session,  # Use the model-specific session
        alpha_matting=True,
        alpha_matting_foreground_threshold=settings['foreground_threshold'],
        alpha_matting_erode_size=settings['erode_size']
    )
    
    # Apply padding if enabled
    if settings.get('border_enabled', False):  # Use get() with default for safety
        padding_size = settings.get('border_size', 0)
        print(f"Applying padding size: {padding_size}%")  # Debug log
        output = fit_to_canvas(output, padding_percent=padding_size)
    
    # Apply resizing if specified
    target_width = settings.get('target_width')
    target_height = settings.get('target_height')
    if target_width or target_height:
        current_width, current_height = output.size
        print(f"Current dimensions: {current_width}x{current_height}")  # Debug log
        if settings.get('maintain_aspect_ratio', True):
            # Calculate new dimensions maintaining aspect ratio
            if target_width and target_height:
                # Use the more constraining dimension
                width_ratio = target_width / current_width
                height_ratio = target_height / current_height
                ratio = min(width_ratio, height_ratio)
                new_width = int(current_width * ratio)
                new_height = int(current_height * ratio)
            elif target_width:
                ratio = target_width / current_width
                new_width = target_width
                new_height = int(current_height * ratio)
            else:  # target_height
                ratio = target_height / current_height
                new_width = int(current_width * ratio)
                new_height = target_height
        else:
            # Use exact dimensions
            new_width = target_width or current_width
            new_height = target_height or current_height
        
        print(f"Resizing to: {new_width}x{new_height}")  # Debug log
        output = output.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    return output

@app.route('/remove-background', methods=['POST'])
def remove_background():
    try:
        # Get image file and settings from request
        file = request.files.get('image')
        if not file:
            return jsonify({'error': 'No image provided'}), 400
        
        # Get settings from frontend, which will include all defaults
        settings = json.loads(request.form.get('settings', '{}'))
        
        # Load and process image
        image = Image.open(file.stream)
        output = process_image(image, settings)
        
        # Convert to bytes and return
        img_byte_arr = io.BytesIO()
        output.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return send_file(
            img_byte_arr,
            mimetype='image/png'
        )
    
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/fit-to-canvas', methods=['POST'])
def fit_image_to_canvas():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        file = request.files['image']
        padding_percent = int(request.form.get('padding', '0'))  # Default to 0 if not specified
        
        # Open and fit image to canvas
        img = Image.open(file)
        fitted_img = fit_to_canvas(img, padding_percent=padding_percent)
        
        # Save to bytes
        img_byte_arr = io.BytesIO()
        fitted_img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return send_file(
            img_byte_arr,
            mimetype='image/png'
        )
    except Exception as e:
        print(f"Error fitting image to canvas: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/resize-image', methods=['POST'])
def resize_image():
    try:
        width = int(request.form.get('width'))
        height = int(request.form.get('height'))
        file = request.files['image']
        fit_first = request.form.get('fit_first', 'true') == 'true'
        padding_percent = int(request.form.get('padding', '0'))  # Default to 0 if not specified
        
        # Open image
        img = Image.open(file)
        
        # First fit to canvas if requested
        if fit_first:
            img = fit_to_canvas(img, padding_percent=padding_percent)
        
        # Then resize
        resized_img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        # Save to bytes
        img_byte_arr = io.BytesIO()
        resized_img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return send_file(
            img_byte_arr,
            mimetype='image/png',
            as_attachment=True,
            download_name='resized.png'
        )
    except Exception as e:
        print(f"Error resizing image: {str(e)}")
        return f'Error resizing image: {str(e)}', 500

@app.route('/base-images')
def list_base_images():
    """Return list of base images"""
    images = get_base_images()
    return jsonify({
        'images': [{'name': img, 'url': f'/base-img/{img}'} for img in images]
    })

@app.route('/base-img/<path:filename>')
def serve_base_image(filename):
    """Serve base images"""
    return send_file(Path(BASE_IMAGES_DIR) / filename)

@app.route('/generate')
def generate():
    workflow = load_workflow(STYLIZE_WORKFLOW_FILE)
    # Get default prompt from workflow node 6 (CLIPTextEncode)
    default_prompt = (
        workflow.get('6', {})
        .get('inputs', {})
        .get('text', "ring, game asset icon, plain background")
    )
    return render_template('comfy.html', default_prompt=default_prompt)

@app.route('/comfyui-process', methods=['POST'])
def process_comfyui():
    try:
        print("1. Getting request parameters...")
        # Get parameters from request
        style_image = request.files.get('style_image')
        base_image = request.form.get('base_image')
        prompt = request.form.get('prompt', '')
        negative_prompt = request.form.get('negative_prompt', '')
        steps = int(request.form.get('steps', 20))
        batch_size = int(request.form.get('batch_size', 1))
        weight_style = float(request.form.get('weight_style', 0.5))
        
        print(f"Parameters: base_image={base_image}, prompt={prompt}, steps={steps}, batch_size={batch_size}, weight_style={weight_style}")
        
        # Save style image if provided
        style_image_path = None
        if style_image:
            # Create a safe filename from the original
            safe_filename = secure_filename(style_image.filename)
            # Create absolute path
            style_image_path = str(Path.cwd() / 'temp' / safe_filename)
            Path('temp').mkdir(exist_ok=True)
            style_image.save(style_image_path)
            print(f"Saved style image to {style_image_path}")
        
        print("2. Loading workflow...")
        workflow = load_workflow(STYLIZE_WORKFLOW_FILE)
        
        print("3. Modifying workflow...")
        modified_workflow = modify_workflow(
            workflow,
            style_image_path=style_image_path,
            base_image=base_image,
            prompt=prompt,
            negative_prompt=negative_prompt,
            steps=steps,
            batch_size=batch_size,
            weight_style=weight_style
        )
        
        print("4. Sending to ComfyUI API...")
        response = requests.post(f"{COMFYUI_API}/prompt", json={
            "prompt": modified_workflow,
            "client_id": "background-remover"
        })
        
        if not response.ok:
            print("ComfyUI Error Response:", response.text)
            return jsonify({'error': 'Failed to queue workflow'}), 500
            
        prompt_id = response.json()['prompt_id']
        print(f"5. Got prompt ID: {prompt_id}")
        
        # Poll for completion with exponential backoff
        max_wait_time = 300  # 5 minutes timeout
        initial_delay = 10   # Start with 10 second delay
        max_delay = 10       # Cap delay at 10 seconds
        current_delay = initial_delay
        start_time = time.time()
        
        while (time.time() - start_time) < max_wait_time:
            history_response = requests.get(f"{COMFYUI_API}/history")
            if not history_response.ok:
                print(f"Error getting history: {history_response.text}")
                time.sleep(current_delay)
                current_delay = min(current_delay * 1.5, max_delay)
                continue
                
            history = history_response.json()
            
            if prompt_id not in history:
                print(f"Prompt {prompt_id} not found in history yet")
                time.sleep(current_delay)
                current_delay = min(current_delay * 1.5, max_delay)
                continue
                
            prompt_status = history[prompt_id]
            
            if 'error' in prompt_status:
                raise Exception(f"ComfyUI Error: {prompt_status['error']}")
                
            if 'status' not in prompt_status:
                time.sleep(current_delay)
                current_delay = min(current_delay * 1.5, max_delay)
                continue
                
            if prompt_status['status'].get('completed', False):
                print(f"Prompt completed in {time.time() - start_time:.2f} seconds")
                break
                
            # If execution_start exists, we can show progress
            if 'status' in prompt_status and 'executing' in prompt_status['status']:
                execution_node = prompt_status['status']['executing']['node']
                print(f"Executing node: {execution_node}")
            
            time.sleep(current_delay)
            current_delay = min(current_delay * 1.5, max_delay)
        
        if (time.time() - start_time) >= max_wait_time:
            raise Exception("Timeout waiting for ComfyUI to process the workflow")
        
        # Get the output images
        output_images = []
        if 'outputs' in history[prompt_id]:
            for node_id, node_output in history[prompt_id]['outputs'].items():
                if 'images' in node_output:
                    for image in node_output['images']:
                        # Skip temporary preview images
                        filename = image['filename']
                        if not (filename.startswith('PB-_temp_') or 
                               filename.startswith('ComfyUI_temp_')):
                            image_url = f"{COMFYUI_API}/view?filename={filename}&subfolder={image.get('subfolder', '')}"
                            output_images.append(image_url)
        
        if not output_images:
            raise Exception("No images were generated")
        
        # Clean up temporary files
        if style_image_path:
            Path(style_image_path).unlink(missing_ok=True)
        
        return jsonify({'images': output_images})
        
    except Exception as e:
        print(f"Error in ComfyUI processing: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/save-temp-image', methods=['POST'])
def save_temp_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
        
    try:
        file = request.files['image']
        # Create temp directory if it doesn't exist
        Path('temp').mkdir(exist_ok=True)
        
        # Generate unique filename
        filename = f"temp_{int(time.time())}_{secure_filename(file.filename)}"
        filepath = Path('temp') / filename
        
        # Save the file
        file.save(filepath)
        
        # Return temporary URL
        return jsonify({
            'tempUrl': f'/temp/{filename}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/temp/<path:filename>')
def serve_temp_file(filename):
    return send_file(Path('temp') / filename)

@app.route('/comfyui-generate', methods=['POST'])
def generate_comfyui():
    try:
        # Load the generation workflow
        workflow = load_workflow(GENERATE_WORKFLOW_FILE)
        
        # Get parameters from request
        prompt = request.form.get('prompt', '')
        negative_prompt = request.form.get('negative_prompt', '')
        batch_size = int(request.form.get('batch_size', 1))
        steps = int(request.form.get('steps', 10))
        cfg = float(request.form.get('cfg', 4))
        checkpoint = request.form.get('checkpoint', None)
        width = int(request.form.get('width', 800))
        height = int(request.form.get('height', 800))
        
        # Modify workflow with parameters
        modified_workflow = modify_generate_workflow(
            workflow,
            prompt=prompt,
            negative_prompt=negative_prompt,
            steps=steps,
            batch_size=batch_size,
            cfg=cfg,
            checkpoint=checkpoint,
            width=width,
            height=height
        )
        
        # Queue the workflow
        response = requests.post(
            f"{COMFYUI_API}/prompt",
            json={
                "prompt": modified_workflow,
                "client_id": "background-remover"
            }
        )
        
        if not response.ok:
            return jsonify({'error': 'Failed to queue workflow'}), 500
            
        data = response.json()
        prompt_id = data.get('prompt_id')
        if not prompt_id:
            return jsonify({'error': 'No prompt ID received'}), 500
            
        return jsonify({
            'prompt_id': prompt_id
        })
        
    except Exception as e:
        print(f"Error in generate_comfyui: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/check-status/<prompt_id>', methods=['GET'])
def check_status(prompt_id):
    try:
        history_response = requests.get(f"{COMFYUI_API}/history")
        if not history_response.ok:
            return jsonify({'status': 'pending'})
            
        history = history_response.json()
        if prompt_id not in history:
            return jsonify({'status': 'pending'})
            
        prompt_info = history[prompt_id]
        
        # Check if completed
        if 'outputs' in prompt_info:
            output_images = []
            for node_id, node_output in prompt_info['outputs'].items():
                if 'images' in node_output:
                    for image in node_output['images']:
                        image_url = f"{COMFYUI_API}/view?filename={image['filename']}&type=temp"
                        output_images.append(image_url)
            
            if output_images:
                return jsonify({
                    'status': 'completed',
                    'images': output_images
                })
        
        return jsonify({'status': 'pending'})
        
    except Exception as e:
        print(f"Error checking status: {str(e)}")
        return jsonify({'status': 'pending'})

@app.route('/checkpoints', methods=['GET'])
def get_checkpoints():
    """Get list of available checkpoints from ComfyUI"""
    try:
        print("Fetching checkpoints from ComfyUI...")
        response = requests.get(f"{COMFYUI_API}/object_info")
        if not response.ok:
            print(f"Failed to fetch from ComfyUI: {response.status_code}")
            return jsonify({'error': 'Failed to fetch checkpoints'}), 500
            
        data = response.json()
        
        # Extract checkpoint names from the CheckpointLoaderSimple class info
        checkpoints = []
        for class_name, class_info in data.items():
            if isinstance(class_info, dict):
                if class_info.get('name') == 'CheckpointLoaderSimple':
                    input_info = class_info.get('input', {}).get('required', {}).get('ckpt_name', [])
                    if isinstance(input_info, list) and len(input_info) > 0 and isinstance(input_info[0], list):
                        checkpoints = input_info[0]
                        print(f"Found checkpoints: {checkpoints}")
                    break
        
        if not checkpoints:
            print("No checkpoints found")
            return jsonify({'error': 'No checkpoints found'}), 404
        
        return jsonify({
            'checkpoints': checkpoints
        })
        
    except Exception as e:
        print(f"Error fetching checkpoints: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/interrupt', methods=['POST'])
def interrupt_generation():
    """Interrupt the current generation process"""
    try:
        response = requests.post(f"{COMFYUI_API}/interrupt")
        if not response.ok:
            return jsonify({'error': 'Failed to interrupt generation'}), 500
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Error interrupting generation: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
