// File Handler - Handles file reading and ZIP creation
class FileHandler {
    constructor(uiController) {
        this.uiController = uiController;
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            this.uiController.showLoading('Reading file...', 0);

            const extension = file.name.split('.').pop().toLowerCase();
            const reader = new FileReader();

            // Track reading progress
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * CONFIG.PROGRESS.READ_FILE_END;
                    this.uiController.updateProgress(percentComplete, 'Reading file...');
                }
            };

            reader.onload = (event) => {
                this.uiController.updateProgress(CONFIG.PROGRESS.PARSE_MODEL, 'Parsing model...');
                const contents = event.target.result;

                // Small delay to show the progress update
                setTimeout(() => {
                    resolve({ contents, extension, fileName: file.name });
                }, 100);
            };

            reader.onerror = () => {
                this.uiController.showError('Failed to read file. Please try again.');
                reject(new Error('File read error'));
            };

            // Always read as ArrayBuffer for all formats
            reader.readAsArrayBuffer(file);
        });
    }

    async createZipArchive(sprites) {
        if (!sprites || sprites.length === 0) {
            throw new Error('No sprites to download');
        }

        this.uiController.showLoading('Creating ZIP archive...', 0);

        try {
            const zip = new JSZip();
            const folder = zip.folder(CONFIG.ZIP.FOLDER_NAME);

            this.uiController.updateProgress(20, 'Adding sprites to archive...');

            // Add each sprite to the ZIP
            sprites.forEach((sprite, index) => {
                const base64Data = sprite.data.split(',')[1];

                // Use structured naming: directionIndex_frameIndex_directionName.png
                const dirName = sprite.directionName.toLowerCase().replace(/\s+/g, '_');
                const fileName = sprite.frameIndex !== undefined
                    ? `${sprite.directionIndex}_${sprite.frameIndex}_${dirName}.png`
                    : `${index}_${sprite.name.toLowerCase().replace(/\s+/g, '_')}.png`;

                folder.file(fileName, base64Data, { base64: true });

                const progress = 20 + ((index + 1) / sprites.length) * 40;
                this.uiController.updateProgress(
                    progress,
                    `Adding ${sprite.name}... (${index + 1}/${sprites.length})`
                );
            });

            this.uiController.updateProgress(70, 'Compressing archive...');

            // Generate ZIP file
            const content = await zip.generateAsync({
                type: 'blob',
                compression: "DEFLATE",
                compressionOptions: { level: CONFIG.ZIP.COMPRESSION_LEVEL }
            }, (metadata) => {
                const progress = 70 + (metadata.percent * 0.25);
                this.uiController.updateProgress(
                    progress,
                    `Compressing... ${Math.round(metadata.percent)}%`
                );
            });

            this.uiController.updateProgress(95, 'Preparing download...');

            // Trigger download
            this.downloadBlob(content, CONFIG.ZIP.FILE_NAME);

            this.uiController.updateProgress(100, 'Download started!');

            setTimeout(() => {
                this.uiController.hideLoading();
            }, 1000);

            return content;
        } catch (error) {
            console.error('Error creating ZIP:', error);
            this.uiController.showError('Failed to create ZIP archive: ' + error.message);
            throw error;
        }
    }

    downloadBlob(blob, fileName) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    }
}
