import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoWhite from '../../assets/logo-white.png';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Image,
    Handshake,
    LogOut,
    Plus,
    Edit2,
    Trash2,
    X,
    Save,
    ChevronRight,
    Settings,
    Loader2,
    Upload,
    FileText,
    Menu,
    User,
    AlertCircle,
    Trophy,
    Car,
    Layout,
    Link as LinkIcon // Added Link as LinkIcon to avoid conflict with react-router-dom Link
} from 'lucide-react';
import {
    fetchCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    COLLECTIONS,
    isFirebaseReady
} from '../../lib/firebase';
import { uploadToCloudinary, uploadFileToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../../lib/cloudinary';
import BlogEditor from './BlogEditor';
import AdminMobileView from './AdminMobileView';
import './admin.css';

// Initial sample data for fallback mode
const initialData = {
    events: [
        { id: '1', title: 'Summer Track Day', date: '2026-08-15', location: 'UK', trackName: 'Silverstone Circuit', type: 'Track Day', slots: '15/40', image: '/event-track-day.webp' },
        { id: '2', title: 'GT3 Cup Round 4', date: '2026-09-02', location: 'UK', trackName: 'Brands Hatch', type: 'Race', slots: 'Open', image: '/event-race.webp' },
        { id: '3', title: 'JDM Legends Meet', date: '2026-09-10', location: 'London', trackName: 'Ace Cafe', type: 'Meetup', slots: 'Free', image: '/event-meetup.webp' },
    ],
    media: [
        { id: '1', title: 'Season Highlights 2025', type: 'video', thumbnail: '/media/season-highlights.webp', description: 'Best moments from 2025', duration: '4:32' },
        { id: '2', title: 'Porsche GT3 Glory', type: 'image', thumbnail: '/media/porsche-gt3.webp', description: 'GT3 machinery shots' },
    ],
    partners: [
        { id: '1', name: 'Apex Performance Oils', description: 'Technical partnership', logo: '' },
        { id: '2', name: 'Zenith Watch Co.', description: 'Official Timekeeper', logo: '' },
    ],
    blogs: [
        { id: '1', title: 'Season 2026 Preview', author: 'Alex Morgan', publishedAt: '2026-01-15', category: 'News', excerpt: 'Get ready for an exciting season...', coverImage: '/event-track-day.webp', sections: [] }
    ],
    press: [ // Added press to initialData
        { id: '1', title: 'Trackmeisters Review', outlet: 'Motorsport.com', date: '2026-02-01', url: '#' }
    ],
    documents: []
};


const AdminDashboard = ({ onLogout }) => {
    const navigate = useNavigate();

    const handleNavClick = (id) => {
        if (id === 'registrations') {
            navigate('/admin/registrations');
        } else if (id === 'homepage') {
            navigate('/admin/homepage');
        } else {
            setActiveSection(id);
            setMobileMenuOpen(false);
        }
    };

    // Navigation Items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'homepage', label: 'Homepage', icon: Layout },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'media', label: 'Media', icon: Image },
        { id: 'blogs', label: 'Newsletter & Press', icon: FileText },
        { id: 'registrations', label: 'Registrations', icon: User },
        { id: 'partners', label: 'Partners', icon: Handshake },
        { id: 'classifieds', label: 'Classifieds', icon: Car },
        { id: 'documents', label: 'Documents', icon: FileText },
    ];

    const [activeSection, setActiveSection] = useState('dashboard');
    const [newsletterTab, setNewsletterTab] = useState('newsletter');
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Media upload state
    const [mediaDragActive, setMediaDragActive] = useState(false);
    const [mediaUploadProgress, setMediaUploadProgress] = useState(null);
    const [mediaUploadError, setMediaUploadError] = useState(null);
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [selectedMediaEvent, setSelectedMediaEvent] = useState('');
    const mediaFileInputRef = useRef(null);

    // Missing Driver State
    const [driverFormVisible, setDriverFormVisible] = useState(false);
    const [editingDriverId, setEditingDriverId] = useState(null);
    const [driverForm, setDriverForm] = useState({ name: '', subtitle: '', rank: 'Bronze', car: '', wins: 0, podiums: 0, fastLaps: 0 });
    const driverImageRef = useRef(null);
    const handleDriverImageUpload = () => { }; // Placeholder or implement if needed

    // Load data from Firebase on mount
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async (showLoading = true) => {
        if (!isFirebaseReady()) {
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);
        try {
            const [events, media, partners, newsletter, pressReleases, fetchedDocuments, classifieds] = await Promise.all([
                fetchCollection(COLLECTIONS.EVENTS),
                fetchCollection(COLLECTIONS.MEDIA),
                fetchCollection(COLLECTIONS.PARTNERS),
                fetchCollection(COLLECTIONS.BLOGS),
                fetchCollection(COLLECTIONS.PRESS),
                fetchCollection(COLLECTIONS.DOCUMENTS),
                fetchCollection(COLLECTIONS.CLASSIFIEDS)
            ]);

            setData({
                events: events.length > 0 ? events : initialData.events,
                media: media.length > 0 ? media : initialData.media,
                partners: partners.length > 0 ? partners : initialData.partners,
                blogs: newsletter.length > 0 ? newsletter : initialData.blogs,
                press: pressReleases.length > 0 ? pressReleases : initialData.press,
                documents: fetchedDocuments.length > 0 ? fetchedDocuments : initialData.documents,
                classifieds: classifieds || []
            });
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load data from Firebase');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const openModal = (type, item = null) => {
        setModalType(type);
        setEditItem(item);
        setFormData(item ? { ...item } : getEmptyForm(type));
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditItem(null);
        setFormData({});
        setError(null);
    };

    const getSectionTitle = () => {
        switch (activeSection) {
            case 'dashboard': return 'Dashboard';
            case 'events': return 'Events Management';
            case 'media': return 'Media Gallery';
            case 'blogs': return 'Newsletter & Press';
            case 'partners': return 'Partners & Sponsors';
            case 'classifieds': return 'Classifieds Management';
            case 'documents': return 'Rules & Resources Management';
            default: return 'Dashboard';
        }
    };

    const getEmptyForm = (type) => {
        switch (type) {
            case 'events':
                return { title: '', description: '', date: '', location: '', type: 'Track Day', slots: '', image: '', classes: [] };
            case 'media':
                return { title: '', type: 'image', thumbnail: '', description: '', duration: '' };
            case 'partners':
                return { name: '', description: '', logo: '' };
            case 'blogs':
                return { title: '', author: '', category: 'News', excerpt: '', coverImage: '', publishedAt: new Date().toISOString().split('T')[0], sections: [] };
            case 'press':
                return { title: '', outlet: '', date: new Date().toISOString().split('T')[0], url: '' };
            case 'classifieds':
                return { title: '', make: '', model: '', year: '', price: '', mileage: '', engine: '', transmission: '', horsepower: '', description: '', images: [], featuredImage: '', isPublished: true };
            case 'documents':
                return { title: '', category: 'Rules', fileUrl: '' };
            default:
                return {};
        }
    };



    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            if (modalType === 'blogs' && formData.sections) {
                // Filter out empty sections
                formData.sections = formData.sections.filter(section => {
                    if (section.type === 'text') {
                        const hasContent = section.content && section.content.trim().length > 0;
                        const hasTitle = section.sectionTitle && section.sectionTitle.trim().length > 0;
                        return hasContent || hasTitle;
                    }
                    if (section.type === 'image') return section.url && section.url.trim().length > 0;
                    if (section.type === 'video') return section.youtubeId && section.youtubeId.trim().length > 0;
                    if (section.type === 'link') return section.url && section.url.trim().length > 0;
                    return true;
                });
            }

            if (isFirebaseReady()) {
                if (editItem) {
                    // Update existing document
                    await updateDocument(modalType, editItem.id, formData);
                } else {
                    // Add new document
                    await addDocument(modalType, formData);
                }
                // Reload data
                await loadAllData();
            } else {
                // Fallback to local state
                if (editItem) {
                    setData(prev => ({
                        ...prev,
                        [modalType]: prev[modalType].map(item =>
                            item.id === editItem.id ? { ...formData, id: editItem.id } : item
                        )
                    }));
                } else {
                    const newId = String(Date.now());
                    setData(prev => ({
                        ...prev,
                        [modalType]: [...prev[modalType], { ...formData, id: newId }]
                    }));
                }
            }
            closeModal();
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async (sectionArg, idArg) => {
        const section = sectionArg || deletingItem?.section;
        const id = idArg || deletingItem?.id;

        if (!section || !id) return;

        setIsDeleting(true);

        try {
            // Delete from Cloudinary if it's a media item
            if (section === 'media') {
                const itemToDelete = data.media.find(item => item.id === id);
                if (itemToDelete) {
                    // Try to extract public ID from url or thumbnail
                    const url = itemToDelete.url || itemToDelete.thumbnail;
                    const publicId = getPublicIdFromUrl(url);

                    if (publicId) {
                        const resourceType = itemToDelete.type === 'video' ? 'video' : 'image';
                        // We attempt to delete but don't block DB deletion if it fails (or maybe we log it)
                        try {
                            await deleteFromCloudinary(publicId, resourceType);
                        } catch (cloudErr) {
                            console.error('Failed to delete from Cloudinary:', cloudErr);
                            // We continue to delete from DB even if Cloudinary fails
                        }
                    }
                }
            }

            if (isFirebaseReady()) {
                await deleteDocument(section, id);
                await loadAllData();
            } else {
                setData(prev => ({
                    ...prev,
                    [section]: prev[section].filter(item => item.id !== id)
                }));
            }
        } catch (err) {
            console.error('Delete error:', err);
            setError('Failed to delete. Please try again.');
        } finally {
            setIsDeleting(false);
            setDeletingItem(null);
        }
    };

    // --- Media Upload Logic (Hoisted) ---
    // Moved to top-level so MobileView can access it via props/actions if needed
    // or simply because the hidden input uses handleFileSelect which was scoped incorrectly.

    const handleImageUpload = async (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const imageUrl = await uploadToCloudinary(file, modalType);

            // Auto-detect size for Media items
            let detectedSize = null;
            if (modalType === 'media' && field === 'thumbnail') {
                await new Promise((resolve) => {
                    const img = new window.Image();
                    img.onload = () => {
                        const aspect = img.width / img.height;
                        if (aspect >= 1.75) detectedSize = 'wide'; // Landscape
                        else if (aspect <= 0.6) detectedSize = 'tall'; // Portrait
                        else detectedSize = 'standard'; // Square-ish
                        resolve();
                    };
                    img.src = imageUrl;
                });
            }

            setFormData(prev => ({
                ...prev,
                [field]: imageUrl,
                ...(detectedSize && { size: detectedSize })
            }));
        } catch (err) {
            console.error('Image upload error:', err);
            alert('Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    const handleBatchUpload = async (files) => {
        let successCount = 0;
        let errors = [];

        setMediaUploadError(null);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Size check
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} too large(max 50MB)`);
                continue;
            }

            setMediaUploadProgress({
                text: `Uploading ${i + 1}/${files.length}...`,
                percent: 0,
                fileName: file.name
            });

            try {
                // Determine file type
                const isVideo = file.type.startsWith('video/');
                const folder = 'media_gallery'; // Shared folder
                const uploadedUrl = await uploadToCloudinary(file, folder);

                // For current simplified media object
                let eventInfo = {};
                if (selectedMediaEvent) {
                    const evt = data.events.find(e => e.id === selectedMediaEvent);
                    if (evt) {
                        eventInfo = { eventId: evt.id, eventTitle: evt.title };
                    }
                }

                const newMedia = {
                    title: file.name.split('.')[0],
                    ...eventInfo, // Add event tag
                    type: isVideo ? 'video' : 'image',
                    url: uploadedUrl,
                    thumbnail: uploadedUrl, // Cloudinary can gen thumbs but for now use same URL for images
                    description: '',
                    duration: '',
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
                };

                // Add to DB
                if (isFirebaseReady()) {
                    await addDocument(COLLECTIONS.MEDIA, newMedia);
                } else {
                    setData(prev => ({
                        ...prev,
                        media: [...prev.media, { ...newMedia, id: Date.now().toString() + Math.random() }]
                    }));
                }
                successCount++;
            } catch (err) {
                console.error(`Upload error for ${file.name}:`, err);
                errors.push(`${file.name}: Upload failed`);
            }
        }

        // Final reload if using firebase
        if (isFirebaseReady() && successCount > 0) {
            await loadAllData();
        }

        setMediaUploadProgress(null);

        if (errors.length > 0) {
            setMediaUploadError(`Uploaded ${successCount}/${files.length}. Issues: ${errors.join('; ')}`);
        }
    };

    const handleFileSelect = async (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await handleBatchUpload(files);
        }
        // Reset input
        if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setMediaDragActive(true);
        } else if (e.type === 'dragleave') {
            setMediaDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMediaDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await handleBatchUpload(files);
        }
    };

    const extractYoutubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const handleYoutubeEmbed = async () => {
        const videoId = extractYoutubeId(youtubeUrl);
        if (!videoId) {
            setMediaUploadError('Invalid YouTube URL. Please paste a valid YouTube video link.');
            return;
        }

        const newMedia = {
            title: 'YouTube Video',
            ...(selectedMediaEvent ? {
                eventId: selectedMediaEvent,
                eventTitle: data.events.find(e => e.id === selectedMediaEvent)?.title
            } : {}),
            type: 'video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            youtubeId: videoId,
            description: '',
            duration: ''
        };

        try {
            if (isFirebaseReady()) {
                await addDocument(COLLECTIONS.MEDIA, newMedia);
                await loadAllData();
            } else {
                setData(prev => ({
                    ...prev,
                    media: [...prev.media, { ...newMedia, id: Date.now().toString() }]
                }));
            }
            setYoutubeUrl('');
            setShowYoutubeInput(false);
            setMediaUploadError(null);
        } catch (err) {
            console.error('Embed error:', err);
            setMediaUploadError('Failed to add video. Please try again.');
        }
    };


    // --- Classifieds Gallery Upload ---
    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setUploadingImage(true);
        try {
            // Upload all files in parallel
            const uploadPromises = files.map(file => uploadToCloudinary(file, 'classifieds'));
            const urls = await Promise.all(uploadPromises);

            setFormData(prev => ({
                ...prev,
                images: [...(prev.images || []), ...urls]
            }));
        } catch (err) {
            console.error('Gallery upload error:', err);
            setError('Failed to upload some images. Please try again.');
        } finally {
            setUploadingImage(false);
            // Reset input value to allow selecting same files again if needed
            e.target.value = '';
        }
    };




    // --- Mobile Detection & View ---
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const mobileActions = {
        openModal: (section, item) => openModal(section, item),
        deleteItem: (section, id) => {
            if (window.confirm('Are you sure you want to delete this item?')) {
                confirmDelete(section, id);
            }
        },
        navigate: (path) => navigate(path),
        triggerMediaUpload: () => mediaFileInputRef.current?.click()
    };

    const LoadingOverlay = () => (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ textAlign: 'center', background: '#18181b', padding: '32px', borderRadius: '16px', border: '1px solid #27272a' }}>
                <Loader2 size={40} style={{ color: '#ef4444', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                <p style={{ color: '#a1a1aa', marginTop: '16px', fontSize: '14px', fontWeight: 500 }}>Updating data...</p>
            </div>
        </div>
    );

    // Force return Mobile View if detected
    if (isMobile) {
        return (
            <>
                {loading && <LoadingOverlay />}
                <AdminMobileView
                    data={data}
                    onLogout={onLogout}
                    actions={mobileActions}
                    mediaState={{
                        progress: mediaUploadProgress,
                        error: mediaUploadError
                    }}
                    youtubeState={{
                        url: youtubeUrl,
                        setUrl: setYoutubeUrl,
                        showInput: showYoutubeInput,
                        setShowInput: setShowYoutubeInput,
                        handleEmbed: handleYoutubeEmbed
                    }}
                    eventTagState={{
                        selectedEvent: selectedMediaEvent,
                        setSelectedEvent: setSelectedMediaEvent,
                        events: data.events || []
                    }}
                />

                {/* Hidden Media Input for Mobile */}
                <input
                    ref={mediaFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {/* Modals for Mobile (Reusing existing modal logic/components via portal/overlay) */}
                <AnimatePresence>
                    {modalOpen && (
                        <div className="admin-modal-overlay" onClick={closeModal} style={{ zIndex: 200, position: 'fixed', padding: 0 }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="admin-modal mobile-modal-content"
                                onClick={e => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 0,
                                    maxHeight: 'none',
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: '#18181b', // Zinc 900
                                    color: 'white'
                                }}
                            >
                                <div className="admin-modal-header" style={{
                                    padding: '20px',
                                    borderBottom: '1px solid #27272a',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{editItem ? `Edit ${modalType.slice(0, -1)}` : `Add New ${modalType.slice(0, -1)}`}</h3>
                                    <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X size={24} /></button>
                                </div>
                                <div className="admin-modal-content" style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                }}>
                                    {modalType === 'events' && (
                                        <>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Title</label>
                                                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Description</label>
                                                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="admin-form-input" rows={3} style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white', resize: 'vertical' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Date</label>
                                                <input type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Location</label>
                                                <input type="text" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Type</label>
                                                    <select value={formData.type || 'Track Day'} onChange={e => setFormData({ ...formData, type: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}>
                                                        <option>Track Day</option>
                                                        <option>Race</option>
                                                        <option>Meetup</option>
                                                    </select>
                                                </div>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Slots</label>
                                                    <input type="text" value={formData.slots || ''} onChange={e => setFormData({ ...formData, slots: e.target.value })} placeholder="e.g., 15/40 or Free" className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                            </div>

                                            {/* Event Image Upload */}
                                            <div className="admin-form-group">
                                                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>
                                                    Event Image
                                                    <span style={{ fontSize: '11px', fontWeight: 'normal' }}>Rec: 1200x800px</span>
                                                </label>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <input type="text" value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="Image URL" style={{ flex: 1, padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                    <label style={{ cursor: 'pointer', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {uploadingImage ? <Loader2 size={18} className="spin" /> : <Upload size={18} color="white" />}
                                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                                {formData.image && (
                                                    <img src={formData.image} alt="Preview" style={{ marginTop: '12px', width: '100%', height: '140px', borderRadius: '8px', objectFit: 'cover' }} />
                                                )}
                                            </div>

                                            {/* Event Status */}
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Event Status</label>
                                                <select
                                                    value={formData.status || 'upcoming'}
                                                    onChange={e => {
                                                        const newStatus = e.target.value;
                                                        let newFormData = { ...formData, status: newStatus };

                                                        // Initialize results if switching to completed and empty
                                                        if (newStatus === 'completed' && !newFormData.classResults && formData.classes) {
                                                            const initialResults = {};
                                                            formData.classes.forEach(cls => {
                                                                if (cls.name) {
                                                                    initialResults[cls.name] = [{ pos: '1', driver: '', car: '', time: '' }];
                                                                }
                                                            });
                                                            newFormData.classResults = initialResults;
                                                        }
                                                        setFormData(newFormData);
                                                    }}
                                                    style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}
                                                >
                                                    <option value="upcoming">Upcoming</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>

                                            {/* Event Results - shown when status is completed */}
                                            {formData.status === 'completed' && (
                                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Trophy size={16} /> Event Results Summary
                                                    </h4>
                                                    <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                                                        <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Overall Winner</label>
                                                        <input type="text" value={formData.winner || ''} onChange={e => setFormData({ ...formData, winner: e.target.value })} placeholder="e.g. Alex M. (Porsche 911 GT3)" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                    </div>
                                                    <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                                                        <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Overall Fastest Lap</label>
                                                        <input type="text" value={formData.fastestLap || ''} onChange={e => setFormData({ ...formData, fastestLap: e.target.value })} placeholder="e.g. 1:14.200" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                    </div>
                                                    <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                                        <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Total No. of Racers</label>
                                                        <input type="text" value={formData.totalRacers || ''} onChange={e => setFormData({ ...formData, totalRacers: e.target.value })} placeholder="e.g. 42" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Class Leaderboards - mobile */}
                                            {formData.status === 'completed' && formData.classes && formData.classes.length > 0 && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#a1a1aa', marginBottom: '12px' }}>Class Leaderboards</h4>
                                                    {formData.classes.map((cls, clsIdx) => (
                                                        <div key={clsIdx} style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                                <span style={{ fontWeight: '700', color: '#22c55e', fontSize: '13px' }}>{cls.name || `Class ${clsIdx + 1}`}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const currentResults = { ...(formData.classResults || {}) };
                                                                        const classRows = [...(currentResults[cls.name] || [])];
                                                                        classRows.push({ pos: classRows.length + 1, driver: '', car: '', time: '' });
                                                                        currentResults[cls.name] = classRows;
                                                                        setFormData({ ...formData, classResults: currentResults });
                                                                    }}
                                                                    style={{ background: 'rgba(34, 197, 94, 0.1)', border: 'none', color: '#22c55e', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}
                                                                >
                                                                    + ADD ROW
                                                                </button>
                                                            </div>

                                                            {(formData.classResults?.[cls.name] || []).map((row, rowIdx) => (
                                                                <div key={rowIdx} style={{ background: '#18181b', padding: '12px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #3f3f46' }}>
                                                                    {/* Row 1: Position, Driver, and Delete */}
                                                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                                                                        <div style={{ width: '45px' }}>
                                                                            <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Pos</span>
                                                                            <input
                                                                                value={row.pos}
                                                                                onChange={e => {
                                                                                    const current = { ...(formData.classResults || {}) };
                                                                                    const rows = [...(current[cls.name] || [])];
                                                                                    rows[rowIdx] = { ...rows[rowIdx], pos: e.target.value };
                                                                                    current[cls.name] = rows;
                                                                                    setFormData({ ...formData, classResults: current });
                                                                                }}
                                                                                style={{ width: '100%', padding: '8px 0', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}
                                                                            />
                                                                        </div>
                                                                        <div style={{ flex: 1 }}>
                                                                            <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Driver Name</span>
                                                                            <input
                                                                                placeholder="e.g. Alex M."
                                                                                value={row.driver}
                                                                                onChange={e => {
                                                                                    const current = { ...(formData.classResults || {}) };
                                                                                    const rows = [...(current[cls.name] || [])];
                                                                                    rows[rowIdx] = { ...rows[rowIdx], driver: e.target.value };
                                                                                    current[cls.name] = rows;
                                                                                    setFormData({ ...formData, classResults: current });
                                                                                }}
                                                                                style={{ width: '100%', padding: '8px 10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: 'white', fontSize: '13px' }}
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const current = { ...(formData.classResults || {}) };
                                                                                const rows = [...(current[cls.name] || [])];
                                                                                rows.splice(rowIdx, 1);
                                                                                current[cls.name] = rows;
                                                                                setFormData({ ...formData, classResults: current });
                                                                            }}
                                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '6px', marginTop: '16px' }}
                                                                        >
                                                                            <X size={18} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Row 2: Car and Time */}
                                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                                        <div style={{ flex: 1.4 }}>
                                                                            <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Vehicle</span>
                                                                            <input
                                                                                placeholder="e.g. Porsche 911"
                                                                                value={row.car}
                                                                                onChange={e => {
                                                                                    const current = { ...(formData.classResults || {}) };
                                                                                    const rows = [...(current[cls.name] || [])];
                                                                                    rows[rowIdx] = { ...rows[rowIdx], car: e.target.value };
                                                                                    current[cls.name] = rows;
                                                                                    setFormData({ ...formData, classResults: current });
                                                                                }}
                                                                                style={{ width: '100%', padding: '8px 10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: 'white', fontSize: '13px' }}
                                                                            />
                                                                        </div>
                                                                        <div style={{ flex: 1 }}>
                                                                            <span style={{ fontSize: '9px', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Time / Gap</span>
                                                                            <input
                                                                                placeholder="e.g. 1:14.2"
                                                                                value={row.time}
                                                                                onChange={e => {
                                                                                    const current = { ...(formData.classResults || {}) };
                                                                                    const rows = [...(current[cls.name] || [])];
                                                                                    rows[rowIdx] = { ...rows[rowIdx], time: e.target.value };
                                                                                    current[cls.name] = rows;
                                                                                    setFormData({ ...formData, classResults: current });
                                                                                }}
                                                                                style={{ width: '100%', padding: '8px 10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: 'white', fontSize: '13px' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(formData.classResults?.[cls.name] || []).length === 0 && (
                                                                <p style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', fontStyle: 'italic' }}>No results added for this class.</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Event Classes Section */}
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>
                                                    Classes ({(formData.classes || []).length})
                                                </label>
                                                <p style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>
                                                    Add participation classes for this event (e.g., Street Class, GT3)
                                                </p>

                                                {/* Existing Classes */}
                                                {(formData.classes || []).map((cls, index) => (
                                                    <div key={index} style={{
                                                        background: '#18181b',
                                                        border: '1px solid #3f3f46',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        marginBottom: '10px'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                            <span style={{ fontWeight: '600', color: '#ef4444' }}>Class {index + 1}</span>
                                                            {formData.status !== 'completed' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...(formData.classes || [])];
                                                                        updated.splice(index, 1);
                                                                        setFormData({ ...formData, classes: updated });
                                                                    }}
                                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={cls.name || ''}
                                                            onChange={e => {
                                                                const updated = [...(formData.classes || [])];
                                                                updated[index] = { ...updated[index], name: e.target.value };
                                                                setFormData({ ...formData, classes: updated });
                                                            }}
                                                            placeholder="Class Name (e.g., Street Class)"
                                                            disabled={formData.status === 'completed'}
                                                            style={{ width: '100%', padding: '10px', background: formData.status === 'completed' ? '#18181b' : '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: formData.status === 'completed' ? '#a1a1aa' : 'white', marginBottom: '8px' }}
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
                                                            <textarea
                                                                value={cls.description || ''}
                                                                onChange={e => {
                                                                    const updated = [...(formData.classes || [])];
                                                                    updated[index] = { ...updated[index], description: e.target.value };
                                                                    setFormData({ ...formData, classes: updated });
                                                                }}
                                                                placeholder="Brief description..."
                                                                rows={2}
                                                                disabled={formData.status === 'completed'}
                                                                style={{ width: '100%', padding: '10px', background: formData.status === 'completed' ? '#18181b' : '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: formData.status === 'completed' ? '#a1a1aa' : 'white', resize: 'none' }}
                                                            />
                                                            <textarea
                                                                value={cls.requirements || ''}
                                                                onChange={e => {
                                                                    const updated = [...(formData.classes || [])];
                                                                    updated[index] = { ...updated[index], requirements: e.target.value };
                                                                    setFormData({ ...formData, classes: updated });
                                                                }}
                                                                placeholder="Requirements (e.g., Roll cage, 200TW tires)"
                                                                rows={2}
                                                                disabled={formData.status === 'completed'}
                                                                style={{ width: '100%', padding: '10px', background: formData.status === 'completed' ? '#18181b' : '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: formData.status === 'completed' ? '#a1a1aa' : 'white', resize: 'none' }}
                                                            />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={cls.price || ''}
                                                            onChange={e => {
                                                                const updated = [...(formData.classes || [])];
                                                                updated[index] = { ...updated[index], price: e.target.value };
                                                                setFormData({ ...formData, classes: updated });
                                                            }}
                                                            placeholder="Price (e.g., $299 or Free)"
                                                            disabled={formData.status === 'completed'}
                                                            style={{ width: '100%', padding: '10px', background: formData.status === 'completed' ? '#18181b' : '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: formData.status === 'completed' ? '#a1a1aa' : 'white' }}
                                                        />
                                                    </div>
                                                ))}

                                                {/* Add Class Button */}
                                                {formData.status !== 'completed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(formData.classes || []), { name: '', description: '', price: '', requirements: '' }];
                                                            setFormData({ ...formData, classes: updated });
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px',
                                                            background: 'transparent',
                                                            border: '1px dashed #3f3f46',
                                                            borderRadius: '8px',
                                                            color: '#a1a1aa',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        <Plus size={16} /> Add Class
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {modalType === 'media' && (
                                        <>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Title</label>
                                                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Type</label>
                                                    <select value={formData.type || 'image'} onChange={e => setFormData({ ...formData, type: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}>
                                                        <option value="image">Image</option>
                                                        <option value="video">Video</option>
                                                    </select>
                                                </div>

                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Event Tag</label>
                                                    <select
                                                        value={formData.eventId || ''}
                                                        onChange={e => {
                                                            const evtId = e.target.value;
                                                            const evt = data.events.find(ev => ev.id === evtId);
                                                            setFormData({
                                                                ...formData,
                                                                eventId: evtId,
                                                                eventTitle: evt ? evt.title : ''
                                                            });
                                                        }}
                                                        className="admin-form-input"
                                                        style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}
                                                    >
                                                        <option value="">-- General / No Event --</option>
                                                        {data.events.map(evt => (
                                                            <option key={evt.id} value={evt.id}>{evt.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Grid Size</label>
                                                    <select value={formData.size || 'standard'} onChange={e => setFormData({ ...formData, size: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}>
                                                        <option value="standard">Standard</option>
                                                        <option value="wide">Wide</option>
                                                        <option value="tall">Tall</option>
                                                        <option value="large">Large</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {formData.type === 'video' && (
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Duration</label>
                                                    <input type="text" value={formData.duration || ''} onChange={e => setFormData({ ...formData, duration: e.target.value })} placeholder="e.g. 4:32" className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                            )}
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Description</label>
                                                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="admin-form-input" rows={3} style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white', resize: 'none' }} />
                                            </div>
                                            {/* Mobile Image Upload Field */}
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Thumbnail / Image</label>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={formData.thumbnail || ''}
                                                        onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                                                        placeholder="Image URL"
                                                        style={{ flex: 1, padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}
                                                    />
                                                    <label style={{ cursor: 'pointer', margin: 0, padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {uploadingImage ? <Loader2 size={18} className="spin" /> : <Upload size={18} color="white" />}
                                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'thumbnail')} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                                {formData.thumbnail && (
                                                    <img src={formData.thumbnail} alt="Preview" style={{ marginTop: '12px', width: '100%', height: '160px', borderRadius: '8px', objectFit: 'cover' }} />
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {modalType === 'partners' && (
                                        <>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Name</label>
                                                <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="admin-form-input" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Description</label>
                                                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="admin-form-input" rows={4} style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white', resize: 'none' }} />
                                            </div>
                                        </>
                                    )}

                                    {modalType === 'press' && (
                                        <>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Article Title</label>
                                                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter article title" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Author / Media Outlet</label>
                                                <input type="text" value={formData.outlet || ''} onChange={e => setFormData({ ...formData, outlet: e.target.value })} placeholder="e.g. Evo India" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Date Published</label>
                                                <input type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>External URL</label>
                                                <input type="text" value={formData.url || ''} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                        </>
                                    )}

                                    {modalType === 'classifieds' && (
                                        <>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Title *</label>
                                                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., 2023 Porsche 911 GT3" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Make</label>
                                                    <input type="text" value={formData.make || ''} onChange={e => setFormData({ ...formData, make: e.target.value })} placeholder="e.g., Porsche" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Model</label>
                                                    <input type="text" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., 911 GT3" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Year</label>
                                                    <input type="number" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: e.target.value })} placeholder="e.g., 2023" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Price</label>
                                                    <input type="text" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="e.g., ₹1,85,00,000" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Mileage</label>
                                                    <input type="text" value={formData.mileage || ''} onChange={e => setFormData({ ...formData, mileage: e.target.value })} placeholder="e.g., 5,200 km" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Transmission</label>
                                                    <input type="text" value={formData.transmission || ''} onChange={e => setFormData({ ...formData, transmission: e.target.value })} placeholder="e.g., Manual, PDK" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Engine</label>
                                                    <input type="text" value={formData.engine || ''} onChange={e => setFormData({ ...formData, engine: e.target.value })} placeholder="e.g., 4.0L Flat-6" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                                <div className="admin-form-group">
                                                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Power</label>
                                                    <input type="text" value={formData.horsepower || ''} onChange={e => setFormData({ ...formData, horsepower: e.target.value })} placeholder="e.g., 502 hp" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                </div>
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Description</label>
                                                <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Detailed description..." style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white', resize: 'none' }} />
                                            </div>
                                            {/* Featured Image Upload */}
                                            <div className="admin-form-group">
                                                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>
                                                    Featured Image
                                                    <span style={{ fontSize: '11px', fontWeight: 'normal' }}>Rec: 1200x900px</span>
                                                </label>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <input type="text" value={formData.featuredImage || ''} onChange={e => setFormData({ ...formData, featuredImage: e.target.value })} placeholder="Image URL" style={{ flex: 1, padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                    <label style={{ cursor: 'pointer', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {uploadingImage ? <Loader2 size={18} className="spin" /> : <Upload size={18} color="white" />}
                                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'featuredImage')} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                                {formData.featuredImage && (
                                                    <img src={formData.featuredImage} alt="Preview" style={{ marginTop: '12px', width: '100%', height: '120px', borderRadius: '8px', objectFit: 'cover' }} />
                                                )}
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a1a1aa', fontSize: '14px' }}>
                                                    <input type="checkbox" checked={formData.isPublished !== false} onChange={e => setFormData({ ...formData, isPublished: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                                    Publish listing (visible to users)
                                                </label>
                                            </div>
                                        </>
                                    )}

                                    {modalType === 'documents' && (
                                        <>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Title</label>
                                                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Document Title" style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>Category</label>
                                                <select value={formData.category || 'Rules'} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }}>
                                                    <option value="Rules">Rules & Regulations</option>
                                                    <option value="Forms">Forms & Waivers</option>
                                                    <option value="Resources">Track Maps & Resources</option>
                                                </select>
                                            </div>
                                            <div className="admin-form-group">
                                                <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa', fontSize: '14px' }}>File Upload (PDF / Image)</label>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <input type="text" value={formData.fileUrl || ''} onChange={e => setFormData({ ...formData, fileUrl: e.target.value })} placeholder="File URL or upload" style={{ flex: 1, padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: 'white' }} />
                                                    <label style={{ cursor: 'pointer', padding: '12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {uploadingImage ? <Loader2 size={18} className="spin" /> : <Upload size={18} color="white" />}
                                                        <input type="file" accept=".pdf,image/*" onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            setUploadingImage(true);
                                                            try {
                                                                const url = await uploadFileToCloudinary(file, 'documents');
                                                                setFormData(prev => ({ ...prev, fileUrl: url }));
                                                            } catch (err) {
                                                                console.error('Upload failed', err);
                                                                alert('Upload failed: ' + err.message);
                                                            } finally {
                                                                setUploadingImage(false);
                                                            }
                                                        }} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                                {formData.fileUrl && (
                                                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <FileText size={14} />
                                                        File attached: {formData.fileUrl.split('/').pop()}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="admin-modal-footer" style={{
                                    padding: '20px',
                                    borderTop: '1px solid #27272a',
                                    display: 'flex',
                                    gap: '12px',
                                    justifyContent: 'flex-end',
                                    background: '#18181b'
                                }}>
                                    {editItem && (
                                        <button
                                            className="admin-btn admin-btn-danger"
                                            onClick={() => {
                                                const itemId = editItem.id;
                                                const section = modalType;
                                                closeModal();
                                                setTimeout(() => setDeletingItem({ section, id: itemId }), 200); // Small delay to allow modal transition
                                            }}
                                            style={{ marginRight: 'auto', padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button className="admin-btn" onClick={closeModal} style={{ padding: '12px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid #3f3f46', color: 'white' }}>Cancel</button>
                                    <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px 20px', borderRadius: '8px', background: '#ef4444', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </motion.div>
                        </div >
                    )}

                    {/* Driver Form Modal (inline in desktop, modal in mobile) */}
                    {
                        driverFormVisible && (
                            <div className="admin-modal-overlay" style={{ zIndex: 200, position: 'fixed' }}>
                                <div className="admin-modal" style={{ width: '100%', height: '100%', borderRadius: 0, margin: 0 }}>
                                    <div className="admin-modal-header">
                                        <h3>{editingDriverId ? 'Edit Driver' : 'New Driver'}</h3>
                                        <button onClick={() => setDriverFormVisible(false)}><X size={24} /></button>
                                    </div>
                                    <div className="admin-modal-content" style={{ padding: '20px' }}>
                                        {/* Reusing Driver Form Logic */}
                                        <div className="driver-form-image" onClick={() => driverImageRef.current?.click()} style={{ marginBottom: '20px', height: '200px' }}>
                                            {driverForm.image ? <img src={driverForm.image} alt="Driver" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /> : <div className="image-placeholder"><Upload size={28} /><span>Add Photo (400x400)</span></div>}
                                        </div>
                                        <input ref={driverImageRef} type="file" accept="image/*" onChange={handleDriverImageUpload} style={{ display: 'none' }} />

                                        <input className="admin-form-input" style={{ marginBottom: '12px' }} placeholder="Name" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} />
                                        <input className="admin-form-input" style={{ marginBottom: '12px' }} placeholder="Subtitle/Role" value={driverForm.subtitle} onChange={e => setDriverForm({ ...driverForm, subtitle: e.target.value })} />
                                        <select className="admin-form-input" style={{ marginBottom: '12px' }} value={driverForm.rank} onChange={e => setDriverForm({ ...driverForm, rank: e.target.value })}>
                                            <option>Platinum</option><option>Gold</option><option>Silver</option><option>Bronze</option><option>Legend</option>
                                        </select>
                                        <input className="admin-form-input" style={{ marginBottom: '12px' }} placeholder="Car" value={driverForm.car} onChange={e => setDriverForm({ ...driverForm, car: e.target.value })} />

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input className="admin-form-input" placeholder="Wins" type="number" value={driverForm.wins} onChange={e => setDriverForm({ ...driverForm, wins: parseInt(e.target.value) || 0 })} />
                                            <input className="admin-form-input" placeholder="Podiums" type="number" value={driverForm.podiums} onChange={e => setDriverForm({ ...driverForm, podiums: parseInt(e.target.value) || 0 })} />
                                            <input className="admin-form-input" placeholder="Fast Laps" type="number" value={driverForm.fastLaps} onChange={e => setDriverForm({ ...driverForm, fastLaps: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="admin-modal-footer">
                                        <button className="admin-btn admin-btn-secondary" onClick={() => setDriverFormVisible(false)}>Cancel</button>
                                        <button className="admin-btn admin-btn-primary" onClick={saveDriver} disabled={savingDriver}>
                                            {savingDriver ? 'Saving...' : 'Save Driver'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {/* Delete Confirmation Modal (Mobile) */}
                    {
                        deletingItem && (
                            <div className="admin-modal-overlay" onClick={() => setDeletingItem(null)} style={{ zIndex: 210, position: 'fixed' }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="admin-modal"
                                    onClick={e => e.stopPropagation()}
                                    style={{ width: '90%', maxWidth: '320px', borderRadius: '16px', margin: 'auto' }}
                                >
                                    <div className="admin-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                                        <h3>Confirm Delete</h3>
                                    </div>
                                    <div className="admin-modal-content" style={{ textAlign: 'center', padding: '24px 20px', color: '#a1a1aa' }}>
                                        Are you sure you want to delete this item? This action cannot be undone.
                                    </div>
                                    <div className="admin-modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                                        <button className="admin-btn admin-btn-secondary" onClick={() => setDeletingItem(null)}>Cancel</button>
                                        <button className="admin-btn admin-btn-danger" onClick={() => { confirmDelete(); setDeletingItem(null); }}>
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }
                </AnimatePresence >
            </>
        );
    }

    const renderDashboard = () => (
        <>
            {!isFirebaseReady() && (
                <div className="admin-card" style={{ background: 'rgba(255, 193, 7, 0.1)', borderColor: 'rgba(255, 193, 7, 0.3)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ffc107' }}>
                        <AlertCircle size={20} />
                        <span>Firebase not configured. Running in local mode - changes won't persist.</span>
                    </div>
                </div>
            )}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{data.events.length}</div>
                    <div className="admin-stat-label">Total Events</div>
                    <div className="admin-stat-icon"><Calendar size={24} /></div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-value">{data.media.length}</div>
                    <div className="admin-stat-label">Media Items</div>
                    <div className="admin-stat-icon"><Image size={24} /></div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{data.partners.length}</div>
                    <div className="admin-stat-label">Partners</div>
                    <div className="admin-stat-icon"><Handshake size={24} /></div>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3 className="admin-card-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {navItems.slice(1).map(item => (
                        <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="admin-btn admin-btn-secondary"
                            style={{ justifyContent: 'center', padding: '20px' }}
                            onClick={() => setActiveSection(item.id)}
                        >
                            <item.icon size={20} />
                            Manage {item.label}
                        </motion.button>
                    ))}
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3 className="admin-card-title">Recent Events</h3>
                    <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => setActiveSection('events')}>
                        View All <ChevronRight size={14} />
                    </button>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Date</th>
                            <th>Location</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.events.slice(0, 3).map(event => (
                            <tr key={event.id}>
                                <td>{event.title}</td>
                                <td>{event.date}</td>
                                <td>{event.location}</td>
                                <td><span className="admin-badge admin-badge-success">{event.type}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    const [eventTab, setEventTab] = useState('upcoming');

    const renderEvents = () => {
        const upcomingEvents = data.events.filter(e => e.status !== 'completed');
        const pastEvents = data.events.filter(e => e.status === 'completed');
        const displayEvents = eventTab === 'upcoming' ? upcomingEvents : pastEvents;

        return (
            <div className="admin-card">
                <div className="admin-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <h3 className="admin-card-title">Events Management</h3>
                        <div style={{ display: 'flex', background: 'var(--admin-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                            <button
                                onClick={() => setEventTab('upcoming')}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    background: eventTab === 'upcoming' ? 'var(--admin-surface)' : 'transparent',
                                    color: eventTab === 'upcoming' ? '#fff' : 'var(--admin-text-secondary)',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Upcoming
                            </button>
                            <button
                                onClick={() => setEventTab('past')}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    background: eventTab === 'past' ? 'var(--admin-surface)' : 'transparent',
                                    color: eventTab === 'past' ? '#fff' : 'var(--admin-text-secondary)',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Past / Completed
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="admin-btn admin-btn-secondary"
                            onClick={() => navigate('/admin/registrations')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <User size={18} /> View All Registrations
                        </button>
                        <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/events/new')}>
                            <Plus size={18} /> Add Event
                        </button>
                    </div>
                </div>

                {displayEvents.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-secondary)' }}>
                        <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>No {eventTab} events found.</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Track Name</th>
                                <th>Type</th>
                                <th>Status</th>
                                {eventTab === 'upcoming' && <th>Classes</th>}
                                {eventTab === 'past' && <th>Winner</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayEvents.map(event => (
                                <tr key={event.id}>
                                    <td><strong>{event.title}</strong></td>
                                    <td>{event.date}</td>
                                    <td>{event.trackName || '-'}</td>
                                    <td><span className="admin-badge admin-badge-success">{event.type}</span></td>
                                    <td>
                                        <select
                                            value={event.status || 'upcoming'}
                                            onChange={async (e) => {
                                                e.stopPropagation();
                                                const newStatus = e.target.value;
                                                if (newStatus === 'cancelled' && !window.confirm('Are you sure you want to cancel this event?')) return;

                                                try {
                                                    await updateDocument('events', event.id, { ...event, status: newStatus });
                                                    // Optimistic update
                                                    setData(prev => ({
                                                        ...prev,
                                                        events: prev.events.map(ev => ev.id === event.id ? { ...ev, status: newStatus } : ev)
                                                    }));
                                                } catch (err) {
                                                    console.error('Failed to update status', err);
                                                    alert('Failed to update status');
                                                }
                                            }}
                                            className="admin-form-select"
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                width: 'auto',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: event.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : event.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                color: event.status === 'completed' ? '#22c55e' : event.status === 'cancelled' ? '#ef4444' : '#3b82f6',
                                                borderRadius: '4px',
                                                outline: 'none'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="upcoming" style={{ background: '#18181b', color: '#fff' }}>Upcoming</option>
                                            <option value="completed" style={{ background: '#18181b', color: '#22c55e' }}>Completed</option>
                                            <option value="cancelled" style={{ background: '#18181b', color: '#ef4444' }}>Cancelled</option>
                                        </select>
                                    </td>
                                    {eventTab === 'upcoming' && <td>{event.classes?.length || 0}</td>}
                                    {eventTab === 'past' && <td>{event.winner || '-'}</td>}
                                    <td className="admin-table-actions">
                                        {deletingItem?.section === 'events' && deletingItem?.id === event.id ? (
                                            <>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDelete();
                                                    }}
                                                >
                                                    Confirm
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                                    onClick={() => navigate(eventTab === 'past' ? `/admin/events/results/${event.id}` : `/admin/events/edit/${event.id}`)}
                                                    title={eventTab === 'past' ? "Edit Results" : "Edit Event Details"}
                                                >
                                                    {eventTab === 'past' ? <Trophy size={14} /> : <Edit2 size={14} />}
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem({ section: 'events', id: event.id });
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };



    const renderMedia = () => {
        // Functions hoisted to top-level for Mobile compatibility
        return (
            <div className="admin-card">
                <div className="admin-card-header">
                    <h3 className="admin-card-title">Media Gallery</h3>
                </div>

                {/* Event Tag Selector */}
                <div style={{ marginBottom: '20px', padding: '0 5px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>
                        Tag Uploads with Event (Optional)
                    </label>
                    <select
                        value={selectedMediaEvent}
                        onChange={(e) => setSelectedMediaEvent(e.target.value)}
                        className="admin-form-input"
                        style={{ maxWidth: '400px' }}
                    >
                        <option value="">-- General / No Event --</option>
                        {data.events.map(evt => (
                            <option key={evt.id} value={evt.id}>{evt.title}</option>
                        ))}
                    </select>
                </div>

                {/* Upload Zone */}
                <div
                    className={`media-upload-zone ${mediaDragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => mediaFileInputRef.current?.click()}
                >
                    <input
                        ref={mediaFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    {mediaUploadProgress !== null ? (
                        <div className="upload-progress">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px', fontSize: '13px' }}>
                                <span>{mediaUploadProgress.text}</span>
                                <span>{mediaUploadProgress.percent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${mediaUploadProgress.percent}%`,
                                    height: '100%',
                                    background: 'var(--admin-primary)',
                                    transition: 'width 0.2s ease'
                                }} />
                            </div>
                            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>{mediaUploadProgress.fileName}</p>
                        </div>

                    ) : (
                        <>
                            <Upload size={40} />
                            <h4>Drop files here or click to upload</h4>
                            <p>Images and videos up to 50MB</p>
                        </>
                    )}
                </div>

                {/* Error Message */}
                {
                    mediaUploadError && (
                        <div className="upload-error">
                            <AlertCircle size={18} />
                            <span>{mediaUploadError}</span>
                        </div>
                    )
                }

                {/* YouTube Embed Option */}
                <div className="youtube-embed-section">
                    <button
                        className="admin-btn admin-btn-secondary"
                        onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                        style={{ width: '100%', justifyContent: 'center', marginBottom: showYoutubeInput ? '12px' : 0 }}
                    >
                        Or embed a YouTube video
                    </button>

                    {showYoutubeInput && (
                        <div className="youtube-input-row">
                            <input
                                type="text"
                                className="admin-form-input"
                                placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                            />
                            <button
                                className="admin-btn admin-btn-primary"
                                onClick={handleYoutubeEmbed}
                                disabled={!youtubeUrl}
                            >
                                Add Video
                            </button>
                        </div>
                    )}
                </div>

                <div className="media-grid-container" style={{ marginTop: '24px' }}>
                    {data.media.map(item => (
                        <div key={item.id} className="media-item-card">
                            <div className="media-item-visual">
                                <img src={item.thumbnail || '/placeholder.svg'} alt={item.title} />
                                {item.youtubeId && <div className="media-type-badge">Video</div>}
                                {!item.youtubeId && <div className="media-type-badge">Image</div>}

                                <div className="media-item-overlay">
                                    <div className="media-overlay-actions">
                                        {deletingItem?.section === 'media' && deletingItem?.id === item.id ? (
                                            <div className="media-delete-confirm">
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDelete();
                                                    }}
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                            <span>Deleting...</span>
                                                        </div>
                                                    ) : (
                                                        'Confirm'
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => openModal('media', item)} title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem({ section: 'media', id: item.id });
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="media-overlay-info">
                                        {item.duration && <span className="media-meta">{item.duration}</span>}
                                        <span className="media-meta">{new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <style>{`
                    .media-upload-zone {
                        border: 2px dashed var(--admin-border);
                        border-radius: 12px;
                        padding: 40px 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: var(--admin-surface-hover);
                        color: var(--admin-text-secondary);
                    }

                    .media-upload-zone:hover,
                    .media-upload-zone.drag-active {
                        border-color: var(--admin-primary);
                        background: rgba(255, 42, 42, 0.05);
                        color: var(--admin-primary);
                    }

                    .media-upload-zone h4 {
                        margin: 16px 0 8px 0;
                        color: var(--admin-text);
                        font-size: 16px;
                    }

                    .media-upload-zone p {
                        margin: 0;
                        font-size: 13px;
                    }

                    .upload-progress {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 12px;
                        color: var(--admin-primary);
                    }

                    .upload-error {
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                        padding: 14px 16px;
                        margin-top: 16px;
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius: 8px;
                        color: var(--admin-danger);
                        font-size: 13px;
                        line-height: 1.5;
                    }

                    .upload-error svg {
                        flex-shrink: 0;
                        margin-top: 2px;
                    }

                    .youtube-embed-section {
                        margin-top: 16px;
                    }

                    .youtube-input-row {
                        display: flex;
                        gap: 12px;
                    }

                    .youtube-input-row input {
                        flex: 1;
                    }

                    .media-thumbnail {
                        position: relative;
                    }

                    .play-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0, 0, 0, 0.4);
                    }

                    .play-icon {
                        width: 48px;
                        height: 48px;
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        color: #333;
                        padding-left: 4px;
                    }

                    @media (max-width: 640px) {
                        .media-upload-zone {
                            padding: 24px 16px;
                        }

                        .youtube-input-row {
                            flex-direction: column;
                        }
                    }
                `}</style>
            </div >
        );
    };

    const renderDocuments = () => (
        <div className="admin-card">
            <div className="admin-card-header">
                <h3 className="admin-card-title">Rules & Resources</h3>
                <button className="admin-btn admin-btn-primary" onClick={() => openModal('documents')}>
                    <Plus size={18} /> Add Document
                </button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>File</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.documents || []).map(doc => (
                        <tr key={doc.id}>
                            <td><strong>{doc.title}</strong></td>
                            <td><span className="admin-badge">{doc.category}</span></td>
                            <td>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--admin-primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileText size={14} /> View File
                                </a>
                            </td>
                            <td className="admin-table-actions">
                                {deletingItem?.section === 'documents' && deletingItem?.id === doc.id ? (
                                    <>
                                        <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => setDeletingItem(null)}>Cancel</button>
                                        <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={confirmDelete}>Confirm</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openModal('documents', doc)}><Edit2 size={14} /></button>
                                        <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => setDeletingItem({ section: 'documents', id: doc.id })}><Trash2 size={14} /></button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {(!data.documents || data.documents.length === 0) && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-secondary)' }}>
                    No documents uploaded yet.
                </div>
            )}
        </div>
    );

    const renderPartners = () => (
        <div className="admin-card">
            <div className="admin-card-header">
                <h3 className="admin-card-title">Partners & Sponsors</h3>
                <button className="admin-btn admin-btn-primary" onClick={() => openModal('partners')}>
                    <Plus size={18} /> Add Partner
                </button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Partner</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.partners.map(partner => (
                        <tr key={partner.id} style={{ position: 'relative' }}>
                            <td><strong>{partner.name}</strong></td>
                            <td>{partner.description}</td>
                            <td className="admin-table-actions">
                                {deletingItem?.section === 'partners' && deletingItem?.id === partner.id ? (
                                    <>
                                        <button
                                            className="admin-btn admin-btn-sm admin-btn-secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingItem(null);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-sm admin-btn-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete();
                                            }}
                                        >
                                            Confirm
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openModal('partners', partner)}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-sm admin-btn-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingItem({ section: 'partners', id: partner.id });
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderClassifieds = () => (
        <div className="admin-card">
            <div className="admin-card-header">
                <h3 className="admin-card-title">Car Listings</h3>
                <button className="admin-btn admin-btn-primary" onClick={() => openModal('classifieds')}>
                    <Plus size={18} /> Add Listing
                </button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Price</th>
                        <th>Year</th>
                        <th>Transmission</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.classifieds || []).map(listing => (
                        <tr key={listing.id} style={{ position: 'relative' }}>
                            <td>
                                {listing.featuredImage ? (
                                    <img src={listing.featuredImage} alt={listing.title} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                ) : (
                                    <div style={{ width: '60px', height: '40px', background: '#27272a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Car size={20} style={{ color: '#71717a' }} />
                                    </div>
                                )}
                            </td>
                            <td><span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a1a1aa' }}>{listing.listingId || '-'}</span></td>
                            <td><strong>{listing.title}</strong></td>
                            <td>{listing.price || 'Contact'}</td>
                            <td>{listing.year || '-'}</td>
                            <td>{listing.transmission || '-'}</td>
                            <td>
                                <span style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    fontWeight: '600',
                                    background: (listing.status === 'published' || (listing.isPublished !== false && !listing.status)) ? 'rgba(34, 197, 94, 0.2)' :
                                        (listing.status === 'pending_payment' || listing.status === 'pending') ? 'rgba(234, 179, 8, 0.2)' :
                                            (listing.status === 'sold') ? 'rgba(59, 130, 246, 0.2)' :
                                                'rgba(113, 113, 122, 0.2)', // draft or unknown
                                    color: (listing.status === 'published' || (listing.isPublished !== false && !listing.status)) ? '#22c55e' :
                                        (listing.status === 'pending_payment' || listing.status === 'pending') ? '#eab308' :
                                            (listing.status === 'sold') ? '#3b82f6' :
                                                '#a1a1aa'
                                }}>
                                    {listing.status ? listing.status.replace('_', ' ') : (listing.isPublished !== false ? 'Published' : 'Draft')}
                                </span>
                            </td>
                            <td className="admin-table-actions">
                                {deletingItem?.section === 'classifieds' && deletingItem?.id === listing.id ? (
                                    <>
                                        <button
                                            className="admin-btn admin-btn-sm admin-btn-secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingItem(null);
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-sm admin-btn-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete();
                                            }}
                                        >
                                            Confirm
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openModal('classifieds', listing)}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="admin-btn admin-btn-sm admin-btn-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingItem({ section: 'classifieds', id: listing.id });
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {(!data.classifieds || data.classifieds.length === 0) && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                    <Car size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No car listings yet. Click "Add Listing" to create one.</p>
                </div>
            )}
        </div>
    );

    const renderBlogs = () => (
        <div className="admin-card">
            <div className="admin-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <h3 className="admin-card-title">Newsletter & Press</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {newsletterTab === 'newsletter' && (
                            <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/newsletter/new')}>
                                <Plus size={18} /> New Post
                            </button>
                        )}
                        {newsletterTab === 'press' && (
                            <button className="admin-btn admin-btn-primary" onClick={() => openModal('press')}>
                                <Plus size={18} /> Add Link
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={() => setNewsletterTab('newsletter')}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: newsletterTab === 'newsletter' ? '#ef4444' : 'transparent',
                            color: newsletterTab === 'newsletter' ? 'white' : 'rgba(255,255,255,0.6)',
                            boxShadow: newsletterTab === 'newsletter' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        Newsletter
                    </button>
                    <button
                        onClick={() => setNewsletterTab('press')}
                        style={{
                            padding: '8px 24px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: newsletterTab === 'press' ? '#ef4444' : 'transparent',
                            color: newsletterTab === 'press' ? 'white' : 'rgba(255,255,255,0.6)',
                            boxShadow: newsletterTab === 'press' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        Press & External
                    </button>
                </div>
            </div>

            {newsletterTab === 'newsletter' && (
                <>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Author</th>
                                <th>Category</th>
                                <th>Published</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.blogs || []).map(blog => (
                                <tr
                                    key={blog.id}
                                    onClick={(e) => {
                                        if (deletingItem?.section === 'blogs' && deletingItem?.id === blog.id) return;
                                        navigate(`/admin/newsletter/edit/${blog.id}`);
                                    }}
                                    style={{ cursor: 'pointer', position: 'relative' }}
                                    className="clickable-row"
                                >
                                    <td><strong>{blog.title}</strong></td>
                                    <td>{blog.author}</td>
                                    <td>
                                        <span className="admin-badge">{blog.category}</span>
                                    </td>
                                    <td>{blog.publishedAt}</td>
                                    <td className="admin-table-actions">
                                        {deletingItem?.section === 'blogs' && deletingItem?.id === blog.id ? (
                                            <>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDelete();
                                                    }}
                                                >
                                                    Confirm
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="admin-btn admin-btn-sm admin-btn-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingItem({ section: 'blogs', id: blog.id });
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data.blogs || data.blogs.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-secondary)' }}>
                            No newsletter posts yet. Click "New Post" to create one.
                        </div>
                    )}
                </>
            )}

            {newsletterTab === 'press' && (
                <>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Outlet</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.press || []).map(item => (
                                <tr key={item.id} style={{ position: 'relative' }}>
                                    <td><strong>{item.title}</strong></td>
                                    <td>
                                        <span className="admin-badge">{item.outlet}</span>
                                    </td>
                                    <td>{item.date}</td>
                                    <td className="admin-table-actions">
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-sm admin-btn-secondary" title="View Link">
                                            <LinkIcon size={14} />
                                        </a>
                                        {deletingItem?.section === 'press' && deletingItem?.id === item.id ? (
                                            <>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDelete();
                                                    }}
                                                >
                                                    Confirm
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="admin-btn admin-btn-sm admin-btn-secondary" onClick={() => openModal('press', item)}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-sm admin-btn-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem({ section: 'press', id: item.id });
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data.press || data.press.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-secondary)' }}>
                            No press links added yet.
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const renderImageUploadField = (label, field, currentValue) => {
        let instruction = '';
        if (modalType !== 'media') {
            if (field === 'image') instruction = 'Rec: 1200x800px (Max 5MB)';
            else if (field === 'coverImage') instruction = 'Rec: 1920x1080px (Max 5MB)';
            else if (field === 'logo') instruction = 'Rec: 400px PNG (Max 2MB)';
            else if (field === 'featuredImage' || field === 'images') instruction = 'Rec: 1200x900px (Max 5MB)';
            else instruction = 'Max 5MB';
        }

        return (
            <div className="admin-form-group">
                <label className="admin-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {label}
                    {instruction && <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 'normal' }}>{instruction}</span>}
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="admin-form-input"
                        value={currentValue || ''}
                        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                        placeholder="Image URL or upload below"
                        style={{ flex: 1 }}
                    />
                    <label className="admin-btn admin-btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        {uploadingImage ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, field)} style={{ display: 'none' }} />
                    </label>
                </div>
                {currentValue && (
                    <img src={currentValue} alt="Preview" style={{ marginTop: '8px', maxWidth: '200px', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' }} />
                )}
            </div>
        );
    };

    const renderModalContent = () => {
        switch (modalType) {
            case 'events':
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', alignItems: 'start' }}>
                        {/* Left Column: Basics */}
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>
                                Event Details
                            </h3>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Event Title</label>
                                <input type="text" className="admin-form-input" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter event title" />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Description</label>
                                <textarea className="admin-form-textarea" rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Event description..." />
                            </div>
                            <div className="admin-form-row">
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Date</label>
                                    <input type="date" className="admin-form-input" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Type</label>
                                    <select className="admin-form-select" value={formData.type || 'Track Day'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="Track Day">Track Day</option>
                                        <option value="Race">Race</option>
                                        <option value="Meetup">Meetup</option>
                                    </select>
                                </div>
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-form-label">Location</label>
                                <input type="text" className="admin-form-input" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Enter location" />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Slots</label>
                                <input type="text" className="admin-form-input" value={formData.slots || ''} onChange={(e) => setFormData({ ...formData, slots: e.target.value })} placeholder="e.g., 15/40 or Free" />
                            </div>
                            {renderImageUploadField('Event Image', 'image', formData.image)}

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

                            {formData.status === 'completed' && (
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '8px', marginTop: '15px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e', marginBottom: '10px' }}>Event Results</h4>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Winner</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={formData.winner || ''}
                                            onChange={(e) => setFormData({ ...formData, winner: e.target.value })}
                                            placeholder="e.g. Alex M. (Porsche 911 GT3)"
                                        />
                                    </div>
                                    <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                        <label className="admin-form-label">Fastest Lap</label>
                                        <input
                                            type="text"
                                            className="admin-form-input"
                                            value={formData.fastestLap || ''}
                                            onChange={(e) => setFormData({ ...formData, fastestLap: e.target.value })}
                                            placeholder="e.g. 1:14.200"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Classes */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '10px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--admin-text)' }}>
                                    Participation Classes ({(formData.classes || []).length})
                                </h3>
                                {formData.status !== 'completed' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = [...(formData.classes || []), { name: '', description: '', price: '', requirements: '' }];
                                            setFormData({ ...formData, classes: updated });
                                        }}
                                        className="admin-btn admin-btn-sm admin-btn-secondary"
                                    >
                                        <Plus size={14} /> Add Class
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
                                {(formData.classes || []).map((cls, index) => (
                                    <div key={index} style={{
                                        background: 'var(--admin-surface)',
                                        border: '1px solid var(--admin-border)',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        position: 'relative'
                                    }}>
                                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                                            {formData.status !== 'completed' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...(formData.classes || [])];
                                                        updated.splice(index, 1);
                                                        setFormData({ ...formData, classes: updated });
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                    title="Remove Class"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <h4 style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700' }}>
                                            Class {index + 1}
                                        </h4>

                                        <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                                            <input
                                                type="text"
                                                className="admin-form-input"
                                                value={cls.name || ''}
                                                onChange={e => {
                                                    const updated = [...(formData.classes || [])];
                                                    updated[index] = { ...updated[index], name: e.target.value };
                                                    setFormData({ ...formData, classes: updated });
                                                }}
                                                placeholder="Class Name (e.g., GT3 Cup)"
                                                style={{ fontWeight: '600' }}
                                                disabled={formData.status === 'completed'}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                                <input
                                                    type="text"
                                                    className="admin-form-input"
                                                    value={cls.price || ''}
                                                    onChange={e => {
                                                        const updated = [...(formData.classes || [])];
                                                        updated[index] = { ...updated[index], price: e.target.value };
                                                        setFormData({ ...formData, classes: updated });
                                                    }}
                                                    placeholder="Price (e.g., $299)"
                                                    disabled={formData.status === 'completed'}
                                                />
                                            </div>
                                        </div>

                                        <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                                            <textarea
                                                className="admin-form-textarea"
                                                value={cls.description || ''}
                                                onChange={e => {
                                                    const updated = [...(formData.classes || [])];
                                                    updated[index] = { ...updated[index], description: e.target.value };
                                                    setFormData({ ...formData, classes: updated });
                                                }}
                                                placeholder="Brief description of the class..."
                                                rows={2}
                                                style={{ minHeight: '60px', fontSize: '13px' }}
                                                disabled={formData.status === 'completed'}
                                            />
                                        </div>

                                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                            <textarea
                                                className="admin-form-textarea"
                                                value={cls.requirements || ''}
                                                onChange={e => {
                                                    const updated = [...(formData.classes || [])];
                                                    updated[index] = { ...updated[index], requirements: e.target.value };
                                                    setFormData({ ...formData, classes: updated });
                                                }}
                                                placeholder="Requirements / Rules (e.g., Roll cage required, 200TW tires)"
                                                rows={3}
                                                style={{ minHeight: '80px', fontSize: '13px', background: 'rgba(0,0,0,0.2)' }}
                                                disabled={formData.status === 'completed'}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {(formData.classes || []).length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-secondary)', border: '2px dashed var(--admin-border)', borderRadius: '10px' }}>
                                        <p>No classes added yet.</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = [...(formData.classes || []), { name: '', description: '', price: '', requirements: '' }];
                                                setFormData({ ...formData, classes: updated });
                                            }}
                                            style={{ marginTop: '10px', color: 'var(--admin-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Add First Class
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'media':
                return (
                    <>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Title</label>
                            <input type="text" className="admin-form-input" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter media title" />
                        </div>
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Type</label>
                                <select className="admin-form-select" value={formData.type || 'image'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Grid Size</label>
                                <select className="admin-form-select" value={formData.size || 'standard'} onChange={(e) => setFormData({ ...formData, size: e.target.value })}>
                                    <option value="standard">Standard (1x1)</option>
                                    <option value="wide">Wide (2x1)</option>
                                    <option value="tall">Tall (1x2)</option>
                                    <option value="large">Large (2x2)</option>
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Event Tag</label>
                                <select className="admin-form-select" value={formData.eventId || ''} onChange={(e) => {
                                    const evtId = e.target.value;
                                    const evt = data.events.find(ev => ev.id === evtId);
                                    setFormData({
                                        ...formData,
                                        eventId: evtId,
                                        eventTitle: evt ? evt.title : ''
                                    });
                                }}>
                                    <option value="">-- General / No Event --</option>
                                    {data.events.map(evt => (
                                        <option key={evt.id} value={evt.id}>{evt.title}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.type === 'video' && (
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Duration</label>
                                    <input type="text" className="admin-form-input" value={formData.duration || ''} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="e.g., 4:32" />
                                </div>
                            )}
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Description</label>
                            <textarea className="admin-form-textarea" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter description" />
                        </div>
                        {renderImageUploadField('Thumbnail', 'thumbnail', formData.thumbnail)}
                    </>
                );
            case 'partners':
                return (
                    <>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Partner Name</label>
                            <input type="text" className="admin-form-input" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter partner name" />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Description</label>
                            <textarea className="admin-form-textarea" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter partnership description" />
                        </div>
                        {renderImageUploadField('Logo', 'logo', formData.logo)}
                    </>
                );
            case 'documents':
                return (
                    <>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Title</label>
                            <input type="text" className="admin-form-input" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Document Title" />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Category</label>
                            <select className="admin-form-select" value={formData.category || 'Rules'} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                <option value="Rules">Rules & Regulations</option>
                                <option value="Forms">Forms & Waivers</option>
                                <option value="Resources">Track Maps & Resources</option>
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">File Upload (PDF / Image)</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className="admin-form-input"
                                    value={formData.fileUrl || ''}
                                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                    placeholder="File URL or upload"
                                    style={{ flex: 1 }}
                                />
                                <label className="admin-btn admin-btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                                    {uploadingImage ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setUploadingImage(true);
                                            try {
                                                const url = await uploadFileToCloudinary(file, 'documents');
                                                setFormData(prev => ({ ...prev, fileUrl: url }));
                                            } catch (err) {
                                                console.error('Upload failed', err);
                                                alert('Upload failed: ' + err.message);
                                            } finally {
                                                setUploadingImage(false);
                                            }
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                            {formData.fileUrl && (
                                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--admin-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileText size={14} />
                                    File attached: {formData.fileUrl.split('/').pop()}
                                </div>
                            )}
                        </div>
                    </>
                );
            case 'blogs':
                return (
                    <BlogEditor
                        blog={formData}
                        onChange={(updated) => setFormData(updated)}
                    />
                );
            case 'classifieds':
                return (
                    <>
                        {formData.listingId && (
                            <div className="admin-form-group" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--admin-border)' }}>
                                <label className="admin-form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Listing ID</label>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#ef4444', letterSpacing: '1px' }}>{formData.listingId}</div>
                            </div>
                        )}

                        <div className="admin-form-group">
                            <label className="admin-form-label">Status</label>
                            <select
                                className="admin-form-input"
                                value={formData.status || 'pending'}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setFormData({
                                        ...formData,
                                        status: newStatus,
                                        isPublished: newStatus === 'published'
                                    });
                                }}
                                style={{ background: 'var(--admin-surface)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
                            >
                                <option value="pending">Pending Review</option>
                                <option value="pending_payment">Pending Payment</option>
                                <option value="published">Published</option>
                                <option value="sold">Sold</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-form-label">Title *</label>
                            <input type="text" className="admin-form-input" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., 2023 Porsche 911 GT3" />
                        </div>
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Make</label>
                                <input type="text" className="admin-form-input" value={formData.make || ''} onChange={(e) => setFormData({ ...formData, make: e.target.value })} placeholder="e.g., Porsche" />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Model</label>
                                <input type="text" className="admin-form-input" value={formData.model || ''} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="e.g., 911 GT3" />
                            </div>
                        </div>
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Year</label>
                                <input type="number" className="admin-form-input" value={formData.year || ''} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="e.g., 2023" />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Price</label>
                                <input type="text" className="admin-form-input" value={formData.price || ''} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="e.g., ₹1,85,00,000" />
                            </div>
                        </div>
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Mileage</label>
                                <input type="text" className="admin-form-input" value={formData.mileage || ''} onChange={(e) => setFormData({ ...formData, mileage: e.target.value })} placeholder="e.g., 5,200 km" />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Transmission</label>
                                <input type="text" className="admin-form-input" value={formData.transmission || ''} onChange={(e) => setFormData({ ...formData, transmission: e.target.value })} placeholder="e.g., Manual, PDK, Automatic" />
                            </div>
                        </div>
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Engine</label>
                                <input type="text" className="admin-form-input" value={formData.engine || ''} onChange={(e) => setFormData({ ...formData, engine: e.target.value })} placeholder="e.g., 4.0L Flat-6" />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Power</label>
                                <input type="text" className="admin-form-input" value={formData.horsepower || ''} onChange={(e) => setFormData({ ...formData, horsepower: e.target.value })} placeholder="e.g., 502 hp" />
                            </div>
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Description</label>
                            <textarea className="admin-form-input" rows={4} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detailed description of the car..." />
                        </div>
                        {renderImageUploadField('Featured Image', 'featuredImage', formData.featuredImage)}

                        <div className="admin-form-group">
                            <label className="admin-form-label">Gallery Images</label>
                            <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '12px' }}>
                                Add multiple images for the gallery. First image will be used if Featured Image is not set.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                                {(formData.images || []).map((img, index) => (
                                    <div key={index} style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                                        <img src={img} alt={`Gallery ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newImages = [...formData.images];
                                                newImages.splice(index, 1);
                                                setFormData({ ...formData, images: newImages });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                background: 'rgba(0,0,0,0.6)',
                                                border: 'none',
                                                color: 'white',
                                                borderRadius: '4px',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                <label style={{
                                    border: '2px dashed var(--admin-border)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    minHeight: '100px',
                                    background: 'var(--admin-surface)',
                                    transition: 'all 0.2s'
                                }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleGalleryUpload}
                                        style={{ display: 'none' }}
                                    />
                                    {uploadingImage ? (
                                        <Loader2 className="spin" size={24} style={{ color: 'var(--admin-text-secondary)' }} />
                                    ) : (
                                        <>
                                            <Plus size={24} style={{ color: 'var(--admin-text-secondary)', marginBottom: '4px' }} />
                                            <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>Add Images</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isPublished !== false}
                                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                Publish listing (visible to users)
                            </label>
                        </div>
                    </>
                );
            case 'press':
                return (
                    <>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Article Title</label>
                            <input type="text" className="admin-form-input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Enter article title" />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Author / Media Outlet</label>
                            <input type="text" className="admin-form-input" value={formData.outlet || ''} onChange={e => setFormData({ ...formData, outlet: e.target.value })} placeholder="e.g. Evo India" />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Date Published</label>
                            <input type="date" className="admin-form-input" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">External URL</label>
                            <input type="text" className="admin-form-input" value={formData.url || ''} onChange={e => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." />
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="admin-dashboard">
            {loading && <LoadingOverlay />}
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <div className="admin-sidebar-logo" style={{ background: 'transparent', width: 'auto', height: 'auto', padding: 0 }}>
                        <img src={logoWhite} alt="Trackmeisters" style={{ height: '48px' }} />
                    </div>
                    <div>
                        <h2>Admin Panel</h2>
                        <span>Trackmeisters</span>
                    </div>
                    <button
                        className="admin-sidebar-close"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="admin-nav">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`admin-nav-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <item.icon size={18} className="icon" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <button className="admin-logout-btn" onClick={onLogout}>
                    <LogOut size={18} />
                    Logout
                </button>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-header">
                    <h1>{getSectionTitle()}</h1>
                    {isFirebaseReady() && (
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', background: '#4caf50', borderRadius: '50%' }}></span>
                            Connected to Firebase
                        </span>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeSection === 'dashboard' && renderDashboard()}
                        {activeSection === 'events' && renderEvents()}

                        {activeSection === 'media' && renderMedia()}
                        {activeSection === 'blogs' && renderBlogs()}
                        {activeSection === 'partners' && renderPartners()}
                        {activeSection === 'classifieds' && renderClassifieds()}
                        {activeSection === 'documents' && renderDocuments()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        className="admin-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                    >
                        <motion.div
                            className="admin-modal"
                            style={{ maxWidth: modalType === 'events' ? '1100px' : '600px' }}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="admin-modal-header">
                                <h2>{editItem ? 'Edit' : 'Add New'} {modalType.charAt(0).toUpperCase() + modalType.slice(1, -1)}</h2>
                                <button className="admin-modal-close" onClick={closeModal}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="admin-modal-body">
                                {error && (
                                    <div style={{ padding: '12px', marginBottom: '16px', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', borderRadius: '8px', color: '#f44336', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}
                                {renderModalContent()}
                            </div>
                            <div className="admin-modal-footer">
                                <button className="admin-btn admin-btn-secondary" onClick={closeModal}>Cancel</button>
                                <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
