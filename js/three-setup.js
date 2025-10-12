// Three.js Scene Setup and Management
class ThreeSetup {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();
        this.loadedModel = null;
        this.gridHelper = null;
        this.cameraLight = null; // Camera-attached light for better model visibility
        this.autoRotate = false; // Disable auto-rotation by default when controls are active

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

        // Get actual viewport dimensions using getBoundingClientRect for accuracy
        const rect = viewport.getBoundingClientRect();
        const width = rect.width || viewport.clientWidth || viewport.offsetWidth;
        const height = rect.height || viewport.clientHeight || viewport.offsetHeight;

        console.log('Viewport dimensions:', width, height);
        console.log('Viewport rect:', rect);

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.SCENE.BACKGROUND_COLOR);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.FOV,
            width / height,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );
        this.camera.position.set(
            CONFIG.CAMERA.DEFAULT_DISTANCE,
            CONFIG.CAMERA.DEFAULT_HEIGHT,
            CONFIG.CAMERA.DEFAULT_DISTANCE
        );
        this.camera.lookAt(0, 0, 0);

        // Add camera light that follows the camera viewpoint
        this.cameraLight = new THREE.PointLight(0xffffff, 1.0, 100);
        this.cameraLight.position.set(0, 0, 0); // Positioned at camera origin
        this.camera.add(this.cameraLight);
        this.scene.add(this.camera); // Add camera to scene so the light gets added too

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: true // Enable transparency for sprite rendering
        });

        // Force canvas style to match
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        this.renderer.setSize(width, height, true);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setViewport(0, 0, width, height);
        this.renderer.setClearColor(CONFIG.SCENE.BACKGROUND_COLOR, 1); // Opaque by default

        console.log('Canvas actual size:', canvas.width, canvas.height);
        console.log('Canvas style:', canvas.style.width, canvas.style.height);

        // Setup lighting
        this.setupLighting();

        // Add grid
        this.gridHelper = new THREE.GridHelper(
            CONFIG.SCENE.GRID_SIZE,
            CONFIG.SCENE.GRID_DIVISIONS
        );
        this.scene.add(this.gridHelper);

        // Setup OrbitControls for mouse interaction
        this.controls = new THREE.OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls
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
        const rect = viewport.getBoundingClientRect();
        const width = rect.width || viewport.clientWidth || viewport.offsetWidth;
        const height = rect.height || viewport.clientHeight || viewport.offsetHeight;

        console.log('Resize - Viewport dimensions:', width, height);
        console.log('Resize - Viewport rect:', rect);

        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, true);
            this.renderer.setViewport(0, 0, width, height);
        }
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
        if (this.loadedModel && this.autoRotate) {
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

    // Get current camera position relative to target
    getCurrentCameraDistance() {
        if (this.controls) {
            // Calculate distance from camera to controls target
            return this.camera.position.distanceTo(this.controls.target);
        }
        // Fallback: distance from camera to origin
        return this.camera.position.length();
    }

    getCurrentCameraHeight() {
        return this.camera.position.y;
    }

    captureFrame() {
        return this.renderer.domElement.toDataURL('image/png');
    }

    // Grid visibility control
    showGrid() {
        if (this.gridHelper) {
            this.gridHelper.visible = true;
        }
    }

    hideGrid() {
        if (this.gridHelper) {
            this.gridHelper.visible = false;
        }
    }

    // Background control
    setTransparentBackground() {
        this.scene.background = null;
        this.renderer.setClearColor(0x000000, 0); // transparent
    }

    setOpaqueBackground() {
        this.scene.background = new THREE.Color(CONFIG.SCENE.BACKGROUND_COLOR);
        this.renderer.setClearColor(CONFIG.SCENE.BACKGROUND_COLOR, 1);
    }

    // Update controls
    updateControls() {
        if (this.controls) {
            this.controls.update();
        }
    }

    // Camera light control
    setCameraLightIntensity(intensity) {
        if (this.cameraLight) {
            this.cameraLight.intensity = intensity;
        }
    }

    // Disable auto rotation when using controls
    disableAutoRotation() {
        this.autoRotate = false;
    }

    enableAutoRotation() {
        this.autoRotate = true;
    }
}
