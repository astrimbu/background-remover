export class DragAndDrop {
    constructor(onFileDropped) {
        this.dragCounter = 0;
        this.dropzone = document.getElementById('dropzone');
        this.onFileDropped = onFileDropped;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.addEventListener('dragenter', this.handleDragEnter.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));

        // Dropzone specific events
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('dragover');
        });
    }

    handleDragEnter(e) {
        e.preventDefault();
        this.dragCounter++;
        if (this.dragCounter === 1) {
            this.dropzone.classList.remove('hidden');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dragCounter--;
        if (this.dragCounter === 0) {
            this.dropzone.classList.add('hidden');
        }
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        this.dragCounter = 0;
        this.dropzone.classList.remove('dragover');
        this.dropzone.classList.add('hidden');
        
        if (e.dataTransfer.files.length) {
            this.onFileDropped(e.dataTransfer.files[0]);
        }
    }
} 