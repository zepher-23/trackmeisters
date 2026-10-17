import crypto from 'crypto';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, runTransaction } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyBaaE7Stnch4mwXHDVlKxFKaJpPTPVWPVI',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'vinay-e2aa5.firebaseapp.com',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'vinay-e2aa5',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'vinay-e2aa5.firebasestorage.app',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '336865621849',
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '1:336865621849:web:851b6fa002b34b4c61fe48'
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Razorpay-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// --- EMAIL TEMPLATE GENERATOR ---
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

// --- SEND CONFIRMATION EMAIL VIA MAILGUN ---
const sendConfirmationEmail = async (data) => {
    const { MAILGUN_API_KEY, MAILGUN_DOMAIN, EMAIL_TO } = process.env;
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
        console.warn('Mailgun configuration missing in webhook environment. Skipping email.');
        return;
    }

    try {
        const mailgun = new Mailgun(FormData);
        const mg = mailgun.client({
            username: 'api',
            key: MAILGUN_API_KEY,
            url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
        });

        const eventTitle = data.event || 'Trackmeisters Event';
        const eventDate = data.eventDate || 'TBA';
        const eventVenue = data.eventVenue || 'TBA';
        const paymentId = data.razorpayPaymentId || 'N/A';
        const orderId = data.razorpayOrderId || 'N/A';
        const amountPaid = data.amountPaid || data.totalAmount || 'Paid';
        const paymentMethod = data.paymentMethod || 'Razorpay Live';

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
                : (data.event === 'Visitor Pass' || (Array.isArray(data.selectedClasses) && data.selectedClasses.some(c => (c.name || '').includes('Pass')))
                    ? 'Visitor'
                    : 'Participant')
        );
        const isVisitor = regType === 'Visitor' || data.event === 'Visitor Pass';
        const isExperience = regType === 'Experience' || data.event === 'Experience Lap Run';

        let userSubject = `Registration Confirmed: ${eventTitle}`;
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
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Name:</strong> ${data.name || 'N/A'}</li>
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Phone:</strong> ${data.phone || 'N/A'}</li>
                        <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Email:</strong> ${data.email || 'N/A'}</li>
                        ${data.gender ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Gender:</strong> ${data.gender}</li>` : ''}
                        ${data.address ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Address:</strong> ${data.address}</li>` : ''}
                        ${data.instagramId ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Instagram:</strong> ${data.instagramId}</li>` : ''}
                    </ul>
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 6px; margin-top: 15px; font-size: 13px; color: #166534; line-height: 1.5;">
                        <strong>Spectator Entry Notice:</strong> Please present this confirmation email (or Pass ID: <strong>${data.registrationId || 'N/A'}</strong>) along with a valid photo ID at the spectator registration desk at the venue entrance to claim your access wristband.
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

        const userHtml = createEmailTemplate('Registration Confirmed!', `
            <p style="font-size: 16px; line-height: 1.6; color: #444;">${greeting}</p>
            <p style="font-size: 16px; line-height: 1.6; color: #444;">${introText}</p>
            ${eventBox}
            ${paymentBox}
            ${detailsBox}
            <p style="font-size: 16px; line-height: 1.6; color: #444;">We look forward to seeing you at the track! If you have any questions or need assistance, simply reply directly to this email.</p>
        `);

        if (data.email) {
            await mg.messages.create(MAILGUN_DOMAIN, {
                from: 'Trackmeisters <contact@trackmeisters.in>',
                to: [data.email],
                subject: userSubject,
                html: userHtml,
                text: `Hi ${data.name}, your registration for ${eventTitle} is confirmed! Payment ID: ${paymentId}.`,
                'h:Reply-To': 'vinay@trackmeisters.in'
            });
            console.log(`Confirmation email sent successfully to ${data.email}`);
        }

        if (EMAIL_TO && EMAIL_TO !== data.email) {
            await mg.messages.create(MAILGUN_DOMAIN, {
                from: 'Trackmeisters Web <contact@trackmeisters.in>',
                to: [EMAIL_TO],
                subject: `[${regType.toUpperCase()} - Razorpay] Confirmed: ${eventTitle} - ${data.name}`,
                html: userHtml,
                text: `Confirmed ${regType} registration from ${data.name} for ${eventTitle}. Payment ID: ${paymentId}.`,
                'h:Reply-To': data.email
            });
            console.log(`Admin notification sent to ${EMAIL_TO}`);
        }
    } catch (err) {
        console.error('Error sending webhook confirmation email:', err);
    }
};

// --- SYNC TO GOOGLE SHEETS ---
const syncToGoogleSheets = async (data) => {
    try {
        const isExperience = data.type === 'Experience' || data.event === 'Experience Lap Run' || (Array.isArray(data.selectedClasses) && data.selectedClasses.some(c => c.name?.includes('Integra') || c.name?.includes('Skyline')));
        const isVisitor = !isExperience && data.type === 'Visitor';
        
        let webhookUrl = process.env.MAIN_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxTWnn-ydXQU9YmHoKrZRWR3uOAAodsLNtu1PXNSG1DuA5D4Y8bfvCJQZjBT0t0uZhr/exec';
        if (isExperience) {
            webhookUrl = process.env.EXPERIENCE_WEBHOOK_URL || process.env.VISITOR_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec';
        } else if (isVisitor) {
            webhookUrl = process.env.VISITOR_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec';
        }

        const driverPhotoUrl = data.driverPhoto || data.driverPhotoLink || '';

        let sheetData;
        if (isExperience) {
            sheetData = {
                timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                registrationId: data.registrationId || '',
                name: data.name || '',
                phoneNo: data.phone || '',
                email: data.email || '',
                gender: data.gender || '',
                event: data.event || 'Experience Lap Run',
                type: 'Experience',
                selectedClasses: Array.isArray(data.selectedClasses)
                    ? data.selectedClasses.map(c => `${c.name} (x${c.count || 1})`).join('; ')
                    : (data.selectedClasses || ''),
                totalAmount: data.totalAmount || data.amountPaid || '',
                status: 'confirmed',
                emergContact: data.emergencyContact || '',
                address: data.address || '',
                paymentScreenshot: 'razorpay_verified',
                comments: data.comments || ''
            };
        } else if (isVisitor) {
            sheetData = {
                timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                registrationId: data.registrationId || '',
                name: data.name || '',
                phoneNo: data.phone || '',
                email: data.email || '',
                gender: data.gender || '',
                event: data.event || 'Visitor Pass',
                type: 'Visitor',
                selectedClasses: Array.isArray(data.selectedClasses)
                    ? data.selectedClasses.map(c => `${c.name} (x${c.count || 1})`).join('; ')
                    : (data.selectedClasses || ''),
                totalAmount: data.totalAmount || data.amountPaid || '',
                status: 'confirmed',
                paymentScreenshot: 'razorpay_verified'
            };
        } else {
            const driverComments = [
                driverPhotoUrl ? `Driver Photo: ${driverPhotoUrl}` : '',
                data.comments || ''
            ].filter(Boolean).join(' | ');

            sheetData = {
                timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                registrationId: data.registrationId || '',
                phoneNo: data.phone || '',
                name: data.name || '',
                fmsciLicense: data.fmsciLicense || '',
                teamTuner: data.teamName || '',
                vehicle: data.carModel || '',
                selectedClasses: Array.isArray(data.selectedClasses)
                    ? data.selectedClasses.map(c => c.subclass || c.name).join('; ')
                    : (data.selectedClasses || ''),
                totalAmount: data.totalAmount || data.amountPaid || '',
                status: 'confirmed',
                email: data.email || '',
                gender: data.gender || '',
                address: data.address || '',
                emergContact: data.emergencyContact || '',
                type: data.type || 'Participant',
                engine: data.engineDisplacement || '',
                regNo: data.registrationNumber || '',
                isRaceBuild: data.isRaceBuild ? 'Yes' : 'No',
                driverPhoto: driverPhotoUrl,
                driverPhotoLink: driverPhotoUrl,
                'Driver Photo': driverPhotoUrl,
                'Driver Photo Link': driverPhotoUrl,
                rcLink: data.vehicleRC || '',
                insuranceLink: data.vehicleInsurance || '',
                vehicleImages: driverPhotoUrl || (Array.isArray(data.vehicleImages) ? data.vehicleImages.join(', ') : (data.vehicleImages || '')),
                paymentScreenshot: data.paymentScreenshot || 'razorpay_verified',
                comments: driverComments || data.comments || ''
            };
        }

        const res = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(sheetData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        console.log(`Google Sheets sync status: ${res.status}`);
    } catch (err) {
        console.error('Error syncing webhook data to Google Sheets:', err);
    }
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
    }

    try {
        const rawBody = event.isBase64Encoded
            ? Buffer.from(event.body || '', 'base64').toString('utf8')
            : (event.body || '');

        const signature = event.headers['x-razorpay-signature'] || event.headers['X-Razorpay-Signature'];

        // Verify webhook signature if secret configured
        const secretsToTry = [
            process.env.RAZORPAY_WEBHOOK_SECRET,
            process.env.RAZORPAY_LIVE_SECRET,
            process.env.RAZORPAY_TEST_SECRET
        ].filter(Boolean);

        if (secretsToTry.length > 0 && signature) {
            let isValid = false;
            for (const secret of secretsToTry) {
                const expectedSignature = crypto.createHmac('sha256', secret.trim()).update(rawBody).digest('hex');
                if (expectedSignature === signature) {
                    isValid = true;
                    break;
                }
            }

            if (!isValid) {
                console.warn('[Webhook] Razorpay signature mismatch.');
                return {
                    statusCode: 400,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'Signature verification failed' })
                };
            }
        }

        const body = JSON.parse(rawBody || '{}');
        const eventType = body.event;
        console.log(`[Webhook] Received Razorpay event: ${eventType}`);

        // Only process 'payment.captured' (standard for successful payments).
        // Razorpay triggers both 'payment.captured' and 'order.paid' concurrently for a single transaction.
        // Processing only 'payment.captured' guarantees exactly one execution per payment.
        if (eventType !== 'payment.captured') {
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: `Ignored event: ${eventType}` })
            };
        }

        const payment = body.payload?.payment?.entity;
        const order = body.payload?.order?.entity;
        const notes = payment?.notes || order?.notes || {};

        const docId = notes.docId;
        const registrationId = notes.registrationId || order?.receipt || payment?.notes?.registrationId;
        const paymentId = payment?.id || 'N/A';
        const orderId = payment?.order_id || order?.id || 'N/A';
        const amountInPaise = payment?.amount || order?.amount || 0;
        const amountInRupees = (amountInPaise / 100).toFixed(0);
        const paymentMethod = payment?.method ? `Razorpay ${payment.method.toUpperCase()}` : 'Razorpay Live';

        console.log(`[Webhook] Processing payment: ${paymentId}, Order: ${orderId}, RegId: ${registrationId}, DocId: ${docId}, Amount: ₹${amountInRupees}`);

        let targetDocRef = null;
        let existingData = null;

        if (docId) {
            const dRef = doc(db, 'registrations', docId);
            const dSnap = await getDoc(dRef);
            if (dSnap.exists()) {
                targetDocRef = dRef;
                existingData = dSnap.data();
            }
        }

        // Fallback: search by registrationId if docId wasn't found
        if (!targetDocRef && registrationId) {
            const q = query(collection(db, 'registrations'), where('registrationId', '==', registrationId));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
                targetDocRef = qSnap.docs[0].ref;
                existingData = qSnap.docs[0].data();
            }
        }

        const updatePayload = {
            status: 'confirmed',
            paymentScreenshot: 'razorpay_verified',
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            paymentMethod: paymentMethod,
            amountPaid: `₹${amountInRupees}`,
            totalAmount: existingData?.totalAmount || `₹${amountInRupees}`,
            confirmedVia: 'razorpay_webhook',
            confirmedAt: new Date().toISOString(),
            sheetsSynced: true
        };

        let fullConfirmedData = null;
        let shouldSync = false;

        const isParticipant = (existingData?.type === 'Participant') || (notes.type === 'Participant') || (!existingData?.type && !notes.type && (existingData?.event || notes.event) !== 'Visitor Pass' && (existingData?.event || notes.event) !== 'Experience Lap Run');

        if (targetDocRef) {
            await runTransaction(db, async (transaction) => {
                const freshSnap = await transaction.get(targetDocRef);
                if (!freshSnap.exists()) return;
                const freshData = freshSnap.data();
                if (freshData.sheetsSynced || freshData.status === 'confirmed') {
                    console.log(`[Webhook] Registration ${registrationId || docId} is already confirmed or synced. Skipping duplicate actions.`);
                    return;
                }
                transaction.update(targetDocRef, updatePayload);
                shouldSync = true;
                fullConfirmedData = { ...freshData, ...updatePayload };
            });

            if (!shouldSync || !fullConfirmedData) {
                return {
                    statusCode: 200,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ message: 'Already confirmed or synced', registrationId })
                };
            }

            if (isParticipant && !fullConfirmedData.driverPhoto && notes.driverPhoto) {
                fullConfirmedData.driverPhoto = notes.driverPhoto;
                fullConfirmedData.driverPhotoLink = notes.driverPhoto;
            }
            console.log(`[Webhook] Successfully updated registration document in Firestore.`);
        } else {
            // Document didn't exist yet: create it as confirmed directly
            const newDoc = {
                registrationId: registrationId || `RZP-${Date.now().toString().slice(-6)}`,
                name: notes.name || payment?.email || (notes.type === 'Visitor' ? 'Spectator' : 'Participant'),
                email: notes.email || payment?.email || '',
                phone: notes.phone || payment?.contact || '',
                event: notes.event || 'Trackmeisters Event',
                totalAmount: `₹${amountInRupees}`,
                type: notes.type || 'Participant',
                createdAt: new Date().toISOString(),
                ...updatePayload,
                sheetsSynced: true
            };
            if (isParticipant && notes.driverPhoto) {
                newDoc.driverPhoto = notes.driverPhoto;
                newDoc.driverPhotoLink = notes.driverPhoto;
            }
            const createdRef = await addDoc(collection(db, 'registrations'), newDoc);
            fullConfirmedData = { id: createdRef.id, ...newDoc };
            shouldSync = true;
            console.log(`[Webhook] Created new confirmed registration document in Firestore: ${createdRef.id}`);
        }

        // Sync to Google Sheets (executed exactly once)
        await syncToGoogleSheets(fullConfirmedData);

        // Send confirmation email (executed exactly once)
        await sendConfirmationEmail(fullConfirmedData);

        // Media Registration Sync if opted in
        if (existingData?.optInMedia && existingData?.mediaSelections) {
            try {
                const mediaPayload = {
                    timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    registrationId: fullConfirmedData.registrationId,
                    name: fullConfirmedData.name,
                    phoneNo: fullConfirmedData.phone,
                    event: fullConfirmedData.event,
                    totalMediaAmount: existingData.totalMediaAmount || 0,
                    mediaSelections: existingData.formattedMediaSelections || '',
                    vehicleImages: fullConfirmedData.vehicleImages?.join(', ') || '',
                    status: 'confirmed',
                    paymentMethod: paymentMethod,
                    confirmedVia: 'razorpay_webhook'
                };
                await addDoc(collection(db, 'media_registrations'), mediaPayload);

                const mediaWebhookUrl = process.env.MEDIA_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzZZZpqq0qBq3PJ7ejX2XA2TfJKTA1cH-NJBkFxc2WsLUc2ZW3DiDMZ34YAgSvzB3JjTA/exec';
                await fetch(mediaWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(mediaPayload)
                });
                console.log('[Webhook] Media registration recorded and synced.');
            } catch (mediaErr) {
                console.error('Error syncing media in webhook:', mediaErr);
            }
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                message: 'Webhook processed and registration recorded successfully',
                registrationId: fullConfirmedData.registrationId
            })
        };

    } catch (error) {
        console.error('[Webhook] Error handling Razorpay webhook:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
