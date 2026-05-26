import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Image, Film, ExternalLink, Grid, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMedia, useEvents, getImageUrl } from '../hooks/useFirebase';
import '../styles/media.scss';

const Media = () => {
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedEventId, setSelectedEventId] = useState('all');
    const { data: dbMedia, loading, error } = useMedia();
    const { data: dbEvents } = useEvents();

    // --- DATA LOGIC ---
    // Map database media
    const mediaItems = (dbMedia || []).map((m, index) => ({
        id: m.id,
        eventId: m.eventId,
        title: m.title,
        type: m.type,
        thumbnail: getImageUrl(m.thumbnail),
        url: m.url,
        youtubeId: m.youtubeId,
        description: m.description,
        duration: m.duration,
        size: 'square' // Enforce square
    }));

    const filteredItems = mediaItems.filter(item => {
        const matchesType = activeFilter === 'all' || item.type === activeFilter;
        const matchesEvent = selectedEventId === 'all' || item.eventId === selectedEventId;
        return matchesType && matchesEvent;
    });

    // --- LIGHTBOX LOGIC ---
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleItemClick = (item, index) => {
        // Find actual index in filtered list
        const actualIndex = filteredItems.findIndex(i => i.id === item.id);
        setSelectedItem(item);
        setSelectedIndex(actualIndex);
    };

    const closeModal = () => {
        setSelectedItem(null);
    };

    const handleNext = (e) => {
        e?.stopPropagation();
        if (!selectedItem) return;
        const nextIndex = (selectedIndex + 1) % filteredItems.length;
        setSelectedItem(filteredItems[nextIndex]);
        setSelectedIndex(nextIndex);
    };

    const handlePrev = (e) => {
        e?.stopPropagation();
        if (!selectedItem) return;
        const prevIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
        setSelectedItem(filteredItems[prevIndex]);
        setSelectedIndex(prevIndex);
    };

    // Keyboard Navigation
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedItem) return;

            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItem, selectedIndex, filteredItems]);



    // Show loading state
    if (loading) {
        return (
            <div className="media-page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>Loading media...</p>
                </div>
            </div>
        );
    }



    return (
        <div className="media-page-wrapper">
            {/* Hero Section */}
            <div style={{ paddingTop: 'var(--nav-height)' }}>
                <section style={{ padding: '80px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hero-title"
                        style={{ fontSize: '4rem', marginBottom: '20px', position: 'relative', zIndex: 2 }}
                        data-text="MEDIA GALLERY"
                    >
                        MEDIA GALLERY
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ color: 'var(--color-text-secondary)', maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2, fontSize: '1.1rem', lineHeight: '1.6' }}
                    >
                        Relive the moments that matter. <br /><br />
                        Our event galleries showcase professionally curated images capturing action, focus, and emotion from every Trackmeisters event. Browse by event, relive your runs, and share your journey.
                    </motion.p>
                </section>
            </div>

            <div className="media-hub-header" style={{ paddingBottom: '10px', borderBottom: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', paddingRight: '4px' }}>
                    {/* Event Filter */}
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="media-filter-select"
                    >
                        <option value="all">All Events</option>
                        {dbEvents.map(event => (
                            <option key={event.id} value={event.id}>
                                {event.title}
                            </option>
                        ))}
                    </select>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {['all', 'image', 'video'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 24px',
                                    borderRadius: '50px',
                                    background: activeFilter === filter ? 'var(--color-accent)' : 'transparent',
                                    border: activeFilter === filter ? '1px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.1)',
                                    color: activeFilter === filter ? '#fff' : 'var(--color-text-secondary)',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    textTransform: 'capitalize',
                                    boxShadow: activeFilter === filter ? '0 4px 15px rgba(220, 38, 38, 0.4)' : 'none'
                                }}
                            >
                                {filter === 'all' && <Grid size={16} />}
                                {filter === 'image' && <Image size={16} />}
                                {filter === 'video' && <Film size={16} />}
                                <span>{filter === 'all' ? 'All' : filter + 's'}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Square Grid Layout */}
            <div className="media-grid">
                {filteredItems.map((item, index) => (
                    <motion.div
                        key={item.id}
                        className="media-card-square"
                        onClick={() => handleItemClick(item, index)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="media-square-content">
                            <img
                                src={item.thumbnail}
                                alt={item.title}
                                loading="lazy"
                                className={item.thumbnail?.includes('hqdefault.jpg') ? 'yt-thumbnail-fix' : ''}
                                onError={(e) => {
                                    if (e.target.src.includes('maxresdefault')) {
                                        e.target.src = e.target.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                                        e.target.classList.add('yt-thumbnail-fix');
                                    } else {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/600x600/1a1a1a/ffffff?text=Image+Unavailable';
                                        e.target.classList.remove('yt-thumbnail-fix');
                                    }
                                }}
                            />

                            {item.type === 'video' && (
                                <div className="play-icon-overlay">
                                    <Play size={32} fill="white" color="white" />
                                </div>
                            )}

                            <div className="media-type-badge">
                                {item.type === 'video' ? <Film size={12} style={{ display: 'inline', marginRight: '4px' }} /> : <Image size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                                {item.type} {item.duration && ` • ${item.duration}`}
                            </div>

                            <div className="media-gallery-overlay">
                                {item.description && (
                                    <div className="media-gallery-info">
                                        <p className="media-gallery-desc">{item.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Universal Lightbox Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lightbox-overlay"
                        onClick={closeModal}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.95)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        {/* Navigation Buttons */}
                        <button
                            onClick={handlePrev}
                            className="lightbox-nav-btn prev"
                            style={{
                                position: 'absolute',
                                left: '20px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'white',
                                padding: '12px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                zIndex: 1002,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ChevronLeft size={32} />
                        </button>

                        <button
                            onClick={handleNext}
                            className="lightbox-nav-btn next"
                            style={{
                                position: 'absolute',
                                right: '20px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'white',
                                padding: '12px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                zIndex: 1002,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ChevronRight size={32} />
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={closeModal}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                zIndex: 1002
                            }}
                        >
                            <X size={32} />
                        </button>

                        {/* Content */}
                        <div
                            className="lightbox-content"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                width: selectedItem.type === 'video' ? '1000px' : 'auto',
                                aspectRatio: selectedItem.type === 'video' ? '16/9' : 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}
                        >
                            {selectedItem.type === 'video' ? (
                                <div style={{ width: '100%', height: '100%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                                    {selectedItem.youtubeId ? (
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${selectedItem.youtubeId}?autoplay=1`}
                                            title={selectedItem.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        <video
                                            src={selectedItem.url || selectedItem.thumbnail}
                                            controls
                                            autoPlay
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <img
                                    src={selectedItem.url || selectedItem.thumbnail}
                                    alt={selectedItem.title}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '90vh',
                                        borderRadius: '8px',
                                        objectFit: 'contain',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                    }}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Section - Hidden for now
            <section style={{ padding: '80px 20px', background: 'var(--color-surface-hover, rgba(255,255,255,0.02))', marginTop: '60px' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', textAlign: 'center' }}>
                    {[
                        { value: '500+', label: 'Photos' },
                        { value: '120+', label: 'Videos' },
                        { value: '45', label: 'Events Covered' },
                        { value: '4K', label: 'Resolution' }
                    ].map((stat, i) => (
                        <div key={i}>
                            <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--color-accent)', marginBottom: '10px' }}>{stat.value}</div>
                            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>
            */}
        </div>
    );
};

export default Media;