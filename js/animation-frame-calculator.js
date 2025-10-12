// AnimationFrameCalculator - Utility for calculating animation frame timings
class AnimationFrameCalculator {
    /**
     * Calculate the time value for a specific frame in an animation
     * @param {number} frameIndex - Current frame (0-based)
     * @param {number} totalFrames - Total number of frames
     * @param {number} duration - Animation duration in seconds
     * @returns {number} Time value for this frame
     */
    calculateFrameTime(frameIndex, totalFrames, duration) {
        if (totalFrames <= 1) {
            return 0;
        }
        // Distribute frames evenly across animation duration
        return (frameIndex / (totalFrames - 1)) * duration;
    }

    /**
     * Calculate progress percentage for sprite generation
     * @param {number} completedSprites - Number of sprites completed
     * @param {number} totalSprites - Total sprites to generate
     * @param {number} baseProgress - Starting progress percentage (default 10)
     * @param {number} progressRange - Range for this operation (default 80)
     * @returns {number} Progress percentage
     */
    calculateProgress(completedSprites, totalSprites, baseProgress = 10, progressRange = 80) {
        if (totalSprites === 0) return baseProgress;
        return baseProgress + (completedSprites / totalSprites) * progressRange;
    }

    /**
     * Calculate total number of sprites to generate
     * @param {number} directionCount - Number of directions (8 or 16)
     * @param {number} frameCount - Number of animation frames
     * @returns {number} Total sprites
     */
    calculateTotalSprites(directionCount, frameCount) {
        return directionCount * frameCount;
    }
}
