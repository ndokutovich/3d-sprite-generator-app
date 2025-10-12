// Animation Controller - Manages model animations
class AnimationController {
    constructor(threeSetup, uiController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.mixer = null;
        this.currentAnimationAction = null;
        this.animations = [];
        this.proceduralAnimations = CONFIG.PROCEDURAL_ANIMATIONS;
        this.currentProceduralAnimation = null;
        this.animationTime = 0;
        this.originalModelTransform = null;
    }

    setAnimations(animations) {
        this.animations = animations;

        const model = this.threeSetup.getLoadedModel();
        if (model) {
            // Save original model transform for procedural animations
            this.saveOriginalTransform();

            // Setup mixer for embedded animations if present
            if (animations && animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(model);
            }

            // Populate UI with both embedded and procedural animations
            this.uiController.populateAnimationList(animations, this.proceduralAnimations);
        }
    }

    saveOriginalTransform() {
        const model = this.threeSetup.getLoadedModel();
        if (model) {
            this.originalModelTransform = {
                position: model.position.clone(),
                rotation: { x: model.rotation.x, y: model.rotation.y, z: model.rotation.z },
                scale: model.scale.clone()
            };
        }
    }

    restoreOriginalTransform() {
        const model = this.threeSetup.getLoadedModel();
        if (model && this.originalModelTransform) {
            model.position.copy(this.originalModelTransform.position);
            model.rotation.set(
                this.originalModelTransform.rotation.x,
                this.originalModelTransform.rotation.y,
                this.originalModelTransform.rotation.z
            );
            model.scale.copy(this.originalModelTransform.scale);
        }
    }

    selectAnimation(index) {
        // Stop current embedded animation
        if (this.currentAnimationAction) {
            this.currentAnimationAction.stop();
            this.currentAnimationAction = null;
        }

        // Clear procedural animation
        this.currentProceduralAnimation = null;
        this.animationTime = 0;

        // Restore original transform
        this.restoreOriginalTransform();

        // Check if it's a procedural animation (using offset constant)
        if (index >= CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET) {
            const proceduralIndex = index - CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET;
            if (proceduralIndex >= 0 && proceduralIndex < this.proceduralAnimations.length) {
                this.currentProceduralAnimation = this.proceduralAnimations[proceduralIndex];
                const duration = this.currentProceduralAnimation.duration;
                this.uiController.setAnimationDuration(duration);
            }
        }
        // Otherwise it's an embedded animation
        else if (index >= 0 && this.animations[index] && this.mixer) {
            this.currentAnimationAction = this.mixer.clipAction(this.animations[index]);
            this.currentAnimationAction.play();
            this.currentAnimationAction.paused = true;

            const duration = this.animations[index].duration;
            this.uiController.setAnimationDuration(duration);
        }
    }

    setAnimationTime(time) {
        this.animationTime = time;

        if (this.currentAnimationAction && this.mixer) {
            // Embedded animation
            this.currentAnimationAction.time = time;
            this.mixer.update(0);
        } else if (this.currentProceduralAnimation) {
            // Procedural animation
            this.applyProceduralAnimation(time);
        }
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Update procedural animation if playing
        if (this.currentProceduralAnimation) {
            this.animationTime += delta;
            // Loop the animation
            if (this.animationTime > this.currentProceduralAnimation.duration) {
                this.animationTime = this.animationTime % this.currentProceduralAnimation.duration;
            }
            this.applyProceduralAnimation(this.animationTime);
        }
    }

    applyProceduralAnimation(time) {
        const model = this.threeSetup.getLoadedModel();
        if (!model || !this.currentProceduralAnimation || !this.originalModelTransform) return;

        // Restore to original state first
        this.restoreOriginalTransform();

        const anim = this.currentProceduralAnimation;
        const t = time / anim.duration; // Normalized time (0-1)

        switch (anim.type) {
            case 'bounce':
                // Vertical bounce using sine wave
                const bounceOffset = Math.sin(t * Math.PI * 2) * anim.amplitude;
                model.position.y += bounceOffset;
                break;

            case 'rotate':
                // Continuous rotation
                model.rotation.y += time * anim.speed;
                break;

            case 'pulse':
                // Scale pulse using sine wave
                const pulseScale = 1 + Math.sin(t * Math.PI * 2) * anim.amplitude;
                model.scale.multiplyScalar(pulseScale);
                break;

            case 'bob':
                // Smooth up/down motion using cosine
                const bobOffset = Math.cos(t * Math.PI * 2) * anim.amplitude;
                model.position.y += bobOffset;
                break;
        }
    }

    reset() {
        this.mixer = null;
        this.currentAnimationAction = null;
        this.currentProceduralAnimation = null;
        this.animationTime = 0;
        this.animations = [];
        this.restoreOriginalTransform();

        // Still show procedural animations even when no embedded animations
        const model = this.threeSetup.getLoadedModel();
        if (model) {
            this.saveOriginalTransform();
            this.uiController.populateAnimationList([], this.proceduralAnimations);
        } else {
            this.originalModelTransform = null;
            this.uiController.resetAnimationControls();
        }
    }

    getAnimations() {
        return this.animations;
    }

    hasMixer() {
        return this.mixer !== null;
    }

    hasActiveAnimation() {
        return this.mixer !== null || this.currentProceduralAnimation !== null;
    }

    /**
     * Get duration of currently selected animation
     * @param {number} selectedAnimationIndex - Animation index from UI
     * @returns {number} Duration in seconds
     */
    getAnimationDuration(selectedAnimationIndex) {
        if (selectedAnimationIndex < 0) {
            return 1.0; // No animation
        }

        // Check if it's procedural
        if (selectedAnimationIndex >= CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET) {
            const proceduralIndex = selectedAnimationIndex - CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET;
            if (proceduralIndex >= 0 && proceduralIndex < this.proceduralAnimations.length) {
                return this.proceduralAnimations[proceduralIndex].duration;
            }
        } else {
            // Embedded animation
            if (selectedAnimationIndex >= 0 && selectedAnimationIndex < this.animations.length) {
                return this.animations[selectedAnimationIndex].duration;
            }
        }

        return 1.0; // Fallback
    }

    /**
     * Check if animation is selected (not "No Animation")
     * @param {number} selectedAnimationIndex - Animation index from UI
     * @returns {boolean}
     */
    isAnimationSelected(selectedAnimationIndex) {
        return selectedAnimationIndex >= 0;
    }
}

