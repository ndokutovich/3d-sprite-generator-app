// Animation Controller - Manages model animations
class AnimationController {
    constructor(threeSetup, uiController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.mixer = null;
        this.currentAnimationAction = null;
        this.animations = [];
    }

    setAnimations(animations) {
        this.animations = animations;

        if (animations && animations.length > 0) {
            const model = this.threeSetup.getLoadedModel();
            if (model) {
                this.mixer = new THREE.AnimationMixer(model);
                this.uiController.populateAnimationList(animations);
            }
        } else {
            this.reset();
        }
    }

    selectAnimation(index) {
        // Stop current animation
        if (this.currentAnimationAction) {
            this.currentAnimationAction.stop();
            this.currentAnimationAction = null;
        }

        // Start new animation if valid index
        if (index >= 0 && this.animations[index] && this.mixer) {
            this.currentAnimationAction = this.mixer.clipAction(this.animations[index]);
            this.currentAnimationAction.play();
            this.currentAnimationAction.paused = true;

            const duration = this.animations[index].duration;
            this.uiController.setAnimationDuration(duration);
        }
    }

    setAnimationTime(time) {
        if (this.currentAnimationAction && this.mixer) {
            this.currentAnimationAction.time = time;
            this.mixer.update(0);
        }
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    reset() {
        this.mixer = null;
        this.currentAnimationAction = null;
        this.animations = [];
        this.uiController.resetAnimationControls();
    }

    getAnimations() {
        return this.animations;
    }

    hasMixer() {
        return this.mixer !== null;
    }
}
