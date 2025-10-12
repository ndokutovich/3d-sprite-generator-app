// Sprite Generator - Handles sprite rendering from different angles
class SpriteGenerator {
    constructor(threeSetup, uiController, animationController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.animationController = animationController;
        this.generatedSprites = [];
    }

    async generateSprites() {
        if (!this.threeSetup.getLoadedModel()) {
            return Promise.reject(new Error('No model loaded'));
        }

        this.uiController.showLoading('Generating sprites...', 0);
        this.generatedSprites = [];

        const spriteSize = this.uiController.getSpriteSize();
        const selectedAnimation = this.uiController.getSelectedAnimation();

        // Only use multiple frames if animation is selected
        const animationFrames = selectedAnimation >= 0
            ? this.uiController.getAnimationFrames()
            : 1;

        // Use distance from slider but angle from current camera view
        const distance = this.uiController.getCameraDistance();
        const pitch = this.threeSetup.getCurrentCameraPitch();

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
        await this.generateDirectionalSprites(distance, pitch, animationFrames);

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

    async generateDirectionalSprites(distance, pitch, animationFrames) {
        const directionCount = this.uiController.getDirectionCount();
        const directions = directionCount === 16 ? CONFIG.DIRECTIONS_16 : CONFIG.DIRECTIONS_8;
        const spriteSize = this.uiController.getSpriteSize();

        // Get animation info
        const selectedAnimation = this.uiController.getSelectedAnimation();
        const animationDuration = this.getAnimationDuration(selectedAnimation);

        // Calculate height and horizontal distance from pitch angle and distance
        const height = distance * Math.sin(pitch);
        const horizontalDistance = distance * Math.cos(pitch);

        // Save original camera aspect ratio
        const originalAspect = this.threeSetup.camera.aspect;

        // Set camera aspect to 1:1 for square sprites
        this.threeSetup.camera.aspect = 1.0;
        this.threeSetup.camera.updateProjectionMatrix();

        let directionIndex = 0;
        let frameIndex = 0;
        const totalSprites = directions.length * animationFrames;
        let completedSprites = 0;

        return new Promise((resolve) => {
            const generateNextSprite = () => {
                if (directionIndex >= directions.length) {
                    // Restore original aspect ratio
                    this.threeSetup.camera.aspect = originalAspect;
                    this.threeSetup.camera.updateProjectionMatrix();
                    resolve();
                    return;
                }

                const dir = directions[directionIndex];
                const progress = 10 + (completedSprites / totalSprites) * 80;

                // Calculate animation time for this frame
                const animTime = animationFrames > 1
                    ? (frameIndex / (animationFrames - 1)) * animationDuration
                    : 0;

                this.uiController.updateProgress(
                    progress,
                    `Rendering ${dir.name} frame ${frameIndex + 1}/${animationFrames}... (${completedSprites + 1}/${totalSprites})`
                );

                // Set animation time if animation is selected
                if (selectedAnimation >= 0) {
                    this.animationController.setAnimationTime(animTime);
                }

                // Position camera using pitch angle
                const x = Math.sin(dir.angle) * horizontalDistance;
                const z = Math.cos(dir.angle) * horizontalDistance;
                this.threeSetup.setCameraPosition(x, height, z);
                this.threeSetup.setCameraLookAt(0, 0, 0);

                // Render
                this.threeSetup.render();

                // Capture sprite
                const dataURL = this.threeSetup.captureFrame();
                this.generatedSprites.push({
                    name: animationFrames > 1
                        ? `${dir.name}_frame${frameIndex}`
                        : dir.name,
                    directionIndex: directionIndex,
                    frameIndex: frameIndex,
                    directionName: dir.name,
                    data: dataURL
                });

                completedSprites++;
                frameIndex++;

                // Move to next direction if all frames are done
                if (frameIndex >= animationFrames) {
                    frameIndex = 0;
                    directionIndex++;
                }

                // Small delay to allow UI to update
                setTimeout(generateNextSprite, 50);
            };

            // Start generation
            setTimeout(generateNextSprite, 100);
        });
    }

    getAnimationDuration(selectedAnimation) {
        if (selectedAnimation < 0) return 1.0; // No animation

        // Check if it's procedural (index >= 1000)
        if (selectedAnimation >= 1000) {
            const proceduralIndex = selectedAnimation - 1000;
            if (proceduralIndex < CONFIG.PROCEDURAL_ANIMATIONS.length) {
                return CONFIG.PROCEDURAL_ANIMATIONS[proceduralIndex].duration;
            }
        } else {
            // Embedded animation
            const animations = this.animationController.getAnimations();
            if (selectedAnimation < animations.length) {
                return animations[selectedAnimation].duration;
            }
        }

        return 1.0; // Fallback
    }

    getGeneratedSprites() {
        return this.generatedSprites;
    }

    clearSprites() {
        this.generatedSprites = [];
    }
}
