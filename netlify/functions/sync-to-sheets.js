import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
        const body = JSON.parse(event.body || '{}');
        const { type, data } = body;

        if (!data) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing data in request body' })
            };
        }

        const registrationId = data.registrationId;
        const isMedia = type === 'media';

        // --- BLOCK DISCONTINUED LEGACY PAYMENT ATTEMPTS ---
        const isLegacyManualPayment = (
            data.status === 'payment_uploaded' ||
            (data.paymentScreenshot && typeof data.paymentScreenshot === 'string' && data.paymentScreenshot.startsWith('http') && !data.paymentId && !data.razorpayPaymentId)
        );

        if (isLegacyManualPayment) {
            console.warn(`[sync-to-sheets] Blocked legacy manual payment sync for ${registrationId || 'unknown'}.`);
            if (registrationId && db) {
                try {
                    let targetDocRef = null;
                    if (data.docId) {
                        targetDocRef = doc(db, 'registrations', data.docId);
                    } else {
                        const q = query(collection(db, 'registrations'), where('registrationId', '==', registrationId));
                        const qSnap = await getDocs(q);
                        if (!qSnap.empty) targetDocRef = qSnap.docs[0].ref;
                    }
                    if (targetDocRef) {
                        await updateDoc(targetDocRef, {
                            status: 'legacy_payment_rejected',
                            rejectionReason: 'Manual screenshot payment discontinued. Must pay via Razorpay Live.'
                        });
                    }
                } catch (e) {
                    console.warn('Failed to update legacy doc status:', e);
                }
            }

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Legacy payment method discontinued',
                    message: 'Manual payment screenshot upload is discontinued. Please refresh the page and complete registration via the online payment gateway.'
                })
            };
        }

        // --- SERVER-SIDE DEDUPLICATION GATE ---
        // Check Firestore directly on the server to prevent duplicate sheet rows
        if (registrationId && db) {
            try {
                let targetDocRef = null;
                let existingData = null;

                if (data.docId) {
                    const dRef = doc(db, 'registrations', data.docId);
                    const dSnap = await getDoc(dRef);
                    if (dSnap.exists()) {
                        targetDocRef = dRef;
                        existingData = dSnap.data();
                    }
                }

                if (!targetDocRef) {
                    const q = query(collection(db, 'registrations'), where('registrationId', '==', registrationId));
                    const qSnap = await getDocs(q);
                    if (!qSnap.empty) {
                        targetDocRef = qSnap.docs[0].ref;
                        existingData = qSnap.docs[0].data();
                    }
                }

                if (existingData) {
                    const alreadySynced = isMedia 
                        ? (existingData.mediaSheetsSynced === true)
                        : (existingData.sheetsSynced === true);

                    if (alreadySynced) {
                        console.log(`[sync-to-sheets] Duplicate prevented: ${type} for ${registrationId} already synced.`);
                        return {
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({ 
                                success: true, 
                                duplicate: true, 
                                skipped: true, 
                                message: `Skipped duplicate sheet sync for ${registrationId} (${type})` 
                            })
                        };
                    }

                    // Mark synced in Firestore so concurrent calls are blocked
                    if (targetDocRef) {
                        const flagUpdate = isMedia ? { mediaSheetsSynced: true } : { sheetsSynced: true };
                        await updateDoc(targetDocRef, flagUpdate).catch(err => console.warn('Could not set sync flag:', err));
                    }
                }
            } catch (dbErr) {
                console.warn('[sync-to-sheets] Firestore check error, proceeding with sync:', dbErr);
            }
        }

        let webhookUrl = '';
        if (type === 'experience') {
            webhookUrl = process.env.EXPERIENCE_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwzR6gwRzMGpGz5nk-MAfSi5_7s2Mvsvm8WmhQrc-GhvAlB2fkCcJLY9lDNjuPu4v5-/exec';
        } else if (type === 'visitor') {
            webhookUrl = process.env.VISITOR_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec';
        } else if (type === 'media') {
            webhookUrl = process.env.MEDIA_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzZZZpqq0qBq3PJ7ejX2XA2TfJKTA1cH-NJBkFxc2WsLUc2ZW3DiDMZ34YAgSvzB3JjTA/exec';
        } else {
            webhookUrl = process.env.MAIN_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxTWnn-ydXQU9YmHoKrZRWR3uOAAodsLNtu1PXNSG1DuA5D4Y8bfvCJQZjBT0t0uZhr/exec';
        }

        console.log(`Syncing ${type} registration (${registrationId || 'unknown'}) to Google Sheets...`);

        // Use global fetch (available in Node 18+)
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });

        if (response.ok && targetDocRef) {
            const flagUpdate = isMedia ? { mediaSheetsSynced: true } : { sheetsSynced: true };
            await updateDoc(targetDocRef, flagUpdate).catch(err => console.warn('Could not set sync flag:', err));
        }

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
