import numpy as np
import argparse
import cv2
import os
import subprocess
import io
from rembg import remove
from typing import List, Union
from tqdm import tqdm

# Configuration constants
ALPHA_THRESHOLD = 50  # Threshold for considering a pixel visible (0-255)
VISIBILITY_RATIO = 0.5  # Ratio of visible pixels needed for binary transparency
VALID_IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg')

# Move these outside of __main__ so they can be imported
ALPHA_THRESHOLD = 50
VISIBILITY_RATIO = 0.5
VALID_IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg')

# Create a function to handle the command line version
def run_cli():
    parser = argparse.ArgumentParser()
    parser.add_argument('input_dir', type=str, help="input directory containing images to process")
    parser.add_argument('output_dir', type=str, help="output directory for processed images")
    parser.add_argument('-r', '--ratio', type=int, default=8, help="the compression ratio")
    parser.add_argument('-a', '--allow-transparent', action='store_true', help="allow transparency")
    args = parser.parse_args()
    
    # Your existing main logic here
    print("Starting script")
    print(f"Input directory: {args.input_dir}")
    print(f"Output directory: {args.output_dir}")

    assert os.path.exists(args.input_dir), f"Failed to find input directory: {args.input_dir}"
    os.makedirs(args.output_dir, exist_ok=True)
    spritesheet_dir = os.path.join(os.getcwd(), "spritesheets")
    os.makedirs(spritesheet_dir, exist_ok=True)
    print(f"Spritesheet directory: {spritesheet_dir}")

    process_directory(args.input_dir, args.output_dir, spritesheet_dir)
    print("Script completed")

