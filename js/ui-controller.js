// UI Controller - Handles all DOM manipulation and UI updates
class UIController {
    constructor() {
        this.elements = {
            loading: document.getElementById('loading'),
            loadingStatus: document.getElementById('loadingStatus'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            fileName: document.getElementById('fileName'),
            generateBtn: document.getElementById('generateBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            successMessage: document.getElementById('successMessage'),
            spritePreview: document.getElementById('spritePreview'),
            animationSelect: document.getElementById('animationSelect'),
            animationTime: document.getElementById('animationTime'),
            timeValue: document.getElementById('timeValue'),
            cameraDistance: document.getElementById('cameraDistance'),
            distanceValue: document.getElementById('distanceValue'),
            cameraHeight: document.getElementById('cameraHeight'),
            heightValue: document.getElementById('heightValue'),
            lightIntensity: document.getElementById('lightIntensity'),
            lightValue: document.getElementById('lightValue'),
            spriteSize: document.getElementById('spriteSize'),
            spriteModal: document.getElementById('spriteModal'),
            modalImage: document.getElementById('modalImage'),
            modalCaption: document.getElementById('modalCaption'),
            modalClose: document.getElementById('modalClose'),
            directionCount: document.getElementById('directionCount'),
            animationFrames: document.getElementById('animationFrames'),
            autoplayAnimation: document.getElementById('autoplayAnimation'),
            lockPosition: document.getElementById('lockPosition'),
            singleDirection: document.getElementById('singleDirection'),
            singleDirectionInfo: document.getElementById('singleDirectionInfo'),
            // Equipment inventory elements
            equipmentSlot: document.getElementById('equipmentSlot'),
            equipmentFile: document.getElementById('equipmentFile'),
            inventoryList: document.getElementById('inventoryList'),
            equipAllBtn: document.getElementById('equipAllBtn'),
            unequipAllBtn: document.getElementById('unequipAllBtn'),
            adjustEquipmentSlot: document.getElementById('adjustEquipmentSlot'),
            equipScale: document.getElementById('equipScale'),
            equipScaleValue: document.getElementById('equipScaleValue'),
            equipX: document.getElementById('equipX'),
            equipXValue: document.getElementById('equipXValue'),
            equipY: document.getElementById('equipY'),
            equipYValue: document.getElementById('equipYValue'),
            equipZ: document.getElementById('equipZ'),
            equipZValue: document.getElementById('equipZValue'),
            equipRotX: document.getElementById('equipRotX'),
            equipRotXValue: document.getElementById('equipRotXValue'),
            equipRotY: document.getElementById('equipRotY'),
            equipRotYValue: document.getElementById('equipRotYValue'),
            equipRotZ: document.getElementById('equipRotZ'),
            equipRotZValue: document.getElementById('equipRotZValue')
        };

        // Setup modal close handlers
        this.setupModalHandlers();

        // Setup bone viewer tabs
        this.setupBoneViewerTabs();
    }

    setupModalHandlers() {
        // Close on X button click
        this.elements.modalClose.addEventListener('click', () => {
            this.closeSpriteModal();
        });

        // Close on background click
        this.elements.spriteModal.addEventListener('click', (e) => {
            if (e.target === this.elements.spriteModal) {
                this.closeSpriteModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.spriteModal.style.display === 'block') {
                this.closeSpriteModal();
            }
        });
    }

    // Loading state management
    showLoading(status, progress) {
        this.elements.loading.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.updateProgress(progress, status);
    }

    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    updateProgress(percent, status) {
        this.elements.progressBar.style.width = percent + '%';
        this.elements.progressText.textContent = Math.round(percent) + '%';
        if (status) {
            this.elements.loadingStatus.textContent = status;
        }
    }

    // Error handling
    showError(message) {
        this.hideLoading();
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.style.display = 'block';
    }

    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    // File name display
    updateFileName(fileName) {
        this.elements.fileName.textContent = fileName;
    }

    // Button states
    enableGenerateButton() {
        this.elements.generateBtn.disabled = false;
    }

    disableGenerateButton() {
        this.elements.generateBtn.disabled = true;
    }

    enableDownloadButton() {
        this.elements.downloadBtn.disabled = false;
    }

    disableDownloadButton() {
        this.elements.downloadBtn.disabled = true;
    }

    // Success message
    showSuccessMessage() {
        this.elements.successMessage.style.display = 'block';
    }

    hideSuccessMessage() {
        this.elements.successMessage.style.display = 'none';
    }

    showSuccessMessageTemporary(duration = 2000) {
        this.showSuccessMessage();
        setTimeout(() => {
            this.hideSuccessMessage();
        }, duration);
    }

    // Animation controls
    populateAnimationList(embeddedAnimations, libraryAnimations, proceduralAnimations) {
        this.elements.animationSelect.innerHTML = '<option value="-1">No Animation</option>';

        // Add embedded animations if present
        if (embeddedAnimations && embeddedAnimations.length > 0) {
            const embeddedGroup = document.createElement('optgroup');
            embeddedGroup.label = '📦 Model Animations';
            embeddedAnimations.forEach((anim, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = anim.name || `Animation ${index + 1}`;
                embeddedGroup.appendChild(option);
            });
            this.elements.animationSelect.appendChild(embeddedGroup);
        }

        // Add library animations (Mixamo, uploaded)
        if (libraryAnimations && libraryAnimations.length > 0) {
            const libraryGroup = document.createElement('optgroup');
            libraryGroup.label = '📚 Animation Library';
            libraryAnimations.forEach((anim, index) => {
                const option = document.createElement('option');
                option.value = CONFIG.ANIMATION.LIBRARY_INDEX_OFFSET + index;
                const icon = anim.source === 'uploaded' ? '⬆️' : '🎭';
                option.textContent = `${icon} ${anim.name}`;
                libraryGroup.appendChild(option);
            });
            this.elements.animationSelect.appendChild(libraryGroup);
        }

        // Add procedural animations (always available)
        if (proceduralAnimations && proceduralAnimations.length > 0) {
            const proceduralGroup = document.createElement('optgroup');
            proceduralGroup.label = '⚙️ Procedural Animations';
            proceduralAnimations.forEach((anim, index) => {
                const option = document.createElement('option');
                option.value = CONFIG.ANIMATION.PROCEDURAL_INDEX_OFFSET + index;
                option.textContent = anim.name;
                proceduralGroup.appendChild(option);
            });
            this.elements.animationSelect.appendChild(proceduralGroup);
        }

        this.elements.animationSelect.disabled = false;
        this.elements.animationTime.disabled = false;
    }

    resetAnimationControls() {
        this.elements.animationSelect.innerHTML = '<option value="-1">No Animation</option>';
        this.elements.animationSelect.disabled = true;
        this.elements.animationTime.disabled = true;
        this.elements.animationTime.value = 0;
        this.elements.timeValue.textContent = '0.0s';
    }

    updateAnimationTime(time) {
        this.elements.timeValue.textContent = time.toFixed(1) + 's';
    }

    setAnimationDuration(duration) {
        this.elements.animationTime.max = duration;
        this.elements.animationTime.value = 0;
        this.elements.timeValue.textContent = '0.0s';
    }

    // Camera controls display
    updateCameraDistance(distance) {
        this.elements.distanceValue.textContent = distance.toFixed(1);
    }

    updateCameraHeight(height) {
        this.elements.heightValue.textContent = height.toFixed(1);
    }

    updateLightIntensity(intensity) {
        this.elements.lightValue.textContent = intensity.toFixed(1);
    }

    // Get input values with validation
    getSpriteSize() {
        const value = parseInt(this.elements.spriteSize.value);
        if (isNaN(value) || value < CONFIG.SPRITE.MIN_SIZE || value > CONFIG.SPRITE.MAX_SIZE) {
            return CONFIG.SPRITE.DEFAULT_SIZE;
        }
        return value;
    }

    getCameraDistance() {
        const value = parseFloat(this.elements.cameraDistance.value);
        if (isNaN(value) || value < CONFIG.CAMERA.MIN_DISTANCE || value > CONFIG.CAMERA.MAX_DISTANCE) {
            return CONFIG.CAMERA.DEFAULT_DISTANCE;
        }
        return value;
    }

    getCameraHeight() {
        const value = parseFloat(this.elements.cameraHeight.value);
        if (isNaN(value) || value < CONFIG.CAMERA.MIN_HEIGHT || value > CONFIG.CAMERA.MAX_HEIGHT) {
            return CONFIG.CAMERA.DEFAULT_HEIGHT;
        }
        return value;
    }

    getLightIntensity() {
        const value = parseFloat(this.elements.lightIntensity.value);
        if (isNaN(value) || value < 0) {
            return 3.0; // Default light intensity
        }
        return value;
    }

    getDirectionCount() {
        const value = parseInt(this.elements.directionCount.value);
        return (value === 16) ? 16 : 8; // Only allow 8 or 16
    }

    getAnimationFrames() {
        const value = parseInt(this.elements.animationFrames.value);
        if (isNaN(value) || value < 1) {
            return 1;
        }
        if (value > 32) {
            return 32;
        }
        return value;
    }

    getSelectedAnimation() {
        const value = parseInt(this.elements.animationSelect.value);
        return isNaN(value) ? CONFIG.ANIMATION.NO_ANIMATION : value;
    }

    getAnimationTime() {
        const value = parseFloat(this.elements.animationTime.value);
        return isNaN(value) ? 0 : Math.max(0, value);
    }

    isAutoplayEnabled() {
        return this.elements.autoplayAnimation.checked;
    }

    setAutoplayEnabled(enabled) {
        this.elements.autoplayAnimation.checked = enabled;
    }

    isLockPositionEnabled() {
        return this.elements.lockPosition.checked;
    }

    setLockPositionEnabled(enabled) {
        this.elements.lockPosition.checked = enabled;
    }

    isSingleDirectionEnabled() {
        return this.elements.singleDirection.checked;
    }

    setSingleDirectionEnabled(enabled) {
        this.elements.singleDirection.checked = enabled;
    }

    showSingleDirectionInfo() {
        this.elements.singleDirectionInfo.style.display = 'block';
    }

    hideSingleDirectionInfo() {
        this.elements.singleDirectionInfo.style.display = 'none';
    }

    // Sprite preview
    displaySprites(sprites) {
        this.elements.spritePreview.innerHTML = '';
        this.elements.spritePreview.style.display = 'grid';

        sprites.forEach(sprite => {
            const item = document.createElement('div');
            item.className = 'sprite-item';

            const img = document.createElement('img');
            img.src = sprite.data;

            // Use Sprite class methods for consistent naming
            const displayName = sprite.displayName || sprite.name || 'sprite';
            img.alt = displayName;

            img.addEventListener('click', () => {
                this.showSpriteModal(sprite.data, displayName);
            });

            const caption = document.createElement('p');
            caption.textContent = displayName;

            item.appendChild(img);
            item.appendChild(caption);
            this.elements.spritePreview.appendChild(item);
        });
    }

    hideSpritePreview() {
        this.elements.spritePreview.style.display = 'none';
    }

    // Sprite modal
    showSpriteModal(imageSrc, caption) {
        this.elements.modalImage.src = imageSrc;
        this.elements.modalCaption.textContent = caption;
        this.elements.spriteModal.style.display = 'block';
    }

    closeSpriteModal() {
        this.elements.spriteModal.style.display = 'none';
    }

    // Event listener helpers
    onFileSelect(callback) {
        document.getElementById('modelFile').addEventListener('change', callback);
    }

    onAnimationFileSelect(callback) {
        document.getElementById('animationFile').addEventListener('change', callback);
    }

    onGenerateClick(callback) {
        this.elements.generateBtn.addEventListener('click', callback);
    }

    onDownloadClick(callback) {
        this.elements.downloadBtn.addEventListener('click', callback);
    }

    onAnimationSelect(callback) {
        this.elements.animationSelect.addEventListener('change', callback);
    }

    onAnimationTimeChange(callback) {
        this.elements.animationTime.addEventListener('input', callback);
    }

    onAutoplayToggle(callback) {
        this.elements.autoplayAnimation.addEventListener('change', callback);
    }

    onLockPositionToggle(callback) {
        this.elements.lockPosition.addEventListener('change', callback);
    }

    onSingleDirectionToggle(callback) {
        this.elements.singleDirection.addEventListener('change', callback);
    }

    onCameraDistanceChange(callback) {
        this.elements.cameraDistance.addEventListener('input', callback);
    }

    onCameraHeightChange(callback) {
        this.elements.cameraHeight.addEventListener('input', callback);
    }

    onLightIntensityChange(callback) {
        this.elements.lightIntensity.addEventListener('input', callback);
    }

    onErrorClose(callback) {
        const closeBtn = this.elements.errorMessage.querySelector('button');
        if (closeBtn) {
            closeBtn.addEventListener('click', callback);
        }
    }

    // Equipment Inventory Methods

    /**
     * Get selected equipment slot
     */
    getSelectedEquipmentSlot() {
        return this.elements.equipmentSlot.value;
    }

    /**
     * Update inventory list display
     * @param {Array} inventory - Array of inventory items
     * @param {Function} onEquipClick - Callback(slot)
     * @param {Function} onRemoveClick - Callback(slot)
     */
    updateInventoryDisplay(inventory, onEquipClick, onRemoveClick) {
        const listElement = this.elements.inventoryList;

        if (!inventory || inventory.length === 0) {
            listElement.innerHTML = '<div class="empty-inventory">No equipment loaded</div>';
            this.elements.equipAllBtn.disabled = true;
            this.elements.unequipAllBtn.disabled = true;
            return;
        }

        // Enable buttons
        this.elements.equipAllBtn.disabled = false;
        this.elements.unequipAllBtn.disabled = inventory.every(item => !item.isEquipped);

        // Build inventory HTML
        listElement.innerHTML = inventory.map(item => {
            const slotConfig = this.getSlotDisplayName(item.slot);
            const equippedClass = item.isEquipped ? ' equipped' : '';
            const equipBtnText = item.isEquipped ? 'Unequip' : 'Equip';
            const equipBtnClass = item.isEquipped ? 'inventory-btn-remove' : 'inventory-btn-equip';

            return `
                <div class="inventory-item${equippedClass}" data-slot="${item.slot}">
                    <div class="inventory-item-info">
                        <span class="inventory-item-name">${item.fileName}</span>
                        <span class="inventory-item-slot">${slotConfig}</span>
                    </div>
                    <div class="inventory-item-actions">
                        <button class="inventory-btn ${equipBtnClass}" data-slot="${item.slot}" data-action="equip">
                            ${equipBtnText}
                        </button>
                        <button class="inventory-btn inventory-btn-remove" data-slot="${item.slot}" data-action="remove">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners
        listElement.querySelectorAll('[data-action="equip"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = btn.dataset.slot;
                const item = inventory.find(i => i.slot === slot);
                if (item.isEquipped) {
                    onEquipClick(slot, false); // Unequip
                } else {
                    onEquipClick(slot, true); // Equip
                }
            });
        });

        listElement.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', () => {
                onRemoveClick(btn.dataset.slot);
            });
        });
    }

    /**
     * Get display name for equipment slot
     */
    getSlotDisplayName(slot) {
        const slotMap = {
            'weapon': '⚔️ Weapon',
            'shield': '🛡️ Shield',
            'helmet': '🪖 Helmet',
            'chest': '🦺 Chest',
            'legs': '👖 Legs',
            'boots': '👢 Boots',
            'back': '🎒 Back'
        };
        return slotMap[slot] || slot;
    }

    /**
     * Update adjust equipment dropdown with equipped items
     * @param {Array} equippedSlots - Array of equipped slot names
     */
    updateAdjustEquipmentDropdown(equippedSlots) {
        const dropdown = this.elements.adjustEquipmentSlot;
        dropdown.innerHTML = '<option value="">Select equipped item...</option>';

        if (equippedSlots && equippedSlots.length > 0) {
            equippedSlots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = this.getSlotDisplayName(slot);
                dropdown.appendChild(option);
            });
            dropdown.disabled = false;
        } else {
            dropdown.disabled = true;
            this.disableEquipmentAdjustments();
        }
    }

    /**
     * Enable equipment adjustment sliders
     */
    enableEquipmentAdjustments() {
        this.elements.equipScale.disabled = false;
        this.elements.equipX.disabled = false;
        this.elements.equipY.disabled = false;
        this.elements.equipZ.disabled = false;
        this.elements.equipRotX.disabled = false;
        this.elements.equipRotY.disabled = false;
        this.elements.equipRotZ.disabled = false;
    }

    /**
     * Disable equipment adjustment sliders
     */
    disableEquipmentAdjustments() {
        this.elements.equipScale.disabled = true;
        this.elements.equipX.disabled = true;
        this.elements.equipY.disabled = true;
        this.elements.equipZ.disabled = true;
        this.elements.equipRotX.disabled = true;
        this.elements.equipRotY.disabled = true;
        this.elements.equipRotZ.disabled = true;
    }

    /**
     * Get equipment adjustment values
     */
    getEquipmentAdjustments() {
        return {
            slot: this.elements.adjustEquipmentSlot.value,
            scale: parseFloat(this.elements.equipScale.value),
            position: {
                x: parseFloat(this.elements.equipX.value),
                y: parseFloat(this.elements.equipY.value),
                z: parseFloat(this.elements.equipZ.value)
            },
            rotation: {
                x: parseFloat(this.elements.equipRotX.value) * (Math.PI / 180),
                y: parseFloat(this.elements.equipRotY.value) * (Math.PI / 180),
                z: parseFloat(this.elements.equipRotZ.value) * (Math.PI / 180)
            }
        };
    }

    /**
     * Update equipment adjustment display values
     */
    updateEquipmentAdjustmentDisplays() {
        this.elements.equipScaleValue.textContent = parseFloat(this.elements.equipScale.value).toFixed(2);
        this.elements.equipXValue.textContent = parseFloat(this.elements.equipX.value).toFixed(2);
        this.elements.equipYValue.textContent = parseFloat(this.elements.equipY.value).toFixed(2);
        this.elements.equipZValue.textContent = parseFloat(this.elements.equipZ.value).toFixed(2);
        this.elements.equipRotXValue.textContent = Math.round(parseFloat(this.elements.equipRotX.value));
        this.elements.equipRotYValue.textContent = Math.round(parseFloat(this.elements.equipRotY.value));
        this.elements.equipRotZValue.textContent = Math.round(parseFloat(this.elements.equipRotZ.value));
    }

    // Equipment event listener helpers

    onEquipmentFileSelect(callback) {
        this.elements.equipmentFile.addEventListener('change', callback);
    }

    onEquipAllClick(callback) {
        this.elements.equipAllBtn.addEventListener('click', callback);
    }

    onUnequipAllClick(callback) {
        this.elements.unequipAllBtn.addEventListener('click', callback);
    }

    onAdjustEquipmentSlotChange(callback) {
        this.elements.adjustEquipmentSlot.addEventListener('change', callback);
    }

    onEquipmentAdjustmentChange(callback) {
        const adjustmentControls = [
            this.elements.equipScale,
            this.elements.equipX,
            this.elements.equipY,
            this.elements.equipZ,
            this.elements.equipRotX,
            this.elements.equipRotY,
            this.elements.equipRotZ
        ];

        adjustmentControls.forEach(control => {
            control.addEventListener('input', callback);
        });
    }

    // Bone Viewer Methods

    showBoneViewer(analysis, mappingResult) {
        const modal = document.getElementById('boneViewerModal');
        modal.style.display = 'block';

        // Update stats
        this.updateRigStats(analysis);

        // Update bone hierarchy
        this.updateBoneHierarchy(analysis.hierarchy);

        // Update mapping tab
        if (mappingResult) {
            this.updateBoneMapping(mappingResult);
        }

        // Update comparison
        this.updateRigComparison(analysis);
    }

    closeBoneViewer() {
        document.getElementById('boneViewerModal').style.display = 'none';
    }

    updateRigStats(analysis) {
        const statsEl = document.getElementById('rigStats');
        statsEl.innerHTML = `
            <div class="rig-stat-item">
                <div class="rig-stat-label">Total Bones</div>
                <div class="rig-stat-value">${analysis.totalBones}</div>
            </div>
            <div class="rig-stat-item">
                <div class="rig-stat-label">Root Bone</div>
                <div class="rig-stat-value">${analysis.rootBone || 'N/A'}</div>
            </div>
            <div class="rig-stat-item">
                <div class="rig-stat-label">Rig Type</div>
                <div class="rig-stat-value">${analysis.isMixamo ? 'Mixamo' : 'Custom'}</div>
            </div>
            <div class="rig-stat-item">
                <div class="rig-stat-label">Has Fingers</div>
                <div class="rig-stat-value">${analysis.hasFingers ? 'Yes' : 'No'}</div>
            </div>
        `;
    }

    updateBoneHierarchy(hierarchy) {
        const treeEl = document.getElementById('boneTree');

        const renderTree = (node, depth = 0) => {
            const icon = node.children.length > 0 ? '📂' : '📄';
            const indent = depth * 20; // 20px per depth level
            let html = `<div class="bone-item" style="padding-left: ${indent}px;"><span class="bone-item-icon">${icon}</span> <span class="bone-item-name">${node.name}</span></div>`;

            node.children.forEach(child => {
                html += renderTree(child, depth + 1);
            });

            return html;
        };

        treeEl.innerHTML = hierarchy.map(tree => renderTree(tree)).join('');
    }

    updateBoneMapping(mappingResult) {
        const mappingEl = document.getElementById('boneMapping');

        const mappingHTML = Object.entries(mappingResult.mapping).map(([sourceBone, data]) => {
            const confidenceClass = data.confidence;
            const matchClass = data.confidence === 'high' ? '' : data.confidence === 'medium' ? 'partial-match' : 'no-match';

            return `
                <div class="mapping-item ${matchClass}">
                    <div class="mapping-source">${sourceBone}</div>
                    <div class="mapping-arrow">→</div>
                    <div class="mapping-target">${data.mixamoBone}</div>
                    <div class="mapping-confidence ${confidenceClass}">${data.confidence.toUpperCase()}</div>
                </div>
            `;
        }).join('');

        mappingEl.innerHTML = mappingHTML + `
            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 6px;">
                <strong>Match Rate:</strong> ${mappingResult.matchRate}
                (${mappingResult.totalMatched}/${mappingResult.totalMixamoBones} bones matched)
            </div>
        `;
    }

    updateRigComparison(analysis) {
        const currentRigEl = document.getElementById('currentRigList');
        const mixamoRigEl = document.getElementById('mixamoRigList');

        // Current rig bones
        currentRigEl.innerHTML = analysis.bones.map(bone => {
            return `<div class="bone-list-item">${bone.name}</div>`;
        }).join('');

        // Mixamo standard bones
        const mixamoBones = [
            'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
            'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
            'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
            'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
            'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'
        ];

        mixamoRigEl.innerHTML = mixamoBones.map(bone => {
            const exists = analysis.bones.some(b =>
                b.name.toLowerCase().includes(bone.toLowerCase()) ||
                bone.toLowerCase().includes(b.name.toLowerCase().replace('mixamorig:', ''))
            );
            return `<div class="bone-list-item ${exists ? 'matched' : 'unmatched'}">${bone}</div>`;
        }).join('');
    }

    setupBoneViewerTabs() {
        const tabs = document.querySelectorAll('.bone-tab');
        const panes = document.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Remove active from all
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                // Add active to clicked
                tab.classList.add('active');
                document.getElementById(targetTab + 'Tab').classList.add('active');
            });
        });
    }

    onViewBonesClick(callback) {
        const btn = document.getElementById('viewBonesBtn');
        if (btn) {
            btn.addEventListener('click', callback);
        }
    }

    enableViewBonesButton() {
        const btn = document.getElementById('viewBonesBtn');
        if (btn) {
            btn.disabled = false;
        }
    }

    onBoneViewerClose(callback) {
        const closeBtn = document.getElementById('boneViewerClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', callback);
        }

        // Close on background click
        const modal = document.getElementById('boneViewerModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    callback();
                }
            });
        }
    }

    onAutoMapClick(callback) {
        const btn = document.getElementById('autoMapBtn');
        if (btn) {
            btn.addEventListener('click', callback);
        }
    }

    onCopyMappingClick(callback) {
        const btn = document.getElementById('copyMappingBtn');
        if (btn) {
            btn.addEventListener('click', callback);
        }
    }

    // Gizmo Control Methods

    /**
     * Event handler for gizmo enable toggle
     */
    onGizmoEnableToggle(callback) {
        const checkbox = document.getElementById('enableGizmo');
        if (checkbox) {
            checkbox.addEventListener('change', callback);
        }
    }

    /**
     * Event handler for gizmo target selection
     */
    onGizmoTargetChange(callback) {
        const select = document.getElementById('gizmoTarget');
        if (select) {
            select.addEventListener('change', callback);
        }
    }

    /**
     * Event handler for gizmo equipment slot selection
     */
    onGizmoEquipmentSlotChange(callback) {
        const select = document.getElementById('gizmoEquipmentSlot');
        if (select) {
            select.addEventListener('change', callback);
        }
    }

    /**
     * Event handler for gizmo mode buttons
     */
    onGizmoModeChange(callback) {
        const buttons = [
            document.getElementById('gizmoModeTranslate'),
            document.getElementById('gizmoModeRotate'),
            document.getElementById('gizmoModeScale')
        ];

        buttons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    // Update active state
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Extract mode from button ID
                    const mode = btn.id.replace('gizmoMode', '').toLowerCase();
                    callback(mode);
                });
            }
        });
    }

    /**
     * Get gizmo enabled state
     */
    isGizmoEnabled() {
        const checkbox = document.getElementById('enableGizmo');
        return checkbox ? checkbox.checked : false;
    }

    /**
     * Get selected gizmo target
     */
    getGizmoTarget() {
        const select = document.getElementById('gizmoTarget');
        return select ? select.value : '';
    }

    /**
     * Get selected gizmo equipment slot
     */
    getGizmoEquipmentSlot() {
        const select = document.getElementById('gizmoEquipmentSlot');
        return select ? select.value : '';
    }

    /**
     * Update gizmo equipment slot dropdown
     */
    updateGizmoEquipmentDropdown(equippedSlots) {
        const dropdown = document.getElementById('gizmoEquipmentSlot');
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">Select equipped item...</option>';

        if (equippedSlots && equippedSlots.length > 0) {
            equippedSlots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = this.getSlotDisplayName(slot);
                dropdown.appendChild(option);
            });
            dropdown.disabled = false;
        } else {
            dropdown.disabled = true;
        }
    }

    /**
     * Enable/disable gizmo controls
     */
    setGizmoControlsEnabled(enabled) {
        const targetSelect = document.getElementById('gizmoTarget');
        const equipmentDiv = document.getElementById('equipmentGizmoSelect');
        const modeButtons = [
            document.getElementById('gizmoModeTranslate'),
            document.getElementById('gizmoModeRotate'),
            document.getElementById('gizmoModeScale')
        ];

        if (targetSelect) targetSelect.disabled = !enabled;
        modeButtons.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });

        // Show/hide equipment selector based on target
        if (equipmentDiv && enabled) {
            const target = this.getGizmoTarget();
            equipmentDiv.style.display = target === 'equipment' ? 'block' : 'none';
        }
    }

    /**
     * Show/hide gizmo equipment selector
     */
    showGizmoEquipmentSelector() {
        const div = document.getElementById('equipmentGizmoSelect');
        if (div) div.style.display = 'block';
    }

    hideGizmoEquipmentSelector() {
        const div = document.getElementById('equipmentGizmoSelect');
        if (div) div.style.display = 'none';
    }

    /**
     * Set camera distance value WITHOUT triggering change event
     * Used by gizmo controller to sync UI during drag
     */
    setCameraDistanceValue(distance) {
        if (this.elements.cameraDistance) {
            this.elements.cameraDistance.value = distance;
            this.elements.distanceValue.textContent = distance.toFixed(1);
        }
    }

    /**
     * Set camera height value WITHOUT triggering change event
     * Used by gizmo controller to sync UI during drag
     */
    setCameraHeightValue(height) {
        if (this.elements.cameraHeight) {
            this.elements.cameraHeight.value = height;
            this.elements.heightValue.textContent = height.toFixed(1);
        }
    }

    /**
     * Set equipment adjustment values WITHOUT triggering change events
     * Used by gizmo controller to sync UI during drag
     */
    setEquipmentAdjustmentValues(offsets) {
        if (offsets.position) {
            this.elements.equipX.value = offsets.position.x;
            this.elements.equipXValue.textContent = offsets.position.x.toFixed(2);
            this.elements.equipY.value = offsets.position.y;
            this.elements.equipYValue.textContent = offsets.position.y.toFixed(2);
            this.elements.equipZ.value = offsets.position.z;
            this.elements.equipZValue.textContent = offsets.position.z.toFixed(2);
        }

        if (offsets.rotation) {
            this.elements.equipRotX.value = offsets.rotation.x;
            this.elements.equipRotXValue.textContent = Math.round(offsets.rotation.x);
            this.elements.equipRotY.value = offsets.rotation.y;
            this.elements.equipRotYValue.textContent = Math.round(offsets.rotation.y);
            this.elements.equipRotZ.value = offsets.rotation.z;
            this.elements.equipRotZValue.textContent = Math.round(offsets.rotation.z);
        }

        if (offsets.scale !== undefined) {
            this.elements.equipScale.value = offsets.scale;
            this.elements.equipScaleValue.textContent = offsets.scale.toFixed(2);
        }
    }

    // Camera Properties Methods

    /**
     * Update camera angle displays (pitch, yaw, roll)
     */
    updateCameraAngles(angles) {
        const pitchEl = document.getElementById('cameraPitch');
        const yawEl = document.getElementById('cameraYaw');
        const rollEl = document.getElementById('cameraRoll');

        if (pitchEl) pitchEl.textContent = angles.pitch;
        if (yawEl) yawEl.textContent = angles.yaw;
        if (rollEl) rollEl.textContent = angles.roll;
    }

    /**
     * Event handlers for camera property controls
     */
    onCameraPropertyChange(callback) {
        const cameraControls = [
            'camPosX', 'camPosY', 'camPosZ',
            'camRotX', 'camRotY', 'camRotZ',
            'camScaleX', 'camScaleY', 'camScaleZ'
        ];

        cameraControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateCameraPropertyDisplays();
                    callback();
                });
            }
        });
    }

    /**
     * Update camera property display values
     */
    updateCameraPropertyDisplays() {
        const updates = [
            { input: 'camPosX', display: 'camPosXValue', decimals: 2 },
            { input: 'camPosY', display: 'camPosYValue', decimals: 2 },
            { input: 'camPosZ', display: 'camPosZValue', decimals: 2 },
            { input: 'camRotX', display: 'camRotXValue', decimals: 0 },
            { input: 'camRotY', display: 'camRotYValue', decimals: 0 },
            { input: 'camRotZ', display: 'camRotZValue', decimals: 0 },
            { input: 'camScaleX', display: 'camScaleXValue', decimals: 2, suffix: 'x' },
            { input: 'camScaleY', display: 'camScaleYValue', decimals: 2, suffix: 'x' },
            { input: 'camScaleZ', display: 'camScaleZValue', decimals: 2, suffix: 'x' }
        ];

        updates.forEach(({ input, display, decimals, suffix }) => {
            const inputEl = document.getElementById(input);
            const displayEl = document.getElementById(display);
            if (inputEl && displayEl) {
                const value = parseFloat(inputEl.value).toFixed(decimals);
                displayEl.textContent = suffix ? value + suffix : value;
            }
        });
    }

    /**
     * Get camera property values
     */
    getCameraProperties() {
        return {
            position: {
                x: parseFloat(document.getElementById('camPosX')?.value || 3),
                y: parseFloat(document.getElementById('camPosY')?.value || 1.5),
                z: parseFloat(document.getElementById('camPosZ')?.value || 3)
            },
            rotation: {
                x: parseFloat(document.getElementById('camRotX')?.value || 0) * (Math.PI / 180),
                y: parseFloat(document.getElementById('camRotY')?.value || 0) * (Math.PI / 180),
                z: parseFloat(document.getElementById('camRotZ')?.value || 0) * (Math.PI / 180)
            },
            scale: {
                x: parseFloat(document.getElementById('camScaleX')?.value || 1),
                y: parseFloat(document.getElementById('camScaleY')?.value || 1),
                z: parseFloat(document.getElementById('camScaleZ')?.value || 1)
            }
        };
    }

    /**
     * Reset camera properties to defaults
     */
    resetCameraProperties() {
        const defaults = {
            camPosX: CONFIG.CAMERA.DEFAULT_DISTANCE,
            camPosY: CONFIG.CAMERA.DEFAULT_HEIGHT,
            camPosZ: CONFIG.CAMERA.DEFAULT_DISTANCE,
            camRotX: 0,
            camRotY: 0,
            camRotZ: 0,
            camScaleX: 1,
            camScaleY: 1,
            camScaleZ: 1
        };

        Object.entries(defaults).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        this.updateCameraPropertyDisplays();
    }

    /**
     * Update camera property sliders to reflect current camera state
     * (used for syncing when camera moves via OrbitControls)
     */
    syncCameraProperties(camera) {
        // Update position sliders
        const posX = document.getElementById('camPosX');
        const posY = document.getElementById('camPosY');
        const posZ = document.getElementById('camPosZ');
        if (posX) posX.value = camera.position.x.toFixed(2);
        if (posY) posY.value = camera.position.y.toFixed(2);
        if (posZ) posZ.value = camera.position.z.toFixed(2);

        // Update rotation sliders (convert from radians to degrees)
        const rotX = document.getElementById('camRotX');
        const rotY = document.getElementById('camRotY');
        const rotZ = document.getElementById('camRotZ');
        if (rotX) rotX.value = Math.round(camera.rotation.x * 180 / Math.PI);
        if (rotY) rotY.value = Math.round(camera.rotation.y * 180 / Math.PI);
        if (rotZ) rotZ.value = Math.round(camera.rotation.z * 180 / Math.PI);

        // Update scale sliders
        const scaleX = document.getElementById('camScaleX');
        const scaleY = document.getElementById('camScaleY');
        const scaleZ = document.getElementById('camScaleZ');
        if (scaleX) scaleX.value = camera.scale.x.toFixed(2);
        if (scaleY) scaleY.value = camera.scale.y.toFixed(2);
        if (scaleZ) scaleZ.value = camera.scale.z.toFixed(2);

        // Update display values
        this.updateCameraPropertyDisplays();
    }

    /**
     * Event handler for reset camera button
     */
    onResetCameraClick(callback) {
        const btn = document.getElementById('resetCameraBtn');
        if (btn) {
            btn.addEventListener('click', callback);
        }
    }

    /**
     * Event handler for point to center button
     */
    onPointToCenterClick(callback) {
        const btn = document.getElementById('pointToCenterBtn');
        if (btn) {
            btn.addEventListener('click', callback);
        }
    }
}
