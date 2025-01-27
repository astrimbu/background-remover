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
    }

    async handleFile(file) {
        this.imageProcessor.setCurrentFile(file);
        this.imageProcessor.showOriginalPreview(file);
        await this.processCurrentImage();
    }

    async processCurrentImage() {
        const formData = this.settings.getSettingsFormData();
        const processedImageBlob = await this.imageProcessor.processImage(formData);
        
        if (processedImageBlob) {
            this.backgroundToggle.updateResultView(processedImageBlob);
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
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 