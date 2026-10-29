import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, updateDocument } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Reorder, useDragControls } from 'framer-motion';
import {
    Camera,
    Phone,
    MessageCircle,
    Check,
    Search,
    X,
    Loader2,
    Car,
    AlertTriangle,
    Eye,
    ChevronDown,
    ChevronUp,
    GripVertical,
    RotateCcw,
    Fingerprint,
    Lock,
    KeyRound,
    ShieldCheck
} from 'lucide-react';

// Individual Driver Card with Seamless Framer Motion Spring Reordering
const DriverCardItem = React.memo(({
    reg,
    index,
    isExpanded,
    onToggleExpand,
    currentComp,
    onCompChange,
    onCompSave,
    cardRef,
    onPhotoUpload,
    uploadingId,
    onOpenFullscreen,
    onToggleClassCompleted,
    getDriverClassDetails,
    formatDisplayClassName,
    cleanPhone
}) => {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const { totalClassCount, fpvCount, fpvClassNames, otherClasses } = getDriverClassDetails(reg);
    const completedMap = reg.fpvCompletedClasses || {};
    const completedCount = fpvClassNames.filter(c => !!completedMap[c]).length;
    const isAllFlown = fpvClassNames.length > 0 && completedCount === fpvClassNames.length;

    const carPhoto = reg.fpvCarPhoto || null;
    const phoneDigits = cleanPhone(reg.phone);
    const vehicleNumber = reg.registrationNumber || reg.vehicleNumber || null;

    return (
        <Reorder.Item
            as="div"
            value={reg}
            id={reg.id}
            ref={cardRef}
            layout="position"
            dragListener={false}
            dragControls={dragControls}
            onDragStart={() => {
                setIsDragging(true);
                if (typeof document !== 'undefined') {
                    document.body.style.overflow = 'hidden';
                    document.body.style.touchAction = 'none';
                }
                if (typeof window !== 'undefined' && window.navigator?.vibrate) {
                    try { window.navigator.vibrate(20); } catch (_) {}
                }
            }}
            onDragEnd={() => {
                setIsDragging(false);
                if (typeof document !== 'undefined') {
                    document.body.style.overflow = '';
                    document.body.style.touchAction = '';
                }
                if (typeof window !== 'undefined' && window.navigator?.vibrate) {
                    try { window.navigator.vibrate([15, 30, 15]); } catch (_) {}
                }
            }}
            whileDrag={{
                boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.4)',
                zIndex: 99
            }}
            transition={{
                type: 'spring',
                stiffness: 350,
                damping: 30
            }}
            style={{
                background: isAllFlown
                    ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.08) 0%, #061e36 100%)'
                    : (isDragging ? '#05223d' : '#061e36'),
                border: isDragging
                    ? '1px solid #38bdf8'
                    : (isAllFlown
                        ? '1px solid rgba(34, 197, 94, 0.4)'
                        : (currentComp ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(245, 158, 11, 0.4)')),
                borderRadius: '10px',
                boxShadow: isDragging
                    ? '0 12px 28px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.4)'
                    : '0 4px 14px rgba(0, 0, 0, 0.35)',
                position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: isDragging ? 'none' : 'pan-y',
                cursor: 'default'
            }}
        >
            {/* Hidden native camera input available in both minimized and expanded views */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={onPhotoUpload}
                style={{ display: 'none' }}
            />

            {/* MINIMIZED DEFAULT VIEW: Drag Handle, Lineup Order, Comp # Input, Photo, Name & Car */}
            <div
                onClick={onToggleExpand}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                {/* DRAG BUTTON ON THE LEFT (Framer Motion Drag Handle) */}
                <div
                    onTouchStart={(e) => {
                        // Prevent parent onClick and long-press disambiguation delay on mobile
                        e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            e.currentTarget.setPointerCapture(e.pointerId);
                        } catch (_) {}
                        dragControls.start(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '42px',
                        height: '42px',
                        background: isDragging ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        border: isDragging ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                        WebkitTouchCallout: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        flexShrink: 0,
                        boxShadow: isDragging ? '0 0 10px rgba(56, 189, 248, 0.25)' : 'none'
                    }}
                    title="Drag to reorder grid lineup"
                >
                    <GripVertical size={20} color={isDragging ? '#38bdf8' : '#94a3b8'} />
                </div>

                {/* Grid Position Number */}
                <div style={{
                    fontSize: '11px',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    color: isDragging ? '#38bdf8' : '#64748b',
                    width: '18px',
                    textAlign: 'center',
                    flexShrink: 0,
                    transition: 'color 0.15s ease'
                }}>
                    {index + 1}
                </div>

                {/* Competition Number Box: Editable Directly When Minimized with '#' Placeholder */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: '#000000',
                        border: currentComp ? '1.5px solid #ffffff' : '1.5px solid #fbbf24',
                        borderRadius: '6px',
                        width: '42px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="#"
                        value={currentComp}
                        onChange={(e) => onCompChange(e.target.value)}
                        onBlur={onCompSave}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '15px',
                            fontWeight: '900',
                            fontFamily: 'monospace',
                            color: currentComp ? '#ffffff' : '#fbbf24',
                            textAlign: 'center',
                            padding: 0
                        }}
                    />
                </div>

                {/* Car Photo Thumbnail (Tap to view full image, or tap to snap directly if empty) */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        if (carPhoto) {
                            onOpenFullscreen(carPhoto);
                        } else {
                            fileInputRef.current?.click();
                        }
                    }}
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '6px',
                        background: '#02182e',
                        border: carPhoto ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #f59e0b',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: 'pointer'
                    }}
                    title={carPhoto ? 'Tap to view full photo' : 'Tap to snap car photo'}
                >
                    {carPhoto ? (
                        <img
                            src={carPhoto}
                            alt={reg.carModel || 'Car'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <Camera size={16} color="#fbbf24" />
                            <span style={{ fontSize: '7px', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', lineHeight: 1 }}>SNAP</span>
                        </div>
                    )}
                </div>

                {/* Person's Name and Under that his Car Name */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: '800',
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {reg.name || 'Driver'}
                    </div>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#38bdf8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {reg.carModel || 'Vehicle Unspecified'}
                    </div>
                </div>

                {/* Flight Status & Expand Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isAllFlown ? (
                        <span style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid #22c55e',
                            color: '#4ade80',
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                        }}>
                            <Check size={10} strokeWidth={3} /> FLOWN
                        </span>
                    ) : (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: completedCount > 0 ? '#38bdf8' : '#64748b',
                            fontFamily: 'monospace'
                        }}>
                            {completedCount}/{fpvCount}
                        </span>
                    )}

                    <div style={{ color: '#64748b' }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
            </div>

            {/* EXPANDED DETAILS (Revealed on Tap) */}
            {isExpanded && (
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'rgba(0, 0, 0, 0.18)'
                }}>
                    {/* Reg ID & Vehicle Number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                REG: {reg.registrationId || 'N/A'}
                            </div>
                            {vehicleNumber && (
                                <div style={{
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    fontWeight: '700',
                                    color: '#e2e8f0',
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-block',
                                    marginTop: '3px'
                                }}>
                                    {vehicleNumber}
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1' }}>
                            FPV Flights: {fpvCount} / {totalClassCount} Classes
                        </div>
                    </div>

                    {/* Car Photo Capture Area & Full Mobile-Optimized Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Big Tap-Friendly Photo Box (Zoom if photo exists, snap if empty) */}
                        <div
                            onClick={() => {
                                if (carPhoto) {
                                    onOpenFullscreen(carPhoto);
                                } else {
                                    fileInputRef.current?.click();
                                }
                            }}
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '8px',
                                background: '#02182e',
                                border: carPhoto ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #f59e0b',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                position: 'relative'
                            }}
                            title={carPhoto ? 'Tap to view full photo' : 'Tap to snap photo'}
                        >
                            {carPhoto ? (
                                <>
                                    <img
                                        src={carPhoto}
                                        alt={reg.carModel || 'Car'}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '4px',
                                        right: '4px',
                                        background: 'rgba(0, 0, 0, 0.7)',
                                        borderRadius: '4px',
                                        padding: '2px 4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                    }}>
                                        <Eye size={10} color="#cbd5e1" />
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '4px' }}>
                                    <Camera size={24} color="#fbbf24" style={{ margin: '0 auto 3px auto', display: 'block' }} />
                                    <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', lineHeight: 1.1 }}>
                                        Snap Photo
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons: Full Mobile Camera Button, Call, WhatsApp */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingId === reg.id}
                                style={{
                                    background: carPhoto ? 'rgba(255, 255, 255, 0.08)' : '#ff2a2a',
                                    border: carPhoto ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid #ff2a2a',
                                    color: '#ffffff',
                                    borderRadius: '6px',
                                    padding: '9px 12px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: carPhoto ? 'none' : '0 2px 10px rgba(255, 42, 42, 0.45)',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {uploadingId === reg.id ? (
                                    <>
                                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                        <span>Uploading Photo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={14} />
                                        <span>{carPhoto ? 'Retake Car Photo' : 'Take Car Photo'}</span>
                                    </>
                                )}
                            </button>

                            {/* Contact buttons row */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {reg.phone ? (
                                    <a
                                        href={`tel:${reg.phone}`}
                                        style={{
                                            background: 'rgba(2, 132, 199, 0.18)',
                                            border: '1px solid rgba(2, 132, 199, 0.4)',
                                            color: '#38bdf8',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            flex: 1
                                        }}
                                    >
                                        <Phone size={12} /> Call
                                    </a>
                                ) : null}

                                {phoneDigits ? (
                                    <a
                                        href={`https://wa.me/${phoneDigits}?text=Hi%20${encodeURIComponent(reg.name || '')},%20this%20is%20the%20FPV%20pilot%20for%20Trackmeisters.%20What%20is%20your%20competition%20number%20and%20pit%20location?`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            background: 'rgba(22, 163, 74, 0.18)',
                                            border: '1px solid rgba(22, 163, 74, 0.4)',
                                            color: '#4ade80',
                                            borderRadius: '6px',
                                            padding: '6px 12px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            flex: 1
                                        }}
                                    >
                                        <MessageCircle size={12} /> WhatsApp
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Opted FPV Classes with 1-Tap Complete */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {fpvClassNames.map((className, idx) => {
                            const isDone = !!completedMap[className];
                            const displayLabel = formatDisplayClassName(className);
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onToggleClassCompleted(className)}
                                    style={{
                                        background: isDone ? 'rgba(34, 197, 94, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                                        border: isDone ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        color: isDone ? '#4ade80' : '#e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        width: '100%',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            border: isDone ? 'none' : '1.5px solid #64748b',
                                            background: isDone ? '#22c55e' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {isDone && <Check size={12} color="#000" strokeWidth={3} />}
                                        </div>
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: isDone ? '700' : '500',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {displayLabel}
                                        </span>
                                    </div>

                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        color: isDone ? '#4ade80' : '#94a3b8',
                                        flexShrink: 0,
                                        marginLeft: '8px',
                                        letterSpacing: '0.4px'
                                    }}>
                                        {isDone ? 'FLOWN ✓' : 'TAP TO COMPLETE'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Other Classes List */}
                    {otherClasses.length > 0 && (
                        <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>Other Classes:</span>
                            {otherClasses.map((bc, bIdx) => (
                                <span
                                    key={bIdx}
                                    style={{
                                        fontSize: '10px',
                                        color: '#94a3b8',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '4px',
                                        padding: '1px 5px'
                                    }}
                                >
                                    {bc}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Reorder.Item>
    );
});

// Helpers for WebAuthn ArrayBuffer <-> Base64 conversion
const bufferToBase64 = (buffer) => {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return typeof window !== 'undefined' ? window.btoa(binary) : '';
};

const base64ToBuffer = (base64) => {
    if (!base64 || typeof window === 'undefined') return new ArrayBuffer(0);
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

const FPVScoutingList = () => {
    // Data states
    const [currentEvent, setCurrentEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Custom Dummy Grid Order state
    const [gridOrder, setGridOrder] = useState([]);

    // Card expand/collapse states (default: all minimized/collapsed)
    const [expandedCards, setExpandedCards] = useState({});

    // Biometric & 24h Session Security states:
    // 'checking' | 'authenticated' | 'need_pin' | 'need_biometric'
    const [authStatus, setAuthStatus] = useState('checking');
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [bioLoading, setBioLoading] = useState(false);
    const [bioError, setBioError] = useState('');
    const [isBioSupported, setIsBioSupported] = useState(true);

    // Initial check on mount: verify 24h session or enrollment status
    useEffect(() => {
        try {
            const hasWebAuthn = typeof window !== 'undefined' && !!(window.PublicKeyCredential && navigator.credentials?.create);
            setIsBioSupported(hasWebAuthn);

            const sessionExpiryStr = localStorage.getItem('fpv_session_expiry');
            const isEnrolled = localStorage.getItem('fpv_enrolled') === 'true';

            if (sessionExpiryStr) {
                const expiry = parseInt(sessionExpiryStr, 10);
                if (expiry && expiry > Date.now()) {
                    setAuthStatus('authenticated');
                    return;
                }
            }

            if (isEnrolled) {
                setAuthStatus('need_biometric');
            } else {
                setAuthStatus('need_pin');
            }
        } catch (err) {
            console.error('Session check error:', err);
            setAuthStatus('need_pin');
        }
    }, []);

    // Register Biometric (Fingerprint) on the device via WebAuthn
    const registerBiometrics = async (fallbackWithPinOnly = false) => {
        setBioLoading(true);
        setBioError('');
        setPinError('');

        if (fallbackWithPinOnly || typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials?.create) {
            localStorage.setItem('fpv_enrolled', 'true');
            localStorage.setItem('fpv_session_expiry', String(Date.now() + 24 * 60 * 60 * 1000));
            setPinInput('');
            setAuthStatus('authenticated');
            setBioLoading(false);
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);

            const createOptions = {
                publicKey: {
                    challenge,
                    rp: {
                        name: 'Trackmeisters FPV Scouting'
                    },
                    user: {
                        id: userId,
                        name: 'pilot@trackmeisters.in',
                        displayName: 'FPV Pilot'
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },
                        { alg: -257, type: 'public-key' }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000,
                    attestation: 'none'
                }
            };

            const credential = await navigator.credentials.create(createOptions);

            if (credential) {
                const rawIdB64 = bufferToBase64(credential.rawId);
                localStorage.setItem('fpv_enrolled', 'true');
                if (rawIdB64) {
                    localStorage.setItem('fpv_credential_raw_id', rawIdB64);
                }
                const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
                localStorage.setItem('fpv_session_expiry', String(expiryTime));

                setPinInput('');
                setPinError('');
                setBioError('');
                setAuthStatus('authenticated');
            }
        } catch (err) {
            console.error('Biometric enrollment error:', err);
            if (err.name === 'NotAllowedError') {
                setBioError('Fingerprint scan was cancelled. Tap again to retry registration.');
            } else {
                setBioError(err.message || 'Biometric sensor error. Ensure fingerprint/screen lock is active on this device.');
            }
        } finally {
            setBioLoading(false);
        }
    };

    // Authenticate via Biometric Fingerprint for subsequent visits
    const loginWithBiometrics = async () => {
        setBioLoading(true);
        setBioError('');

        if (typeof window === 'undefined' || !navigator.credentials?.get) {
            setBioError('Biometric sensor not available on this browser.');
            setBioLoading(false);
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const savedRawId = localStorage.getItem('fpv_credential_raw_id');

            const getOptions = {
                publicKey: {
                    challenge,
                    timeout: 60000,
                    userVerification: 'required'
                }
            };

            if (savedRawId) {
                try {
                    const rawIdBuf = base64ToBuffer(savedRawId);
                    if (rawIdBuf && rawIdBuf.byteLength > 0) {
                        getOptions.publicKey.allowCredentials = [{
                            id: rawIdBuf,
                            type: 'public-key'
                        }];
                    }
                } catch (e) {
                    console.warn('Error reading saved credential id:', e);
                }
            }

            const assertion = await navigator.credentials.get(getOptions);

            if (assertion) {
                const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
                localStorage.setItem('fpv_session_expiry', String(expiryTime));
                setBioError('');
                setAuthStatus('authenticated');
            }
        } catch (err) {
            console.error('Biometric authentication error:', err);
            if (err.name === 'NotAllowedError') {
                setBioError('Fingerprint scan cancelled or not recognized. Tap to retry.');
            } else {
                setBioError(err.message || 'Authentication failed. Please retry.');
            }
        } finally {
            setBioLoading(false);
        }
    };

    // Handle Master PIN submit
    const handlePinSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setPinError('');
        setBioError('');

        if (pinInput.trim() !== '2773') {
            setPinError('Incorrect PIN. Please enter master PIN (2773).');
            return;
        }

        registerBiometrics();
    };

    // Automatically trigger biometric unlock when landing on the locked screen
    useEffect(() => {
        if (authStatus === 'need_biometric') {
            const timer = setTimeout(() => {
                loginWithBiometrics();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [authStatus]);

    // Manual lock (locks session and prompts for fingerprint)
    const handleManualLock = () => {
        localStorage.removeItem('fpv_session_expiry');
        setAuthStatus('need_biometric');
    };

    // Reset device enrollment (allows re-registering with PIN)
    const handleResetDevice = () => {
        if (window.confirm('Reset biometric device registration? You will need to enter the master PIN (2773) again.')) {
            localStorage.removeItem('fpv_session_expiry');
            localStorage.removeItem('fpv_enrolled');
            localStorage.removeItem('fpv_credential_raw_id');
            setPinInput('');
            setPinError('');
            setBioError('');
            setAuthStatus('need_pin');
        }
    };

    // Filter & search states
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'needs_scout' | 'pending' | 'completed'

    // Interaction states
    const [uploadingId, setUploadingId] = useState(null);
    const syncTimeoutRef = useRef(null);
    const [editingComp, setEditingComp] = useState({});
    const [fullscreenImage, setFullscreenImage] = useState(null);

    // Refs for mobile camera file inputs and card DOM elements
    const fileInputRefs = useRef({});
    const cardRefs = useRef({});

    // 1. Fetch current/upcoming event
    useEffect(() => {
        const fetchCurrentEvent = async () => {
            if (!db) return;
            try {
                const snapshot = await getDocs(collection(db, 'events'));
                const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Priority: status === 'upcoming', or status !== 'completed', or fallback to latest
                const upcoming = events.find(e => e.status === 'upcoming') ||
                    events.find(e => e.status !== 'completed') ||
                    events[0];

                setCurrentEvent(upcoming);
            } catch (err) {
                console.error('Error fetching events:', err);
            }
        };
        fetchCurrentEvent();
    }, []);

    // 2. Real-time listener for registrations
    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().createdAt
            }));

            setRegistrations(docs);
            setLoading(false);
        }, (err) => {
            console.error('Realtime listener error:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 3. Filter registrations strictly to current event, confirmed status, and FPV opted (excludes tests)
    const fpvRegistrations = useMemo(() => {
        return registrations.filter(reg => {
            // Must belong to current event
            if (currentEvent) {
                const matchesId = reg.eventId === currentEvent.id;
                const matchesTitle = reg.event && currentEvent.title &&
                    reg.event.trim().toLowerCase() === currentEvent.title.trim().toLowerCase();
                if (!matchesId && !matchesTitle) return false;
            }

            // Must be a confirmed registration (exclude pending_payment / abandoned checkouts)
            const status = (reg.status || '').toLowerCase();
            const isConfirmed = status === 'confirmed' || status === 'payment_verified' || status === 'completed';
            if (!isConfirmed) return false;

            // Filter out test entries
            const name = (reg.name || '').trim().toLowerCase();
            const car = (reg.carModel || '').trim().toLowerCase();
            const phone = (reg.phone || '').trim();
            if (name === 'test' || car === 'test' || phone.includes('09110835613')) return false;

            // Must have opted for FPV drone service
            const isFpv = reg.optInMedia === true ||
                (Array.isArray(reg.mediaClasses) && reg.mediaClasses.length > 0) ||
                (reg.totalMediaAmount && reg.totalMediaAmount > 0) ||
                (reg.mediaCount && reg.mediaCount > 0);

            return isFpv;
        });
    }, [registrations, currentEvent]);

    // 4. Load cached grid order from localStorage on initial render for instant paint
    useEffect(() => {
        if (!currentEvent?.id) return;
        try {
            const saved = localStorage.getItem(`fpv_grid_order_${currentEvent.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setGridOrder(parsed);
                }
            }
        } catch (e) {
            console.error('Error loading cached grid order:', e);
        }
    }, [currentEvent?.id]);

    // 4b. Real-time Firestore listener: sync grid order across all devices in real time
    useEffect(() => {
        if (!db || !currentEvent?.id) return;

        const eventDocRef = doc(db, 'events', currentEvent.id);
        const unsubscribe = onSnapshot(eventDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (Array.isArray(data.fpvGridOrder) && data.fpvGridOrder.length > 0) {
                    setGridOrder(prev => {
                        // Avoid redundant state updates if order is already identical
                        if (
                            prev.length === data.fpvGridOrder.length &&
                            prev.every((id, idx) => id === data.fpvGridOrder[idx])
                        ) {
                            return prev;
                        }
                        return data.fpvGridOrder;
                    });
                    try {
                        localStorage.setItem(`fpv_grid_order_${currentEvent.id}`, JSON.stringify(data.fpvGridOrder));
                    } catch (_) {}
                }
            }
        }, (err) => {
            console.error('Real-time grid order listener error:', err);
        });

        return () => unsubscribe();
    }, [currentEvent?.id]);

    // 5. Keep gridOrder synchronized with active FPV registrations
    useEffect(() => {
        if (fpvRegistrations.length === 0) return;

        setGridOrder(prev => {
            const activeIds = new Set(fpvRegistrations.map(r => r.id));
            const existingInOrder = prev.filter(id => activeIds.has(id));
            const existingSet = new Set(existingInOrder);

            const newIds = fpvRegistrations.filter(r => !existingSet.has(r.id)).map(r => r.id);
            if (newIds.length === 0 && existingInOrder.length === prev.length) {
                return prev;
            }
            return [...existingInOrder, ...newIds];
        });
    }, [fpvRegistrations]);

    // Helper: Save new grid order locally and sync to Firebase Firestore for all devices
    const updateGridOrder = (newOrder) => {
        // 1. Instant local update for 60fps responsive UI
        setGridOrder(newOrder);

        if (!currentEvent?.id) return;

        // 2. Persist locally to cache
        try {
            localStorage.setItem(`fpv_grid_order_${currentEvent.id}`, JSON.stringify(newOrder));
        } catch (e) {
            console.error('Error saving grid order to cache:', e);
        }

        // 3. Debounce cloud sync to Firestore so all connected devices update in real-time
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
            if (!db || !currentEvent?.id) return;
            try {
                const eventDocRef = doc(db, 'events', currentEvent.id);
                await setDoc(eventDocRef, {
                    fpvGridOrder: newOrder,
                    fpvOrderUpdatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (err) {
                console.error('Failed to sync grid order to Firestore:', err);
            }
        }, 300);
    };

    // Reset grid order back to registration order
    const handleResetOrder = () => {
        const defaultOrder = fpvRegistrations.map(r => r.id);
        updateGridOrder(defaultOrder);
    };

    // Helpers to extract FPV classes vs total classes and other classes
    const getDriverClassDetails = (reg) => {
        const totalClasses = Array.isArray(reg.selectedClasses) ? reg.selectedClasses : [];
        const totalClassCount = Math.max(totalClasses.length, 1);

        // Extract opted FPV classes
        let fpvClassNames = [];
        if (Array.isArray(reg.mediaClasses) && reg.mediaClasses.length > 0) {
            fpvClassNames = [...reg.mediaClasses];
        } else if (reg.mediaSelections && typeof reg.mediaSelections === 'object') {
            const entries = Object.entries(reg.mediaSelections).filter(([_, s]) => s && (s.fpv === true || s === true));
            fpvClassNames = entries.map(([key]) => {
                const matched = totalClasses.find(c => c.selectionId === key || c.name === key || `${c.originalClass}:${c.subclass}` === key);
                return matched ? (matched.subclass || matched.name) : (key.includes(':') ? key.split(':')[1] : key);
            });
        }

        // Fallback: If mediaClasses array was empty, derive flight count from totalMediaAmount or mediaCount
        if (fpvClassNames.length === 0) {
            const calculatedFlights = reg.totalMediaAmount ? Math.floor(reg.totalMediaAmount / 1500) : (reg.mediaCount || 1);
            const flightCount = Math.max(calculatedFlights, 1);
            fpvClassNames = Array.from({ length: flightCount }, (_, i) => `Flight #${i + 1}`);
        }

        const fpvCount = fpvClassNames.length;

        // Other classes: total classes registered minus those chosen for FPV
        const otherClasses = totalClasses.filter(tc => {
            const name = (tc.subclass || tc.name || '').toLowerCase();
            return !fpvClassNames.some(f => f.toLowerCase().includes(name) || (tc.name && f.toLowerCase().includes(tc.name.toLowerCase())));
        }).map(tc => {
            const rawName = tc.subclass || tc.name || '';
            const parts = rawName.split(' - ');
            return parts.length >= 2 ? parts.slice(-1)[0] : rawName;
        });

        return {
            totalClassCount,
            fpvCount,
            fpvClassNames,
            otherClasses
        };
    };

    // Format display class name for mobile readability
    const formatDisplayClassName = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.split(' - ');
        if (parts.length >= 3) {
            return parts.slice(2).join(' - ');
        }
        return fullName;
    };

    // Handler: Update Competition Number in Firestore
    const handleCompSave = async (docId, currentVal) => {
        const inputVal = editingComp[docId] !== undefined ? editingComp[docId].trim() : (currentVal || '').trim();
        if (inputVal === (currentVal || '').trim()) return;

        try {
            await updateDocument('registrations', docId, {
                compNumber: inputVal,
                competitionNumber: inputVal,
                compNo: inputVal
            });
        } catch (err) {
            console.error('Failed to save comp number:', err);
        }
    };

    // Handler: Toggle Class Flown / Completed in Firestore
    const handleToggleClassCompleted = async (reg, className) => {
        const completedMap = { ...(reg.fpvCompletedClasses || {}) };
        completedMap[className] = !completedMap[className];

        try {
            await updateDocument('registrations', reg.id, {
                fpvCompletedClasses: completedMap
            });
        } catch (err) {
            console.error('Failed to toggle class status:', err);
        }
    };

    // Handler: Direct Camera Photo Capture & Upload
    const handlePhotoUpload = async (docId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingId(docId);
        try {
            const url = await uploadToCloudinary(file, 'fpv_cars');
            await updateDocument('registrations', docId, {
                fpvCarPhoto: url
            });
        } catch (err) {
            console.error('Error uploading photo:', err);
            alert('Failed to upload car photo. Please retry.');
        } finally {
            setUploadingId(null);
            if (e.target) e.target.value = '';
        }
    };

    // Stats calculations
    const stats = useMemo(() => {
        const totalDrivers = fpvRegistrations.length;
        let totalFlightsNeeded = 0;
        let flightsDone = 0;
        const needsScoutingList = [];

        fpvRegistrations.forEach(reg => {
            const { fpvClassNames } = getDriverClassDetails(reg);
            totalFlightsNeeded += fpvClassNames.length;

            const completed = reg.fpvCompletedClasses || {};
            const doneForThis = fpvClassNames.filter(c => !!completed[c]).length;
            flightsDone += doneForThis;

            const compNo = (reg.compNumber || reg.competitionNumber || reg.compNo || '').trim();
            const photo = reg.fpvCarPhoto;

            if (!compNo || !photo) {
                needsScoutingList.push({
                    id: reg.id,
                    name: reg.name,
                    car: reg.carModel || 'Vehicle',
                    compNo: compNo || null,
                    missingComp: !compNo,
                    missingPhoto: !photo
                });
            }
        });

        return {
            totalDrivers,
            totalFlightsNeeded,
            flightsDone,
            needsScoutingList
        };
    }, [fpvRegistrations]);

    // Ordered registrations according to dummy grid lineup
    const orderedDrivers = useMemo(() => {
        if (!gridOrder || gridOrder.length === 0) return fpvRegistrations;

        const orderMap = new Map();
        gridOrder.forEach((id, idx) => orderMap.set(id, idx));

        return [...fpvRegistrations].sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
            return indexA - indexB;
        });
    }, [fpvRegistrations, gridOrder]);

    // Filter & Search processing on ordered list
    const filteredDrivers = useMemo(() => {
        return orderedDrivers.filter(reg => {
            const compNo = (reg.compNumber || reg.competitionNumber || reg.compNo || '').toString().toLowerCase();
            const name = (reg.name || '').toLowerCase();
            const car = (reg.carModel || '').toLowerCase();
            const regNo = (reg.registrationNumber || reg.vehicleNumber || '').toLowerCase();
            const regId = (reg.registrationId || '').toLowerCase();
            const q = searchQuery.trim().toLowerCase();

            const matchesSearch = !q ||
                compNo.includes(q) ||
                name.includes(q) ||
                car.includes(q) ||
                regNo.includes(q) ||
                regId.includes(q);

            if (!matchesSearch) return false;

            const { fpvClassNames } = getDriverClassDetails(reg);
            const completed = reg.fpvCompletedClasses || {};
            const isAllDone = fpvClassNames.length > 0 && fpvClassNames.every(c => !!completed[c]);
            const isScouted = !!compNo.trim() && !!reg.fpvCarPhoto;

            if (activeFilter === 'needs_scout') return !isScouted;
            if (activeFilter === 'pending') return !isAllDone;
            if (activeFilter === 'completed') return isAllDone;

            return true;
        });
    }, [orderedDrivers, searchQuery, activeFilter]);

    // Handle Framer Motion Spring Reordering
    const handleReorder = (newItems) => {
        const visibleNewIds = newItems.map(item => item.id);

        if (visibleNewIds.length === orderedDrivers.length) {
            updateGridOrder(visibleNewIds);
            return;
        }

        // When a search/filter is active, merge reordered subset back into master grid order
        const currentFullIds = orderedDrivers.map(d => d.id);
        const visibleIdSet = new Set(visibleNewIds);
        let pointer = 0;
        const mergedOrder = currentFullIds.map(id => {
            if (visibleIdSet.has(id)) {
                return visibleNewIds[pointer++];
            }
            return id;
        });

        updateGridOrder(mergedOrder);
    };

    // Card expand/collapse toggle
    const toggleCardExpand = (id) => {
        setExpandedCards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleAllCards = () => {
        const isAll = filteredDrivers.every(d => !!expandedCards[d.id]);
        if (isAll) {
            setExpandedCards({});
        } else {
            const next = {};
            filteredDrivers.forEach(d => { next[d.id] = true; });
            setExpandedCards(next);
        }
    };

    // Scroll directly to a card when clicked in scouting queue (and auto-expand it)
    const scrollToCard = (id) => {
        setExpandedCards(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            if (cardRefs.current[id]) {
                cardRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardRefs.current[id].style.boxShadow = '0 0 0 2px #ff2a2a, 0 8px 24px rgba(255, 42, 42, 0.4)';
                setTimeout(() => {
                    if (cardRefs.current[id]) {
                        cardRefs.current[id].style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.35)';
                    }
                }, 1800);
            }
        }, 50);
    };

    // Clean phone number for WhatsApp / Tel
    const cleanPhone = (phoneStr) => {
        if (!phoneStr) return '';
        let digits = String(phoneStr).replace(/\D/g, '');
        if (digits.length === 10) digits = '91' + digits;
        return digits;
    };


    const allExpanded = filteredDrivers.length > 0 && filteredDrivers.every(d => !!expandedCards[d.id]);

    // 1. Loading screen while verifying security credentials
    if (authStatus === 'checking') {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#02182e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                color: '#38bdf8',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <Loader2 size={36} className="animate-spin" />
                <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
                    Verifying Security Session...
                </div>
            </div>
        );
    }

    // 2. First-time Master PIN setup screen
    if (authStatus === 'need_pin') {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#02182e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: '#f8fafc'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '380px',
                    background: '#061e36',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '20px',
                    padding: '32px 24px',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                        color: '#38bdf8'
                    }}>
                        <KeyRound size={28} />
                    </div>

                    <div style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        color: '#38bdf8',
                        marginBottom: '6px'
                    }}>
                        Security Activation
                    </div>

                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '900',
                        letterSpacing: '-0.3px',
                        color: '#ffffff',
                        margin: '0 0 8px 0'
                    }}>
                        Master Access PIN
                    </h2>

                    <p style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: '1.5',
                        margin: '0 0 24px 0'
                    }}>
                        Enter the master access PIN to configure and link this device's fingerprint biometric sensor.
                    </p>

                    <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                autoFocus
                                value={pinInput}
                                onChange={(e) => {
                                    setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                                    setPinError('');
                                }}
                                placeholder="••••"
                                style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    fontSize: '28px',
                                    fontWeight: '800',
                                    letterSpacing: '0.4em',
                                    padding: '12px 16px',
                                    background: '#031322',
                                    border: pinError ? '1px solid #ef4444' : '1px solid #0284c7',
                                    borderRadius: '12px',
                                    color: '#38bdf8',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {pinError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '11px',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}>
                                <AlertTriangle size={13} />
                                <span>{pinError}</span>
                            </div>
                        )}

                        {bioError && (
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '11px',
                                color: '#fbbf24',
                                lineHeight: '1.4'
                            }}>
                                {bioError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={bioLoading || pinInput.length === 0}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '14px',
                                borderRadius: '12px',
                                background: pinInput.length === 4 ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)',
                                color: '#02182e',
                                fontWeight: '800',
                                fontSize: '12px',
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: pinInput.length === 0 || bioLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {bioLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Activating Biometrics...</span>
                                </>
                            ) : (
                                <>
                                    <Fingerprint size={16} />
                                    <span>Register Biometric Access</span>
                                </>
                            )}
                        </button>

                        {!isBioSupported && (
                            <button
                                type="button"
                                onClick={() => registerBiometrics(true)}
                                style={{
                                    marginTop: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '11px',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                }}
                            >
                                Continue with PIN only (No biometric hardware)
                            </button>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    // 3. Subsequent Visits: Biometric (Fingerprint) Login Screen
    if (authStatus === 'need_biometric') {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#02182e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: '#f8fafc'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '380px',
                    background: '#061e36',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '20px',
                    padding: '36px 24px',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        color: '#38bdf8',
                        marginBottom: '6px'
                    }}>
                        Device Registered
                    </div>

                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '900',
                        letterSpacing: '-0.3px',
                        color: '#ffffff',
                        margin: '0 0 6px 0'
                    }}>
                        FPV Flight Plan Locked
                    </h2>

                    <p style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: '1.5',
                        margin: '0 0 28px 0'
                    }}>
                        {bioLoading ? 'Scanning fingerprint...' : 'Touch sensor or tap icon to unlock 24-hour access.'}
                    </p>

                    {/* Glowing Interactive Biometric Touch Target */}
                    <div
                        onClick={loginWithBiometrics}
                        role="button"
                        tabIndex={0}
                        title="Tap to scan fingerprint"
                        style={{
                            width: '112px',
                            height: '112px',
                            borderRadius: '50%',
                            background: bioLoading ? 'rgba(56, 189, 248, 0.16)' : 'rgba(56, 189, 248, 0.08)',
                            border: '2px solid #38bdf8',
                            boxShadow: bioLoading
                                ? '0 0 35px rgba(56, 189, 248, 0.5), inset 0 0 15px rgba(56, 189, 248, 0.2)'
                                : '0 0 25px rgba(56, 189, 248, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px auto',
                            cursor: 'pointer',
                            color: '#38bdf8',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {bioLoading ? (
                            <Loader2 size={50} className="animate-spin" />
                        ) : (
                            <Fingerprint size={54} />
                        )}
                    </div>

                    {bioError && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '11px',
                            color: '#fbbf24',
                            lineHeight: '1.4',
                            margin: '12px 0'
                        }}>
                            {bioError}
                        </div>
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <button
                            type="button"
                            onClick={handleResetDevice}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                fontSize: '11px',
                                textDecoration: 'underline',
                                cursor: 'pointer'
                            }}
                        >
                            Reset device registration (Enter PIN again)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#02182e',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            paddingBottom: '80px'
        }}>
            {/* TOP COMPACT MOTORSPORT HEADER */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(2, 24, 46, 0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '12px 16px'
            }}>
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                    {/* Live Status Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                display: 'inline-block',
                                boxShadow: '0 0 8px #22c55e'
                            }} />
                            <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.8px', color: '#38bdf8', textTransform: 'uppercase' }}>
                                Flight Plan
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {currentEvent?.title || 'Current Event'}
                            </div>
                            <button
                                onClick={handleManualLock}
                                title="Lock session"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    color: '#38bdf8',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Lock size={10} />
                                <span>LOCK</span>
                            </button>
                        </div>
                    </div>

                    {/* METRIC STRIP */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.3fr',
                        gap: '8px',
                        marginBottom: '10px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Drivers</span>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>{stats.totalDrivers}</span>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between'
                        }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Flights Flown</span>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: stats.flightsDone === stats.totalFlightsNeeded && stats.totalFlightsNeeded > 0 ? '#4ade80' : '#38bdf8' }}>
                                {stats.flightsDone} <span style={{ fontSize: '13px', color: '#64748b' }}>/ {stats.totalFlightsNeeded}</span>
                            </span>
                        </div>
                    </div>

                    {/* SCOUTING QUEUE STRIP (Displays cars needing Comp # or Photo) */}
                    {stats.needsScoutingList.length > 0 && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.09)',
                            border: '1px solid rgba(245, 158, 11, 0.28)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            marginBottom: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <AlertTriangle size={13} /> Cars to Scout ({stats.needsScoutingList.length})
                                </span>
                                <span style={{ fontSize: '10px', color: '#fcd34d' }}>Tap to locate</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                overflowX: 'auto',
                                paddingBottom: '2px',
                                scrollbarWidth: 'none'
                            }}>
                                {stats.needsScoutingList.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => scrollToCard(item.id)}
                                        style={{
                                            background: '#02182e',
                                            border: '1px solid rgba(245, 158, 11, 0.4)',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            color: '#fff',
                                            fontSize: '11px',
                                            whiteSpace: 'nowrap',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            flexShrink: 0
                                        }}
                                    >
                                        <strong style={{ color: item.compNo ? '#fbbf24' : '#ef4444' }}>
                                            {item.compNo ? `#${item.compNo}` : '#'}
                                        </strong>
                                        <span style={{ color: '#cbd5e1' }}>{item.car}</span>
                                        {item.missingPhoto && <span style={{ color: '#fbbf24', fontSize: '10px' }}>📷</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SEARCH INPUT, FILTER PILLS & VIEW CONTROLS */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                                type="text"
                                placeholder="Search driver, car, comp #..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    padding: '7px 10px 7px 30px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Expand / Collapse All Toggle */}
                        <button
                            type="button"
                            onClick={toggleAllCards}
                            title={allExpanded ? 'Collapse all cards' : 'Expand all cards'}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '6px',
                                padding: '6px 9px',
                                color: '#94a3b8',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                            }}
                        >
                            {allExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            <span>{allExpanded ? 'Min' : 'Max'}</span>
                        </button>

                        {/* Reset Grid Order Button */}
                        <button
                            type="button"
                            onClick={handleResetOrder}
                            title="Reset dummy grid order"
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '6px',
                                padding: '6px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <RotateCcw size={13} />
                        </button>
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        {[
                            { id: 'all', label: `Grid (${fpvRegistrations.length})` },
                            { id: 'needs_scout', label: `Scout (${stats.needsScoutingList.length})` },
                            { id: 'pending', label: 'Pending' },
                            { id: 'completed', label: 'Done' }
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                style={{
                                    background: activeFilter === filter.id ? '#ff2a2a' : 'rgba(255, 255, 255, 0.05)',
                                    border: activeFilter === filter.id ? '1px solid #ff2a2a' : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: activeFilter === filter.id ? '700' : '500',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    flex: 1
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* DRIVER CARDS LIST (WITH FRAMER MOTION SPRING REORDERING) */}
            <div style={{ maxWidth: '640px', margin: '12px auto 0 auto', padding: '0 12px' }}>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px auto' }} />
                        <div style={{ fontSize: '13px' }}>Loading current event FPV drivers...</div>
                    </div>
                ) : filteredDrivers.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#94a3b8'
                    }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>No Drivers Found</div>
                        <div style={{ fontSize: '12px' }}>
                            {searchQuery || activeFilter !== 'all' ? 'Try clearing your search or filter.' : 'No confirmed FPV registrations in this event yet.'}
                        </div>
                    </div>
                ) : (
                    <Reorder.Group
                        as="div"
                        axis="y"
                        values={filteredDrivers}
                        onReorder={handleReorder}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            listStyle: 'none',
                            margin: 0,
                            padding: 0
                        }}
                    >
                        {filteredDrivers.map((reg, index) => (
                            <DriverCardItem
                                key={reg.id}
                                reg={reg}
                                index={index}
                                isExpanded={!!expandedCards[reg.id]}
                                onToggleExpand={() => toggleCardExpand(reg.id)}
                                currentComp={editingComp[reg.id] !== undefined ? editingComp[reg.id] : (reg.compNumber || reg.competitionNumber || reg.compNo || '')}
                                onCompChange={(val) => setEditingComp(prev => ({ ...prev, [reg.id]: val }))}
                                onCompSave={() => handleCompSave(reg.id, reg.compNumber)}
                                cardRef={el => cardRefs.current[reg.id] = el}
                                onPhotoUpload={(e) => handlePhotoUpload(reg.id, e)}
                                uploadingId={uploadingId}
                                onOpenFullscreen={(img) => setFullscreenImage(img)}
                                onToggleClassCompleted={(className) => handleToggleClassCompleted(reg, className)}
                                getDriverClassDetails={getDriverClassDetails}
                                formatDisplayClassName={formatDisplayClassName}
                                cleanPhone={cleanPhone}
                            />
                        ))}
                    </Reorder.Group>
                )}
            </div>

            {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
            {fullscreenImage && (
                <div
                    onClick={() => setFullscreenImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0, 0, 0, 0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setFullscreenImage(null)}
                            style={{
                                position: 'absolute',
                                top: '-36px',
                                right: '0',
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={26} />
                        </button>
                        <img
                            src={fullscreenImage}
                            alt="Car High Resolution"
                            style={{
                                maxWidth: '92vw',
                                maxHeight: '82vh',
                                objectFit: 'contain',
                                borderRadius: '8px'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FPVScoutingList;
