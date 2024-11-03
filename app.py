import streamlit as st
import os
from PIL import Image
import tempfile
import numpy as np
from compress import compress_image, remove_background, create_spritesheet
from datetime import datetime
import time

st.set_page_config(page_title="Image Processor", layout="centered")

def main():
    st.title("Image Processor")
    
    # Initialize session state for history if it doesn't exist
    if 'processing_history' not in st.session_state:
        st.session_state.processing_history = []

    # Sidebar controls
    with st.sidebar:
        st.header("Settings")
        compression_ratio = st.slider("Compression Ratio", min_value=2, max_value=16, value=8)
        allow_transparent = st.checkbox("Allow Transparent Pixels", value=False)
        
        # History section in sidebar
        if st.session_state.processing_history:
            st.header("Previous Spritesheets")
            for idx, entry in enumerate(reversed(st.session_state.processing_history)):
                with st.expander(f"Spritesheet {entry['timestamp'].strftime('%H:%M:%S')}"):
                    st.image(entry['data'], use_column_width=True)
                    st.download_button(
                        f"Download",
                        entry['data'],
                        file_name=entry['filename'],
                        mime="image/png"
                    )
    
    # File uploader section
    # Use a dynamic key based on a counter in session state
    if 'uploader_key' not in st.session_state:
        st.session_state.uploader_key = 0

    col1, col2 = st.columns([3, 1])
    with col1:
        uploaded_files = st.file_uploader(
            "Choose images to process", 
            accept_multiple_files=True,
            type=['png', 'jpg', 'jpeg'],
            key=f"file_uploader_{st.session_state.uploader_key}"
        )
    with col2:
        if uploaded_files:
            if st.button("Clear All", use_container_width=True):
                st.session_state.uploader_key += 1  # Get a new uploader
                st.rerun()

    # When files are uploaded
    if uploaded_files:
        # Process form
        with st.form("process_form"):
            # Get extension from first uploaded file
            _, file_extension = os.path.splitext(uploaded_files[0].name)
            
            # Calculate compressed size
            first_img = Image.open(uploaded_files[0])
            compressed_width = first_img.size[0] // compression_ratio
            compressed_height = first_img.size[1] // compression_ratio
            
            # Name input and size preview in two columns
            name_col, size_col = st.columns([2, 1])
            with name_col:
                base_name = st.text_input(
                    "Spritesheet Name",
                    "",
                    placeholder="Enter a name for the spritesheet"
                )
                # Use default if empty
                if not base_name.strip():
                    base_name = "spritesheet"
            with size_col:
                st.text("Output Size")
                st.text(f"{compressed_width}x{compressed_height}px")
            
            output_name = f"{base_name}{file_extension}"
            process_button = st.form_submit_button("Process Images")
        
        # Process and show results
        if process_button:
            with st.spinner("Processing images..."):
                processed_images = []
                progress_bar = st.progress(0)
                
                for idx, file in enumerate(uploaded_files):
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                        tmp_file.write(file.getvalue())
                        
                    img_no_bg = remove_background(tmp_file.name)
                    img_compressed = compress_image(
                        img_no_bg, 
                        ratio=compression_ratio,
                        allow_transparent=allow_transparent
                    )
                    processed_images.append(img_compressed)
                    progress_bar.progress((idx + 1) / len(uploaded_files))
                
                if len(processed_images) > 1:
                    spritesheet_path = "temp_spritesheet.png"
                    create_spritesheet(processed_images, spritesheet_path)
                    
                    # Read the spritesheet into memory
                    with open(spritesheet_path, "rb") as file:
                        spritesheet_data = file.read()
                    
                    # Save to history
                    st.session_state.processing_history.append({
                        'filename': output_name,
                        'data': spritesheet_data,
                        'timestamp': datetime.now()
                    })
                    
                    # Show result
                    st.header("Generated Spritesheet")
                    st.image(spritesheet_path, caption=output_name)
                    
                    # Download button
                    st.download_button(
                        label="Download Spritesheet",
                        data=spritesheet_data,
                        file_name=output_name,
                        mime="image/png"
                    )

        # Preview section
        st.subheader("Selected Images Preview")
        preview_cols = st.columns(4)
        for idx, file in enumerate(uploaded_files):
            with preview_cols[idx % 4]:
                img = Image.open(file)
                st.image(file, use_column_width=True)
                st.caption(f"{file.name}\n{img.size[0]}x{img.size[1]}px")

if __name__ == "__main__":
    main()
