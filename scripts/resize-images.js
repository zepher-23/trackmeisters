import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MEDIA_DIR = path.resolve('public/media');
const TARGET_WIDTH = 800;

async function processImages() {
    console.log('Starting image resizing...');

    if (!fs.existsSync(MEDIA_DIR)) {
        console.error(`Directory not found: ${MEDIA_DIR}`);
        return;
    }

    const files = fs.readdirSync(MEDIA_DIR);

    for (const file of files) {
        if (!file.match(/\.(png|jpg|jpeg)$/i)) continue;

        const filePath = path.join(MEDIA_DIR, file);

        // Read to buffer first to avoid file lock issues during overwrite
        const buffer = fs.readFileSync(filePath);

        try {
            const metadata = await sharp(buffer).metadata();

            if (metadata.width > TARGET_WIDTH) {
                console.log(`Resizing ${file} (${metadata.width}px -> ${TARGET_WIDTH}px)...`);

                // Write back to the same file
                await sharp(buffer)
                    .resize({ width: TARGET_WIDTH })
                    .png({ quality: 80, compressionLevel: 9 }) // Optimize PNG
                    .toFile(filePath);

                console.log(`✓ Resized ${file}`);
            } else {
                console.log(`• Skipped ${file} (Width: ${metadata.width}px <= ${TARGET_WIDTH}px)`);
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
    console.log('Image resizing complete.');
}

processImages();
