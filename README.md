# Image Processing & Spritesheet Generator

A tool that processes images by removing backgrounds, compressing them, and combining them into spritesheets. Available both as a command-line tool and a web interface.

🔗 **[Try it live!](https://spritesheet-tool.streamlit.app/)**

![preview](./preview.png)

## Features

- 🎨 Automatic background removal
- 🗜️ Configurable image compression
- 🎯 Transparent pixel handling
- 📦 Automatic spritesheet generation
- 🌐 Web interface with live preview
- 💾 Processing history tracking

## Quick Start

### Web Version
Visit **[spritesheet-tool.streamlit.app](https://spritesheet-tool.streamlit.app/)** to use the tool directly in your browser.

### Local Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/repository-name.git
cd repository-name
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

3. Install the required dependencies:
```bash
pip install numpy opencv-python-headless rembg streamlit pillow tqdm
```

## Usage

### Web Interface

Run the web interface locally with:

```bash
streamlit run app.py
```

Then:
1. Open your browser to the displayed URL
2. Upload your images
3. Adjust compression settings
4. Click "Process Images" to generate your spritesheet

### Command Line

Process images from the command line:

```bash
python compress.py input_directory output_directory [-r RATIO] [-a]
```

Arguments:
- `input_directory`: Folder containing your source images
- `output_directory`: Where to save processed images
- `-r, --ratio`: Compression ratio (default: 8)
- `-a, --allow-transparent`: Enable transparent pixel handling

## Configuration

Key settings you can adjust:
- Compression ratio (2-16)
  - Lower values preserve more detail
  - Higher values create smaller files
- Transparency handling
  - Alpha threshold: 50 (default)
  - Visibility ratio: 0.5 (default)

## Supported Formats

| Format | Input | Output |
|--------|-------|--------|
| PNG    | ✅    | ✅     |
| JPG    | ✅    | -      |

## How It Works

1. **Background Removal**: Uses the `rembg` library to remove image backgrounds
2. **Compression**: Reduces image size by combining pixel blocks using median values
3. **Spritesheet Generation**: Combines processed images horizontally into a single spritesheet

## Requirements

- Python 3.6+
- Dependencies:
  - numpy
  - opencv-python-headless
  - rembg
  - streamlit
  - pillow
  - tqdm

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/improvement`)
3. Make your changes
4. Commit (`git commit -am 'Add new feature'`)
5. Push (`git push origin feature/improvement`)
6. Create a Pull Request

## Troubleshooting

Common issues and solutions:
- If you get memory errors with large images, try increasing the compression ratio
- For best results, ensure input images have consistent dimensions

## Acknowledgments

Special thanks to:
- [Tobias Fischer](https://github.com/tobias17) for the original [python script](https://github.com/tobias17/sd-pixel-anims/blob/master/compress.py)
- The [rembg](https://github.com/danielgatis/rembg) project for background removal
- [Streamlit](https://streamlit.io/) for the web interface framework

## License

MIT License - see [LICENSE](LICENSE) for details
