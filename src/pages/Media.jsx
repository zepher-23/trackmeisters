import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Image as ImageIcon, Download, Share2, Filter, ExternalLink, Instagram, Youtube, Twitter } from 'lucide-react';
import '../styles/media.scss'; // New Modular Styles

const galleryItems = [
    {
        id: 1,
        type: 'video',
        title: 'Season Highlights 2025',
        category: 'Racing',
        img: '/media/season-highlights.png',
        format: '16:9'
    },
    {
        id: 2,
        type: 'photo',
        title: 'Porsche GT3 RS',
        category: 'Automotive',
        img: '/media/porsche-gt3.png',
        format: '9:16'
    },
    {
        id: 3,
        type: 'photo',
        title: 'Cockpit View',
        category: 'Technical',
        img: '/media/cockpit-view.png',
        format: '1:1'
    },
    {
        id: 4,
        type: 'video',
        title: 'Night Session @ Monza',
        category: 'Racing',
        img: '/media/monza-night.png',
        format: '16:9'
    },
    {
        id: 5,
        type: 'photo',
        title: 'Carbon Composite',
        category: 'Engineering',
        img: '/media/carbon-composite.png',
        format: '9:16'
    },
    {
        id: 6,
        type: 'photo',
        title: 'Apex Point',
        category: 'Racing',
        img: '/media/apex-point.png',
        format: '9:16'
    },
    {
        id: 7,
        type: 'video',
        title: 'Driver Perspective',
        category: 'Onboard',
        img: '/media/driver-perspective.png',
        format: '16:9'
    },
    {
        id: 8,
        type: 'photo',
        title: 'Monaco GP Zone',
        category: 'Lifestyle',
        img: '/media/monaco-gp.png',
        format: '1:1'
    },
    {
        id: 9,
        type: 'photo',
        title: 'Helmet Aerodynamics',
        category: 'Design',
        img: '/media/helmet-design.png',
        format: '1:1'
    },
    {
        id: 10,
        type: 'video',
        title: 'Suzuka Rain Master',
        category: 'Atmosphere',
        img: '/media/suzuka-rain.png',
        format: '16:9'
    },
    {
        id: 11,
        type: 'photo',
        title: 'Pit Crew Elite',
        category: 'Team',
        img: '/media/pit-crew.png',
        format: '16:9'
    },
    {
        id: 12,
        type: 'photo',
        title: 'Victory Lane',
        category: 'Heritage',
        img: '/media/victory-lane.png',
        format: '9:16'
    }
];

const Media = () => {
    const [filter, setFilter] = useState('All');

    const filteredItems = filter === 'All'
        ? galleryItems
        : galleryItems.filter(item => {
            if (filter === 'Photos') return item.type === 'photo';
            if (filter === 'Videos') return item.type === 'video';
            return true;
        });

    return (
        <div className="media-page-wrapper">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>

                {/* Minimalist Tech Header */}
                <header className="media-hub-header">
                    <div className="media-hub-header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <h1 style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '4px', color: 'var(--color-accent)', marginBottom: '15px' }}>MEDIA ARCHIVE / 2025</h1>
                            <h2 className="hero-title" style={{ fontSize: '3.5rem', margin: 0, lineHeight: 1 }} data-text="MEDIA HUB">MEDIA HUB</h2>
                        </motion.div>

                        <nav className="media-hub-nav" style={{ display: 'flex', gap: '30px' }}>
                            {['All', 'Photos', 'Videos'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: filter === f ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        padding: '10px 0',
                                        borderBottom: `2px solid ${filter === f ? 'var(--color-accent)' : 'transparent'}`,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* Gapless Minimalist Grid */}
                <section style={{ maxWidth: '100%', margin: '0 auto' }}>
                    <motion.div
                        layout
                        className="media-grid"
                    // Inline styles removed; handled by CSS classes in media.scss
                    >
                        <AnimatePresence mode='popLayout'>
                            {filteredItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    // Dynamic class for grid format (e.g., format-16-9)
                                    className={`media-card-fresh format-${item.format.replace(':', '-')}`}
                                // Inline style for specific card appearance kept, but layout moved to CSS
                                >
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundImage: `url(${item.img})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }} className="media-img-wrapper" role="img" aria-label={item.title} />

                                    <div className="media-overlay-fresh" style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.9) 100%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        padding: '25px',
                                        opacity: 0,
                                        transition: 'all 0.4s ease'
                                    }}>
                                        {/* Top Row: Category Badge */}
                                        <div style={{ alignSelf: 'flex-start' }}>
                                            <span style={{
                                                fontSize: '9px',
                                                fontWeight: '800',
                                                letterSpacing: '1px',
                                                color: '#fff',
                                                background: 'var(--color-accent)',
                                                padding: '4px 8px',
                                                borderRadius: '2px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {item.category}
                                            </span>
                                        </div>

                                        {/* Bottom Row: Title and Actions */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                                            <h4 style={{ fontSize: '20px', fontWeight: '800', margin: 0, maxWidth: '75%', lineHeight: 1.1 }}>{item.title}</h4>

                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    backdropFilter: 'blur(4px)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '1px solid rgba(255,255,255,0.2)'
                                                }}>
                                                    {item.type === 'video' ? <Play size={14} fill="white" /> : <ImageIcon size={14} />}
                                                </div>
                                                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0 }}>
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </section>

                {/* Technical Resources Archive */}
                <section className="resource-archive">
                    <div className="footer-resources">
                        <div style={{ gridColumn: 'span 12' }}>
                            <h4 className="resource-section-label" style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '3px', color: 'rgba(255,255,255,0.4)', marginBottom: '30px' }}>[ RESOURCE CENTER ]</h4>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {[
                                    { id: '01', title: 'Press Kit 2026', desc: 'Brand assets & Guidelines', icon: <Share2 size={16} /> },
                                    { id: '02', title: '4K Wallpapers', desc: 'Desktop & Mobile Pack', icon: <Download size={16} /> },
                                    { id: '03', title: 'Tech Specs', desc: 'Vehicle Telemetry Data', icon: <Filter size={16} /> }
                                ].map((resource, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.02)' }}
                                        className="resource-item"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '25px 0',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--color-accent)', opacity: 0.8 }}>{resource.id}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <h4 className="resource-title" style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>{resource.title}</h4>
                                                <span className="resource-desc" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{resource.desc}</span>
                                            </div>
                                        </div>
                                        <div className="external-link-circle" style={{
                                            width: '30px',
                                            height: '30px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '50%'
                                        }}>
                                            <ExternalLink size={12} color="#fff" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="connect-container">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                    {[Instagram, Youtube, Twitter].map((Icon, index) => (
                                        <motion.a
                                            key={index}
                                            href="#"
                                            whileHover={{ scale: 1.2, color: 'var(--color-accent)' }}
                                            whileTap={{ scale: 0.9 }}
                                            style={{ color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Icon size={24} />
                                        </motion.a>
                                    ))}
                                </div>
                                <div className="connect-label" style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '3px', color: 'rgba(255,255,255,0.2)' }}>[ CONNECT ]</div>
                            </div>
                            <div className="copyright-text" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '20px', letterSpacing: '2px' }}>DOCUMENTING THE APEX PRE-RELEASE 2026</div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Media;
