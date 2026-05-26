import fs from 'fs';
import FormData from 'form-data';
import http from 'http';
import https from 'https';
import { URL } from 'url';

async function uploadToCloudinary(filePath) {
    const cloudName = 'ddubpntdp';
    const uploadPreset = 'trackmeisters';

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'trackmeisters/videos');

    console.log(`Uploading ${filePath}...`);

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.cloudinary.com',
            path: `/v1_1/${cloudName}/video/upload`,
            method: 'POST',
            headers: formData.getHeaders(),
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                if (result.secure_url) {
                    console.log(`SUCCESS: ${filePath}`);
                    console.log(`URL: ${result.secure_url}`);
                    const optimized = result.secure_url.replace('/upload/', '/upload/q_auto,f_auto,w_480/');
                    console.log(`Optimized URL: ${optimized}`);
                    resolve(optimized);
                } else {
                    console.log(`FAILED: ${filePath}`, result);
                    reject(result);
                }
            });
        });

        req.on('error', reject);
        formData.pipe(req);
    });
}

async function main() {
    try {
        await uploadToCloudinary('src/assets/videos/Video1.mp4');
        await uploadToCloudinary('src/assets/videos/Video2.mp4');
        await uploadToCloudinary('src/assets/videos/Video2 (1).mp4');
    } catch (err) {
        console.error('Upload failed with error', err);
    }
}

main();
