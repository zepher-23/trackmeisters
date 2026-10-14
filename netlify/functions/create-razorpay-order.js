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
        const { amount, receipt, notes, mode } = body; // amount in rupees

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Valid positive amount in INR is required' })
            };
        }

        // Determine key and secret based on requested mode or environment (default to test for dev mode)
        const isLive = mode === 'live' || process.env.RAZORPAY_MODE === 'live';
        const razorpayKey = (isLive ? process.env.RAZORPAY_LIVE_KEY : process.env.RAZORPAY_TEST_KEY) || process.env.RAZORPAY_TEST_KEY;
        const razorpaySecret = (isLive ? process.env.RAZORPAY_LIVE_SECRET : process.env.RAZORPAY_TEST_SECRET) || process.env.RAZORPAY_TEST_SECRET;

        if (!razorpayKey || !razorpaySecret) {
            console.error('CRITICAL: Missing Razorpay configuration in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Server configuration error: Razorpay keys missing. Please verify .env or environment variables.'
                })
            };
        }

        // Razorpay expects amount in paise (1 INR = 100 paise)
        const amountInPaise = Math.round(parseFloat(amount) * 100);

        const authString = Buffer.from(`${razorpayKey.trim()}:${razorpaySecret.trim()}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: 'INR',
                receipt: receipt || `rcpt_${Date.now()}`,
                notes: notes || { source: 'trackmeisters_dev_test' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Razorpay Orders API Error:', errorText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: 'Razorpay order creation failed',
                    details: errorText
                })
            };
        }

        const orderData = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                order_id: orderData.id,
                amount: orderData.amount,
                currency: orderData.currency,
                key_id: razorpayKey.trim(),
                is_test: razorpayKey.startsWith('rzp_test_')
            })
        };

    } catch (error) {
        console.error('Error in create-razorpay-order handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
