# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based 3D model to sprite generator with advanced animation and equipment attachment capabilities. It loads various 3D model formats (GLB, GLTF, FBX, STL, OBJ), allows attaching equipment (weapons, accessories) to character bones, renders animated sprites from 8 or 16 directions (or single direction for side-scrolling), and exports them as a ZIP archive. The application is built with vanilla JavaScript and Three.js, with no build system required.

**Key Features:**
- Multi-format 3D model loading (GLB, GLTF, FBX, STL, OBJ)
- Animation library system (preload Mixamo animations, upload custom)
- Equipment/weapon attachment to character bones with automatic scale compensation
- 8-directional or 16-directional sprite generation
- Single direction mode for side-scrolling games
- Position locking for walk animations (prevents character drift)
- Frame-by-frame animation sprite capture
- Sprite preview modal with zoom

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
├── index.html                    # Main HTML structure with favicon
├── styles.css                    # All application styles
├── animations/                   # Animation library folder
│   ├── README.md                 # Documentation for animation library
│   ├── walk.fbx                  # Optional Mixamo animations
│   ├── run.fbx
│   ├── idle.fbx
│   └── ...
└── js/
    ├── config.js                 # ⚙️  Configuration Layer
    ├── ui-controller.js          # 🎨 Presentation Layer
    ├── three-setup.js            # 🎬 Infrastructure Layer (3D Engine)
    ├── model-loader.js           # 📦 Domain Layer (Business Logic)
    ├── animation-controller.js   # 📦 Domain Layer (Animation State)
    ├── animation-library.js      # 📦 Domain Layer (Animation Management)
    ├── animation-frame-calculator.js # 🔧 Utility (Frame Timing)
    ├── sprite-generator.js       # 📦 Domain Layer (Sprite Rendering)
    ├── sprite.js                 # 📦 Domain Layer (Sprite Data Model)
    ├── equipment-manager.js      # 📦 Domain Layer (Equipment Attachment)
    ├── file-handler.js           # 💾 Infrastructure Layer (I/O)
    └── app.js                    # 🚀 Application Layer (Orchestrator)
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
│  └──────────────────┘  │ • Position locking │             │
│                         │ • Autoplay toggle  │             │
│  ┌──────────────────┐  └────────────────────┘             │
│  │ animation-lib    │                                       │
│  │ • Mixamo preload │  ┌────────────────────┐             │
│  │ • Custom upload  │  │ equipment-manager  │             │
│  └──────────────────┘  │ • Bone attachment  │             │
│                         │ • Scale compensation│             │
│  ┌──────────────────────────────────────────┐             │
│  │       sprite-generator                   │             │
│  │       • Sprite rendering logic           │             │
│  │       • Camera positioning               │             │
│  │       • Frame capture (8/16 directions)  │             │
│  │       • Single direction mode            │             │
│  └──────────────────────────────────────────┘             │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────┐           │
│  │   sprite.js  │  │ animation-frame-calculator│           │
│  │ (Data Model) │  │ (Utility - Frame Timing)  │           │
│  └──────────────┘  └──────────────────────────┘           │
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
   - model-loader, animation-controller, animation-library, sprite-generator, equipment-manager are independent
   - Coordinated only through app.js
   - Utilities (animation-frame-calculator, sprite.js) are pure functions/classes with no dependencies

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
- Manages current animation action and playback state
- Updates mixer in animation loop via `update(delta)` method
- **Position Locking** - Saves and restores ALL child object positions (bones) each frame to prevent root motion during walk animations (critical for sprite generation)
- **Autoplay Toggle** - Control animation playback, auto-enabled when animation selected
- **Animation Analysis** - `analyzeAnimation()` method recommends optimal frame counts based on keyframes
- Integrates with AnimationLibrary for external animation support
- Provides `setAnimationTime(time)` for frame-perfect sprite generation

**animation-library.js** - External animation management
- Manages animation library separate from model animations
- **Preloads Mixamo animations** from `/animations` folder (walk.fbx, run.fbx, idle.fbx, jump.fbx, attack.fbx, dance.fbx)
- **Custom animation upload** - Load animations from user files (FBX, GLB, GLTF)
- Unified animation dropdown combines model animations, library animations, and uploaded animations
- Tracks animation source (embedded, library, uploaded, procedural)
- Uses THREE.FBXLoader and THREE.GLTFLoader for format support

**sprite-generator.js** - Sprite rendering engine
- **Direction Modes**: 8 directions (`CONFIG.DIRECTIONS_8`), 16 directions (`CONFIG.DIRECTIONS_16`), or single direction (current camera view)
- **Single Direction Mode** - Captures from current camera angle for side-scrolling games
- **Frame-by-frame Animation** - Uses AnimationFrameCalculator to capture animation frames
- Temporarily resizes renderer to sprite size, positions camera using polar coordinates
- Captures frame as data URL, restores original renderer size
- Returns array of Sprite objects with proper naming (direction_frame format)
- Integrates with AnimationController's `setAnimationTime()` for frame-perfect capture

