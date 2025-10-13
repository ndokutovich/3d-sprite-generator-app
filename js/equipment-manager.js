// Equipment Manager - Handles attaching objects to character bones with inventory system
class EquipmentManager {
    constructor(threeSetup, uiController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;

        // Inventory system: Map of slot -> {equipment, fileName, metadata}
        this.inventory = new Map();

        // Equipped items: Map of slot -> {object, bone, offsets, boneWorldScale, etc.}
        this.equippedItems = new Map();

        // Equipment preview group (with helper box)
        this.equipmentPreview = null;
        this.boundingBoxHelper = null;

        // Equipment slot configuration with bone mappings
        this.EQUIPMENT_SLOTS = {
            'weapon': { name: 'Weapon', bone: 'RightHand', defaultOffsets: { x: 0, y: 0, z: 0 } },
            'shield': { name: 'Shield/Offhand', bone: 'LeftHand', defaultOffsets: { x: 0, y: 0, z: 0 } },
            'helmet': { name: 'Helmet', bone: 'Head', defaultOffsets: { x: 0, y: 0.1, z: 0 } },
            'chest': { name: 'Chest Armor', bone: 'Spine1', defaultOffsets: { x: 0, y: 0, z: 0 } },
            'legs': { name: 'Leg Armor', bone: 'Hips', defaultOffsets: { x: 0, y: 0, z: 0 } },
            'boots': { name: 'Boots', bone: 'RightFoot', defaultOffsets: { x: 0, y: 0, z: 0 } },
            'back': { name: 'Back/Cape', bone: 'Spine', defaultOffsets: { x: 0, y: 0.2, z: -0.1 } }
        };
    }

    /**
     * Get equipment slot configuration
     * @param {string} slot - Slot identifier
     * @returns {Object} Slot configuration
     */
    getSlotConfig(slot) {
        return this.EQUIPMENT_SLOTS[slot];
    }

    /**
     * Get all available equipment slots
     * @returns {Array} Array of {id, name, bone}
     */
    getAvailableSlots() {
        return Object.entries(this.EQUIPMENT_SLOTS).map(([id, config]) => ({
            id,
            name: config.name,
            bone: config.bone
        }));
    }

    /**
     * Find a bone by name in the character's skeleton
     * @param {string} boneName - Name of the bone to find (e.g., "RightHand", "LeftHand")
     * @returns {THREE.Bone|null}
     */
    findBone(boneName) {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.warn('No model loaded');
            return null;
        }

        const searchName = boneName.toLowerCase();
        let foundBones = [];

        // Traverse the model to find all matching bones
        model.traverse((child) => {
            if (child.isBone) {
                const name = child.name.toLowerCase();

                // Check for exact matches or close matches
                let matchScore = 0;

                // Exact match after removing prefix (highest priority)
                const cleanName = name.replace('mixamorig:', '').replace('mixamorig', '');
                if (cleanName === searchName) {
                    matchScore = 100;
                }
                // Exact match with prefix
                else if (name === searchName) {
                    matchScore = 90;
                }
                // Ends with search name (e.g., "rig:RightHand" matches "righthand")
                else if (name.endsWith(searchName)) {
                    matchScore = 80;
                }
                // Contains search name but is exact length + prefix (not finger bones)
                else if (name.includes(searchName) && name.length <= searchName.length + 15) {
                    matchScore = 70;
                }
                // Alternative names (wrist instead of hand)
                else if (searchName.includes('hand') && name.includes(searchName.replace('hand', 'wrist'))) {
                    matchScore = 60;
                }

                if (matchScore > 0) {
                    foundBones.push({ bone: child, score: matchScore, name: child.name });
                }
            }
        });

        if (foundBones.length === 0) {
            console.warn('❌ Bone not found:', boneName);
            console.log('💡 Available bones:');
            this.listAllBones();
            return null;
        }

        // Sort by score (highest first) and pick the best match
        foundBones.sort((a, b) => b.score - a.score);
        const bestMatch = foundBones[0];

        console.log('✅ Found bone:', bestMatch.name, '(score:', bestMatch.score + ')');
        if (foundBones.length > 1) {
            console.log('   Other matches:', foundBones.slice(1, 3).map(b => b.name).join(', '));
        }

