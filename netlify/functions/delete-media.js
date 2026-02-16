

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { public_id, resource_type } = await req.json();

        if (!public_id) {
            return new Response(JSON.stringify({ error: 'Missing public_id' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: resource_type || 'image'
        });

        if (result.result !== 'ok' && result.result !== 'not found') {
            throw new Error(`Cloudinary error: ${result.result}`);
        }

        return new Response(JSON.stringify({ message: 'Deleted successfully', result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