**sprite.js** - Sprite data model
- Encapsulates sprite data (name, imageData, direction, frameIndex, dimensions)
- Provides consistent file naming: `{frameIndex}_{directionName}.png`
- Separates data concerns from rendering logic

**animation-frame-calculator.js** - Frame timing utility
- **Frame Time Calculation** - Distributes frames evenly across animation duration
- **Progress Calculation** - Calculates progress percentage for sprite generation UI
- **Total Sprite Count** - Computes total sprites: `directionCount × frameCount`
- Pure utility class with no dependencies

**equipment-manager.js** - Equipment/weapon attachment system
- **Bone Finding** - Smart bone matching with scoring system, handles multiple naming conventions (Mixamo, generic)
- **Equipment Loading** - Loads 3D models (GLB, GLTF, FBX, OBJ) as equipment
- **Preview System** - Shows equipment floating next to character with green bounding box before attachment
- **Bone Attachment** - Attaches equipment as child of bone (hands, shoulders, hips)
- **CRITICAL: Scale Compensation** - Compensates for bone hierarchy scale (e.g., Mixamo bones at 0.01 scale) to prevent equipment from becoming microscopic: `equipment.scale = originalScale / boneWorldScale × userScale`
- **CRITICAL: Position Compensation** - Compensates position values for bone scale to make slider controls intuitive: `equipment.position = sliderValue / boneWorldScale`
- **Visual Debugging Helpers** - Adds axis arrows (RGB), pink sphere (equipment origin), green sphere (bone world position)
- **Real-time Adjustment** - Update scale, position, rotation via sliders with live preview
- Equipment persists during sprite generation and appears in all captured frames

**file-handler.js** - File I/O operations
- Reads uploaded files as ArrayBuffer with progress tracking
- Creates ZIP archives using JSZip
- Generates sequential sprite filenames: `0_south.png`, `1_south_east.png`, etc.
- Triggers browser download

**app.js** - Application orchestrator
- Instantiates all modules in correct order (including EquipmentManager, AnimationLibrary)
- Wires event handlers to business logic (file upload, animation selection, equipment controls)
- Runs main animation loop calling `requestAnimationFrame`
- Updates animations, rotates model, maintains position lock each frame
- Handles equipment file selection, attachment, offset adjustments
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
    ├─ animation-controller.update(delta)  // updates mixer + restores locked positions
    ├─ three-setup.rotateModel()           // auto-rotation
    └─ three-setup.render()                // draws frame (with equipment if attached)
    ↓
repeat
```

**Loading Equipment (Complete Flow)**
```
User selects equipment file (weapon/accessory)
    ↓
ui-controller.onEquipmentFileSelect() → app.handleEquipmentFileSelect()
    ↓
file-handler.readFile(file) → returns {contents, extension}
    ↓
equipment-manager.loadEquipment(contents, extension)
    ├─ loadGLTF / loadFBX / loadOBJ
    ├─ ensures visible materials (gray fallback if textures missing)
    ├─ scales to ~0.3 units (hand-held size)
    └─ stores as loadedEquipment
    ↓
equipment-manager.showEquipmentPreview()
    ├─ clones equipment
    ├─ positions at (1.5, 0, 0) next to character
    └─ adds green bounding box helper
    ↓
ui-controller.enableAttachButton()
```

**Attaching Equipment (Complete Flow)**
```
User clicks Attach button
    ↓
app.handleAttachEquipment()
    ↓
equipment-manager.attachToBone(equipment, boneName, offsets)
    ├─ findBone(boneName) → uses smart scoring to find best match
    ├─ Get bone world scale BEFORE attaching (e.g., 0.01 for Mixamo)
    ├─ Store equipment's original scale (e.g., 1.0)
    ├─ bone.add(equipment) → equipment inherits bone scale
    ├─ SCALE COMPENSATION: equipment.scale = originalScale / boneScale × userScale
    │   Example: 1.0 / 0.01 × 1.0 = 100 in bone space = 1.0 in world space ✅
    ├─ POSITION COMPENSATION: equipment.position = sliderValue / boneScale
    │   Example: 0.5 / 0.01 = 50 in bone space = 0.5 world units ✅
    ├─ Add visual helpers (axis arrows, pink sphere, green world marker)
    └─ Store in equippedItems map with bone scale reference
    ↓
equipment-manager.hideEquipmentPreview()
    ↓
