# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based 3D model to 8-directional sprite generator. It loads various 3D model formats (GLB, GLTF, FBX, STL, OBJ), renders them from 8 cardinal directions, and exports the sprites as a ZIP archive. The application is built with vanilla JavaScript and Three.js, with no build system required.

## Running the Application

This is a static web application - simply open `index.html` in a web browser. For local development, use a local web server to avoid CORS issues:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000
```

Then navigate to `http://localhost:8000` in your browser.

## Architecture

The application follows a clean architecture pattern with clear separation of concerns:

### Dependency Chain
```
app.js (orchestrator)
  ↓
├── ui-controller.js (presentation layer)
├── three-setup.js (3D scene management)
├── model-loader.js (model parsing)
├── animation-controller.js (animation state)
├── sprite-generator.js (rendering logic)
└── file-handler.js (I/O operations)
  ↓
config.js (constants)
```

### Module Responsibilities

**config.js** - Single source of truth for all constants
- Camera settings (FOV, distances, heights)
- Sprite configuration (sizes, directions)
- Progress tracking milestones
- Lighting and scene parameters
- Modify this file when adjusting default values or adding new directions

**ui-controller.js** - DOM manipulation layer
- All `getElementById` calls are isolated here
- Manages loading states, progress bars, error messages
- Provides methods like `showLoading()`, `updateProgress()`, `displaySprites()`
- Event listener registration (file selection, button clicks, range sliders)
- When adding new UI elements, add getters/setters here

**three-setup.js** - Three.js scene initialization
- Creates and manages scene, camera, renderer
- Handles lighting setup (ambient + directional)
- Model addition/removal from scene
- Window resize handling
- Camera positioning and rendering
- The `loadingManager` is created here and patches `ImageLoader` to handle blob URLs

**model-loader.js** - 3D model loading business logic
- Format-specific loading (GLTF, FBX, STL, OBJ)
- Each format has dedicated method: `loadGLTF()`, `loadFBX()`, `loadSTL()`, `loadOBJ()`
- Returns Promise with animations array
- Progress updates during parsing
- Error handling per format

**animation-controller.js** - Animation state management
- Creates `THREE.AnimationMixer` when animations present
- Manages current animation action
- Updates mixer in animation loop
- Provides `update(delta)` method called from main loop

**sprite-generator.js** - Sprite rendering engine
- Iterates through 8 directions from `CONFIG.DIRECTIONS`
- Temporarily resizes renderer to sprite size
- Positions camera using polar coordinates (angle → x,z position)
- Captures frame as data URL
- Restores original renderer size
- Returns array of sprite objects with `{name, data}`

**file-handler.js** - File I/O operations
- Reads uploaded files as ArrayBuffer with progress tracking
- Creates ZIP archives using JSZip
- Generates sequential sprite filenames: `0_south.png`, `1_south_east.png`, etc.
- Triggers browser download

**app.js** - Application orchestrator
- Instantiates all modules in correct order
- Wires event handlers to business logic
- Runs main animation loop calling `requestAnimationFrame`
- Updates animations and rotates model each frame
- Entry point executes on `DOMContentLoaded`

## Key Implementation Details

### Script Loading Order
The `index.html` loads scripts in a specific order that must be maintained:
1. Third-party libraries (Three.js, loaders, JSZip)
2. `config.js` (must load first - used by all modules)
3. Core modules (ui-controller, three-setup)
4. Feature modules (model-loader, animation-controller, sprite-generator, file-handler)
5. `app.js` (must load last - depends on all modules)

### Model Loading Flow
1. User selects file → `file-handler.js` reads as ArrayBuffer
2. ArrayBuffer + extension passed to `model-loader.js`
3. Model-loader determines format and uses appropriate Three.js loader
4. Parsed model added to scene via `three-setup.js`
5. Model is centered and scaled to fit 2-unit space
6. Animations (if present) passed to `animation-controller.js`

### Sprite Generation Flow
1. User clicks Generate → `sprite-generator.js` activated
2. Renderer temporarily resized to `spriteSize × spriteSize`
3. For each of 8 directions:
   - Camera positioned at `(sin(angle) * distance, height, cos(angle) * distance)`
   - Camera looks at origin (0, 0, 0)
   - Scene rendered
   - Frame captured as PNG data URL
4. Renderer restored to original size
5. Sprites displayed in preview grid

### Animation Loop Pattern
```javascript
animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.threeSetup.getDelta();
    this.animationController.update(delta);  // Update animations
    this.threeSetup.rotateModel();            // Auto-rotate model
    this.threeSetup.render();                 // Render frame
}
```

## Extending the Application

### Adding New Model Formats
1. Add format extension to `CONFIG.MODEL.SUPPORTED_FORMATS` in `config.js`
2. Update file input accept attribute in `index.html`
3. Add loader case in `model-loader.js` → `getLoader()`
4. Implement format-specific loading method (e.g., `loadDAE()`)

### Adding More Directions
1. Modify `CONFIG.DIRECTIONS` array in `config.js`
2. Add direction objects with `{name, angle}` (angles in radians)
3. Update sprite preview grid CSS if needed (currently 4-column grid)
4. ZIP filename generation will automatically adapt

### Changing Camera Behavior
- Modify `CONFIG.CAMERA` values in `config.js` for defaults
- Update range input attributes in `index.html` for UI limits
- Camera positioning uses polar coordinates: angle determines rotation around model

### Customizing Progress Tracking
- All progress milestones defined in `CONFIG.PROGRESS`
- Update these values to adjust progress bar behavior
- Each loading stage has designated percentage range

## Browser Compatibility Notes

- Requires ES6+ support (classes, arrow functions, async/await, Promises)
- Uses `preserveDrawingBuffer: true` on WebGL renderer for sprite capture
- Patches `THREE.ImageLoader` to handle blob URLs without CORS issues
- Error handlers suppress non-critical texture loading warnings

## State Management

The application maintains state across several modules:
- **threeSetup** - holds scene, camera, renderer, loaded model reference
- **animationController** - holds mixer, current animation action, animations array
- **spriteGenerator** - holds generated sprites array
- **modelLoader** - holds animations extracted during load

State flow is unidirectional: user action → app.js → modules → ui-controller updates.
