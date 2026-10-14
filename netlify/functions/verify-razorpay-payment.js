import crypto from 'crypto';

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing payment signature verification parameters' })
            };
        }

        const isLive = mode === 'live' || process.env.RAZORPAY_MODE === 'live';
        const razorpaySecret = (isLive ? process.env.RAZORPAY_LIVE_SECRET : process.env.RAZORPAY_TEST_SECRET) || process.env.RAZORPAY_TEST_SECRET;

        if (!razorpaySecret) {
            console.error('CRITICAL: Missing Razorpay secret key in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error: Razorpay secret key missing' })
            };
        }

        // Verify the signature: HMAC-SHA256(order_id + "|" + payment_id, secret)
        const hmac = crypto.createHmac('sha256', razorpaySecret.trim());
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    verified: true,
                    payment_id: razorpay_payment_id,
                    order_id: razorpay_order_id,
                    message: 'Payment signature verified successfully'
                })
            };
        } else {
            console.warn('Razorpay signature verification failed');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    verified: false,
                    error: 'Signature verification mismatch'
                })
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
