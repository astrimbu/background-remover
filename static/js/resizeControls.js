export class ResizeControls {
    constructor(onResize) {
        this.onResize = onResize;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.borderSize = 0;
        this.isActive = false;  // Track if padding is active
    }

    reset() {
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.borderSize = 0;
        this.isActive = false;  // Reset active state
        
        // Reset any input fields if they exist
        const widthInput = document.getElementById('customWidth');
        const heightInput = document.getElementById('customHeight');
        const borderInput = document.getElementById('borderSize');
        const presetSelect = document.getElementById('sizePreset');
        const borderControl = document.querySelector('.border-control');
        
        if (widthInput) {
            widthInput.value = '50';
            widthInput.disabled = true;
        }
        if (heightInput) {
            heightInput.value = '50';
            heightInput.disabled = true;
        }
        if (borderInput) {
            borderInput.value = '0';
            borderInput.disabled = true;
            borderInput.classList.remove('active');
        }
        if (presetSelect) {
            presetSelect.value = 'custom';
            presetSelect.disabled = true;
        }
        if (borderControl) {
            borderControl.classList.remove('active');
        }
        
        // Reset any buttons to disabled state
        const resizeBtn = document.querySelector('.resize-button');
        if (resizeBtn) {
            resizeBtn.disabled = true;
            resizeBtn.classList.remove('active');
        }
    }

    createResizePanel(disabled = false) {
        const panel = document.createElement('div');
        panel.className = 'resize-panel';
        
        const header = document.createElement('h4');
        header.textContent = 'Resize';
        header.style.marginBottom = '10px';
        
        // Border size control
        const borderControl = document.createElement('div');
        borderControl.className = 'border-control';  // Always start inactive
        
        const borderLabel = document.createElement('label');
        borderLabel.textContent = 'Border Size: ';
        borderLabel.title = 'Percentage of border space around the subject';
        
        const borderInput = document.createElement('input');
        borderInput.type = 'range';
        borderInput.min = '5';
        borderInput.max = '25';
        borderInput.value = '0';  // Always start at 0
        borderInput.className = 'border-slider';  // Always start inactive
        borderInput.disabled = disabled;
        borderInput.id = 'borderSize';
        
        const borderValue = document.createElement('span');
        borderValue.textContent = '0%';  // Always start at 0
        borderValue.className = 'border-value';
        
        borderInput.addEventListener('input', () => {
            const value = parseInt(borderInput.value);
            this.borderSize = value;
            borderValue.textContent = `${value}%`;
            
            // Only add active class if there's actually a border
            if (value > 0) {
                this.isActive = true;
                borderInput.classList.add('active');
                borderControl.classList.add('active');
            } else {
                this.isActive = false;
                borderInput.classList.remove('active');
                borderControl.classList.remove('active');
            }
            
            this.handleResize(this.currentWidth || undefined, this.currentHeight || undefined);
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
        presetSelect.disabled = disabled;
        
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
        widthInput.disabled = disabled;
        
        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.id = 'customHeight';
        heightInput.min = '1';
        heightInput.max = '1000';
        heightInput.value = '50';
        heightInput.disabled = disabled;
        
        const resizeBtn = document.createElement('button');
        resizeBtn.textContent = 'Resize';
        resizeBtn.className = 'resize-button';
        resizeBtn.disabled = disabled;
        
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
        this.currentWidth = width || this.currentWidth;
        this.currentHeight = height || this.currentHeight;
        this.onResize(this.currentWidth, this.currentHeight, this.borderSize);
    }
} 