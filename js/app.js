// Main Application Entry Point
class App {
    constructor() {
        // Initialize all controllers
        this.uiController = new UIController();
        this.threeSetup = new ThreeSetup();
        this.modelLoader = new ModelLoader(this.threeSetup, this.uiController);
        this.animationController = new AnimationController(this.threeSetup, this.uiController);
        this.spriteGenerator = new SpriteGenerator(this.threeSetup, this.uiController, this.animationController);
        this.fileHandler = new FileHandler(this.uiController);

        // Initialize the application
        this.init();
    }

    init() {
        // Initialize Three.js scene
        this.threeSetup.initScene('canvas3d');

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

            // Enable generate button after successful load
            setTimeout(() => {
                this.uiController.hideLoading();
                this.uiController.enableGenerateButton();
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

    async handleDownloadZip() {
        try {
            const sprites = this.spriteGenerator.getGeneratedSprites();
            await this.fileHandler.createZipArchive(sprites);
        } catch (error) {
            console.error('Error downloading ZIP:', error);
        }
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
    new App();
});
