// Sprite - Encapsulates sprite data and naming logic
class Sprite {
    constructor(directionIndex, frameIndex, directionName, dataURL) {
        this.directionIndex = directionIndex;
        this.frameIndex = frameIndex;
        this.directionName = directionName;
        this.data = dataURL;
    }

    get fileName() {
        const sanitizedName = this._sanitizeName(this.directionName);
        if (this.frameIndex !== undefined && this.frameIndex !== null) {
            return `${this.directionIndex}_${this.frameIndex}_${sanitizedName}.png`;
        }
        return `${this.directionIndex}_${sanitizedName}.png`;
    }

    get displayName() {
        if (this.frameIndex !== undefined && this.frameIndex !== null) {
            return `${this.directionName}_frame${this.frameIndex}`;
        }
        return this.directionName;
    }

    // Legacy compatibility - some code expects 'name' property
    get name() {
        return this.displayName;
    }

    _sanitizeName(name) {
        return name.toLowerCase().replace(/\s+/g, '_');
    }

    // For backwards compatibility with old sprite format
    static fromLegacyObject(obj) {
        return new Sprite(
            obj.directionIndex || 0,
            obj.frameIndex,
            obj.directionName || obj.name || 'unknown',
            obj.data
        );
    }
}
