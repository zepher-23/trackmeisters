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
        const { type, data } = body;

        if (!data) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing data in request body' })
            };
        }

        let webhookUrl = '';
        if (type === 'visitor') {
            webhookUrl = process.env.VISITOR_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec';
        } else if (type === 'media') {
            webhookUrl = process.env.MEDIA_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzZZZpqq0qBq3PJ7ejX2XA2TfJKTA1cH-NJBkFxc2WsLUc2ZW3DiDMZ34YAgSvzB3JjTA/exec';
        } else {
            webhookUrl = process.env.MAIN_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxTWnn-ydXQU9YmHoKrZRWR3uOAAodsLNtu1PXNSG1DuA5D4Y8bfvCJQZjBT0t0uZhr/exec';
        }

        console.log(`Syncing ${type} registration to Google Sheets...`);

        // Use global fetch (available in Node 18+)
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        // Google Apps Script macros usually redirect or return 200/302.
        // Even if it redirects, with no-cors or simple fetch we might not get full info, 
        // but here on the server we can actually wait for it properly.

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: `Successfully triggered Google Sheet for ${type}`,
                googleStatus: response.status
            })
        };

    } catch (error) {
        console.error('Netlify Function Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal Server Error', 
                details: error.message 
            })
        };
    }
};
