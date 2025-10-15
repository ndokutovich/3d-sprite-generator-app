// Model Loader - Handles loading different 3D model formats
class ModelLoader {
    constructor(threeSetup, uiController) {
        this.threeSetup = threeSetup;
        this.uiController = uiController;
        this.animations = [];
    }

    getLoader(extension) {
        const loadingManager = this.threeSetup.getLoadingManager();
        let loader;

        switch(extension) {
            case 'glb':
            case 'gltf':
                loader = new THREE.GLTFLoader(loadingManager);
                break;
            case 'fbx':
                loader = new THREE.FBXLoader(loadingManager);
                break;
            case 'stl':
                loader = new THREE.STLLoader(loadingManager);
                break;
            case 'obj':
                loader = new THREE.OBJLoader(loadingManager);
                break;
            default:
                return null;
        }
        return loader;
    }

    loadModel(contents, extension, fileName) {
        // Clear previous model
        this.threeSetup.removeModel();
        this.animations = [];

        const loader = this.getLoader(extension);

        if (!loader) {
            const supportedFormats = CONFIG.MODEL.SUPPORTED_FORMATS.join(', ').toUpperCase();
            this.uiController.showError(
                `Unsupported file format: ${extension.toUpperCase()}. Please use ${supportedFormats} files.`
            );
            return Promise.reject(new Error('Unsupported format'));
        }

        this.uiController.updateProgress(CONFIG.PROGRESS.PROCESS_MODEL, 'Processing model...');

        return new Promise((resolve, reject) => {
            try {
                if (extension === 'glb' || extension === 'gltf') {
                    this.loadGLTF(loader, contents, fileName, resolve, reject);
                } else if (extension === 'fbx') {
                    this.loadFBX(loader, contents, fileName, resolve, reject);
                } else if (extension === 'stl') {
                    this.loadSTL(loader, contents, fileName, resolve, reject);
                } else if (extension === 'obj') {
                    this.loadOBJ(loader, contents, fileName, resolve, reject);
                }
            } catch (error) {
                console.error('Error loading model:', error);
                this.uiController.showError(
                    'Unexpected error loading model: ' + error.message + '. Please check the console for details.'
                );
                reject(error);
            }
        });
    }

    loadGLTF(loader, contents, fileName, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing GLTF/GLB...');

        loader.parse(contents, '', (gltf) => {
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Building scene...');

            // Fix materials (handles missing textures, transparency issues)
            this.fixMaterials(gltf.scene);

            this.threeSetup.addModel(gltf.scene, fileName);

            if (gltf.animations && gltf.animations.length > 0) {
                this.uiController.updateProgress(CONFIG.PROGRESS.LOAD_ANIMATIONS, 'Loading animations...');
                this.animations = gltf.animations;
            }

            this.uiController.updateProgress(CONFIG.PROGRESS.CENTER_MODEL, 'Centering model...');
            this.threeSetup.centerAndScaleModel();
            this.uiController.updateProgress(CONFIG.PROGRESS.COMPLETE, 'Complete!');

            resolve({ animations: this.animations });
        }, undefined, (error) => {
            console.error('GLTF loading error:', error);
            this.uiController.showError('Failed to load GLTF/GLB model: ' + error.message);
            reject(error);
        });
    }

    loadFBX(loader, contents, fileName, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing FBX...');

        // Intercept texture loading to prevent 404 errors for missing external files
        const originalLoad = THREE.TextureLoader.prototype.load;
        let interceptActive = true;

        THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
            if (interceptActive) {
                // Check if this is an external file path (not blob/data URL)
                if (!url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith('http')) {
                    // External file reference - will likely 404
                    console.warn(`⚠️ Skipping external texture reference: ${url} (not embedded in FBX)`);

                    // Return empty texture instead of attempting to load
                    const emptyTexture = new THREE.Texture();
                    emptyTexture.image = new Image(); // Empty image
                    if (onLoad) onLoad(emptyTexture);
                    return emptyTexture;
                }
            }

            // Call original load for valid URLs
            return originalLoad.call(this, url, onLoad, onProgress, onError);
        };

