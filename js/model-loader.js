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
                    this.loadGLTF(loader, contents, resolve, reject);
                } else if (extension === 'fbx') {
                    this.loadFBX(loader, contents, resolve, reject);
                } else if (extension === 'stl') {
                    this.loadSTL(loader, contents, resolve, reject);
                } else if (extension === 'obj') {
                    this.loadOBJ(loader, contents, resolve, reject);
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

    loadGLTF(loader, contents, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing GLTF/GLB...');

        loader.parse(contents, '', (gltf) => {
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Building scene...');

            this.threeSetup.addModel(gltf.scene);

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

    loadFBX(loader, contents, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing FBX...');

        try {
            const model = loader.parse(contents, '');
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Building scene...');

            this.threeSetup.addModel(model);

            if (model.animations && model.animations.length > 0) {
                this.uiController.updateProgress(CONFIG.PROGRESS.LOAD_ANIMATIONS, 'Loading animations...');
                this.animations = model.animations;
            }

            this.uiController.updateProgress(CONFIG.PROGRESS.CENTER_MODEL, 'Centering model...');
            this.threeSetup.centerAndScaleModel();
            this.uiController.updateProgress(CONFIG.PROGRESS.COMPLETE, 'Complete!');

            resolve({ animations: this.animations });
        } catch (fbxError) {
            console.error('FBX parsing error:', fbxError);
            this.uiController.showError('Failed to parse FBX model: ' + fbxError.message);
            reject(fbxError);
        }
    }

    loadSTL(loader, contents, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing STL...');

        try {
            const geometry = loader.parse(contents);
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Creating mesh...');

            const material = new THREE.MeshPhongMaterial({
                color: 0x888888,
                flatShading: false
            });
            const mesh = new THREE.Mesh(geometry, material);

            this.threeSetup.addModel(mesh);

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

    loadOBJ(loader, contents, resolve, reject) {
        this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_FORMAT, 'Parsing OBJ...');

        try {
            const model = loader.parse(contents);
            this.uiController.updateProgress(CONFIG.PROGRESS.BUILD_SCENE, 'Building scene...');

            this.threeSetup.addModel(model);

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
}
