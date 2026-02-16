import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        console.log('Processing submission request via Mailgun...');
        const body = JSON.parse(event.body);
        const { type, data } = body;
        console.log(`Type: ${type}`, data);

        // Validate environment variables
        const { MAILGUN_API_KEY, MAILGUN_DOMAIN, EMAIL_TO } = process.env;

        if (!MAILGUN_API_KEY || !EMAIL_TO) {
            console.error('CRITICAL: Missing Mailgun configuration');
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Server configuration error',
                    details: 'Missing Mailgun API Key or Email To address'
                })
            };
        }

        // Initialize Mailgun
        const mailgun = new Mailgun(FormData);
        const mg = mailgun.client({
            username: 'api',
            key: MAILGUN_API_KEY,
            url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
        });

        const domain = process.env.MAILGUN_DOMAIN;
        if (!domain) {
            console.error('CRITICAL: Missing MAILGUN_DOMAIN in .env');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server config error: Missing MAILGUN_DOMAIN' })
            };
        }

        const subject = type === 'contact'
            ? `New Contact Form Submission from ${data.name}`
            : type === 'fantasy-league'
                ? `🏎️ New Fantasy League Signup: ${data.teamName}`
                : type === 'listing-request'
                    ? `🚙 New Car Listing Request: ${data.vehicleMake} ${data.vehicleModel}`
                    : `New Event Registration: ${data.event}`;

        const htmlContent = type === 'contact'
            ? `
                <h3>New Contact Message</h3>
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Message:</strong></p>
                <p>${data.message}</p>
            `
            : type === 'fantasy-league'
                ? `
                <h3>🏎️ New Fantasy League Signup</h3>
                <p><strong>Team Name:</strong> ${data.teamName}</p>
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
            `
                : type === 'listing-request'
                    ? `
                <h3>🚙 New Car Listing Request</h3>
                <h4>Vehicle Details:</h4>
                <ul>
                    <li><strong>Listing ID:</strong> ${data.listingId}</li>
                    <li><strong>Vehicle:</strong> ${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}</li>
                    <li><strong>Price:</strong> ₹${data.vehiclePrice}</li>
                    <li><strong>Mileage:</strong> ${data.vehicleMileage} km</li>
                    <li><strong>Spec:</strong> ${data.vehicleEngine}, ${data.vehicleTrans}</li>
                </ul>
                <p><strong>Description:</strong></p>
                <div style="background:#eee;padding:10px;margin-bottom:15px;">${data.vehicleDesc}</div>
                
                ${data.images && data.images.length > 0 ? `
                    <h4>Photos (${data.images.length}):</h4>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;">
                        ${data.images.map(img => `<img src="${img}" style="width:100px;height:70px;object-fit:cover;border:1px solid #ddd;" />`).join('')}
                    </div>
                ` : '<p><em>No photos uploaded.</em></p>'}

                <h4>Contact Info:</h4>
                <ul>
                    <li><strong>Name:</strong> ${data.name}</li>
                    <li><strong>Email:</strong> ${data.email}</li>
                    <li><strong>Phone:</strong> ${data.phone}</li>
                </ul>
            `
                    : `
                <h3>New Event Registration</h3>
                <p><strong>Event:</strong> ${data.event}</p>
                <p><strong>Type:</strong> ${data.type}</p>
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Phone:</strong> ${data.phone}</p>
                ${data.comments ? `<p><strong>Comments:</strong> ${data.comments}</p>` : ''}
            `;

        // --- Send Admin Notification ---
        const msgAdmin = await mg.messages.create(domain, {
            from: `Trackmeisters Web <contact@trackmeisters.in>`,
            to: [EMAIL_TO],
            subject: subject,
            html: htmlContent,
            text: `New submission from ${data.name}.`
        });
        console.log('Admin notification sent:', msgAdmin);

        // --- Send User Acknowledgment (Transactional) ---
        let userSubject = '';
        let userHtml = '';

        if (type === 'contact') {
            userSubject = `We've received your message - Trackmeisters`;
            userHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #FF0000;">Thanks for reaching out!</h2>
                    <p>Hi ${data.name},</p>
                    <p>We received your message and will get back to you as soon as possible.</p>
                    <p>Here's a copy of what you sent:</p>
                    <blockquote style="background: #f9f9f9; padding: 15px; border-left: 4px solid #FF0000;">
                        ${data.message}
                    </blockquote>
                    <p>Best Regards,<br><strong>Team Trackmeisters</strong></p>
                </div>
            `;
        } else if (type === 'fantasy-league') {
            userSubject = `🏎️ Welcome to Trackmeisters Fantasy League!`;
            userHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #FF0000;">🏎️ You're In!</h2>
                    <p>Hi ${data.name},</p>
                    <p>Welcome to the <strong>Trackmeisters F1 Fantasy League</strong>!</p>
                    <p>Your team <strong>"${data.teamName}"</strong> has been registered.</p>
                    <p>We'll be in touch soon with league details and how to start building your dream team.</p>
                    <p>Get ready to compete!</p>
                    <p>Best Regards,<br><strong>Team Trackmeisters</strong></p>
                </div>
            `;
        } else if (type === 'listing-request') {
            userSubject = `We received your car listing request - Trackmeisters`;
            userHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #FF0000;">Listing Request Received</h2>
                    <p>Hi ${data.name},</p>
                    <p>Thanks for submitting your <strong>${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}</strong> to Trackmeisters Classifieds.</p>
                    <p><strong>Listing ID:</strong> ${data.listingId}</p>
                    <p>We have received your request. Once the listing fee payment is verified, your listing will be published.</p>
                    <p>If you haven't completed the payment yet, please ensure to include your Listing ID in the payment remarks.</p>
                    <p>Best Regards,<br><strong>Team Trackmeisters</strong></p>
                </div>
            `;
        } else {
            userSubject = `Registration Confirmed: ${data.event}`;
            userHtml = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                    <h2 style="color: #FF0000;">Registration Confirmed!</h2>
                    <p>Hi ${data.name},</p>
                    <p>You have successfully registered for <strong>${data.event}</strong>.</p>
                    <h3>Registration Details:</h3>
                    <ul>
                        <li><strong>Type:</strong> ${data.type}</li>
                        <li><strong>Email:</strong> ${data.email}</li>
                        <li><strong>Phone:</strong> ${data.phone}</li>
                    </ul>
                    <p>We look forward to seeing you there!</p>
                    <p>Best Regards,<br><strong>Team Trackmeisters</strong></p>
                </div>
            `;
        }

        try {
            await mg.messages.create(domain, {
                from: `Trackmeisters <contact@trackmeisters.in>`,
                to: [data.email],
                subject: userSubject,
                html: userHtml,
                text: `Hi ${data.name}, thank you for your submission. We will be in touch shortly.`
            });
            console.log('User acknowledgment sent.');
        } catch (userError) {
            console.error('Failed to send user acknowledgment:', userError);
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `${type} submission received successfully!` })
        };

    } catch (error) {
        console.error('Submission error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to process submission', details: error.message })
        };
    }
};
