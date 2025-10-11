// Three.js Scene Setup and Management
class ThreeSetup {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.loadedModel = null;
        this.gridHelper = null;

        // Setup loading manager
        this.loadingManager = new THREE.LoadingManager();
        this.setupLoadingManager();
        this.patchImageLoader();
    }

    setupLoadingManager() {
        this.loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
            console.log('Loading:', url);
        };

        this.loadingManager.onError = function(url) {
            console.warn('Loading error (non-critical):', url);
        };

        // Configure default loading manager
        THREE.DefaultLoadingManager.onError = function(url) {
            console.warn('Error loading:', url);
        };
    }

    patchImageLoader() {
        // Patch the ImageLoader to handle blob URLs correctly
        const originalImageLoad = THREE.ImageLoader.prototype.load;
        THREE.ImageLoader.prototype.load = function(url, onLoad, onProgress, onError) {
            if (url.startsWith('blob:') || url.startsWith('data:')) {
                const img = document.createElement('img');

                img.onload = function() {
                    if (onLoad) onLoad(img);
                };

                img.onerror = function() {
                    console.warn('Image load error (non-critical):', url);
                    if (onError) onError(new Error('Image load error'));
                };

                img.src = url;
                return img;
            } else {
                return originalImageLoad.call(this, url, onLoad, onProgress, onError);
            }
        };
    }

    initScene(canvasId) {
        const canvas = document.getElementById(canvasId);
        const viewport = canvas.parentElement;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.SCENE.BACKGROUND_COLOR);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.FOV,
            viewport.clientWidth / viewport.clientHeight,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );
        this.camera.position.set(
            CONFIG.CAMERA.DEFAULT_DISTANCE,
            CONFIG.CAMERA.DEFAULT_HEIGHT,
            CONFIG.CAMERA.DEFAULT_DISTANCE
        );

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Setup lighting
        this.setupLighting();

        // Add grid
        this.gridHelper = new THREE.GridHelper(
            CONFIG.SCENE.GRID_SIZE,
            CONFIG.SCENE.GRID_DIVISIONS
        );
        this.scene.add(this.gridHelper);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer
        };
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(
            CONFIG.LIGHTING.AMBIENT_COLOR,
            CONFIG.LIGHTING.AMBIENT_INTENSITY
        );
        this.scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(
            CONFIG.LIGHTING.DIRECTIONAL_COLOR,
            CONFIG.LIGHTING.DIRECTIONAL_INTENSITY
        );
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Back light
        const backLight = new THREE.DirectionalLight(
            CONFIG.LIGHTING.DIRECTIONAL_COLOR,
            CONFIG.LIGHTING.BACK_LIGHT_INTENSITY
        );
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);
    }

    onWindowResize() {
        const viewport = document.getElementById('canvas3d').parentElement;
        this.camera.aspect = viewport.clientWidth / viewport.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    }

    addModel(model) {
        this.loadedModel = model;
        this.scene.add(model);
    }

    removeModel() {
        if (this.loadedModel) {
            this.scene.remove(this.loadedModel);
            this.loadedModel = null;
        }
    }

    getLoadedModel() {
        return this.loadedModel;
    }

    centerAndScaleModel() {
        if (!this.loadedModel) return;

        const box = new THREE.Box3().setFromObject(this.loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = CONFIG.MODEL.SCALE_TARGET / maxDim;
        this.loadedModel.scale.multiplyScalar(scale);

        const boxAfterScale = new THREE.Box3().setFromObject(this.loadedModel);
        const centerAfterScale = boxAfterScale.getCenter(new THREE.Vector3());
        this.loadedModel.position.sub(centerAfterScale);
    }

    rotateModel() {
        if (this.loadedModel) {
            this.loadedModel.rotation.y += CONFIG.MODEL.AUTO_ROTATION_SPEED;
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getDelta() {
        return this.clock.getDelta();
    }

    getLoadingManager() {
        return this.loadingManager;
    }

    // Sprite rendering helpers
    setRendererSize(width, height) {
        this.renderer.setSize(width, height);
    }

    getRendererSize() {
        return {
            width: this.renderer.domElement.width,
            height: this.renderer.domElement.height
        };
    }

    setCameraPosition(x, y, z) {
        this.camera.position.set(x, y, z);
    }

    setCameraLookAt(x, y, z) {
        this.camera.lookAt(x, y, z);
    }

    captureFrame() {
        return this.renderer.domElement.toDataURL('image/png');
    }
}
