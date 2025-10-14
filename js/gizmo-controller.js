// Gizmo Controller - Unified 3D transformation controls
class GizmoController {
    constructor(threeSetup, equipmentManager, uiController) {
        this.threeSetup = threeSetup;
        this.equipmentManager = equipmentManager;
        this.uiController = uiController;

        this.gizmo = null;
        this.enabled = false;
        this.currentTarget = null; // 'camera', 'character', 'equipment'
        this.currentMode = 'translate'; // 'translate', 'rotate', 'scale'
        this.currentEquipmentSlot = null;

        // Store original values for syncing
        this.originalCameraDistance = null;
        this.isDragging = false;
    }

    init() {
        // Create TransformControls
        const camera = this.threeSetup.getCamera();
        const renderer = this.threeSetup.renderer;

        if (!camera || !renderer) {
            console.error('Cannot initialize gizmo: camera or renderer not ready');
            return;
        }

        this.gizmo = new THREE.TransformControls(camera, renderer.domElement);
        this.gizmo.setMode(this.currentMode);
        this.gizmo.setSize(0.8); // Slightly smaller for better visibility

        // Add gizmo to scene
        this.threeSetup.scene.add(this.gizmo);

        // Setup event listeners
        this.setupGizmoEvents();

        // Initially hide gizmo
        this.gizmo.visible = false;

        console.log('✅ Gizmo controller initialized');
    }

