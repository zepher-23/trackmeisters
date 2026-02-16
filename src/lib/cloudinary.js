// Cloudinary configuration
// Cloud name extracted from CLOUDINARY_URL
export const CLOUDINARY_CLOUD_NAME = 'ddubpntdp';
export const CLOUDINARY_UPLOAD_PRESET = 'trackmeisters'; // You'll need to create this preset in Cloudinary dashboard

// Cloudinary upload URL
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Upload an image to Cloudinary using unsigned upload
 * @param {File} file - The file to upload
 * @param {string} folder - The folder to upload to (e.g., 'events', 'drivers')
 * @returns {Promise<string>} - The uploaded image URL
 */
export const uploadToCloudinary = (file, folder = 'general', onProgress) => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `trackmeisters/${folder}`);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', CLOUDINARY_UPLOAD_URL);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.secure_url);
                } catch (error) {
                    reject(new Error('Failed to parse Cloudinary response'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error?.message || 'Upload failed'));
                } catch (e) {
                    reject(new Error('Upload failed'));
                }
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
    });
};

// Cloudinary upload URL for auto-detection (images, videos, raw files like PDF)
export const CLOUDINARY_AUTO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
export const CLOUDINARY_RAW_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;

/**
 * Upload any file to Cloudinary using unsigned upload (auto resource type)
 * @param {File} file - The file to upload
 * @param {string} folder - The folder to upload to
 * @returns {Promise<string>} - The uploaded file URL
 */
export const uploadFileToCloudinary = (file, folder = 'documents', onProgress) => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `trackmeisters/${folder}`);

        const isPdf = file.type === 'application/pdf';
        const url = isPdf ? CLOUDINARY_RAW_UPLOAD_URL : CLOUDINARY_AUTO_UPLOAD_URL;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.secure_url);
                } catch (error) {
                    reject(new Error('Failed to parse Cloudinary response'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error?.message || 'Upload failed'));
                } catch (e) {
                    reject(new Error('Upload failed'));
                }
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error during upload'));
        };

        xhr.send(formData);
    });
};

/**
 * Get optimized Cloudinary URL with transformations
 * @param {string} url - The original Cloudinary URL
 * @param {object} options - Transformation options
 * @returns {string} - Transformed URL
 */
export const getOptimizedUrl = (url, options = {}) => {
    if (!url || !url.includes('cloudinary.com')) return url;

    const { width = 800, quality = 'auto', format = 'auto' } = options;

    // Insert transformations into Cloudinary URL
    const transformations = `w_${width},q_${quality},f_${format}`;
    return url.replace('/upload/', `/upload/${transformations}/`);
};

/**
 * Get thumbnail URL
 * @param {string} url - The original Cloudinary URL
 * @returns {string} - Thumbnail URL (400px width)
 */
export const getThumbnailUrl = (url) => {
    return getOptimizedUrl(url, { width: 400, quality: 'auto', format: 'auto' });
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} - The public ID
 */
export const getPublicIdFromUrl = (url) => {
    if (!url) return null;

    // Example: https://res.cloudinary.com/cloud-name/image/upload/v12345/trackmeisters/general/filename.jpg
    // We want: trackmeisters/general/filename

    try {
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch (e) {
        console.error('Error extracting public ID:', e);
        return null;
    }
};

/**
 * Delete file from Cloudinary via Netlify Function
 * @param {string} publicId - The public ID of the asset
 * @param {string} resourceType - 'image' or 'video'
 * @returns {Promise<void>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        const response = await fetch('/api/delete-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ public_id: publicId, resource_type: resourceType })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
};