        return bestMatch.bone;
    }

    /**
     * List all bones in the character (for debugging)
     */
    listAllBones() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) return;

        const bones = [];
        model.traverse((child) => {
            if (child.isBone) {
                bones.push(child.name);
            }
        });

        console.log('Available bones:', bones.join(', '));
        return bones;
    }

    /**
     * Show equipment in preview mode (floating next to character)
     * @param {string} slot - Equipment slot to preview
     */
    showEquipmentPreview(slot) {
        const inventoryItem = this.getInventoryItem(slot);
        if (!inventoryItem) return;

        // Remove any existing preview
        this.hideEquipmentPreview();

        // Create preview group
        this.equipmentPreview = new THREE.Group();
        this.equipmentPreview.userData.slot = slot; // Track which slot is being previewed

        // Clone equipment for preview (so we can keep original for attaching)
        const previewEquipment = inventoryItem.equipment.clone();

        // Position to the right of character (1.5 units away)
        this.equipmentPreview.position.set(1.5, 0, 0);

        // Add equipment to preview group
        this.equipmentPreview.add(previewEquipment);

        // Create bounding box helper for visibility
        const box = new THREE.Box3().setFromObject(previewEquipment);
        const helper = new THREE.Box3Helper(box, 0x00ff00); // Green box
        this.boundingBoxHelper = helper;
        this.equipmentPreview.add(helper);

        // Add to scene
        this.threeSetup.scene.add(this.equipmentPreview);

        console.log(`👁️ Preview enabled for [${slot}]: ${inventoryItem.fileName}`);
    }

    /**
     * Hide equipment preview
     */
    hideEquipmentPreview() {
        if (this.equipmentPreview) {
            this.threeSetup.scene.remove(this.equipmentPreview);
            this.equipmentPreview = null;
            this.boundingBoxHelper = null;
        }
    }

    /**
     * Attach equipment to a specific bone
     * @param {THREE.Object3D} equipment - The equipment object to attach
     * @param {string} boneName - Name of the bone (e.g., "RightHand")
     * @param {Object} offsets - Position and rotation offsets
     * @param {string} slot - Equipment slot identifier (for tracking)
     */
    attachToBone(equipment, boneName, offsets = {}, slot = boneName) {
        // Hide preview when attaching
        this.hideEquipmentPreview();
        const bone = this.findBone(boneName);
        if (!bone) {
            this.uiController.showError(`Could not find bone: ${boneName}`);
            return false;
        }

        // Apply offsets (with default forward offset for hands)
        const pos = offsets.position || { x: 0, y: 0, z: 0 };
        const rot = offsets.rotation || { x: 0, y: 0, z: 0 };
        const scaleMultiplier = offsets.scale || 1.0;

        // Get bone world scale BEFORE attaching
        const worldScale = new THREE.Vector3();
        bone.getWorldScale(worldScale);
        console.log('📐 Bone world scale:', worldScale.x.toFixed(3), worldScale.y.toFixed(3), worldScale.z.toFixed(3));

        // Store equipment's original scale
        const originalEquipmentScale = equipment.scale.clone();
        console.log('⚖️  Equipment scale BEFORE attach:', originalEquipmentScale.x.toFixed(3), originalEquipmentScale.y.toFixed(3), originalEquipmentScale.z.toFixed(3));

        // Attach to bone FIRST
        bone.add(equipment);

        // IMPORTANT: Compensate for bone's scale to keep equipment at original world size
        // If bone scale is 0.01, we need to scale equipment by 100 to compensate
        // Then multiply by user's scale multiplier
        equipment.scale.set(
            (originalEquipmentScale.x / worldScale.x) * scaleMultiplier,
            (originalEquipmentScale.y / worldScale.y) * scaleMultiplier,
            (originalEquipmentScale.z / worldScale.z) * scaleMultiplier
        );

        console.log('⚖️  Equipment scale AFTER compensation:', equipment.scale.x.toFixed(3), equipment.scale.y.toFixed(3), equipment.scale.z.toFixed(3));
        console.log('⚖️  Scale multiplier applied:', scaleMultiplier.toFixed(2) + 'x');
        console.log('✅ Scale compensated! Equipment should now be visible');

        // Now apply position (ALSO compensated for bone scale so slider values are intuitive)
        // If bone scale is 0.01, position needs to be 100x larger in bone space to move 1 unit in world space
        equipment.position.set(
            pos.x / worldScale.x,
            pos.y / worldScale.y,
            pos.z / worldScale.z
        );
        equipment.rotation.set(rot.x, rot.y, rot.z);

        console.log('📍 Equipment position in bone space:', equipment.position.x.toFixed(3), equipment.position.y.toFixed(3), equipment.position.z.toFixed(3));
        console.log('📍 This represents ~', pos.x.toFixed(3), pos.y.toFixed(3), pos.z.toFixed(3), 'units in world space');

        // Get bone world position for debugging
        const worldPos = new THREE.Vector3();
        bone.getWorldPosition(worldPos);
        console.log('🦴 Bone world position:', worldPos.x.toFixed(3), worldPos.y.toFixed(3), worldPos.z.toFixed(3));

        // Calculate helper size based on bone scale (inverse scale to stay constant size)
        const avgBoneScale = (worldScale.x + worldScale.y + worldScale.z) / 3;
        const helperSize = 1.0 / avgBoneScale; // Make it 1.0 units in world space

        // Add LARGE axis helper (shows XYZ orientation)
        const axisHelper = new THREE.AxesHelper(helperSize);
        equipment.add(axisHelper);

        // Also add a LARGE sphere at equipment origin for visibility
        const sphereGeometry = new THREE.SphereGeometry(helperSize * 0.3, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: false, // Solid sphere, more visible
            transparent: true,
            opacity: 0.7,
            depthTest: false // Always render on top
        });
        const sphereHelper = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphereHelper.renderOrder = 999; // Render last (on top)
        equipment.add(sphereHelper);

        console.log('🎯 Helper size in bone space:', helperSize.toFixed(3), 'units (compensated for bone scale)');
        console.log('🌐 This should appear as ~1.0 units in world space');

        // ALSO add a world-space marker at the bone position (not attached to bone)
        // This ensures we can ALWAYS see where the bone is, even if equipment helpers fail
        const worldMarkerGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const worldMarkerMat = new THREE.MeshBasicMaterial({
            color: 0x00ff00, // Bright green
            depthTest: false
        });
        const worldMarker = new THREE.Mesh(worldMarkerGeo, worldMarkerMat);
        worldMarker.position.copy(worldPos);
        worldMarker.renderOrder = 1000;
        this.threeSetup.scene.add(worldMarker);

        console.log('✅ Added GREEN world-space marker at bone position');
        console.log('🎯 Added axis helper (Red=X, Green=Y, Blue=Z) and pink sphere to equipment');
        console.log('📍 Equipment local position:', equipment.position.x, equipment.position.y, equipment.position.z);
        console.log('🔄 Equipment local rotation:', equipment.rotation.x, equipment.rotation.y, equipment.rotation.z);

        // Store reference including bone scale and original equipment scale for future adjustments
        // Use slot as key (e.g., 'weapon', 'helmet') instead of boneName
        this.equippedItems.set(slot, {
            object: equipment,
            bone: bone,
            boneName: boneName,
            slot: slot,
            offsets: offsets,
            axisHelper: axisHelper,
            sphereHelper: sphereHelper,
            worldMarker: worldMarker,
            boneWorldScale: worldScale.clone(),
            originalEquipmentScale: originalEquipmentScale.clone()
        });

        console.log(`✅ Equipped [${slot}] to ${bone.name}`);
        console.log('💡 Look for these markers:');
        console.log('   1. BRIGHT GREEN SPHERE - marks bone world position (ALWAYS visible)');
        console.log('   2. PINK SEMI-TRANSPARENT SPHERE - equipment origin');
        console.log('   3. RGB AXIS ARROWS - equipment orientation (Red=X, Green=Y, Blue=Z)');
        return true;
    }

    /**
     * Load equipment from file and add to inventory
     * @param {string} slot - Equipment slot (weapon, helmet, chest, etc.)
     * @param {ArrayBuffer} contents - File contents
     * @param {string} extension - File extension
     * @param {string} fileName - Original file name
     * @returns {Promise<THREE.Object3D>}
     */
    async loadEquipmentToSlot(slot, contents, extension, fileName) {
        this.uiController.showLoading(`Loading ${slot}...`, 0);

        try {
            let equipment = null;

            switch (extension.toLowerCase()) {
                case 'glb':
                case 'gltf':
                    equipment = await this.loadGLTF(contents, fileName);
                    break;
                case 'fbx':
                    equipment = await this.loadFBX(contents, fileName);
                    break;
                case 'obj':
                    equipment = await this.loadOBJ(contents, fileName);
                    break;
                default:
                    throw new Error(`Unsupported equipment format: ${extension}`);
            }

            if (equipment) {
                // Ensure equipment has visible materials (in case textures fail to load)
                equipment.traverse((child) => {
                    if (child.isMesh) {
                        // If material exists but has no map, ensure it's visible
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (!mat.map) {
                                        mat.color.setHex(0x808080); // Gray fallback
                                    }
                                    mat.needsUpdate = true;
                                });
                            } else {
                                if (!child.material.map) {
                                    child.material.color.setHex(0x808080); // Gray fallback
                                }
                                child.material.needsUpdate = true;
                            }
                        } else {
                            // No material at all - create basic one
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0x808080,
                                metalness: 0.5,
                                roughness: 0.5
                            });
                        }
                    }
                });

                // Scale equipment to reasonable size based on slot type
                const box = new THREE.Box3().setFromObject(equipment);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                console.log('📏 Equipment size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));

                // Scale based on equipment type
                let targetSize = 0.3; // Default hand-held size
                if (slot === 'helmet') targetSize = 0.25;
                else if (slot === 'chest' || slot === 'legs') targetSize = 0.4;
                else if (slot === 'boots') targetSize = 0.15;
                else if (slot === 'back') targetSize = 0.5;

                if (maxDim > targetSize * 2) {
                    const scale = targetSize / maxDim;
                    equipment.scale.multiplyScalar(scale);
                    console.log('📐 Scaled equipment by', scale.toFixed(3), '→ New max dimension:', (maxDim * scale).toFixed(3));
                } else if (maxDim < targetSize * 0.2) {
                    // Too small - scale up
                    const scale = targetSize * 0.5 / maxDim;
                    equipment.scale.multiplyScalar(scale);
                    console.log('📐 Equipment was too small, scaled up by', scale.toFixed(3));
                }

                // Add to inventory
                this.addToInventory(slot, equipment, fileName);

                // Show equipment in preview mode
                this.showEquipmentPreview(slot);

                console.log(`✅ ${slot} loaded to inventory:`, fileName);
                return equipment;
            }

        } catch (error) {
            console.error('Error loading equipment:', error);
            this.uiController.showError(`Failed to load ${slot}: ` + error.message);
            throw error;
        } finally {
            this.uiController.hideLoading();
        }
    }

    /**
     * Add equipment to inventory
     * @param {string} slot - Equipment slot
     * @param {THREE.Object3D} equipment - Equipment object
     * @param {string} fileName - Original file name
     */
    addToInventory(slot, equipment, fileName) {
        this.inventory.set(slot, {
            equipment: equipment,
            fileName: fileName,
            slot: slot,
            isEquipped: false
        });
        console.log(`📦 Added to inventory [${slot}]: ${fileName}`);
    }

    /**
     * Remove equipment from inventory
     * @param {string} slot - Equipment slot
     */
    removeFromInventory(slot) {
        // Unequip first if equipped
        if (this.isEquipped(slot)) {
            this.unequipSlot(slot);
        }

        // Remove from inventory
        if (this.inventory.has(slot)) {
            const item = this.inventory.get(slot);
            this.inventory.delete(slot);
            console.log(`🗑️ Removed from inventory [${slot}]: ${item.fileName}`);

            // Hide preview if this was being previewed
            this.hideEquipmentPreview();
            return true;
        }
        return false;
    }

    /**
     * Get all items in inventory
     * @returns {Array} Array of inventory items
     */
    getInventory() {
        return Array.from(this.inventory.values());
    }

    /**
     * Get inventory item for a specific slot
     * @param {string} slot
     * @returns {Object|null}
     */
    getInventoryItem(slot) {
        return this.inventory.get(slot) || null;
    }

    /**
     * Check if slot has equipment in inventory
     * @param {string} slot
     * @returns {boolean}
     */
    hasInInventory(slot) {
        return this.inventory.has(slot);
    }

    /**
     * Check if slot is currently equipped
     * @param {string} slot
     * @returns {boolean}
     */
    isEquipped(slot) {
        return this.equippedItems.has(slot);
    }

    async loadGLTF(contents, fileName) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();

            // Create blob URL
            const blob = new Blob([contents]);
            const url = URL.createObjectURL(blob);

            loader.load(
                url,
                (gltf) => {
                    URL.revokeObjectURL(url);
                    resolve(gltf.scene);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    this.uiController.updateProgress(percent, 'Loading equipment...');
                },
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }

    async loadFBX(contents, fileName) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.FBXLoader();

            try {
                const model = loader.parse(contents, '');
                resolve(model);
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadOBJ(contents, fileName) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.OBJLoader();

            try {
                const decoder = new TextDecoder('utf-8');
                const text = decoder.decode(contents);
                const model = loader.parse(text);
                resolve(model);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Equip item from inventory to character
     * @param {string} slot - Equipment slot
     * @param {Object} customOffsets - Optional custom offsets (position, rotation, scale)
     * @returns {boolean} Success status
     */
    equipSlot(slot, customOffsets = {}) {
        // Check if item exists in inventory
        const inventoryItem = this.getInventoryItem(slot);
        if (!inventoryItem) {
            console.warn(`❌ No equipment in inventory slot: ${slot}`);
            return false;
        }

        // Unequip if already equipped
        if (this.isEquipped(slot)) {
            this.unequipSlot(slot);
        }

        // Get slot configuration
        const slotConfig = this.getSlotConfig(slot);
        if (!slotConfig) {
            console.error(`❌ Invalid equipment slot: ${slot}`);
            return false;
        }

        // Clone equipment from inventory (so original stays in inventory)
        const equipment = inventoryItem.equipment.clone();

        // Merge default offsets with custom offsets
        const offsets = {
            position: customOffsets.position || slotConfig.defaultOffsets,
            rotation: customOffsets.rotation || { x: 0, y: 0, z: 0 },
            scale: customOffsets.scale || 1.0
        };

        // Attach to bone
        const success = this.attachToBone(equipment, slotConfig.bone, offsets, slot);

        if (success) {
            // Update inventory item status
            inventoryItem.isEquipped = true;
            console.log(`✅ Equipped [${slot}] from inventory`);
        }

        return success;
    }

    /**
     * Unequip item from a slot
     * @param {string} slot - Equipment slot
     */
    unequipSlot(slot) {
        const item = this.equippedItems.get(slot);
        if (item) {
            // Remove helpers
            if (item.axisHelper) {
                item.object.remove(item.axisHelper);
            }
            if (item.sphereHelper) {
                item.object.remove(item.sphereHelper);
            }
            if (item.worldMarker) {
                this.threeSetup.scene.remove(item.worldMarker);
            }
            item.bone.remove(item.object);
            this.equippedItems.delete(slot);

            // Update inventory item status
            const inventoryItem = this.getInventoryItem(slot);
            if (inventoryItem) {
                inventoryItem.isEquipped = false;
            }

            console.log(`✅ Unequipped [${slot}]`);
            return true;
        }
        return false;
    }

    /**
     * Unequip all items
     */
    unequipAll() {
        for (const slot of this.equippedItems.keys()) {
            this.unequipSlot(slot);
        }
        console.log('✅ Unequipped all items');
    }

    /**
     * Equip all items from inventory
     */
    equipAll() {
        let equipped = 0;
        for (const [slot, item] of this.inventory.entries()) {
            if (!item.isEquipped) {
                if (this.equipSlot(slot)) {
                    equipped++;
                }
            }
        }
        console.log(`✅ Equipped ${equipped} items from inventory`);
        return equipped;
    }

    /**
     * Get currently equipped item for a slot
     * @param {string} slot - Equipment slot
     */
    getEquipped(slot) {
        return this.equippedItems.get(slot);
    }

    /**
     * Update equipment position offset
     * @param {string} slot - Equipment slot
     * @param {Object} newOffsets - {position: {x,y,z}, rotation: {x,y,z}, scale: number}
     */
    updateOffsets(slot, newOffsets) {
        const item = this.equippedItems.get(slot);
        if (!item) return false;

        if (newOffsets.position) {
            // Compensate position for bone scale (same as in attachToBone)
            const boneScale = item.boneWorldScale;
            item.object.position.set(
                newOffsets.position.x / boneScale.x,
                newOffsets.position.y / boneScale.y,
                newOffsets.position.z / boneScale.z
            );
            item.offsets.position = newOffsets.position;
        }

        if (newOffsets.rotation) {
            item.object.rotation.set(
                newOffsets.rotation.x,
                newOffsets.rotation.y,
                newOffsets.rotation.z
            );
            item.offsets.rotation = newOffsets.rotation;
        }

        if (newOffsets.scale !== undefined) {
            // Recalculate scale with new multiplier
            const scaleMultiplier = newOffsets.scale;
            const boneScale = item.boneWorldScale;
            const origScale = item.originalEquipmentScale;

            item.object.scale.set(
                (origScale.x / boneScale.x) * scaleMultiplier,
                (origScale.y / boneScale.y) * scaleMultiplier,
                (origScale.z / boneScale.z) * scaleMultiplier
            );

            item.offsets.scale = scaleMultiplier;
        }

        // Axis helper and sphere automatically follow equipment transform
        // No need to update them manually

        return true;
    }

    /**
     * Reset when model is unloaded
     */
    reset() {
        this.hideEquipmentPreview();
        this.unequipAll();
        this.inventory.clear();
        console.log('🔄 Equipment manager reset');
    }

    /**
     * Clear inventory without unequipping
     */
    clearInventory() {
        this.unequipAll();
        this.inventory.clear();
        this.hideEquipmentPreview();
        console.log('🗑️ Inventory cleared');
    }

    // ==================== BONE ANALYSIS & MAPPING ====================

    /**
     * Predefined bone mapping presets for common rig types
     * Format: { customBoneName: mixamoBoneName }
     */
    getBoneMappingPresets() {
        return {
            // Preset 1: Standard L_/R_ prefix rig (like UE4/Unity default)
            'standard_lr_prefix': {
                name: 'Standard L_/R_ Prefix Rig',
                signature: ['Root', 'Pelvis', 'L_Thigh', 'L_Calf', 'L_Hand', 'R_Hand'],

                // Axis correction for this rig type
                // Mixamo uses centimeters, most game engines use meters
                axisCorrection: {
                    // Scale factor to convert Mixamo units to your rig's units
                    // Mixamo is in centimeters, divide by 100 for meters
                    positionScale: 0.01, // cm to meters (1/100)

                    // Per-bone rotation offsets (in degrees)
                    // Iteration 2 - BEST RESULT ("now its a bit better - still broken, but only via torso")
                    boneRotationOffsets: {
                        // Torso (first pass)
                        'Pelvis': { x: -131, y: -52, z: -145 },
                        'Waist': { x: -122, y: -31, z: -147 },

                        // Legs (iteration 2)
                        'L_Thigh': { x: 97, y: -8, z: 149 },
                        'R_Thigh': { x: 96, y: -2, z: 130 },
                        'L_Calf': { x: 93, y: -3, z: 4 },
                        'R_Calf': { x: 85, y: 5, z: 12 },
                        'L_Foot': { x: 37, y: -3, z: 23 },
                        'R_Foot': { x: 16, y: -11, z: 8 },

                        // Shoulders (iteration 2 refinement)
                        'L_Clavicle': { x: -19, y: -18, z: 50 },
                        'R_Clavicle': { x: -22, y: -1, z: 276 },

                        // Arms (iteration 2)
                        'L_Upperarm': { x: 17, y: 1, z: -167 },
                        'R_Upperarm': { x: 12, y: -40, z: 150 },
                        'R_Forearm': { x: 16, y: -12, z: 88 },

                        // Hands
                        'L_Hand': { x: 168, y: 70, z: -171 },

                        // Head
                        'Head': { x: 32, y: -11, z: 8 }
                    },

                    // Global rotation offset for ROOT/PELVIS bone (in degrees)
                    // Model does "back bend/bridge" pose when Mixamo applied
                    // Try X-axis 180° flip
                    globalRotationOffset: { x: 180, y: 0, z: 0 }
                },

                mapping: {
                    // Core
                    'Root': null, // Root bone, no Mixamo equivalent
                    'Hip': 'Hips',
                    'Pelvis': 'Hips',

                    // Spine
                    'Waist': 'Spine',
                    'Spine01': 'Spine1',
                    'Spine02': 'Spine2',

                    // Neck & Head
                    'NeckTwist01': 'Neck',
                    'NeckTwist02': null, // Extra neck twist, no equivalent
                    'Head': 'Head',

                    // Left Arm
                    'L_Clavicle': 'LeftShoulder',
                    'L_Upperarm': 'LeftArm',
                    'L_Forearm': 'LeftForeArm',
                    'L_Hand': 'LeftHand',

                    // Right Arm
                    'R_Clavicle': 'RightShoulder',
                    'R_Upperarm': 'RightArm',
                    'R_Forearm': 'RightForeArm',
                    'R_Hand': 'RightHand',

                    // Left Leg
                    'L_Thigh': 'LeftUpLeg',
                    'L_Calf': 'LeftLeg',
                    'L_Foot': 'LeftFoot',

                    // Right Leg
                    'R_Thigh': 'RightUpLeg',
                    'R_Calf': 'RightLeg',
                    'R_Foot': 'RightFoot',

                    // Twist bones (no Mixamo equivalent, but map anyway)
                    'L_UpperarmTwist01': null,
                    'L_UpperarmTwist02': null,
                    'L_ForearmTwist01': null,
                    'L_ForearmTwist02': null,
                    'R_UpperarmTwist01': null,
                    'R_UpperarmTwist02': null,
                    'R_ForearmTwist01': null,
                    'R_ForearmTwist02': null,
                    'L_ThighTwist01': null,
                    'L_ThighTwist02': null,
                    'L_CalfTwist01': null,
                    'L_CalfTwist02': null,
                    'R_ThighTwist01': null,
                    'R_ThighTwist02': null,
                    'R_CalfTwist01': null,
                    'R_CalfTwist02': null
                }
            }

            // Add more presets here in the future:
            // 'unreal_mannequin': { ... },
            // 'unity_mecanim': { ... },
            // etc.
        };
    }

    /**
     * Detect which preset rig type matches the loaded skeleton
     * @returns {Object|null} Preset object or null if no match
     */
    detectPresetRigType() {
        const analysis = this.analyzeSkeleton();
        if (!analysis) return null;

        const presets = this.getBoneMappingPresets();
        const boneNames = analysis.bones.map(b => b.name);

        // Check each preset's signature bones
        for (const [presetId, preset] of Object.entries(presets)) {
            const signatureMatches = preset.signature.filter(sigBone =>
                boneNames.includes(sigBone)
            ).length;

            const matchPercent = (signatureMatches / preset.signature.length) * 100;

            // If 80% or more signature bones match, use this preset
            if (matchPercent >= 80) {
                console.log(`✅ Detected rig type: ${preset.name}`);
                console.log(`   Signature match: ${signatureMatches}/${preset.signature.length} bones (${matchPercent.toFixed(0)}%)`);
                return { id: presetId, ...preset };
            }
        }

        console.log('⚠️ No preset rig detected, will use auto-mapping');
        return null;
    }

    /**
     * Get Mixamo standard bone names
     */
    getMixamoStandardBones() {
        return [
            'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
            'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
            'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
            'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
            'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
            // Fingers
            'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3',
            'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3',
            'LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3',
            'LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3',
            'LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3',
            'RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3',
            'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3',
            'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3',
            'RightHandRing1', 'RightHandRing2', 'RightHandRing3',
            'RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3'
        ];
    }

    /**
     * Analyze loaded skeleton and return structure
     */
    analyzeSkeleton() {
        const model = this.threeSetup.getLoadedModel();
        if (!model) {
            console.warn('No model loaded');
            return null;
        }

        const bones = [];
        const boneHierarchy = [];
        let rootBone = null;

        // Find all bones
        model.traverse((child) => {
            if (child.isBone) {
                bones.push({
                    name: child.name,
                    uuid: child.uuid,
                    parent: child.parent ? child.parent.name : null,
                    children: child.children.filter(c => c.isBone).map(c => c.name),
                    position: child.position.clone(),
                    rotation: child.rotation.clone(),
                    scale: child.scale.clone()
                });

                if (!child.parent || !child.parent.isBone) {
                    rootBone = child.name;
                }
            }
        });

        // Build hierarchy tree
        const buildTree = (boneName, depth = 0) => {
            const bone = bones.find(b => b.name === boneName);
            if (!bone) return null;

            const node = {
                name: bone.name,
                depth: depth,
                children: []
            };

            bone.children.forEach(childName => {
                const childNode = buildTree(childName, depth + 1);
                if (childNode) {
                    node.children.push(childNode);
                }
            });

            return node;
        };

        if (rootBone) {
            const tree = buildTree(rootBone);
            boneHierarchy.push(tree);
        }

        const analysis = {
            totalBones: bones.length,
            rootBone: rootBone,
            bones: bones,
            hierarchy: boneHierarchy,
            isMixamo: bones.some(b => b.name.toLowerCase().includes('mixamorig')),
            hasFingers: bones.some(b => b.name.toLowerCase().includes('thumb') || b.name.toLowerCase().includes('index'))
        };

        console.log('🦴 Skeleton Analysis:', analysis);
        console.log('\n📋 All Bones List:');
        bones.forEach((bone, index) => {
            console.log(`  ${index + 1}. ${bone.name} ${bone.parent ? `(parent: ${bone.parent})` : '(root)'}`);
        });
        return analysis;
    }

    /**
     * Auto-map custom rig to Mixamo bone names
     */
    autoMapToMixamo() {
        const analysis = this.analyzeSkeleton();
        if (!analysis) return null;

        const mixamoBones = this.getMixamoStandardBones();
        const mapping = {};

        // For each Mixamo bone, try to find a match in the current rig
        mixamoBones.forEach(mixamoBone => {
            const match = this.findBoneMatch(mixamoBone, analysis.bones);
            if (match) {
                mapping[match.bone.name] = {
                    mixamoBone: mixamoBone,
                    confidence: match.confidence,
                    score: match.score
                };
            }
        });

        console.log('🗺️ Auto-mapping result:', mapping);

        // Log unmatched bones from custom rig
        const mappedBoneNames = Object.keys(mapping);
        const unmappedCustomBones = analysis.bones
            .filter(b => !mappedBoneNames.includes(b.name))
            .map(b => b.name);

        if (unmappedCustomBones.length > 0) {
            console.log('\n⚠️ Unmapped bones from your rig:');
            unmappedCustomBones.forEach(name => console.log(`  - ${name}`));
        }

        // Log unmatched Mixamo bones
        const mappedMixamoBones = Object.values(mapping).map(m => m.mixamoBone);
        const unmatchedMixamoBones = mixamoBones.filter(mb => !mappedMixamoBones.includes(mb));

        if (unmatchedMixamoBones.length > 0) {
            console.log('\n❌ Mixamo bones not found in your rig:');
            unmatchedMixamoBones.forEach(name => console.log(`  - ${name}`));
        }

        return {
            mapping: mapping,
            totalMatched: Object.keys(mapping).length,
            totalMixamoBones: mixamoBones.length,
            matchRate: (Object.keys(mapping).length / mixamoBones.length * 100).toFixed(1) + '%',
            unmappedCustomBones: unmappedCustomBones,
            unmatchedMixamoBones: unmatchedMixamoBones
        };
    }

    /**
     * Find best matching bone for a target name
     */
    findBoneMatch(targetName, bones) {
        const searchName = targetName.toLowerCase();
        let bestMatch = null;
        let highestScore = 0;

        bones.forEach(bone => {
            const boneName = bone.name.toLowerCase();

            // FIRST: Check for L_/R_ prefix on ORIGINAL name before cleaning
            let hasLPrefix = boneName.match(/^l_/);
            let hasRPrefix = boneName.match(/^r_/);

            // THEN: Clean up various naming patterns
            const cleanName = boneName
                .replace('mixamorig:', '')
                .replace('mixamorig', '')
                .replace(/[_\-:\.]/g, '')
                .replace(/\d+/g, match => match.padStart(2, '0')); // Normalize numbers: 1 → 01

            const cleanTarget = searchName
                .replace(/[_\-:\.]/g, '')
                .replace(/\d+/g, match => match.padStart(2, '0'));

            let score = 0;

            // Exact match (100 points)
            if (cleanName === cleanTarget) {
                score = 100;
            }
            // Exact match after removing prefix
            else if (boneName.endsWith(searchName)) {
                score = 95;
            }
            // Contains target name
            else if (cleanName.includes(cleanTarget)) {
                score = 80;
            }
            // Partial match logic
            else {
                // Check for common aliases (both directions)
                const aliases = {
                    'hips': ['pelvis', 'root', 'hip'],
                    'spine': ['back', 'spine01', 'spine1'],
                    'spine1': ['spine01', 'spine02', 'chest'],
                    'spine2': ['spine02', 'spine03', 'upperback'],
                    'neck': ['necktwist', 'neck01'],
                    'head': ['head01', 'skull'],
                    'upleg': ['thigh', 'upperleg', 'hip'],
                    'leg': ['calf', 'shin', 'lowerleg', 'knee'],
                    'forearm': ['lowerarm', 'elbow'],
                    'arm': ['upperarm', 'shoulder'],
                    'foot': ['ankle', 'feet'],
                    'hand': ['wrist', 'palm'],
                    'toebase': ['toe', 'toes', 'toeend'],
                    'shoulder': ['clavicle', 'collar']
                };

                // Check if target has an alias in the bone name
                for (const [key, values] of Object.entries(aliases)) {
                    if (cleanTarget.includes(key)) {
                        if (values.some(v => cleanName.includes(v))) {
                            score = 75;
                            break;
                        }
                    }
                }

                // Check reverse: if bone name has an alias that matches target
                for (const [key, values] of Object.entries(aliases)) {
                    if (cleanName.includes(key)) {
                        if (values.some(v => cleanTarget.includes(v))) {
                            score = Math.max(score, 75);
                            break;
                        }
                    }
                }

                // Handle L_/R_ prefix patterns (using flags detected earlier)
                // Convert "l_hand" → "lefthand", "r_forearm" → "rightforearm"
                let expandedBoneName = cleanName;
                if (hasLPrefix) {
                    // Remove 'l' from start and add 'left'
                    expandedBoneName = 'left' + cleanName.substring(1);
                } else if (hasRPrefix) {
                    // Remove 'r' from start and add 'right'
                    expandedBoneName = 'right' + cleanName.substring(1);
                }

                // Check if expanded names match
                if (expandedBoneName === cleanTarget) {
                    score = Math.max(score, 95); // Very high score for exact match after expansion
                } else if (expandedBoneName.includes(cleanTarget) || cleanTarget.includes(expandedBoneName)) {
                    score = Math.max(score, 85);
                }

                // Side matching (left/right) - bonus points
                const hasLeftInTarget = cleanTarget.includes('left');
                const hasRightInTarget = cleanTarget.includes('right');
                const hasLeftInBone = cleanName.includes('left') || hasLPrefix;
                const hasRightInBone = cleanName.includes('right') || hasRPrefix;

                if (hasLeftInTarget && hasLeftInBone) score += 25;
                if (hasRightInTarget && hasRightInBone) score += 25;
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = {
                    bone: bone,
                    score: score,
                    confidence: score >= 90 ? 'high' : score >= 70 ? 'medium' : 'low'
                };
            }
        });

        return bestMatch;
    }

    /**
     * Generate mapping code for console
     */
    generateMappingCode() {
        const mappingResult = this.autoMapToMixamo();
        if (!mappingResult) return '';

        let code = '// Auto-generated bone mapping\nconst boneMapping = {\n';

        Object.entries(mappingResult.mapping).forEach(([sourceBone, data]) => {
            code += `  '${sourceBone}': '${data.mixamoBone}', // Confidence: ${data.confidence} (${data.score}%)\n`;
        });

        code += '};\n\n';
        code += `// Match rate: ${mappingResult.matchRate} (${mappingResult.totalMatched}/${mappingResult.totalMixamoBones} bones)\n`;

        return code;
    }

    // ==================== MANUAL BONE MAPPING ====================

    /**
     * Save manual bone mapping to localStorage
     * @param {Object} mapping - Mapping object { customBoneName: mixamoBoneName }
     */
    saveManualMapping(mapping) {
        try {
            localStorage.setItem('boneMapping_manual', JSON.stringify(mapping));
            console.log('💾 Manual bone mapping saved to localStorage');
            return true;
        } catch (error) {
            console.error('Failed to save mapping:', error);
            return false;
        }
    }

    /**
     * Load manual bone mapping from localStorage
     * @returns {Object|null} Mapping object or null if not found
     */
    loadManualMapping() {
        try {
            const saved = localStorage.getItem('boneMapping_manual');
            if (saved) {
                const mapping = JSON.parse(saved);
                console.log('📂 Loaded manual bone mapping from localStorage');
                return mapping;
            }
        } catch (error) {
            console.error('Failed to load mapping:', error);
        }
        return null;
    }

    /**
     * Clear manual bone mapping from localStorage
     */
    clearManualMapping() {
        try {
            localStorage.removeItem('boneMapping_manual');
            console.log('🗑️ Cleared manual bone mapping from localStorage');
            return true;
        } catch (error) {
            console.error('Failed to clear mapping:', error);
            return false;
        }
    }

    /**
     * Get current manual mapping for animation controller
     * Inverted format: Mixamo → Custom
     */
    getManualMappingForAnimations() {
        const customToMixamo = this.loadManualMapping();
        if (!customToMixamo) return null;

        // Invert mapping: Mixamo → Custom
        const mixamoToCustom = {};
        for (const [customBone, mixamoBone] of Object.entries(customToMixamo)) {
            if (mixamoBone && mixamoBone !== '') {
                mixamoToCustom[mixamoBone] = customBone;
            }
        }

        return Object.keys(mixamoToCustom).length > 0 ? mixamoToCustom : null;
    }
}
