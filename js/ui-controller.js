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
            spriteSize: document.getElementById('spriteSize')
        };
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
    populateAnimationList(animations) {
        this.elements.animationSelect.innerHTML = '<option value="-1">No Animation</option>';

        animations.forEach((anim, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = anim.name || `Animation ${index + 1}`;
            this.elements.animationSelect.appendChild(option);
        });

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

    // Get input values
    getSpriteSize() {
        return parseInt(this.elements.spriteSize.value);
    }

    getCameraDistance() {
        return parseFloat(this.elements.cameraDistance.value);
    }

    getCameraHeight() {
        return parseFloat(this.elements.cameraHeight.value);
    }

    getLightIntensity() {
        return parseFloat(this.elements.lightIntensity.value);
    }

    getSelectedAnimation() {
        return parseInt(this.elements.animationSelect.value);
    }

    getAnimationTime() {
        return parseFloat(this.elements.animationTime.value);
    }

    // Sprite preview
    displaySprites(sprites) {
        this.elements.spritePreview.innerHTML = '';
        this.elements.spritePreview.style.display = 'grid';

        sprites.forEach(sprite => {
            const item = document.createElement('div');
            item.className = 'sprite-item';
            item.innerHTML = `
                <img src="${sprite.data}" alt="${sprite.name}">
                <p>${sprite.name}</p>
            `;
            this.elements.spritePreview.appendChild(item);
        });
    }

    hideSpritePreview() {
        this.elements.spritePreview.style.display = 'none';
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
