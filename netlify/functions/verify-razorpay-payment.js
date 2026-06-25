import crypto from 'crypto';

export const handler = async (event) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing payment signature verification parameters' })
            };
        }

        const razorpaySecret = process.env.RAZORPAY_TEST_SECRET;
        if (!razorpaySecret) {
            console.error('CRITICAL: Missing Razorpay secret key');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error: Razorpay secret key missing' })
            };
        }

        // Verify the signature
        const hmac = crypto.createHmac('sha256', razorpaySecret.trim());
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ verified: true })
            };
        } else {
            console.warn('Razorpay signature verification failed');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ verified: false, error: 'Signature verification failed' })
            };
        }

    } catch (error) {
        console.error('Error verifying Razorpay signature:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
