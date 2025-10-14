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

        // Orientation gizmo (like Blender's ViewCube)
        this.gizmoScene = null;
        this.gizmoCamera = null;
        this.gizmoRenderer = null;
        this.gizmoAxes = null;

        // Setup loading manager
        this.loadingManager = new THREE.LoadingManager();
        this.setupLoadingManager();
        this.patchImageLoader();
    }

    setupLoadingManager() {
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
        this.cameraLight = new THREE.PointLight(0xffffff, 3.0, 100);
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
        // Note: setSize() automatically sets viewport to full canvas, no need to call setViewport()
        this.renderer.setClearColor(CONFIG.SCENE.BACKGROUND_COLOR, 1); // Opaque by default

        // Setup lighting
        this.setupLighting();

        // Add grid
        this.gridHelper = new THREE.GridHelper(
            CONFIG.SCENE.GRID_SIZE,
            CONFIG.SCENE.GRID_DIVISIONS
        );
        this.scene.add(this.gridHelper);

        // Add LARGE color-coded axes helper for orientation
        // Red = X+, Green = Y+, Blue = Z+
        this.axesHelper = new THREE.AxesHelper(3); // 3 units long
        this.axesHelper.position.set(0, 0, 0); // Center of scene
        this.scene.add(this.axesHelper);
        console.log('🎨 Added color-coded axes: RED=X, GREEN=Y, BLUE=Z');

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

        // Setup orientation gizmo (ViewCube)
        this.setupOrientationGizmo();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls
        };
    }

    setupOrientationGizmo() {
        // Create separate scene for gizmo
        this.gizmoScene = new THREE.Scene();

        // Create orthographic camera for gizmo (no perspective distortion)
        this.gizmoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
        this.gizmoCamera.position.set(0, 0, 5);

        // Create large axes with thick lines
        this.gizmoAxes = new THREE.AxesHelper(1.5);
        this.gizmoScene.add(this.gizmoAxes);

        // Add text labels for axes (X, Y, Z)
        const createAxisLabel = (text, color, position) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 128;
            canvas.height = 128;
            context.fillStyle = color;
            context.font = 'Bold 80px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 64, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(0.5, 0.5, 1);
            return sprite;
        };

        this.gizmoScene.add(createAxisLabel('X', '#ff0000', new THREE.Vector3(2, 0, 0)));
        this.gizmoScene.add(createAxisLabel('Y', '#00ff00', new THREE.Vector3(0, 2, 0)));
        this.gizmoScene.add(createAxisLabel('Z', '#0000ff', new THREE.Vector3(0, 0, 2)));

        // Create canvas for angle text overlay (will be updated each frame)
        this.gizmoAngleCanvas = document.createElement('canvas');
        this.gizmoAngleCanvas.width = 256;
        this.gizmoAngleCanvas.height = 128;
        this.gizmoAngleTexture = new THREE.CanvasTexture(this.gizmoAngleCanvas);

        const angleSpriteMaterial = new THREE.SpriteMaterial({
            map: this.gizmoAngleTexture,
            depthTest: false,
            transparent: true
        });
        this.gizmoAngleSprite = new THREE.Sprite(angleSpriteMaterial);
        this.gizmoAngleSprite.position.set(0, -1.8, 0);
        this.gizmoAngleSprite.scale.set(2, 1, 1);
        this.gizmoScene.add(this.gizmoAngleSprite);

        // Add ambient light so gizmo is always visible
        const gizmoLight = new THREE.AmbientLight(0xffffff, 2);
        this.gizmoScene.add(gizmoLight);

        console.log('🧭 Orientation gizmo created (top-right corner, always visible)');
    }

    updateGizmoAngleText() {
        if (!this.gizmoAngleCanvas) return;

        const ctx = this.gizmoAngleCanvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, this.gizmoAngleCanvas.width, this.gizmoAngleCanvas.height);

        // Calculate camera angles in degrees
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        const yaw = THREE.MathUtils.radToDeg(euler.y);     // Horizontal rotation (azimuth)
        const pitch = THREE.MathUtils.radToDeg(euler.x);   // Vertical rotation (elevation)
        const roll = THREE.MathUtils.radToDeg(euler.z);    // Roll rotation

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, this.gizmoAngleCanvas.width, this.gizmoAngleCanvas.height);

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'Bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = this.gizmoAngleCanvas.width / 2;
        ctx.fillText(`Yaw: ${yaw.toFixed(1)}°`, centerX, 30);
        ctx.fillText(`Pitch: ${pitch.toFixed(1)}°`, centerX, 60);
        ctx.fillText(`Roll: ${roll.toFixed(1)}°`, centerX, 90);

        // Update texture
        this.gizmoAngleTexture.needsUpdate = true;
    }

    renderGizmo() {
        if (!this.gizmoScene || !this.gizmoCamera) {
            return;
        }

        const canvas = this.renderer.domElement;
        const width = canvas.width;
        const height = canvas.height;

        // Gizmo size and position (top-right corner, like Blender)
        const gizmoSize = 120;
        const margin = 20;

        // Position gizmo camera to match main camera's viewing direction
        // but at a fixed distance from origin (so it doesn't move with pan/zoom)
        const gizmoDistance = 5;

        // Get the direction from main camera to its target
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        // Position gizmo camera in opposite direction (looking back at origin)
        this.gizmoCamera.position.copy(direction).multiplyScalar(-gizmoDistance);

        // Make gizmo camera look at the axes origin
        this.gizmoCamera.lookAt(0, 0, 0);

        // Update angle text display
        this.updateGizmoAngleText();

        // Save current viewport and scissor state
        const currentViewport = new THREE.Vector4();
        const currentScissor = new THREE.Vector4();
        this.renderer.getViewport(currentViewport);
        this.renderer.getScissor(currentScissor);
        const scissorTestEnabled = this.renderer.getScissorTest();

        // Calculate gizmo position (top-right corner)
        const gizmoX = width - gizmoSize - margin;
        const gizmoY = height - gizmoSize - margin;

        // Enable scissor test to isolate gizmo rendering
        this.renderer.setScissorTest(true);
        this.renderer.setScissor(gizmoX, gizmoY, gizmoSize, gizmoSize);
        this.renderer.setViewport(gizmoX, gizmoY, gizmoSize, gizmoSize);

        // Clear depth buffer so gizmo renders on top
        this.renderer.clearDepth();

        // Render gizmo scene
        this.renderer.render(this.gizmoScene, this.gizmoCamera);

        // Restore original viewport, scissor, and scissor test state
        this.renderer.setViewport(
            currentViewport.x,
            currentViewport.y,
            currentViewport.z,
            currentViewport.w
        );
        this.renderer.setScissor(
            currentScissor.x,
            currentScissor.y,
            currentScissor.z,
            currentScissor.w
        );
        this.renderer.setScissorTest(scissorTestEnabled);
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

        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, true);
            // Note: setSize() automatically sets viewport to full canvas
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

    getCamera() {
        return this.camera;
    }

    getOrbitControls() {
        return this.controls;
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
        // Render main scene
        this.renderer.render(this.scene, this.camera);

        // Render orientation gizmo (always visible in top-right)
        this.renderGizmo();
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

    // Get camera pitch angle (vertical angle from horizontal plane)
    getCurrentCameraPitch() {
        const target = this.controls ? this.controls.target : new THREE.Vector3(0, 0, 0);
        const dx = this.camera.position.x - target.x;
        const dy = this.camera.position.y - target.y;
        const dz = this.camera.position.z - target.z;

        // Calculate horizontal distance
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

        // Calculate pitch angle (angle from horizontal plane)
        return Math.atan2(dy, horizontalDistance);
    }

    // Get camera yaw angle (horizontal angle around model)
    // Returns angle in radians (0 = looking from +Z, clockwise from above)
    getCurrentCameraAngle() {
        const target = this.controls ? this.controls.target : new THREE.Vector3(0, 0, 0);
        const dx = this.camera.position.x - target.x;
        const dz = this.camera.position.z - target.z;

        // Calculate angle from +Z axis (same convention as sprite directions)
        // atan2 gives angle from +X axis, so we adjust
        return Math.atan2(dx, dz);
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

    // Camera control methods
    setCameraTarget(x, y, z) {
        if (this.controls) {
            this.controls.target.set(x, y, z);
            this.controls.update();
        }
    }

    setCameraPositionDirect(x, y, z) {
        this.camera.position.set(x, y, z);
        if (this.controls) {
            this.controls.update();
        }
    }

    setCameraFOV(fov) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    setCameraNear(near) {
        this.camera.near = near;
        this.camera.updateProjectionMatrix();
    }

    setCameraFar(far) {
        this.camera.far = far;
        this.camera.updateProjectionMatrix();
    }

    getCameraTarget() {
        return this.controls ? this.controls.target.clone() : new THREE.Vector3(0, 0, 0);
    }

    resetCameraToDefault() {
        // Reset position
        this.camera.position.set(
            CONFIG.CAMERA.DEFAULT_DISTANCE,
            CONFIG.CAMERA.DEFAULT_HEIGHT,
            CONFIG.CAMERA.DEFAULT_DISTANCE
        );

        // Reset target
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }

        // Reset camera properties
        this.camera.fov = CONFIG.CAMERA.FOV;
        this.camera.near = CONFIG.CAMERA.NEAR;
        this.camera.far = CONFIG.CAMERA.FAR;
        this.camera.updateProjectionMatrix();

        return {
            position: this.camera.position.clone(),
            target: this.controls.target.clone(),
            fov: this.camera.fov,
            near: this.camera.near,
            far: this.camera.far
        };
    }
}
