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
        this.boneMapping = null; // Mapping from Mixamo bone names to custom rig bone names
        this.axisCorrection = null; // Axis correction settings from preset (scale, rotation, position remapping)
    }

    setAnimations(animations) {
        this.animations = animations;

        const model = this.threeSetup.getLoadedModel();
        if (model) {
            // Save original model transform for procedural animations
            this.saveOriginalTransform();

            // Generate bone mapping for animation retargeting (custom rigs)
            this.generateBoneMapping();

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

        // Apply coordinate system correction to ROOT BONE if using retargeted animations
        if (this.axisCorrection && this.axisCorrection.globalRotationOffset && index >= 0) {
            const model = this.threeSetup.getLoadedModel();
            if (model) {
                const rot = this.axisCorrection.globalRotationOffset;

                // Find root bone (Root or Hip)
                let rootBone = null;
                model.traverse((child) => {
                    if (child.isBone && (child.name === 'Root' || child.name === 'Hip')) {
                        if (!rootBone || child.name === 'Root') {
                            rootBone = child;
                        }
                    }
                });

                if (rootBone) {
                    // Apply rotation to root bone
                    const euler = new THREE.Euler(
                        rot.x * Math.PI / 180,
                        rot.y * Math.PI / 180,
                        rot.z * Math.PI / 180,
                        'XYZ'
                    );
                    rootBone.rotation.copy(euler);
                    console.log(`🔄 Applied rotation to ${rootBone.name}: (${rot.x}°, ${rot.y}°, ${rot.z}°)`);
                } else {
                    // Fallback: apply to model
                    model.rotation.set(
                        rot.x * Math.PI / 180,
                        rot.y * Math.PI / 180,
                        rot.z * Math.PI / 180
                    );
                    console.log(`🔄 Applied model rotation: (${rot.x}°, ${rot.y}°, ${rot.z}°)`);
                }
            }
        }

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

                    // Retarget animation if we have a bone mapping (custom rig)
                    let clipToPlay = libraryAnim.clip;
                    if (this.boneMapping && Object.keys(this.boneMapping).length > 0) {
                        clipToPlay = this.retargetAnimation(libraryAnim.clip);
                    }

                    this.currentAnimationAction = this.mixer.clipAction(clipToPlay);
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
     * Auto-detect and generate bone mapping for animation retargeting
     * Called when model is loaded
     */
    generateBoneMapping() {
        if (!this.equipmentManager) {
            console.warn('⚠️ Equipment manager not available for bone mapping');
            return;
        }

        const analysis = this.equipmentManager.analyzeSkeleton();
        if (!analysis) {
            console.warn('⚠️ No skeleton found for bone mapping');
            return;
        }

        // If it's already a Mixamo rig, no mapping needed
        if (analysis.isMixamo) {
            console.log('✅ Mixamo rig detected - no retargeting needed');
            this.boneMapping = null;
            return;
        }

        // PRIORITY 1: Try to load manual mapping from localStorage
        const manualMapping = this.equipmentManager.getManualMappingForAnimations();
        if (manualMapping && Object.keys(manualMapping).length > 0) {
            this.boneMapping = manualMapping;
            console.log('🗺️ Using MANUAL bone mapping from localStorage:');
            console.log(`   Mapped ${Object.keys(this.boneMapping).length} bones`);
            console.log('   Mixamo animations will use your saved custom mapping');
            return this.boneMapping;
        }

        // PRIORITY 2: Check for preset rig types (100% accurate hardcoded mappings)
        const presetRig = this.equipmentManager.detectPresetRigType();
        if (presetRig && presetRig.mapping) {
            // Invert the preset mapping: Mixamo name -> Custom name
            this.boneMapping = {};
            for (const [customBoneName, mixamoBoneName] of Object.entries(presetRig.mapping)) {
                if (mixamoBoneName) { // Skip null mappings (twist bones, etc.)
                    this.boneMapping[mixamoBoneName] = customBoneName;
                }
            }

            // Store axis correction info for use during retargeting
            this.axisCorrection = presetRig.axisCorrection || null;

            console.log(`🗺️ Using PRESET bone mapping: ${presetRig.name}`);
            console.log(`   Mapped ${Object.keys(this.boneMapping).length} bones (100% accuracy)`);
            if (this.axisCorrection && this.axisCorrection.positionScale) {
                console.log(`   Position scale: ${this.axisCorrection.positionScale} (converting Mixamo cm to meters)`);
            }
            console.log('   Mixamo animations will be perfectly retargeted!');
            return this.boneMapping;
        }

        // PRIORITY 3: Fall back to auto-mapping (fuzzy matching)
        const mappingResult = this.equipmentManager.autoMapToMixamo();

        if (!mappingResult || Object.keys(mappingResult.mapping).length === 0) {
            console.warn('⚠️ Could not generate bone mapping');
            this.boneMapping = null;
            return;
        }

        // Invert the mapping: Mixamo name -> Custom name
        this.boneMapping = {};
        for (const [customBoneName, data] of Object.entries(mappingResult.mapping)) {
            const mixamoBoneName = data.mixamoBone;
            this.boneMapping[mixamoBoneName] = customBoneName;
        }

        console.log('🗺️ Using AUTO bone mapping for animation retargeting:');
        console.log(`   Mapped ${Object.keys(this.boneMapping).length} bones (${mappingResult.matchRate} match rate)`);
        console.log('   💡 Use Manual Mapping tab in Bone Viewer to improve accuracy');

        return this.boneMapping;
    }

    /**
     * Retarget animation clip from Mixamo bone names to custom rig bone names
     * @param {THREE.AnimationClip} clip - Original animation clip
     * @returns {THREE.AnimationClip} New clip with retargeted bone names
     */
    retargetAnimation(clip) {
        if (!this.boneMapping || Object.keys(this.boneMapping).length === 0) {
            // No mapping, return original clip
            return clip;
        }

        const newTracks = [];
        let remappedCount = 0;
        let skippedCount = 0;

        for (const track of clip.tracks) {
            // Track name format: "boneName.property" or "mixamorig:boneName.property"
            let trackName = track.name;
            let newTrackName = trackName;

            // Extract bone name and property
            // Examples: "mixamorig:Hips.position", "LeftArm.quaternion", "RightHand.position"
            const dotIndex = trackName.lastIndexOf('.');
            if (dotIndex > 0) {
                const bonePart = trackName.substring(0, dotIndex);
                const property = trackName.substring(dotIndex); // includes the dot

                // Remove "mixamorig:" prefix if present
                const cleanBoneName = bonePart.replace('mixamorig:', '').replace('mixamorig', '');

                // Check if we have a mapping for this bone
                if (this.boneMapping[cleanBoneName]) {
                    const customBoneName = this.boneMapping[cleanBoneName];
                    newTrackName = customBoneName + property;
                    remappedCount++;
                } else {
                    // No mapping found - keep original name but log it
                    skippedCount++;
                }
            }

            // Apply axis correction if needed (scale position values)
            let trackValues = track.values;
            const isPositionTrack = trackName.includes('.position');
            const isQuaternionTrack = trackName.includes('.quaternion');

            if (isPositionTrack && this.axisCorrection && this.axisCorrection.positionScale) {
                // Scale position values (Mixamo is in cm, convert to meters)
                const scale = this.axisCorrection.positionScale;
                trackValues = new Float32Array(track.values.length);
                for (let i = 0; i < track.values.length; i++) {
                    trackValues[i] = track.values[i] * scale;
                }
            }

            // Apply per-bone rotation offsets to quaternion tracks
            if (isQuaternionTrack && this.axisCorrection) {
                // FIRST: Invert quaternions if globalRotationOffset exists (fixes inverted bone axes)
                if (this.axisCorrection.globalRotationOffset) {
                    const rot = this.axisCorrection.globalRotationOffset;
                    const invertEuler = new THREE.Euler(
                        rot.x * Math.PI / 180,
                        rot.y * Math.PI / 180,
                        rot.z * Math.PI / 180,
                        'XYZ'
                    );
                    const invertQuat = new THREE.Quaternion().setFromEuler(invertEuler);

                    trackValues = new Float32Array(track.values.length);
                    const tempQuat = new THREE.Quaternion();

                    for (let i = 0; i < track.values.length; i += 4) {
                        tempQuat.set(
                            track.values[i],
                            track.values[i + 1],
                            track.values[i + 2],
                            track.values[i + 3]
                        );

                        // Pre-multiply: newQuat = invertQuat * originalQuat
                        tempQuat.premultiply(invertQuat);

                        trackValues[i] = tempQuat.x;
                        trackValues[i + 1] = tempQuat.y;
                        trackValues[i + 2] = tempQuat.z;
                        trackValues[i + 3] = tempQuat.w;
                    }
                }

                // SECOND: Apply per-bone offsets (if any)
                if (this.axisCorrection.boneRotationOffsets) {
                    // Extract bone name from the NEW track name (after remapping)
                    const dotIdx = newTrackName.lastIndexOf('.');
                    if (dotIdx > 0) {
                        const boneName = newTrackName.substring(0, dotIdx);

                        // Check if this bone has a rotation offset
                        if (this.axisCorrection.boneRotationOffsets[boneName]) {
                            const rotOffset = this.axisCorrection.boneRotationOffsets[boneName];

                            // Convert degrees to radians and create offset quaternion
                            const offsetEuler = new THREE.Euler(
                                rotOffset.x * Math.PI / 180,
                                rotOffset.y * Math.PI / 180,
                                rotOffset.z * Math.PI / 180,
                                'XYZ'
                            );
                            const offsetQuat = new THREE.Quaternion().setFromEuler(offsetEuler);

                            // Use trackValues if already modified by global rotation, otherwise use original
                            const sourceValues = trackValues || track.values;
                            trackValues = new Float32Array(sourceValues.length);
                            const tempQuat = new THREE.Quaternion();

                            for (let i = 0; i < sourceValues.length; i += 4) {
                                // Read quaternion (either inverted or original)
                                tempQuat.set(
                                    sourceValues[i],
                                    sourceValues[i + 1],
                                    sourceValues[i + 2],
                                    sourceValues[i + 3]
                                );

                                // Apply offset: newQuat = originalQuat * offsetQuat (post-multiply)
                                tempQuat.multiply(offsetQuat);

                                // Write back
                                trackValues[i] = tempQuat.x;
                                trackValues[i + 1] = tempQuat.y;
                                trackValues[i + 2] = tempQuat.z;
                                trackValues[i + 3] = tempQuat.w;
                            }

                            console.log(`   🔧 Applied rotation offset to ${boneName}: (${rotOffset.x}°, ${rotOffset.y}°, ${rotOffset.z}°)`);
                        }
                    }
                }
            }

            // Create new track with updated name and scaled/offset values
            const TrackType = track.constructor;
            const newTrack = new TrackType(
                newTrackName,
                track.times,
                trackValues,
                track.interpolation
            );

            newTracks.push(newTrack);
        }

        console.log(`   🔄 Retargeted animation: ${clip.name}`);
        console.log(`      Remapped: ${remappedCount} tracks, Kept original: ${skippedCount} tracks`);

        // DEBUG: Log sample track to see what's being animated
        if (newTracks.length > 0) {
            const sampleTrack = newTracks.find(t => t.name.includes('position')) || newTracks[0];
            console.log(`      Sample track: ${sampleTrack.name}`);
            console.log(`      Track type: ${sampleTrack.constructor.name}`);
            if (sampleTrack.values && sampleTrack.values.length >= 3) {
                const scaledNote = (this.axisCorrection && this.axisCorrection.positionScale) ? ' (SCALED)' : '';
                console.log(`      First values${scaledNote}: [${sampleTrack.values[0].toFixed(3)}, ${sampleTrack.values[1].toFixed(3)}, ${sampleTrack.values[2].toFixed(3)}]`);
            }
        }

        // Create new clip with retargeted tracks
        const retargetedClip = new THREE.AnimationClip(
            clip.name + '_retargeted',
            clip.duration,
            newTracks
        );

        return retargetedClip;
    }

    /**
     * Auto-calculate rest pose offsets by comparing your model's rest pose with Mixamo T-pose
     * Call this from console: app.animationController.calculateRestPoseOffsets()
     */
    calculateRestPoseOffsets() {
        const model = this.threeSetup.getLoadedModel();
        const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];

        if (!model || libraryAnimations.length === 0) {
            console.log('❌ Need model and library animations loaded');
            return null;
        }

        console.log('\n=== 🧬 CALCULATING REST POSE OFFSETS ===\n');

        // Step 1: Capture YOUR model's rest pose (original rotations)
        const originalRotations = new Map();
        model.traverse((child) => {
            if (child.isBone) {
                originalRotations.set(child.name, child.quaternion.clone());
            }
        });
        console.log(`✅ Captured ${originalRotations.size} bone rotations from YOUR rest pose`);

        // Step 2: Apply Mixamo T-pose (first frame)
        if (!this.mixer) {
            this.mixer = new THREE.AnimationMixer(model);
        }

        const anim = libraryAnimations[0];
        let clipToPlay = anim.clip;
        if (this.boneMapping && Object.keys(this.boneMapping).length > 0) {
            clipToPlay = this.retargetAnimation(anim.clip);
        }

        const action = this.mixer.clipAction(clipToPlay);
        action.play();
        action.paused = true;
        action.time = 0;
        this.mixer.update(0);

        console.log('✅ Applied Mixamo T-pose (first frame)');

        // Step 3: Calculate offset between YOUR rest pose and Mixamo result
        const offsets = {};
        const tempQuat = new THREE.Quaternion();

        model.traverse((child) => {
            if (child.isBone && originalRotations.has(child.name)) {
                const originalQuat = originalRotations.get(child.name);
                const mixamoQuat = child.quaternion.clone();

                // Calculate inverse offset: offset = original * inverse(mixamo)
                tempQuat.copy(mixamoQuat).invert();
                const offsetQuat = originalQuat.clone().multiply(tempQuat);

                // Convert to euler for readability
                const euler = new THREE.Euler().setFromQuaternion(offsetQuat);
                const degX = euler.x * 180 / Math.PI;
                const degY = euler.y * 180 / Math.PI;
                const degZ = euler.z * 180 / Math.PI;

                // Only save if rotation is significant (> 5 degrees)
                if (Math.abs(degX) > 5 || Math.abs(degY) > 5 || Math.abs(degZ) > 5) {
                    offsets[child.name] = {
                        x: Math.round(degX),
                        y: Math.round(degY),
                        z: Math.round(degZ)
                    };
                }
            }
        });

        console.log(`\n✅ Found ${Object.keys(offsets).length} bones with significant rotation differences:\n`);

        // Show top 10 offsets
        const sortedOffsets = Object.entries(offsets)
            .sort((a, b) => {
                const magA = Math.abs(a[1].x) + Math.abs(a[1].y) + Math.abs(a[1].z);
                const magB = Math.abs(b[1].x) + Math.abs(b[1].y) + Math.abs(b[1].z);
                return magB - magA;
            })
            .slice(0, 10);

        sortedOffsets.forEach(([bone, rot]) => {
            console.log(`  ${bone}: { x: ${rot.x}, y: ${rot.y}, z: ${rot.z} }`);
        });

        if (Object.keys(offsets).length > 10) {
            console.log(`  ... and ${Object.keys(offsets).length - 10} more bones`);
        }

        console.log('\n📝 To use these offsets, add them to boneRotationOffsets in equipment-manager.js');
        console.log('💡 Or I can automatically apply them - want me to?');
        console.log('\n================================\n');

        // Reset model to original pose
        model.traverse((child) => {
            if (child.isBone && originalRotations.has(child.name)) {
                child.quaternion.copy(originalRotations.get(child.name));
            }
        });

        return offsets;
    }

    /**
     * HIERARCHICAL rest pose offset calculation
     * Processes bones from root to leaves, respecting parent-child relationships
     * This fixes the "torn torso" problem where upper/lower body have different rotations
     * Call this from console: app.animationController.calculateHierarchicalOffsets()
     */
    calculateHierarchicalOffsets() {
        const model = this.threeSetup.getLoadedModel();
        const libraryAnimations = this.animationLibrary ? this.animationLibrary.getAnimations() : [];

        if (!model || libraryAnimations.length === 0) {
            console.log('❌ Need model and library animations loaded');
            return null;
        }

        console.log('\n=== 🌳 CALCULATING HIERARCHICAL REST POSE OFFSETS ===\n');
        console.log('This approach respects bone hierarchy to avoid "torn torso" problems\n');

        // Step 1: Capture YOUR model's rest pose (original rotations)
        const originalRotations = new Map();
        let rootBone = null;

        model.traverse((child) => {
            if (child.isBone) {
                originalRotations.set(child.uuid, child.quaternion.clone());

                // Find root bone (bone with no bone parent)
                if (!child.parent || !child.parent.isBone) {
                    // Prioritize bone named "Root" if it exists
                    if (child.name === 'Root' || !rootBone) {
                        rootBone = child;
                    }
                }
            }
        });

        if (!rootBone) {
            console.log('❌ Root bone not found!');
            return null;
        }

        console.log(`✅ Found root bone: ${rootBone.name}`);
        console.log(`✅ Captured ${originalRotations.size} bone rotations from YOUR rest pose`);

        // Step 2: Apply Mixamo T-pose (first frame, WITHOUT any offsets)
        // Temporarily disable offsets to get raw Mixamo pose
        const savedOffsets = this.axisCorrection ? this.axisCorrection.boneRotationOffsets : null;
        if (this.axisCorrection) {
            this.axisCorrection.boneRotationOffsets = null;
        }

        if (!this.mixer) {
            this.mixer = new THREE.AnimationMixer(model);
        }

        const anim = libraryAnimations[0];
        let clipToPlay = anim.clip;
        if (this.boneMapping && Object.keys(this.boneMapping).length > 0) {
            clipToPlay = this.retargetAnimation(anim.clip);
        }

        const action = this.mixer.clipAction(clipToPlay);
        action.play();
        action.paused = true;
        action.time = 0;
        this.mixer.update(0);

        console.log('✅ Applied Mixamo T-pose (first frame, without offsets)');

        // Step 3: Calculate offsets hierarchically (root → leaves)
        const offsets = {};

        const processHierarchically = (bone, depth = 0) => {
            const indent = '  '.repeat(depth);

            // Get original rest pose rotation
            const originalQuat = originalRotations.get(bone.uuid);
            if (!originalQuat) {
                console.log(`${indent}⚠️ ${bone.name}: no rest pose saved`);
                return;
            }

            // Get current Mixamo rotation (influenced by parent offsets we already applied)
            const mixamoQuat = bone.quaternion.clone();

            // Calculate offset: offset = original * inverse(mixamo)
            const tempQuat = new THREE.Quaternion();
            tempQuat.copy(mixamoQuat).invert();
            const offsetQuat = originalQuat.clone().multiply(tempQuat);

            // Convert to euler for readability
            const euler = new THREE.Euler().setFromQuaternion(offsetQuat);
            const degX = euler.x * 180 / Math.PI;
            const degY = euler.y * 180 / Math.PI;
            const degZ = euler.z * 180 / Math.PI;

            // Calculate magnitude
            const magnitude = Math.abs(degX) + Math.abs(degY) + Math.abs(degZ);

            // Save if significant (> 5 degrees)
            if (magnitude > 5) {
                offsets[bone.name] = {
                    x: Math.round(degX),
                    y: Math.round(degY),
                    z: Math.round(degZ)
                };
                console.log(`${indent}📍 ${bone.name}: { x: ${Math.round(degX)}, y: ${Math.round(degY)}, z: ${Math.round(degZ)} } (magnitude: ${Math.round(magnitude)}°)`);

                // Apply the offset to this bone NOW (so children see corrected parent)
                bone.quaternion.copy(originalQuat);
            } else {
                console.log(`${indent}✅ ${bone.name}: offset < 5° (OK)`);
            }

            // Process all bone children recursively
            bone.children.forEach(child => {
                if (child.isBone) {
                    processHierarchically(child, depth + 1);
                }
            });
        };

        console.log('\n🌳 Processing bone hierarchy from root:\n');
        processHierarchically(rootBone);

        // Restore original offsets setting
        if (this.axisCorrection) {
            this.axisCorrection.boneRotationOffsets = savedOffsets;
        }

        // Summary
        console.log(`\n✅ Found ${Object.keys(offsets).length} bones with significant rotation differences`);

        if (Object.keys(offsets).length > 0) {
            console.log('\n📋 SUMMARY (top offsets by magnitude):\n');

            const sortedOffsets = Object.entries(offsets)
                .sort((a, b) => {
                    const magA = Math.abs(a[1].x) + Math.abs(a[1].y) + Math.abs(a[1].z);
                    const magB = Math.abs(b[1].x) + Math.abs(b[1].y) + Math.abs(b[1].z);
                    return magB - magA;
                })
                .slice(0, 15);

            sortedOffsets.forEach(([bone, rot]) => {
                const mag = Math.abs(rot.x) + Math.abs(rot.y) + Math.abs(rot.z);
                console.log(`  ${bone}: { x: ${rot.x}, y: ${rot.y}, z: ${rot.z} } (${Math.round(mag)}°)`);
            });

            if (Object.keys(offsets).length > 15) {
                console.log(`  ... and ${Object.keys(offsets).length - 15} more bones`);
            }

            console.log('\n📝 Copy these offsets to boneRotationOffsets in equipment-manager.js');
            console.log('💡 This should fix the "torn torso" problem!');
        } else {
            console.log('\n✨ All bones already aligned - no offsets needed!');
        }

        console.log('\n================================\n');

        // Reset model to original pose
        model.traverse((child) => {
            if (child.isBone && originalRotations.has(child.uuid)) {
                child.quaternion.copy(originalRotations.get(child.uuid));
            }
        });

        return offsets;
    }

    /**
     * Apply first frame of Mixamo animation to see T-pose after retargeting
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

        // Retarget animation
        let clipToPlay = anim.clip;
        if (this.boneMapping && Object.keys(this.boneMapping).length > 0) {
            clipToPlay = this.retargetAnimation(anim.clip);
        }

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
        console.log('💡 This shows how your model looks after bone mapping');
        console.log('   If it looks twisted/inverted, there is rest pose mismatch');
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
     * Debug function: Show animation tracks (before and after retargeting)
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
        console.log('\n📋 ORIGINAL TRACKS (Mixamo):');

        walkAnim.clip.tracks.slice(0, 10).forEach((track, i) => {
            const type = track.constructor.name;
            const valueCount = track.values.length;
            console.log(`  ${i + 1}. ${track.name} (${type}, ${valueCount} values)`);
        });

        console.log(`  ... and ${walkAnim.clip.tracks.length - 10} more tracks`);

        // Show retargeted version
        if (this.boneMapping && Object.keys(this.boneMapping).length > 0) {
            console.log('\n📋 RETARGETED TRACKS (Custom Rig):');
            const retargeted = this.retargetAnimation(walkAnim.clip);

            retargeted.tracks.slice(0, 10).forEach((track, i) => {
                const type = track.constructor.name;
                const valueCount = track.values.length;
                console.log(`  ${i + 1}. ${track.name} (${type}, ${valueCount} values)`);
            });

            console.log(`  ... and ${retargeted.tracks.length - 10} more tracks`);

            // Find Hip/Pelvis tracks specifically
            console.log('\n🔍 HIP/PELVIS ROTATION TRACKS:');
            const hipTracks = retargeted.tracks.filter(t =>
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
                retargeted.tracks
                    .filter(t => t.name.toLowerCase().includes('hip') || t.name.toLowerCase().includes('pelvis'))
                    .forEach(t => console.log(`     - ${t.name}`));
            }
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