def compress_image(input_img: Union[str, np.ndarray], ratio: int = 8, allow_transparent: bool = False) -> np.ndarray:
    """
    Compress an image by reducing blocks of pixels to their median values.
    
    Args:
        input_img: Either a file path to an image or a numpy array containing image data
        ratio: The compression ratio
        allow_transparent: Whether to allow transparency in the output pixels
        
    Returns:
        np.ndarray: Compressed image as a numpy array
        
    Raises:
        TypeError: If input_img is neither a string nor numpy array
        ValueError: If image has invalid number of color channels
        AssertionError: If image dimensions aren't divisible by compression ratio
    """
    global R  # We'll still use R internally but set it based on the parameter
    R = ratio
    
    if isinstance(input_img, str):
        img = cv2.imread(input_img, cv2.IMREAD_UNCHANGED) * 1.0
    elif isinstance(input_img, np.ndarray):
        img = input_img * 1.0
    else:
        raise TypeError("Input must be either a file path (str) or a numpy array")

    assert img.shape[0] % R == 0, f"{img.shape[0]} % {R} != 0"
    assert img.shape[1] % R == 0, f"{img.shape[1]} % {R} != 0"

    if img.shape[2] == 3:
        out = np.zeros((img.shape[0]//R, img.shape[1]//R, 3))
        for y in range(out.shape[0]):
            for x in range(out.shape[1]):
                pixels = img[y*R:(y+1)*R, x*R:(x+1)*R].reshape(R*R, 3)
                
                b_med = np.median(pixels[:,0])
                g_med = np.median(pixels[:,1])
                r_med = np.median(pixels[:,2])

                out[y,x] = (b_med, g_med, r_med)
    elif img.shape[2] == 4:
        out = np.zeros((img.shape[0]//R, img.shape[1]//R, 4))
        for y in range(out.shape[0]):
            for x in range(out.shape[1]):
                pixels = img[y*R:(y+1)*R, x*R:(x+1)*R].reshape(R*R, 4)
                visible = pixels[pixels[:,3] > 50]
                if visible.shape[0] == 0:
                    continue
                
                b_med = np.median(visible[:,0])
                g_med = np.median(visible[:,1])
                r_med = np.median(visible[:,2])
                if allow_transparent:
                    a_med = np.median(pixels[:,3])
                else:
                    a_med = 0.0 if visible.shape[0] < pixels.shape[0] * 0.5 else 255.0

                out[y,x] = (b_med, g_med, r_med, a_med)
    else:
        raise ValueError(f"Image has {img.shape[2]} color channels, expected 3 or 4, from {filepath}")

    return out

def create_spritesheet(images: List[np.ndarray], output_path: str) -> None:
    """
    Combine multiple images horizontally into a single spritesheet.
    
    Args:
        images: List of numpy arrays containing image data
        output_path: Path where the spritesheet will be saved
        
    Raises:
        AssertionError: If fewer than 2 images provided or images have different heights
    """
    assert len(images) >= 2, f"Cannot create spritesheet with only {len(images)} images, at least 2 required"
    assert all(img.shape[0] == images[0].shape[0] for img in images[1:])

    sheet = np.zeros((images[0].shape[0], sum(img.shape[1] for img in images), 4))
    offset = 0
    for img in images:
        sheet[:, offset:offset+img.shape[1]] = img
        offset += img.shape[1]
    cv2.imwrite(output_path, sheet)

def remove_background(input_path: str) -> np.ndarray:
    """
    Remove the background from an image using the rembg library.
    
    Args:
        input_path: Path to the input image
        
    Returns:
        np.ndarray: Image with background removed
        
    Raises:
        IOError: If the input file cannot be read
    """
    try:
        with open(input_path, 'rb') as file:
            input_data = file.read()
        output_data = remove(input_data)
        return cv2.imdecode(np.frombuffer(output_data, np.uint8), cv2.IMREAD_UNCHANGED)
    except Exception as e:
        raise IOError(f"Failed to process image {input_path}: {str(e)}")

def process_directory(input_dir: str, output_dir: str, spritesheet_dir: str) -> None:
    """
    Process all images in a directory and its subdirectories.
    
    For each image:
    1. Removes the background
    2. Compresses the image using the specified ratio
    3. Saves individual processed images
    4. Creates a spritesheet for each directory containing multiple images
    
    Args:
        input_dir: Directory containing source images
        output_dir: Directory where processed images will be saved
        spritesheet_dir: Directory where spritesheets will be saved
    """
    # First, count total files to process
    total_files = sum(len([f for f in files if f.lower().endswith(VALID_IMAGE_EXTENSIONS)])
                     for _, _, files in os.walk(input_dir))
    
    with tqdm(total=total_files, desc="Processing images") as pbar:
        for root, dirs, files in os.walk(input_dir):
            try:
                relative_path = os.path.relpath(root, input_dir)
                current_output_dir = os.path.join(output_dir, relative_path)
                os.makedirs(current_output_dir, exist_ok=True)

                image_files = [f for f in files if f.lower().endswith(VALID_IMAGE_EXTENSIONS)]
                if not image_files:
                    continue

                all_imgs = []
                for file in image_files:
                    try:
                        input_path = os.path.join(root, file)
                        img_no_bg = remove_background(input_path)
                        img_compressed = compress_image(img_no_bg)
                        all_imgs.append(img_compressed)
                        
                        output_path = os.path.join(current_output_dir, file)
                        cv2.imwrite(output_path, img_compressed)
                        pbar.update(1)  # Update progress bar
                    except Exception as e:
                        tqdm.write(f"Error processing {file}: {str(e)}")  # Use tqdm.write instead of print
                        continue

                if spritesheet_dir and len(all_imgs) >= 2:
                    try:
                        relative_spritesheet_dir = os.path.join(spritesheet_dir, relative_path)
                        os.makedirs(relative_spritesheet_dir, exist_ok=True)
                        
                        spritesheet_filename = f"{os.path.basename(root)}.png"
                        spritesheet_path = os.path.join(relative_spritesheet_dir, spritesheet_filename)
                        
                        tqdm.write(f"Creating spritesheet: {spritesheet_path}")  # Use tqdm.write instead of print
                        create_spritesheet(all_imgs, spritesheet_path)
                    except Exception as e:
                        tqdm.write(f"Error creating spritesheet for {root}: {str(e)}")
                    
            except Exception as e:
                tqdm.write(f"Error processing directory {root}: {str(e)}")
                continue

if __name__ == "__main__":
    run_cli()
