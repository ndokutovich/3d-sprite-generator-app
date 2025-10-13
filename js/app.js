// Main Application Entry Point
class App {
    constructor() {
        // Initialize all controllers
        this.uiController = new UIController();
        this.threeSetup = new ThreeSetup();
        this.animationLibrary = new AnimationLibrary();
        this.modelLoader = new ModelLoader(this.threeSetup, this.uiController);
        this.equipmentManager = new EquipmentManager(this.threeSetup, this.uiController);
        this.animationController = new AnimationController(this.threeSetup, this.uiController, this.animationLibrary, this.equipmentManager);
        this.spriteGenerator = new SpriteGenerator(this.threeSetup, this.uiController, this.animationController);
        this.fileHandler = new FileHandler(this.uiController);

        // Initialize the application
        this.init();
    }

    async init() {
        // Initialize Three.js scene
        this.threeSetup.initScene('canvas3d');

        // Preload animation library (optional - won't block if files don't exist)
        await this.animationLibrary.preloadLibraryAnimations().catch(() => {
            console.log('No animations folder found - animations can be uploaded manually');
        });

        // Setup event listeners
        this.setupEventListeners();

        // Setup error handlers
        this.setupErrorHandlers();

        // Trigger multiple resizes to ensure proper sizing after layout settles
        setTimeout(() => {
            this.threeSetup.onWindowResize();
        }, 50);

        setTimeout(() => {
            this.threeSetup.onWindowResize();
        }, 250);

        setTimeout(() => {
            this.threeSetup.onWindowResize();
        }, 500);

        // Add ResizeObserver to handle viewport size changes
        const viewport = document.querySelector('.viewport');
        if (viewport) {
            const resizeObserver = new ResizeObserver(() => {
                this.threeSetup.onWindowResize();
            });
            resizeObserver.observe(viewport);
        }

        // Start animation loop
        this.animate();
    }