    setupGizmoEvents() {
        const orbitControls = this.threeSetup.getOrbitControls();

        // Disable orbit controls while dragging gizmo
        this.gizmo.addEventListener('dragging-changed', (event) => {
            this.isDragging = event.value;

            if (orbitControls) {
                orbitControls.enabled = !event.value;
            }

            if (!event.value) {
                // Drag ended - sync values back to UI/state
                this.syncAfterDrag();
            }
        });

        // Update during drag
        this.gizmo.addEventListener('objectChange', () => {
            if (this.isDragging) {
                this.syncDuringDrag();
            }
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;

        if (!this.gizmo) {
            if (enabled) {
                this.init();
            }
            return;
        }

        // Show/hide gizmo
        if (enabled && this.currentTarget) {
            this.attachToTarget(this.currentTarget, this.currentEquipmentSlot);
        } else {
            this.detach();
        }
    }

    setMode(mode) {
        if (!['translate', 'rotate', 'scale'].includes(mode)) {
            console.error('Invalid gizmo mode:', mode);
            return;
        }

        this.currentMode = mode;

        if (this.gizmo) {
            this.gizmo.setMode(mode);
        }

        console.log(`🎯 Gizmo mode: ${mode}`);
    }

    setTarget(targetType, equipmentSlot = null) {
        this.currentTarget = targetType;
        this.currentEquipmentSlot = equipmentSlot;

        if (!this.enabled || !this.gizmo) {
            return;
        }

        this.attachToTarget(targetType, equipmentSlot);
    }

    attachToTarget(targetType, equipmentSlot = null) {
        let target = null;

        switch (targetType) {
            case 'camera':
                target = this.threeSetup.getCamera();
                console.log('🎯 Gizmo attached to Camera');
                break;

            case 'character':
                target = this.threeSetup.getLoadedModel();
                if (!target) {
                    console.warn('No character model loaded');
                    this.detach();
                    return;
                }
                console.log('🎯 Gizmo attached to Character');
                break;

            case 'equipment':
                if (!equipmentSlot) {
                    console.warn('No equipment slot selected');
                    this.detach();
                    return;
                }

                const item = this.equipmentManager.equippedItems.get(equipmentSlot);
                if (!item || !item.object) {
                    console.warn(`No equipment in slot: ${equipmentSlot}`);
                    this.detach();
                    return;
                }

                target = item.object;
                console.log(`🎯 Gizmo attached to Equipment: ${equipmentSlot}`);
                break;

            default:
                console.error('Invalid target type:', targetType);
                this.detach();
                return;
        }

        if (target) {
            this.gizmo.attach(target);
            this.gizmo.visible = true;

            // Store original values for camera
            if (targetType === 'camera') {
                this.originalCameraDistance = target.position.length();
            }
        }
    }

    detach() {
        if (this.gizmo) {
            this.gizmo.detach();
            this.gizmo.visible = false;
        }
    }

    syncDuringDrag() {
        if (!this.currentTarget) return;

        // Real-time sync during drag
        switch (this.currentTarget) {
            case 'camera':
                // Update camera distance/height sliders
                const camera = this.threeSetup.getCamera();
                if (camera) {
                    const distance = Math.sqrt(
                        camera.position.x ** 2 + camera.position.z ** 2
                    );
                    const height = camera.position.y;

                    // Update UI sliders without triggering events
                    this.uiController.setCameraDistanceValue(distance);
                    this.uiController.setCameraHeightValue(height);
                }
                break;

            case 'equipment':
                // Sync equipment offset sliders
                this.syncEquipmentSliders();
                break;

            case 'character':
                // Character position/rotation is synced automatically
                break;
        }
    }

    syncAfterDrag() {
        if (!this.currentTarget) return;

        console.log(`✅ Gizmo drag complete: ${this.currentTarget}`);

        switch (this.currentTarget) {
            case 'camera':
                // Camera transform is automatically updated
                break;

            case 'character':
                // Character transform is automatically updated
                break;

            case 'equipment':
                // Update equipment offsets in equipment manager
                this.syncEquipmentOffsets();
                break;
        }
    }

    syncEquipmentSliders() {
        if (!this.currentEquipmentSlot) return;

        const item = this.equipmentManager.equippedItems.get(this.currentEquipmentSlot);
        if (!item) return;

        const equipment = item.object;
        const boneScale = item.boneWorldScale;

        // Calculate world-space values (compensate for bone scale)
        const worldPosition = {
            x: equipment.position.x * boneScale.x,
            y: equipment.position.y * boneScale.y,
            z: equipment.position.z * boneScale.z
        };

        const worldRotation = {
            x: THREE.MathUtils.radToDeg(equipment.rotation.x),
            y: THREE.MathUtils.radToDeg(equipment.rotation.y),
            z: THREE.MathUtils.radToDeg(equipment.rotation.z)
        };

        const worldScale = equipment.scale.x * boneScale.x; // Assume uniform scale

        // Update UI sliders
        this.uiController.setEquipmentAdjustmentValues({
            position: worldPosition,
            rotation: worldRotation,
            scale: worldScale
        });
    }

    syncEquipmentOffsets() {
        if (!this.currentEquipmentSlot) return;

        const item = this.equipmentManager.equippedItems.get(this.currentEquipmentSlot);
        if (!item) return;

        const equipment = item.object;
        const boneScale = item.boneWorldScale;

        // Get current transforms from gizmo-controlled object
        const offsets = {
            position: {
                x: equipment.position.x * boneScale.x,
                y: equipment.position.y * boneScale.y,
                z: equipment.position.z * boneScale.z
            },
            rotation: {
                x: THREE.MathUtils.radToDeg(equipment.rotation.x),
                y: THREE.MathUtils.radToDeg(equipment.rotation.y),
                z: THREE.MathUtils.radToDeg(equipment.rotation.z)
            },
            scale: equipment.scale.x * boneScale.x
        };

        // Update equipment manager state
        item.offsets = offsets;

        // Update UI sliders
        this.uiController.setEquipmentAdjustmentValues(offsets);

        console.log(`✅ Equipment offsets synced for ${this.currentEquipmentSlot}:`, offsets);
    }

    update() {
        // Called in animation loop if needed
        if (this.gizmo && this.gizmo.visible && this.currentTarget === 'camera') {
            // Update camera gizmo if camera moved by other means
            this.gizmo.updateMatrixWorld();
        }
    }

    dispose() {
        if (this.gizmo) {
            this.threeSetup.scene.remove(this.gizmo);
            this.gizmo.dispose();
            this.gizmo = null;
        }

        console.log('✅ Gizmo controller disposed');
    }
}
