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

AVAILABLE_MODELS = {
    "u2net": "General Purpose (Balanced)",
    "u2net_human_seg": "Human/Portrait (Fast)",
    "isnet-general-use": "General Purpose (Fast)",
    "silueta": "General Purpose (Fastest)",
}

DEFAULT_SETTINGS = {
    'foreground_threshold': 100,
    'background_threshold': 100,
    'erode_size': 3,
    'kernel_size': 1
}

# ComfyUI API settings
COMFYUI_API = "http://127.0.0.1:8188"
WORKFLOW_FILE = "workflow_api.json"
BASE_IMAGES_DIR = "base-img"

def fit_to_canvas(image, border_percent=10):
    """Fits image to a square canvas with specified border percentage."""
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Get the bounding box of non-transparent pixels
    alpha = np.array(image.split()[-1])
    non_empty_columns = np.where(alpha.max(axis=0) > 0)[0]
    non_empty_rows = np.where(alpha.max(axis=1) > 0)[0]
    
    if len(non_empty_rows) == 0 or len(non_empty_columns) == 0:
        return image
    
    # Get the bounds
    top = non_empty_rows[0]
    bottom = non_empty_rows[-1]
    left = non_empty_columns[0]
    right = non_empty_columns[-1]
    
    # Calculate the content dimensions
    content_width = right - left + 1
    content_height = bottom - top + 1
    
    # Calculate the target size with border
    max_dimension = max(content_width, content_height)
    border_size = int(max_dimension * (border_percent / 100))
    canvas_size = max_dimension + (2 * border_size)
    
    # Create new square image with transparent background
    new_image = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    
    # Calculate paste position to center the content
    paste_x = (canvas_size - content_width) // 2
    paste_y = (canvas_size - content_height) // 2
    
    # Crop and paste the original image
    cropped = image.crop((left, top, right + 1, bottom + 1))
    new_image.paste(cropped, (paste_x, paste_y))
    
    return new_image

# Initialize with default model
session = new_session("u2net")

def load_workflow():
    try:
        with open('workflow_api.json', 'r') as f:
            workflow = json.load(f)
            print(f"Loaded workflow from workflow_api.json")
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

@app.route('/')
def index():
    return render_template('index.html', models=AVAILABLE_MODELS, defaults=DEFAULT_SETTINGS)

@app.route('/switch-model', methods=['POST'])
def switch_model():
    try:
        model_name = request.json.get('model')
        global session
        session = new_session(model_name)
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500

@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify(AVAILABLE_MODELS)

@app.route('/api/remove-background', methods=['POST'])
def remove_background():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Get processing options
        options = json.loads(request.form.get('options', '{}'))
        model_name = options.get('model', 'u2net')
        print(f"Received options: {options}")  # Debug log
        
        # Read the image
        input_image = Image.open(file.stream)
        
        # Process the image
        session = new_session(model_name)
        
        # Convert edge softness to alpha matting thresholds
        edge_softness = options.get('foregroundThreshold', 100)
        print(f"Edge softness: {edge_softness}")  # Debug log
        
        # Invert the edge softness for foreground threshold (0 softness = high threshold = hard edges)
        # and use it directly for background threshold (high softness = high threshold = more background blending)
        fg_threshold = int(((100 - edge_softness) / 100) * 255)  # Inverted
        bg_threshold = int((edge_softness / 100) * 255)  # Direct
        
        print(f"Calculated thresholds - FG: {fg_threshold}, BG: {bg_threshold}")  # Debug log
        
        output_image = remove(
            input_image,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=fg_threshold,
            alpha_matting_background_threshold=bg_threshold,
            alpha_matting_erode_size=options.get('erodeSize', 3),
            post_process_mask=True,
            only_mask=False
        )
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return send_file(
            img_byte_arr,
            mimetype='image/png',
            as_attachment=True,
            download_name='processed.png'
        )
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/fit-to-canvas', methods=['POST'])
def fit_image_to_canvas():
    try:
        file = request.files['image']
        border_percent = int(request.form.get('border', 10))
        
        # Open and fit image to canvas
        img = Image.open(file)
        fitted_img = fit_to_canvas(img, border_percent)
        
        # Save to bytes
        img_byte_arr = io.BytesIO()
        fitted_img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return send_file(
            img_byte_arr,
            mimetype='image/png',
            as_attachment=True,
            download_name='fitted.png'
        )
    except Exception as e:
        print(f"Error fitting image to canvas: {str(e)}")
        return f'Error fitting image to canvas: {str(e)}', 500

@app.route('/resize-image', methods=['POST'])
def resize_image():
    try:
        width = int(request.form.get('width'))
        height = int(request.form.get('height'))
        file = request.files['image']
        fit_first = request.form.get('fit_first', 'true') == 'true'
        border_percent = int(request.form.get('border', 10))
        
        # Open image
        img = Image.open(file)
        
        # First fit to canvas if requested
        if fit_first:
            img = fit_to_canvas(img, border_percent)
        
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
    workflow = load_workflow()
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
        workflow = load_workflow()
        
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

if __name__ == '__main__':
    app.run(debug=True)
