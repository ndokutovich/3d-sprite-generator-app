// UI Controller - Handles all DOM manipulation and UI updates
class UIController {
    constructor() {
        this.elements = {
            loading: document.getElementById('loading'),
            loadingStatus: document.getElementById('loadingStatus'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            fileName: document.getElementById('fileName'),
            generateBtn: document.getElementById('generateBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            successMessage: document.getElementById('successMessage'),
            spritePreview: document.getElementById('spritePreview'),
            animationSelect: document.getElementById('animationSelect'),
            animationTime: document.getElementById('animationTime'),
            timeValue: document.getElementById('timeValue'),
            cameraDistance: document.getElementById('cameraDistance'),
            distanceValue: document.getElementById('distanceValue'),
            cameraHeight: document.getElementById('cameraHeight'),
            heightValue: document.getElementById('heightValue'),
            lightIntensity: document.getElementById('lightIntensity'),
            lightValue: document.getElementById('lightValue'),
            spriteSize: document.getElementById('spriteSize'),
            spriteModal: document.getElementById('spriteModal'),
            modalImage: document.getElementById('modalImage'),
            modalCaption: document.getElementById('modalCaption'),
            modalClose: document.getElementById('modalClose'),
            directionCount: document.getElementById('directionCount'),
            animationFrames: document.getElementById('animationFrames')
        };

        // Setup modal close handlers
        this.setupModalHandlers();
    }

    setupModalHandlers() {
        // Close on X button click
        this.elements.modalClose.addEventListener('click', () => {
            this.closeSpriteModal();
        });

        // Close on background click
        this.elements.spriteModal.addEventListener('click', (e) => {
            if (e.target === this.elements.spriteModal) {
                this.closeSpriteModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.spriteModal.style.display === 'block') {
                this.closeSpriteModal();
            }
        });
    }

    // Loading state management
    showLoading(status, progress) {
        this.elements.loading.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.updateProgress(progress, status);
    }

    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    updateProgress(percent, status) {
        this.elements.progressBar.style.width = percent + '%';
        this.elements.progressText.textContent = Math.round(percent) + '%';
        if (status) {
            this.elements.loadingStatus.textContent = status;
        }
    }

    // Error handling
    showError(message) {
        this.hideLoading();
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.style.display = 'block';
    }

    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    // File name display
    updateFileName(fileName) {
        this.elements.fileName.textContent = fileName;
    }

    // Button states
    enableGenerateButton() {
        this.elements.generateBtn.disabled = false;
    }

    disableGenerateButton() {
        this.elements.generateBtn.disabled = true;
    }

    enableDownloadButton() {
        this.elements.downloadBtn.disabled = false;
    }

    disableDownloadButton() {
        this.elements.downloadBtn.disabled = true;
    }

    // Success message
    showSuccessMessage() {
        this.elements.successMessage.style.display = 'block';
    }

    hideSuccessMessage() {
        this.elements.successMessage.style.display = 'none';
    }

    showSuccessMessageTemporary(duration = 2000) {
        this.showSuccessMessage();
        setTimeout(() => {
            this.hideSuccessMessage();
        }, duration);
    }

    // Animation controls
    populateAnimationList(embeddedAnimations, proceduralAnimations) {
        this.elements.animationSelect.innerHTML = '<option value="-1">No Animation</option>';

        // Add embedded animations if present
        if (embeddedAnimations && embeddedAnimations.length > 0) {
            const embeddedGroup = document.createElement('optgroup');
            embeddedGroup.label = 'Model Animations';
            embeddedAnimations.forEach((anim, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = anim.name || `Animation ${index + 1}`;
                embeddedGroup.appendChild(option);
            });
            this.elements.animationSelect.appendChild(embeddedGroup);
        }

        // Add procedural animations (always available)
        if (proceduralAnimations && proceduralAnimations.length > 0) {
            const proceduralGroup = document.createElement('optgroup');
            proceduralGroup.label = 'Standard Animations';
            proceduralAnimations.forEach((anim, index) => {
                const option = document.createElement('option');
                option.value = CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET + index;
                option.textContent = anim.name;
                proceduralGroup.appendChild(option);
            });
            this.elements.animationSelect.appendChild(proceduralGroup);
        }

        this.elements.animationSelect.disabled = false;
        this.elements.animationTime.disabled = false;
    }

    resetAnimationControls() {
        this.elements.animationSelect.innerHTML = '<option value="-1">No Animation</option>';
        this.elements.animationSelect.disabled = true;
        this.elements.animationTime.disabled = true;
        this.elements.animationTime.value = 0;
        this.elements.timeValue.textContent = '0.0s';
    }

    updateAnimationTime(time) {
        this.elements.timeValue.textContent = time.toFixed(1) + 's';
    }

    setAnimationDuration(duration) {
        this.elements.animationTime.max = duration;
        this.elements.animationTime.value = 0;
        this.elements.timeValue.textContent = '0.0s';
    }

    // Camera controls display
    updateCameraDistance(distance) {
        this.elements.distanceValue.textContent = distance.toFixed(1);
    }

    updateCameraHeight(height) {
        this.elements.heightValue.textContent = height.toFixed(1);
    }

    updateLightIntensity(intensity) {
        this.elements.lightValue.textContent = intensity.toFixed(1);
    }

    // Get input values with validation
    getSpriteSize() {
        const value = parseInt(this.elements.spriteSize.value);
        if (isNaN(value) || value < CONFIG.SPRITE.MIN_SIZE || value > CONFIG.SPRITE.MAX_SIZE) {
            return CONFIG.SPRITE.DEFAULT_SIZE;
        }
        return value;
    }

    getCameraDistance() {
        const value = parseFloat(this.elements.cameraDistance.value);
        if (isNaN(value) || value < CONFIG.CAMERA.MIN_DISTANCE || value > CONFIG.CAMERA.MAX_DISTANCE) {
            return CONFIG.CAMERA.DEFAULT_DISTANCE;
        }
        return value;
    }

    getCameraHeight() {
        const value = parseFloat(this.elements.cameraHeight.value);
        if (isNaN(value) || value < CONFIG.CAMERA.MIN_HEIGHT || value > CONFIG.CAMERA.MAX_HEIGHT) {
            return CONFIG.CAMERA.DEFAULT_HEIGHT;
        }
        return value;
    }

    getLightIntensity() {
        const value = parseFloat(this.elements.lightIntensity.value);
        if (isNaN(value) || value < 0) {
            return 3.0; // Default light intensity
        }
        return value;
    }

    getDirectionCount() {
        const value = parseInt(this.elements.directionCount.value);
        return (value === 16) ? 16 : 8; // Only allow 8 or 16
    }

    getAnimationFrames() {
        const value = parseInt(this.elements.animationFrames.value);
        if (isNaN(value) || value < 1) {
            return 1;
        }
        if (value > 32) {
            return 32;
        }
        return value;
    }

    getSelectedAnimation() {
        const value = parseInt(this.elements.animationSelect.value);
        return isNaN(value) ? CONFIG.ANIMATION.NO_ANIMATION : value;
    }

    getAnimationTime() {
        const value = parseFloat(this.elements.animationTime.value);
        return isNaN(value) ? 0 : Math.max(0, value);
    }

    // Sprite preview
    displaySprites(sprites) {
        this.elements.spritePreview.innerHTML = '';
        this.elements.spritePreview.style.display = 'grid';

        sprites.forEach(sprite => {
            const item = document.createElement('div');
            item.className = 'sprite-item';

            const img = document.createElement('img');
            img.src = sprite.data;

            // Use Sprite class methods for consistent naming
            const displayName = sprite.displayName || sprite.name || 'sprite';
            img.alt = displayName;

            img.addEventListener('click', () => {
                this.showSpriteModal(sprite.data, displayName);
            });

            const caption = document.createElement('p');
            caption.textContent = displayName;

            item.appendChild(img);
            item.appendChild(caption);
            this.elements.spritePreview.appendChild(item);
        });
    }

    hideSpritePreview() {
        this.elements.spritePreview.style.display = 'none';
    }

    // Sprite modal
    showSpriteModal(imageSrc, caption) {
        this.elements.modalImage.src = imageSrc;
        this.elements.modalCaption.textContent = caption;
        this.elements.spriteModal.style.display = 'block';
    }

    closeSpriteModal() {
        this.elements.spriteModal.style.display = 'none';
    }

    // Event listener helpers
    onFileSelect(callback) {
        document.getElementById('modelFile').addEventListener('change', callback);
    }

    onGenerateClick(callback) {
        this.elements.generateBtn.addEventListener('click', callback);
    }

    onDownloadClick(callback) {
        this.elements.downloadBtn.addEventListener('click', callback);
    }

    onAnimationSelect(callback) {
        this.elements.animationSelect.addEventListener('change', callback);
    }

    onAnimationTimeChange(callback) {
        this.elements.animationTime.addEventListener('input', callback);
    }

    onCameraDistanceChange(callback) {
        this.elements.cameraDistance.addEventListener('input', callback);
    }

    onCameraHeightChange(callback) {
        this.elements.cameraHeight.addEventListener('input', callback);
    }

    onLightIntensityChange(callback) {
        this.elements.lightIntensity.addEventListener('input', callback);
    }

    onErrorClose(callback) {
        const closeBtn = this.elements.errorMessage.querySelector('button');
        if (closeBtn) {
            closeBtn.addEventListener('click', callback);
        }
    }
}
