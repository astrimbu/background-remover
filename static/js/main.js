import { Settings } from './settings.js';
import { ImageProcessor } from './imageProcessor.js';
import { DragAndDrop } from './dragAndDrop.js';
import { BackgroundToggle } from './backgroundToggle.js';

class App {
    constructor() {
        this.settings = new Settings();
        this.imageProcessor = new ImageProcessor();
        this.backgroundToggle = new BackgroundToggle(this.handleResize.bind(this));
        this.dragAndDrop = new DragAndDrop(this.handleFile.bind(this));
        
        this.settings.setSettingsChangeCallback(() => {
            this.processCurrentImage();
        });

        // Check for pending image from the generator
        const pendingImageUrl = sessionStorage.getItem('pendingImageUrl');
        if (pendingImageUrl) {
            sessionStorage.removeItem('pendingImageUrl');
            this.handlePendingImageUrl(pendingImageUrl);
        }
    }

    async handleFile(file) {
        this.imageProcessor.setCurrentFile(file);
        this.imageProcessor.showOriginalPreview(file);
        // Only process automatically if the file wasn't from the generator
        if (!file.name.startsWith('generated')) {
            await this.processCurrentImage();
        } else {
            // For generated images, just show them in the result view without processing
            const reader = new FileReader();
            reader.onloadend = () => {
                const blob = new Blob([reader.result], { type: file.type });
                this.backgroundToggle.updateResultView(blob, true);
            };
            reader.readAsArrayBuffer(file);
        }
    }

    async processCurrentImage() {
        const formData = this.settings.getSettingsFormData();
        const processedImageBlob = await this.imageProcessor.processImage(formData);
        
        if (processedImageBlob) {
            this.backgroundToggle.updateResultView(processedImageBlob, false);
        }
    }

    async handleResize(width, height, borderSize) {
        const formData = new FormData();
        formData.append('width', width);
        formData.append('height', height);
        formData.append('border', borderSize);
        formData.append('fit_first', 'true');
        
        // Convert the current result image blob to a File object
        const currentBlob = this.backgroundToggle.currentImageBlob;
        if (!currentBlob) return;
        
        formData.append('image', currentBlob, 'image.png');
        
        try {
            const response = await fetch('/resize-image', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to resize image');
            
            const resizedBlob = await response.blob();
            this.backgroundToggle.updateResultView(resizedBlob);
        } catch (error) {
            console.error('Error resizing image:', error);
            alert('Error resizing image');
        }
    }

    async handlePendingImageUrl(imageUrl) {
        try {
            // Fetch the image from ComfyUI
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Failed to fetch image from ComfyUI');
            
            const blob = await response.blob();
            const file = new File([blob], 'generated.png', { type: 'image/png' });
            
            // Process the file as if it was dropped
            this.handleFile(file);
        } catch (error) {
            console.error('Error handling pending image:', error);
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 