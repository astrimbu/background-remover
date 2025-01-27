from flask import Flask, request, send_file, render_template
from rembg import remove, new_session  # neural networks
from PIL import Image
import io
import numpy as np

app = Flask(__name__)

AVAILABLE_MODELS = {
    "u2net": "General Purpose (Balanced)",
    "u2net_human_seg": "Human/Portrait (Fast)",
    "isnet-general-use": "General Purpose (Fast)",
    "silueta": "General Purpose (Fastest)",
}

DEFAULT_SETTINGS = {
    'foreground_threshold': 100,
    'background_threshold': 100,
    'erode_size': 1,
    'kernel_size': 1
}

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

@app.route('/remove-background', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return 'No image uploaded', 400
    
    try:
        file = request.files['image']
        settings = {
            'alpha_matting': request.form.get('alpha_matting') == 'true',
            'alpha_matting_foreground_threshold': int(request.form.get('foreground_threshold', DEFAULT_SETTINGS['foreground_threshold'])),
            'alpha_matting_background_threshold': int(request.form.get('background_threshold', DEFAULT_SETTINGS['background_threshold'])),
            'alpha_matting_erode_size': int(request.form.get('erode_size', DEFAULT_SETTINGS['erode_size'])),
            'alpha_matting_kernel_size': int(request.form.get('kernel_size', DEFAULT_SETTINGS['kernel_size'])),
            'post_process_mask': request.form.get('post_process') == 'true',
        }
        
        input_data = file.read()
        output_data = remove(input_data, session=session, **settings)
        
        return send_file(
            io.BytesIO(output_data),
            mimetype='image/png',
            as_attachment=True,
            download_name='no_background.png'
        )
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return f'Error processing image: {str(e)}', 500

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

if __name__ == '__main__':
    app.run(debug=True)
