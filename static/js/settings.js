export class Settings {
    constructor() {
        this.initializeSettings();
        this.attachEventListeners();
    }

    initializeSettings() {
        // Initialize range input value displays
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', () => {
                input.nextElementSibling.textContent = input.value;
            });
        });
    }

    attachEventListeners() {
        // Add change listeners to all settings
        document.querySelectorAll('.setting-group input').forEach(input => {
            input.addEventListener('change', () => this.onSettingChange());
        });

        // Handle model switching
        document.getElementById('model').addEventListener('change', async (e) => {
            await this.switchModel(e.target.value);
        });
    }

    async switchModel(modelValue) {
        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        
        try {
            const response = await fetch('/switch-model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: modelValue })
            });
            if (!response.ok) throw new Error('Failed to switch model');
            return true;
        } catch (error) {
            console.error('Error switching model:', error);
            alert('Error switching model');
            return false;
        } finally {
            loading.style.display = 'none';
        }
    }

    getSettingsFormData() {
        const formData = new FormData();
        formData.append('alpha_matting', document.getElementById('alpha_matting').checked);
        formData.append('foreground_threshold', document.getElementById('foreground_threshold').value);
        formData.append('background_threshold', document.getElementById('background_threshold').value);
        formData.append('erode_size', document.getElementById('erode_size').value);
        formData.append('kernel_size', document.getElementById('kernel_size').value);
        formData.append('post_process', document.getElementById('post_process').checked);
        return formData;
    }

    onSettingChange() {
        if (this.onSettingsChanged) {
            this.onSettingsChanged();
        }
    }

    setSettingsChangeCallback(callback) {
        this.onSettingsChanged = callback;
    }
} 