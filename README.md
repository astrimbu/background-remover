# Image Editor Suite

A full-stack image processing tool with background removal and generative AI capabilities, featuring:
- Next.js frontend with TypeScript
- Flask backend with rembg/PyTorch
- ComfyUI workflow integration

![Application Preview](./preview.png)

## Features

- 🖼️ Dual-view editor with original/processed comparison
- ⏳ History panel with settings restoration
- 🎚️ Controls for edge refinement and model selection
- 🌓 Multiple background modes (checkered/light/dark)
- 🤖 Integration with ComfyUI for generative AI workflows

## Tech Stack

**Frontend**:
- Next.js 15 (App Router)
- React 19 + Zustand state management
- Material UI (MUI) components
- TypeScript

**Backend**:
- Python 3.10+
- Flask + rembg (U2Net models)
- ComfyUI integration

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- PyTorch (CUDA recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/astrimbu/background-remover.git
cd background-remover
```

2. Set up backend:
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

3. Set up frontend:
```bash
cd frontend
npm install
```

### Running Locally

1. Start Flask backend (from root directory):
```bash
python app.py
```

2. Start Next.js frontend (from frontend directory):
```bash
npm run dev
```

- Backend: http://localhost:5000 *(deprecated ui)*
- Frontend: http://localhost:3000

## Deployment

### Frontend Production Build
```bash
cd frontend
npm run build
```

The static export will be in the `out` directory. Deploy to Vercel, Netlify, or any static host.

### Backend Production
Use a production WSGI server like Gunicorn:
```bash
gunicorn app:app -w 4 -b 0.0.0.0:5000
```

## Supported Formats
**Input**: PNG, JPG, JPEG, WEBP  
**Output**: PNG (transparent background)

## License
MIT License - See [LICENSE](LICENSE) for details
