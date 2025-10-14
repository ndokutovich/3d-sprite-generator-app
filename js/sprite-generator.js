// Sprite Generator - Handles sprite rendering from different angles
class SpriteGenerator {
    constructor(threeSetup, uiController, animationController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.animationController = animationController;
        this.generatedSprites = [];
        this.frameCalculator = new AnimationFrameCalculator();
    }

    async generateSprites() {
        if (!this.threeSetup.getLoadedModel()) {
            return Promise.reject(new Error('No model loaded'));
        }

        try {
            this.uiController.showLoading('Generating sprites...', 0);
            this.generatedSprites = [];

            const context = this.prepareGenerationContext();

            await this.generateAllDirectionalSprites(context);

            this.restoreRenderingState(context);

            this.displayResults();

            return this.generatedSprites;
        } catch (error) {
            // Cleanup on error
            this.cleanup();
            throw error;
        }
    }

    prepareGenerationContext() {
        const spriteSize = this.uiController.getSpriteSize();
        const selectedAnimation = this.uiController.getSelectedAnimation();

        // Only use multiple frames if animation is selected
        const animationFrames = this.animationController.isAnimationSelected(selectedAnimation)
            ? this.uiController.getAnimationFrames()
            : 1;

        const animationDuration = this.animationController.getAnimationDuration(selectedAnimation);

        // Use distance from slider but angle from current camera view
        const distance = this.uiController.getCameraDistance();
        const pitch = this.threeSetup.getCurrentCameraPitch();

        // Calculate height and horizontal distance from pitch angle
        const height = distance * Math.sin(pitch);
        const horizontalDistance = distance * Math.cos(pitch);

        // Get directions
        let directions;
        const singleDirectionMode = this.uiController.isSingleDirectionEnabled();

        if (singleDirectionMode) {
            // Single direction mode - use current camera angle
            const currentAngle = this.threeSetup.getCurrentCameraAngle();
            directions = [{
                name: 'current_view',
                angle: currentAngle
            }];
        } else {
            // Multi-direction mode - use 8 or 16 directions
            const directionCount = this.uiController.getDirectionCount();
            directions = directionCount === 16 ? CONFIG.DIRECTIONS_16 : CONFIG.DIRECTIONS_8;
        }

        // Save state for restoration
        const originalCameraPosition = this.threeSetup.camera.position.clone();
        const originalSize = this.threeSetup.getRendererSize();
        const originalAspect = this.threeSetup.camera.aspect;

        // Setup for sprite rendering
        this.threeSetup.hideGrid();
        this.threeSetup.setTransparentBackground();
        this.uiController.updateProgress(10, 'Preparing renderer...');
        this.threeSetup.setRendererSize(spriteSize, spriteSize);

        // Set camera aspect to 1:1 for square sprites
        this.threeSetup.camera.aspect = 1.0;
        this.threeSetup.camera.updateProjectionMatrix();

        return {
            spriteSize,
            selectedAnimation,
            animationFrames,
            animationDuration,
            height,
            horizontalDistance,
            directions,
            originalCameraPosition,
            originalSize,
            originalAspect
        };
    }

    async generateAllDirectionalSprites(context) {
        const totalSprites = this.frameCalculator.calculateTotalSprites(
            context.directions.length,
            context.animationFrames
        );

        let completedSprites = 0;

        for (let directionIndex = 0; directionIndex < context.directions.length; directionIndex++) {
            const direction = context.directions[directionIndex];

            for (let frameIndex = 0; frameIndex < context.animationFrames; frameIndex++) {
                await this.generateSingleSprite(
                    direction,
                    directionIndex,
                    frameIndex,
                    context,
                    completedSprites,
                    totalSprites
                );

                completedSprites++;

                // Small delay for UI updates
                await this.delay(50);
            }
        }
    }

    async generateSingleSprite(direction, directionIndex, frameIndex, context, completedSprites, totalSprites) {
        // Update progress
        const progress = this.frameCalculator.calculateProgress(completedSprites, totalSprites);
        const statusText = context.animationFrames > 1
            ? `Rendering ${direction.name} frame ${frameIndex + 1}/${context.animationFrames}... (${completedSprites + 1}/${totalSprites})`
            : `Rendering ${direction.name}... (${completedSprites + 1}/${totalSprites})`;

        this.uiController.updateProgress(progress, statusText);

        // Set animation time if animation is selected
        if (this.animationController.isAnimationSelected(context.selectedAnimation)) {
            const animTime = this.frameCalculator.calculateFrameTime(
                frameIndex,
                context.animationFrames,
                context.animationDuration
            );
            this.animationController.setAnimationTime(animTime);
        }

        // Position camera
        const x = Math.sin(direction.angle) * context.horizontalDistance;
        const z = Math.cos(direction.angle) * context.horizontalDistance;
        this.threeSetup.setCameraPosition(x, context.height, z);
        this.threeSetup.setCameraLookAt(0, 0, 0);

        // Render and capture (use renderClean to exclude gizmo and helpers)
        this.threeSetup.renderClean();
        const dataURL = this.threeSetup.captureFrame();

        // Create sprite object
        const sprite = new Sprite(directionIndex, frameIndex, direction.name, dataURL);
        this.generatedSprites.push(sprite);
    }

    restoreRenderingState(context) {
        this.uiController.updateProgress(95, 'Restoring view...');

        // Restore renderer size
        this.threeSetup.setRendererSize(context.originalSize.width, context.originalSize.height);
        this.threeSetup.onWindowResize();

        // Restore camera
        this.threeSetup.setCameraPosition(
            context.originalCameraPosition.x,
            context.originalCameraPosition.y,
            context.originalCameraPosition.z
        );
        this.threeSetup.camera.aspect = context.originalAspect;
        this.threeSetup.camera.updateProjectionMatrix();

        // Restore grid and background
        this.threeSetup.showGrid();
        this.threeSetup.setOpaqueBackground();

        this.uiController.updateProgress(100, 'Complete!');
    }

    displayResults() {
        this.uiController.displaySprites(this.generatedSprites);
        this.uiController.enableDownloadButton();
        this.uiController.showSuccessMessage();

        setTimeout(() => {
            this.uiController.hideSuccessMessage();
            this.uiController.hideLoading();
        }, 2000);
    }

    cleanup() {
        // Restore rendering state if possible
        try {
            this.threeSetup.showGrid();
            this.threeSetup.setOpaqueBackground();
            this.uiController.hideLoading();
        } catch (e) {
            console.error('Error during cleanup:', e);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getGeneratedSprites() {
        return this.generatedSprites;
    }

    clearSprites() {
        this.generatedSprites = [];
    }
}
