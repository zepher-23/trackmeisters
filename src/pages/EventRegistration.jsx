import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle, ArrowRight, Copy, Flag, ArrowUp, ArrowDown, Upload, X, FileText, ChevronRight, ChevronDown, ChevronUp, User, Camera, CreditCard, Lock, AlertTriangle, Tag } from 'lucide-react';
import { COLLECTIONS, addDocument, fetchDocument, updateDocument, listenToDocument } from '../lib/firebase';
import { useEvents } from '../hooks/useFirebase';
import { uploadFileToCloudinary } from '../lib/cloudinary';
import { submitEventRegistration } from '../lib/api';
import integraImg from '../assets/integra.webp';
import r34Img from '../assets/R34.webp';
const video1 = 'https://res.cloudinary.com/ddubpntdp/video/upload/q_auto,f_auto,w_480/v1772312053/trackmeisters/videos/Video2_msjhan.mp4';
const video2 = 'https://res.cloudinary.com/ddubpntdp/video/upload/q_auto,f_auto,w_480/v1772312038/trackmeisters/videos/Video1_fzx8p3.mp4';
const video3 = 'https://res.cloudinary.com/ddubpntdp/video/upload/q_auto,f_auto,w_480/v1772312069/trackmeisters/videos/Video2_1_tz6bqg.mp4';

const EventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const eventId = queryParams.get('eventId');
    const eventNameFromUrl = queryParams.get('event') || '';
    const mode = queryParams.get('mode'); // 'visitor', 'experience', or undefined
    const isExperience = mode === 'experience';
    const isVisitor = mode === 'visitor' || isExperience;

    // --- STATE ---
    const { data: dbEvents, loading: loadingEventsList } = useEvents();
    const activeEvents = React.useMemo(() => {
        if (!dbEvents) return [];
        return dbEvents.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
    }, [dbEvents]);

    const [eventData, setEventData] = useState(null);
    const [loadingEvent, setLoadingEvent] = useState(!!eventId);
    const [activeTab, setActiveTab] = useState(0); // Index of the currently viewed class in split view

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        event: isExperience ? 'Experience Lap Run' : (isVisitor ? 'Visitor Pass' : eventNameFromUrl),
        eventId: eventId || '',
        selectedClasses: [], // Array of { name, price, originalClass, subclass, selectionId }
        // Participant Details
        instagramId: '',
        fmsciLicense: '',
        gender: '',
        address: '',
        emergencyContact: '',
        teamName: '',
        carModel: '',
        registrationNumber: '',
        engineDisplacement: '',
        vehicleRC: '',
        vehicleInsurance: '',
        vehicleImages: [],
        driverPhoto: '',
        isRaceBuild: false,
        visitorCounts: {
            'VIP Pass': (!isExperience && isVisitor) ? 1 : 0,
            'Honda Integra Type R': isExperience ? 1 : 0,
            'Nissan Skyline R34 GT-R': 0,
            'Nissan Skyline R34': 0
        }
    });

    const [step, setStep] = useState(1); // 1: Selection, 2: Details, 3: Success
    const [registrationId, setRegistrationId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [uploadingField, setUploadingField] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [showWaiver, setShowWaiver] = useState(false);
    const [waiverAgreed, setWaiverAgreed] = useState(false);
    const [docId, setDocId] = useState(null);
    const [screenshotUploading, setScreenshotUploading] = useState(false);
    const [paymentScreenshot, setPaymentScreenshot] = useState(null);
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [razorpayLoading, setRazorpayLoading] = useState(false);
    const [razorpayVerifying, setRazorpayVerifying] = useState(false);
    const [razorpayError, setRazorpayError] = useState(null);
    const [razorpaySuccessDetails, setRazorpaySuccessDetails] = useState(null);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState('');
    const [promoError, setPromoError] = useState('');

    const SECRET_PROMO_CODES = ['TMTEST2026', 'TMADMIN', 'ZEPHER2026', 'TRACKMEISTERS2026', 'TMVIP'];

    // --- EFFECTS ---
    useEffect(() => {
        if (eventId) {
            fetchEventData();
        }
    }, [eventId]);

    useEffect(() => {
        if (isVisitor && !eventId && activeEvents.length > 0 && !eventData) {
            if (activeEvents.length === 1) {
                const event = activeEvents[0];
                setEventData(event);
                setFormData(prev => ({
                    ...prev,
                    eventId: event.id,
                    event: event.title
                }));
            }
        }
    }, [isVisitor, eventId, activeEvents, eventData]);

    useEffect(() => {
        if (isExperience) {
            setFormData(prev => ({
                ...prev,
                event: 'Experience Lap Run',
                visitorCounts: {
                    'VIP Pass': 0,
                    'Honda Integra Type R': (prev.visitorCounts?.['Honda Integra Type R'] || 0) > 0 || (prev.visitorCounts?.['Nissan Skyline R34 GT-R'] || 0) > 0 ? (prev.visitorCounts?.['Honda Integra Type R'] || 0) : 1,
                    'Nissan Skyline R34 GT-R': prev.visitorCounts?.['Nissan Skyline R34 GT-R'] || 0,
                    'Nissan Skyline R34': 0
                }
            }));
        } else if (isVisitor) {
            setFormData(prev => ({
                ...prev,
                event: 'Visitor Pass',
                visitorCounts: {
                    'VIP Pass': (prev.visitorCounts?.['VIP Pass'] || 0) > 0 ? prev.visitorCounts['VIP Pass'] : 1,
                    'Honda Integra Type R': 0,
                    'Nissan Skyline R34 GT-R': 0,
                    'Nissan Skyline R34': 0
                }
            }));
        }
    }, [isExperience, isVisitor]);

    useEffect(() => {
        if (step === 3) {
            window.scrollTo(0, 0);
        }
    }, [step]);

    // Real-time listener: As soon as UPI payment is confirmed (via server webhook or client), update UI instantly
    useEffect(() => {
        const activeDocId = docId || pendingSubmission?.docId;
        if (step === 3 && activeDocId && paymentScreenshot !== 'razorpay_verified' && paymentScreenshot !== 'free') {
            const unsubscribe = listenToDocument(COLLECTIONS.REGISTRATIONS, activeDocId, (docData) => {
                if (docData && docData.status === 'confirmed') {
                    console.log('Realtime listener detected payment confirmation for:', activeDocId);
                    setPaymentScreenshot('razorpay_verified');
                    setRazorpaySuccessDetails({
                        paymentId: docData.razorpayPaymentId || 'Verified via UPI',
                        orderId: docData.razorpayOrderId || '',
                        amount: docData.amountPaid || docData.totalAmount || ''
                    });
                }
            });
            return () => {
                if (typeof unsubscribe === 'function') unsubscribe();
            };
        }
    }, [step, docId, pendingSubmission, paymentScreenshot]);

    const fetchEventData = async () => {
        try {
            setLoadingEvent(true);
            const event = await fetchDocument(COLLECTIONS.EVENTS, eventId);
            if (event) {
                setEventData(event);

                setFormData(prev => ({
                    ...prev,
                    event: event.title,
                    eventId: eventId
                }));

                // Auto-set step if no classes
                if (!isVisitor && (!event.classes || event.classes.length === 0)) {
                    setStep(2);
                }
            }
        } catch (err) {
            console.error('Error fetching event:', err);
        } finally {
            setLoadingEvent(false);
        }
    };

    // --- HELPERS ---
    const generateUniqueId = () => {
        const eventCode = (formData.event || 'EV').substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
        const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
        return `${eventCode}-${randomDigits}`;
    };

    const parsePrice = (priceStr) => {
        if (!priceStr) return 0;
        if (typeof priceStr === 'number') return priceStr;
        if (priceStr.toString().toLowerCase().includes('free')) return 0;
        const digits = priceStr.toString().replace(/[^0-9.]/g, '');
        return parseFloat(digits) || 0;
    };

    const calculateTotal = () => {
        if (isExperience) {
            const integraTotal = (formData.visitorCounts?.['Honda Integra Type R'] || 0) * 7999;
            const skylineTotal = ((formData.visitorCounts?.['Nissan Skyline R34 GT-R'] || formData.visitorCounts?.['Nissan Skyline R34'] || 0)) * 9999;
            const total = integraTotal + skylineTotal;
            return total === 0 ? '₹0' : `₹${total}`;
        }
        if (isVisitor) {
            const vipTotal = (formData.visitorCounts?.['VIP Pass'] || 0) * 500;
            return vipTotal === 0 ? '₹0' : `₹${vipTotal}`;
        }
        const total = formData.selectedClasses.reduce((sum, cls) => sum + parsePrice(cls.price), 0);
        return total === 0 ? 'Free' : `₹${total}`;
    };

    // --- MEDIA COVERAGE STATE & HELPERS ---
    const [optInMedia, setOptInMedia] = useState(false);
    const [mediaSelections, setMediaSelections] = useState({}); // { [classId]: { fpv: boolean, photos: boolean } }
    const [mediaScreenshotUploading, setMediaScreenshotUploading] = useState(false);
    const [mediaScreenshot, setMediaScreenshot] = useState(null);
    const [openPaymentSection, setOpenPaymentSection] = useState('registration');

    const toggleMediaSelection = (classId, type) => {
        setMediaSelections(prev => {
            const current = prev[classId] || { fpv: false, photos: false };
            return {
                ...prev,
                [classId]: {
                    ...current,
                    [type]: !current[type]
                }
            };
        });
    };

    const calculateMediaTotal = () => {
        let total = 0;
        Object.values(mediaSelections).forEach(sel => {
            if (sel.fpv) total += 1500;
        });
        return total;
    };

    const getBrowserData = async () => {
        let adsBlocked = false;
        let googleScriptsBlocked = false;

        try {
            // Attempt to fetch a common ad script to detect ad blockers
            await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store'
            });
        } catch (e) {
            adsBlocked = true;
        }

        try {
            // Specifically check if the Google Scripts domain is reachable
            await fetch('https://script.google.com', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store'
            });
        } catch (e) {
            googleScriptsBlocked = true;
        }

        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            adsBlocked,
            googleScriptsBlocked,
            timestamp: new Date().toISOString()
        };
    };

    // --- HANDLERS ---
    const updateVisitorCount = (type, delta) => {
        setFormData(prev => ({
            ...prev,
            visitorCounts: {
                ...prev.visitorCounts,
                [type]: Math.max(0, (prev.visitorCounts?.[type] || 0) + delta)
            }
        }));
    };

    const toggleClassSelection = (item) => {
        setFormData(prev => {
            const exists = prev.selectedClasses.find(c => c.selectionId === item.selectionId);
            let newClasses;
            if (exists) {
                newClasses = prev.selectedClasses.filter(c => c.selectionId !== item.selectionId);
            } else {
                newClasses = [...prev.selectedClasses, item];
            }
            return { ...prev, selectedClasses: newClasses };
        });
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingField(field);
        try {
            const folder = field === 'driverPhoto' ? 'drivers' : 'documents';
            const url = await uploadFileToCloudinary(file, folder);
            if (field === 'vehicleImages') {
                setFormData(prev => ({ ...prev, vehicleImages: [...prev.vehicleImages, url] }));
            } else {
                setFormData(prev => ({ ...prev, [field]: url }));
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed');
        } finally {
            setUploadingField(null);
        }
    };

    // --- GOOGLE SHEETS WEBHOOK ---
    const postSyncToSheets = async (bodyPayload) => {
        // 1. Try direct Netlify function path (direct path on live production)
        try {
            const res = await fetch('/.netlify/functions/sync-to-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            if (res.ok) return res;
        } catch (e) {
            console.warn('Direct /.netlify/functions path error, trying /api/ path...', e);
        }

        // 2. Try /api/ proxy path (works with local dev proxy)
        try {
            const res = await fetch('/api/sync-to-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            if (res.ok) return res;
        } catch (e) {
            console.warn('/api/ path error, trying direct webhook fallback...', e);
        }

        // 3. Resilient client-side fallback directly to Google Apps Script webhook
        try {
            const fallbackUrls = {
                experience: 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec',
                visitor: 'https://script.google.com/macros/s/AKfycbxU-Yt9xYy1nIHlFnTYeW3Uzs1HAmmpqBvFi4TF1_eNSXt6dXzdYam1bt72bDoevW8qSg/exec',
                media: 'https://script.google.com/macros/s/AKfycbzZZZpqq0qBq3PJ7ejX2XA2TfJKTA1cH-NJBkFxc2WsLUc2ZW3DiDMZ34YAgSvzB3JjTA/exec',
                main: 'https://script.google.com/macros/s/AKfycbxTWnn-ydXQU9YmHoKrZRWR3uOAAodsLNtu1PXNSG1DuA5D4Y8bfvCJQZjBT0t0uZhr/exec'
            };
            const targetUrl = fallbackUrls[bodyPayload.type] || fallbackUrls.main;
            return await fetch(targetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(bodyPayload.data)
            });
        } catch (directErr) {
            console.error('All Google Sheets sync attempts failed:', directErr);
        }
    };

    const sendToGoogleSheets = async (payload) => {
        const isExp = payload.type === 'Experience' || payload.event === 'Experience Lap Run' || (Array.isArray(payload.selectedClasses) && payload.selectedClasses.some(c => c.name?.includes('Integra') || c.name?.includes('Skyline')));
        const isVis = !isExp && payload.type === 'Visitor';
        const driverPhotoUrl = payload.driverPhoto || payload.driverPhotoLink || '';
        
        let syncType = 'main';
        let syncData;

        if (isExp) {
            syncType = 'experience';
            syncData = {
                timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                registrationId: payload.registrationId || '',
                name: payload.name || '',
                phoneNo: payload.phone || '',
                email: payload.email || '',
                gender: payload.gender || '',
                event: payload.event || 'Experience Lap Run',
                type: 'Experience',
                selectedClasses: Array.isArray(payload.selectedClasses)
                    ? payload.selectedClasses.map(c => `${c.name} (x${c.count || 1})`).join('; ')
                    : (payload.selectedClasses || ''),
                totalAmount: payload.totalAmount || '',
                status: payload.status || 'confirmed',
                emergContact: payload.emergencyContact || '',
                address: payload.address || '',
                paymentScreenshot: 'razorpay_verified',
                comments: payload.comments || ''
            };
        } else if (isVis) {
            syncType = 'visitor';
            syncData = {
                timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                registrationId: payload.registrationId || '',
                name: payload.name || '',
                phoneNo: payload.phone || '',
                email: payload.email || '',
                gender: payload.gender || '',
                event: payload.event || 'Visitor Pass',
                type: 'Visitor',
                selectedClasses: Array.isArray(payload.selectedClasses)
                    ? payload.selectedClasses.map(c => `${c.name} (x${c.count || 1})`).join('; ')
                    : (payload.selectedClasses || ''),
                totalAmount: payload.totalAmount || '',
                status: payload.status || 'confirmed',
                paymentScreenshot: payload.paymentScreenshot || 'razorpay_verified'
            };
        } else {
            syncType = 'main';
            const driverComments = driverPhotoUrl || payload.comments || '';

            syncData = {
                timeStamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                registrationId: payload.registrationId || '',
                phoneNo: payload.phone || '',
                name: payload.name || '',
                fmsciLicense: payload.fmsciLicense || '',
                teamTuner: payload.teamName || '',
                vehicle: payload.carModel || '',
                selectedClasses: Array.isArray(payload.selectedClasses)
                    ? payload.selectedClasses.map(c => c.subclass || c.name).join('; ')
                    : (payload.selectedClasses || ''),
                totalAmount: payload.totalAmount || '',
                status: payload.status || 'confirmed',
                email: payload.email || '',
                gender: payload.gender || '',
                address: payload.address || '',
                emergContact: payload.emergencyContact || '',
                type: payload.type || 'Participant',
                engine: payload.engineDisplacement || '',
                regNo: payload.registrationNumber || '',
                isRaceBuild: payload.isRaceBuild ? 'Yes' : 'No',
                driverPhoto: driverPhotoUrl,
                driverPhotoLink: driverPhotoUrl,
                'Driver Photo': driverPhotoUrl,
                'Driver Photo Link': driverPhotoUrl,
                rcLink: payload.vehicleRC || '',
                insuranceLink: payload.vehicleInsurance || '',
                vehicleImages: driverPhotoUrl || (Array.isArray(payload.vehicleImages) ? payload.vehicleImages.join(', ') : (payload.vehicleImages || '')),
                paymentScreenshot: payload.paymentScreenshot || 'razorpay_verified',
                comments: driverComments || payload.comments || ''
            };
        }

        try {
            await postSyncToSheets({
                type: syncType,
                data: syncData
            });
        } catch (err) {
            console.error('Google Sheets sync error:', err);
        }
    };

    const sendMediaToGoogleSheets = async (mediaPayload) => {
        try {
            await postSyncToSheets({
                type: 'media',
                data: mediaPayload
            });
        } catch (err) {
            console.error('Media Google Sheets sync error:', err);
        }
    };

    const handleApplyPromo = () => {
        const cleaned = promoCodeInput.trim().toUpperCase();
        if (!cleaned) {
            setPromoError('Please enter a promo code');
            return;
        }
        if (SECRET_PROMO_CODES.includes(cleaned)) {
            setAppliedPromo(cleaned);
            setPromoError('');
            setRazorpayError(null);
        } else {
            setPromoError('Invalid promo code');
            setAppliedPromo('');
        }
    };

    const confirmAndSyncRegistration = async ({ paymentId, orderId, paymentMethod, payableAmount, activeDocId, alreadySyncedToSheets = false }) => {
        const payloadDoc = {
            ...pendingSubmission,
            paymentScreenshot: 'razorpay_verified',
            status: 'confirmed',
            sheetsSynced: true,
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            paymentMethod: paymentMethod,
            amountPaid: `₹${payableAmount}`,
            totalAmount: `₹${payableAmount}`,
            payment_metadata: await getBrowserData()
        };

        if (activeDocId) {
            await updateDocument(COLLECTIONS.REGISTRATIONS, activeDocId, payloadDoc);
        } else {
            const newDocId = await addDocument(COLLECTIONS.REGISTRATIONS, payloadDoc);
            setDocId(newDocId);
        }

        if (!alreadySyncedToSheets) {
            sendToGoogleSheets(payloadDoc);
        }
        submitEventRegistration(payloadDoc)
            .then(() => console.log('Registration confirmation email sent.'))
            .catch((err) => console.error('Error sending registration confirmation email:', err));

        // Save Media if opted in
        if (optInMedia && calculateMediaTotal() > 0) {
            const formattedSelections = Object.entries(mediaSelections)
                .filter(([_, sel]) => sel.fpv)
                .map(([cls, sel]) => {
                    const types = [];
                    if (sel.fpv) types.push('FPV (₹1500)');
                    return `${cls}: ${types.join(' + ')}`;
                }).join(' | ');

            const mediaPayload = {
                timeStamp: new Date().toLocaleString(),
                registrationId: pendingSubmission.registrationId,
                name: pendingSubmission.name,
                phoneNo: pendingSubmission.phone,
                event: eventData?.name || eventNameFromUrl,
                totalMediaAmount: calculateMediaTotal(),
                mediaSelections: formattedSelections,
                vehicleImages: pendingSubmission.vehicleImages?.join(', ') || '',
                status: 'confirmed',
                paymentMethod: paymentMethod
            };

            await addDocument(COLLECTIONS.MEDIA_REGISTRATIONS, mediaPayload);
            sendMediaToGoogleSheets(mediaPayload);
        }

        setPaymentScreenshot('razorpay_verified');
        setRazorpaySuccessDetails({
            paymentId: paymentId,
            orderId: orderId,
            amount: payableAmount
        });
    };

    const handlePromoConfirmation = async () => {
        if (!pendingSubmission || !appliedPromo) return;
        setRazorpayError(null);
        setRazorpayVerifying(true);
        try {
            const regTotalNum = Number(calculateTotal().replace(/[^0-9.]/g, '')) || 0;
            const mediaTotalNum = (optInMedia && calculateMediaTotal() > 0) ? calculateMediaTotal() : 0;
            const payableAmount = regTotalNum + mediaTotalNum;
            const activeDocId = pendingSubmission.docId || docId;

            await confirmAndSyncRegistration({
                paymentId: `PROMO_${appliedPromo}`,
                orderId: `ORDER_${Date.now().toString().slice(-6)}`,
                paymentMethod: `Promo Code (${appliedPromo})`,
                payableAmount: payableAmount,
                activeDocId: activeDocId,
                alreadySyncedToSheets: false
            });
        } catch (err) {
            console.error('Promo confirmation error:', err);
            setRazorpayError('Failed to confirm registration: ' + err.message);
        } finally {
            setRazorpayVerifying(false);
        }
    };

    const handleRazorpayLivePayment = async () => {
        if (!pendingSubmission) return;
        setRazorpayError(null);
        setRazorpayLoading(true);

        try {
            // Load SDK if not ready
            if (!window.Razorpay) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load Razorpay SDK. Please check your internet connection.'));
                    document.body.appendChild(script);
                });
            }

            const regTotalNum = Number(calculateTotal().replace(/[^0-9.]/g, '')) || 0;
            const mediaTotalNum = (optInMedia && calculateMediaTotal() > 0) ? calculateMediaTotal() : 0;
            const payableAmount = regTotalNum + mediaTotalNum;

            if (payableAmount <= 0) {
                alert('No payment required for this registration.');
                setRazorpayLoading(false);
                return;
            }

            const activeDocId = pendingSubmission.docId || docId;
            const orderRes = await fetch('/api/create-razorpay-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: payableAmount,
                    receipt: pendingSubmission.registrationId,
                    notes: {
                        docId: activeDocId || '',
                        registrationId: pendingSubmission.registrationId,
                        event: pendingSubmission.event || eventNameFromUrl || '',
                        name: pendingSubmission.name,
                        phone: pendingSubmission.phone,
                        email: pendingSubmission.email,
                        totalAmount: `₹${payableAmount}`,
                        type: isExperience ? 'Experience' : (isVisitor ? 'Visitor' : 'Participant'),
                        driverPhoto: (!isVisitor && !isExperience) ? (pendingSubmission.driverPhoto || formData.driverPhoto || '') : ''
                    },
                    mode: 'live'
                })
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json().catch(() => ({}));
                throw new Error(errData.error || errData.details || 'Failed to initiate Razorpay order');
            }

            const orderData = await orderRes.json();

            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'Trackmeisters',
                description: `${pendingSubmission.event || 'Trackmeisters Event'} Entry Fee`,
                order_id: orderData.order_id,
                handler: async function (response) {
                    setRazorpayLoading(false);
                    setRazorpayVerifying(true);
                    try {
                        const verifyRes = await fetch('/api/verify-razorpay-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                mode: 'live'
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok || !verifyData.verified) {
                            throw new Error(verifyData.error || 'Payment signature verification failed');
                        }

                        // Allow server webhook transaction to process first to avoid duplicate sheet rows
                        await new Promise((resolve) => setTimeout(resolve, 1500));

                        // Check if already confirmed (e.g. by server-side webhook)
                        let alreadyConfirmed = false;
                        let alreadySyncedToSheets = false;
                        if (activeDocId) {
                            try {
                                const existing = await fetchDocument(COLLECTIONS.REGISTRATIONS, activeDocId);
                                if (existing && (existing.status === 'confirmed' || existing.sheetsSynced || existing.confirmedVia === 'razorpay_webhook')) {
                                    alreadyConfirmed = true;
                                    alreadySyncedToSheets = true;
                                }
                            } catch (fErr) {
                                console.warn('Could not check existing doc status:', fErr);
                            }
                        }

                        // Payment verified! If not already confirmed by webhook, update Firestore, Sheets, and Email
                        if (!alreadyConfirmed) {
                            await confirmAndSyncRegistration({
                                paymentId: response.razorpay_payment_id,
                                orderId: response.razorpay_order_id,
                                paymentMethod: 'Razorpay Live',
                                payableAmount: payableAmount,
                                activeDocId: activeDocId,
                                alreadySyncedToSheets: alreadySyncedToSheets
                            });
                        }

                    } catch (vErr) {
                        setRazorpayError('Payment verification failed: ' + vErr.message);
                    } finally {
                        setRazorpayVerifying(false);
                    }
                },
                prefill: {
                    name: pendingSubmission.name,
                    email: pendingSubmission.email,
                    contact: pendingSubmission.phone
                },
                notes: {
                    docId: activeDocId || '',
                    registrationId: pendingSubmission.registrationId
                },
                modal: {
                    ondismiss: function () {
                        setRazorpayLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                setRazorpayLoading(false);
                setRazorpayError(`Payment failed: ${resp.error?.description || 'Transaction cancelled'} (${resp.error?.code || 'ERROR'})`);
            });
            rzp.open();

        } catch (err) {
            console.error('Razorpay Error:', err);
            setRazorpayError(err.message || 'Error launching Razorpay payment');
            setRazorpayLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!waiverAgreed) return;
        if (!isVisitor && !formData.driverPhoto) {
            setError('Please upload your Driver Photo to proceed.');
            return;
        }
        if (isExperience && !formData.emergencyContact) {
            setError('Please provide an Emergency Contact for the Experience Lap session.');
            return;
        }
        setSubmitting(true);
        setError(null);
        setShowWaiver(false);

        try {
            const newId = generateUniqueId();
            const isMeetup = eventData?.type === 'Meetup';
            const initialStatus = isMeetup ? 'confirmed' : 'pending_payment'; // Simplified

            // Visitor & Experience Lap Logic
            const visitorClasses = isExperience ?
                Object.entries(formData.visitorCounts)
                    .filter(([name, count]) => count > 0 && name !== 'VIP Pass')
                    .map(([name, count]) => {
                        let unitPrice = 7999;
                        if (name === 'Nissan Skyline R34 GT-R' || name === 'Nissan Skyline R34') unitPrice = 9999;
                        return {
                            name,
                            count,
                            price: `₹${unitPrice}`,
                            total: `₹${count * unitPrice}`
                        };
                    })
                : isVisitor ?
                Object.entries(formData.visitorCounts)
                    .filter(([name, count]) => count > 0 && name === 'VIP Pass')
                    .map(([name, count]) => ({
                        name,
                        count,
                        price: '₹500',
                        total: `₹${count * 500}`
                    }))
                : formData.selectedClasses;

            const regTotalNum = Number(calculateTotal().replace(/[^0-9.]/g, '')) || 0;
            const mediaTotalNum = (optInMedia && calculateMediaTotal() > 0) ? calculateMediaTotal() : 0;
            const payableAmount = regTotalNum + mediaTotalNum;

            let payload;
            if (isVisitor && !isExperience) {
                payload = {
                    type: 'Visitor',
                    registrationId: newId,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    gender: formData.gender,
                    address: formData.address,
                    instagramId: formData.instagramId || '',
                    event: eventData?.title || formData.event || 'Visitor Pass',
                    eventId: formData.eventId || '',
                    eventDate: eventData?.date || '',
                    eventVenue: eventData?.location || '',
                    selectedClasses: visitorClasses,
                    totalAmount: `₹${payableAmount}`,
                    status: initialStatus,
                    createdAt: new Date().toISOString(),
                    metadata: await getBrowserData()
                };
            } else if (isExperience) {
                payload = {
                    type: 'Experience',
                    registrationId: newId,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    gender: formData.gender,
                    emergencyContact: formData.emergencyContact || '',
                    address: formData.address,
                    instagramId: formData.instagramId || '',
                    event: 'Experience Lap Run',
                    eventId: formData.eventId || '',
                    eventDate: eventData?.date || '',
                    eventVenue: eventData?.location || '',
                    selectedClasses: visitorClasses,
                    totalAmount: `₹${payableAmount}`,
                    status: initialStatus,
                    createdAt: new Date().toISOString(),
                    metadata: await getBrowserData()
                };
            } else {
                payload = {
                    type: 'Participant',
                    registrationId: newId,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    gender: formData.gender,
                    address: formData.address,
                    instagramId: formData.instagramId || '',
                    emergencyContact: formData.emergencyContact || '',
                    fmsciLicense: formData.fmsciLicense || '',
                    teamName: formData.teamName || '',
                    carModel: formData.carModel || '',
                    registrationNumber: formData.registrationNumber || '',
                    engineDisplacement: formData.engineDisplacement || '',
                    isRaceBuild: !!formData.isRaceBuild,
                    driverPhoto: formData.driverPhoto || '',
                    driverPhotoLink: formData.driverPhoto || '',
                    vehicleRC: formData.vehicleRC || '',
                    vehicleInsurance: formData.vehicleInsurance || '',
                    vehicleImages: formData.vehicleImages || [],
                    optInMedia: !!optInMedia,
                    mediaSelections: optInMedia ? mediaSelections : null,
                    event: eventData?.title || formData.event || 'Trackmeisters Event',
                    eventId: formData.eventId || '',
                    eventDate: eventData?.date || '',
                    eventVenue: eventData?.location || '',
                    selectedClasses: visitorClasses,
                    totalAmount: `₹${payableAmount}`,
                    status: initialStatus,
                    createdAt: new Date().toISOString(),
                    metadata: await getBrowserData()
                };
            }

            setRegistrationId(newId);

            if (payableAmount === 0 || calculateTotal() === 'Free' || calculateTotal() === '₹0') {
                const newDocId = await addDocument(COLLECTIONS.REGISTRATIONS, {
                    ...payload,
                    status: 'confirmed',
                    paymentScreenshot: 'free'
                });
                setDocId(newDocId);
                setPaymentScreenshot('free');
                // Sync Free registrations to Sheets immediately
                sendToGoogleSheets({ ...payload, status: 'confirmed', paymentScreenshot: 'free' });
                submitEventRegistration({ ...payload, status: 'confirmed', paymentScreenshot: 'free' })
                    .then(() => console.log('Registration confirmation email sent.'))
                    .catch((err) => console.error('Error sending registration confirmation email:', err));
            } else {
                // Pre-record registration in Firestore immediately with 'pending_payment'
                // This guarantees the entry is recorded even if the user never returns from their UPI app
                const pendingDoc = {
                    ...payload,
                    status: 'pending_payment',
                    paymentScreenshot: 'pending',
                    paymentMethod: 'Razorpay Live'
                };
                const newDocId = await addDocument(COLLECTIONS.REGISTRATIONS, pendingDoc);
                setDocId(newDocId);
                setPendingSubmission({
                    ...pendingDoc,
                    docId: newDocId
                });
            }
            // If meetup/free, go straight to success? For now, standard flow.
            // If payment needed, show payment step.
            setStep(3); // Success/Payment view
            window.scrollTo({ top: 0, behavior: 'instant' });
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to submit registration.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---
    const isSelected = (id) => formData.selectedClasses.some(c => c.selectionId === id);

    const handleClassSelectMobile = (idx) => {
        if (activeTab === idx) {
            setActiveTab(null); // Toggle off if already selected
        } else {
            setActiveTab(idx);
            if (window.innerWidth < 900) {
                setTimeout(() => {
                    const detailPanel = document.getElementById(`mobile-class-${idx}`);
                    if (detailPanel) {
                        const yOffset = -80;
                        const y = detailPanel.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }, 50);
            }
        }
    };

    const isMobile = window.innerWidth < 900;

    // Add event listener to update isMobile on resize
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileView = windowWidth < 900;

    if (loadingEvent) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={40} color="var(--color-accent)" />
            </div>
        );
    }

    return (
        <div className="registration-container">
            {/* INJECTED STYLES FOR LAYOUT */}
            <style>{`
                .registration-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 120px 20px 40px 20px;
                    min-height: 100vh;
                    color: var(--color-text-primary);
                }
                .split-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 30px;
                    margin-top: 20px;
                }
                @media (min-width: 900px) {
                    .split-layout {
                        grid-template-columns: 350px 1fr;
                        align-items: start;
                    }
                    .sidebar {
                        position: sticky;
                        top: 20px;
                        max-height: calc(100vh - 40px);
                        overflow-y: auto;
                    }
                }
                .class-list-item {
                    padding: 16px 20px;
                    border-radius: 12px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .class-list-item.active {
                    background: var(--color-surface);
                    border-color: var(--color-accent);
                    border-left-width: 4px;
                }
                .class-list-item:hover:not(.active) {
                    background: rgba(255,255,255,0.03);
                }
                .detail-panel {
                    background: var(--color-surface);
                    border-radius: 20px;
                    border: 1px solid var(--color-border);
                    padding: 30px;
                    min-height: 500px;
                }
                .subclass-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                    margin-top: 20px;
                }
                .mobile-accordion-content {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-top: none;
                    border-radius: 0 0 12px 12px;
                    padding: 20px;
                    margin-top: -10px;
                    margin-bottom: 10px;
                    overflow: hidden;
                }
                .mobile-accordion-header {
                    z-index: 2;
                    position: relative;
                }
                .subclass-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .subclass-card:hover {
                    border-color: rgba(255, 255, 255, 0.4);
                }
                .subclass-card.selected {
                    background: rgba(34, 197, 94, 0.05);
                    border-color: #22c55e;
                }
                .hero-cta {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-weight: 600;
                    padding: 12px 24px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .hero-cta:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }
                .registration-container input, .registration-container select, .registration-container textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 14px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05); /* Subtle background */
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--color-text-primary);
                    font-size: 16px;
                    transition: all 0.2s ease;
                }
                .registration-container input:focus, .registration-container select:focus, .registration-container textarea:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: var(--color-accent);
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.1);
                }
                .registration-container input::placeholder, .registration-container textarea::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
                .registration-container option {
                    background: #111;
                    color: white;
                }
                .registration-container label {
                    display: block;
                    font-size: 13px;
                    color: var(--color-text-secondary);
                    margin-bottom: 6px;
                    font-weight: 500;
                }
                @media (max-width: 767px) {
                    .floating-action-wrapper {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        z-index: 100;
                    }
                    .floating-action-card {
                        background: rgba(17, 17, 17, 0.95);
                        backdrop-filter: blur(10px);
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 24px 24px 0 0;
                        padding: 20px 24px;
                        padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
                        box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                    }
                }
                @media (min-width: 768px) {
                    .floating-action-wrapper {
                        position: fixed;
                        bottom: 30px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 90%;
                        max-width: 500px;
                        z-index: 100;
                    }
                    .floating-action-card {
                        background: #111;
                        border: 1px solid #333;
                        padding: 16px 24px;
                        border-radius: 16px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    }
                }
            `}</style>

            {/* HEADER */}
            {step < 3 && (
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>
                        {step === 1 ? (isExperience ? 'Choose Your Experience' : (isVisitor ? 'Select Visitor Pass' : 'Select Your Class')) : 'Registration Details'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', maxWidth: isExperience ? '680px' : 'none', margin: '0 auto', lineHeight: '1.6' }}>
                        {step === 1
                            ? (isExperience
                                ? 'Experience legendary Japanese performance cars from the passenger seat, with a professional driver taking you for one exciting lap around GP1 Performance Zone.'
                                : 'Choose from the available categories below.')
                            : 'Please fill in your details to complete registration.'}
                    </p>
                </div>
            )}

            {/* STEP 1: SELECTION */}
            {step === 1 && (
                <div>
                    {isVisitor ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: isExperience ? '480px' : '400px', margin: '0 auto' }}>
                            {!eventId && activeEvents.length > 1 && (
                                <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                                    <label className="admin-form-label" style={{ color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>{isExperience ? 'Select Event for Experience Lap' : 'Select Event for Visitor Pass'}</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.eventId}
                                        onChange={(e) => {
                                            const event = activeEvents.find(ev => ev.id === e.target.value);
                                            if (event) {
                                                setEventData(event);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    eventId: event.id,
                                                    event: event.title
                                                }));
                                            } else {
                                                setEventData(null);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    eventId: '',
                                                    event: isExperience ? 'Experience Lap Run' : 'Visitor Pass'
                                                }));
                                            }
                                        }}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <option value="">-- Select an Event --</option>
                                        {activeEvents.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {isVisitor && !isExperience ? (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '8px', padding: '15px', color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Visitor Pass Timings</div>
                                    <div>
                                        <span>Start: 11:00 AM | End: 06:00 PM</span>
                                    </div>
                                </div>
                            ) : !isExperience && eventData && (eventData.startTime || eventData.endTime) ? (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '8px', padding: '15px', color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Event Timings</div>
                                    <div>
                                        {eventData.startTime && <span>Start: {eventData.startTime}</span>}
                                        {eventData.startTime && eventData.endTime && <span> | </span>}
                                        {eventData.endTime && <span>End: {eventData.endTime}</span>}
                                    </div>
                                </div>
                            ) : null}

                            {isExperience ? (
                                <div style={{ background: 'rgba(255, 42, 42, 0.04)', border: '1px solid rgba(255, 42, 42, 0.25)', borderRadius: '14px', padding: '18px 20px', color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6', marginBottom: '10px' }}>
                                    <div style={{ background: 'rgba(255, 42, 42, 0.14)', border: '1px solid rgba(255, 42, 42, 0.4)', color: '#ff4d4d', padding: '10px 14px', borderRadius: '8px', fontWeight: '800', fontSize: '12px', letterSpacing: '0.4px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                                        <span>IMPORTANT: THIS IS A PASSENGER EXPERIENCE ONLY. YOU WILL NOT DRIVE THE CAR.</span>
                                    </div>

                                    <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🏁 Experience Lap Information & Safety
                                    </div>

                                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '9px', color: '#cbd5e1' }}>
                                        <li><strong>Passenger ride only:</strong> Participants will not be permitted to drive the vehicle. Each booking includes one lap with a professional driver.</li>
                                        <li>
                                            <strong>Experience Lap Timings:</strong>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', margin: '6px 0' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <strong>Slot 1:</strong> 8:00 AM – 9:00 AM
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <strong>Slot 2:</strong> 1:00 PM – 2:00 PM
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <strong>Slot 3:</strong> 5:30 PM – 6:30 PM
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', display: 'block', lineHeight: '1.4', marginTop: '2px' }}>
                                                Additional experience laps may be accommodated during the day, subject to track availability, the competition schedule and the organiser’s discretion. All timings are tentative and may be adjusted based on event operations and safety requirements.
                                            </span>
                                        </li>
                                        <li><strong>Helmet:</strong> Participants are encouraged to bring their own properly fitting helmet for comfort and hygiene. Helmets will also be provided at the venue if required.</li>
                                        <li><strong>Safety:</strong> A safety briefing will be provided before the ride.</li>
                                        <li><strong>Waiver:</strong> A digital indemnity waiver must be completed before the ride.</li>
                                    </ul>
                                </div>
                            ) : null}

                            {[
                                ...(isExperience
                                    ? [
                                        {
                                            id: 'Honda Integra Type R',
                                            title: 'Honda Integra Type R',
                                            desc: 'Experience the legendary high revving VTEC as a passenger, with a professional driver taking you around GP1 Performance Zone for one exciting lap.',
                                            price: '₹7,999',
                                            priceSub: 'Price per passenger lap',
                                            badge: 'VTEC ICON',
                                            image: integraImg
                                        },
                                        {
                                            id: 'Nissan Skyline R34 GT-R',
                                            title: 'Nissan Skyline R34 GT-R',
                                            desc: 'Experience the legendary GT-R from the passenger seat as a professional driver takes you for one thrilling lap around GP1 Performance Zone.',
                                            price: '₹9,999',
                                            priceSub: 'Price per passenger lap',
                                            badge: 'GODZILLA',
                                            image: r34Img
                                        }
                                    ]
                                    : [
                                        {
                                            id: 'VIP Pass',
                                            title: 'VIP PASS',
                                            desc: 'Full spectator zone entry, 360° watch tower view, paddock entry, and pit walk. Visitor Hours: 11:00 AM – 6:00 PM.',
                                            price: '₹500',
                                            badge: 'SPECTATOR',
                                            image: null
                                        }
                                    ]
                                )
                            ].map(item => (
                                <div
                                    key={item.id}
                                    className={`subclass-card ${formData.visitorCounts[item.id] > 0 ? 'selected' : ''}`}
                                    style={{
                                        flexDirection: 'column',
                                        alignItems: 'start',
                                        gap: '16px',
                                        padding: '24px',
                                        border: formData.visitorCounts[item.id] > 0 ? '1px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.12)',
                                        background: formData.visitorCounts[item.id] > 0 ? 'rgba(255, 42, 42, 0.08)' : 'rgba(255,255,255,0.02)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {item.image && (
                                        <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                loading="lazy"
                                                decoding="async"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 75%', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#ffffff' }}>{item.title}</h3>
                                            <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(255, 42, 42, 0.15)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.5px' }}>
                                                {item.badge}
                                            </span>
                                        </div>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                            {item.desc}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff' }}>{item.price}</div>
                                            {item.priceSub && (
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{item.priceSub}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <button
                                                type="button"
                                                onClick={() => updateVisitorCount(item.id, -1)}
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)', background: 'transparent', color: 'white', cursor: 'pointer' }}
                                            >
                                                -
                                            </button>
                                            <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{formData.visitorCounts[item.id] || 0}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateVisitorCount(item.id, 1)}
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="split-layout">
                            {isMobileView ? (
                                // MOBILE ACCORDION VIEW
                                <div className="mobile-accordion-container">
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '16px', letterSpacing: '1px' }}>AVAILABLE CLASSES</div>
                                    {eventData?.classes?.map((cls, idx) => {
                                        const hasSubs = cls.subclasses?.length > 0;
                                        const selectedCount = formData.selectedClasses.filter(c => c.originalClass === cls.name).length;
                                        const isSelfSelected = !hasSubs && formData.selectedClasses.some(c => c.selectionId === cls.name);
                                        const isActive = activeTab === idx;

                                        return (
                                            <div key={idx} id={`mobile-class-${idx}`}>
                                                <div
                                                    className={`class-list-item mobile-accordion-header ${isActive ? 'active' : ''}`}
                                                    style={{ borderRadius: isActive ? '12px 12px 0 0' : '12px', marginBottom: isActive ? '0' : '10px' }}
                                                    onClick={() => handleClassSelectMobile(idx)}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '15px' }}>{cls.name}</div>
                                                        {hasSubs && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{cls.subclasses.length} Categories</div>}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {(selectedCount > 0 || isSelfSelected) && (
                                                            <div style={{ background: '#22c55e', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                                                                {hasSubs ? selectedCount : <CheckCircle size={12} />}
                                                            </div>
                                                        )}
                                                        <div style={{ transition: 'transform 0.3s', transform: isActive ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                            <ChevronRight size={18} color="var(--color-text-secondary)" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isActive && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                        >
                                                            <div className="mobile-accordion-content">
                                                                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '15px', marginBottom: '15px' }}>
                                                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                                                        {cls.description}
                                                                    </p>
                                                                </div>

                                                                {cls.requirements && (
                                                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                                            <Flag size={14} /> Requirements
                                                                        </div>
                                                                        <p style={{ fontSize: '13px', whiteSpace: 'pre-line', color: 'var(--color-text-secondary)' }}>
                                                                            {cls.requirements}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>
                                                                        {cls.subclasses?.length > 0 ? 'Select Classes' : 'Registration'}
                                                                    </div>

                                                                    {cls.subclasses?.length > 0 ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            {cls.subclasses.map((sub, sIdx) => {
                                                                                const subName = typeof sub === 'string' ? sub : sub.name;
                                                                                const subPrice = typeof sub === 'string' ? '' : sub.price;
                                                                                const subDesc = typeof sub === 'string' ? '' : sub.description;
                                                                                const id = `${cls.name}:${subName}`;
                                                                                const selected = isSelected(id);

                                                                                return (
                                                                                    <div
                                                                                        key={sIdx}
                                                                                        className={`subclass-card ${selected ? 'selected' : ''}`}
                                                                                        style={{ margin: 0 }}
                                                                                        onClick={() => toggleClassSelection({
                                                                                            name: `${cls.name} - ${subName}`,
                                                                                            selectionId: id,
                                                                                            price: subPrice,
                                                                                            originalClass: cls.name,
                                                                                            subclass: subName
                                                                                        })}
                                                                                    >
                                                                                        <div>
                                                                                            <div style={{ fontWeight: '600', fontSize: '15px' }}>{subName}</div>
                                                                                            {subDesc && <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{subDesc}</div>}
                                                                                        </div>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                            {subPrice && <div style={{ fontWeight: 'bold', color: selected ? '#22c55e' : 'inherit', fontSize: '15px' }}>₹{subPrice}</div>}
                                                                                            {selected && <CheckCircle size={16} color="#22c55e" />}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => toggleClassSelection({
                                                                                name: cls.name,
                                                                                selectionId: cls.name,
                                                                                price: cls.price,
                                                                                originalClass: cls.name
                                                                            })}
                                                                            className={`hero-cta`}
                                                                            style={{ width: '100%', justifyContent: 'center', background: isSelected(cls.name) ? '#22c55e' : 'rgba(255, 255, 255, 0.1)', color: 'white', borderColor: isSelected(cls.name) ? '#22c55e' : 'rgba(255, 255, 255, 0.2)' }}
                                                                        >
                                                                            {isSelected(cls.name) ? 'Selected' : `Select Class (${cls.price || 'Free'})`}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // DESKTOP SPLIT VIEW
                                <>
                                    {/* SIDEBAR: CLASS LIST */}
                                    <div className="sidebar">
                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '16px', letterSpacing: '1px' }}>AVAILABLE CLASSES</div>
                                        {eventData?.classes?.map((cls, idx) => {
                                            const hasSubs = cls.subclasses?.length > 0;
                                            const selectedCount = formData.selectedClasses.filter(c => c.originalClass === cls.name).length;
                                            const isSelfSelected = !hasSubs && formData.selectedClasses.some(c => c.selectionId === cls.name);

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`class-list-item ${activeTab === idx ? 'active' : ''}`}
                                                    onClick={() => setActiveTab(idx)}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '15px' }}>{cls.name}</div>
                                                        {hasSubs && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{cls.subclasses.length} Categories</div>}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {(selectedCount > 0 || isSelfSelected) && (
                                                            <div style={{ background: '#22c55e', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                                                                {hasSubs ? selectedCount : <CheckCircle size={12} />}
                                                            </div>
                                                        )}
                                                        <div style={{ display: isMobileView ? 'block' : 'none' }}>
                                                            <ChevronRight size={18} color="var(--color-text-secondary)" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* CONTENT: DETAILS */}
                                    <div className="detail-panel" id="details-panel">
                                        {eventData?.classes?.[activeTab] ? (
                                            <>
                                                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
                                                    <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px 0' }}>{eventData.classes[activeTab].name}</h2>
                                                    <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                                        {eventData.classes[activeTab].description}
                                                    </p>
                                                </div>

                                                {eventData.classes[activeTab].requirements && (
                                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                                            <Flag size={14} /> Requirements
                                                        </div>
                                                        <p style={{ fontSize: '14px', whiteSpace: 'pre-line', color: 'var(--color-text-secondary)' }}>
                                                            {eventData.classes[activeTab].requirements}
                                                        </p>
                                                    </div>
                                                )}

                                                <div>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '20px' }}>
                                                        {eventData.classes[activeTab].subclasses?.length > 0 ? 'Select Classes' : 'Registration'}
                                                    </div>

                                                    {eventData.classes[activeTab].subclasses?.length > 0 ? (
                                                        <div className="subclass-grid">
                                                            {eventData.classes[activeTab].subclasses.map((sub, sIdx) => {
                                                                const subName = typeof sub === 'string' ? sub : sub.name;
                                                                const subPrice = typeof sub === 'string' ? '' : sub.price;
                                                                const subDesc = typeof sub === 'string' ? '' : sub.description;
                                                                const id = `${eventData.classes[activeTab].name}:${subName}`;
                                                                const selected = isSelected(id);

                                                                return (
                                                                    <div
                                                                        key={sIdx}
                                                                        className={`subclass-card ${selected ? 'selected' : ''}`}
                                                                        style={{ marginBottom: '16px' }}
                                                                        onClick={() => toggleClassSelection({
                                                                            name: `${eventData.classes[activeTab].name} - ${subName}`,
                                                                            selectionId: id,
                                                                            price: subPrice,
                                                                            originalClass: eventData.classes[activeTab].name,
                                                                            subclass: subName
                                                                        })}
                                                                    >
                                                                        <div>
                                                                            <div style={{ fontWeight: '600' }}>{subName}</div>
                                                                            {subDesc && <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{subDesc}</div>}
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            {subPrice && <div style={{ fontWeight: 'bold', color: selected ? '#22c55e' : 'inherit' }}>₹{subPrice}</div>}
                                                                            {selected && <CheckCircle size={16} color="#22c55e" />}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleClassSelection({
                                                                name: eventData.classes[activeTab].name,
                                                                selectionId: eventData.classes[activeTab].name,
                                                                price: eventData.classes[activeTab].price,
                                                                originalClass: eventData.classes[activeTab].name
                                                            })}
                                                            className={`hero-cta`}
                                                            style={{ width: '100%', justifyContent: 'center', background: isSelected(eventData.classes[activeTab].name) ? '#22c55e' : 'rgba(255, 255, 255, 0.1)', color: 'white', borderColor: isSelected(eventData.classes[activeTab].name) ? '#22c55e' : 'rgba(255, 255, 255, 0.2)' }}
                                                        >
                                                            {isSelected(eventData.classes[activeTab].name) ? 'Selected' : `Select Class (${eventData.classes[activeTab].price || 'Free'})`}
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', paddingTop: '50px' }}>Select a class to view details</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* FLOATING ACTION */}
                    {((formData.selectedClasses.length > 0 && !isVisitor) || 
                      (isExperience && ((formData.visitorCounts?.['Honda Integra Type R'] || 0) + (formData.visitorCounts?.['Nissan Skyline R34 GT-R'] || 0) + (formData.visitorCounts?.['Nissan Skyline R34'] || 0) > 0)) ||
                      (isVisitor && !isExperience && (formData.visitorCounts?.['VIP Pass'] || 0) > 0)
                    ) && (
                        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="floating-action-wrapper">
                            <div className="floating-action-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>TOTAL</div>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{calculateTotal()}</div>
                                </div>
                                <button onClick={() => setStep(2)} className="hero-cta">Next Step <ArrowRight size={18} /></button>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* STEP 2: FORM */}
            {step === 2 && (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Selection
                        </button>

                        {/* Test Data Auto-Prefill Button */}
                        <button
                            type="button"
                            onClick={() => {
                                if (isExperience) {
                                    setFormData(prev => ({
                                        ...prev,
                                        name: 'Test Passenger',
                                        email: 'test@trackmeisters.com',
                                        phone: '9999999999',
                                        gender: 'Male',
                                        instagramId: '@trackmeisters_exp',
                                        address: 'Bangalore, Karnataka - 560001',
                                        emergencyContact: 'Emergency Contact (+91 9888888888)'
                                    }));
                                } else if (isVisitor) {
                                    setFormData(prev => ({
                                        ...prev,
                                        name: 'Test Visitor',
                                        email: 'test@trackmeisters.com',
                                        phone: '9999999999',
                                        gender: 'Male',
                                        instagramId: '@trackmeisters_visitor',
                                        address: 'Bangalore, Karnataka - 560001'
                                    }));
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        name: 'Test Driver',
                                        email: 'test@trackmeisters.com',
                                        phone: '9999999999',
                                        gender: 'Male',
                                        instagramId: '@trackmeisters_test',
                                        address: 'Trackmeisters Circuit, Bangalore, Karnataka - 560001',
                                        fmsciLicense: 'FMSCI-TEST-2026',
                                        emergencyContact: 'Emergency Contact (+91 9888888888)',
                                        teamName: 'Trackmeisters Test Team',
                                        carModel: 'Polo GT TSI 1.2',
                                        registrationNumber: 'KA 01 TM 0007',
                                        engineDisplacement: '1200',
                                        driverPhoto: 'https://res.cloudinary.com/ddubpntdp/image/upload/v1772312053/trackmeisters/drivers/rookie.webp',
                                        vehicleRC: 'https://res.cloudinary.com/ddubpntdp/image/upload/v1772312053/trackmeisters/placeholder.svg',
                                        vehicleInsurance: 'https://res.cloudinary.com/ddubpntdp/image/upload/v1772312053/trackmeisters/placeholder.svg',
                                        isRaceBuild: false
                                    }));
                                }
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'var(--color-text-primary, #ffffff)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                letterSpacing: '0.3px'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            Prefill Test Registration Data
                        </button>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Summary Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Registration Summary</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(isExperience ?
                                    Object.entries(formData.visitorCounts)
                                        .filter(([n, c]) => c > 0 && n !== 'VIP Pass')
                                        .map(([n, c]) => {
                                            let uPrice = n === 'Honda Integra Type R' ? 7999 : 9999;
                                            return { name: `${n} x${c}`, price: `₹${(c * uPrice).toLocaleString('en-IN')}` };
                                        })
                                    : isVisitor ?
                                    Object.entries(formData.visitorCounts)
                                        .filter(([n, c]) => c > 0 && n === 'VIP Pass')
                                        .map(([n, c]) => ({ name: `${n} x${c}`, price: `₹${(c * 500).toLocaleString('en-IN')}` }))
                                    : formData.selectedClasses
                                ).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                                        <span style={{ fontWeight: 'bold' }}>{item.price}</span>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total Payable</span>
                                    <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{calculateTotal()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Personal Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label>Full Name *</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Enter your name" />
                            </div>
                            <div>
                                <label>Email Address *</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Enter your email" />
                            </div>
                            <div>
                                <label>Phone Number *</label>
                                <input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter your phone" />
                            </div>
                            <div>
                                <label>Gender *</label>
                                <select required value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label>Instagram ID</label>
                                <input type="text" value={formData.instagramId} onChange={e => setFormData({ ...formData, instagramId: e.target.value })} placeholder="e.g., @username" />
                            </div>
                            {isExperience && (
                                <div>
                                    <label>Emergency Contact *</label>
                                    <input type="text" required value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} placeholder="e.g. Jane Doe (Parent/Spouse) - 9876543210" />
                                </div>
                            )}
                        </div>

                        <div>
                            <label>Full Address *</label>
                            <textarea required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Enter your full address" rows={3}></textarea>
                        </div>

                        {!isVisitor && (
                            <>
                                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginTop: '10px' }}>Participant Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label>FMSCI License No.</label>
                                        <input type="text" value={formData.fmsciLicense} onChange={e => setFormData({ ...formData, fmsciLicense: e.target.value })} placeholder="FMSCI License" />
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: '1.4', fontStyle: 'italic' }}>
                                            Enter your FMSCI License Number. If not available, type “Yet to Apply”. License is mandatory before the event date. Contact us for assistance.
                                        </div>
                                    </div>
                                    <div>
                                        <label>Emergency Contact *</label>
                                        <input type="text" required value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} placeholder="e.g. John Doe (Father) - 98765..." />
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                                    <h4 style={{ marginBottom: '16px' }}>Vehicle Details</h4>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                                        <input type="checkbox" checked={formData.isRaceBuild} onChange={e => setFormData({ ...formData, isRaceBuild: e.target.checked })} style={{ width: 'auto' }} />
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>This is a race build vehicle</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label>Car Model *</label>
                                            <input type="text" required value={formData.carModel} onChange={e => setFormData({ ...formData, carModel: e.target.value })} placeholder="e.g., VW Polo GT" />
                                        </div>
                                        <div>
                                            <label>Registration Number {formData.isRaceBuild ? '(Optional)' : '*'}</label>
                                            <input type="text" required={!formData.isRaceBuild} value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} placeholder="e.g., KA 01 AB 1234" />
                                        </div>
                                        <div>
                                            <label>Engine Displacement (cc) *</label>
                                            <input type="text" required value={formData.engineDisplacement} onChange={e => setFormData({ ...formData, engineDisplacement: e.target.value })} placeholder="e.g., 1200cc" />
                                        </div>
                                        <div>
                                            <label>Team Name (Optional)</label>
                                            <input type="text" value={formData.teamName} onChange={e => setFormData({ ...formData, teamName: e.target.value })} placeholder="Enter team name" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginTop: '10px' }}>Upload Documents & Media</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                        {/* Driver Photo Upload (Mandatory) */}
                                        <div
                                            onClick={() => document.getElementById('driver-photo-upload').click()}
                                            style={{
                                                border: formData.driverPhoto ? '2px solid #22c55e' : (error && !formData.driverPhoto ? '2px dashed #ef4444' : '2px dashed var(--color-border)'),
                                                borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer',
                                                background: formData.driverPhoto ? 'rgba(34, 197, 94, 0.05)' : (error && !formData.driverPhoto ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)'),
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            <input id="driver-photo-upload" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'driverPhoto')} style={{ display: 'none' }} />
                                            {formData.driverPhoto ? (
                                                <>
                                                    <img
                                                        src={formData.driverPhoto}
                                                        alt="Driver Preview"
                                                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 8px', display: 'block', border: '2px solid #22c55e' }}
                                                    />
                                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Driver Photo <span style={{ color: '#ef4444' }}>*</span></div>
                                                    <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>Uploaded Successfully</div>
                                                </>
                                            ) : (
                                                <>
                                                    <User size={24} style={{ margin: '0 auto 10px', color: error && !formData.driverPhoto ? '#ef4444' : 'var(--color-text-secondary)' }} />
                                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Driver Photo <span style={{ color: '#ef4444' }}>*</span></div>
                                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                        {uploadingField === 'driverPhoto' ? 'Uploading...' : 'Click to Upload'}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* RC Upload */}
                                        <div
                                            onClick={() => document.getElementById('rc-upload').click()}
                                            style={{
                                                border: formData.vehicleRC ? '2px solid #22c55e' : '2px dashed var(--color-border)',
                                                borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer',
                                                background: formData.vehicleRC ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.02)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input id="rc-upload" type="file" onChange={(e) => handleFileUpload(e, 'vehicleRC')} style={{ display: 'none' }} />
                                            {formData.vehicleRC ? <CheckCircle size={24} color="#22c55e" style={{ margin: '0 auto 10px' }} /> : <FileText size={24} style={{ margin: '0 auto 10px', color: 'var(--color-text-secondary)' }} />}
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>Vehicle RC {formData.isRaceBuild && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>(Optional)</span>}</div>
                                            <div style={{ fontSize: '12px', color: formData.vehicleRC ? '#22c55e' : 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                {formData.vehicleRC ? 'Uploaded Successfully' : (uploadingField === 'vehicleRC' ? 'Uploading...' : 'Click to Upload')}
                                            </div>
                                        </div>

                                        {/* Insurance Upload */}
                                        <div
                                            onClick={() => document.getElementById('insurance-upload').click()}
                                            style={{
                                                border: formData.vehicleInsurance ? '2px solid #22c55e' : '2px dashed var(--color-border)',
                                                borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer',
                                                background: formData.vehicleInsurance ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.02)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <input id="insurance-upload" type="file" onChange={(e) => handleFileUpload(e, 'vehicleInsurance')} style={{ display: 'none' }} />
                                            {formData.vehicleInsurance ? <CheckCircle size={24} color="#22c55e" style={{ margin: '0 auto 10px' }} /> : <FileText size={24} style={{ margin: '0 auto 10px', color: 'var(--color-text-secondary)' }} />}
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>Vehicle Insurance {formData.isRaceBuild && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>(Optional)</span>}</div>
                                            <div style={{ fontSize: '12px', color: formData.vehicleInsurance ? '#22c55e' : 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                {formData.vehicleInsurance ? 'Uploaded Successfully' : (uploadingField === 'vehicleInsurance' ? 'Uploading...' : 'Click to Upload')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* --- MEDIA COVERAGE SECTION (NEW) --- */}
                        {!isVisitor && formData.selectedClasses.length > 0 && (
                            <div className="media-section-container" style={{ marginTop: '30px', background: 'rgba(255,255,255,0.02)', padding: '0', borderRadius: '16px', border: optInMedia ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', transition: 'all 0.3s ease', boxSizing: 'border-box', maxWidth: '100%', overflow: 'hidden' }}>

                                {/* Single looping video (Always visible) */}
                                <style>
                                    {`
                                        .media-hero-video {
                                            width: 100%;
                                            max-height: 250px;
                                            aspect-ratio: 21/9;
                                            background: #000;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            overflow: hidden;
                                        }
                                        @media (max-width: 768px) {
                                            .media-hero-video {
                                                max-height: none;
                                                aspect-ratio: 16/9;
                                            }
                                        }
                                    `}
                                </style>
                                <div className="media-videos-grid" style={{ marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="media-hero-video">
                                        <video
                                            src={video2}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ padding: '0 24px 24px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                                        <input
                                            type="checkbox"
                                            id="media-opt-in"
                                            checked={optInMedia}
                                            onChange={(e) => setOptInMedia(e.target.checked)}
                                            style={{ width: '24px', height: '24px', minWidth: '24px', cursor: 'pointer', marginTop: '2px' }}
                                        />
                                        <label htmlFor="media-opt-in" className="media-optin-label" style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', cursor: 'pointer', margin: 0, lineHeight: '1.4' }}>
                                            Opt in for FPV Drone Videos
                                        </label>
                                    </div>

                                    <AnimatePresence>
                                        {optInMedia && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{ marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                                                        Select Preferred Classes for FPV Coverage
                                                    </h4>
                                                    <p style={{ fontSize: '13px', color: '#fbbf24', margin: 0, lineHeight: '1.4' }}>
                                                        <strong style={{ fontWeight: 'bold' }}>Note:</strong> Class selection is a preference to help our team prioritize. Media coverage depends on track conditions and scheduling, and cannot be 100% guaranteed for specific classes.
                                                    </p>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {formData.selectedClasses.map((cls, idx) => {
                                                        const classId = cls.selectionId || cls.name;
                                                        const currentSelection = mediaSelections[classId] || { fpv: false };
                                                        const isSelected = currentSelection.fpv;

                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => toggleMediaSelection(classId, 'fpv')}
                                                                style={{
                                                                    background: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0,0,0,0.2)',
                                                                    border: isSelected ? '1px solid #22c55e' : '1px solid transparent',
                                                                    padding: '16px',
                                                                    borderRadius: '12px',
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: '20px',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: '600', fontSize: '15px', color: isSelected ? '#22c55e' : 'white' }}>
                                                                    {cls.name}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                                                        <div style={{
                                                                            width: '20px',
                                                                            height: '20px',
                                                                            borderRadius: '50%',
                                                                            border: isSelected ? '5px solid #22c55e' : '2px solid rgba(255,255,255,0.3)',
                                                                            transition: 'all 0.2s ease'
                                                                        }} />
                                                                        <span style={{ fontSize: '14px', color: isSelected ? '#22c55e' : 'rgba(255,255,255,0.7)' }}>
                                                                            FPV Video (₹1500)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Media Total Coverage Cost:</div>
                                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>
                                                        ₹{calculateMediaTotal()}
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                                                    <h5 style={{ color: '#ef4444', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terms & Conditions</h5>
                                                    <ol style={{ color: '#ef4444', fontSize: '12px', paddingLeft: '20px', margin: 0, opacity: 0.9, lineHeight: '1.6' }}>
                                                        <li>In case we were not able to cover media for your lap, we will provide a refund upon request.</li>
                                                        <li>Due to the racing order and timing constraints, media coverage is not guaranteed.</li>
                                                        <li>FPV videos will be of duration 1 - 2 min per class.</li>
                                                        <li>All FPV videos are 4K high quality videos.</li>
                                                    </ol>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {error && <div style={{ color: '#ef4444', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                const form = e.target.closest('form');
                                if (form.checkValidity()) {
                                    if (!isVisitor && eventData?.classes?.length > 0 && formData.selectedClasses.length === 0) {
                                        setError('Please select at least one class.');
                                        return;
                                    }
                                    if (isVisitor && !formData.eventId) {
                                        setError('Please select an event to proceed.');
                                        return;
                                    }
                                    if (!isVisitor && !formData.driverPhoto) {
                                        setError('Please upload your Driver Photo to proceed.');
                                        const uploadEl = document.getElementById('driver-photo-upload');
                                        if (uploadEl) {
                                            uploadEl.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                        return;
                                    }
                                    if (uploadingField) {
                                        setError('Please wait for uploads to complete before proceeding.');
                                        return;
                                    }
                                    setError(null);
                                    setShowWaiver(true);
                                } else {
                                    form.reportValidity();
                                }
                            }}
                            disabled={submitting}
                            className="hero-cta"
                            style={{ width: 'auto', minWidth: '220px', margin: '20px auto 0', justifyContent: 'center', fontSize: '16px', padding: '12px 32px' }}
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : 'Make Payment'}
                        </button>
                    </form>

                    {/* WAIVER MODAL */}
                    <AnimatePresence>
                        {showWaiver && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}
                                    onClick={() => setShowWaiver(false)}
                                />
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                    style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1001, overflow: 'hidden' }}
                                >
                                    <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Digital Indemnity, Waiver, Release of Liability and Refund Policy</h3>
                                        <button onClick={() => setShowWaiver(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
                                    </div>
                                    <div style={{ padding: '20px', overflowY: 'auto', fontSize: '14px', color: '#ccc', lineHeight: '1.7' }}>
                                        {isExperience && (
                                            <div style={{ background: 'rgba(255, 42, 42, 0.15)', border: '1px solid rgba(255, 42, 42, 0.4)', color: '#ff6b6b', padding: '12px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
                                                ⚠️ <strong>IMPORTANT PASSENGER NOTICE:</strong> THIS IS A PASSENGER EXPERIENCE ONLY. YOU WILL NOT DRIVE THE CAR. Each booking includes one lap around GP1 Performance Zone with a professional driver.
                                            </div>
                                        )}
                                        <p style={{ fontWeight: '800', color: 'white', fontSize: '15px', marginBottom: '16px' }}>I HAVE READ, UNDERSTOOD, AND AGREE TO ALL TERMS AND CONDITIONS BELOW</p>

                                        <p style={{ color: '#999', marginBottom: '20px' }}>
                                            <strong style={{ color: 'white' }}>Trackmeisters</strong><br />
                                            Event: <strong style={{ color: 'var(--color-accent)' }}>{eventData?.title || formData.event}</strong><br />
                                            Date: <strong style={{ color: 'var(--color-accent)' }}>{eventData?.date || 'TBA'}</strong><br />
                                            Venue: <strong style={{ color: 'var(--color-accent)' }}>{isExperience ? 'GP1 Performance Zone' : (eventData?.location || 'TBA')}</strong>
                                        </p>

                                        <p style={{ marginBottom: '8px' }}>By ticking the acceptance checkbox during online registration, I confirm that I have read, understood, and voluntarily agreed to the following terms and conditions:</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>1. Voluntary Participation and Assumption of Risk</h4>
                                        <p>I acknowledge that motorsport activities involve inherent risks including, but not limited to, bodily injury, permanent disability, death, and damage to vehicles or property. I confirm that my participation in Trackmeisters {eventData?.title || formData.event} is entirely voluntary and undertaken at my own free will, risk, and responsibility. I expressly assume all risks, whether known or unknown, foreseeable or unforeseeable, arising from my participation, including accidents, collisions, vehicle failure, track conditions, weather conditions, or the actions of other participants.</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>2. Waiver and Release of Liability</h4>
                                        <p>I hereby irrevocably waive, release, and discharge Trackmeisters, its organizer, officials, staff, volunteers, sponsors, partners, service providers, and {eventData?.location || 'the venue'}, including the circuit owner and venue management, from any and all claims, demands, actions, liabilities, damages, losses, costs, or expenses of any nature whatsoever, whether arising from negligence or otherwise, including personal injury, death, or property damage suffered by me or my vehicle during or in connection with the event.</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>3. Indemnity and Hold Harmless</h4>
                                        <p>I agree to fully indemnify and hold harmless Trackmeisters, the event organizers, sponsors, officials, service providers, and venue management against any and all claims, losses, damages, penalties, costs, or legal expenses arising out of or related to my participation, my driving actions or omissions, mechanical condition or failure of my vehicle, or breach of event rules or instructions.</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>4. Damage to Vehicles, Property and Track</h4>
                                        <p>I understand and accept that any damage caused by me to vehicles, equipment, track surface, barriers, timing systems, or venue property shall be entirely my responsibility. Repair or replacement costs shall be assessed at prevailing market rates as determined by Trackmeisters or venue management, and such assessment shall be final and binding.</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>5. Vehicle Condition, Fitness and Medical Responsibility</h4>
                                        <p>I confirm that my vehicle is mechanically sound and suitable for participation. I also confirm that I am medically and physically fit to participate. I accept full responsibility for my safety and agree that any medical treatment, emergency assistance, or related expenses required during or after the event shall be borne solely by me.</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>6. Refund and Cancellation Policy</h4>
                                        <p>All entry fees are non refundable once paid. No refunds shall be issued in case of withdrawal, no show, mechanical failure, disqualification, or inability to participate for any reason. In case of event cancellation, delay, or interruption due to bad weather, unsafe track conditions, force majeure, natural calamities, government restrictions, or circumstances beyond the control of Trackmeisters, the organizer reserves the right to reschedule the event or offer partial refund or event credit at its sole discretion. The decision of Trackmeisters shall be final and binding.</p>

                                        <h4 style={{ color: '#fbbf24', margin: '24px 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>7. Digital Acceptance and Legal Validity</h4>
                                        <p>By completing registration and selecting the acceptance checkbox, I acknowledge that this constitutes my electronic acceptance of this agreement, which shall be legally binding and enforceable under applicable laws. I agree that any disputes arising from this agreement shall be subject to the jurisdiction of courts located in Bangalore, Karnataka.</p>
                                    </div>
                                    <div style={{ padding: '20px', borderTop: '1px solid #333', background: '#111' }}>
                                        <label style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', marginBottom: '20px' }}>
                                            <input
                                                type="checkbox"
                                                checked={waiverAgreed}
                                                onChange={(e) => setWaiverAgreed(e.target.checked)}
                                                style={{ width: '20px', height: '20px', margin: 0 }}
                                            />
                                            <span style={{ fontSize: '14px', color: 'white' }}>I have read and I agree to the terms provided above.</span>
                                        </label>
                                        <button
                                            onClick={handleFinalSubmit}
                                            disabled={!waiverAgreed || !formData.eventId || submitting}
                                            className="hero-cta"
                                            style={{ width: '100%', justifyContent: 'center', background: (waiverAgreed && formData.eventId) ? 'white' : 'rgba(255,255,255,0.1)', color: (waiverAgreed && formData.eventId) ? 'black' : '#666', cursor: (waiverAgreed && formData.eventId) ? 'pointer' : 'not-allowed' }}
                                        >
                                            {submitting ? <Loader2 className="animate-spin" /> : 'Confirm & Proceed to Payment'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* STEP 3: PAYMENT & CONFIRMATION */}
            {
                step === 3 && (() => {
                    const regTotalNum = Number(calculateTotal().replace(/[^0-9.]/g, '')) || 0;
                    const mediaTotalNum = (optInMedia && calculateMediaTotal() > 0) ? calculateMediaTotal() : 0;
                    const totalPayableNum = regTotalNum + mediaTotalNum;
                    const isConfirmed = paymentScreenshot === 'razorpay_verified' || paymentScreenshot === 'free';

                    return (
                        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobileView ? '16px 12px 90px' : '30px 20px 60px' }}>
                            {/* Page Header */}
                            <div style={{ textAlign: 'center', marginBottom: isMobileView ? '16px' : '32px' }}>
                                <div style={{ fontSize: isMobileView ? '10px' : '11px', fontWeight: '800', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                                    {isConfirmed ? 'Registration Completed' : 'Checkout & Payment'}
                                </div>
                                <h1 style={{ fontSize: isMobileView ? '22px' : '30px', fontWeight: '900', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                                    {isConfirmed ? 'You Are Registered!' : 'Complete Your Registration'}
                                </h1>
                            </div>

                            {/* Top Registration ID Bar - Compact on Mobile */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--color-border)',
                                borderRadius: isMobileView ? '10px' : '14px',
                                padding: isMobileView ? '10px 14px' : '16px 20px',
                                marginBottom: isMobileView ? '16px' : '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: isMobileView ? '10px' : '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700' }}>
                                        Ref ID:
                                    </span>
                                    <span style={{ fontSize: isMobileView ? '16px' : '20px', fontWeight: '900', color: 'var(--color-accent)', letterSpacing: '1px', fontFamily: 'monospace' }}>
                                        {registrationId}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(registrationId)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid var(--color-border)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: isMobileView ? '6px 12px' : '8px 16px',
                                        borderRadius: '6px',
                                        fontSize: isMobileView ? '11px' : '12px',
                                        fontWeight: '600',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Copy size={isMobileView ? 12 : 14} /> Copy
                                </button>
                            </div>

                            {isConfirmed ? (
                                /* CONFIRMED SUCCESS VIEW */
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '24px',
                                    padding: '40px 30px',
                                    textAlign: 'center',
                                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{
                                        width: '72px',
                                        height: '72px',
                                        borderRadius: '50%',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        border: '2px solid #22c55e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                        boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)'
                                    }}>
                                        <CheckCircle size={40} color="#22c55e" />
                                    </div>

                                    <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#fff', margin: '0 0 10px' }}>
                                        Payment Verified & Entry Confirmed!
                                    </h2>
                                    <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '600px', margin: '0 auto 28px', lineHeight: '1.6' }}>
                                        Thank you, <strong style={{ color: '#fff' }}>{pendingSubmission?.name || formData.name}</strong>. Your entry for <strong style={{ color: 'var(--color-accent)' }}>{eventData?.title || formData.event}</strong> has been secured in the official lineup.
                                    </p>

                                    {/* Receipt Card */}
                                    <div style={{
                                        maxWidth: '540px',
                                        margin: '0 auto 30px',
                                        background: 'rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '16px',
                                        padding: '20px 24px',
                                        textAlign: 'left'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '14px' }}>
                                            <span style={{ color: '#94a3b8' }}>Status</span>
                                            <span style={{ color: '#22c55e', fontWeight: '800' }}>CONFIRMED</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '14px' }}>
                                            <span style={{ color: '#94a3b8' }}>Amount Paid</span>
                                            <span style={{ color: '#fff', fontWeight: '800' }}>
                                                {appliedPromo ? '₹0 (Waived via Promo)' : `₹${totalPayableNum.toLocaleString('en-IN')}`}
                                            </span>
                                        </div>
                                        {razorpaySuccessDetails?.paymentId && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', fontFamily: 'monospace' }}>
                                                <span style={{ color: '#94a3b8', fontFamily: 'inherit' }}>Payment ID</span>
                                                <span style={{ color: '#cbd5e1' }}>{razorpaySuccessDetails.paymentId}</span>
                                            </div>
                                        )}
                                        {razorpaySuccessDetails?.orderId && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', fontFamily: 'monospace' }}>
                                                <span style={{ color: '#94a3b8', fontFamily: 'inherit' }}>Order ID</span>
                                                <span style={{ color: '#cbd5e1' }}>{razorpaySuccessDetails.orderId}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isExperience && (
                                        <div style={{
                                            background: 'rgba(255, 42, 42, 0.08)',
                                            border: '1px solid rgba(255, 42, 42, 0.3)',
                                            borderRadius: '12px',
                                            padding: '16px 20px',
                                            maxWidth: '540px',
                                            margin: '0 auto 20px',
                                            textAlign: 'left',
                                            fontSize: '13px',
                                            color: '#cbd5e1',
                                            lineHeight: '1.6'
                                        }}>
                                            <div style={{ fontWeight: '800', color: '#ff6b6b', marginBottom: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🏁 GP1 Performance Zone — Experience Lap Information
                                            </div>
                                            <div style={{ background: 'rgba(255, 42, 42, 0.15)', border: '1px solid rgba(255, 42, 42, 0.35)', color: '#ff8080', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '8px' }}>
                                                IMPORTANT: THIS IS A PASSENGER EXPERIENCE ONLY. YOU WILL NOT DRIVE THE CAR.
                                            </div>
                                            <div>• <strong>Passenger ride only:</strong> Each booking includes one lap with a professional driver.</div>
                                            <div>• <strong>Experience Lap Timings:</strong> Slot 1 (8:00–9:00 AM) | Slot 2 (1:00–2:00 PM) | Slot 3 (5:30–6:30 PM).</div>
                                            <div>• <strong>Helmet:</strong> Bring your own properly fitting helmet for comfort/hygiene (or one will be provided at the track). Mandatory safety briefing will be provided before the ride.</div>
                                        </div>
                                    )}

                                    {isVisitor && !isExperience && (
                                        <div style={{
                                            background: 'rgba(34, 197, 94, 0.08)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '12px',
                                            padding: '16px 20px',
                                            maxWidth: '540px',
                                            margin: '0 auto 20px',
                                            textAlign: 'left',
                                            fontSize: '13px',
                                            color: '#cbd5e1',
                                            lineHeight: '1.6'
                                        }}>
                                            <div style={{ fontWeight: '800', color: '#4ade80', marginBottom: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🎟️ Visitor Pass Access & Timings
                                            </div>
                                            <div>• <strong>Visitor Pass Hours:</strong> 11:00 AM – 6:00 PM</div>
                                            <div>• <strong>Venue Access:</strong> Full spectator zone entry, 360° watch tower view, paddock entry, and pit walk.</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                                                Please present your Pass ID or confirmation email at the spectator registration desk at the venue entrance to claim your wristband.
                                            </div>
                                        </div>
                                    )}

                                    <div style={{
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.25)',
                                        borderRadius: '12px',
                                        padding: '14px 20px',
                                        maxWidth: '540px',
                                        margin: '0 auto 28px',
                                        fontSize: '13px',
                                        color: '#93c5fd'
                                    }}>
                                        📧 A confirmation email with all registration credentials has been dispatched to <strong>{pendingSubmission?.email || formData.email}</strong>.
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="hero-cta"
                                        style={{ width: 'auto', minWidth: '220px', margin: '0 auto', justifyContent: 'center' }}
                                    >
                                        Return to Home
                                    </button>
                                </div>
                            ) : (
                                /* PENDING PAYMENT VIEW */
                                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: isMobileView ? '16px' : '24px', alignItems: 'start' }}>
                                    
                                    {/* COLUMN 1: Order Summary */}
                                    <div style={{
                                        background: 'var(--color-surface, rgba(10, 40, 70, 0.6))',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: isMobileView ? '12px' : '16px',
                                        padding: isMobileView ? '18px 16px' : '26px 24px',
                                        backdropFilter: 'blur(12px)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: isMobileView ? '14px' : '18px'
                                    }}>
                                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: isMobileView ? '10px' : '14px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-accent, #ff2a2a)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Registration Summary
                                            </div>
                                            <h3 style={{ margin: '4px 0 0', fontSize: isMobileView ? '16px' : '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.2px', lineHeight: 1.3 }}>
                                                {eventData?.title || formData.event}
                                            </h3>
                                            {(eventData?.date || eventData?.location) && (
                                                <div style={{ fontSize: isMobileView ? '11px' : '12px', color: 'var(--color-text-secondary, #888888)', marginTop: '4px' }}>
                                                    {eventData?.date} {eventData?.location ? `• ${eventData.location}` : ''}
                                                </div>
                                            )}
                                            {isVisitor && !isExperience && (
                                                <div style={{ fontSize: isMobileView ? '11px' : '12px', color: '#4ade80', fontWeight: '600', marginTop: '3px' }}>
                                                    Visitor Timings: 11:00 AM – 6:00 PM
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected Items */}
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary, #888888)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                                Line Items
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {isExperience ? (
                                                    Object.entries(formData.visitorCounts || {})
                                                        .filter(([name, count]) => count > 0 && name !== 'VIP Pass')
                                                        .map(([name, count]) => {
                                                            let unitPrice = name === 'Honda Integra Type R' ? 7999 : 9999;
                                                            return (
                                                                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isMobileView ? '13px' : '14px', padding: isMobileView ? '8px 10px' : '12px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                                                                    <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{name} (x{count})</span>
                                                                    <span style={{ fontWeight: '700', color: '#fff' }}>₹{(count * unitPrice).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            );
                                                        })
                                                ) : isVisitor ? (
                                                    Object.entries(formData.visitorCounts || {})
                                                        .filter(([name, count]) => count > 0 && name === 'VIP Pass')
                                                        .map(([name, count]) => (
                                                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isMobileView ? '13px' : '14px', padding: isMobileView ? '8px 10px' : '12px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                                                                <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{name} (x{count})</span>
                                                                <span style={{ fontWeight: '700', color: '#fff' }}>₹{(count * 500).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        ))
                                                ) : (
                                                    formData.selectedClasses.map((cls, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isMobileView ? '13px' : '14px', padding: isMobileView ? '8px 10px' : '12px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                                                            <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{cls.subclass || cls.name}</span>
                                                            <span style={{ fontWeight: '700', color: '#fff' }}>₹{parsePrice(cls.price).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    ))
                                                )}

                                                {isExperience && (
                                                    <div style={{
                                                        background: 'rgba(255, 42, 42, 0.06)',
                                                        border: '1px solid rgba(255, 42, 42, 0.25)',
                                                        borderRadius: '10px',
                                                        padding: '12px 14px',
                                                        fontSize: '12px',
                                                        color: '#cbd5e1',
                                                        lineHeight: 1.5,
                                                        marginTop: '6px'
                                                    }}>
                                                        <div style={{ fontWeight: '800', color: '#ff6b6b', marginBottom: '4px' }}>
                                                            📍 Track: GP1 Performance Zone
                                                        </div>
                                                        <div style={{ color: '#ff8080', fontWeight: '700', fontSize: '11px', marginBottom: '6px' }}>
                                                            ⚠️ Passenger ride only with a professional driver (You will not drive).
                                                        </div>
                                                        <div><strong>Experience Timings:</strong></div>
                                                        <div>• Slot 1: 8:00 AM – 9:00 AM</div>
                                                        <div>• Slot 2: 1:00 PM – 2:00 PM</div>
                                                        <div>• Slot 3: 5:30 PM – 6:30 PM</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                            Helmets encouraged (or provided at venue). Safety briefing provided before ride.
                                                        </div>
                                                    </div>
                                                )}

                                                {optInMedia && calculateMediaTotal() > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isMobileView ? '13px' : '14px', padding: isMobileView ? '8px 10px' : '12px 14px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Camera size={14} color="#22c55e" />
                                                            <span style={{ color: '#4ade80', fontWeight: '600' }}>FPV Media Drone Coverage</span>
                                                        </div>
                                                        <span style={{ fontWeight: '800', color: '#4ade80' }}>₹{calculateMediaTotal().toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Total Summary Box */}
                                        <div style={{
                                            marginTop: 'auto',
                                            paddingTop: isMobileView ? '12px' : '16px',
                                            borderTop: '1px solid rgba(255,255,255,0.08)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'baseline'
                                        }}>
                                            <span style={{ color: 'var(--color-text-secondary, #888888)', fontSize: isMobileView ? '12px' : '14px', fontWeight: '500' }}>Total Amount</span>
                                            <span style={{ fontSize: isMobileView ? '22px' : '26px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
                                                ₹{totalPayableNum.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* COLUMN 2: Razorpay Live Checkout */}
                                    <div style={{
                                        background: 'var(--color-surface, rgba(10, 40, 70, 0.6))',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: isMobileView ? '12px' : '16px',
                                        padding: isMobileView ? '18px 16px' : '26px 24px',
                                        backdropFilter: 'blur(12px)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: isMobileView ? '14px' : '18px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-accent, #ff2a2a)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                                                    Payment Method
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: isMobileView ? '16px' : '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
                                                    Online Checkout
                                                </h3>
                                            </div>

                                            {/* Official Razorpay Badging */}
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '4px 8px',
                                                background: 'rgba(51, 149, 255, 0.1)',
                                                border: '1px solid rgba(51, 149, 255, 0.3)',
                                                borderRadius: '6px'
                                            }}>
                                                <svg width="12" height="12" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M140.4 48L48 186.7h92.4l92.4-138.7H140.4z" fill="#0C2340"/>
                                                    <path d="M371.6 48L279.2 186.7h92.4L464 48H371.6z" fill="#3395FF"/>
                                                    <path d="M227.6 186.7L89 392.5l46.2 71.5 137.8-205.3h-46.2l46.2-72H227.6z" fill="#3395FF"/>
                                                </svg>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff' }}>
                                                    Razor<span style={{ color: '#3395ff' }}>pay</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Amount Due Panel */}
                                        <div style={{
                                            padding: isMobileView ? '12px 14px' : '16px 18px',
                                            background: 'rgba(2, 35, 63, 0.45)',
                                            border: '1px solid rgba(0, 240, 255, 0.12)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary, #888888)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700' }}>
                                                    Amount Payable
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                    Taxes included
                                                </div>
                                            </div>
                                            <div style={{ fontSize: isMobileView ? '22px' : '28px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>
                                                ₹{totalPayableNum.toLocaleString('en-IN')}
                                            </div>
                                        </div>

                                        {/* Supported Methods Badges */}
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-text-secondary, #888888)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
                                                Accepted Methods
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {[
                                                    'UPI (GPay / PhonePe / Paytm)',
                                                    'Cards (Visa, MC, RuPay)',
                                                    'NetBanking'
                                                ].map((method, idx) => (
                                                    <span key={idx} style={{
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        color: '#a1a1aa',
                                                        background: 'rgba(255, 255, 255, 0.035)',
                                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                                        padding: '4px 8px',
                                                        borderRadius: '5px'
                                                    }}>
                                                        {method}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Promo Code Input Block */}
                                        <div style={{
                                            background: 'rgba(255, 255, 255, 0.035)',
                                            border: appliedPromo ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '10px',
                                            padding: '12px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Tag size={12} color="#38bdf8" />
                                                    Promo Code
                                                </span>
                                                {appliedPromo && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAppliedPromo('');
                                                            setPromoCodeInput('');
                                                            setPromoError('');
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#f87171',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            {!appliedPromo ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter promo code"
                                                        value={promoCodeInput}
                                                        onChange={(e) => {
                                                            setPromoCodeInput(e.target.value);
                                                            if (promoError) setPromoError('');
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleApplyPromo();
                                                            }
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            background: 'rgba(0, 0, 0, 0.35)',
                                                            border: promoError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                                                            borderRadius: '6px',
                                                            padding: '8px 12px',
                                                            color: '#ffffff',
                                                            fontSize: '13px',
                                                            outline: 'none',
                                                            letterSpacing: '0.5px'
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyPromo}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: 'rgba(255, 255, 255, 0.1)',
                                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                                            borderRadius: '6px',
                                                            color: '#ffffff',
                                                            fontSize: '12px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    color: '#10b981',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}>
                                                    <CheckCircle size={15} color="#10b981" />
                                                    <span>Promo <strong>{appliedPromo}</strong> active: Payment Bypassed</span>
                                                </div>
                                            )}

                                            {promoError && (
                                                <div style={{ fontSize: '11px', color: '#f87171' }}>
                                                    {promoError}
                                                </div>
                                            )}
                                        </div>

                                        {razorpayError && (
                                            <div style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                color: '#f87171',
                                                borderRadius: '8px',
                                                padding: '10px 12px',
                                                fontSize: '12px'
                                            }}>
                                                {razorpayError}
                                            </div>
                                        )}

                                        {/* Desktop In-Card Razorpay / Promo Pay Button (Hidden on Mobile since mobile has the Floating Bar) */}
                                        {!isMobileView && (
                                            <button
                                                type="button"
                                                onClick={appliedPromo ? handlePromoConfirmation : handleRazorpayLivePayment}
                                                disabled={razorpayLoading || razorpayVerifying}
                                                style={{
                                                    width: '100%',
                                                    padding: '15px 20px',
                                                    background: razorpayLoading || razorpayVerifying 
                                                        ? '#1e293b' 
                                                        : appliedPromo
                                                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                            : 'linear-gradient(135deg, #3395ff 0%, #1573e8 100%)',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '15px',
                                                    fontWeight: '700',
                                                    cursor: razorpayLoading || razorpayVerifying ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: razorpayLoading || razorpayVerifying 
                                                        ? 'none' 
                                                        : appliedPromo
                                                            ? '0 6px 20px rgba(16, 185, 129, 0.35)'
                                                            : '0 6px 20px rgba(51, 149, 255, 0.35)',
                                                    letterSpacing: '0.2px'
                                                }}
                                            >
                                                {razorpayLoading ? (
                                                    <><Loader2 className="animate-spin" size={18} /> Connecting to Razorpay...</>
                                                ) : razorpayVerifying ? (
                                                    <><Loader2 className="animate-spin" size={18} /> {appliedPromo ? 'Confirming Registration...' : 'Verifying Transaction...'}</>
                                                ) : appliedPromo ? (
                                                    <>
                                                        <CheckCircle size={18} />
                                                        <span>Confirm & Complete Registration</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="18" height="18" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M140.4 48L48 186.7h92.4l92.4-138.7H140.4z" fill="#ffffff" fillOpacity="0.85"/>
                                                            <path d="M371.6 48L279.2 186.7h92.4L464 48H371.6z" fill="#ffffff"/>
                                                            <path d="M227.6 186.7L89 392.5l46.2 71.5 137.8-205.3h-46.2l46.2-72H227.6z" fill="#ffffff"/>
                                                        </svg>
                                                        <span>Pay with Razorpay</span>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            fontSize: isMobileView ? '11px' : '12px',
                                            color: 'var(--color-text-secondary, #888888)',
                                            textAlign: 'center'
                                        }}>
                                            <Shield size={12} color="#10b981" />
                                            <span>256-bit Bank Grade SSL Encryption • Verified Merchant</span>
                                        </div>
                                    </div>
                                </div>
                            )}


                            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Return to Home
                                </button>
                            </div>

                            {/* Floating Mobile Pay Button Bar */}
                            {!isConfirmed && isMobileView && totalPayableNum > 0 && (
                                <div style={{
                                    position: 'fixed',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(2, 35, 63, 0.95)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    borderTop: '1px solid rgba(51, 149, 255, 0.3)',
                                    padding: '12px 16px max(12px, env(safe-area-inset-bottom))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    zIndex: 9999,
                                    boxShadow: '0 -8px 25px rgba(0, 0, 0, 0.6)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: '700' }}>
                                            {appliedPromo ? 'Promo Applied' : 'Total Amount'}
                                        </span>
                                        <span style={{ fontSize: '18px', fontWeight: '900', color: appliedPromo ? '#10b981' : '#ffffff', letterSpacing: '-0.3px' }}>
                                            {appliedPromo ? '₹0' : `₹${totalPayableNum.toLocaleString('en-IN')}`}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={appliedPromo ? handlePromoConfirmation : handleRazorpayLivePayment}
                                        disabled={razorpayLoading || razorpayVerifying}
                                        style={{
                                            flex: 1,
                                            maxWidth: '240px',
                                            padding: '12px 16px',
                                            background: razorpayLoading || razorpayVerifying 
                                                ? '#1e293b' 
                                                : appliedPromo
                                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                    : 'linear-gradient(135deg, #3395ff 0%, #1573e8 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            cursor: razorpayLoading || razorpayVerifying ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: razorpayLoading || razorpayVerifying 
                                                ? 'none' 
                                                : appliedPromo 
                                                    ? '0 4px 14px rgba(16, 185, 129, 0.4)' 
                                                    : '0 4px 14px rgba(51, 149, 255, 0.4)'
                                        }}
                                    >
                                        {razorpayLoading ? (
                                            <><Loader2 className="animate-spin" size={16} /> Connecting...</>
                                        ) : razorpayVerifying ? (
                                            <><Loader2 className="animate-spin" size={16} /> Confirming...</>
                                        ) : appliedPromo ? (
                                            <>
                                                <CheckCircle size={14} />
                                                <span>Confirm Entry</span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={14} />
                                                <span>Pay with Razorpay</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()
            }
        </div >
    );
};

export default EventRegistration;
