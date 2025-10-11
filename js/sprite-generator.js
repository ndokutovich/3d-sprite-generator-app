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
        const distance = this.uiController.getCameraDistance();
        const height = this.uiController.getCameraHeight();

        // Save original renderer size
        const originalSize = this.threeSetup.getRendererSize();

        // Set sprite size
        this.uiController.updateProgress(10, 'Preparing renderer...');
        this.threeSetup.setRendererSize(spriteSize, spriteSize);

        // Generate sprites
        await this.generateDirectionalSprites(distance, height);

        // Restore original size
        this.uiController.updateProgress(95, 'Restoring view...');
        this.threeSetup.setRendererSize(originalSize.width, originalSize.height);
        this.threeSetup.onWindowResize();

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

        return new Promise((resolve) => {
            const generateNextSprite = () => {
                if (currentIndex >= directions.length) {
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
