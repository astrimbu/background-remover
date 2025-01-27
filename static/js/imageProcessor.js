export class ImageProcessor {
    constructor() {
        this.currentFile = null;
        this.currentRequest = null;
        this.loading = document.getElementById('loading');
    }

    setCurrentFile(file) {
        this.currentFile = file;
    }

    showOriginalPreview(file) {
        const originalPreview = document.getElementById('originalPreview');
        originalPreview.innerHTML = '<h3>Original</h3>';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        originalPreview.appendChild(img);
    }

    async processImage(formData) {
        if (!this.currentFile) return;
        
        formData.append('image', this.currentFile);
        this.loading.style.display = 'block';
        
        // Cancel any ongoing request
        if (this.currentRequest) {
            this.currentRequest.abort();
        }
        
        this.currentRequest = new AbortController();
        
        try {
            const response = await fetch('/remove-background', {
                method: 'POST',
                body: formData,
                signal: this.currentRequest.signal
            });

            if (!response.ok) throw new Error('Network response was not ok');
            return await response.blob();
        } catch (error) {
            if (error.name === 'AbortError') return null;
            console.error('Error:', error);
            alert('Error processing image');
            return null;
        } finally {
            this.loading.style.display = 'none';
        }
    }
} 