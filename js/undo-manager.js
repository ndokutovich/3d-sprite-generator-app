// Undo/Redo Manager using Command Pattern
class UndoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50; // Limit history to prevent memory issues
    }

    /**
     * Execute a command and add it to undo stack
     * @param {Command} command - Command object with execute() and undo() methods
     */
    execute(command) {
        command.execute();
        this.undoStack.push(command);

        // Clear redo stack when new command is executed
        this.redoStack = [];

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift(); // Remove oldest command
        }

        console.log(`📝 Command executed: ${command.name}`);
        this.logStackSizes();
    }

    /**
     * Undo last command
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('⚠️ Nothing to undo');
            return false;
        }

        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);

        console.log(`↶ Undone: ${command.name}`);
        this.logStackSizes();
        return true;
    }

    /**
     * Redo last undone command
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('⚠️ Nothing to redo');
            return false;
        }

        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);

        console.log(`↷ Redone: ${command.name}`);
        this.logStackSizes();
        return true;
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('🗑️ Undo/Redo history cleared');
    }

    /**
     * Log current stack sizes (for debugging)
     */
    logStackSizes() {
        console.log(`📚 Undo: ${this.undoStack.length} | Redo: ${this.redoStack.length}`);
    }
}

// Base Command class
class Command {
    constructor(name) {
        this.name = name;
    }

    execute() {
        throw new Error('execute() must be implemented');
    }

    undo() {
        throw new Error('undo() must be implemented');
    }
}

// Transform Command (for model position/rotation/scale changes)
class TransformCommand extends Command {
    constructor(object, property, oldValue, newValue) {
        super(`Transform ${property}`);
        this.object = object;
        this.property = property; // 'position', 'rotation', or 'scale'
        this.oldValue = oldValue.clone();
        this.newValue = newValue.clone();
    }

    execute() {
        this.object[this.property].copy(this.newValue);
    }

    undo() {
        this.object[this.property].copy(this.oldValue);
    }
}

// Equipment Transform Command
class EquipmentTransformCommand extends Command {
    constructor(equipmentManager, slot, oldOffsets, newOffsets) {
        super(`Equipment Transform: ${slot}`);
        this.equipmentManager = equipmentManager;
        this.slot = slot;
        this.oldOffsets = this.cloneOffsets(oldOffsets);
        this.newOffsets = this.cloneOffsets(newOffsets);
    }

    cloneOffsets(offsets) {
        return {
            position: { ...offsets.position },
            rotation: { ...offsets.rotation },
            scale: offsets.scale
        };
    }

    execute() {
        this.equipmentManager.updateOffsets(this.slot, this.newOffsets);
    }

    undo() {
        this.equipmentManager.updateOffsets(this.slot, this.oldOffsets);
    }
}

// Equipment Equip/Unequip Command
class EquipCommand extends Command {
    constructor(equipmentManager, slot, shouldEquip) {
        super(`${shouldEquip ? 'Equip' : 'Unequip'}: ${slot}`);
        this.equipmentManager = equipmentManager;
        this.slot = slot;
        this.shouldEquip = shouldEquip;
    }

    execute() {
        if (this.shouldEquip) {
            this.equipmentManager.equipSlot(this.slot);
        } else {
            this.equipmentManager.unequipSlot(this.slot);
        }
    }

    undo() {
        if (this.shouldEquip) {
            this.equipmentManager.unequipSlot(this.slot);
        } else {
            this.equipmentManager.equipSlot(this.slot);
        }
    }
}

// Camera Position Command
class CameraPositionCommand extends Command {
    constructor(camera, oldPosition, newPosition) {
        super('Camera Position');
        this.camera = camera;
        this.oldPosition = oldPosition.clone();
        this.newPosition = newPosition.clone();
    }

    execute() {
        this.camera.position.copy(this.newPosition);
    }

    undo() {
        this.camera.position.copy(this.oldPosition);
    }
}

// Animation Selection Command
class AnimationSelectCommand extends Command {
    constructor(animationController, oldIndex, newIndex) {
        super('Animation Selection');
        this.animationController = animationController;
        this.oldIndex = oldIndex;
        this.newIndex = newIndex;
    }

    execute() {
        this.animationController.selectAnimation(this.newIndex);
    }

    undo() {
        this.animationController.selectAnimation(this.oldIndex);
    }
}
