// Sprite Generator - Handles sprite rendering from different angles
class SpriteGenerator {
    constructor(threeSetup, uiController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.generatedSprites = [];
    }

    async generateSprites() {
        if (!this.threeSetup.getLoadedModel()) {
            return Promise.reject(new Error('No model loaded'));
        }

        this.uiController.showLoading('Generating sprites...', 0);
        this.generatedSprites = [];

        const spriteSize = this.uiController.getSpriteSize();
        // Use actual current camera position instead of slider values
        const distance = this.threeSetup.getCurrentCameraDistance();
        const height = this.threeSetup.getCurrentCameraHeight();

        // Save original camera position
        const originalCameraPosition = this.threeSetup.camera.position.clone();

        // Save original renderer size
        const originalSize = this.threeSetup.getRendererSize();

        // Hide grid and set transparent background for sprite rendering
        this.threeSetup.hideGrid();
        this.threeSetup.setTransparentBackground();

        // Set sprite size
        this.uiController.updateProgress(10, 'Preparing renderer...');
        this.threeSetup.setRendererSize(spriteSize, spriteSize);

        // Generate sprites
        await this.generateDirectionalSprites(distance, height);

        // Restore original size and settings
        this.uiController.updateProgress(95, 'Restoring view...');
        this.threeSetup.setRendererSize(originalSize.width, originalSize.height);
        this.threeSetup.onWindowResize();

        // Restore camera position
        this.threeSetup.setCameraPosition(
            originalCameraPosition.x,
            originalCameraPosition.y,
            originalCameraPosition.z
        );

        // Restore grid and opaque background
        this.threeSetup.showGrid();
        this.threeSetup.setOpaqueBackground();

        this.uiController.updateProgress(100, 'Complete!');

        // Display results
        this.uiController.displaySprites(this.generatedSprites);
        this.uiController.enableDownloadButton();
        this.uiController.showSuccessMessage();

        setTimeout(() => {
            this.uiController.hideSuccessMessage();
            this.uiController.hideLoading();
        }, 2000);

        return this.generatedSprites;
    }

    async generateDirectionalSprites(distance, height) {
        const directions = CONFIG.DIRECTIONS;
        let currentIndex = 0;
        const spriteSize = this.uiController.getSpriteSize();

        // Save original camera aspect ratio
        const originalAspect = this.threeSetup.camera.aspect;

        // Set camera aspect to 1:1 for square sprites
        this.threeSetup.camera.aspect = 1.0;
        this.threeSetup.camera.updateProjectionMatrix();

        return new Promise((resolve) => {
            const generateNextSprite = () => {
                if (currentIndex >= directions.length) {
                    // Restore original aspect ratio
                    this.threeSetup.camera.aspect = originalAspect;
                    this.threeSetup.camera.updateProjectionMatrix();
                    resolve();
                    return;
                }

                const dir = directions[currentIndex];
                const progress = 10 + (currentIndex / directions.length) * 80;
                this.uiController.updateProgress(
                    progress,
                    `Rendering ${dir.name}... (${currentIndex + 1}/${directions.length})`
                );

                // Position camera
                const x = Math.sin(dir.angle) * distance;
                const z = Math.cos(dir.angle) * distance;
                this.threeSetup.setCameraPosition(x, height, z);
                this.threeSetup.setCameraLookAt(0, 0, 0);

                // Render
                this.threeSetup.render();

                // Capture sprite
                const dataURL = this.threeSetup.captureFrame();
                this.generatedSprites.push({
                    name: dir.name,
                    data: dataURL
                });

                currentIndex++;

                // Small delay to allow UI to update
                setTimeout(generateNextSprite, 50);
            };

            // Start generation
            setTimeout(generateNextSprite, 100);
        });
    }

    getGeneratedSprites() {
        return this.generatedSprites;
    }

    clearSprites() {
        this.generatedSprites = [];
    }
}
