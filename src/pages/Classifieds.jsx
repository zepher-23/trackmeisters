import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Car,
    Gauge,
    Calendar,
    Fuel,
    Settings,
    Mail,
    Loader2,
    Search,
    Filter,
    Tag,
    ChevronUp,
    X,
    Check,
    Upload,
    Trash2,
    Phone,
    User,
    MessageSquare,
    Copy,
    CheckCircle,
    Shield
} from 'lucide-react';
import paymentQrCode from '../assets/payment qr code.jpeg';
import { useClassifieds } from '../hooks/useFirebase';
import { submitContactForm, submitListingRequest } from '../lib/api';
import { addDocument, COLLECTIONS } from '../lib/firebase';
import { uploadToCloudinary } from '../lib/cloudinary';

const ClassifiedsContactModal = ({ isOpen, onClose, type, listing }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleMileage: '',
        vehiclePrice: '',
        vehicleEngine: '',
        vehicleTrans: '',
        vehicleDesc: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('idle'); // idle, success, error
    const [listingImages, setListingImages] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [step, setStep] = useState(1); // 1: Form, 2: Payment, 3: Complete
    const [generatedListingId, setGeneratedListingId] = useState(null);

    // Reset/Prefill form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSubmissionStatus('idle'); // Reset status
            setListingImages([]);
            setUploadProgress(0);
            setStep(1);
            setGeneratedListingId(null);

            if (type === 'inquiry' && listing) {
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    message: `I am interested in the ${listing.year} ${listing.make} ${listing.model} listed for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(typeof listing.price === 'string' ? parseFloat(listing.price.replace(/[^0-9.]/g, '')) : listing.price)}.`,
                    vehicleMake: '', vehicleModel: '', vehicleYear: '', vehicleMileage: '', vehiclePrice: '', vehicleEngine: '', vehicleTrans: '', vehicleDesc: ''
                });
            } else {
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    message: '',
                    vehicleMake: '',
                    vehicleModel: '',
                    vehicleYear: '',
                    vehicleMileage: '',
                    vehiclePrice: '',
                    vehicleEngine: '',
                    vehicleTrans: '',
                    vehicleDesc: ''
                });
            }
        }
    }, [isOpen, type, listing]);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setListingImages(prev => [...prev, ...files].slice(0, 8)); // Limit to 8 images
        }
    };

    const removeImage = (index) => {
        setListingImages(prev => prev.filter((_, i) => i !== index));
    };

    const generateListingId = (make) => {
        const makeCode = (make || 'XX').substring(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X');
        const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
        return `${makeCode}-${randomDigits}`;
    };

    const handleCopyId = () => {
        if (generatedListingId) {
            navigator.clipboard.writeText(generatedListingId);
            alert('Listing ID copied to clipboard!');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadProgress(0);
        try {
            // LISTING REQUEST FLOW
            if (type === 'listing') {
                const newListingId = generateListingId(formData.vehicleMake);
                setGeneratedListingId(newListingId);

                let imageUrls = [];

                // Upload Images
                if (listingImages.length > 0) {
                    for (let i = 0; i < listingImages.length; i++) {
                        const file = listingImages[i];
                        setUploadProgress(Math.round(((i) / listingImages.length) * 100));

                        try {
                            const url = await uploadToCloudinary(file, 'classifieds');
                            imageUrls.push(url);
                        } catch (uploadErr) {
                            console.error(`Failed to upload image ${i + 1}:`, uploadErr);
                        }
                    }
                    setUploadProgress(100);
                }

                const listingData = {
                    title: `${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}`,
                    make: formData.vehicleMake,
                    model: formData.vehicleModel,
                    year: formData.vehicleYear,
                    price: formData.vehiclePrice,
                    mileage: formData.vehicleMileage,
                    engine: formData.vehicleEngine,
                    transmission: formData.vehicleTrans,
                    description: formData.vehicleDesc,
                    contactName: formData.name,
                    contactEmail: formData.email,
                    contactPhone: formData.phone,
                    isPublished: false,
                    status: 'pending_payment',
                    listingId: newListingId,
                    featuredImage: imageUrls.length > 0 ? imageUrls[0] : '',
                    images: imageUrls,
                    createdAt: new Date().toISOString()
                };

                try {
                    await addDocument(COLLECTIONS.CLASSIFIEDS, listingData);
                } catch (dbError) {
                    console.error('Failed to save listing to database:', dbError);
                }

                // Send Listing Request Email
                await submitListingRequest({
                    ...formData,
                    listingId: newListingId,
                    images: imageUrls
                });

                // Move to Payment Step
                setStep(2);

            } else {
                // INQUIRY FLOW (Standard)
                await submitContactForm({
                    ...formData,
                    subject: `Inquiry: ${listing.title}`
                });
                setSubmissionStatus('success');
            }

        } catch (error) {
            console.error(error);
            setSubmissionStatus('error');
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    // --- RENDER SUCCESS / PAYMENT STEPS ---

    // Step 3: Completion (Listing) OR Success (Inquiry)
    if (step === 3 || submissionStatus === 'success') {
        const isListingComplete = step === 3 && type === 'listing';

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '40px',
                        width: '100%',
                        maxWidth: '500px',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        color: '#22c55e'
                    }}>
                        <Check size={32} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                        {isListingComplete ? 'Payment Submitted!' : 'Request Sent!'}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
                        {isListingComplete
                            ? 'Thank you for completing the payment. We verify the transaction and approve your listing shortly.'
                            : 'Your message has been sent to the seller successfully.'}
                    </p>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 30px',
                            background: 'var(--color-accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Close
                    </button>
                </motion.div>
            </div>
        );
    }

    // Modal Content for Step 1 & 2
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '32px',
                    width: '100%',
                    maxWidth: '500px',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}
                >
                    <X size={24} />
                </button>

                {/* STEP 1: FORM */}
                {step === 1 && (
                    <>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: 'var(--color-text-primary)' }}>
                            {type === 'inquiry' ? 'Contact Seller' : 'List Your Car'}
                        </h2>

                        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* User Details Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '16px', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Contact Details</h3>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Email</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Phone</label>
                                            <input
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Details Section - Listing Only */}
                                {type === 'listing' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                                        <h3 style={{ fontSize: '16px', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginTop: '10px' }}>Vehicle Details</h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Make</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Porsche"
                                                    value={formData.vehicleMake}
                                                    onChange={e => setFormData({ ...formData, vehicleMake: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Model</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. 911 GT3"
                                                    value={formData.vehicleModel}
                                                    onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Year</label>
                                                <input
                                                    type="number"
                                                    required
                                                    placeholder="YYYY"
                                                    value={formData.vehicleYear}
                                                    onChange={e => setFormData({ ...formData, vehicleYear: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Mileage (km)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={formData.vehicleMileage}
                                                    onChange={e => setFormData({ ...formData, vehicleMileage: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Asking Price (₹)</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.vehiclePrice}
                                                onChange={e => setFormData({ ...formData, vehiclePrice: e.target.value })}
                                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Engine</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 4.0L Flat-6"
                                                    value={formData.vehicleEngine}
                                                    onChange={e => setFormData({ ...formData, vehicleEngine: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Transmission</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Manual, PDK, Automatic"
                                                    value={formData.vehicleTrans}
                                                    onChange={e => setFormData({ ...formData, vehicleTrans: e.target.value })}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Vehicle Description & Mods</label>
                                            <textarea
                                                rows={4}
                                                required
                                                placeholder="Describe condition, modifications, history..."
                                                value={formData.vehicleDesc}
                                                onChange={e => setFormData({ ...formData, vehicleDesc: e.target.value })}
                                                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical' }}
                                            />
                                        </div>

                                        {/* Image Upload Section */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                                Photos (Max 8)
                                            </label>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                                {/* Preview Selected Images */}
                                                {listingImages.map((file, idx) => (
                                                    <div key={idx} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                                        <img
                                                            src={URL.createObjectURL(file)}
                                                            alt="preview"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(idx)}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '4px',
                                                                right: '4px',
                                                                background: 'rgba(0,0,0,0.7)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '20px',
                                                                height: '20px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Add Button */}
                                                {listingImages.length < 8 && (
                                                    <label style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px dashed var(--color-border)',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        aspectRatio: '1/1',
                                                        color: 'var(--color-text-secondary)'
                                                    }}>
                                                        <Upload size={20} style={{ marginBottom: '4px' }} />
                                                        <span style={{ fontSize: '10px' }}>Add</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            onChange={handleImageSelect}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Message Section - Inquiry Only */}
                                {type === 'inquiry' && (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>Message</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical' }}
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        marginTop: '16px',
                                        width: '100%',
                                        padding: '14px',
                                        background: 'var(--color-accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        fontSize: '16px',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            {uploadProgress > 0 && uploadProgress < 100 ? `Uploading Photos ${uploadProgress}%` : 'Sending...'}
                                        </>
                                    ) : (
                                        <>
                                            {type === 'inquiry' ? <Mail size={20} /> : <Car size={20} />}
                                            {type === 'inquiry' ? 'Send Inquiry' : 'Proceed to Payment'}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                )}

                {/* STEP 2: PAYMENT (Listing Only) */}
                {step === 2 && (
                    <div style={{ textAlign: 'center', maxHeight: '75vh', overflowY: 'auto', paddingRight: '5px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 15px' }} />
                            <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--color-text-primary)' }}>Listing Submitted!</h2>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Please complete the listing fee payment to proceed.</p>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-border)', marginBottom: '24px', position: 'relative' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Listing ID</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px', color: 'var(--color-accent)' }}>{generatedListingId}</div>
                            <button
                                onClick={handleCopyId}
                                style={{ position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                                title="Copy ID"
                            >
                                <Copy size={18} />
                            </button>
                        </div>

                        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-text-primary)' }}>Instructions</h3>
                            <ol style={{ paddingLeft: '20px', color: 'var(--color-text-secondary)', lineHeight: '1.5', fontSize: '13px' }}>
                                <li style={{ marginBottom: '8px' }}>Scan the QR code below using any UPI app.</li>
                                <li style={{ marginBottom: '8px' }}>
                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>IMPORTANT:</span> Add Listing ID <b style={{ color: 'var(--color-accent)' }}>{generatedListingId}</b> in remarks.
                                </li>
                                <li>Listing Fee: <span style={{ color: 'var(--color-text-primary)', fontWeight: '700' }}>₹999</span></li>
                            </ol>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
                            <div style={{ width: '180px', height: '180px', background: '#fff', padding: '10px', borderRadius: '12px' }}>
                                <img
                                    src={paymentQrCode}
                                    alt="Payment QR Code"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>
                            <div style={{ color: 'var(--color-text-primary)', fontWeight: '600', fontSize: '16px' }}>
                                UPI: <span style={{ color: 'var(--color-accent)' }}>9880123355@ybl</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(3)} // Move to Complete
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'var(--color-accent)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            I Have Made the Payment
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};


const Classifieds = () => {
    const { data: listings, loading, error } = useClassifieds();
    const [flippedCards, setFlippedCards] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMake, setFilterMake] = useState('');
    const [contactModal, setContactModal] = useState({ open: false, type: 'inquiry', listing: null });

    // Filter published listings only
    const publishedListings = listings.filter(l => l.isPublished !== false);

    // Apply search and filter
    const filteredListings = publishedListings.filter(listing => {
        const matchesSearch = !searchTerm ||
            listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.model?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMake = !filterMake || listing.make === filterMake;
        return matchesSearch && matchesMake;
    });

    // Get unique makes for filter
    const uniqueMakes = [...new Set(publishedListings.map(l => l.make).filter(Boolean))];

    const toggleFlip = (listingId) => {
        setFlippedCards(prev => ({
            ...prev,
            [listingId]: !prev[listingId]
        }));
    };

    const formatPrice = (price) => {
        if (!price) return 'Contact for Price';

        // Convert string to number if possible (remove commas, spaces, currency symbols)
        const numPrice = typeof price === 'string'
            ? parseFloat(price.replace(/[^0-9.]/g, ''))
            : price;

        if (!isNaN(numPrice) && numPrice !== null) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(numPrice);
        }

        return price;
    };

    if (loading) {
        return (
            <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'var(--nav-height)' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>Loading classifieds...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container classifieds-page">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>

                {/* Hero Section */}
                <section style={{
                    minHeight: '60vh',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--color-bg) 0%, rgba(255,42,42,0.05) 100%)',
                    padding: '80px 40px'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div className="events-hero-grid" style={{ opacity: 0.08 }}></div>
                    </div>

                    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            style={{ textAlign: 'center' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center', marginBottom: '30px' }}>
                                <div style={{ height: '2px', width: '60px', background: 'var(--color-accent)' }}></div>
                                <span style={{ color: 'var(--color-accent)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '13px' }}>Marketplace</span>
                                <div style={{ height: '2px', width: '60px', background: 'var(--color-accent)' }}></div>
                            </div>

                            <h1 className="hero-title" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: '1', marginBottom: '30px' }}>
                                CLASSIFIEDS
                            </h1>

                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '20px', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 40px' }}>
                                Premium cars and builds from the Trackmeisters community. Browse our curated selection of performance machines.
                            </p>

                            {/* Search and Filter Bar */}
                            <div style={{
                                display: 'flex',
                                gap: '16px',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                maxWidth: '700px',
                                margin: '0 auto'
                            }}>
                                <div style={{
                                    position: 'relative',
                                    flex: '1 1 300px',
                                    maxWidth: '400px'
                                }}>
                                    <Search size={20} style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-secondary)'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search cars..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '16px 16px 16px 50px',
                                            background: 'var(--color-surface)',
                                            border: '1px solid rgba(128,128,128,0.2)',
                                            borderRadius: '8px',
                                            color: 'var(--color-text-primary)',
                                            fontSize: '16px'
                                        }}
                                    />
                                </div>

                                <select
                                    value={filterMake}
                                    onChange={(e) => setFilterMake(e.target.value)}
                                    style={{
                                        padding: '16px 40px 16px 16px',
                                        background: 'var(--color-surface)',
                                        border: '1px solid rgba(128,128,128,0.2)',
                                        borderRadius: '8px',
                                        color: 'var(--color-text-primary)',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        minWidth: '150px'
                                    }}
                                >
                                    <option value="">All Makes</option>
                                    {uniqueMakes.map(make => (
                                        <option key={make} value={make}>{make}</option>
                                    ))}
                                </select>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Listings Grid */}
                <section style={{ padding: '80px 40px', maxWidth: '1400px', margin: '0 auto' }}>
                    {filteredListings.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                textAlign: 'center',
                                padding: '80px 20px',
                                background: 'var(--color-surface)',
                                borderRadius: '16px',
                                border: '1px solid rgba(128,128,128,0.1)'
                            }}
                        >
                            <Car size={64} style={{ color: 'var(--color-text-secondary)', marginBottom: '20px', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: 'var(--color-text-primary)' }}>
                                {searchTerm || filterMake ? 'No Matches Found' : 'No Listings Yet'}
                            </h3>
                            <p style={{ color: 'var(--color-text-secondary)' }}>
                                {searchTerm || filterMake ? 'Try adjusting your search or filter criteria.' : 'Check back soon for premium car listings.'}
                            </p>
                        </motion.div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '24px'
                        }}>
                            {filteredListings.map((listing, index) => {
                                const isFlipped = flippedCards[listing.id];
                                return (
                                    <motion.div
                                        key={listing.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        style={{
                                            position: 'relative',
                                            height: '300px',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            background: 'rgba(255,255,255,0.02)'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                position: 'relative'
                                            }}
                                        >
                                            {/* Front of Card - Compact */}
                                            <div style={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                background: 'transparent'
                                            }}>
                                                {/* Image */}
                                                <div style={{
                                                    height: '160px',
                                                    backgroundImage: `url(${listing.featuredImage || listing.images?.[0] || 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800'})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    position: 'relative'
                                                }}>
                                                    {/* Price Badge */}
                                                    {listing.price && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '12px',
                                                            right: '12px',
                                                            background: 'var(--color-accent)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            color: '#fff',
                                                            fontSize: '13px',
                                                            fontWeight: '800'
                                                        }}>
                                                            {formatPrice(listing.price)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div style={{ padding: '12px' }}>
                                                    {/* Title */}
                                                    <h3 style={{
                                                        fontSize: '16px',
                                                        fontWeight: '700',
                                                        marginBottom: '6px',
                                                        color: 'var(--color-text-primary)',
                                                        lineHeight: 1.3,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {listing.title}
                                                    </h3>

                                                    {/* Specs Row */}
                                                    <div style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '8px',
                                                        marginBottom: '10px',
                                                        fontSize: '12px',
                                                        color: 'var(--color-text-secondary)'
                                                    }}>
                                                        {listing.year && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Calendar size={12} /> {listing.year}
                                                            </span>
                                                        )}
                                                        {listing.mileage && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Gauge size={12} /> {listing.mileage}
                                                            </span>
                                                        )}
                                                        {listing.transmission && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Settings size={12} /> {listing.transmission}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* View Details Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleFlip(listing.id); }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            background: 'transparent',
                                                            border: '1px solid var(--color-accent)',
                                                            borderRadius: '8px',
                                                            color: 'var(--color-accent)',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}>
                                                        View Details <ChevronUp size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Back of Card - Compact */}
                                            <motion.div
                                                initial={{ y: '100%' }}
                                                animate={{ y: isFlipped ? 0 : '100%' }}
                                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    background: 'rgba(15, 15, 20, 0.98)',
                                                    backdropFilter: 'blur(10px)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    zIndex: 30,
                                                    pointerEvents: isFlipped ? 'auto' : 'none'
                                                }}
                                            >
                                                {/* Header */}
                                                <div style={{
                                                    padding: '10px 12px',
                                                    borderBottom: '1px solid rgba(128,128,128,0.1)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    position: 'relative',
                                                    zIndex: 40
                                                }}>
                                                    <div>
                                                        <h3 style={{
                                                            fontSize: '15px',
                                                            fontWeight: '700',
                                                            color: 'var(--color-text-primary)',
                                                            marginBottom: '2px',
                                                            lineHeight: 1.3
                                                        }}>
                                                            {listing.title}
                                                        </h3>
                                                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-accent)' }}>
                                                            {formatPrice(listing.price)}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFlippedCards(prev => ({ ...prev, [listing.id]: false }));
                                                        }}
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.15)',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '40px',
                                                            height: '40px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            color: 'var(--color-text-primary)',
                                                            flexShrink: 0,
                                                            position: 'relative',
                                                            zIndex: 100,
                                                            pointerEvents: 'auto',
                                                            backdropFilter: 'blur(4px)',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                        }}
                                                    >
                                                        <X size={22} style={{ pointerEvents: 'none' }} />
                                                    </button>
                                                </div>

                                                {/* Specs Grid */}
                                                <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                                        gap: '6px',
                                                        marginBottom: '10px'
                                                    }}>
                                                        {listing.year && (
                                                            <div style={{ background: 'rgba(128,128,128,0.08)', padding: '8px', borderRadius: '6px' }}>
                                                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Year</div>
                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{listing.year}</div>
                                                            </div>
                                                        )}
                                                        {listing.mileage && (
                                                            <div style={{ background: 'rgba(128,128,128,0.08)', padding: '8px', borderRadius: '6px' }}>
                                                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Mileage</div>
                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{listing.mileage}</div>
                                                            </div>
                                                        )}
                                                        {listing.engine && (
                                                            <div style={{ background: 'rgba(128,128,128,0.08)', padding: '8px', borderRadius: '6px' }}>
                                                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Engine</div>
                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{listing.engine}</div>
                                                            </div>
                                                        )}
                                                        {listing.transmission && (
                                                            <div style={{ background: 'rgba(128,128,128,0.08)', padding: '8px', borderRadius: '6px' }}>
                                                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Trans</div>
                                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{listing.transmission}</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    {listing.description && (
                                                        <p style={{
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: '12px',
                                                            lineHeight: '1.5',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {listing.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Contact Button */}
                                                <div style={{ padding: '10px 12px' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setContactModal({ open: true, type: 'inquiry', listing });
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            width: '100%',
                                                            padding: '8px',
                                                            background: 'var(--color-accent)',
                                                            borderRadius: '8px',
                                                            color: '#fff',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Mail size={16} /> Contact Seller
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* CTA Section */}
                <section style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <motion.div
                        whileInView={{ opacity: 1, scale: 1 }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        className="bento-item wide"
                        style={{
                            maxWidth: '900px',
                            margin: '0 auto',
                            padding: '60px',
                            background: 'linear-gradient(135deg, var(--color-surface) 0%, rgba(255,42,42,0.05) 100%)'
                        }}
                    >
                        <Tag size={48} style={{ color: 'var(--color-accent)', marginBottom: '20px' }} />
                        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                            Want to List Your Car?
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto 30px', fontSize: '16px' }}>
                            Contact us to feature your performance car or project build in our marketplace.
                        </p>
                        <button
                            onClick={() => setContactModal({ open: true, type: 'listing', listing: null })}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--color-accent)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: 'fit-content',
                                margin: '0 auto'
                            }}
                        >
                            <Car size={18} /> List Your Car
                        </button>
                    </motion.div>
                </section>

                <ClassifiedsContactModal
                    isOpen={contactModal.open}
                    onClose={() => setContactModal({ ...contactModal, open: false })}
                    type={contactModal.type}
                    listing={contactModal.listing}
                />

            </div >
        </div >
    );
};

export default Classifieds;
