import crypto from 'crypto';
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode, docId, registrationId } = body;

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

        if (generatedSignature !== razorpay_signature) {
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

        // Signature is 100% verified!
        // Now check if already confirmed by Razorpay server-side webhook
        let alreadyConfirmed = false;
        let alreadySynced = false;

        if (db && (docId || registrationId)) {
            try {
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

                if (!targetDocRef && registrationId) {
                    const q = query(collection(db, 'registrations'), where('registrationId', '==', registrationId));
                    const qSnap = await getDocs(q);
                    if (!qSnap.empty) {
                        targetDocRef = qSnap.docs[0].ref;
                        existingData = qSnap.docs[0].data();
                    }
                }

                if (existingData) {
                    if (existingData.status === 'confirmed' || existingData.sheetsSynced === true || existingData.confirmedVia === 'razorpay_webhook') {
                        alreadyConfirmed = true;
                        alreadySynced = (existingData.sheetsSynced === true);
                        console.log(`[verify-payment] Registration ${registrationId || docId} already confirmed by webhook (sheetsSynced: ${alreadySynced}).`);
                    } else if (targetDocRef) {
                        // Mark payment confirmed in Firestore immediately
                        await updateDoc(targetDocRef, {
                            status: 'confirmed',
                            paymentScreenshot: 'razorpay_verified',
                            razorpayPaymentId: razorpay_payment_id,
                            razorpayOrderId: razorpay_order_id,
                            paymentMethod: 'Razorpay Live',
                            confirmedVia: 'razorpay_verified',
                            confirmedAt: new Date().toISOString()
                        }).catch(e => console.warn('Could not mark confirmed in verify-payment:', e));
                    }
                }
            } catch (checkErr) {
                console.warn('[verify-payment] Firestore check error:', checkErr);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                verified: true,
                alreadyConfirmed,
                alreadySynced,
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id,
                message: 'Payment signature verified successfully'
            })
        };

    } catch (error) {
        console.error('Error verifying Razorpay signature:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
