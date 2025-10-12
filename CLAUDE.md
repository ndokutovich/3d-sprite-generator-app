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

The application follows a **clean architecture pattern** with clear separation of concerns, organized into distinct layers with unidirectional dependencies.

### File Structure
```
3d-sprite-generator-app/
├── index.html              # Main HTML structure
├── styles.css              # All application styles
└── js/
    ├── config.js           # ⚙️  Configuration Layer
    ├── ui-controller.js    # 🎨 Presentation Layer
    ├── three-setup.js      # 🎬 Infrastructure Layer (3D Engine)
    ├── model-loader.js     # 📦 Domain Layer (Business Logic)
    ├── animation-controller.js  # 📦 Domain Layer
    ├── sprite-generator.js # 📦 Domain Layer
    ├── file-handler.js     # 💾 Infrastructure Layer (I/O)
    └── app.js              # 🚀 Application Layer (Orchestrator)
```

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│                      app.js                                 │
│  • Orchestrates all modules                                 │
│  • Manages application lifecycle                            │
│  • Runs animation loop                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│                   ui-controller.js                          │
│  • DOM manipulation and event handling                      │
│  • User input collection                                    │
│  • Visual feedback (loading, progress, errors)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                            │
│  ┌──────────────────┐  ┌────────────────────┐             │
│  │  model-loader    │  │ animation-ctrl     │             │
│  │  • Load models   │  │ • Animation state  │             │
│  │  • Parse formats │  │ • Mixer management │             │
│  └──────────────────┘  └────────────────────┘             │
│                                                              │
│  ┌──────────────────────────────────────────┐             │
│  │       sprite-generator                   │             │
│  │       • Sprite rendering logic           │             │
│  │       • Camera positioning               │             │
│  │       • Frame capture                    │             │
│  └──────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                        │
│  ┌──────────────────┐        ┌──────────────────┐         │
│  │   three-setup    │        │   file-handler   │         │
│  │   • Scene mgmt   │        │   • File I/O     │         │
│  │   • Rendering    │        │   • ZIP creation │         │
│  │   • Camera/Light │        │   • Downloads    │         │
│  └──────────────────┘        └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   CONFIGURATION LAYER                       │
│                       config.js                             │
│  • Constants and default values                             │
│  • No dependencies on other modules                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow & Module Interactions

```
User Action (UI Event)
        ↓
   ui-controller ─────→ app.js (handles event)
                          ↓
                    ┌─────┴─────┐
                    ↓           ↓
            Domain Layer    Infrastructure Layer
            (Business)      (Technical)
                    ↓           ↓
                    └─────┬─────┘
                          ↓
                   ui-controller (updates display)
                          ↓
                    User sees result
```

### Dependency Rules

1. **Outer layers depend on inner layers, never the reverse**
   - `app.js` depends on all modules
   - Domain layer (model-loader, sprite-generator) depends on infrastructure
   - Infrastructure (three-setup, file-handler) depends on config
   - Config has no dependencies

2. **Cross-layer communication flows through app.js**
   - UI events → app.js → domain/infrastructure
   - Results → app.js → ui-controller → display

3. **No direct dependencies between domain modules**
   - model-loader, animation-controller, sprite-generator are independent
   - Coordinated only through app.js

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

### Interaction Patterns

**Loading a Model (Complete Flow)**
```
User selects file
    ↓
ui-controller.onFileSelect() → app.handleFileSelect()
    ↓
file-handler.readFile(file) → returns {contents, extension}
    ↓
model-loader.loadModel(contents, extension)
    ↓
three-setup.addModel(model) + three-setup.centerAndScaleModel()
    ↓
animation-controller.setAnimations(animations)
    ↓
ui-controller.enableGenerateButton() + ui-controller.hideLoading()
```

**Generating Sprites (Complete Flow)**
```
User clicks Generate
    ↓
ui-controller.onGenerateClick() → app.handleGenerateSprites()
    ↓
sprite-generator.generateSprites()
    ├─ gets settings from ui-controller
    ├─ sets renderer size via three-setup
    ├─ loops through CONFIG.DIRECTIONS
    │   ├─ positions camera via three-setup
    │   ├─ renders scene via three-setup
    │   └─ captures frame via three-setup
    ├─ restores renderer size
    └─ returns sprites array
    ↓
ui-controller.displaySprites(sprites) + ui-controller.enableDownloadButton()
```

**Animation Loop (Continuous)**
```
requestAnimationFrame
    ↓
app.animate()
    ├─ delta = three-setup.getDelta()
    ├─ animation-controller.update(delta)  // updates mixer
    ├─ three-setup.rotateModel()           // auto-rotation
    └─ three-setup.render()                // draws frame
    ↓
repeat
```

## Key Implementation Details

### Script Loading Order
The `index.html` loads scripts in a specific order that must be maintained:
1. Third-party libraries (Three.js, loaders, JSZip)
2. `config.js` (must load first - used by all modules)
3. Core modules (ui-controller, three-setup)
4. Feature modules (model-loader, animation-controller, sprite-generator, file-handler)
5. `app.js` (must load last - depends on all modules)

### Technical Notes

**Camera Positioning Math**
- Uses polar coordinates for 8-directional sprite capture
- Formula: `x = sin(angle) * distance`, `z = cos(angle) * distance`
- Camera always looks at origin (0, 0, 0) where model is centered

**Model Centering**
- Models are scaled to fit within 2-unit bounding box
- Center of bounding box translated to world origin
- Ensures consistent sprite sizes across different models

**Blob URL Handling**
- `THREE.ImageLoader` is patched to handle blob: and data: URLs without CORS
- Prevents texture loading errors when models embed textures
- Warnings for missing textures are suppressed (non-critical)

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
