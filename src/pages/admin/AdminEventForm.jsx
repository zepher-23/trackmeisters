import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, Plus, X, Upload, Loader2, Calendar, MapPin, List, IndianRupee, FileText, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
    addDocument,
    updateDocument,
    fetchDocument
} from '../../lib/firebase';
import { useEvents } from '../../hooks/useFirebase';
import { uploadToCloudinary } from '../../lib/cloudinary';
import './admin.css';

const AdminEventForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: allEvents } = useEvents(); // Fetch all events for suggestions
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Track Auto-complete
    const [showTrackSuggestions, setShowTrackSuggestions] = useState(false);
    const trackInputRef = useRef(null);

    // Get unique existing tracks
    const existingTracks = React.useMemo(() => {
        if (!allEvents) return [];
        const tracks = new Set();
        allEvents.forEach(e => {
            if (e.trackName) tracks.add(e.trackName);
        });
        return Array.from(tracks).sort();
    }, [allEvents]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        type: 'Race',
        location: '',
        slots: '',
        status: 'upcoming',
        winner: '',
        fastestLap: '',
        image: '',
        classes: []
    });

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (trackInputRef.current && !trackInputRef.current.contains(event.target)) {
                setShowTrackSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Dedicated state for new class input
    const [newClass, setNewClass] = useState({
        name: '',
        price: '',
        description: '',
        requirements: ''
    });

    // Expand state for compressed list
    const [expandedClassIndex, setExpandedClassIndex] = useState(null);

    useEffect(() => {
        if (id) {
            loadEventData();
        }
    }, [id]);

    const loadEventData = async () => {
        setLoading(true);
        try {
            const data = await fetchDocument('events', id);
            if (data) {
                setFormData(data);
            } else {
                setError('Event not found');
            }
        } catch (err) {
            console.error('Error loading event:', err);
            setError('Failed to load event data');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        try {
            const url = await uploadToCloudinary(file);
            setFormData(prev => ({ ...prev, [field]: url }));
        } catch (err) {
            console.error('Upload failed:', err);
            setError('Failed to upload image');
        } finally {
            setSaving(false);
        }
    };

    const handleAddClass = () => {
        // Validation: Minimal check, maybe just warn if empty?
        // If the user wants to add a "blank" class, we let them, but usually they'd have at least one field.
        // But per request "price and class name is not mandatory", we remove the strict block.

        // However, adding a completely empty object might be confusing. 
        // Let's assume they might enter just a description.
        // If literally nothing is entered, maybe we shouldn't add it?
        // For now, I'll remove the blocking validation entirely as requested.

        // Optional: meaningful check to ensure not adding totally empty garbage if desired, 
        // but user asked to remove mandatory checks.

        // no-op check to avoid adding 100 empty classes by accident? 
        // valid: if name OR price OR description exists.
        const hasContent = newClass.name || newClass.price || newClass.description || (newClass.subclasses && newClass.subclasses.length > 0);

        if (!hasContent) {
            // Maybe silent return or minimal error?
            // If they strictly said "not mandatory", I will just proceed.
        }

        setFormData(prev => ({
            ...prev,
            classes: [...(prev.classes || []), { ...newClass }]
        }));

        // Reset new class form
        setNewClass({
            name: '',
            price: '',
            description: '',
            requirements: ''
        });
        setError(null);
    };

    const removeClass = (index) => {
        setFormData(prev => {
            const updated = [...(prev.classes || [])];
            updated.splice(index, 1);
            return { ...prev, classes: updated };
        });
        if (expandedClassIndex === index) setExpandedClassIndex(null);
    };

    const toggleExpand = (index) => {
        setExpandedClassIndex(expandedClassIndex === index ? null : index);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.date) {
            setError('Title and Date are required');
            return;
        }



        setSaving(true);
        setError(null);
        try {
            if (id) {
                await updateDocument('events', id, formData);
            } else {
                await addDocument('events', formData);
            }
            navigate('/admin');
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save event');
        } finally {
            setSaving(false);
        }
    };

    const renderImageUploadField = (label, field, currentValue) => (
        <div className="admin-form-group">
            <label className="admin-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {label}
                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 'normal' }}>Rec: 1200x800px (Max 5MB)</span>
            </label>
            <div className="image-upload-container" style={{
                border: '2px dashed var(--admin-border)',
                borderRadius: '10px',
                padding: '20px',
                textAlign: 'center',
                background: currentValue ? `url(${currentValue}) center/cover` : 'var(--admin-surface-hover)',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                transition: 'all 0.2s ease'
            }}>
                <input
                    type="file"
                    onChange={(e) => handleImageUpload(e, field)}
                    accept="image/*"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer'
                    }}
                />
                {!currentValue && (
                    <>
                        <Upload size={32} style={{ color: 'var(--admin-text-secondary)', marginBottom: '10px' }} />
                        <span style={{ color: 'var(--admin-text-secondary)', fontSize: '14px' }}>
                            Click to upload image
                        </span>
                    </>
                )}
                {currentValue && (
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(0,0,0,0.7)',
                        padding: '10px',
                        color: 'white',
                        fontSize: '12px'
                    }}>
                        Click to change
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="admin-page-loading">
                <Loader2 className="spin" size={32} />
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-main" style={{ marginLeft: 0 }}>
                <div className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => navigate('/admin')}
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '8px' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{ marginBottom: 0 }}>
                            {id ? 'Edit Event' : 'Create New Event'}
                        </h1>
                    </div>
                    <div className="admin-header-actions">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="admin-btn admin-btn-primary"
                        >
                            {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                            {saving ? 'Saving...' : 'Save Event'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="admin-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <div className="admin-card">
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: '40px', alignItems: 'start' }}>

                        {/* LEFT COLUMN: Event Details + Added Classes List (Compressed) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                            {/* Section 1: Event Details */}
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={18} className="text-primary" /> Event Details
                                </h3>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Event Title</label>
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g., Summer Track Day 2026"
                                        style={{ fontSize: '16px', fontWeight: '600' }}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Description</label>
                                    <textarea
                                        className="admin-form-textarea"
                                        rows={3}
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Event description..."
                                    />
                                </div>

                                <div className="admin-form-row">
                                    <div className="admin-form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label className="admin-form-label" style={{ marginBottom: 0 }}>Date</label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.date === 'TBA'}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, date: 'TBA' });
                                                        } else {
                                                            setFormData({ ...formData, date: '' });
                                                        }
                                                    }}
                                                />
                                                TBA
                                            </label>
                                        </div>
                                        <input
                                            type="date"
                                            className="admin-form-input"
                                            value={formData.date === 'TBA' ? '' : (formData.date || '')}
                                            disabled={formData.date === 'TBA'}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Type</label>
                                        <select
                                            className="admin-form-select"
                                            value={formData.type || 'Track Day'}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="Race">Race</option>
                                            <option value="Track Day & Training">Track Day & Training</option>
                                            <option value="Corporate Events">Corporate Events</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-form-label">Location</label>
                                    <div className="admin-input-group">
                                        <MapPin size={16} className="input-icon" style={{ top: '20px' }} />
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={formData.location || ''}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="Enter location"
                                            style={{ paddingLeft: '40px' }}
                                        />
                                    </div>
                                </div>

                                <div className="admin-form-row">
                                    <div className="admin-form-group" ref={trackInputRef} style={{ position: 'relative' }}>
                                        <label className="admin-form-label">Track Name</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={formData.trackName || ''}
                                            onChange={(e) => {
                                                setFormData({ ...formData, trackName: e.target.value });
                                                setShowTrackSuggestions(true);
                                            }}
                                            onFocus={() => setShowTrackSuggestions(true)}
                                            placeholder="e.g. Kari Motor Speedway"
                                            autoComplete="off"
                                        />
                                        {showTrackSuggestions && (
                                            <ul style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                width: '100%',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                background: 'var(--admin-surface)',
                                                border: '1px solid var(--admin-border)',
                                                borderRadius: '0 0 8px 8px',
                                                zIndex: 50,
                                                listStyle: 'none',
                                                padding: 0,
                                                margin: 0,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                            }}>
                                                {existingTracks
                                                    .filter(track => track.toLowerCase().includes((formData.trackName || '').toLowerCase()))
                                                    .map((track, index) => (
                                                        <li
                                                            key={index}
                                                            onClick={() => {
                                                                setFormData({ ...formData, trackName: track });
                                                                setShowTrackSuggestions(false);
                                                            }}
                                                            style={{
                                                                padding: '10px 16px',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid var(--admin-border)',
                                                                color: 'var(--admin-text)',
                                                                fontSize: '14px'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = 'var(--admin-bg)'}
                                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                        >
                                                            {track}
                                                        </li>
                                                    ))
                                                }
                                                {/* Option to create new, implied by typing, but explicitly showing it's a new entry can be nice, though filtering handles it naturally. 
                                                    If filter returns nothing, user just types. */}
                                            </ul>
                                        )}
                                    </div>

                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Track Direction</label>
                                        <select
                                            className="admin-form-select"
                                            value={formData.trackDirection || 'Clockwise'}
                                            onChange={(e) => setFormData({ ...formData, trackDirection: e.target.value })}
                                        >
                                            <option value="Clockwise">Clockwise</option>
                                            <option value="Anti-Clockwise">Anti-Clockwise</option>
                                        </select>
                                    </div>
                                </div>



                                <div className="admin-form-group" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--admin-border)' }}>
                                    <label className="admin-form-label">Event Status</label>
                                    <select
                                        className="admin-form-select"
                                        value={formData.status || 'upcoming'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {renderImageUploadField('Event Cover Image', 'image', formData.image)}
                            </div>

                            {/* Section 2: Added Classes List (Compressed) */}
                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--admin-border)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '16px', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <List size={16} className="text-primary" /> Participation Classes
                                    <span style={{ fontSize: '12px', background: 'var(--admin-primary)', padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto' }}>
                                        {(formData.classes || []).length} added
                                    </span>
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <AnimatePresence mode='popLayout'>
                                        {(formData.classes || []).map((cls, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                layout
                                                style={{
                                                    background: 'var(--admin-bg)',
                                                    border: '1px solid var(--admin-border)',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div
                                                    onClick={() => toggleExpand(index)}
                                                    style={{
                                                        padding: '12px 16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        background: expandedClassIndex === index ? 'var(--admin-surface-hover)' : 'transparent'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)' }}>{cls.name}</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--admin-primary)', fontWeight: 'bold' }}>₹{cls.price}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeClass(index); }}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                            title="Remove Class"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        {expandedClassIndex === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                <AnimatePresence>
                                                    {expandedClassIndex === index && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            style={{ borderTop: '1px solid var(--admin-border)', padding: '16px', background: 'rgba(0,0,0,0.2)' }}
                                                        >
                                                            {cls.description && (
                                                                <div style={{ marginBottom: '12px' }}>
                                                                    <div style={{ fontSize: '10px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                                                                    <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: 0 }}>{cls.description}</p>
                                                                </div>
                                                            )}
                                                            {cls.subclasses && cls.subclasses.length > 0 && (
                                                                <div style={{ marginBottom: '12px' }}>
                                                                    <div style={{ fontSize: '10px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Subclasses</div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                        {cls.subclasses.map((sub, sIdx) => {
                                                                            const subName = typeof sub === 'string' ? sub : sub.name;
                                                                            const subDesc = typeof sub === 'string' ? '' : sub.description;
                                                                            const subPrice = typeof sub === 'string' ? '' : sub.price;
                                                                            return (
                                                                                <div key={sIdx} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', display: 'flex', flexDirection: 'column' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                        <span style={{ color: 'var(--admin-text)', fontWeight: '500' }}>{subName}</span>
                                                                                        {subPrice && <span style={{ color: 'var(--admin-success)', fontWeight: 'bold' }}>₹{subPrice}</span>}
                                                                                    </div>
                                                                                    {subDesc && <span style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic', fontSize: '11px', marginTop: '2px' }}>{subDesc}</span>}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {cls.requirements && (
                                                                <div>
                                                                    <div style={{ fontSize: '10px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Requirements</div>
                                                                    <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>{cls.requirements}</p>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {(formData.classes || []).length === 0 && (
                                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-secondary)', border: '1px dashed var(--admin-border)', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '13px' }}>No classes added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Add New Class Form */}
                        <div style={{ position: 'sticky', top: '24px', paddingLeft: '20px', borderLeft: '1px solid var(--admin-border)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={18} className="text-primary" /> Add New Class
                            </h3>

                            <div className="admin-form-group">
                                <label className="admin-form-label">Class Name</label>
                                <input
                                    type="text"
                                    className="admin-form-input"
                                    value={newClass.name}
                                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                                    placeholder="e.g., GT3 Cup / Street Class"
                                />
                            </div>

                            {formData.type !== 'Race' && (
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Entry Price</label>
                                    <div className="admin-input-group">
                                        <IndianRupee size={16} className="input-icon" style={{ top: '20px' }} />
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={newClass.price}
                                            onChange={(e) => setNewClass({ ...newClass, price: e.target.value })}
                                            placeholder="e.g., 4000"
                                            style={{ paddingLeft: '40px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="admin-form-group">
                                <label className="admin-form-label">Description</label>
                                <textarea
                                    className="admin-form-textarea"
                                    value={newClass.description}
                                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                                    placeholder="Who fits in this class?"
                                    rows={3}
                                />
                            </div>

                            {/* Subclasses (Only for Race type, or generally available) */}
                            {formData.type === 'Race' && (
                                <div className="admin-form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--admin-border)' }}>
                                    <label className="admin-form-label" style={{ fontSize: '13px', color: 'var(--admin-secondary)' }}>Subclasses (Optional)</label>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                className="admin-form-input"
                                                value={newClass.subclassInputName || ''}
                                                onChange={(e) => setNewClass({ ...newClass, subclassInputName: e.target.value })}
                                                placeholder="Name (e.g. Under 200cc)"
                                                style={{ fontSize: '13px', flex: 2 }}
                                            />
                                            <div className="admin-input-group" style={{ flex: 1, minWidth: '80px' }}>
                                                <input
                                                    type="number"
                                                    className="admin-form-input"
                                                    value={newClass.subclassInputPrice || ''}
                                                    onChange={(e) => setNewClass({ ...newClass, subclassInputPrice: e.target.value })}
                                                    placeholder="Price"
                                                    style={{ fontSize: '13px', paddingLeft: '8px' }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (newClass.subclassInputName?.trim()) {
                                                        const newSub = {
                                                            name: newClass.subclassInputName.trim(),
                                                            description: newClass.subclassInputDesc?.trim() || '',
                                                            price: newClass.subclassInputPrice || newClass.price || ''
                                                        };
                                                        setNewClass(prev => ({
                                                            ...prev,
                                                            subclasses: [...(prev.subclasses || []), newSub],
                                                            subclassInputName: '',
                                                            subclassInputDesc: '',
                                                            subclassInputPrice: ''
                                                        }));
                                                    }
                                                }}
                                                style={{
                                                    background: 'var(--admin-surface)',
                                                    border: '1px solid var(--admin-border)',
                                                    color: 'var(--admin-primary)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    padding: '0 12px'
                                                }}
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={newClass.subclassInputDesc || ''}
                                            onChange={(e) => setNewClass({ ...newClass, subclassInputDesc: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (newClass.subclassInputName?.trim()) {
                                                        const newSub = {
                                                            name: newClass.subclassInputName.trim(),
                                                            description: newClass.subclassInputDesc?.trim() || '',
                                                            price: newClass.subclassInputPrice || newClass.price || ''
                                                        };
                                                        setNewClass(prev => ({
                                                            ...prev,
                                                            subclasses: [...(prev.subclasses || []), newSub],
                                                            subclassInputName: '',
                                                            subclassInputDesc: '',
                                                            subclassInputPrice: ''
                                                        }));
                                                    }
                                                }
                                            }}
                                            placeholder="Description (e.g. For beginner bikes)"
                                            style={{ fontSize: '13px' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {(newClass.subclasses || []).map((sub, idx) => (
                                            <div key={idx} style={{
                                                background: 'var(--admin-surface)',
                                                border: '1px solid var(--admin-border)',
                                                borderRadius: '4px',
                                                padding: '6px 10px',
                                                fontSize: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--admin-text)' }}>{typeof sub === 'string' ? sub : sub.name}</span>
                                                        {(typeof sub !== 'string' && sub.price) && (
                                                            <span style={{ fontSize: '11px', background: 'var(--admin-success)', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
                                                                ₹{sub.price}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(typeof sub !== 'string' && sub.description) && (
                                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>{sub.description}</span>
                                                    )}
                                                </div>
                                                <X
                                                    size={14}
                                                    style={{ cursor: 'pointer', color: '#ef4444' }}
                                                    onClick={() => {
                                                        const updated = [...newClass.subclasses];
                                                        updated.splice(idx, 1);
                                                        setNewClass({ ...newClass, subclasses: updated });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="admin-form-group">
                                <label className="admin-form-label">Requirements & Rules</label>
                                <textarea
                                    className="admin-form-textarea"
                                    value={newClass.requirements}
                                    onChange={(e) => setNewClass({ ...newClass, requirements: e.target.value })}
                                    placeholder="e.g., Roll cage required, 200TW tires..."
                                    rows={4}
                                />
                            </div>

                            <button
                                className="admin-btn admin-btn-primary"
                                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                                onClick={handleAddClass}
                            >
                                <Plus size={18} /> Add Class
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminEventForm;