ui-controller.enableOffsetControls() // Enable scale, position, rotation sliders
```

**Adjusting Equipment Offsets (Real-time)**
```
User moves scale/position/rotation slider
    ↓
app.handleEquipmentOffsetChange(event)
    ↓
equipment-manager.updateOffsets(boneName, newOffsets)
    ├─ If position changed: apply compensation (value / boneScale)
    ├─ If rotation changed: apply directly (no compensation needed)
    └─ If scale changed: recalculate (originalScale / boneScale × newScale)
    ↓
three-setup.render() → immediate visual feedback
```

**Animation Library Flow**
```
On app startup:
    ↓
animation-library.preloadLibraryAnimations()
    ├─ Attempts to load walk.fbx, run.fbx, idle.fbx, jump.fbx, attack.fbx, dance.fbx
    ├─ Each file optional (no error if missing)
    └─ Stores in animations array with source='library'
    ↓
ui-controller.updateAnimationDropdown()
    └─ Populates dropdown with library animations

User uploads custom animation:
    ↓
ui-controller.onAnimationFileSelect() → app.handleAnimationFileSelect()
    ↓
animation-library.loadAnimationFromFile(file)
    ├─ parseFBXAnimation / parseGLTFAnimation
    └─ Stores with source='uploaded'
    ↓
ui-controller.updateAnimationDropdown()
    └─ Adds uploaded animation to dropdown

User selects animation from dropdown:
    ↓
animation-controller.selectAnimation(index)
    ├─ Gets clip from AnimationLibrary or model animations
    ├─ Creates AnimationAction with mixer
    ├─ Auto-enables autoplay toggle
    ├─ Auto-enables position lock toggle
    └─ Starts playback
```

## Key Implementation Details

### Script Loading Order
The `index.html` loads scripts in a specific order that must be maintained:
1. Third-party libraries (Three.js, loaders, JSZip, fflate)
2. `config.js` (must load first - used by all modules)
3. Core modules (ui-controller, three-setup)
4. Utility modules (sprite.js, animation-frame-calculator.js)
5. Feature modules (model-loader, animation-controller, animation-library, sprite-generator, equipment-manager, file-handler)
6. `app.js` (must load last - depends on all modules)

**Important**: `fflate.min.js` is required for FBX loading. Missing this library will cause "fflate is not defined" errors.

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

**Bone Scale Compensation (CRITICAL for Equipment System)**

When attaching equipment to character bones, Three.js parent-child hierarchy causes equipment to inherit the bone's world scale. Mixamo character bones typically have a world scale of 0.01, which collapses equipment to microscopic size (invisible).

**The Problem:**
```javascript
// Before attachment: equipment scale = 1.0 (normal size)
bone.add(equipment);
// After attachment: equipment world scale = 1.0 × 0.01 = 0.01 (microscopic!)
```

**The Solution - Inverse Scale Compensation:**
```javascript
// 1. Get bone world scale BEFORE attaching
const boneWorldScale = new THREE.Vector3();
bone.getWorldScale(boneWorldScale); // e.g., (0.01, 0.01, 0.01)

// 2. Store equipment's original scale
const originalScale = equipment.scale.clone(); // e.g., (1, 1, 1)

// 3. Attach to bone (equipment inherits tiny scale)
bone.add(equipment);

// 4. Compensate scale to maintain original world size
equipment.scale.set(
    originalScale.x / boneWorldScale.x,  // 1.0 / 0.01 = 100 in bone space
    originalScale.y / boneWorldScale.y,  // = 1.0 in world space ✅
    originalScale.z / boneWorldScale.z
);
```

**Position Compensation (CRITICAL for Intuitive Controls):**

Slider values must also be compensated, otherwise moving slider 0.5 units only moves equipment 0.005 world units (2 pixels).

```javascript
// Without compensation: 0.5 × 0.01 = 0.005 world units (barely visible)
// With compensation: 0.5 / 0.01 = 50 in bone space = 0.5 world units ✅
equipment.position.set(
    sliderValue.x / boneWorldScale.x,
    sliderValue.y / boneWorldScale.y,
    sliderValue.z / boneWorldScale.z
);
```

**Why This Works:**
- Local transforms in parent-child hierarchy multiply with parent's transform
- Compensating by inverse scale cancels out the parent's scale effect
- `childWorldScale = childLocalScale × parentWorldScale`
- `1.0 world = (1.0 / 0.01) local × 0.01 parent = 100 × 0.01 = 1.0 ✅`

**Position Locking (CRITICAL for Walk Animations)**

Walk and run animations contain "root motion" - keyframes that translate the character forward. This causes character drift during multi-frame sprite generation.

**The Problem:**
```javascript
// Frame 0: character at (0, 0, 0)
// Frame 10: character at (2.5, 0, 0) - walked forward!
// Sprite frames show character in different positions (breaks sprite sheets)
```

**The Solution - Lock ALL Child Positions:**
```javascript
// When position lock enabled:
setLockPosition(enabled) {
    const model = this.threeSetup.getLoadedModel();

    // Save root position
    this.lockedPosition = model.position.clone();

    // CRITICAL: Save ALL child object positions (including bones)
    this.lockedChildPositions = new Map();
    model.traverse((child) => {
        if (child.position) {
            this.lockedChildPositions.set(child.uuid, child.position.clone());
        }
    });
}

