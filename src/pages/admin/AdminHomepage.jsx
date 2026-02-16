import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, AlertCircle, Layout, Image as ImageIcon, Type, Link as LinkIcon, Palette } from 'lucide-react';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Loader from '../../components/Loader';

const AdminHomepage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('hero');

    const [heroConfig, setHeroConfig] = useState({
        image: '',
        tagline: 'Automotive Excellence',
        taglineColor: '#5EEAD4',
        title: 'OWN THE TRACK',
        titleColor: '#FFFFFF',
        description: "India's premier motorsport community. Experience high-octane track days, competitive racing leagues, and exclusive automotive events designed for the true enthusiast.",
        descriptionColor: 'rgba(255, 255, 255, 0.8)'
    });

    const [bentoConfig, setBentoConfig] = useState({
        nextEvent: { title: 'Season 2026', subtitle: 'Coming Soon', textColor: '#FFFFFF', overrideImage: null },
        trackDays: { title: 'Next Track Days', subtitle: 'No available dates', textColor: '#FFFFFF', overrideImage: null },
        community: { title: 'Community', subtitle: 'Join 50k+ Drivers', textColor: '#FFFFFF', overrideImage: null },
        news: { title: 'Latest News', subtitle: 'Read Article', textColor: '#FFFFFF', overrideImage: null },
        classifieds: { title: 'Marketplace', subtitle: 'Featured Listing', textColor: '#FFFFFF', overrideImage: null },
        sponsorship: { title: 'Sponsorships', subtitle: 'Partner with us', textColor: '#FFFFFF', overrideImage: null }
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const docRef = doc(db, 'site_content', 'homepage');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.hero) setHeroConfig(prev => ({ ...prev, ...data.hero }));
                if (data.bento) setBentoConfig(prev => ({ ...prev, ...data.bento }));
            }
        } catch (error) {
            console.error("Error fetching homepage config:", error);
            showNotification('error', 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'site_content', 'homepage'), {
                hero: heroConfig,
                bento: bentoConfig,
                updatedAt: new Date().toISOString()
            });
            showNotification('success', 'Homepage updated successfully');
        } catch (error) {
            console.error("Error saving config:", error);
            showNotification('error', 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (file, section, subSection = null) => {
        if (!file) return;

        try {
            const storagePath = `homepage/${section}${subSection ? `-${subSection}` : ''}-${Date.now()}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            if (section === 'hero') {
                setHeroConfig(prev => ({ ...prev, image: url }));
            } else if (section === 'bento') {
                setBentoConfig(prev => ({
                    ...prev,
                    [subSection]: { ...prev[subSection], overrideImage: url }
                }));
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            showNotification('error', 'Failed to upload image');
        }
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const ColorPicker = ({ label, value, onChange }) => (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                <Palette size={12} /> {label}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        background: '#333',
                        border: '1px solid #444',
                        color: 'white',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        width: '100px'
                    }}
                />
            </div>
        </div>
    );

    if (loading) return <Loader />;

    return (
        <div className="admin-page-container" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>Homepage Manager</h1>
                    <p style={{ color: '#888' }}>Customize the public homepage content</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="admin-btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${notification.type === 'success' ? '#10B981' : '#EF4444'}`,
                        color: notification.type === 'success' ? '#10B981' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <AlertCircle size={18} />
                    {notification.message}
                </motion.div>
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #333' }}>
                <button
                    onClick={() => setActiveTab('hero')}
                    style={{
                        padding: '15px 20px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${activeTab === 'hero' ? 'var(--color-accent)' : 'transparent'}`,
                        color: activeTab === 'hero' ? 'var(--color-accent)' : '#888',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Layout size={18} /> Hero Section
                </button>
                <button
                    onClick={() => setActiveTab('bento')}
                    style={{
                        padding: '15px 20px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${activeTab === 'bento' ? 'var(--color-accent)' : 'transparent'}`,
                        color: activeTab === 'bento' ? 'var(--color-accent)' : '#888',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Layout size={18} /> Bento Grid
                </button>
            </div>

            {activeTab === 'hero' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Type size={18} color="var(--color-accent)" /> Text Content
                        </h3>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="admin-form-label">Tagline (Above Title)</label>
                            <input
                                type="text"
                                className="admin-form-input"
                                value={heroConfig.tagline}
                                onChange={(e) => setHeroConfig({ ...heroConfig, tagline: e.target.value })}
                            />
                            <ColorPicker
                                label="Tagline Color"
                                value={heroConfig.taglineColor}
                                onChange={(color) => setHeroConfig({ ...heroConfig, taglineColor: color })}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="admin-form-label">Main Title</label>
                            <input
                                type="text"
                                className="admin-form-input"
                                value={heroConfig.title}
                                onChange={(e) => setHeroConfig({ ...heroConfig, title: e.target.value })}
                            />
                            <ColorPicker
                                label="Title Color"
                                value={heroConfig.titleColor}
                                onChange={(color) => setHeroConfig({ ...heroConfig, titleColor: color })}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label className="admin-form-label">Description</label>
                            <textarea
                                className="admin-form-textarea"
                                value={heroConfig.description}
                                onChange={(e) => setHeroConfig({ ...heroConfig, description: e.target.value })}
                                rows={4}
                            />
                            <ColorPicker
                                label="Description Color"
                                value={heroConfig.descriptionColor}
                                onChange={(color) => setHeroConfig({ ...heroConfig, descriptionColor: color })}
                            />
                        </div>
                    </div>

                    <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ImageIcon size={18} color="var(--color-accent)" /> Background Image
                        </h3>

                        <div style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            background: '#111',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            border: '2px dashed #333',
                            position: 'relative',
                            backgroundImage: `url(${heroConfig.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}>
                            {!heroConfig.image && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No Image</div>}
                        </div>

                        <label className="admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <Upload size={16} /> Upload New Image
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e.target.files[0], 'hero')}
                            />
                        </label>
                    </div>
                </div>
            )}

            {activeTab === 'bento' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {Object.entries(bentoConfig).map(([key, config]) => (
                        <div key={key} style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--color-accent)', textTransform: 'capitalize' }}>
                                {key.replace(/([A-Z])/g, ' $1').trim()} Card
                            </h3>

                            {/* Image Upload */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px' }}>Card Background</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        background: '#222',
                                        borderRadius: '6px',
                                        backgroundImage: config.overrideImage ? `url(${config.overrideImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        border: '1px solid #444'
                                    }}></div>
                                    <label className="admin-btn-secondary" style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}>
                                        Change
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e.target.files[0], 'bento', key)}
                                        />
                                    </label>
                                    {config.overrideImage && (
                                        <button
                                            onClick={() => setBentoConfig(prev => ({ ...prev, [key]: { ...prev[key], overrideImage: null } }))}
                                            style={{ color: '#EF4444', fontSize: '12px', textDecoration: 'underline' }}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Text Inputs */}
                            <div style={{ marginBottom: '15px' }}>
                                <label className="admin-form-label">Title (Max 25 chars)</label>
                                <input
                                    type="text"
                                    className="admin-form-input"
                                    maxLength={25}
                                    value={config.title}
                                    onChange={(e) => setBentoConfig(prev => ({
                                        ...prev,
                                        [key]: { ...prev[key], title: e.target.value }
                                    }))}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label className="admin-form-label">Subtitle (Max 40 chars)</label>
                                <input
                                    type="text"
                                    className="admin-form-input"
                                    maxLength={40}
                                    value={config.subtitle}
                                    onChange={(e) => setBentoConfig(prev => ({
                                        ...prev,
                                        [key]: { ...prev[key], subtitle: e.target.value }
                                    }))}
                                />
                            </div>

                            <ColorPicker
                                label="Text Color"
                                value={config.textColor}
                                onChange={(color) => setBentoConfig(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], textColor: color }
                                }))}
                            />
                        </div>
                    ))}

                    {/* Read-Only Leaderboard Card */}
                    <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333', opacity: 0.6, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 10, right: 10, background: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>Example Only</div>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#888' }}>Leaderboard Card</h3>
                        <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                            This card is generated dynamically from race results and cannot be manually edited here.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHomepage;
