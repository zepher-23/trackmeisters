import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle, ArrowRight, Copy, Flag, ArrowUp, ArrowDown, Upload, X, FileText, ChevronRight } from 'lucide-react';
import paymentQrCode from '../assets/payment qr code.jpeg';
import { COLLECTIONS, addDocument, fetchDocument, updateDocument } from '../lib/firebase';
import { uploadFileToCloudinary } from '../lib/cloudinary';

const EventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const eventId = queryParams.get('eventId');
    const eventNameFromUrl = queryParams.get('event') || '';
    const mode = queryParams.get('mode'); // 'visitor' or undefined
    const isVisitor = mode === 'visitor';

    // --- STATE ---
    const [eventData, setEventData] = useState(null);
    const [loadingEvent, setLoadingEvent] = useState(!!eventId);
    const [activeTab, setActiveTab] = useState(0); // Index of the currently viewed class in split view

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        event: isVisitor ? 'Visitor Pass' : eventNameFromUrl,
        eventId: eventId || '',
        selectedClasses: [], // Array of { name, price, originalClass, subclass, selectionId }
        // Participant Details
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
        isRaceBuild: false,
        visitorCounts: { 'General Visitor': 0, 'VIP Visitor': 0 }
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

    // --- EFFECTS ---
    useEffect(() => {
        if (eventId) {
            fetchEventData();
        }
    }, [eventId]);

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
        if (isVisitor) {
            const generalTotal = (formData.visitorCounts?.['General Visitor'] || 0) * 500;
            const vipTotal = (formData.visitorCounts?.['VIP Visitor'] || 0) * 1000;
            const sum = generalTotal + vipTotal;
            return sum === 0 ? '₹0' : `₹${sum}`;
        }
        const total = formData.selectedClasses.reduce((sum, cls) => sum + parsePrice(cls.price), 0);
        return total === 0 ? 'Free' : `₹${total}`;
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
            const url = await uploadFileToCloudinary(file, 'documents');
            setFormData(prev => ({ ...prev, [field]: url }));
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed');
        } finally {
            setUploadingField(null);
        }
    };

    const handleFinalSubmit = async () => {
        if (!waiverAgreed) return;
        setSubmitting(true);
        setError(null);
        setShowWaiver(false);

        try {
            const newId = generateUniqueId();
            const isMeetup = eventData?.type === 'Meetup';
            const initialStatus = isMeetup ? 'confirmed' : 'pending_payment'; // Simplified

            // Visitor Logic
            const visitorClasses = isVisitor ?
                Object.entries(formData.visitorCounts)
                    .filter(([_, count]) => count > 0)
                    .map(([name, count]) => ({
                        name, count,
                        price: name === 'General Visitor' ? '₹500' : '₹1000',
                        total: `₹${count * (name === 'General Visitor' ? 500 : 1000)}`
                    }))
                : formData.selectedClasses;

            const newDocId = await addDocument(COLLECTIONS.REGISTRATIONS, {
                ...formData,
                registrationId: newId,
                status: initialStatus,
                totalAmount: calculateTotal(),
                createdAt: new Date().toISOString(),
                selectedClasses: visitorClasses,
                type: isVisitor ? 'Visitor' : 'Participant'
            });

            setRegistrationId(newId);
            setDocId(newDocId);
            // If meetup/free, go straight to success? For now, standard flow.
            // If payment needed, show payment step.
            // Assuming simplified flow for now:
            setStep(3); // Success/Payment view
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to submit registration.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---
    const isSelected = (id) => formData.selectedClasses.some(c => c.selectionId === id);

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
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                    margin-top: 20px;
                }
                .subclass-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
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
                input, select, textarea {
                    width: 100%;
                    padding: 14px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05); /* Subtle background */
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--color-text-primary);
                    font-size: 15px;
                    transition: all 0.2s ease;
                }
                input:focus, select:focus, textarea:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: var(--color-accent);
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.1);
                }
                input::placeholder, textarea::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
                option {
                    background: #111;
                    color: white;
                }
                label {
                    display: block;
                    font-size: 13px;
                    color: var(--color-text-secondary);
                    margin-bottom: 6px;
                    font-weight: 500;
                }
            `}</style>

            {/* HEADER */}
            {step < 3 && (
                <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>
                        {step === 1 ? (isVisitor ? 'Select Visitor Pass' : 'Select Your Class') : 'Registration Details'}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        {step === 1 ? 'Choose from the available categories below.' : 'Please fill in your details to complete registration.'}
                    </p>
                </div>
            )}

            {/* STEP 1: SELECTION */}
            {step === 1 && (
                <div>
                    {isVisitor ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                            {['General Visitor', 'VIP Visitor'].map(type => (
                                <div key={type} className={`subclass-card ${formData.visitorCounts[type] > 0 ? 'selected' : ''}`} style={{ flexDirection: 'column', alignItems: 'start', gap: '20px', padding: '30px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{type}</h3>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '5px' }}>
                                            {type === 'General Visitor' ? 'Access to spectator zones.' : 'Access to Paddock, Lounge & Pit Lane.'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{type === 'General Visitor' ? '₹500' : '₹1000'}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <button onClick={() => updateVisitorCount(type, -1)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)', background: 'transparent', color: 'white' }}>-</button>
                                            <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{formData.visitorCounts[type]}</span>
                                            <button onClick={() => updateVisitorCount(type, 1)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 'bold' }}>+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="split-layout">
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
                                            {(selectedCount > 0 || isSelfSelected) && (
                                                <div style={{ background: '#22c55e', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                                                    {hasSubs ? selectedCount : <CheckCircle size={12} />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* CONTENT: DETAILS */}
                            <div className="detail-panel">
                                {eventData?.classes?.[activeTab] ? (
                                    <>
                                        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px 0' }}>{eventData.classes[activeTab].name}</h2>
                                            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
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
                                            <div style={{ fontWeight: 'bold', marginBottom: '16px' }}>
                                                {eventData.classes[activeTab].subclasses?.length > 0 ? 'Select Category' : 'Registration'}
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
                                                                <div style={{ textAlign: 'right' }}>
                                                                    {subPrice && <div style={{ fontWeight: 'bold', color: selected ? '#22c55e' : 'inherit' }}>₹{subPrice}</div>}
                                                                    {selected && <CheckCircle size={16} color="#22c55e" style={{ marginTop: '4px', marginLeft: 'auto' }} />}
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
                        </div>
                    )}

                    {/* FLOATING ACTION */}
                    {(formData.selectedClasses.length > 0 || Object.values(formData.visitorCounts).some(v => v > 0)) && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '500px', zIndex: 100 }}>
                            <div style={{ background: '#111', border: '1px solid #333', padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>TOTAL</div>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{calculateTotal()}</div>
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
                    <div style={{ marginBottom: '20px' }}>
                        <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Selection
                        </button>
                    </div>

                    <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Summary Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Registration Summary</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(isVisitor ?
                                    Object.entries(formData.visitorCounts).filter(([_, c]) => c > 0).map(([n, c]) => ({ name: `${n} x${c}`, price: `₹${c * (n === 'General Visitor' ? 500 : 1000)}` }))
                                    : formData.selectedClasses
                                ).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                                        <span style={{ fontWeight: 'bold' }}>{item.price}</span>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total Payable</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>{calculateTotal()}</span>
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
                                        <label>FMSCI License No. (If applicable)</label>
                                        <input type="text" value={formData.fmsciLicense} onChange={e => setFormData({ ...formData, fmsciLicense: e.target.value })} placeholder="FMSCI License" />
                                    </div>
                                    <div>
                                        <label>Emergency Contact *</label>
                                        <input type="text" required value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} placeholder="e.g. John Doe (Father) - 98765..." />
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                                    <h4 style={{ marginBottom: '16px' }}>Vehicle Details</h4>
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
                                    <div style={{ marginTop: '20px' }}>
                                        <label>Vehicle Modifications (If any)</label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <input type="checkbox" checked={formData.isRaceBuild} onChange={e => setFormData({ ...formData, isRaceBuild: e.target.checked })} style={{ width: 'auto' }} />
                                            <span>This is a race-prepped vehicle</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginTop: '10px' }}>Upload Documents {formData.isRaceBuild && '(Optional)'}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
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
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>Vehicle RC</div>
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
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>Vehicle Insurance</div>
                                            <div style={{ fontSize: '12px', color: formData.vehicleInsurance ? '#22c55e' : 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                {formData.vehicleInsurance ? 'Uploaded Successfully' : (uploadingField === 'vehicleInsurance' ? 'Uploading...' : 'Click to Upload')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
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
                                    style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1001, overflow: 'hidden' }}
                                >
                                    <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Waiver & Release of Liability</h3>
                                        <button onClick={() => setShowWaiver(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
                                    </div>
                                    <div style={{ padding: '20px', overflowY: 'auto', fontSize: '14px', color: '#ccc', lineHeight: '1.6' }}>
                                        <p><strong>PLEASE READ CAREFULLY BEFORE SIGNING. THIS IS A RELEASE OF LIABILITY AND WAIVER OF CERTAIN LEGAL RIGHTS.</strong></p>
                                        <br />
                                        <p>1. <strong>Assumption of Risk:</strong> I understand that participation in motorsport events involves inherent risks and dangers of accidents, emergency, injury, and property damage. I voluntarily accept and assume all such risks.</p>
                                        <br />
                                        <p>2. <strong>Release of Liability:</strong> I hereby release, discharge, and hold harmless the event organizers, venue owners, sponsors, and their agents from any and all liability, claims, or demands arising from my participation in this event.</p>
                                        <br />
                                        <p>3. <strong>Compliance:</strong> I agree to abide by all rules and regulations established by the event organizers and to follow the instructions of event officials.</p>
                                        <br />
                                        <p>4. <strong>Medical Consent:</strong> I hereby grant permission to the event organizers to administer first aid and to seek medical assistance if deemed necessary.</p>
                                        <br />
                                        <p>By checking the box below, I acknowledge that I have read this waiver and fully understand its terms.</p>
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
                                            disabled={!waiverAgreed || submitting}
                                            className="hero-cta"
                                            style={{ width: '100%', justifyContent: 'center', background: waiverAgreed ? 'white' : 'rgba(255,255,255,0.1)', color: waiverAgreed ? 'black' : '#666', cursor: waiverAgreed ? 'pointer' : 'not-allowed' }}
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

            {/* STEP 3: SUCCESS */}
            {
                step === 3 && (
                    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
                        {/* Success Header */}
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <CheckCircle size={40} color="#22c55e" />
                            </div>
                            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>Registration Successful!</h1>
                            <p style={{ color: 'var(--color-text-secondary)' }}>Your spot has been reserved pending payment.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'start' }}>
                            {/* LEFT: Instructions & ID */}
                            <div>
                                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '30px', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Registration ID</div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-accent)', margin: '10px 0', letterSpacing: '2px' }}>{registrationId}</div>
                                    <button onClick={() => navigator.clipboard.writeText(registrationId)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <Copy size={14} /> Copy to Clipboard
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', padding: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Flag size={18} /> Payment Instructions
                                    </h3>
                                    <ol style={{ paddingLeft: '20px', margin: 0, color: 'var(--color-text-secondary)', lineHeight: '1.8', fontSize: '15px' }}>
                                        <li>Scan the QR code on the right.</li>
                                        <li>Enter the amount: <strong style={{ color: 'white' }}>{calculateTotal()}</strong></li>
                                        <li><strong style={{ color: '#fbbf24' }}>IMPORTANT:</strong> Include your <strong>Registration ID</strong> in the remarks/description field.</li>
                                        <li>Complete the payment via UPI, GPay, or PhonePe.</li>
                                        <li><strong style={{ color: '#ef4444' }}>MANDATORY:</strong> Upload the payment screenshot below to confirm your registration.</li>
                                    </ol>
                                </div>

                                <div style={{ marginTop: '24px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--color-border)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                        <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>Upload Payment Screenshot</h4>
                                        {paymentScreenshot ? (
                                            <div style={{ color: '#22c55e', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <CheckCircle size={32} />
                                                Screenshot Uploaded!
                                                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>We will verify your payment shortly.</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <input
                                                    type="file"
                                                    id="payment-screenshot"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file || !docId) return;
                                                        setScreenshotUploading(true);
                                                        try {
                                                            const url = await uploadFileToCloudinary(file, 'payments');
                                                            await updateDocument(COLLECTIONS.REGISTRATIONS, docId, {
                                                                paymentScreenshot: url,
                                                                status: 'payment_uploaded'
                                                            });
                                                            setPaymentScreenshot(url);
                                                        } catch (err) {
                                                            console.error('Screenshot upload failed:', err);
                                                            alert('Failed to upload screenshot details.');
                                                        } finally {
                                                            setScreenshotUploading(false);
                                                        }
                                                    }}
                                                />
                                                <label
                                                    htmlFor="payment-screenshot"
                                                    className="hero-cta"
                                                    style={{ width: '100%', justifyContent: 'center', cursor: screenshotUploading ? 'wait' : 'pointer', background: 'rgba(255,255,255,0.1)' }}
                                                >
                                                    {screenshotUploading ? <Loader2 className="animate-spin" /> : <><Upload size={18} /> Select Screenshot</>}
                                                </label>
                                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '10px' }}>
                                                    JPG, PNG / Max 5MB
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: QR Code */}
                            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', color: 'black', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '800' }}>Scan to Pay</h3>
                                <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                                    <img src={paymentQrCode} alt="Payment QR" style={{ width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto', borderRadius: '8px' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Total Amount</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800' }}>{calculateTotal()}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>UPI / GPay / PhonePe</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '60px' }}>
                            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Return to Home
                            </button>
                        </div>
                    </div >
                )
            }
        </div >
    );
};

export default EventRegistration;
