let scene, camera, renderer, controls;
let loadedModel = null;
let mixer = null;
let animations = [];
let clock = new THREE.Clock();
let currentAnimationAction = null;
let generatedSprites = [];

// Create a custom loading manager to handle texture loading properly
const loadingManager = new THREE.LoadingManager();

// Override image loader to not use crossOrigin for blob URLs
loadingManager.onStart = function(url, itemsLoaded, itemsTotal) {
    console.log('Loading:', url);
};

loadingManager.onError = function(url) {
    console.warn('Loading error (non-critical):', url);
    // Don't throw errors for missing textures - model will still load
};

// Patch the ImageLoader to handle blob URLs correctly
const originalImageLoad = THREE.ImageLoader.prototype.load;
THREE.ImageLoader.prototype.load = function(url, onLoad, onProgress, onError) {
    // Remove crossOrigin for blob URLs and data URLs
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
        // Use original method for external URLs
        return originalImageLoad.call(this, url, onLoad, onProgress, onError);
    }
};

// Initialize Three.js scene
function initScene() {
    const canvas = document.getElementById('canvas3d');
    const viewport = canvas.parentElement;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c3e50);

    camera = new THREE.PerspectiveCamera(
        45,
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 1.5, 5);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    animate();
}

function onWindowResize() {
    const viewport = document.getElementById('canvas3d').parentElement;
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }

    if (loadedModel) {
        loadedModel.rotation.y += 0.005;
    }

    renderer.render(scene, camera);
}

// Load 3D model
document.getElementById('modelFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = file.name;
    showLoading('Reading file...', 0);

    const extension = file.name.split('.').pop().toLowerCase();

    const reader = new FileReader();

    // Track reading progress
    reader.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 50; // 0-50% for reading
            updateProgress(percentComplete, 'Reading file...');
        }
    };

    reader.onload = function(event) {
        updateProgress(50, 'Parsing model...');
        const contents = event.target.result;

        // Small delay to show the progress update
        setTimeout(() => {
            loadModelByType(contents, extension, file.name);
        }, 100);
    };

    reader.onerror = function() {
        showError('Failed to read file. Please try again.');
    };

    // Always read as ArrayBuffer for all formats
    reader.readAsArrayBuffer(file);
});

function showLoading(status, progress) {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
    updateProgress(progress, status);
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function updateProgress(percent, status) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const loadingStatus = document.getElementById('loadingStatus');

    progressBar.style.width = percent + '%';
    progressText.textContent = Math.round(percent) + '%';
    if (status) {
        loadingStatus.textContent = status;
    }
}

function showError(message) {
    hideLoading();
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
}

function loadModelByType(contents, extension, fileName) {
    // Clear previous model
    if (loadedModel) {
        scene.remove(loadedModel);
        loadedModel = null;
    }
    if (mixer) {
        mixer = null;
    }
    animations = [];

    const loader = getLoader(extension);

    if (!loader) {
        showError('Unsupported file format: ' + extension.toUpperCase() + '. Please use GLB, GLTF, FBX, STL, or OBJ files.');
        return;
    }

    updateProgress(60, 'Processing model...');

    try {
        if (extension === 'glb' || extension === 'gltf') {
            updateProgress(70, 'Parsing GLTF/GLB...');
            loader.parse(contents, '', function(gltf) {
                updateProgress(85, 'Building scene...');
                loadedModel = gltf.scene;
                scene.add(loadedModel);

                if (gltf.animations && gltf.animations.length > 0) {
                    updateProgress(90, 'Loading animations...');
                    animations = gltf.animations;
                    mixer = new THREE.AnimationMixer(loadedModel);
                    populateAnimationList();
                }

                updateProgress(95, 'Centering model...');
                centerAndScaleModel();
                updateProgress(100, 'Complete!');
                setTimeout(() => {
                    hideLoading();
                    document.getElementById('generateBtn').disabled = false;
                }, 500);
            }, undefined, function(error) {
                console.error('GLTF loading error:', error);
                showError('Failed to load GLTF/GLB model: ' + error.message);
            });
        } else if (extension === 'fbx') {
            updateProgress(70, 'Parsing FBX...');
            const fbxLoader = new THREE.FBXLoader();
            try {
                loadedModel = fbxLoader.parse(contents, '');
                updateProgress(85, 'Building scene...');
                scene.add(loadedModel);

                if (loadedModel.animations && loadedModel.animations.length > 0) {
                    updateProgress(90, 'Loading animations...');
                    animations = loadedModel.animations;
                    mixer = new THREE.AnimationMixer(loadedModel);
                    populateAnimationList();
                }

                updateProgress(95, 'Centering model...');
                centerAndScaleModel();
                updateProgress(100, 'Complete!');
                setTimeout(() => {
                    hideLoading();
                    document.getElementById('generateBtn').disabled = false;
                }, 500);
            } catch (fbxError) {
                console.error('FBX parsing error:', fbxError);
                showError('Failed to parse FBX model: ' + fbxError.message);
            }
        } else if (extension === 'stl') {
            updateProgress(70, 'Parsing STL...');
            try {
                const geometry = loader.parse(contents);
                updateProgress(85, 'Creating mesh...');
                const material = new THREE.MeshPhongMaterial({
                    color: 0x888888,
                    flatShading: false
                });
                loadedModel = new THREE.Mesh(geometry, material);
                scene.add(loadedModel);

                updateProgress(95, 'Centering model...');
                centerAndScaleModel();
                updateProgress(100, 'Complete!');
                setTimeout(() => {
                    hideLoading();
                    document.getElementById('generateBtn').disabled = false;
                }, 500);
            } catch (stlError) {
                console.error('STL parsing error:', stlError);
                showError('Failed to parse STL model: ' + stlError.message);
            }
        } else if (extension === 'obj') {
            updateProgress(70, 'Parsing OBJ...');
            try {
                const objLoader = new THREE.OBJLoader();
                loadedModel = objLoader.parse(contents);
                updateProgress(85, 'Building scene...');
                scene.add(loadedModel);

                updateProgress(95, 'Centering model...');
                centerAndScaleModel();
                updateProgress(100, 'Complete!');
                setTimeout(() => {
                    hideLoading();
                    document.getElementById('generateBtn').disabled = false;
                }, 500);
            } catch (objError) {
                console.error('OBJ parsing error:', objError);
                showError('Failed to parse OBJ model: ' + objError.message);
            }
        }
    } catch (error) {
        console.error('Error loading model:', error);
        showError('Unexpected error loading model: ' + error.message + '. Please check the console for details.');
    }
}