        try {
            const model = loader.parse(contents, '');

            // Disable interceptor after parsing
            interceptActive = false;
            THREE.TextureLoader.prototype.load = originalLoad;

            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Building scene...');

            // Fix materials (handles missing textures, transparency issues)
            this.fixMaterials(model);

            this.threeSetup.addModel(model, fileName);

            if (model.animations && model.animations.length > 0) {
                this.uiController.updateProgress(CONFIG.PROGRESS.LOAD_ANIMATIONS, 'Loading animations...');
                this.animations = model.animations;
            }

            this.uiController.updateProgress(CONFIG.PROGRESS.CENTER_MODEL, 'Centering model...');
            this.threeSetup.centerAndScaleModel();
            this.uiController.updateProgress(CONFIG.PROGRESS.COMPLETE, 'Complete!');

            resolve({ animations: this.animations });
        } catch (fbxError) {
            // Restore original loader on error
            interceptActive = false;
            THREE.TextureLoader.prototype.load = originalLoad;

            console.error('FBX parsing error:', fbxError);
            this.uiController.showError('Failed to parse FBX model: ' + fbxError.message);
            reject(fbxError);
        }
    }

    loadSTL(loader, contents, fileName, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing STL...');

        try {
            const geometry = loader.parse(contents);
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Creating mesh...');

            const material = new THREE.MeshPhongMaterial({
                color: 0x888888,
                flatShading: false
            });
            const mesh = new THREE.Mesh(geometry, material);

            this.threeSetup.addModel(mesh, fileName);

            this.uiController.updateProgress(CONFIG.PROGRESS.CENTER_MODEL, 'Centering model...');
            this.threeSetup.centerAndScaleModel();
            this.uiController.updateProgress(CONFIG.PROGRESS.COMPLETE, 'Complete!');

            resolve({ animations: [] });
        } catch (stlError) {
            console.error('STL parsing error:', stlError);
            this.uiController.showError('Failed to parse STL model: ' + stlError.message);
            reject(stlError);
        }
    }

    loadOBJ(loader, contents, fileName, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing OBJ...');

        try {
            const model = loader.parse(contents);
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Building scene...');

            // Fix materials (handles missing textures, transparency issues)
            this.fixMaterials(model);

            this.threeSetup.addModel(model, fileName);

            this.uiController.updateProgress(CONFIG.PROGRESS.CENTER_MODEL, 'Centering model...');
            this.threeSetup.centerAndScaleModel();
            this.uiController.updateProgress(CONFIG.PROGRESS.COMPLETE, 'Complete!');

            resolve({ animations: [] });
        } catch (objError) {
            console.error('OBJ parsing error:', objError);
            this.uiController.showError('Failed to parse OBJ model: ' + objError.message);
            reject(objError);
        }
    }

    getAnimations() {
        return this.animations;
    }

    /**
     * Fix materials that may have transparency issues or missing textures
     * Ensures models are always visible with proper rendering
     */
    fixMaterials(model) {
        let meshCount = 0;
        let materialCount = 0;
        let fixedCount = 0;

        model.traverse((child) => {
            if (child.isMesh) {
                meshCount++;

                // Handle both single material and material arrays
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach((material) => {
                    if (!material) return;

                    materialCount++;
                    let wasFixed = false;

                    // Clear empty/broken texture references created by our interceptor
                    // These have no image data and will render as transparent
                    const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap',
                                         'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap',
                                         'alphaMap', 'lightMap', 'specularMap'];

                    let clearedCount = 0;
                    textureProps.forEach(prop => {
                        const texture = material[prop];
                        // Clear textures that have no valid image data
                        if (texture && texture.image && !texture.image.src) {
                            material[prop] = null;
                            clearedCount++;
                        }
                    });

                    if (clearedCount > 0) {
                        console.log(`🧹 Cleared ${clearedCount} empty texture(s) from: ${material.name || 'unnamed'}`);
                        wasFixed = true;
                    }

                    // Force opaque rendering
                    if (material.transparent || material.opacity < 1) {
                        material.transparent = false;
                        material.opacity = 1.0;
                        material.alphaTest = 0;
                        wasFixed = true;
                    }

                    // Enable double-sided rendering
                    if (material.side !== THREE.DoubleSide) {
                        material.side = THREE.DoubleSide;
                        wasFixed = true;
                    }

                    // Ensure visible color exists
                    if (!material.color) {
                        material.color = new THREE.Color(0xcccccc);
                        wasFixed = true;
                    } else if (material.color.getHex() === 0x000000) {
                        material.color.setHex(0xcccccc);
                        wasFixed = true;
                    }

                    if (wasFixed) {
                        material.needsUpdate = true;
                        fixedCount++;
                    }
                });
            }
        });

        if (fixedCount > 0) {
            console.log(`✅ Material fix complete: ${fixedCount}/${materialCount} materials fixed across ${meshCount} meshes`);
        } else {
            console.log(`✓ Materials OK: ${materialCount} materials checked across ${meshCount} meshes`);
        }
    }
}
