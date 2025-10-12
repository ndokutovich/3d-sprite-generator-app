# Animation Library

This folder is for preloading animation files that will be available in the app automatically.

## Supported Formats
- **FBX** (.fbx) - Recommended
- **GLB** (.glb)
- **GLTF** (.gltf)

## How to Add Mixamo Animations

### Step 1: Download from Mixamo
1. Go to [mixamo.com](https://www.mixamo.com)
2. Sign in with Adobe account (free)
3. Browse and select an animation (walk, run, jump, etc.)
4. Click "Download"
5. **Settings:**
   - Format: **FBX**
   - Skin: **Without Skin** (animations only!)
   - Frame Rate: 30 (default)
   - Keyframe Reduction: None (or adjust as needed)

### Step 2: Name Your Files
Place files in this folder with simple names:
```
animations/
├── walk.fbx
├── run.fbx
├── idle.fbx
├── jump.fbx
├── attack.fbx
├── dance.fbx
```

### Step 3: Automatic Loading
The app will automatically try to load these files on startup:
- `walk.fbx`
- `run.fbx`
- `idle.fbx`
- `jump.fbx`
- `attack.fbx`
- `dance.fbx`

You can add other names too - just upload them using the "Upload Animation" button in the UI!

## Skeleton Compatibility

⚠️ **IMPORTANT**: Animations will only work if the skeleton matches!

### Using Mixamo Models + Mixamo Animations
✅ **This works perfectly!** Mixamo uses a standard skeleton (Y-Bot) for all their characters.

**Workflow:**
1. Download a character from Mixamo (with skeleton)
2. Download animations from Mixamo (without skin)
3. Load the character in the app
4. Animations from this folder will work automatically!

### Using Custom Models
⚠️ Only works if your model uses:
- Same bone names as Mixamo skeleton
- Same bone hierarchy
- T-pose or A-pose as bind pose

## Alternative: Upload Animations Manually

If you don't want to use this folder, you can:
1. Load your model
2. Click "Upload Animation (FBX/GLB)" button
3. Select animation file
4. It appears in "📚 Animation Library" dropdown

## File Structure
```
3d-sprite-generator-app/
├── animations/              ← This folder (optional)
│   ├── walk.fbx
│   ├── run.fbx
│   └── ...
├── js/
├── index.html
└── ...
```

## Tips

- **Keep files small**: Mixamo animations are usually 50-500KB
- **Use descriptive names**: The filename becomes the animation name in the dropdown
- **Test with Mixamo first**: Download a Mixamo character + animation to test the system
- **Procedural animations**: If your model has no skeleton, use "⚙️ Procedural Animations" instead!

## Troubleshooting

### Animation doesn't show up?
- Check browser console for errors
- Make sure the file is actually in `/animations` folder
- Try renaming to one of the default names (walk.fbx, run.fbx, etc.)

### Animation doesn't play on my model?
- Skeleton mismatch! The model and animation must have matching skeletons
- Try downloading both the model AND animation from Mixamo
- Check that bones exist: Open model in Blender and look for armature

### How to know if my model has a skeleton?
- Load the model in the app
- If you see "📦 Model Animations" group in the dropdown, it has a skeleton
- If not, your model is a static mesh (use procedural animations instead)

## Example Mixamo Workflow

1. **Download Character**:
   - Go to Mixamo → Characters
   - Select "Y Bot" or any character
   - Download as FBX (with skeleton)
   - Save as `character.fbx`

2. **Download Animations**:
   - Go to Mixamo → Animations
   - Select "Walking"
   - Download as FBX (**Without Skin**)
   - Save as `animations/walk.fbx`
   - Repeat for run, jump, etc.

3. **Use in App**:
   - Open the app
   - Load `character.fbx`
   - Animations from `/animations` folder appear automatically!
   - Select animation → Adjust angle → Generate sprites!

---

Happy animating! 🎭
