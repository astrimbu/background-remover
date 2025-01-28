class ComfyUI {
    constructor() {
        this.styleImage = null;
        this.selectedBaseImage = null;
        this.loadBaseImages();
        this.initializeEventListeners();
        this.showDefaultStylePreview();
    }

    async loadBaseImages() {
        try {
            const response = await fetch('/base-images');
            const data = await response.json();
            this.displayBaseImages(data.images);
        } catch (error) {
            console.error('Error loading base images:', error);
        }
    }

    displayBaseImages(images) {
        const grid = document.querySelector('.base-image-grid');
        grid.innerHTML = '';

        images.forEach(image => {
            const item = document.createElement('div');
            item.className = 'base-image-item';
            
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.name;
            
            const name = document.createElement('div');
            name.className = 'base-image-name';
            name.textContent = image.name.replace('base-', '').replace('.png', '');
            
            item.appendChild(img);
            item.appendChild(name);
            
            item.addEventListener('click', () => {
                // Update selection
                document.querySelectorAll('.base-image-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');
                this.selectedBaseImage = image.name;
                
                // Update prompt
                const prompt = document.getElementById('prompt');
                const baseType = image.name.replace('base-', '').replace('.png', '');
                prompt.value = prompt.value.replace(/\b(ring|amulet|body|boots|cape|gloves|hat|pants|weapon)\b/, baseType);
            });
            
            grid.appendChild(item);
        });
    }

    async showDefaultStylePreview() {
        const stylePreview = document.createElement('div');
        stylePreview.id = 'stylePreview';
        stylePreview.className = 'preview-box';
        stylePreview.innerHTML = '<h3>Style Reference</h3>';
        
        // Add default style image
        const img = document.createElement('img');
        img.src = '/base-img/style-default.png';
        img.alt = 'Default Style';
        stylePreview.appendChild(img);
        
        // Insert before generated images
        document.getElementById('generatedImages').before(stylePreview);
    }

    initializeEventListeners() {
        // Update style image preview when file selected
        document.getElementById('style_image').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.styleImage = file;
                const stylePreview = document.getElementById('stylePreview');
                const img = stylePreview.querySelector('img') || document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = 'Style Reference';
                if (!stylePreview.contains(img)) {
                    stylePreview.appendChild(img);
                }
            }
        });

        // Handle range input displays
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', () => {
                input.nextElementSibling.textContent = input.value;
            });
        });

        // Handle generate button
        document.getElementById('generate').addEventListener('click', () => this.generateImages());
    }

    async generateImages() {
        if (!this.selectedBaseImage) {
            alert('Please select a base image first');
            return;
        }

        const formData = new FormData();
        
        // Add all settings to formData
        if (this.styleImage) {
            formData.append('style_image', this.styleImage);
        }
        
        formData.append('base_image', this.selectedBaseImage);
        formData.append('prompt', document.getElementById('prompt').value);
        formData.append('negative_prompt', document.getElementById('negative_prompt').value);
        formData.append('batch_size', document.getElementById('batch_size').value);
        formData.append('steps', document.getElementById('steps').value);

        try {
            document.getElementById('generate').disabled = true;
            document.getElementById('generate').textContent = 'Generating...';

            const response = await fetch('/comfyui-process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to generate images');
            }

            const result = await response.json();
            this.displayGeneratedImages(result.images);
        } catch (error) {
            console.error('Error generating images:', error);
            alert('Error generating images');
        } finally {
            document.getElementById('generate').disabled = false;
            document.getElementById('generate').textContent = 'Generate';
        }
    }

    displayGeneratedImages(images) {
        const grid = document.querySelector('.image-grid');
        grid.innerHTML = ''; // Clear existing images

        images.forEach(imageUrl => {
            const img = document.createElement('img');
            img.src = imageUrl;
            
            // Add click handler
            img.addEventListener('click', () => this.handleImageClick(imageUrl));
            grid.appendChild(img);
        });
    }

    async saveImage(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'generated.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error saving image:', error);
        }
    }

    async handleImageClick(imageUrl) {
        try {
            // Store the ComfyUI image URL directly in sessionStorage
            sessionStorage.setItem('pendingImageUrl', imageUrl);
            console.log(imageUrl);
            
            await this.saveImage(imageUrl);
            
            // Navigate to the background remover page
            window.location.href = '/';
        } catch (error) {
            console.error('Error handling image click:', error);
            alert('Error processing image');
        }
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ComfyUI();
}); 