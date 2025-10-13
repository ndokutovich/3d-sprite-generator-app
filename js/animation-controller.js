// Animation Controller - Manages model animations
class AnimationController {
    constructor(threeSetup, uiController, animationLibrary, equipmentManager) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.animationLibrary = animationLibrary;
        this.equipmentManager = equipmentManager;
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


    /**
     * Apply first frame of Mixamo animation to see T-pose
     * Call this from console: app.animationController.showMixamoTPose()
     */
    showMixamoTPose() {
        const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];
        if (libraryAnimations.length === 0) {
            console.log('❌ No library animations loaded');
            return;
        }

        console.log('\n=== 👤 APPLYING MIXAMO T-POSE ===\n');

        // Get first animation (any will do, we just want frame 0 = T-pose)
        const anim = libraryAnimations[0];
        console.log(`Using animation: ${anim.name}`);

        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return;
        }

        // Create mixer if needed
        if (!this.mixer) {
            this.mixer = new THREE.AnimationMixer(model);
        }

        // Use animation directly (no retargeting)
        const clipToPlay = anim.clip;

        // Create action and apply ONLY first frame (time = 0)
        const action = this.mixer.clipAction(clipToPlay);
        action.play();
        action.paused = true; // Freeze
        action.time = 0; // First frame = T-pose
        this.mixer.update(0); // Apply

        // Disable autoplay to keep it frozen
        this.autoplay = false;
        this.uiController.setAutoplayEnabled(false);

        console.log('✅ Applied first frame of Mixamo animation (T-pose)');
        console.log('💡 This shows the T-pose from the animation');
        console.log('\n================================\n');
    }

    /**
     * Auto-calculate rotation needed to align model with Mixamo coordinate system
     * Call this from console: app.animationController.autoCalculateRotation()
     */
    autoCalculateRotation() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return null;
        }

        console.log('\n=== 🧮 AUTO-CALCULATING ROTATION OFFSET ===\n');

        // Find Head bone position in rest pose (no animation)
        let headBone = null;
        model.traverse((child) => {
            if (child.isBone && child.name === 'Head') {
                headBone = child;
            }
        });

        if (!headBone) {
            console.log('❌ Head bone not found');
            return null;
        }

        // Get Head world position
        const headPos = new THREE.Vector3();
        headBone.getWorldPosition(headPos);

        console.log('Head position:', headPos.x.toFixed(2), headPos.y.toFixed(2), headPos.z.toFixed(2));

        // Determine which axis the head is pointing along
        const absX = Math.abs(headPos.x);
        const absY = Math.abs(headPos.y);
        const absZ = Math.abs(headPos.z);

        let dominantAxis = '';
        let rotationNeeded = { x: 0, y: 0, z: 0 };

        if (absZ > absY && absZ > absX) {
            // Head is along Z axis (pointing forward/backward)
            console.log('🔍 Head is along Z-axis (model is Z-up)');
            console.log('   Mixamo expects Y-up');

            if (headPos.z > 0) {
                console.log('   Head pointing +Z (forward)');
                rotationNeeded = { x: -90, y: 0, z: 0 };
            } else {
                console.log('   Head pointing -Z (backward)');
                rotationNeeded = { x: 90, y: 0, z: 0 };
            }
            dominantAxis = 'Z';
        } else if (absY > absX && absY > absZ) {
            // Head is along Y axis (pointing up/down) - correct!
            console.log('✅ Head is along Y-axis (model is Y-up like Mixamo)');

            if (headPos.y < 0) {
                console.log('   But head pointing DOWN, need 180° flip');
                rotationNeeded = { x: 180, y: 0, z: 0 };
            } else {
                console.log('   No rotation needed for Y-axis');
                rotationNeeded = null;
            }
            dominantAxis = 'Y';
        } else {
            // Head is along X axis (sideways)
            console.log('🔍 Head is along X-axis (model is sideways)');
            if (headPos.x > 0) {
                console.log('   Head pointing +X (right)');
                rotationNeeded = { x: 0, y: 0, z: -90 };
            } else {
                console.log('   Head pointing -X (left)');
                rotationNeeded = { x: 0, y: 0, z: 90 };
            }
            dominantAxis = 'X';
        }

        if (rotationNeeded) {
            console.log('\n💡 CALCULATED ROTATION:');
            console.log(`   { x: ${rotationNeeded.x}, y: ${rotationNeeded.y}, z: ${rotationNeeded.z} }`);
            console.log('\n📝 Copy this to equipment-manager.js line ~768:');
            console.log(`   globalRotationOffset: { x: ${rotationNeeded.x}, y: ${rotationNeeded.y}, z: ${rotationNeeded.z} }`);
        }

        console.log('\n================================\n');
        return rotationNeeded;
    }

    /**
     * Diagnostic function: Compare expected vs actual bone positions
     * Call this from console: app.animationController.diagnoseBoneOrientation()
     */
    diagnoseBoneOrientation() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return;
        }

        console.log('\n=== 🔬 BONE ORIENTATION DIAGNOSTICS ===\n');

        // Key bones to check
        const keyBones = {
            'Head': { expected: 'Top (Y+)', typical: [0, 1.7, 0] },
            'L_Hand': { expected: 'Left (X-)', typical: [-0.7, 1, 0] },
            'R_Hand': { expected: 'Right (X+)', typical: [0.7, 1, 0] },
            'L_Foot': { expected: 'Bottom-Left', typical: [-0.2, 0, 0] },
            'R_Foot': { expected: 'Bottom-Right', typical: [0.2, 0, 0] }
        };

        console.log('Expected T-Pose (Mixamo standard):');
        console.log('  Head: Top of character (Y+, around [0, 1.7, 0])');
        console.log('  L_Hand: Left side (X-, around [-0.7, 1, 0])');
        console.log('  R_Hand: Right side (X+, around [0.7, 1, 0])');
        console.log('  Feet: Bottom (Y near 0)\n');

        console.log('Actual positions in YOUR model:\n');

        const results = {};
        model.traverse((child) => {
            if (child.isBone && keyBones[child.name]) {
                const worldPos = new THREE.Vector3();
                child.getWorldPosition(worldPos);

                const info = keyBones[child.name];
                console.log(`${child.name}:`);
                console.log(`  Expected: ${info.expected} ~${JSON.stringify(info.typical)}`);
                console.log(`  Actual:   [${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}]`);

                // Calculate where it actually is
                const absX = Math.abs(worldPos.x);
                const absY = Math.abs(worldPos.y);
                const absZ = Math.abs(worldPos.z);
                const max = Math.max(absX, absY, absZ);

                let actualDirection = '';
                if (max === absX) actualDirection = worldPos.x > 0 ? 'Right (X+)' : 'Left (X-)';
                else if (max === absY) actualDirection = worldPos.y > 0 ? 'Top (Y+)' : 'Bottom (Y-)';
                else if (max === absZ) actualDirection = worldPos.z > 0 ? 'Front (Z+)' : 'Back (Z-)';

                console.log(`  Direction: ${actualDirection}`);
                console.log('');

                results[child.name] = {
                    expected: info.expected,
                    actual: actualDirection,
                    pos: worldPos.clone()
                };
            }
        });

        // Analyze the pattern
        console.log('=== 🧮 ANALYSIS ===\n');

        // Check if X/Y/Z axes are swapped
        const head = results['Head'];
        const leftHand = results['L_Hand'];
        const rightHand = results['R_Hand'];

        if (head) {
            if (head.actual.includes('Z+')) {
                console.log('🔍 Head is pointing FORWARD (Z+) instead of UP (Y+)');
                console.log('   → Your rig is Z-up, Mixamo is Y-up');
                console.log('   → Need: X-axis 90° rotation');
            } else if (head.actual.includes('Z-')) {
                console.log('🔍 Head is pointing BACKWARD (Z-) instead of UP (Y+)');
                console.log('   → Need: X-axis -90° rotation');
            } else if (head.actual.includes('X')) {
                console.log('🔍 Head is pointing SIDEWAYS instead of UP');
                console.log('   → Need: Z-axis rotation');
            } else if (head.actual.includes('Y-')) {
                console.log('🔍 Head is pointing DOWN instead of UP');
                console.log('   → Need: 180° rotation');
            }
        }

        if (leftHand && rightHand) {
            if (leftHand.actual.includes('Z') || rightHand.actual.includes('Z')) {
                console.log('🔍 Hands are pointing FORWARD/BACK instead of LEFT/RIGHT');
                console.log('   → Arms oriented wrong, may need Y-axis rotation');
            }
        }

        console.log('\n💡 SUGGESTED ROTATION TESTS:');
        console.log('   Try these in equipment-manager.js line 767:');
        console.log('   1. { x: 90, y: 0, z: 0 }   - Z-up to Y-up');
        console.log('   2. { x: -90, y: 0, z: 0 }  - Z-up to Y-up (opposite)');
        console.log('   3. { x: 0, y: 90, z: 0 }   - Turn 90° left');
        console.log('   4. { x: 0, y: 180, z: 0 }  - Turn around 180°');
        console.log('   5. { x: 90, y: 180, z: 0 } - Flip + turn');

        console.log('\n================================\n');

        return results;
    }

    /**
     * Debug function: Show animation tracks
     * Call this from console: app.animationController.debugAnimationTracks()
     */
    debugAnimationTracks() {
        const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];
        if (libraryAnimations.length === 0) {
            console.log('❌ No library animations loaded');
            return;
        }

        const walkAnim = libraryAnimations.find(a => a.name.toLowerCase().includes('walk'));
        if (!walkAnim) {
            console.log('❌ Walk animation not found');
            return;
        }

        console.log('\n=== 🎬 ANIMATION TRACKS DEBUG ===');
        console.log('Animation:', walkAnim.name);
        console.log('Duration:', walkAnim.duration, 'seconds');
        console.log('\n📋 ANIMATION TRACKS:');

        walkAnim.clip.tracks.slice(0, 10).forEach((track, i) => {
            const type = track.constructor.name;
            const valueCount = track.values.length;
            console.log(`  ${i + 1}. ${track.name} (${type}, ${valueCount} values)`);
        });

        console.log(`  ... and ${walkAnim.clip.tracks.length - 10} more tracks`);

        // Find Hip/Pelvis tracks specifically
        console.log('\n🔍 HIP/PELVIS ROTATION TRACKS:');
        const hipTracks = walkAnim.clip.tracks.filter(t =>
            (t.name.includes('Hip') || t.name.includes('Pelvis')) &&
            (t.name.includes('quaternion') || t.name.includes('rotation'))
        );

        if (hipTracks.length > 0) {
            hipTracks.forEach(track => {
                const type = track.constructor.name;
                console.log(`  ✅ ${track.name} (${type})`);
                console.log(`     Values: [${track.values.slice(0, 8).map(v => v.toFixed(3)).join(', ')}...]`);
            });
        } else {
            console.log('  ❌ No Hip/Pelvis rotation tracks found!');
            console.log('  💡 Available track names containing "Hip" or "Pelvis":');
            walkAnim.clip.tracks
                .filter(t => t.name.toLowerCase().includes('hip') || t.name.toLowerCase().includes('pelvis'))
                .forEach(t => console.log(`     - ${t.name}`));
        }

        console.log('\n=========================\n');
    }

    /**
     * Debug function: Check if model has bind pose (pose mesh was rigged to)
     * Call this from console: app.animationController.checkBindPose()
     */
    checkBindPose() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return;
        }

        console.log('\n=== 🧬 BIND POSE CHECK ===\n');

        // Find skeleton
        let skeleton = null;
        model.traverse((child) => {
            if (child.isSkinnedMesh && child.skeleton) {
                skeleton = child.skeleton;
            }
        });

        if (!skeleton) {
            console.log('❌ No skeleton found');
            return;
        }

        console.log(`✅ Found skeleton with ${skeleton.bones.length} bones`);

        // Check if bones have bind matrices (inverse bind matrices)
        const hasBind = skeleton.boneInverses && skeleton.boneInverses.length > 0;
        console.log(`Bind pose: ${hasBind ? '✅ YES' : '❌ NO'}`);

        if (hasBind) {
            console.log('\n💡 Your model HAS bind pose information!');
            console.log('This means the mesh was rigged to a SPECIFIC pose (bind pose),');
            console.log('but the skeleton is currently in a DIFFERENT pose (rest pose).');
            console.log('\n🔧 SOLUTION: Reset skeleton to bind pose before applying animations\n');

            // Show difference between current pose and bind pose for key bones
            console.log('Key bone analysis:\n');

            const keyBones = ['Root', 'Pelvis', 'L_Thigh', 'R_Thigh', 'Waist', 'L_Upperarm', 'R_Upperarm'];

            skeleton.bones.forEach((bone, index) => {
                if (keyBones.includes(bone.name)) {
                    const bindMatrix = skeleton.boneInverses[index];

                    // Extract bind pose position/rotation
                    const bindPos = new THREE.Vector3();
                    const bindRot = new THREE.Quaternion();
                    const bindScale = new THREE.Vector3();
                    const inverseBind = bindMatrix.clone().invert();
                    inverseBind.decompose(bindPos, bindRot, bindScale);

                    // Current pose
                    const currentPos = bone.position.clone();
                    const currentRot = bone.quaternion.clone();

                    // Calculate difference
                    const posDiff = currentPos.distanceTo(bindPos);
                    const rotDiff = currentRot.angleTo(bindRot) * 180 / Math.PI;

                    console.log(`${bone.name}:`);
                    console.log(`  Current pos: [${currentPos.x.toFixed(3)}, ${currentPos.y.toFixed(3)}, ${currentPos.z.toFixed(3)}]`);
                    console.log(`  Bind pos:    [${bindPos.x.toFixed(3)}, ${bindPos.y.toFixed(3)}, ${bindPos.z.toFixed(3)}]`);
                    console.log(`  Position diff: ${posDiff.toFixed(3)} units`);
                    console.log(`  Rotation diff: ${rotDiff.toFixed(1)}°`);
                    console.log('');
                }
            });

            console.log('💡 RECOMMENDATION:');
            console.log('Call app.animationController.resetToBindPose() to fix the skeleton');
        } else {
            console.log('\n⚠️ Your model has NO bind pose information!');
            console.log('The skeleton is "baked" into the current (broken) pose.');
            console.log('\n🔧 SOLUTION: Re-export model from Blender with proper rest pose');
        }

        console.log('\n================================\n');
    }

    /**
     * Reset skeleton to bind pose - INTERNAL (no logging)
     * Called automatically when model loads
     */
    resetToBindPoseInternal() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) return;

        // Find skeleton
        let skeleton = null;
        model.traverse((child) => {
            if (child.isSkinnedMesh && child.skeleton) {
                skeleton = child.skeleton;
            }
        });

        if (!skeleton || !skeleton.boneInverses || skeleton.boneInverses.length === 0) {
            return; // No bind pose info, skip silently
        }

        // Save model's world position to restore later
        const modelWorldPos = model.position.clone();

        // Reset skeleton to bind pose
        skeleton.pose();

        // Restore model position (pose() might have moved it)
        model.position.copy(modelWorldPos);

        // Update matrices
        skeleton.bones[0].updateMatrixWorld(true);
    }

    /**
     * Reset skeleton to bind pose (the pose mesh was rigged to)
     * Call this from console: app.animationController.resetToBindPose()
     */
    resetToBindPose() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return;
        }

        console.log('\n=== 🔄 RESETTING TO BIND POSE ===\n');

        // Find skeleton
        let skeleton = null;
        let skinnedMesh = null;
        model.traverse((child) => {
            if (child.isSkinnedMesh && child.skeleton) {
                skeleton = child.skeleton;
                skinnedMesh = child;
            }
        });

        if (!skeleton || !skeleton.boneInverses || skeleton.boneInverses.length === 0) {
            console.log('❌ No bind pose information found');
            return;
        }

        // Save model's world position to restore later
        const modelWorldPos = model.position.clone();

        // Reset skeleton to bind pose by calling Three.js built-in method
        skeleton.pose();

        // Restore model position (pose() might have moved it)
        model.position.copy(modelWorldPos);

        // Update matrices
        skeleton.bones[0].updateMatrixWorld(true);

        console.log('✅ Reset skeleton to bind pose');
        console.log('💡 Model should now be in the pose it was rigged in!');
        console.log('\n================================\n');
    }

    /**
     * Debug function: Log current bone transforms during animation
     * Call this from console: app.animationController.debugBoneTransforms()
     */
    debugBoneTransforms() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return;
        }

        console.log('\n=== 🦴 BONE TRANSFORMS DEBUG ===');

        const bonesToCheck = ['Hip', 'L_Thigh', 'L_Hand', 'R_Hand', 'Head'];

        model.traverse((child) => {
            if (child.isBone && bonesToCheck.includes(child.name)) {
                const worldPos = new THREE.Vector3();
                const worldRot = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();

                child.getWorldPosition(worldPos);
                child.getWorldQuaternion(worldRot);
                child.getWorldScale(worldScale);

                const euler = new THREE.Euler().setFromQuaternion(worldRot);

                console.log(`\n${child.name}:`);
                console.log(`  Local Pos: [${child.position.x.toFixed(3)}, ${child.position.y.toFixed(3)}, ${child.position.z.toFixed(3)}]`);
                console.log(`  Local Rot: [${(child.rotation.x * 180/Math.PI).toFixed(1)}°, ${(child.rotation.y * 180/Math.PI).toFixed(1)}°, ${(child.rotation.z * 180/Math.PI).toFixed(1)}°]`);
                console.log(`  World Pos: [${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)}]`);
                console.log(`  World Rot: [${(euler.x * 180/Math.PI).toFixed(1)}°, ${(euler.y * 180/Math.PI).toFixed(1)}°, ${(euler.z * 180/Math.PI).toFixed(1)}°]`);
            }
        });

        console.log('\n💡 TIP: Play the animation and call this function to see how bones move');
        console.log('================================\n');
    }
}


