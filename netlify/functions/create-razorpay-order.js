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
        const { amount, receipt, notes } = body; // amount in rupees

        if (!amount) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Amount is required' })
            };
        }

        const razorpayKey = process.env.RAZORPAY_TEST_KEY;
        const razorpaySecret = process.env.RAZORPAY_TEST_SECRET;

        if (!razorpayKey || !razorpaySecret) {
            console.error('CRITICAL: Missing Razorpay configuration');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error: Razorpay keys missing' })
            };
        }

        // Amount in paise
        const amountInPaise = Math.round(parseFloat(amount) * 100);

        // Fetch call to Razorpay Orders API
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
                receipt: receipt || `receipt_${Date.now()}`,
                notes: notes || {}
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Razorpay Order Creation Failed:', errorText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ error: 'Razorpay order creation failed', details: errorText })
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
                key_id: razorpayKey.trim()
            })
        };

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
