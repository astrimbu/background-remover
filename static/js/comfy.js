class ComfyUI {
    constructor() {
        this.styleImage = null;
        this.selectedBaseImage = null;
        this.loadBaseImages();
        this.initializeEventListeners();
        this.loadSavedStyleImage();
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

    loadSavedStyleImage() {
        const savedStyle = localStorage.getItem('savedStyleImage');
        if (savedStyle) {
            try {
                const { dataUrl, filename } = JSON.parse(savedStyle);
                // Create a file from the data URL
                fetch(dataUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        this.styleImage = new File([blob], filename, { type: 'image/png' });
                        // Update the preview
                        const stylePreview = document.getElementById('stylePreview');
                        const img = stylePreview.querySelector('img') || document.createElement('img');
                        img.src = dataUrl;
                        img.alt = 'Style Reference';
                        if (!stylePreview.contains(img)) {
                            stylePreview.appendChild(img);
                        }
                    });
            } catch (error) {
                console.error('Error loading saved style image:', error);
                localStorage.removeItem('savedStyleImage');
            }
        }
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
                
                // Save to localStorage
                const reader = new FileReader();
                reader.onloadend = () => {
                    localStorage.setItem('savedStyleImage', JSON.stringify({
                        dataUrl: reader.result,
                        filename: file.name
                    }));
                };
                reader.readAsDataURL(file);
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

        // Special handling for weight_style slider to show decimal value
        const weightStyleInput = document.getElementById('weight_style');
        weightStyleInput.addEventListener('input', () => {
            const value = parseInt(weightStyleInput.value) / 100;
            weightStyleInput.nextElementSibling.textContent = value.toFixed(1);
        });
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
        const weightStyle = parseInt(document.getElementById('weight_style').value) / 100;
        formData.append('weight_style', weightStyle);

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