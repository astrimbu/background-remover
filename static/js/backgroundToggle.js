import { ResizeControls } from './resizeControls.js';

export class BackgroundToggle {
    constructor(onResize) {
        this.bgState = 0; // 0: transparent, 1: light, 2: dark
        this.resultBox = document.getElementById('result');
        this.resizeControls = new ResizeControls(onResize);
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
        this.currentImageBlob = imageBlob;
        const currentBg = this.resultBox.querySelector('.image-wrapper')?.className.match(/(transparent-bg|light-bg|dark-bg)/)?.[0] || 'transparent-bg';
        this.resultBox.innerHTML = '<h3>Result</h3>';
        
        // Add toggle button
        this.resultBox.appendChild(this.createToggleButton());
        
        // Add image wrapper and image
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper ' + currentBg;
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

        // Add resize panel
        this.resultBox.appendChild(this.resizeControls.createResizePanel());
    }
} 