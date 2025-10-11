// Configuration constants
const CONFIG = {
    CAMERA: {
        FOV: 45,
        NEAR: 0.1,
        FAR: 1000,
        DEFAULT_DISTANCE: 5,
        DEFAULT_HEIGHT: 1.5,
        MIN_DISTANCE: 1,
        MAX_DISTANCE: 20,
        MIN_HEIGHT: 0,
        MAX_HEIGHT: 5
    },

    SPRITE: {
        DEFAULT_SIZE: 256,
        MIN_SIZE: 64,
        MAX_SIZE: 2048,
        STEP_SIZE: 64
    },

    LIGHTING: {
        AMBIENT_COLOR: 0xffffff,
        AMBIENT_INTENSITY: 0.6,
        DIRECTIONAL_COLOR: 0xffffff,
        DIRECTIONAL_INTENSITY: 0.8,
        BACK_LIGHT_INTENSITY: 0.3
    },

    SCENE: {
        BACKGROUND_COLOR: 0x2c3e50,
        GRID_SIZE: 10,
        GRID_DIVISIONS: 10
    },

    MODEL: {
        AUTO_ROTATION_SPEED: 0.005,
        SCALE_TARGET: 2,
        SUPPORTED_FORMATS: ['glb', 'gltf', 'fbx', 'stl', 'obj']
    },

    DIRECTIONS: [
        { name: 'South', angle: 0 },
        { name: 'South-East', angle: Math.PI / 4 },
        { name: 'East', angle: Math.PI / 2 },
        { name: 'North-East', angle: 3 * Math.PI / 4 },
        { name: 'North', angle: Math.PI },
        { name: 'North-West', angle: 5 * Math.PI / 4 },
        { name: 'West', angle: 3 * Math.PI / 2 },
        { name: 'South-West', angle: 7 * Math.PI / 4 }
    ],

    PROGRESS: {
        READ_FILE_START: 0,
        READ_FILE_END: 50,
        PARSE_MODEL: 50,
        PROCESS_MODEL: 60,
        PARSE_FORMAT: 70,
        BUILD_SCENE: 85,
        LOAD_ANIMATIONS: 90,
        CENTER_MODEL: 95,
        COMPLETE: 100
    },

    ZIP: {
        FILE_NAME: 'sprites_8_directional.zip',
        COMPRESSION_LEVEL: 6,
        FOLDER_NAME: 'sprites'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
