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
                <h3>🚙 New Classifieds Listing Request</h3>
                <h4>Details:</h4>
                <ul>
                    <li><strong>Category:</strong> ${data.category === 'product' ? 'Performance Part' : 'Car'}</li>
                    <li><strong>Listing ID:</strong> ${data.listingId}</li>
                    <li><strong>Title:</strong> ${data.title}</li>
                    <li><strong>Price:</strong> ₹${data.price}</li>
                </ul>
                <p><strong>Description:</strong></p>
                <div style="background:#eee;padding:10px;margin-bottom:15px;white-space:pre-wrap;">${data.description}</div>
                
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
                    : type === 'listing-approval' || type === 'listing-rejection'
                        ? `<p>Admin action processed for ${data.title}</p>`
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
        if (type !== 'listing-approval' && type !== 'listing-rejection' && type !== 'registration') {
            const msgAdmin = await mg.messages.create(domain, {
                from: `Trackmeisters Web <contact@trackmeisters.in>`,
                to: [EMAIL_TO],
                subject: subject,
                html: htmlContent,
                text: `New submission from ${data.name}.`,
                'h:Reply-To': data.email
            });
            console.log('Admin notification sent:', msgAdmin);
        }

        // --- Send User Acknowledgment (Transactional) ---
        let userSubject = '';
        let userHtml = '';

        const createEmailTemplate = (title, contentHtml) => `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222; max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-bottom: 6px solid #E60000;">
                <div style="background-color: #ffffff; padding: 30px 30px 10px; text-align: left;">
                    <img src="https://res.cloudinary.com/ddubpntdp/image/upload/v1778154210/trackmeisters/general/hzps6p4cukmiyqgmxd7v.png" alt="Trackmeisters" style="height: 75px; width: auto; display: block;" />
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #E60000; margin-top: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h2>
                    ${contentHtml}
                    <p style="font-size: 16px; line-height: 1.6; color: #444; margin-top: 25px;">Best Regards,<br><strong style="color: #000;">Team Trackmeisters</strong></p>
                </div>
                <div style="background-color: #ffffff; padding: 20px; text-align: center; font-size: 13px; color: #777;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Trackmeisters. All rights reserved.</p>
                </div>
            </div>
        `;

        if (type === 'contact') {
            userSubject = `We've received your message - Trackmeisters`;
            userHtml = createEmailTemplate('Thanks for reaching out!', `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">We received your message and will get back to you as soon as possible. Here's a copy of what you sent:</p>
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin:0; font-style: italic; color: #555;">"${data.message}"</p>
                </div>
            `);
        } else if (type === 'fantasy-league') {
            userSubject = `🏎️ Welcome to Trackmeisters Fantasy League!`;
            userHtml = createEmailTemplate(`🏎️ You're In!`, `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Welcome to the <strong>Trackmeisters F1 Fantasy League</strong>!</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Your team <strong>"${data.teamName}"</strong> has been successfully registered.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">We'll be in touch soon via WhatsApp with league details and how to start building your dream team. Get ready to compete!</p>
            `);
        } else if (type === 'listing-request') {
            userSubject = `We received your classifieds listing request - Trackmeisters`;
            userHtml = createEmailTemplate('Listing Request Received', `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Thanks for submitting your <strong>${data.category === 'product' ? 'Performance Part' : 'Car'}</strong> listing for <strong>${data.title}</strong> to Trackmeisters Classifieds.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;"><strong>Listing ID:</strong> ${data.listingId}</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Your listing is currently under review by our admin team. You will receive another email once the listing is approved and published on our platform.</p>
            `);
        } else if (type === 'listing-approval') {
            userSubject = `Your listing is approved! - Trackmeisters`;
            userHtml = createEmailTemplate('Listing Approved!', `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Great news! Your listing for <strong>${data.title}</strong> has been approved and is now live on Trackmeisters Classifieds.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">You can now view your listing on our platform.</p>
            `);
        } else if (type === 'listing-rejection') {
            userSubject = `Update on your listing request - Trackmeisters`;
            userHtml = createEmailTemplate('Listing Update', `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">We have reviewed your listing request for <strong>${data.title}</strong>.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Unfortunately, we cannot approve your listing at this time for the following reason:</p>
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #E60000; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin:0; color: #444;">${data.rejectionReason}</p>
                </div>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">If you have any questions or would like to submit a revised listing, please reply to this email.</p>
            `);
        } else {
            userSubject = `Registration Confirmed: ${data.event || 'Event'}`;
            
            const excludedKeys = [
                'name', 'event', 'eventId', 'status', 'createdAt', 
                'metadata', 'payment_metadata', 'paymentScreenshot', 
                'visitorCounts', 'vehicleImages', 'vehicleRC', 'vehicleInsurance'
            ];

            const detailsList = Object.entries(data)
                .filter(([key, value]) => {
                    if (excludedKeys.includes(key)) return false;
                    if (value === '' || value === null || value === undefined) return false;
                    if (Array.isArray(value) && value.length === 0) return false;
                    return true;
                })
                .map(([key, value]) => {
                    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                    let displayValue = value;
                    
                    if (key === 'selectedClasses' && Array.isArray(value)) {
                        displayValue = value.map(cls => {
                            if (cls.count) return `${cls.name} (x${cls.count})`;
                            return cls.name || cls.subclass || JSON.stringify(cls);
                        }).join(', ');
                    } else if (Array.isArray(value)) {
                        displayValue = value.join(', ');
                    } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value);
                    } else if (typeof value === 'boolean') {
                        displayValue = value ? 'Yes' : 'No';
                    }

                    return `<li style="margin-bottom: 10px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 8px;"><strong>${formattedKey}:</strong> ${displayValue}</li>`;
                })
                .join('');

            userHtml = createEmailTemplate('Registration Confirmed!', `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name || 'Enthusiast'}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">Your registration for <strong>${data.event || 'the event'}</strong> has been received successfully.</p>
                
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 25px; border-radius: 8px; margin: 30px 0;">
                    <h3 style="margin-top: 0; color: #111; font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 12px; margin-bottom: 15px;">Registration Summary</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
                        ${detailsList}
                    </ul>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #444;">We look forward to seeing you at the event! If you have any questions, simply reply to this email.</p>
            `);
        }

        try {
            await mg.messages.create(domain, {
                from: `Trackmeisters <contact@trackmeisters.in>`,
                to: [data.email],
                subject: userSubject,
                html: userHtml,
                text: `Hi ${data.name}, thank you for your submission. We will be in touch shortly.`,
                'h:Reply-To': 'vinay@trackmeisters.in'
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
