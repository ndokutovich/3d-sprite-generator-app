// Animation Controller - Manages model animations
class AnimationController {
    constructor(threeSetup, uiController, animationLibrary) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.animationLibrary = animationLibrary;
        this.mixer = null;
        this.currentAnimationAction = null;
        this.animations = [];
        this.proceduralAnimations = CONFIG.PROCEDURAL_ANIMATIONS;
        this.currentProceduralAnimation = null;
        this.animationTime = 0;
        this.originalModelTransform = null;
        this.autoplay = false;
        this.lockPosition = false;
        this.lockedPosition = null; // Position to lock model at during animation
        this.lockedChildPositions = new Map(); // Map of object UUID -> locked position for all objects in hierarchy
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

            // Populate UI with embedded, library, and procedural animations
            const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];
            this.uiController.populateAnimationList(animations, libraryAnimations, this.proceduralAnimations);
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

        // Check if it's a library animation (Mixamo, uploaded)
        if (index >= CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET) {
            const libraryIndex = index - CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET;
            const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];

            if (libraryIndex >= 0 && libraryIndex < libraryAnimations.length) {
                const model = this.threeSetup.getLoadedModel();
                if (model) {
                    if (!this.mixer) {
                        this.mixer = new THREE.AnimationMixer(model);
                    }

                    const libraryAnim = libraryAnimations[libraryIndex];
                    this.currentAnimationAction = this.mixer.clipAction(libraryAnim.clip);
                    this.currentAnimationAction.play();
                    this.currentAnimationAction.paused = !this.autoplay;

                    this.uiController.setAnimationDuration(libraryAnim.duration);
                }
            }
        }
        // Check if it's a procedural animation
        else if (index >= CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET) {
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
            this.currentAnimationAction.paused = !this.autoplay;

            const duration = this.animations[index].duration;
            this.uiController.setAnimationDuration(duration);
        }

        // Enable both autoplay and lock position toggles by default when an animation is selected
        if (index >= 0) {
            // Enable toggles in UI
            this.uiController.setAutoplayEnabled(true);
            this.uiController.setLockPositionEnabled(true);

            // Enable toggles in controller
            this.setAutoplay(true);
            this.setLockPosition(true);

            // Resume current animation if it exists
            if (this.currentAnimationAction) {
                this.currentAnimationAction.paused = false;
            }
        } else {
            // Disable both when "No Animation" is selected
            this.uiController.setAutoplayEnabled(false);
            this.uiController.setLockPositionEnabled(false);
            this.setAutoplay(false);
            this.setLockPosition(false);
        }
    }

    setAnimationTime(time) {
        this.animationTime = time;

        if (this.currentAnimationAction && this.mixer) {
            // Embedded animation
            this.currentAnimationAction.time = time;
            this.mixer.update(0);

            // Restore locked positions after setting animation time (for sprite generation)
            this.restoreLockedPositions();
        } else if (this.currentProceduralAnimation) {
            // Procedural animation
            this.applyProceduralAnimation(time);

            // Restore locked positions after procedural animation
            this.restoreLockedPositions();
        }
    }

    /**
     * Restore all locked positions (root model and all children)
     * Called after animation updates to keep model in place
     */
    restoreLockedPositions() {
        if (!this.lockPosition) {
            return;
        }

        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            return;
        }

        // Restore root model position
        if (this.lockedPosition) {
            model.position.copy(this.lockedPosition);
        }

        // Restore ALL child object positions (bones, meshes, etc.)
        if (this.lockedChildPositions.size > 0) {
            model.traverse((child) => {
                if (child.uuid && this.lockedChildPositions.has(child.uuid)) {
                    const lockedPos = this.lockedChildPositions.get(child.uuid);
                    child.position.copy(lockedPos);
                }
            });
        }
    }

    update(delta) {
        // Update mixer (this may change positions if animation has root motion or bone translation)
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Restore locked positions after mixer update
        this.restoreLockedPositions();

        // Update procedural animation if autoplay enabled
        if (this.currentProceduralAnimation && this.autoplay) {
            this.animationTime += delta;
            // Loop the animation
            if (this.animationTime > this.currentProceduralAnimation.duration) {
                this.animationTime = this.animationTime % this.currentProceduralAnimation.duration;
            }
            this.applyProceduralAnimation(this.animationTime);

            // Restore locked positions after procedural animation
            this.restoreLockedPositions();
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

        // Still show library and procedural animations even when no embedded animations
        const model = this.threeSetup.getLoadedModel();
        if (model) {
            this.saveOriginalTransform();
            const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];
            this.uiController.populateAnimationList([], libraryAnimations, this.proceduralAnimations);
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

        // Check if it's library animation
        if (selectedAnimationIndex >= CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET) {
            const libraryIndex = selectedAnimationIndex - CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET;
            const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];
            if (libraryIndex >= 0 && libraryIndex < libraryAnimations.length) {
                return libraryAnimations[libraryIndex].duration;
            }
        }
        // Check if it's procedural
        else if (selectedAnimationIndex >= CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET) {
            const proceduralIndex = selectedAnimationIndex - CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET;
            if (proceduralIndex >= 0 && proceduralIndex < this.proceduralAnimations.length) {
                return this.proceduralAnimations[proceduralIndex].duration;
            }
        }
        // Embedded animation
        else if (selectedAnimationIndex >= 0 && selectedAnimationIndex < this.animations.length) {
            return this.animations[selectedAnimationIndex].duration;
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

    /**
     * Set autoplay mode
     * @param {boolean} enabled - Whether autoplay is enabled
     */
    setAutoplay(enabled) {
        this.autoplay = enabled;

        // Update current animation action if it exists
        if (this.currentAnimationAction) {
            this.currentAnimationAction.paused = !enabled;

            // Reset to beginning if enabling autoplay
            if (enabled && this.currentAnimationAction.time === 0) {
                this.currentAnimationAction.time = 0;
            }
        }

        // For procedural animations, reset time when enabling
        if (this.currentProceduralAnimation && enabled) {
            this.animationTime = 0;
        }
    }

    /**
     * Check if autoplay is enabled
     */
    isAutoplayEnabled() {
        return this.autoplay;
    }

    /**
     * Set lock position mode
     * @param {boolean} enabled - Whether position locking is enabled
     */
    setLockPosition(enabled) {
        this.lockPosition = enabled;
        console.log('🔒 Lock Position:', enabled);

        // Save current position when enabling
        if (enabled) {
            const model = this.threeSetup.getLoadedModel();
            if (model) {
                // Save root model position
                this.lockedPosition = model.position.clone();
                console.log('💾 Saved locked position:', this.lockedPosition.x.toFixed(3), this.lockedPosition.y.toFixed(3), this.lockedPosition.z.toFixed(3));

                // Also save ALL child object positions (including bones in skeleton)
                this.lockedChildPositions.clear();
                let childCount = 0;
                model.traverse((child) => {
                    if (child.position) {
                        this.lockedChildPositions.set(child.uuid, child.position.clone());
                        childCount++;
                    }
                });
                console.log('💾 Saved', childCount, 'child object positions in hierarchy');
            }
        } else {
            console.log('🔓 Position lock disabled');
            this.lockedPosition = null;
            this.lockedChildPositions.clear();
        }
    }

    /**
     * Check if position locking is enabled
     */
    isLockPositionEnabled() {
        return this.lockPosition;
    }

    /**
     * Analyze animation and suggest optimal frame count
     * Call this from console: app.animationController.analyzeAnimation(0)
     * @param {number} animationIndex - Index of animation to analyze
     */
    analyzeAnimation(animationIndex) {
        let clip = null;
        let source = '';

        // Get the animation clip
        if (animationIndex >= CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET) {
            const libraryIndex = animationIndex - CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET;
            const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];
            if (libraryIndex >= 0 && libraryIndex < libraryAnimations.length) {
                clip = libraryAnimations[libraryIndex].clip;
                source = 'library';
            }
        } else if (animationIndex >= 0 && animationIndex < this.animations.length) {
            clip = this.animations[animationIndex];
            source = 'embedded';
        }

        if (!clip) {
            console.error('❌ Animation not found at index', animationIndex);
            return;
        }

        console.log('\n=== 🎬 ANIMATION ANALYSIS ===');
        console.log('Name:', clip.name);
        console.log('Source:', source);
        console.log('Duration:', clip.duration.toFixed(3), 'seconds');
        console.log('Tracks:', clip.tracks.length, 'bones/properties animated');

        // Analyze root motion track (Hips position)
        const rootTrack = clip.tracks.find(t =>
            t.name.includes('Hips.position') ||
            t.name.includes('hip') ||
            t.name.includes('root.position')
        );

        if (rootTrack) {
            console.log('\n📍 ROOT MOTION TRACK:', rootTrack.name);
            console.log('   Keyframes:', rootTrack.times.length);
            console.log('   First keyframe times:', rootTrack.times.slice(0, 10).map(t => t.toFixed(3)).join(', '));

            // Calculate how much the root moves
            const startPos = new THREE.Vector3(
                rootTrack.values[0],
                rootTrack.values[1],
                rootTrack.values[2]
            );
            const endPos = new THREE.Vector3(
                rootTrack.values[rootTrack.values.length - 3],
                rootTrack.values[rootTrack.values.length - 2],
                rootTrack.values[rootTrack.values.length - 1]
            );
            const distance = startPos.distanceTo(endPos);
            console.log('   Total root displacement:', distance.toFixed(3), 'units');
            console.log('   ✅ Lock Position will prevent this movement');
        }

        // Suggest frame count based on duration and animation type
        console.log('\n💡 RECOMMENDED FRAME COUNTS:');

        const name = clip.name.toLowerCase();
        let suggestions = [];

        if (name.includes('walk')) {
            suggestions = [
                { frames: 8, reason: '✨ Standard walk cycle (contact, passing, contact, passing)' },
                { frames: 16, reason: '🎯 High detail walk (smooth, professional)' },
                { frames: 4, reason: '⚡ Minimal (contact poses only)' }
            ];
        } else if (name.includes('run')) {
            suggestions = [
                { frames: 8, reason: '✨ Standard run cycle' },
                { frames: 6, reason: '⚡ Fast run (fewer frames = faster feel)' },
                { frames: 12, reason: '🎯 Smooth run' }
            ];
        } else if (name.includes('idle')) {
            suggestions = [
                { frames: 4, reason: '✨ Breathing/subtle motion' },
                { frames: 1, reason: '⚡ Static pose (no animation)' },
                { frames: 8, reason: '🎯 Detailed idle with weight shifts' }
            ];
        } else if (name.includes('jump')) {
            suggestions = [
                { frames: 6, reason: '✨ Launch, apex, fall, land' },
                { frames: 4, reason: '⚡ Minimal (squat, launch, apex, land)' },
                { frames: 8, reason: '🎯 Detailed with anticipation' }
            ];
        } else if (name.includes('attack') || name.includes('punch') || name.includes('kick')) {
            suggestions = [
                { frames: 6, reason: '✨ Windup, strike, recovery' },
                { frames: 8, reason: '🎯 Detailed combat move' },
                { frames: 4, reason: '⚡ Fast attack' }
            ];
        } else {
            // Generic suggestions based on duration
            const fps60 = Math.ceil(clip.duration * 60);
            const fps30 = Math.ceil(clip.duration * 30);
            suggestions = [
                { frames: 8, reason: '✨ Standard sprite animation' },
                { frames: Math.min(fps30, 16), reason: `🎯 30 FPS equivalent (${clip.duration.toFixed(1)}s × 30)` },
                { frames: 4, reason: '⚡ Minimal frames' }
            ];
        }

        suggestions.forEach((s, i) => {
            const timing = Array.from({length: s.frames}, (_, i) =>
                (i / (s.frames - 1) * clip.duration).toFixed(3)
            ).slice(0, 4).join('s, ') + 's...';
            console.log(`   ${i + 1}. ${s.frames} frames - ${s.reason}`);
            console.log(`      Times: ${timing}`);
        });

        // Show what the current UI setting will capture
        const currentFrames = this.uiController.getAnimationFrames();
        console.log('\n⚙️  CURRENT UI SETTING:', currentFrames, 'frames');
        console.log('   Will capture at times:');
        for (let i = 0; i < Math.min(currentFrames, 8); i++) {
            const time = (i / Math.max(1, currentFrames - 1)) * clip.duration;
            console.log(`   Frame ${i}: ${time.toFixed(3)}s`);
        }
        if (currentFrames > 8) {
            console.log(`   ... and ${currentFrames - 8} more frames`);
        }

        console.log('\n📊 TIP: Use the animation time slider to preview each frame before generating!');
        console.log('=========================\n');
    }
}


