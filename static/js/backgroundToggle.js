import { ResizeControls } from './resizeControls.js';

export class BackgroundToggle {
    constructor(onResize) {
        this.bgState = 0; // 0: transparent, 1: light, 2: dark
        this.resultBox = document.getElementById('result');
        this.resizeControls = new ResizeControls(onResize);
        this.currentImageBlob = null;
    }

    resetState() {
        // Reset background state
        this.bgState = 0;
        
        // Reset resize controls
        if (this.resizeControls) {
            this.resizeControls.reset();
        }
        
        // Clear the result box and disable buttons
        if (this.resultBox) {
            this.resultBox.innerHTML = '<h3>Result</h3>';
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper transparent-bg';
            this.resultBox.appendChild(imageWrapper);
            
            // Add disabled buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '10px';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.gap = '10px';
            buttonContainer.style.justifyContent = 'center';
            
            // Add disabled background toggle button
            const toggleBtn = this.createToggleButton();
            toggleBtn.disabled = true;
            buttonContainer.appendChild(toggleBtn);
            
            this.resultBox.appendChild(buttonContainer);
            
            // Add disabled resize panel
            const resizePanel = this.resizeControls.createResizePanel(true);  // true indicates disabled state
            this.resultBox.appendChild(resizePanel);
        }
        
        this.currentImageBlob = null;
    }

    createToggleButton() {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggleBackground';
        toggleBtn.className = 'bg-toggle';
        toggleBtn.title = 'Toggle Background';
        toggleBtn.textContent = '⬜';
        toggleBtn.addEventListener('click', () => this.toggleBackground());
        return toggleBtn;
    }

    toggleBackground() {
        this.bgState = (this.bgState + 1) % 3;
        const imageWrapper = this.resultBox.querySelector('.image-wrapper');
        const toggleButton = document.getElementById('toggleBackground');
        
        imageWrapper.classList.remove('transparent-bg', 'light-bg', 'dark-bg');
        
        switch(this.bgState) {
            case 0:
                imageWrapper.classList.add('transparent-bg');
                toggleButton.textContent = '⬜';
                break;
            case 1:
                imageWrapper.classList.add('light-bg');
                toggleButton.textContent = '⬛';
                break;
            case 2:
                imageWrapper.classList.add('dark-bg');
                toggleButton.textContent = '🏁';
                break;
        }
    }

    updateResultView(imageBlob, isGenerated = false) {
        // Reset state when new image is loaded
        this.currentImageBlob = imageBlob;
        this.bgState = 0;
        
        // Reset resize controls first
        if (this.resizeControls) {
            this.resizeControls.reset();
        }
        
        // Clear and rebuild the result box
        this.resultBox.innerHTML = '<h3>Result</h3>';
        
        // Add toggle button (disabled by default for new images)
        const toggleBtn = this.createToggleButton();
        toggleBtn.disabled = !isGenerated;  // Enable for generated images
        this.resultBox.appendChild(toggleBtn);
        
        // Add image wrapper with transparent background
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper transparent-bg';
        const resultImg = document.createElement('img');
        resultImg.src = URL.createObjectURL(imageBlob);
        imageWrapper.appendChild(resultImg);
        this.resultBox.appendChild(imageWrapper);
        
        // Add button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.justifyContent = 'center';
        
        // Add download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = resultImg.src;
            a.download = 'no_background.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        buttonContainer.appendChild(downloadBtn);
        
        this.resultBox.appendChild(buttonContainer);

        // Add resize panel (disabled by default for new images)
        const resizePanel = this.resizeControls.createResizePanel(!isGenerated);
        this.resultBox.appendChild(resizePanel);
    }
} 