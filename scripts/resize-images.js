import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const MEDIA_DIR = path.resolve('public/media');
const TARGET_WIDTH = 800;

async function processImages() {
    console.log('Starting Aggressive Optimization (Target: ~100KB)...');

    if (!fs.existsSync(MEDIA_DIR)) {
        console.error(`Directory not found: ${MEDIA_DIR}`);
        return;
    }

    const files = fs.readdirSync(MEDIA_DIR);

    for (const file of files) {
        // Process PNG/JPG/JPEG/WEBP
        if (!file.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

        const filePath = path.join(MEDIA_DIR, file);
        const fileNameWithoutExt = path.parse(file).name;
        const targetPath = path.join(MEDIA_DIR, `${fileNameWithoutExt}.webp`);

        try {
            // Read file
            const buffer = fs.readFileSync(filePath);

            console.log(`Optimizing ${file}...`);

            // Convert to WebP + Resize + Compress
            await sharp(buffer)
                .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
                .webp({
                    quality: 75,       // Balance size/quality
                    effort: 6,         // Max compression effort 
                    smartSubsample: true
                })
                .toFile(targetPath);

            // Check result size
            const newStats = fs.statSync(targetPath);
            console.log(`✓ Created ${path.basename(targetPath)}: ${(newStats.size / 1024).toFixed(2)} KB`);

            // If we converted format (e.g. png -> webp), delete the old file
            if (path.extname(file).toLowerCase() !== '.webp') {
                fs.unlinkSync(filePath);
                console.log(`  Deleted old source: ${file}`);
            }

        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
    console.log('Optimization complete.');
}

processImages();
