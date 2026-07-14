import os
import uuid
import base64
from flask import Flask, render_template, request, jsonify
from utils.steganography import encode_image, decode_image
from PIL import Image

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB limit

# Allowed extensions
ALLOWED_EXTENSIONS = {'png', 'bmp', 'tiff', 'webp', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Create a temp directory for safe processing
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
os.makedirs(TEMP_DIR, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encode', methods=['POST'])
def encode():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file uploaded.'}), 400
        
    file = request.files['image']
    message = request.form.get('message', '').strip()
    
    if not file or file.filename == '':
        return jsonify({'success': False, 'error': 'No image file selected.'}), 400
        
    if not message:
        return jsonify({'success': False, 'error': 'Secret message cannot be empty.'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Unsupported file format. Supported: PNG, BMP, TIFF, WebP, JPG, JPEG.'}), 400

    # Ensure unique and safe filename
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_id = uuid.uuid4().hex
    temp_input_path = os.path.join(TEMP_DIR, f"in_{unique_id}.{ext}")
    temp_output_path = os.path.join(TEMP_DIR, f"out_{unique_id}.png")
    
    try:
        # Save uploaded file
        file.save(temp_input_path)
        
        # Verify the image is valid and not corrupted
        try:
            with Image.open(temp_input_path) as verify_img:
                verify_img.verify()
        except Exception:
            return jsonify({'success': False, 'error': 'Uploaded image file is corrupted or invalid.'}), 400
            
        converted_jpeg = False
        processing_input_path = temp_input_path
        
        # JPEG/JPG conversion handling
        if ext in ('jpg', 'jpeg'):
            converted_jpeg = True
            # Re-open and convert to PNG (lossless)
            try:
                with Image.open(temp_input_path) as img:
                    png_input_path = os.path.join(TEMP_DIR, f"in_{unique_id}_conv.png")
                    img.save(png_input_path, format='PNG')
                    processing_input_path = png_input_path
            except Exception as e:
                return jsonify({'success': False, 'error': f'Failed to process JPEG conversion: {str(e)}'}), 500

        # Run encoding
        try:
            encode_image(processing_input_path, message, temp_output_path)
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            return jsonify({'success': False, 'error': f'Encoding failed: {str(e)}'}), 500
            
        # Read the encoded image and convert to base64
        with open(temp_output_path, 'rb') as f:
            encoded_data = f.read()
            
        base64_data = base64.b64encode(encoded_data).decode('utf-8')
        
        # Cleanup temp files immediately
        try:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)
            if 'png_input_path' in locals() and os.path.exists(png_input_path):
                os.remove(png_input_path)
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
        except Exception:
            pass # Non-blocking cleanup error
            
        return jsonify({
            'success': True,
            'image_base64': f"data:image/png;base64,{base64_data}",
            'converted': converted_jpeg,
            'message': 'Message successfully hidden inside the image!',
            'filename': f"cloak_encoded_{unique_id[:8]}.png"
        })
        
    except Exception as e:
        # Cleanup on failure
        try:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)
            if 'png_input_path' in locals() and os.path.exists(png_input_path):
                os.remove(png_input_path)
            if os.path.exists(temp_output_path):
                os.remove(temp_output_path)
        except Exception:
            pass
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500

@app.route('/decode', methods=['POST'])
def decode():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file uploaded.'}), 400
        
    file = request.files['image']
    
    if not file or file.filename == '':
        return jsonify({'success': False, 'error': 'No image file selected.'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Unsupported file format.'}), 400
        
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_id = uuid.uuid4().hex
    temp_input_path = os.path.join(TEMP_DIR, f"dec_{unique_id}.{ext}")
    
    try:
        file.save(temp_input_path)
        
        # Verify the image is valid and not corrupted
        try:
            with Image.open(temp_input_path) as verify_img:
                verify_img.verify()
        except Exception:
            return jsonify({'success': False, 'error': 'Uploaded image file is corrupted or invalid.'}), 400
            
        # Run decoding (must open again since verify() closes/invalidates the img object)
        try:
            secret_message = decode_image(temp_input_path)
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
        except Exception as e:
            return jsonify({'success': False, 'error': f'Decoding failed: {str(e)}'}), 500
            
        # Cleanup
        try:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)
        except Exception:
            pass
            
        return jsonify({
            'success': True,
            'message': secret_message
        })
        
    except Exception as e:
        try:
            if os.path.exists(temp_input_path):
                os.remove(temp_input_path)
        except Exception:
            pass
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'error': 'The uploaded file is too large. Maximum file size allowed is 500MB.'
    }), 413

if __name__ == '__main__':
    app.run(debug=True)