// After EVERY mixer update (every frame):
restoreLockedPositions() {
    if (!this.lockPosition) return;

    const model = this.threeSetup.getLoadedModel();

    // Restore root position
    model.position.copy(this.lockedPosition);

    // Restore ALL child positions (prevents bone translation)
    model.traverse((child) => {
        if (this.lockedChildPositions.has(child.uuid)) {
            const lockedPos = this.lockedChildPositions.get(child.uuid);
            child.position.copy(lockedPos);
        }
    });
}
```

**Why Lock All Children:**
- Root motion affects specific bones (usually Hips or Root bone)
- Simply locking the model's root position isn't enough
- Must restore positions of ALL child objects (67-135 bones typically)
- Called after `mixer.update()` to override animation's position changes
- Preserves animation's rotation and other transforms

**Direction Count Selection (8 vs 16 Directions)**

Users can choose between 8-directional (traditional) or 16-directional (smoother) sprite generation:

- **8 Directions**: 45° angles - South, SouthEast, East, NorthEast, North, NorthWest, West, SouthWest
- **16 Directions**: 22.5° angles - Adds intermediate directions for smoother rotation
- **Single Direction**: Captures from current camera angle only (for side-scrolling games)

Configuration stored in `CONFIG.DIRECTIONS_8` and `CONFIG.DIRECTIONS_16` arrays with `{name, angle}` pairs.

**Animation Frame Timing**

Frames are distributed evenly across animation duration using linear interpolation:

```javascript
frameTime = (frameIndex / (totalFrames - 1)) × animationDuration

Example with 4 frames, 2-second animation:
Frame 0: 0.000s (0%)
Frame 1: 0.667s (33%)
Frame 2: 1.333s (67%)
Frame 3: 2.000s (100%)
```

This ensures first and last frames capture animation start/end, with even distribution between.

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

### Adding Equipment Attachment Points
To add new bone attachment points (e.g., Head, Spine, Feet):
1. Add option to equipment bone dropdown in `index.html`
2. Update `equipment-manager.js` → `findBone()` to handle bone name variations
3. No other changes needed - system automatically handles any bone

### Adding Animation Library Files
To add Mixamo animations to the preload library:
1. Download animation FBX from Mixamo (without skin)
2. Place in `/animations` folder with descriptive name (e.g., `crouch.fbx`)
3. Add filename to `animation-library.js` → `preloadLibraryAnimations()` array
4. Animation will appear in dropdown on next app load

### Adjusting Frame Count Recommendations
Use `animation-controller.analyzeAnimation()` in console to see:
- Animation duration and keyframe count
- Detected animation type (walk, run, idle, etc.)
- Recommended frame counts with reasoning
- Exact capture times for each frame

```javascript
// In browser console after loading model
app.animationController.analyzeAnimation(0); // Analyze first animation
```

## Browser Compatibility Notes

- Requires ES6+ support (classes, arrow functions, async/await, Promises)
- Uses `preserveDrawingBuffer: true` on WebGL renderer for sprite capture
- Patches `THREE.ImageLoader` to handle blob URLs without CORS issues
- Error handlers suppress non-critical texture loading warnings

## State Management

The application maintains state across several modules:
- **threeSetup** - holds scene, camera, renderer, loaded model reference
- **animationController** - holds mixer, current animation action, animations array, locked positions (Map), autoplay state, position lock state
- **animationLibrary** - holds library animations, uploaded animations, animations by name (Map)
- **equipmentManager** - holds loaded equipment, equipped items (Map with bone → {object, bone, offsets, boneWorldScale}), preview group
- **spriteGenerator** - holds generated sprites array, animation frame calculator
- **modelLoader** - holds animations extracted during load

State flow is unidirectional: user action → app.js → modules → ui-controller updates.

**Critical State for Equipment:**
- `boneWorldScale` - Stored with each equipped item to maintain correct scale/position compensation during real-time adjustments
- `originalEquipmentScale` - Stored to recalculate compensated scale when user changes scale slider

**Critical State for Position Locking:**
- `lockedChildPositions` - Map of child UUID → locked position for ALL objects in hierarchy (67-135 entries typically)
- Updated every frame after `mixer.update()` to prevent root motion