function getLoader(extension) {
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

// Configure THREE.js default texture loader to handle blob URLs properly
THREE.DefaultLoadingManager.onError = function(url) {
    console.warn('Error loading:', url);
    // Don't throw errors for texture loading issues, just log them
};

function centerAndScaleModel() {
    if (!loadedModel) return;

    const box = new THREE.Box3().setFromObject(loadedModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    loadedModel.scale.multiplyScalar(scale);

    const boxAfterScale = new THREE.Box3().setFromObject(loadedModel);
    const centerAfterScale = boxAfterScale.getCenter(new THREE.Vector3());
    loadedModel.position.sub(centerAfterScale);
}

function populateAnimationList() {
    const select = document.getElementById('animationSelect');
    select.innerHTML = '<option value="-1">No Animation</option>';

    animations.forEach((anim, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = anim.name || `Animation ${index + 1}`;
        select.appendChild(option);
    });

    select.disabled = false;
    document.getElementById('animationTime').disabled = false;
}

// Animation controls
document.getElementById('animationSelect').addEventListener('change', function(e) {
    const index = parseInt(e.target.value);

    if (currentAnimationAction) {
        currentAnimationAction.stop();
    }

    if (index >= 0 && animations[index]) {
        currentAnimationAction = mixer.clipAction(animations[index]);
        currentAnimationAction.play();
        currentAnimationAction.paused = true;

        const duration = animations[index].duration;
        document.getElementById('animationTime').max = duration;
        document.getElementById('animationTime').value = 0;
        document.getElementById('timeValue').textContent = '0.0s';
    }
});

document.getElementById('animationTime').addEventListener('input', function(e) {
    const time = parseFloat(e.target.value);
    document.getElementById('timeValue').textContent = time.toFixed(1) + 's';

    if (currentAnimationAction && mixer) {
        currentAnimationAction.time = time;
        mixer.update(0);
    }
});

// Camera controls
document.getElementById('cameraDistance').addEventListener('input', function(e) {
    const distance = parseFloat(e.target.value);
    document.getElementById('distanceValue').textContent = distance.toFixed(1);
});

document.getElementById('cameraHeight').addEventListener('input', function(e) {
    const height = parseFloat(e.target.value);
    document.getElementById('heightValue').textContent = height.toFixed(1);
});

// Generate sprites
document.getElementById('generateBtn').addEventListener('click', function() {
    if (!loadedModel) return;

    showLoading('Generating sprites...', 0);
    generatedSprites = [];
    const spriteSize = parseInt(document.getElementById('spriteSize').value);
    const distance = parseFloat(document.getElementById('cameraDistance').value);
    const height = parseFloat(document.getElementById('cameraHeight').value);

    const directions = [
        { name: 'South', angle: 0 },
        { name: 'South-East', angle: Math.PI / 4 },
        { name: 'East', angle: Math.PI / 2 },
        { name: 'North-East', angle: 3 * Math.PI / 4 },
        { name: 'North', angle: Math.PI },
        { name: 'North-West', angle: 5 * Math.PI / 4 },
        { name: 'West', angle: 3 * Math.PI / 2 },
        { name: 'South-West', angle: 7 * Math.PI / 4 }
    ];

    // Temporarily set canvas size for sprite rendering
    const originalWidth = renderer.domElement.width;
    const originalHeight = renderer.domElement.height;

    updateProgress(10, 'Preparing renderer...');
    renderer.setSize(spriteSize, spriteSize);

    // Generate sprites one at a time to show progress
    let currentIndex = 0;

    function generateNextSprite() {
        if (currentIndex >= directions.length) {
            // All sprites generated
            updateProgress(95, 'Restoring view...');
            renderer.setSize(originalWidth, originalHeight);
            onWindowResize();

            updateProgress(100, 'Complete!');

            // Display sprites
            displaySprites();
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('successMessage').style.display = 'block';
            setTimeout(() => {
                document.getElementById('successMessage').style.display = 'none';
                hideLoading();
            }, 2000);
            return;
        }

        const dir = directions[currentIndex];
        const progress = 10 + (currentIndex / directions.length) * 80;
        updateProgress(progress, `Rendering ${dir.name}... (${currentIndex + 1}/${directions.length})`);

        // Position camera
        const x = Math.sin(dir.angle) * distance;
        const z = Math.cos(dir.angle) * distance;
        camera.position.set(x, height, z);
        camera.lookAt(0, 0, 0);

        // Render
        renderer.render(scene, camera);

        // Capture sprite
        const dataURL = renderer.domElement.toDataURL('image/png');
        generatedSprites.push({
            name: dir.name,
            data: dataURL
        });

        currentIndex++;

        // Small delay to allow UI to update
        setTimeout(generateNextSprite, 50);
    }

    // Start generation
    setTimeout(generateNextSprite, 100);
});

function displaySprites() {
    const preview = document.getElementById('spritePreview');
    preview.innerHTML = '';
    preview.style.display = 'grid';

    generatedSprites.forEach(sprite => {
        const item = document.createElement('div');
        item.className = 'sprite-item';
        item.innerHTML = `
            <img src="${sprite.data}" alt="${sprite.name}">
            <p>${sprite.name}</p>
        `;
        preview.appendChild(item);
    });
}

// Download ZIP
document.getElementById('downloadBtn').addEventListener('click', async function() {
    if (generatedSprites.length === 0) return;

    showLoading('Creating ZIP archive...', 0);

    try {
        const zip = new JSZip();
        const folder = zip.folder('sprites');

        updateProgress(20, 'Adding sprites to archive...');

        generatedSprites.forEach((sprite, index) => {
            const base64Data = sprite.data.split(',')[1];
            const fileName = `${index}_${sprite.name.toLowerCase().replace(/\s+/g, '_')}.png`;
            folder.file(fileName, base64Data, { base64: true });

            const progress = 20 + ((index + 1) / generatedSprites.length) * 40;
            updateProgress(progress, `Adding ${sprite.name}... (${index + 1}/${generatedSprites.length})`);
        });

        updateProgress(70, 'Compressing archive...');
        const content = await zip.generateAsync({
            type: 'blob',
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        }, function(metadata) {
            const progress = 70 + (metadata.percent * 0.25);
            updateProgress(progress, `Compressing... ${Math.round(metadata.percent)}%`);
        });

        updateProgress(95, 'Preparing download...');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'sprites_8_directional.zip';
        link.click();

        updateProgress(100, 'Download started!');
        setTimeout(() => {
            hideLoading();
        }, 1000);
    } catch (error) {
        console.error('Error creating ZIP:', error);
        showError('Failed to create ZIP archive: ' + error.message);
    }
});

// Initialize on load
initScene();

// Global error handler for uncaught texture loading errors
window.addEventListener('unhandledrejection', function(event) {
    // Check if it's a texture/image loading error
    if (event.reason && event.reason.toString().includes('image')) {
        console.warn('Texture loading warning (model will still work):', event.reason);
        event.preventDefault(); // Prevent the error from showing in console as uncaught
    }
});

// Catch errors in images
window.addEventListener('error', function(event) {
    if (event.target && event.target.tagName === 'IMG') {
        console.warn('Image loading warning (model will still work)');
        event.preventDefault();
    }
}, true);
