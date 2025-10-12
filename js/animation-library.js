// AnimationLibrary - Manages external animation files (Mixamo, custom uploads, etc.)
class AnimationLibrary {
    constructor() {
        this.animations = [];
        this.animationsByName = new Map();
        this.loadingManager = new THREE.LoadingManager();
    }

    /**
     * Add animation to library
     * @param {string} name - Animation name
     * @param {THREE.AnimationClip} clip - Animation clip
     * @param {string} source - Source (library, uploaded, etc.)
     */
    addAnimation(name, clip, source = 'library') {
        const animation = {
            name: name,
            clip: clip,
            duration: clip.duration,
            source: source
        };

        this.animations.push(animation);
        this.animationsByName.set(name, animation);
    }

    /**
     * Load animations from /animations folder
     * Expects files like: walk.fbx, run.fbx, etc.
     */
    async preloadLibraryAnimations() {
        const libraryAnimations = [
            'walk.fbx',
            'run.fbx',
            'idle.fbx',
            'jump.fbx',
            'attack.fbx',
            'dance.fbx'
        ];

        const loadPromises = libraryAnimations.map(fileName =>
            this.loadAnimationFile(`animations/${fileName}`, fileName.replace('.fbx', ''))
                .catch(error => {
                    console.log(`Animation ${fileName} not found (optional)`);
                    return null;
                })
        );

        const results = await Promise.all(loadPromises);
        const loaded = results.filter(r => r !== null).length;

        if (loaded > 0) {
            console.log(`Loaded ${loaded} animations from library`);
        }

        return loaded;
    }

    /**
     * Load animation from file
     * @param {string} filePath - Path to animation file
     * @param {string} name - Animation name
     */
    async loadAnimationFile(filePath, name) {
        const extension = filePath.split('.').pop().toLowerCase();

        if (extension === 'fbx') {
            return this.loadFBXAnimation(filePath, name);
        } else if (extension === 'glb' || extension === 'gltf') {
            return this.loadGLTFAnimation(filePath, name);
        }

        throw new Error(`Unsupported animation format: ${extension}`);
    }

    /**
     * Load FBX animation
     */
    loadFBXAnimation(filePath, name) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.FBXLoader(this.loadingManager);

            loader.load(
                filePath,
                (fbx) => {
                    if (fbx.animations && fbx.animations.length > 0) {
                        const clip = fbx.animations[0];
                        clip.name = name;
                        this.addAnimation(name, clip, 'library');
                        resolve(clip);
                    } else {
                        reject(new Error(`No animations found in ${filePath}`));
                    }
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Load GLTF animation
     */
    loadGLTFAnimation(filePath, name) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader(this.loadingManager);

            loader.load(
                filePath,
                (gltf) => {
                    if (gltf.animations && gltf.animations.length > 0) {
                        const clip = gltf.animations[0];
                        clip.name = name;
                        this.addAnimation(name, clip, 'library');
                        resolve(clip);
                    } else {
                        reject(new Error(`No animations found in ${filePath}`));
                    }
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Load animation from uploaded file
     * @param {File} file - Uploaded file
     */
    async loadAnimationFromFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        const name = file.name.replace(`.${extension}`, '');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                const arrayBuffer = event.target.result;

                try {
                    if (extension === 'fbx') {
                        await this.parseFBXAnimation(arrayBuffer, name);
                    } else if (extension === 'glb' || extension === 'gltf') {
                        await this.parseGLTFAnimation(arrayBuffer, name);
                    } else {
                        reject(new Error(`Unsupported format: ${extension}`));
                        return;
                    }
                    resolve(name);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parse FBX animation from ArrayBuffer
     */
    async parseFBXAnimation(arrayBuffer, name) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.FBXLoader(this.loadingManager);

            try {
                const fbx = loader.parse(arrayBuffer, '');

                if (fbx.animations && fbx.animations.length > 0) {
                    const clip = fbx.animations[0];
                    clip.name = name;
                    this.addAnimation(name, clip, 'uploaded');
                    resolve(clip);
                } else {
                    reject(new Error('No animations found in file'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Parse GLTF animation from ArrayBuffer
     */
    async parseGLTFAnimation(arrayBuffer, name) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader(this.loadingManager);

            loader.parse(
                arrayBuffer,
                '',
                (gltf) => {
                    if (gltf.animations && gltf.animations.length > 0) {
                        const clip = gltf.animations[0];
                        clip.name = name;
                        this.addAnimation(name, clip, 'uploaded');
                        resolve(clip);
                    } else {
                        reject(new Error('No animations found in file'));
                    }
                },
                (error) => reject(error)
            );
        });
    }

    /**
     * Get all animations
     */
    getAnimations() {
        return this.animations;
    }

    /**
     * Get animation by name
     */
    getAnimation(name) {
        return this.animationsByName.get(name);
    }

    /**
     * Check if animation exists
     */
    hasAnimation(name) {
        return this.animationsByName.has(name);
    }

    /**
     * Clear all animations
     */
    clear() {
        this.animations = [];
        this.animationsByName.clear();
    }

    /**
     * Get count of animations by source
     */
    getSourceCounts() {
        const counts = { library: 0, uploaded: 0 };
        this.animations.forEach(anim => {
            if (counts[anim.source] !== undefined) {
                counts[anim.source]++;
            }
        });
        return counts;
    }
}
