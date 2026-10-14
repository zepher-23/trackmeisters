import crypto from 'crypto';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
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

        let formattedClasses = 'None';
        if (Array.isArray(data.selectedClasses) && data.selectedClasses.length > 0) {
            formattedClasses = data.selectedClasses.map(cls => {
                if (cls.count) return `${cls.name} (x${cls.count})`;
                return cls.name || cls.subclass || JSON.stringify(cls);
            }).join(', ');
        } else if (data.selectedClasses) {
            formattedClasses = String(data.selectedClasses);
        }

        const excludedKeys = [
            'name', 'email', 'event', 'eventId', 'eventDate', 'eventVenue',
            'status', 'createdAt', 'metadata', 'payment_metadata', 'paymentScreenshot',
            'visitorCounts', 'vehicleImages', 'vehicleRC', 'vehicleInsurance', 'driverPhoto',
            'razorpayPaymentId', 'razorpayOrderId', 'paymentMethod', 'amountPaid', 'totalAmount',
            'selectedClasses', 'registrationId', 'isRaceBuild', 'confirmedVia', 'confirmedAt'
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
                if (Array.isArray(value)) displayValue = value.join(', ');
                else if (typeof value === 'object') displayValue = JSON.stringify(value);
                else if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                return `<li style="margin-bottom: 10px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 8px;"><strong>${formattedKey}:</strong> ${displayValue}</li>`;
            })
            .join('');

        const paymentId = data.razorpayPaymentId || 'N/A';
        const orderId = data.razorpayOrderId || 'N/A';
        const amountPaid = data.amountPaid || data.totalAmount || 'Paid';
        const paymentMethod = data.paymentMethod || 'Razorpay Live';

        const userHtml = createEmailTemplate('Registration Confirmed!', `
            <p style="font-size: 16px; line-height: 1.6; color: #444;">Hi <strong>${data.name || 'Enthusiast'}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #444;">Your registration for <strong>${eventTitle}</strong> has been confirmed. Below are your event, payment, and entry details:</p>
            
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
                        <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${eventVenue}</td>
                    </tr>
                </table>
            </div>

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

            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px 25px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #111; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 12px;">Registration Details</h3>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
                    <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Registration ID:</strong> ${data.registrationId || 'N/A'}</li>
                    <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Selected Class:</strong> ${formattedClasses}</li>
                    <li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Phone:</strong> ${data.phone || 'N/A'}</li>
                    ${data.carModel ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Car Model:</strong> ${data.carModel}</li>` : ''}
                    ${data.registrationNumber ? `<li style="margin-bottom: 8px; border-bottom: 1px dashed #e0e0e0; padding-bottom: 6px;"><strong>Registration Number:</strong> ${data.registrationNumber}</li>` : ''}
                    ${detailsList}
                </ul>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #444;">We look forward to seeing you at the track! If you have any questions or need assistance, simply reply directly to this email.</p>
        `);

        if (data.email) {
            await mg.messages.create(MAILGUN_DOMAIN, {
                from: 'Trackmeisters <contact@trackmeisters.in>',
                to: [data.email],
                subject: `Registration Confirmed: ${eventTitle}`,
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
                subject: `[UPI/Razorpay Webhook] Confirmed Registration: ${eventTitle} - ${data.name}`,
                html: userHtml,
                text: `Confirmed registration from ${data.name} for ${eventTitle}. Payment ID: ${paymentId}.`,
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
        const isVisitor = data.type === 'Visitor';
        const webhookUrl = isVisitor
            ? (process.env.VISITOR_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec')
            : (process.env.MAIN_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxTWnn-ydXQU9YmHoKrZRWR3uOAAodsLNtu1PXNSG1DuA5D4Y8bfvCJQZjBT0t0uZhr/exec');

        const sheetData = isVisitor ? {
            timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            phoneNo: data.phone || '',
            name: data.name || '',
            email: data.email || '',
            gender: data.gender || '',
            type: 'Visitor',
            selectedClasses: Array.isArray(data.selectedClasses)
                ? data.selectedClasses.map(c => `${c.name} (x${c.count || 1})`).join('; ')
                : (data.selectedClasses || ''),
            totalAmount: data.totalAmount || data.amountPaid || '',
            status: 'confirmed',
            paymentScreenshot: 'razorpay_verified'
        } : {
            timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
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
            driverPhoto: data.driverPhoto || '',
            driverPhotoLink: data.driverPhoto || '',
            rcLink: data.vehicleRC || '',
            insuranceLink: data.vehicleInsurance || '',
            vehicleImages: data.driverPhoto || '',
            paymentScreenshot: 'razorpay_verified',
            comments: data.comments || ''
        };

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

        if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
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

        // Idempotency check: if already confirmed, do not duplicate actions
        if (existingData && existingData.status === 'confirmed') {
            console.log(`[Webhook] Registration ${registrationId || docId} is already confirmed. Skipping duplicate actions.`);
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Already confirmed', registrationId })
            };
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
            confirmedAt: new Date().toISOString()
        };

        let fullConfirmedData = null;

        if (targetDocRef) {
            await updateDoc(targetDocRef, updatePayload);
            fullConfirmedData = { ...existingData, ...updatePayload };
            console.log(`[Webhook] Successfully updated registration document in Firestore.`);
        } else {
            // Document didn't exist yet: create it as confirmed directly
            const newDoc = {
                registrationId: registrationId || `RZP-${Date.now().toString().slice(-6)}`,
                name: notes.name || payment?.email || 'Participant',
                email: notes.email || payment?.email || '',
                phone: notes.phone || payment?.contact || '',
                event: notes.event || 'Trackmeisters Event',
                totalAmount: `₹${amountInRupees}`,
                type: notes.type || 'Participant',
                createdAt: new Date().toISOString(),
                ...updatePayload
            };
            const createdRef = await addDoc(collection(db, 'registrations'), newDoc);
            fullConfirmedData = { id: createdRef.id, ...newDoc };
            console.log(`[Webhook] Created new confirmed registration document in Firestore: ${createdRef.id}`);
        }

        // Sync to Google Sheets
        await syncToGoogleSheets(fullConfirmedData);

        // Send confirmation email
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
