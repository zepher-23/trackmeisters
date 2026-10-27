import FormData from 'form-data';
import Mailgun from 'mailgun.js';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: CORS_HEADERS,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: 'Method Not Allowed'
        };
    }

    try {
        console.log('Processing submission request via Mailgun...');
        const rawBody = event.isBase64Encoded
            ? Buffer.from(event.body || '', 'base64').toString('utf-8')
            : (event.body || '{}');
        const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody || {});
        const { type, data } = body;
        console.log(`Type: ${type}`, data);

        // Validate environment variables
        const { MAILGUN_API_KEY, MAILGUN_DOMAIN, EMAIL_TO } = process.env;

        if (!MAILGUN_API_KEY || !EMAIL_TO) {
            console.error('CRITICAL: Missing Mailgun configuration');
            return {
                statusCode: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
            // Block email dispatch for legacy manual screenshot payments
            const isLegacyManualPayment = (
                data.status === 'payment_uploaded' ||
                (data.paymentScreenshot && typeof data.paymentScreenshot === 'string' && data.paymentScreenshot.startsWith('http') && !data.razorpayPaymentId && !data.paymentId)
            );
            if (isLegacyManualPayment) {
                console.warn(`[submit-form] Blocked confirmation email for legacy payment registration: ${data.registrationId || 'unknown'}`);
                return {
                    statusCode: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Manual payment verification has been discontinued. Please pay via Razorpay.' })
                };
            }

            const eventTitle = data.event || 'Trackmeisters Event';
            const eventDate = data.eventDate || 'TBA';
            const eventVenue = data.eventVenue || 'TBA';
            const paymentId = data.razorpayPaymentId || 'N/A';
            const orderId = data.razorpayOrderId || 'N/A';
            const amountPaid = data.amountPaid || data.totalAmount || 'Paid';
            const paymentMethod = data.paymentMethod || 'Razorpay';

            let formattedClasses = 'None';
            if (Array.isArray(data.selectedClasses) && data.selectedClasses.length > 0) {
                formattedClasses = data.selectedClasses.map(cls => {
                    if (typeof cls === 'string') return cls;
                    if (cls.count) return `${cls.name} (x${cls.count})`;
                    return cls.name || cls.subclass || JSON.stringify(cls);
                }).join(', ');
            } else if (data.selectedClasses) {
                formattedClasses = String(data.selectedClasses);
            }

            const regType = data.type || (
                data.event === 'Experience Lap Run' || (Array.isArray(data.selectedClasses) && data.selectedClasses.some(c => (c.name || '').includes('Integra') || (c.name || '').includes('Skyline')))
                    ? 'Experience'
                    : (data.event === 'Visitor Pass' || (Array.isArray(data.selectedClasses) && data.selectedClasses.some(c => (c.name || '').includes('Pass') || (c.name || '').includes('Access')))
                        ? 'Visitor'
                        : 'Participant')
            );
            const isVisitor = regType === 'Visitor' || data.event === 'Visitor Pass';
            const isExperience = regType === 'Experience' || data.event === 'Experience Lap Run';

            let greeting = `Hi <strong>${data.name || 'Enthusiast'}</strong>,`;
            let introText = `Your registration for <strong>${eventTitle}</strong> has been confirmed. Below are your event, payment, and entry details:`;

            if (isVisitor) {
                userSubject = `Visitor Pass Confirmed: ${eventTitle}`;
                greeting = `Hi <strong>${data.name || 'Spectator'}</strong>,`;
                introText = `Your Visitor Pass booking for <strong>${eventTitle}</strong> has been confirmed. Below are your pass, payment, and venue access details:`;
            } else if (isExperience) {
                userSubject = `Experience Lap Confirmed: ${eventTitle}`;
                greeting = `Hi <strong>${data.name || 'Enthusiast'}</strong>,`;
                introText = `Experience legendary Japanese performance cars from the passenger seat, with a professional driver taking you for one exciting lap around GP1 Performance Zone! Below are your booking, timing slots, and safety details:`;
            } else {
                userSubject = `Registration Confirmed: ${eventTitle}`;
                greeting = `Hi <strong>${data.name || 'Driver'}</strong>,`;
                introText = `Your driver registration for <strong>${eventTitle}</strong> has been confirmed. Below are your competition class, vehicle, payment, and entry details:`;
            }

            const eventBox = `
                <div style="background: linear-gradient(135deg, #0a2846 0%, #02233f 100%); border-radius: 8px; padding: 20px; color: #ffffff; margin: 25px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #00f0ff; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Event Details</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 6px 0; color: #88a4c3; width: 90px; font-weight: 600;">Event</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 700; font-size: 15px;">${eventTitle}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #88a4c3; font-weight: 600;">Date</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${eventDate}</td>
                        </tr>
                        ${isVisitor ? `
                        <tr>
                            <td style="padding: 6px 0; color: #88a4c3; font-weight: 600;">Timings</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">11:00 AM – 6:00 PM</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 6px 0; color: #88a4c3; font-weight: 600;">Venue</td>
                            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${isExperience ? 'GP1 Performance Zone' : eventVenue}</td>
                        </tr>
                    </table>
                </div>
            `;

            const paymentBox = `
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px 25px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="margin-top: 0; color: #111; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 12px;">Payment Information</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Payment Status:</strong> <span style="color: #16a34a; font-weight: 700;">Paid & Verified</span></li>
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Payment Method:</strong> ${paymentMethod}</li>
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Payment ID:</strong> ${paymentId}</li>
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Order ID:</strong> ${orderId}</li>
                        <li style="margin-bottom: 4px; padding-top: 4px;"><strong>Amount Paid:</strong> <span style="font-weight: 800; font-size: 16px; color: #111;">${amountPaid}</span></li>
                    </ul>
                </div>
            `;

            let detailsBox = '';
            if (isVisitor) {
                detailsBox = `
                    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px 25px; border-radius: 8px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #111; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 12px;">Visitor Pass Details</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Pass ID:</strong> ${data.registrationId || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Pass Type & Quantity:</strong> <span style="font-weight: 700; color: #0284c7;">${formattedClasses}</span></li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Visitor Hours:</strong> <span style="font-weight: 700; color: #16a34a;">11:00 AM – 6:00 PM</span></li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Name:</strong> ${data.name || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Phone:</strong> ${data.phone || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Email:</strong> ${data.email || 'N/A'}</li>
                            ${data.gender ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Gender:</strong> ${data.gender}</li>` : ''}
                            ${data.address ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Address:</strong> ${data.address}</li>` : ''}
                            ${data.instagramId ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Instagram:</strong> ${data.instagramId}</li>` : ''}
                        </ul>
                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 6px; margin-top: 15px; font-size: 13px; color: #166534; line-height: 1.5;">
                            <strong>Spectator Entry Notice:</strong> Visitor entry is permitted between <strong>11:00 AM and 6:00 PM</strong>. Please present this confirmation email (or Pass ID: <strong>${data.registrationId || 'N/A'}</strong>) along with a valid photo ID at the spectator registration desk at the venue entrance to claim your access wristband.
                        </div>
                    </div>
                `;
            } else if (isExperience) {
                detailsBox = `
                    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px 25px; border-radius: 8px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #111; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 12px;">Experience Lap Details</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Booking ID:</strong> ${data.registrationId || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Selected Experience:</strong> <span style="font-weight: 700; color: #e11d48;">${formattedClasses}</span></li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Track Venue:</strong> <span style="font-weight: 700; color: #111;">GP1 Performance Zone</span></li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Passenger Name:</strong> ${data.name || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Phone:</strong> ${data.phone || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Email:</strong> ${data.email || 'N/A'}</li>
                            ${data.gender ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Gender:</strong> ${data.gender}</li>` : ''}
                            ${data.emergencyContact ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Emergency Contact:</strong> ${data.emergencyContact}</li>` : ''}
                            ${data.address ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Address:</strong> ${data.address}</li>` : ''}
                            ${data.instagramId ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Instagram:</strong> ${data.instagramId}</li>` : ''}
                        </ul>
                        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-left: 4px solid #e11d48; padding: 14px 18px; border-radius: 6px; margin-top: 15px; font-size: 13px; color: #9f1239; line-height: 1.6;">
                            <div style="background-color: #ffe4e6; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-weight: 800; color: #9f1239; font-size: 12px;">
                                ⚠️ IMPORTANT: THIS IS A PASSENGER EXPERIENCE ONLY. YOU WILL NOT DRIVE THE CAR.
                            </div>
                            <strong style="color: #be123c; font-size: 14px;">Experience Lap Information & Safety:</strong><br/>
                            • <strong>Passenger ride only:</strong> Participants will not be permitted to drive the vehicle. Each booking includes one lap with a professional driver around GP1 Performance Zone.<br/>
                            • <strong>Experience Lap Timings:</strong><br/>
                            &nbsp;&nbsp;– Slot 1: 8:00 AM – 9:00 AM<br/>
                            &nbsp;&nbsp;– Slot 2: 1:00 PM – 2:00 PM<br/>
                            &nbsp;&nbsp;– Slot 3: 5:30 PM – 6:30 PM<br/>
                            <span style="font-size: 11px; color: #881337;"><em>(Additional experience laps may be accommodated during the day, subject to track availability, the competition schedule and the organiser’s discretion. All timings are tentative and may be adjusted based on event operations and safety requirements.)</em></span><br/>
                            • <strong>Helmet:</strong> Participants are encouraged to bring their own properly fitting helmet for comfort and hygiene. Helmets will also be provided at the venue if required.<br/>
                            • <strong>Safety Briefing:</strong> A mandatory safety briefing will be provided before the ride.<br/>
                            • <strong>Waiver:</strong> Digital indemnity waiver must be completed before the ride.<br/>
                            • <strong>Dress Code:</strong> Closed-toe shoes and comfortable clothing required.
                        </div>
                    </div>
                `;
            } else {
                const driverPhoto = data.driverPhoto || data.driverPhotoLink || '';
                detailsBox = `
                    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px 25px; border-radius: 8px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #111; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 12px;">Driver & Vehicle Details</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Registration ID:</strong> ${data.registrationId || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Competition Class:</strong> <span style="font-weight: 700; color: #0284c7;">${formattedClasses}</span></li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Driver Name:</strong> ${data.name || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Phone:</strong> ${data.phone || 'N/A'}</li>
                            <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Email:</strong> ${data.email || 'N/A'}</li>
                            ${data.gender ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Gender:</strong> ${data.gender}</li>` : ''}
                            ${data.carModel ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Car Model:</strong> ${data.carModel}</li>` : ''}
                            ${data.registrationNumber ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Registration Number:</strong> ${data.registrationNumber}</li>` : ''}
                            ${data.engineDisplacement ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Engine Displacement:</strong> ${data.engineDisplacement} cc</li>` : ''}
                            ${data.isRaceBuild ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Build Type:</strong> Race Build Vehicle</li>` : ''}
                            ${data.teamName ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Team / Tuner:</strong> ${data.teamName}</li>` : ''}
                            ${data.fmsciLicense ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>FMSCI License:</strong> ${data.fmsciLicense}</li>` : ''}
                            ${data.emergencyContact ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Emergency Contact:</strong> ${data.emergencyContact}</li>` : ''}
                            ${data.address ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Address:</strong> ${data.address}</li>` : ''}
                            ${data.instagramId ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Instagram:</strong> ${data.instagramId}</li>` : ''}
                            ${driverPhoto ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Driver Photo:</strong> <a href="${driverPhoto}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600;">View Uploaded Photo</a></li>` : ''}
                            ${data.vehicleRC ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Vehicle RC:</strong> <a href="${data.vehicleRC}" target="_blank" style="color: #0284c7; text-decoration: underline;">View Document</a></li>` : ''}
                            ${data.vehicleInsurance ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Insurance:</strong> <a href="${data.vehicleInsurance}" target="_blank" style="color: #0284c7; text-decoration: underline;">View Document</a></li>` : ''}
                        </ul>
                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 6px; margin-top: 15px; font-size: 13px; color: #166534; line-height: 1.5;">
                            <strong>Driver Scrutineering Notice:</strong><br/>
                            • Driver briefing and vehicle safety scrutineering are mandatory before going out on track.<br/>
                            • Please bring your valid Driving License, FMSCI License, vehicle RC & Insurance, and ISI/DOT/ECE approved helmet.
                        </div>
                    </div>
                `;
            }

            userHtml = createEmailTemplate('Registration Confirmed!', `
                <p style="font-size: 16px; line-height: 1.6; color: #444;">${greeting}</p>
                <p style="font-size: 16px; line-height: 1.6; color: #444;">${introText}</p>
                ${eventBox}
                ${paymentBox}
                ${detailsBox}
                <p style="font-size: 16px; line-height: 1.6; color: #444;">We look forward to seeing you at the track! If you have any questions or need assistance, simply reply directly to this email.</p>
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
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `${type} submission received successfully!` })
        };

    } catch (error) {
        console.error('Submission error:', error);
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to process submission', details: error.message })
        };
    }
};
