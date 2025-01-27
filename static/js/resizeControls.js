export class ResizeControls {
    constructor(onResize) {
        this.onResize = onResize;
        this.borderSize = 10; // Default border percentage
    }

    createResizePanel() {
        const panel = document.createElement('div');
        panel.className = 'resize-panel';
        
        const header = document.createElement('h4');
        header.textContent = 'Resize';
        header.style.marginBottom = '10px';
        
        // Border size control
        const borderControl = document.createElement('div');
        borderControl.className = 'border-control';
        
        const borderLabel = document.createElement('label');
        borderLabel.textContent = 'Border Size: ';
        borderLabel.title = 'Percentage of border space around the subject';
        
        const borderInput = document.createElement('input');
        borderInput.type = 'range';
        borderInput.min = '5';
        borderInput.max = '25';
        borderInput.value = this.borderSize;
        borderInput.className = 'border-slider';
        
        const borderValue = document.createElement('span');
        borderValue.textContent = `${this.borderSize}%`;
        borderValue.className = 'border-value';
        
        borderInput.addEventListener('input', () => {
            this.borderSize = parseInt(borderInput.value);
            borderValue.textContent = `${this.borderSize}%`;
        });
        
        borderControl.appendChild(borderLabel);
        borderControl.appendChild(borderInput);
        borderControl.appendChild(borderValue);
        
        // Size controls
        const controls = document.createElement('div');
        controls.className = 'resize-controls';
        
        // Size presets
        const presetSelect = document.createElement('select');
        presetSelect.id = 'sizePreset';
        const presets = {
            'custom': 'Custom Size',
            '50x50': '50x50 (Tiny)',
            '100x100': '100x100 (Small)',
            '200x200': '200x200 (Medium)',
            '400x400': '400x400 (Large)'
        };
        
        Object.entries(presets).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            presetSelect.appendChild(option);
        });
        
        // Custom size inputs
        const customControls = document.createElement('div');
        customControls.className = 'custom-size-controls';
        customControls.style.display = 'none';
        
        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.id = 'customWidth';
        widthInput.min = '1';
        widthInput.max = '1000';
        widthInput.value = '50';
        
        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.id = 'customHeight';
        heightInput.min = '1';
        heightInput.max = '1000';
        heightInput.value = '50';
        
        const resizeBtn = document.createElement('button');
        resizeBtn.textContent = 'Resize';
        resizeBtn.className = 'resize-button';
        
        // Event handlers
        presetSelect.addEventListener('change', () => {
            const isCustom = presetSelect.value === 'custom';
            customControls.style.display = isCustom ? 'flex' : 'none';
            
            if (!isCustom) {
                const [width, height] = presetSelect.value.split('x').map(Number);
                this.handleResize(width, height);
            }
        });
        
        resizeBtn.addEventListener('click', () => {
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            if (width && height) {
                this.handleResize(width, height);
            }
        });
        
        // Assemble the panel
        customControls.appendChild(widthInput);
        customControls.appendChild(document.createTextNode(' × '));
        customControls.appendChild(heightInput);
        customControls.appendChild(resizeBtn);
        
        controls.appendChild(borderControl);
        controls.appendChild(presetSelect);
        controls.appendChild(customControls);
        
        panel.appendChild(header);
        panel.appendChild(controls);
        
        return panel;
    }

    handleResize(width, height) {
        this.onResize(width, height, this.borderSize);
    }
} 