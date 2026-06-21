import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Upload, X, CheckCircle, AlertCircle, Loader2, Play, CreditCard, Sparkles, Lock, Film, Mail, Phone, ChevronRight, Info } from 'lucide-react';
import { COLLECTIONS, addDocument, fetchCollection, deleteDocument, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { uploadFileToCloudinary, uploadToCloudinary } from '../lib/cloudinary';
import mediaQrCode from '../assets/payment qr code.jpeg';


const FpvStore = () => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState('search'); // 'search' or 'downloads'
    const [videos, setVideos] = useState([]);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [recentEventName, setRecentEventName] = useState('');

    // Purchase Modal State
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [buyerName, setBuyerName] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [paymentScreenshot, setPaymentScreenshot] = useState(null);
    const [screenshotUploading, setScreenshotUploading] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [submittingPurchase, setSubmittingPurchase] = useState(false);

    // Play preview on Mobile / Touch state
    const [playingVideoId, setPlayingVideoId] = useState(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsTouchDevice(hasTouch);
        };
        checkTouch();
    }, []);

    // Downloads/Retrieval State
    const [retrieveEmail, setRetrieveEmail] = useState('');
    const [retrievePhone, setRetrievePhone] = useState('');
    const [userPurchases, setUserPurchases] = useState([]);
    const [searchingPurchases, setSearchingPurchases] = useState(false);
    const [retrievalError, setRetrievalError] = useState('');
    const [retrievalSuccess, setRetrievalSuccess] = useState(false);

    // Hover Video Preview Reference
    const [hoveredVideoId, setHoveredVideoId] = useState(null);

    // Unlocked FPV videos state linked to localStorage for persistence
    const [unlockedVideoIds, setUnlockedVideoIds] = useState(() => {
        try {
            const saved = localStorage.getItem('unlocked_fpv_videos');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('unlocked_fpv_videos', JSON.stringify(unlockedVideoIds));
        } catch (e) {
            console.error('Failed to save unlocked videos:', e);
        }
    }, [unlockedVideoIds]);

    // Load FPV Videos & Events and run cleanup
    useEffect(() => {
        const loadStoreData = async () => {
            try {
                const [fetchedVideos, fetchedEvents] = await Promise.all([
                    fetchCollection(COLLECTIONS.FPV_VIDEOS),
                    fetchCollection(COLLECTIONS.EVENTS)
                ]);

                // Determine recent completed event
                const completed = fetchedEvents.filter(e => e.status === 'completed');
                const sortedCompleted = [...completed].sort((a, b) => {
                    const timeA = a.date ? new Date(a.date).getTime() : 0;
                    const timeB = b.date ? new Date(b.date).getTime() : 0;
                    return timeB - timeA;
                });

                let finalVideos = fetchedVideos;
                if (sortedCompleted.length > 0) {
                    const recentCompletedEvent = sortedCompleted[0];
                    setRecentEventName(recentCompletedEvent.title);

                    const recentEventId = recentCompletedEvent.id;
                    const recentEventTitle = recentCompletedEvent.title.toLowerCase().trim();

                    // Find videos of previous events (i.e. those that don't match the recent completed event)
                    const videosToDelete = fetchedVideos.filter(video => {
                        const matchesId = video.eventId === recentEventId;
                        const matchesName = video.eventName && video.eventName.toLowerCase().trim() === recentEventTitle;
                        return !(matchesId || matchesName);
                    });

                    // Delete previous event FPV videos from Firestore
                    if (videosToDelete.length > 0) {
                        console.log(`Cleaning up ${videosToDelete.length} FPV videos from previous events.`);
                        await Promise.all(
                            videosToDelete.map(video =>
                                deleteDocument(COLLECTIONS.FPV_VIDEOS, video.id)
                                    .catch(err => console.error(`Failed to delete FPV video ${video.id}:`, err))
                            )
                        );
                    }

                    // Keep only recent completed event videos in local state
                    finalVideos = fetchedVideos.filter(video => {
                        const matchesId = video.eventId === recentEventId;
                        const matchesName = video.eventName && video.eventName.toLowerCase().trim() === recentEventTitle;
                        return matchesId || matchesName;
                    });
                }

                setVideos(finalVideos);
            } catch (err) {
                console.error('Error fetching FPV store data:', err);
            } finally {
                setLoadingVideos(false);
            }
        };
        loadStoreData();
    }, []);

    // Handle Payment Screenshot Upload
    const handleScreenshotChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setScreenshotUploading(true);
        setCheckoutError('');
        try {
            // Upload screenshot to Cloudinary under 'fpv_receipts' folder
            const url = await uploadToCloudinary(file, 'fpv_receipts');
            setPaymentScreenshot(url);
        } catch (err) {
            console.error('Screenshot upload error:', err);
            setCheckoutError('Failed to upload screenshot. Please try again.');
        } finally {
            setScreenshotUploading(false);
        }
    };

    // Submit FPV Purchase
    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        setCheckoutError('');

        if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
            setCheckoutError('Please fill out all buyer details.');
            return;
        }

        if (!paymentScreenshot) {
            setCheckoutError('Please upload your payment receipt screenshot.');
            return;
        }

        setSubmittingPurchase(true);

        try {
            const purchaseData = {
                videoId: selectedVideo.id,
                videoTitle: `${selectedVideo.carModel} (${selectedVideo.vehicleNumber}) - ${selectedVideo.eventName}`,
                buyerName: buyerName.trim(),
                buyerEmail: buyerEmail.toLowerCase().trim(),
                buyerPhone: buyerPhone.trim(),
                paymentScreenshot,
                status: 'approved',
                price: selectedVideo.price || 1000,
                createdAt: new Date().toISOString()
            };

            await addDocument(COLLECTIONS.FPV_PURCHASES, purchaseData);

            // Add to unlocked video IDs list
            setUnlockedVideoIds(prev => {
                if (!prev.includes(selectedVideo.id)) {
                    return [...prev, selectedVideo.id];
                }
                return prev;
            });

            setCheckoutSuccess(true);
            // Reset form
            setBuyerName('');
            setBuyerEmail('');
            setBuyerPhone('');
            setPaymentScreenshot(null);
        } catch (err) {
            console.error('Error submitting purchase receipt:', err);
            setCheckoutError('Failed to record purchase. Please contact support.');
        } finally {
            setSubmittingPurchase(false);
        }
    };

    // Retrieve purchases for buyer email/phone
    const handleRetrievePurchases = async (e) => {
        e.preventDefault();
        setRetrievalError('');
        setRetrievalSuccess(false);

        const emailVal = retrieveEmail.trim().toLowerCase();
        const phoneVal = retrievePhone.trim();

        if (!emailVal && !phoneVal) {
            setRetrievalError('Please enter either your email or phone number.');
            return;
        }

        if (!db) {
            setRetrievalError('Database not initialized. Please try again later.');
            return;
        }

        setSearchingPurchases(true);

        try {
            const purchasesRef = collection(db, COLLECTIONS.FPV_PURCHASES);
            let q;

            // Query by email primarily if provided, else phone
            if (emailVal) {
                q = query(purchasesRef, where('buyerEmail', '==', emailVal));
            } else {
                q = query(purchasesRef, where('buyerPhone', '==', phoneVal));
            }

            const snapshot = await getDocs(q);
            let fetchedPurchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // If we queried by email but phone was also provided, we can filter or double-check
            if (emailVal && phoneVal) {
                fetchedPurchases = fetchedPurchases.filter(p => p.buyerPhone === phoneVal);
            }

            // For each purchase, fetch the corresponding video details
            const enhancedPurchases = await Promise.all(fetchedPurchases.map(async (purchase) => {
                try {
                    // Look up video in the preloaded videos list to avoid redundant reads
                    const matchedVideo = videos.find(v => v.id === purchase.videoId);
                    if (matchedVideo) {
                        return {
                            ...purchase,
                            videoDetails: matchedVideo
                        };
                    }
                } catch (err) {
                    console.error(`Error pairing video ${purchase.videoId} for purchase ${purchase.id}:`, err);
                }
                return purchase;
            }));

            setUserPurchases(enhancedPurchases);
            setRetrievalSuccess(true);

            // Sync retrieved approved purchases to local unlocked list
            const approvedVideoIds = fetchedPurchases
                .filter(p => p.status === 'approved')
                .map(p => p.videoId);

            if (approvedVideoIds.length > 0) {
                setUnlockedVideoIds(prev => {
                    const merged = [...prev];
                    approvedVideoIds.forEach(id => {
                        if (!merged.includes(id)) {
                            merged.push(id);
                        }
                    });
                    return merged;
                });
            }

            if (enhancedPurchases.length === 0) {
                setRetrievalError('No purchases found matching those details. Make sure you entered the same email/phone used during checkout.');
            }
        } catch (err) {
            console.error('Error retrieving purchases:', err);
            setRetrievalError('Failed to fetch downloads. Please try again.');
        } finally {
            setSearchingPurchases(false);
        }
    };

    // Cloudinary Secure Preview URL Generator
    const getPreviewUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        // Transforms to trim the video: so_0,eo_4 (start 0s, end 4s), scaled down, auto format & quality, muted.
        return url.replace('/upload/', '/upload/so_0,eo_4,q_auto,f_auto,w_640,vc_vp9,ac_none/');
    };

    const displayVideos = videos;

    return (
        <div className="min-h-screen bg-[var(--color-bg)] text-white font-sans pb-16">
            {/* Styles inject for custom design tokens, keeping layout dark & premium */}
            <style>{`
                .glass-card {
                    background: var(--color-surface);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s ease;
                }
                .glass-card:hover {
                    background: var(--color-surface-hover);
                    border-color: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
                }
                .text-gradient {
                    background: linear-gradient(135deg, #ffffff 30%, var(--color-highlight) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .btn-primary {
                    background: var(--color-accent);
                    border: 1px solid var(--color-accent);
                    box-shadow: 0 4px 15px var(--color-accent-glow);
                    transition: all 0.3s ease;
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    background: #ff4d4d;
                    border-color: #ff4d4d;
                    box-shadow: 0 6px 20px var(--color-accent-glow);
                }
            `}</style>

            {/* Header / Hero Section */}
            <div className="pt-28 pb-10 text-center relative overflow-hidden bg-gradient-to-b from-[rgba(2,35,63,0.5)] to-[var(--color-bg)] border-b border-[rgba(255,255,255,0.05)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-accent-glow)_0%,transparent_70%)] opacity-20 pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 relative z-10">

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="hero-title"
                        style={{ fontSize: 'clamp(2.2rem, 7vw, 4.5rem)', marginBottom: '20px', position: 'relative', zIndex: 2 }}
                        data-text="FPV STORE"
                    >
                        FPV STORE
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-[var(--color-text-secondary)] text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-6"
                    >
                        Preview and purchase high-definition FPV drone track footage{recentEventName ? ` from our most recent event: ${recentEventName}` : ' from your sessions'}.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-semibold text-zinc-300 bg-[var(--color-surface)] backdrop-blur-md border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-2.5 shadow-md"
                    >
                        <span>4K 25fps / 120fps</span>
                        <span className="text-zinc-600 select-none" aria-hidden="true">•</span>
                        <span>30sec - 2min</span>
                        <span className="text-zinc-600 select-none" aria-hidden="true">•</span>
                        <span>Gyro Stabilized</span>
                        <span className="text-zinc-600 select-none" aria-hidden="true">•</span>
                        <span>Uncompressed format ready to upload on socials</span>
                    </motion.div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-6xl mx-auto px-4 mt-8">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >

                    {/* Videos Grid */}
                    {loadingVideos ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-[var(--color-accent)] mb-4" size={40} />
                            <p className="text-[var(--color-text-secondary)]">Scanning footage repository...</p>
                        </div>
                    ) : (
                        displayVideos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {displayVideos.map((video) => {
                                    const isPlaying = hoveredVideoId === video.id || playingVideoId === video.id;
                                    let derivedThumbnailUrl = video.thumbnailUrl;
                                    if (!derivedThumbnailUrl) {
                                        const sourceUrl = video.previewVideoUrl || video.fullVideoUrl;
                                        if (sourceUrl && sourceUrl.includes('cloudinary.com')) {
                                            if (sourceUrl.includes('.mp4')) {
                                                derivedThumbnailUrl = sourceUrl.replace('.mp4', '.jpg').replace('/upload/', '/upload/so_0/');
                                            } else {
                                                derivedThumbnailUrl = sourceUrl.replace('/upload/', '/upload/so_0,f_jpg/');
                                            }
                                        }
                                    }
                                    return (
                                        <motion.div
                                            key={video.id}
                                            layout
                                            onClick={() => {
                                                setSelectedVideo(video);
                                                setCheckoutSuccess(false);
                                                setCheckoutError('');
                                            }}
                                            className="glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group/card"
                                            onMouseEnter={() => {
                                                if (!isTouchDevice) {
                                                    setHoveredVideoId(video.id);
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredVideoId(null);
                                            }}
                                        >
                                            {/* Video Preview Holder */}
                                            <div className="relative aspect-video bg-black overflow-hidden border-b border-[rgba(255,255,255,0.08)]">
                                                {/* Close preview button for active playback */}
                                                {isPlaying && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPlayingVideoId(null);
                                                            setHoveredVideoId(null);
                                                        }}
                                                        className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition"
                                                        title="Stop preview"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}

                                                {/* Competition Number Badge Overlay */}
                                                {!isPlaying && (
                                                    <div className="absolute top-3 left-3 z-10">
                                                        <span className="px-2.5 py-1 text-xs font-mono font-bold tracking-wider bg-[var(--color-accent)] text-white rounded-lg shadow-lg border border-[var(--color-accent)]/20">
                                                            COMP #{video.vehicleNumber || 'N/A'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Price Tag Overlay */}
                                                {!isPlaying && (
                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className="px-2.5 py-1 text-xs font-bold bg-[var(--color-bg)]/85 backdrop-blur-md text-[var(--color-highlight)] rounded-lg shadow-lg border border-[rgba(255,255,255,0.05)]">
                                                            {video.price === 0 ? 'FREE' : (unlockedVideoIds.includes(video.id) ? 'UNLOCKED' : `₹${video.price || 1000}`)}
                                                        </span>
                                                    </div>
                                                )}

                                                {isPlaying ? (
                                                    video.previewVideoUrl && !video.previewVideoUrl.includes('drive.google.com') ? (
                                                        <video
                                                            src={video.previewVideoUrl}
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : !video.isGoogleDrive && video.fullVideoUrl && !video.fullVideoUrl.includes('drive.google.com') ? (
                                                        <video
                                                            src={getPreviewUrl(video.fullVideoUrl)}
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (video.previewVideoId || (video.price === 0 && video.googleDriveId)) ? (
                                                        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                                                            <iframe
                                                                src={`https://drive.google.com/file/d/${video.previewVideoId || video.googleDriveId}/preview?autoplay=1&mute=1`}
                                                                className="absolute w-full border-0"
                                                                style={{
                                                                    height: '140%',
                                                                    top: '-20%',
                                                                    left: 0,
                                                                }}
                                                                allow="autoplay"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full relative flex items-center justify-center bg-[var(--color-bg)]">
                                                            {derivedThumbnailUrl ? (
                                                                <img
                                                                    src={derivedThumbnailUrl}
                                                                    alt={video.carModel}
                                                                    className="w-full h-full object-cover opacity-60"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        const fallback = e.target.parentElement.querySelector('.fallback-placeholder');
                                                                        if (fallback) fallback.style.display = 'flex';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div
                                                                className="fallback-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[rgba(15,40,75,0.8)] to-[rgba(5,20,40,0.9)]"
                                                                style={{ display: derivedThumbnailUrl ? 'none' : 'flex' }}
                                                            >
                                                                <Film size={36} className="text-zinc-500 mb-1.5" />
                                                                <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">Track Footage</span>
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                <div className="w-12 h-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white shadow-lg border border-white/20">
                                                                    <Play size={20} fill="currentColor" className="ml-1" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="w-full h-full relative flex items-center justify-center bg-[var(--color-bg)]">
                                                        {derivedThumbnailUrl ? (
                                                            <img
                                                                src={derivedThumbnailUrl}
                                                                alt={video.carModel}
                                                                className="w-full h-full object-cover opacity-60 transition-transform duration-500 group-hover/card:scale-105"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    const fallback = e.target.parentElement.querySelector('.fallback-placeholder');
                                                                    if (fallback) fallback.style.display = 'flex';
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div
                                                            className="fallback-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[rgba(15,40,75,0.8)] to-[rgba(5,20,40,0.9)]"
                                                            style={{ display: derivedThumbnailUrl ? 'none' : 'flex' }}
                                                        >
                                                            <Film size={36} className="text-zinc-500 mb-1.5" />
                                                            <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">Track Footage</span>
                                                        </div>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)]/90 via-transparent to-transparent" />

                                                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                                                            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-[var(--color-bg)]/60 rounded border border-[rgba(255,255,255,0.05)] text-zinc-300">
                                                                {isTouchDevice ? 'Tap Play for Preview' : (video.previewVideoUrl ? 'hover for preview' : (video.isGoogleDrive || video.fullVideoUrl?.includes('drive.google.com') ? 'Google Drive' : '4s preview'))}
                                                            </span>
                                                            <div 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPlayingVideoId(video.id);
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-[var(--color-accent)]/90 flex items-center justify-center text-white shadow-lg group-hover/card:scale-110 transition-transform cursor-pointer"
                                                            >
                                                                <Play size={14} fill="currentColor" className="ml-0.5" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        {/* Info */}
                                        <div className="p-5 flex-grow flex flex-col justify-between">
                                            <div>
                                                <div className="text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider mb-1">
                                                    {video.eventName}
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1 leading-snug group-hover/card:text-[var(--color-highlight)] transition-colors">
                                                    {video.driverName}
                                                </h3>
                                                <div className="text-sm text-[var(--color-text-secondary)] mb-4">
                                                    {video.carModel}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.05)]">
                                                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                                                    {video.price === 0 || unlockedVideoIds.includes(video.id) ? 'Unlocked Access' : 'Unlock Footage'}
                                                </span>
                                                <div className="btn-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md">
                                                    {video.price === 0 || unlockedVideoIds.includes(video.id) ? (
                                                        <>
                                                            <Download size={13} /> Download
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CreditCard size={13} /> Buy Now
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto">
                                <AlertCircle size={48} className="text-[var(--color-text-secondary)] mx-auto mb-4" />
                                <h3 className="text-xl font-bold mb-2">No Runs Found</h3>
                                <p className="text-[var(--color-text-secondary)] text-sm">
                                    No FPV footage has been uploaded yet for this event. Check back later!
                                </p>
                            </div>
                        )
                    )}
                </motion.div>
            </div>

            {/* UPI Checkout Modal */}
            <AnimatePresence>
                {selectedVideo && (
                    <div className="fixed inset-0 z-[1100] overflow-y-auto p-4 md:p-6 flex items-start md:items-center justify-center">
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { if (!submittingPurchase && !screenshotUploading) setSelectedVideo(null); }}
                            className="absolute inset-0 bg-[var(--color-bg)]/80 backdrop-blur-md"
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl glass-card rounded-3xl overflow-hidden shadow-2xl z-10 grid grid-cols-1 md:grid-cols-2 my-8 md:my-0"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedVideo(null)}
                                disabled={submittingPurchase || screenshotUploading}
                                className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-white p-1 rounded-full bg-[rgba(10,40,70,0.6)] border border-[rgba(255,255,255,0.08)] hover:bg-[var(--color-surface-hover)] transition z-20"
                            >
                                <X size={20} />
                            </button>

                            {/* Left Side: UPI QR code details / Video Preview */}
                            <div className="p-6 md:p-8 bg-[rgba(10,40,70,0.4)] border-r border-[rgba(255,255,255,0.08)] flex flex-col justify-between">
                                {(selectedVideo.price === 0 || unlockedVideoIds.includes(selectedVideo.id)) ? (
                                    <div>
                                        <div className="text-xs text-[var(--color-highlight)] font-bold uppercase tracking-wider mb-2">
                                            Free Access Footage
                                        </div>
                                        <h3 className="text-2xl font-extrabold text-white mb-4">
                                            Video Preview
                                        </h3>
                                        {selectedVideo.previewVideoUrl && !selectedVideo.previewVideoUrl.includes('drive.google.com') ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-black mb-4">
                                                <video
                                                    src={selectedVideo.previewVideoUrl}
                                                    controls
                                                    autoPlay
                                                    muted
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (selectedVideo.previewVideoId || selectedVideo.googleDriveId) ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-black mb-4">
                                                <iframe
                                                    src={`https://drive.google.com/file/d/${selectedVideo.previewVideoId || selectedVideo.googleDriveId}/preview`}
                                                    className="w-full h-full border-0"
                                                    allow="autoplay"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : !selectedVideo.isGoogleDrive && selectedVideo.fullVideoUrl && !selectedVideo.fullVideoUrl.includes('drive.google.com') ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-black mb-4">
                                                <video
                                                    src={selectedVideo.fullVideoUrl}
                                                    controls
                                                    autoPlay
                                                    muted
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-dashed border-[rgba(255,255,255,0.1)] bg-[var(--color-bg)] flex flex-col items-center justify-center text-zinc-500 mb-4">
                                                <Film size={36} className="mb-2 text-zinc-600" />
                                                <span className="text-xs">No preview video available</span>
                                            </div>
                                        )}
                                        <div className="mt-4 p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-2">
                                            <div className="flex items-center gap-2 text-[var(--color-highlight)] text-[11px] font-semibold tracking-wide uppercase">
                                                <Info size={14} className="text-[var(--color-highlight)]" />
                                                <span>Preview Clip</span>
                                            </div>
                                            <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                                                This player shows a short preview. The full high-resolution, uncompressed Master FPV footage will be downloaded.
                                            </p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-[rgba(255,255,255,0.05)] text-[11px]">
                                                <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1">
                                                    <span className="text-zinc-500 font-medium">Actual Duration</span>
                                                    <span className="text-zinc-300 font-semibold">1m 30s - 2m 00s</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1">
                                                    <span className="text-zinc-500 font-medium">Resolution</span>
                                                    <span className="text-zinc-300 font-semibold">4K UHD (2160p)</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 font-medium">Format</span>
                                                    <span className="text-zinc-300 font-semibold">Master MP4</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 font-medium">Download Size</span>
                                                    <span className="text-zinc-300 font-semibold">
                                                        {selectedVideo.fileSize && selectedVideo.fileSize > 0 
                                                            ? `${(selectedVideo.fileSize / (1024 * 1024)).toFixed(1)} MB` 
                                                            : '~150 - 250 MB'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider mb-2">
                                            FPV Footage Payment
                                        </div>
                                        <h3 className="text-2xl font-extrabold text-white mb-4">
                                            Scan to Pay
                                        </h3>

                                        {/* Preview Video for Paid Run */}
                                        {selectedVideo.previewVideoUrl && !selectedVideo.previewVideoUrl.includes('drive.google.com') ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-black mb-4">
                                                <video
                                                    src={selectedVideo.previewVideoUrl}
                                                    controls
                                                    autoPlay
                                                    muted
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : selectedVideo.previewVideoId ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-black mb-4">
                                                <iframe
                                                    src={`https://drive.google.com/file/d/${selectedVideo.previewVideoId}/preview`}
                                                    className="w-full h-full border-0"
                                                    allow="autoplay"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ) : null}

                                        <div className="mb-5 p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-2">
                                            <div className="flex items-center gap-2 text-[var(--color-accent)] text-[11px] font-semibold tracking-wide uppercase">
                                                <Info size={14} className="text-[var(--color-accent)]" />
                                                <span>Preview Clip</span>
                                            </div>
                                            <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                                                This player shows a short preview. Purchasing will unlock the full high-resolution, uncompressed Master FPV footage.
                                            </p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-[rgba(255,255,255,0.05)] text-[11px]">
                                                <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1">
                                                    <span className="text-zinc-500 font-medium">Actual Duration</span>
                                                    <span className="text-zinc-300 font-semibold">1m 30s - 2m 00s</span>
                                                </div>
                                                <div className="flex justify-between border-b border-[rgba(255,255,255,0.02)] pb-1">
                                                    <span className="text-zinc-500 font-medium">Resolution</span>
                                                    <span className="text-zinc-300 font-semibold">4K UHD (2160p)</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 font-medium">Format</span>
                                                    <span className="text-zinc-300 font-semibold">Master MP4</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500 font-medium">Download Size</span>
                                                    <span className="text-zinc-300 font-semibold">
                                                        {selectedVideo.fileSize && selectedVideo.fileSize > 0 
                                                            ? `${(selectedVideo.fileSize / (1024 * 1024)).toFixed(1)} MB` 
                                                            : '~150 - 250 MB'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed mb-6">
                                            Scan the QR code below via any UPI App (GPay, PhonePe, Paytm, BHIM) to make the payment. Ensure you transfer the exact amount.
                                        </p>

                                        {/* QR Code Graphic */}
                                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl w-48 h-48 mx-auto shadow-inner border border-zinc-200">
                                            <img
                                                src={mediaQrCode}
                                                alt="UPI QR Code"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <a
                                            className="mobile-only-upi-btn"
                                            href={`upi://pay?pa=9880123355@ybl&pn=MADKAM%20INC&am=${selectedVideo.price || 1000}&cu=INR&tn=FPV%20Footage%20COMP%20%23${selectedVideo.vehicleNumber || ''}`}
                                            style={{
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: '#2563eb',
                                                color: 'white',
                                                textDecoration: 'none',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Pay Now
                                        </a>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)]">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--color-text-secondary)]">Video Item</span>
                                        <span className="text-white font-bold text-right truncate max-w-[200px]">{selectedVideo.carModel}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-2">
                                        <span className="text-[var(--color-text-secondary)]">Price</span>
                                        <span className="text-xl font-extrabold text-white">
                                            {selectedVideo.price === 0 ? 'FREE' : (unlockedVideoIds.includes(selectedVideo.id) ? 'UNLOCKED' : `₹${selectedVideo.price || 1000}`)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Upload Form / Free Download */}
                            <div className="p-6 md:p-8 flex flex-col justify-between">
                                {(selectedVideo.price === 0 || unlockedVideoIds.includes(selectedVideo.id)) ? (
                                    <div className="h-full flex flex-col justify-center space-y-6">
                                        <div>
                                            <h4 className="text-xl font-bold text-white mb-2">
                                                {selectedVideo.price === 0 ? 'Download Free Video' : 'Download Unlocked Video'}
                                            </h4>
                                            <p className="text-zinc-400 text-xs leading-relaxed">
                                                {selectedVideo.price === 0
                                                    ? 'This video is free of charge. You can download it directly below without any payment.'
                                                    : 'You have permanently unlocked this video. You can download it directly below.'}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-zinc-400">Comp No</span>
                                                <span className="text-white font-semibold">COMP #{selectedVideo.vehicleNumber}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-zinc-400">Video Type</span>
                                                <span className="text-white font-semibold">FPV</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-zinc-400">Event</span>
                                                <span className="text-[var(--color-accent)] font-semibold">{selectedVideo.eventName}</span>
                                            </div>
                                        </div>

                                        <a
                                            href={selectedVideo.fullVideoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="w-full py-3.5 rounded-xl btn-primary text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Download size={16} /> Download Full Video (4K)
                                        </a>

                                        <button
                                            onClick={() => setSelectedVideo(null)}
                                            className="w-full py-2.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-zinc-400 hover:text-white text-xs font-semibold border border-[rgba(255,255,255,0.08)] transition text-center"
                                        >
                                            Close
                                        </button>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        {checkoutSuccess ? (
                                            <motion.div
                                                key="success-form"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="h-full flex flex-col items-center justify-center text-center py-8"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-[var(--color-highlight)]/10 border border-[var(--color-highlight)]/20 text-[var(--color-highlight)] flex items-center justify-center mb-4 animate-bounce">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <h4 className="text-xl font-bold mb-2 text-[var(--color-highlight)]">Video Unlocked!</h4>
                                                <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed max-w-sm mb-6">
                                                    Thank you for your payment receipt. Your video has been unlocked automatically! You can download it below.
                                                </p>
                                                {selectedVideo?.fullVideoUrl ? (
                                                    <a
                                                        href={selectedVideo.fullVideoUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                        className="btn-primary text-white text-sm font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg mb-4 w-full"
                                                    >
                                                        <Download size={16} /> Download Full Video
                                                    </a>
                                                ) : (
                                                    <p className="text-amber-400 text-xs mb-4">Video link not available yet.</p>
                                                )}
                                                <button
                                                    onClick={() => setSelectedVideo(null)}
                                                    className="px-6 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-white text-xs font-semibold border border-[rgba(255,255,255,0.08)] transition"
                                                >
                                                    Back to Store
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <motion.form
                                                key="purchase-form"
                                                onSubmit={handlePurchaseSubmit}
                                                className="space-y-4"
                                            >
                                                <h4 className="text-lg font-bold text-white mb-2">Buyer Details</h4>

                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                                                        Full Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="John Doe"
                                                        value={buyerName}
                                                        onChange={(e) => setBuyerName(e.target.value)}
                                                        className="w-full bg-[rgba(10,40,70,0.3)] border border-[rgba(255,255,255,0.08)] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 text-sm text-white placeholder-zinc-600"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                                                        Email Address
                                                    </label>
                                                    <input
                                                        type="email"
                                                        required
                                                        placeholder="john@example.com"
                                                        value={buyerEmail}
                                                        onChange={(e) => setBuyerEmail(e.target.value)}
                                                        className="w-full bg-[rgba(10,40,70,0.3)] border border-[rgba(255,255,255,0.08)] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 text-sm text-white placeholder-zinc-600"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                                                        Phone Number
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        placeholder="9876543210"
                                                        value={buyerPhone}
                                                        onChange={(e) => setBuyerPhone(e.target.value)}
                                                        className="w-full bg-[rgba(10,40,70,0.3)] border border-[rgba(255,255,255,0.08)] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 text-sm text-white placeholder-zinc-600"
                                                    />
                                                </div>

                                                {/* Screenshot Uploader */}
                                                <div>
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
                                                        Payment Screenshot (UPI Receipt)
                                                    </label>
                                                    {paymentScreenshot ? (
                                                        <div className="relative border border-[rgba(255,255,255,0.08)] bg-[rgba(10,40,70,0.4)] rounded-xl p-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-2.5 truncate">
                                                                <div className="w-10 h-10 rounded bg-zinc-900 overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.1)]">
                                                                    <img
                                                                        src={paymentScreenshot}
                                                                        alt="Payment screenshot preview"
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-[var(--color-highlight)] font-semibold truncate flex items-center gap-1">
                                                                    <CheckCircle size={12} /> Uploaded Successfully
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPaymentScreenshot(null)}
                                                                className="text-[var(--color-text-secondary)] hover:text-white p-1.5"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[var(--color-accent)]/50 bg-[rgba(10,40,70,0.2)] rounded-xl p-6 text-center cursor-pointer transition-colors group">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                required
                                                                onChange={handleScreenshotChange}
                                                                disabled={screenshotUploading}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                            />
                                                            {screenshotUploading ? (
                                                                <div className="flex flex-col items-center py-1">
                                                                    <Loader2 className="animate-spin text-[var(--color-accent)] mb-2" size={20} />
                                                                    <span className="text-xs text-[var(--color-text-secondary)]">Uploading receipt image...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <Upload className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] mb-2 transition-colors" size={20} />
                                                                    <span className="text-xs text-[var(--color-text-secondary)]">Click to upload screenshot</span>
                                                                    <span className="text-[10px] text-[var(--color-text-muted)] mt-1">JPEG, PNG up to 10MB</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {checkoutError && (
                                                    <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                                                        <AlertCircle size={14} /> {checkoutError}
                                                    </div>
                                                )}

                                                <div className="pt-2">
                                                    <button
                                                        type="submit"
                                                        disabled={submittingPurchase || screenshotUploading || !paymentScreenshot}
                                                        className="w-full py-3 rounded-xl btn-primary text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {submittingPurchase ? (
                                                            <>
                                                                <Loader2 className="animate-spin" size={16} /> Recording Purchase...
                                                            </>
                                                        ) : (
                                                            'Submit Payment Verification'
                                                        )}
                                                    </button>
                                                </div>
                                            </motion.form>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FpvStore;
