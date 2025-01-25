from flask import Flask, request, send_file, render_template
from rembg import remove, new_session
import io

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

if __name__ == '__main__':
    app.run(debug=True)
