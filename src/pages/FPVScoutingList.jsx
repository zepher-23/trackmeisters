import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, updateDocument } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { uploadToCloudinary } from '../lib/cloudinary';
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
    Eye
} from 'lucide-react';

const FPVScoutingList = () => {
    // Data states
    const [currentEvent, setCurrentEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & search states
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'needs_scout' | 'pending' | 'completed'

    // Interaction states
    const [uploadingId, setUploadingId] = useState(null);
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

    // Helpers to extract FPV classes vs total classes and buffer
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

        // Buffer classes: total classes registered minus those chosen for FPV
        const bufferClasses = totalClasses.filter(tc => {
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
            bufferClasses
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
            const photo = reg.fpvCarPhoto; // ONLY car photo, never driver photo

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

    // Filter & Search processing
    const filteredDrivers = useMemo(() => {
        return fpvRegistrations.filter(reg => {
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
    }, [fpvRegistrations, searchQuery, activeFilter]);

    // Scroll directly to a card when clicked in scouting queue
    const scrollToCard = (id) => {
        if (cardRefs.current[id]) {
            cardRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardRefs.current[id].style.boxShadow = '0 0 0 2px #ff2a2a, 0 8px 24px rgba(255, 42, 42, 0.4)';
            setTimeout(() => {
                if (cardRefs.current[id]) {
                    cardRefs.current[id].style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.35)';
                }
            }, 1800);
        }
    };

    // Clean phone number for WhatsApp / Tel
    const cleanPhone = (phoneStr) => {
        if (!phoneStr) return '';
        let digits = String(phoneStr).replace(/\D/g, '');
        if (digits.length === 10) digits = '91' + digits;
        return digits;
    };

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
                                FPV PILOT RADAR
                            </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentEvent?.title || 'Current Event'}
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
                            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>FPV Drivers</span>
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
                                            {item.compNo ? `#${item.compNo}` : 'NO #'}
                                        </strong>
                                        <span style={{ color: '#cbd5e1' }}>{item.car}</span>
                                        {item.missingPhoto && <span style={{ color: '#fbbf24', fontSize: '10px' }}>📷</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SEARCH INPUT & FILTER PILLS */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                                type="text"
                                placeholder="Search driver, car, comp #, plate..."
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

                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {[
                                { id: 'all', label: `All (${fpvRegistrations.length})` },
                                { id: 'needs_scout', label: `Scout (${stats.needsScoutingList.length})` },
                                { id: 'pending', label: 'Pending' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    style={{
                                        background: activeFilter === filter.id ? '#ff2a2a' : 'rgba(255, 255, 255, 0.05)',
                                        border: activeFilter === filter.id ? '1px solid #ff2a2a' : '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '6px',
                                        padding: '5px 8px',
                                        fontSize: '11px',
                                        fontWeight: activeFilter === filter.id ? '700' : '500',
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* DRIVER CARDS LIST (MOBILE-FIRST) */}
            <div style={{ maxWidth: '640px', margin: '14px auto 0 auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        color: '#94a3b8'
                    }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0', marginBottom: '4px' }}>No Drivers Found</div>
                        <div style={{ fontSize: '12px' }}>
                            {searchQuery || activeFilter !== 'all' ? 'Try clearing your search or filter.' : 'No confirmed FPV registrations in this event yet.'}
                        </div>
                    </div>
                ) : (
                    filteredDrivers.map(reg => {
                        const { totalClassCount, fpvCount, fpvClassNames, bufferClasses } = getDriverClassDetails(reg);
                        const completedMap = reg.fpvCompletedClasses || {};
                        const completedCount = fpvClassNames.filter(c => !!completedMap[c]).length;
                        const isAllFlown = fpvClassNames.length > 0 && completedCount === fpvClassNames.length;

                        const currentComp = editingComp[reg.id] !== undefined
                            ? editingComp[reg.id]
                            : (reg.compNumber || reg.competitionNumber || reg.compNo || '');

                        // STRICTLY car photo only; minimal placeholder if empty, NO driver photo
                        const carPhoto = reg.fpvCarPhoto || null;
                        const phoneDigits = cleanPhone(reg.phone);
                        const vehicleNumber = reg.registrationNumber || reg.vehicleNumber || null;

                        return (
                            <div
                                key={reg.id}
                                ref={el => cardRefs.current[reg.id] = el}
                                style={{
                                    background: isAllFlown
                                        ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.08) 0%, #061e36 100%)'
                                        : '#061e36',
                                    border: isAllFlown
                                        ? '1px solid rgba(34, 197, 94, 0.4)'
                                        : (currentComp ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(245, 158, 11, 0.4)'),
                                    borderRadius: '12px',
                                    padding: '14px',
                                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    transition: 'box-shadow 0.2s ease'
                                }}
                            >
                                {/* TOP ROW: Driver Name, Reg ID, and Racing Comp # */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {reg.name || 'Driver'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                            {reg.registrationId || ''}
                                        </div>
                                    </div>

                                    {/* Racing Comp # Box */}
                                    <div style={{
                                        background: '#000000',
                                        border: currentComp ? '1.5px solid #ffffff' : '1.5px dashed #fbbf24',
                                        borderRadius: '8px',
                                        padding: '2px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        flexShrink: 0
                                    }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: currentComp ? '#fbbf24' : '#f59e0b', textTransform: 'uppercase' }}>
                                            #
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="NO #"
                                            value={currentComp}
                                            onChange={(e) => setEditingComp(prev => ({ ...prev, [reg.id]: e.target.value }))}
                                            onBlur={() => handleCompSave(reg.id, reg.compNumber)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                            style={{
                                                width: '54px',
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                fontSize: '17px',
                                                fontWeight: '900',
                                                fontFamily: 'monospace',
                                                color: '#ffffff',
                                                textAlign: 'center'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* MIDDLE ROW: Car Photo & Info / Actions */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    {/* CAR PHOTO (Snap directly with rear camera) */}
                                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            ref={el => fileInputRefs.current[reg.id] = el}
                                            onChange={(e) => handlePhotoUpload(reg.id, e)}
                                            style={{ display: 'none' }}
                                        />

                                        <div
                                            onClick={() => carPhoto && setFullscreenImage(carPhoto)}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '8px',
                                                background: '#02182e',
                                                border: carPhoto ? '1px solid rgba(255, 255, 255, 0.15)' : '1px dashed rgba(255, 255, 255, 0.15)',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: carPhoto ? 'pointer' : 'default',
                                                position: 'relative'
                                            }}
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
                                                        top: '4px',
                                                        right: '4px',
                                                        background: 'rgba(0, 0, 0, 0.6)',
                                                        borderRadius: '4px',
                                                        padding: '2px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Eye size={10} color="#cbd5e1" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '4px' }}>
                                                    <Car size={26} color="#334155" style={{ margin: '0 auto 2px auto', display: 'block' }} />
                                                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                        No Car Photo
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Camera Trigger Button */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRefs.current[reg.id]?.click()}
                                            disabled={uploadingId === reg.id}
                                            style={{
                                                position: 'absolute',
                                                bottom: '-6px',
                                                right: '-6px',
                                                background: '#ff2a2a',
                                                color: '#fff',
                                                border: '2px solid #061e36',
                                                borderRadius: '50%',
                                                width: '28px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                                padding: 0
                                            }}
                                            title="Snap car photo on the spot"
                                        >
                                            {uploadingId === reg.id ? (
                                                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                            ) : (
                                                <Camera size={13} />
                                            )}
                                        </button>
                                    </div>

                                    {/* CAR DETAILS & ACTIONS */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {/* Car Model */}
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {reg.carModel || 'Vehicle Unspecified'}
                                        </div>

                                        {/* Vehicle Number (Plate) if provided */}
                                        {vehicleNumber ? (
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
                                                alignSelf: 'flex-start'
                                            }}>
                                                {vehicleNumber}
                                            </div>
                                        ) : null}

                                        {/* Buffer Ratio: FPV vs Total Classes */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff' }}>
                                                FPV: {fpvCount} / {totalClassCount} Classes
                                            </span>
                                            {totalClassCount > fpvCount && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#38bdf8',
                                                    background: 'rgba(56, 189, 248, 0.12)',
                                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    fontWeight: '700'
                                                }}>
                                                    +{totalClassCount - fpvCount} buffer
                                                </span>
                                            )}
                                        </div>

                                        {/* Functional Call & WhatsApp Buttons */}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            {reg.phone ? (
                                                <a
                                                    href={`tel:${reg.phone}`}
                                                    style={{
                                                        background: 'rgba(2, 132, 199, 0.18)',
                                                        border: '1px solid rgba(2, 132, 199, 0.4)',
                                                        color: '#38bdf8',
                                                        borderRadius: '6px',
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Phone size={11} /> Call
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
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <MessageCircle size={11} /> WhatsApp
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                {/* FLIGHT RUNS CHECKLIST (Each Opted Class with 1-Tap Complete) */}
                                <div style={{
                                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                    paddingTop: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    {fpvClassNames.map((className, idx) => {
                                        const isDone = !!completedMap[className];
                                        const displayLabel = formatDisplayClassName(className);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleToggleClassCompleted(reg, className)}
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

                                    {/* BUFFER CLASSES LIST (In case primary flight was missed) */}
                                    {bufferClasses.length > 0 && (
                                        <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>Buffer:</span>
                                            {bufferClasses.map((bc, bIdx) => (
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
                            </div>
                        );
                    })
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