    setupEventListeners() {
        // File selection
        this.uiController.onFileSelect((e) => this.handleFileSelect(e));

        // Animation file upload
        this.uiController.onAnimationFileSelect((e) => this.handleAnimationFileSelect(e));

        // Generate sprites button
        this.uiController.onGenerateClick(() => this.handleGenerateSprites());

        // Download ZIP button
        this.uiController.onDownloadClick(() => this.handleDownloadZip());

        // Animation controls
        this.uiController.onAnimationSelect((e) => {
            const index = parseInt(e.target.value);
            this.animationController.selectAnimation(index);
        });

        this.uiController.onAnimationTimeChange((e) => {
            const time = parseFloat(e.target.value);
            this.uiController.updateAnimationTime(time);
            this.animationController.setAnimationTime(time);
        });

        this.uiController.onAutoplayToggle((e) => {
            const enabled = e.target.checked;
            this.animationController.setAutoplay(enabled);
        });

        this.uiController.onLockPositionToggle((e) => {
            const enabled = e.target.checked;
            this.animationController.setLockPosition(enabled);
        });

        this.uiController.onSingleDirectionToggle((e) => {
            const enabled = e.target.checked;
            if (enabled) {
                this.uiController.showSingleDirectionInfo();
            } else {
                this.uiController.hideSingleDirectionInfo();
            }
        });

        // Camera controls
        this.uiController.onCameraDistanceChange((e) => {
            const distance = parseFloat(e.target.value);
            this.uiController.updateCameraDistance(distance);
        });

        this.uiController.onCameraHeightChange((e) => {
            const height = parseFloat(e.target.value);
            this.uiController.updateCameraHeight(height);
        });

        this.uiController.onLightIntensityChange((e) => {
            const intensity = parseFloat(e.target.value);
            this.uiController.updateLightIntensity(intensity);
            this.threeSetup.setCameraLightIntensity(intensity);
        });

        // Error close button
        this.uiController.onErrorClose(() => {
            this.uiController.hideError();
        });

        // Equipment Inventory controls
        this.uiController.onEquipmentFileSelect((e) => this.handleEquipmentFileSelect(e));
        this.uiController.onEquipAllClick(() => this.handleEquipAll());
        this.uiController.onUnequipAllClick(() => this.handleUnequipAll());
        this.uiController.onAdjustEquipmentSlotChange((e) => this.handleAdjustEquipmentSlotChange(e));
        this.uiController.onEquipmentAdjustmentChange((e) => this.handleEquipmentAdjustmentChange(e));

        // Bone Viewer controls
        this.uiController.onViewBonesClick(() => this.handleViewBones());
        this.uiController.onBoneViewerClose(() => this.uiController.closeBoneViewer());
        this.uiController.onAutoMapClick(() => this.handleAutoMap());
        this.uiController.onCopyMappingClick(() => this.handleCopyMapping());

        // Rotation Test controls (per-axis)
        this.currentRotation = { x: 180, y: 0, z: 0 }; // Track current values
        const rotationBtns = document.querySelectorAll('.rotation-test-btn');
        rotationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const axis = btn.dataset.axis;
                const value = parseInt(btn.dataset.value);

                // Update only the clicked axis
                this.currentRotation[axis] = value;

                // Apply combined rotation
                this.handleRotationTest(
                    this.currentRotation.x,
                    this.currentRotation.y,
                    this.currentRotation.z
                );
            });
        });
    }

    setupErrorHandlers() {
        // Global error handler for uncaught texture loading errors
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.toString().includes('image')) {
                console.warn('Texture loading warning (model will still work):', event.reason);
                event.preventDefault();
            }
        });

        // Catch errors in images
        window.addEventListener('error', (event) => {
            if (event.target && event.target.tagName === 'IMG') {
                console.warn('Image loading warning (model will still work)');
                event.preventDefault();
            }
        }, true);
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Update UI with file name
            this.uiController.updateFileName(file.name);

            // Read the file
            const { contents, extension, fileName } = await this.fileHandler.readFile(file);

            // Load the model
            const result = await this.modelLoader.loadModel(contents, extension, fileName);

            // Setup animations if present
            if (result.animations && result.animations.length > 0) {
                this.animationController.setAnimations(result.animations);
            } else {
                this.animationController.reset();
            }

            // Enable generate button and bone viewer after successful load
            setTimeout(() => {
                this.uiController.hideLoading();
                this.uiController.enableGenerateButton();
                this.uiController.enableViewBonesButton();
            }, 500);

        } catch (error) {
            console.error('Error handling file:', error);
        }
    }

    async handleGenerateSprites() {
        try {
            await this.spriteGenerator.generateSprites();
        } catch (error) {
            console.error('Error generating sprites:', error);
            this.uiController.showError('Failed to generate sprites: ' + error.message);
        }
    }

    async handleAnimationFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            this.uiController.showLoading('Loading animation...', 0);

            await this.animationLibrary.loadAnimationFromFile(file);

            this.uiController.showSuccessMessage();
            this.uiController.updateProgress(100, 'Animation loaded!');

            // Refresh animation list
            const model = this.threeSetup.getLoadedModel();
            if (model) {
                this.animationController.setAnimations(this.animationController.getAnimations());
            }

            setTimeout(() => {
                this.uiController.hideSuccessMessage();
                this.uiController.hideLoading();
            }, 2000);

        } catch (error) {
            console.error('Error loading animation:', error);
            this.uiController.showError('Failed to load animation: ' + error.message);
        }

        // Clear file input for re-upload
        e.target.value = '';
    }

    async handleDownloadZip() {
        try {
            const sprites = this.spriteGenerator.getGeneratedSprites();
            await this.fileHandler.createZipArchive(sprites);
        } catch (error) {
            console.error('Error downloading ZIP:', error);
        }
    }

    // Equipment Inventory Handlers

    async handleEquipmentFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const slot = this.uiController.getSelectedEquipmentSlot();
        try {
            const { contents, extension, fileName } = await this.fileHandler.readFile(file);
            await this.equipmentManager.loadEquipmentToSlot(slot, contents, extension, fileName);

            // Update inventory display
            this.updateInventoryDisplay();

            console.log(`✅ ${fileName} loaded to ${slot} slot!`);
        } catch (error) {
            console.error('Error loading equipment:', error);
            this.uiController.showError('Failed to load equipment file');
        }

        e.target.value = '';
    }

    handleEquipAll() {
        const equipped = this.equipmentManager.equipAll();
        this.updateInventoryDisplay();
        this.updateAdjustEquipmentDropdown();
        console.log(`✅ Equipped ${equipped} items`);
    }

    handleUnequipAll() {
        this.equipmentManager.unequipAll();
        this.updateInventoryDisplay();
        this.updateAdjustEquipmentDropdown();
        console.log('✅ All equipment unequipped');
    }

    handleInventoryEquipClick(slot, shouldEquip) {
        if (shouldEquip) {
            this.equipmentManager.equipSlot(slot);
        } else {
            this.equipmentManager.unequipSlot(slot);
        }
        this.updateInventoryDisplay();
        this.updateAdjustEquipmentDropdown();
    }

    handleInventoryRemoveClick(slot) {
        this.equipmentManager.removeFromInventory(slot);
        this.updateInventoryDisplay();
        this.updateAdjustEquipmentDropdown();
    }

    handleAdjustEquipmentSlotChange(e) {
        const slot = e.target.value;
        if (slot) {
            this.uiController.enableEquipmentAdjustments();
        } else {
            this.uiController.disableEquipmentAdjustments();
        }
    }

    handleEquipmentAdjustmentChange(e) {
        const adjustments = this.uiController.getEquipmentAdjustments();

        if (!adjustments.slot) return;

        // Update display values
        this.uiController.updateEquipmentAdjustmentDisplays();

        // Apply adjustments
        this.equipmentManager.updateOffsets(adjustments.slot, {
            position: adjustments.position,
            rotation: adjustments.rotation,
            scale: adjustments.scale
        });
    }

    updateInventoryDisplay() {
        const inventory = this.equipmentManager.getInventory();
        this.uiController.updateInventoryDisplay(
            inventory,
            (slot, shouldEquip) => this.handleInventoryEquipClick(slot, shouldEquip),
            (slot) => this.handleInventoryRemoveClick(slot)
        );
    }

    updateAdjustEquipmentDropdown() {
        const equippedSlots = Array.from(this.equipmentManager.equippedItems.keys());
        this.uiController.updateAdjustEquipmentDropdown(equippedSlots);
    }

    // Bone Viewer Handlers

    handleViewBones() {
        const analysis = this.equipmentManager.analyzeSkeleton();
        if (!analysis) {
            this.uiController.showError('No skeleton found in loaded model');
            return;
        }

        const mappingResult = this.equipmentManager.autoMapToMixamo();

        this.uiController.showBoneViewer(analysis, mappingResult);

        console.log('🦴 Skeleton Analysis:');
        console.log(`Total Bones: ${analysis.totalBones}`);
        console.log(`Root Bone: ${analysis.rootBone}`);
        console.log(`Rig Type: ${analysis.isMixamo ? 'Mixamo' : 'Custom'}`);
        console.log(`Has Fingers: ${analysis.hasFingers ? 'Yes' : 'No'}`);
        console.log('Bone Hierarchy:', analysis.hierarchy);

        if (mappingResult) {
            console.log(`\n🗺️ Mixamo Mapping:`);
            console.log(`Match Rate: ${mappingResult.matchRate}`);
            console.log(`Matched: ${mappingResult.totalMatched}/${mappingResult.totalMixamoBones} bones`);
        }
    }

    handleAutoMap() {
        const mappingResult = this.equipmentManager.autoMapToMixamo();
        if (!mappingResult) {
            this.uiController.showError('Could not generate mapping');
            return;
        }

        this.uiController.updateBoneMapping(mappingResult);

        console.log('🔄 Auto-mapping completed!');
        console.log(`Match Rate: ${mappingResult.matchRate}`);
        console.log('Mapping:', mappingResult.mapping);
    }

    handleCopyMapping() {
        const code = this.equipmentManager.generateMappingCode();

        // Copy to clipboard
        navigator.clipboard.writeText(code).then(() => {
            console.log('📋 Mapping code copied to clipboard!');
            console.log(code);
            alert('Bone mapping code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback: show in console
            console.log('📋 Bone Mapping Code:');
            console.log(code);
            alert('Copy failed. Check console for mapping code.');
        });
    }

    handleRotationTest(x, y, z) {
        console.log(`\n🔄 Testing rotation: X:${x}° Y:${y}° Z:${z}°`);

        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.log('❌ No model loaded');
            return;
        }

        // Apply rotation directly to model
        model.rotation.set(
            x * Math.PI / 180,
            y * Math.PI / 180,
            z * Math.PI / 180
        );

        // Update UI display
        document.getElementById('currentRotX').textContent = x;
        document.getElementById('currentRotY').textContent = y;
        document.getElementById('currentRotZ').textContent = z;

        console.log('✅ Rotation applied to model!');
        console.log('💡 This is a visual test only - does not affect animation retargeting');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update animations (both embedded and procedural)
        const delta = this.threeSetup.getDelta();
        if (this.animationController.hasActiveAnimation()) {
            this.animationController.update(delta);
        }

        // Update orbit controls
        this.threeSetup.updateControls();

        // Rotate model (disabled by default with orbit controls)
        this.threeSetup.rotateModel();

        // Render scene
        this.threeSetup.render();
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('✅ App loaded! Try: app.animationController.analyzeAnimation(2000)');
});
