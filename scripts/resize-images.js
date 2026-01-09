import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Target the root 'public' directory
const ROOT_DIR = path.resolve('public');
const TARGET_WIDTH = 1200; // Increased slightly for Hero images, but WebP compression will keep them small

// Helper to walk directory recursively
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });

    return arrayOfFiles;
}

async function processImages() {
    console.log('Starting Global recursive WebP Optimization...');

    if (!fs.existsSync(ROOT_DIR)) {
        console.error(`Directory not found: ${ROOT_DIR}`);
        return;
    }

    const allFiles = getAllFiles(ROOT_DIR);

    for (const filePath of allFiles) {
        // Process PNG/JPG/JPEG/WEBP
        if (!filePath.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

        // Skip favicon or specific system files if needed, but usually converting all assets is fine if refs are updated.

        const dirName = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const fileNameWithoutExt = path.parse(fileName).name;
        const targetPath = path.join(dirName, `${fileNameWithoutExt}.webp`);

        try {
            // Read file
            const buffer = fs.readFileSync(filePath);
            const metadata = await sharp(buffer).metadata();

            // Determine resize target
            // If it's a huge hero image, maybe allow 1920, otherwise 800? 
            // For simplicity and "100kb" goal, we aggressively limit to 1920 max width (for hero) or smaller.
            // But user asked for ~100kb. 1200px WebP usually hits this.

            let resizeWidth = metadata.width > 1600 ? 1600 : metadata.width;

            // Special logic: If file is in 'media' folder, keep 800px logic from before?
            // Or just apply global 1200px limit which is safe for everything.

            console.log(`Optimizing ${fileName}...`);

            const sharpInstance = sharp(buffer)
                .resize({ width: resizeWidth, withoutEnlargement: true })
                .webp({
                    quality: 75,
                    effort: 6,
                    smartSubsample: true
                });

            await sharpInstance.toFile(targetPath);

            // Check result size
            const newStats = fs.statSync(targetPath);
            console.log(`✓ Created ${path.relative(ROOT_DIR, targetPath)}: ${(newStats.size / 1024).toFixed(2)} KB`);

            // If we converted format (e.g. png -> webp), delete the old file
            if (path.extname(filePath).toLowerCase() !== '.webp') {
                fs.unlinkSync(filePath);
                console.log(`  Deleted old source: ${fileName}`);
            }

        } catch (err) {
            console.error(`Error processing ${fileName}:`, err);
        }
    }
    console.log('Global Optimization complete.');
}

processImages();
