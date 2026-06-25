import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle, ArrowRight, Copy, Flag, AlertCircle, X, Download, CreditCard, Calendar, User, Mail, Phone, Car, FileText, Sparkles, Film, Clock, Info } from 'lucide-react';
import { COLLECTIONS, addDocument } from '../lib/firebase';
import { submitEventRegistration } from '../lib/api';

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state;

    // --- STATE ---
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [scriptError, setScriptError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState(null);

    // --- DYNAMIC SCRIPT LOADING ---
    useEffect(() => {
        if (!state) return;

        const loadScript = () => {
            if (window.Razorpay) {
                setScriptLoaded(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => setScriptLoaded(true);
            script.onerror = () => {
                setScriptError(true);
                setError('Failed to load payment gateway SDK. Please check your internet connection.');
            };
            document.body.appendChild(script);
        };

        loadScript();
    }, [state]);

    if (!state) {
        return (
            <div className="min-h-screen bg-[var(--color-bg,#02233f)] text-white font-sans flex items-center justify-center p-6 pt-28">
                <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center border border-white/10 shadow-2xl">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Active Payment Session</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        We couldn't find an active checkout session. Please return to the event registration or FPV store to initiate a payment.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition shadow-lg shadow-red-500/20"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const { type, total } = state;

    // --- GOOGLE SHEETS WEBHOOK SYNC ---
    const sendToGoogleSheets = async (payload) => {
        const isVisitorType = payload.type === 'Visitor';
        try {
            await fetch('/api/sync-to-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: isVisitorType ? 'visitor' : 'main',
                    data: isVisitorType ? {
                        timeStamp: new Date().toLocaleString(),
                        phoneNo: payload.phone || '',
                        name: payload.name || '',
                        email: payload.email || '',
                        gender: payload.gender || '',
                        type: payload.type || '',
                        selectedClasses: payload.selectedClasses?.map(c => `${c.name} (x${c.count})`).join('; ') || '',
                        totalAmount: payload.totalAmount || '',
                        status: payload.status || '',
                        paymentScreenshot: payload.paymentScreenshot || '',
                    } : {
                        timeStamp: new Date().toLocaleString(),
                        phoneNo: payload.phone || '',
                        name: payload.name || '',
                        fmsciLicense: payload.fmsciLicense || '',
                        teamTuner: payload.teamName || '',
                        vehicle: payload.carModel || '',
                        selectedClasses: payload.selectedClasses?.map(c => c.subclass || c.name).join('; ') || '',
                        totalAmount: payload.totalAmount || '',
                        status: payload.status || '',
                        email: payload.email || '',
                        gender: payload.gender || '',
                        address: payload.address || '',
                        emergContact: payload.emergencyContact || '',
                        type: payload.type || '',
                        engine: payload.engineDisplacement || '',
                        regNo: payload.registrationNumber || '',
                        isRaceBuild: payload.isRaceBuild ? 'Yes' : 'No',
                        rcLink: payload.vehicleRC || '',
                        insuranceLink: payload.vehicleInsurance || '',
                        vehicleImages: '',
                        paymentScreenshot: payload.paymentScreenshot || '',
                        comments: payload.comments || ''
                    }
                })
            });
        } catch (err) {
            console.error('Google Sheets sync error:', err);
        }
    };

    const sendMediaToGoogleSheets = async (mediaPayload) => {
        try {
            await fetch('/api/sync-to-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'media',
                    data: mediaPayload
                })
            });
        } catch (err) {
            console.error('Media Google Sheets sync error:', err);
        }
    };

    // --- SUCCESS DATA WRITER ---
    const handlePostPaymentSuccess = async (paymentId, orderId) => {
        try {
            if (type === 'event_registration') {
                const { registrationData, optInMedia, mediaSelections, mediaTotal } = state;

                // 1) Save Main Registration
                const payloadDoc = {
                    ...registrationData,
                    paymentScreenshot: 'razorpay',
                    status: 'confirmed', // Auto-confirmed on verified payment
                    razorpayPaymentId: paymentId,
                    razorpayOrderId: orderId
                };

                const docId = await addDocument(COLLECTIONS.REGISTRATIONS, payloadDoc);
                sendToGoogleSheets(payloadDoc);
                submitEventRegistration(payloadDoc).catch(console.error);

                // 2) Save Media Coverage Seperately (if opted in)
                if (optInMedia && mediaTotal > 0) {
                    const formattedSelections = Object.entries(mediaSelections)
                        .filter(([_, sel]) => sel.fpv)
                        .map(([cls, sel]) => {
                            const types = [];
                            if (sel.fpv) types.push('FPV (₹1000)');
                            return `${cls}: ${types.join(' + ')}`;
                        }).join(' | ');

                    const mediaPayload = {
                        timeStamp: new Date().toLocaleString(),
                        registrationId: registrationData.registrationId,
                        name: registrationData.name,
                        phoneNo: registrationData.phone,
                        event: registrationData.event,
                        totalMediaAmount: mediaTotal,
                        mediaSelections: formattedSelections,
                        vehicleImages: registrationData.vehicleImages?.join(', ') || '',
                        status: 'confirmed', // Auto-confirmed on payment success
                        razorpayPaymentId: paymentId,
                        razorpayOrderId: orderId
                    };

                    await addDocument(COLLECTIONS.MEDIA_REGISTRATIONS, mediaPayload);
                    sendMediaToGoogleSheets(mediaPayload);
                }

                setPaymentDetails({
                    registrationId: registrationData.registrationId,
                    paymentId,
                    orderId
                });

            } else if (type === 'fpv_purchase') {
                const { video, buyer } = state;

                const purchaseData = {
                    videoId: video.id,
                    videoTitle: `${video.carModel} (${video.vehicleNumber}) - ${video.eventName}`,
                    buyerName: buyer.name,
                    buyerEmail: buyer.email,
                    buyerPhone: buyer.phone,
                    status: 'approved',
                    price: video.price || 1000,
                    razorpayPaymentId: paymentId,
                    razorpayOrderId: orderId,
                    createdAt: new Date().toISOString()
                };

                await addDocument(COLLECTIONS.FPV_PURCHASES, purchaseData);

                // Add to local storage unlocked list
                try {
                    const saved = localStorage.getItem('unlocked_fpv_videos');
                    const unlockedList = saved ? JSON.parse(saved) : [];
                    if (!unlockedList.includes(video.id)) {
                        unlockedList.push(video.id);
                        localStorage.setItem('unlocked_fpv_videos', JSON.stringify(unlockedList));
                    }
                } catch (e) {
                    console.error('Failed to sync video unlock status:', e);
                }

                setPaymentDetails({
                    videoUrl: video.fullVideoUrl,
                    videoTitle: video.carModel,
                    paymentId,
                    orderId
                });
            }

            setSuccess(true);
        } catch (err) {
            console.error('Failed to save verified transaction:', err);
            setError('Payment was successful, but we failed to register the details in our database. Please contact support immediately with your Payment ID: ' + paymentId);
        }
    };

    // --- PAYMENT ACTION ---
    const handleConfirmAndPay = async () => {
        if (!scriptLoaded) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create order on serverless backend
            const orderRes = await fetch('/api/create-razorpay-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total,
                    receipt: type === 'fpv_purchase' ? `fpv_${state.video.id}_${Date.now()}` : `${state.registrationData.registrationId}_${Date.now()}`,
                    notes: {
                        type,
                        buyerName: type === 'fpv_purchase' ? state.buyer.name : state.registrationData.name,
                        buyerEmail: type === 'fpv_purchase' ? state.buyer.email : state.registrationData.email
                    }
                })
            });

            if (!orderRes.ok) {
                throw new Error('Failed to create payment order session.');
            }

            const orderData = await orderRes.json();

            // 2. Configure and Open Razorpay Checkout overlay
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Trackmeisters',
                description: type === 'fpv_purchase' ? 'FPV Drone Track Footage' : `${state.registrationData.event} Registration`,
                image: 'https://res.cloudinary.com/ddubpntdp/image/upload/v1778154210/trackmeisters/general/hzps6p4cukmiyqgmxd7v.png',
                order_id: orderData.order_id,
                handler: async function (response) {
                    setVerifying(true);
                    setLoading(false);
                    try {
                        const verifyRes = await fetch('/api/verify-razorpay-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.verified) {
                            await handlePostPaymentSuccess(response.razorpay_payment_id, response.razorpay_order_id);
                        } else {
                            setError('Payment signature verification failed. Please contact support.');
                        }
                    } catch (err) {
                        setError('Signature verification failed: ' + err.message);
                    } finally {
                        setVerifying(false);
                    }
                },
                prefill: {
                    name: type === 'fpv_purchase' ? state.buyer.name : state.registrationData.name,
                    email: type === 'fpv_purchase' ? state.buyer.email : state.registrationData.email,
                    contact: type === 'fpv_purchase' ? state.buyer.phone : state.registrationData.phone
                },
                theme: {
                    color: '#ff2a2a'
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error('Payment checkout failed:', err);
            setError(err.message || 'Payment initiation failed. Please try again.');
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!paymentDetails?.registrationId) return;
        navigator.clipboard.writeText(paymentDetails.registrationId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };    return (
        <div className="min-h-screen bg-[var(--color-bg,#02233f)] text-white font-sans pb-16 pt-28 px-4 relative overflow-hidden">
            {/* Custom Styling block */}
            <style>{`
                .glass-card {
                    background: var(--color-surface, rgba(10, 40, 70, 0.6));
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
                }
                .btn-pay {
                    background: linear-gradient(135deg, #3395FF 0%, #0B4FDC 100%);
                    box-shadow: 0 4px 20px rgba(11, 79, 220, 0.3);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .btn-pay:hover:not(:disabled) {
                    transform: translateY(-2px);
                    background: linear-gradient(135deg, #4da3ff 0%, #1e64f8 100%);
                    box-shadow: 0 8px 30px rgba(11, 79, 220, 0.5);
                }
                .btn-pay:active:not(:disabled) {
                    transform: translateY(0);
                }
                .success-badge {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                }
                .glowing-orb-1 {
                    position: absolute;
                    top: 10%;
                    right: -10%;
                    width: 40vw;
                    height: 40vw;
                    background: radial-gradient(circle, var(--color-accent-glow, rgba(255, 42, 42, 0.06)) 0%, transparent 70%);
                    pointer-events: none;
                    filter: blur(80px);
                    z-index: 1;
                }
                .glowing-orb-2 {
                    position: absolute;
                    bottom: -10%;
                    left: -15%;
                    width: 50vw;
                    height: 50vw;
                    background: radial-gradient(circle, rgba(0, 240, 255, 0.04) 0%, transparent 70%);
                    pointer-events: none;
                    filter: blur(100px);
                    z-index: 1;
                }
                .grid-overlay {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.005) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.005) 1px, transparent 1px);
                    background-size: 40px 40px;
                    pointer-events: none;
                    z-index: 1;
                }
            `}</style>

            {/* Ambient Background Effects */}
            <div className="glowing-orb-1" />
            <div className="glowing-orb-2" />
            <div className="grid-overlay" />

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Checkout Steps Indicator */}
                {!success && (
                    <div className="flex items-center justify-between max-w-md mx-auto mb-10 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-mono">01</span>
                            <span>Details</span>
                        </div>
                        <div className="flex-1 h-[2px] mx-4 bg-white/5 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-blue-500/20" />
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <span className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-[9px] font-mono shadow-[0_0_10px_rgba(239,68,68,0.5)]">02</span>
                            <span className="text-[var(--color-accent,#ff2a2a)]">Secure Checkout</span>
                        </div>
                        <div className="flex-1 h-[2px] mx-4 bg-white/5" />
                        <div className="flex items-center gap-2 text-zinc-500">
                            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-mono">03</span>
                            <span>Complete</span>
                        </div>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* SUCCESS SCREEN */}
                    {success ? (
                        <motion.div
                            key="success-screen"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-card rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-2xl border border-white/10"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6">
                                <motion.div
                                    initial={{ scale: 0.5, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                >
                                    <CheckCircle size={44} />
                                </motion.div>
                            </div>

                            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Payment Successful!</h2>
                            <p className="text-emerald-400 text-sm font-semibold mb-6 flex items-center justify-center gap-1.5">
                                <Sparkles size={16} /> Transaction Verified Securely
                            </p>

                            <div className="bg-black/20 border border-white/5 rounded-2xl p-6 text-left space-y-4 mb-8">
                                <div className="flex justify-between items-center pb-3 border-b border-white/5 text-xs text-zinc-400">
                                    <span>Payment ID</span>
                                    <span className="font-mono text-white font-semibold">{paymentDetails?.paymentId}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b border-white/5 text-xs text-zinc-400">
                                    <span>Order ID</span>
                                    <span className="font-mono text-white font-semibold">{paymentDetails?.orderId}</span>
                                </div>
                                
                                {type === 'event_registration' ? (
                                    <div className="flex justify-between items-center text-xs text-zinc-400">
                                        <span>Registration ID</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[var(--color-accent,#ff2a2a)] font-bold text-lg">{paymentDetails?.registrationId}</span>
                                            <button
                                                onClick={handleCopy}
                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition"
                                                title="Copy ID"
                                            >
                                                {copied ? <span className="text-[10px] text-emerald-400 font-bold px-1">Copied!</span> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center text-xs text-zinc-400">
                                        <span>Purchase Item</span>
                                        <span className="font-semibold text-white">{paymentDetails?.videoTitle}</span>
                                    </div>
                                )}
                            </div>

                            {type === 'fpv_purchase' ? (
                                <div className="space-y-4">
                                    <a
                                        href={paymentDetails?.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Download size={18} /> Download Full Video (4K)
                                    </a>
                                    <button
                                        onClick={() => navigate('/media/fpv')}
                                        className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-sm border border-white/10 transition"
                                    >
                                        Return to FPV Store
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-zinc-400 text-xs text-center leading-relaxed">
                                        Your registration details have been synchronized and confirmation email is dispatched. We look forward to seeing you at the track!
                                    </p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="w-full py-4 rounded-xl btn-pay text-white font-bold text-sm transition"
                                    >
                                        Return to Home
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        // PAYMENT DETAILS REVIEW PAGE
                        <motion.div
                            key="review-screen"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                        >
                            {/* Left details panel (8 cols on desktop) */}
                            <div className="lg:col-span-8 space-y-8">
                                {type === 'event_registration' ? (
                                    <div className="space-y-6">
                                        {/* Event Ticket Header */}
                                        <div className="border-b border-white/5 pb-5">
                                            <div className="text-xs font-bold text-[var(--color-accent,#ff2a2a)] uppercase tracking-widest mb-1.5">
                                                Checkout
                                            </div>
                                            <h2 className="text-3xl font-extrabold text-white tracking-tight">
                                                {state.registrationData.type === 'Visitor' ? 'Visitor Pass' : 'Driver Registration'}
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">
                                                {state.registrationData.type === 'Visitor' 
                                                    ? 'Confirm your entry details and purchase spectator passes.' 
                                                    : 'Confirm your competitor profile and register for the event.'}
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Event Details Card */}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Calendar size={14} className="text-[var(--color-accent,#ff2a2a)]" /> Event & Venue Details
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-zinc-300">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Event Name</span>
                                                        <div className="font-extrabold text-white text-sm">{state.eventTitle}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Track Name / Location</span>
                                                        <div className="font-extrabold text-white text-sm">{state.eventLocation || 'TBA'}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* User Info Card */}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                    <User size={14} className="text-[var(--color-accent,#ff2a2a)]" /> Participant Information
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-zinc-300">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Name</span>
                                                        <div className="font-extrabold text-white">{state.registrationData.name}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Email</span>
                                                        <div className="font-extrabold text-white truncate">{state.registrationData.email}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Phone No.</span>
                                                        <div className="font-extrabold text-white">{state.registrationData.phone}</div>
                                                    </div>
                                                    
                                                    {state.registrationData.gender && (
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Gender</span>
                                                            <div className="font-extrabold text-white">{state.registrationData.gender}</div>
                                                        </div>
                                                    )}
                                                    {state.registrationData.emergencyContact && (
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Emergency Contact</span>
                                                            <div className="font-extrabold text-white">{state.registrationData.emergencyContact}</div>
                                                        </div>
                                                    )}
                                                    {state.registrationData.instagramId && (
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Instagram ID</span>
                                                            <div className="font-extrabold text-white">{state.registrationData.instagramId}</div>
                                                        </div>
                                                    )}
                                                    {state.registrationData.address && (
                                                        <div className="space-y-1 sm:col-span-3">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Address</span>
                                                            <div className="font-extrabold text-white leading-relaxed">{state.registrationData.address}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Competitor & Machine Details Card */}
                                            {state.registrationData.type === 'Participant' && (
                                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                        <Car size={14} className="text-[var(--color-accent,#ff2a2a)]" /> Competitor & Machine Details
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-zinc-300">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Vehicle Model</span>
                                                            <div className="font-extrabold text-white">{state.registrationData.carModel}</div>
                                                        </div>
                                                        {state.registrationData.registrationNumber && (
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Registration No.</span>
                                                                <div className="font-extrabold text-white">{state.registrationData.registrationNumber}</div>
                                                            </div>
                                                        )}
                                                        {state.registrationData.engineDisplacement && (
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Engine Displacement</span>
                                                                <div className="font-extrabold text-white">{state.registrationData.engineDisplacement} cc</div>
                                                            </div>
                                                        )}
                                                        {state.registrationData.fmsciLicense && (
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">FMSCI License</span>
                                                                <div className="font-extrabold text-white">{state.registrationData.fmsciLicense}</div>
                                                            </div>
                                                        )}
                                                        {state.registrationData.teamName && (
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Team / Tuner</span>
                                                                <div className="font-extrabold text-white">{state.registrationData.teamName}</div>
                                                            </div>
                                                        )}
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Race Prepared?</span>
                                                            <div className="font-extrabold text-white">{state.registrationData.isRaceBuild ? 'Yes' : 'No'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Selected passes details */}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                    <FileText size={14} className="text-zinc-400" /> Selected Classes & Ticket Breakdown
                                                </h3>
                                                
                                                <div className="space-y-3">
                                                    {state.registrationData.selectedClasses.map((cls, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                                                            <span className="text-zinc-300 font-medium">
                                                                {cls.name} {cls.count ? `(x${cls.count})` : ''}
                                                            </span>
                                                            <span className="font-extrabold text-white">
                                                                {cls.price}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Media Opt-in info */}
                                            {state.optInMedia && state.mediaTotal > 0 && (
                                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3">
                                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                                        <Sparkles size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-emerald-400">Premium FPV Media Coverage Add-on</h4>
                                                        <p className="text-zinc-400 text-xs leading-relaxed mt-0.5">
                                                            High-speed drone tracking activated for your runs. FPV video clips will be available in the FPV Store after the event.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Product title header */}
                                        <div className="border-b border-white/5 pb-5">
                                            <div className="text-xs font-bold text-[var(--color-accent,#ff2a2a)] uppercase tracking-widest mb-1.5">
                                                Checkout
                                            </div>
                                            <h2 className="text-3xl font-extrabold text-white tracking-tight">
                                                COMP #{state.video.vehicleNumber} FPV
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">
                                                Professionally captured high-resolution drone footage of your track run.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Media showcase frame */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                        <Film size={14} className="text-zinc-500" /> Digital Asset Preview
                                                    </span>
                                                </div>

                                                <div className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl transition duration-500 hover:border-red-500/30">
                                                    {state.video.previewVideoUrl && !state.video.previewVideoUrl.includes('drive.google.com') ? (
                                                        <video
                                                            src={state.video.previewVideoUrl}
                                                            controls
                                                            autoPlay
                                                            muted
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (state.video.previewVideoId || state.video.googleDriveId) ? (
                                                        <iframe
                                                            src={`https://drive.google.com/file/d/${state.video.previewVideoId || state.video.googleDriveId}/preview`}
                                                            className="w-full h-full border-0"
                                                            allow="autoplay"
                                                            allowFullScreen
                                                        />
                                                    ) : state.video.fullVideoUrl && !state.video.fullVideoUrl.includes('drive.google.com') ? (
                                                        <video
                                                            src={state.video.fullVideoUrl}
                                                            controls
                                                            autoPlay
                                                            muted
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                                                            <Film size={32} className="mb-2 text-zinc-600 animate-pulse" />
                                                            <span className="text-xs">Preview video loading...</span>
                                                        </div>
                                                    )}
                                                    {/* Visual tech overlays */}
                                                    <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono text-zinc-300 font-medium flex items-center gap-2 pointer-events-none">
                                                        <span>4K UHD</span>
                                                        <span className="text-zinc-600">|</span>
                                                        <span>60 FPS</span>
                                                        <span className="text-zinc-600">|</span>
                                                        <span>Color Graded</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Technical specifications and telemetry */}
                                            <div className="space-y-4">
                                                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                                                    Technical Specifications & Run Details
                                                </span>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    {/* Card 1: Telemetry */}
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition hover:bg-white/[0.04]">
                                                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                                            <Car size={14} className="text-zinc-400" />
                                                            Vehicle Model
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-extrabold text-white leading-tight">
                                                                {state.video.carModel}
                                                            </div>
                                                            <div className="text-xs text-red-500 font-bold mt-1 font-mono">
                                                                COMP #{state.video.vehicleNumber}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card 2: Driver Run */}
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition hover:bg-white/[0.04]">
                                                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                                            <User size={14} className="text-zinc-400" />
                                                            Driver Run
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-extrabold text-white leading-tight truncate">
                                                                {state.video.driverName}
                                                            </div>
                                                            <div className="text-xs text-zinc-400 font-semibold mt-1">
                                                                Official Competitor
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card 3: File details */}
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition hover:bg-white/[0.04]">
                                                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                                            <Clock size={14} className="text-zinc-400" />
                                                            File Details
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-extrabold text-white leading-tight">
                                                                4K MP4 (Master)
                                                            </div>
                                                            <div className="text-xs text-emerald-400 font-bold mt-1">
                                                                {state.video.fileSize && state.video.fileSize > 0 
                                                                    ? `${(state.video.fileSize / (1024 * 1024)).toFixed(1)} MB` 
                                                                    : '~150 - 250 MB'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Event Name banner */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-0.5">
                                                    <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider block">
                                                        Captured Live At
                                                    </span>
                                                    <span className="text-sm font-extrabold text-white leading-normal">
                                                        {state.video.eventName}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* License & Delivery Profile */}
                                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                    <User size={14} className="text-[var(--color-accent,#ff2a2a)]" /> License & Delivery Profile
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-zinc-300">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Name</span>
                                                        <div className="font-extrabold text-white">{state.buyer.name}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Email</span>
                                                        <div className="font-extrabold text-white truncate">{state.buyer.email}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Phone No.</span>
                                                        <div className="font-extrabold text-white">{state.buyer.phone}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Pricing & checkout CTA panel (4 cols on desktop) */}
                            <div className="lg:col-span-4 space-y-6 sticky top-28 lg:border-l lg:border-white/10 lg:pl-8">
                                <div className="flex flex-col justify-between h-full space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Total Summary</h3>

                                        <div className="space-y-3 pb-6 border-b border-white/10 text-sm">
                                            {type === 'event_registration' ? (
                                                <>
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-400">Event Entry Fee</span>
                                                        <span className="text-white font-bold">{state.registrationData.totalAmount}</span>
                                                    </div>
                                                    {state.optInMedia && state.mediaTotal > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-zinc-400">FPV Drone Coverage</span>
                                                            <span className="text-white font-bold">₹{state.mediaTotal}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">FPV Video License</span>
                                                    <span className="text-white font-bold">₹{state.video.price || 1000}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center pt-6 pb-8">
                                            <span className="text-xs text-white font-extrabold uppercase tracking-wider">Amount Payable</span>
                                            <span className="text-4xl font-black text-white tracking-tight">₹{total}</span>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-start gap-2.5 leading-relaxed">
                                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 animate-bounce" />
                                            <div>{error}</div>
                                        </div>
                                    )}

                                    {verifying && (
                                        <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-amber-400 text-xs flex items-center gap-2.5">
                                            <Loader2 size={16} className="animate-spin text-amber-400 flex-shrink-0" />
                                            <div>Verifying secure signature with Razorpay...</div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <button
                                            onClick={handleConfirmAndPay}
                                            disabled={!scriptLoaded || loading || verifying}
                                            className="w-full py-4 rounded-xl btn-pay text-white font-extrabold text-sm transition flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" /> Starting Order...
                                                </>
                                            ) : verifying ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" /> Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    <svg fill="currentColor" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px] flex-shrink-0">
                                                        <title>Razorpay</title>
                                                        <path d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z"/>
                                                    </svg>
                                                    Pay with Razorpay
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Secure checkout guarantees */}
                                    <div className="border-t border-white/5 pt-5 mt-6 space-y-3.5">
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                            <Shield size={14} className="text-emerald-500 flex-shrink-0" /> Secure Checkout Guarantees
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-[9px] text-zinc-400 leading-normal">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                                                    Instant Access
                                                </span>
                                                Asset download active immediately upon verification.
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                                                    Secure SSL
                                                </span>
                                                Encrypted payments powered by Razorpay.
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-zinc-500 text-center leading-relaxed mt-2 pt-2 border-t border-white/5">
                                            Need assistance? Contact support at <span className="text-zinc-400 font-semibold">vinay@trackmeisters.com</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PaymentPage;
