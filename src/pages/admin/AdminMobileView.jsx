import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, Users, Image as ImageIcon,
    FileText, Handshake, Menu, X, LogOut, ChevronRight, ChevronLeft,
    Plus, Trash2, Edit2, UploadCloud, ClipboardList, Car, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './admin-mobile.css';

const AdminMobileView = ({
    data,
    onLogout,
    actions,
    mediaState, // { progress, error }
    youtubeState, // { url, setUrl, showInput, setShowInput, handleEmbed }
    eventTagState // { selectedEvent, setSelectedEvent, events }
}) => {
    // Local state for mobile navigation
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [newsletterTab, setNewsletterTab] = useState('newsletter'); // 'newsletter' | 'press'
    const [eventTab, setEventTab] = useState('upcoming'); // 'upcoming' | 'past'

    const navigate = useNavigate();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'registrations', label: 'Registrations', icon: ClipboardList },
        { id: 'media', label: 'Media', icon: ImageIcon },
        { id: 'blogs', label: 'Newsletter', icon: FileText },
        { id: 'partners', label: 'Partners', icon: Handshake },
        { id: 'classifieds', label: 'Classifieds', icon: Car }, // Added
        { id: 'documents', label: 'Documents', icon: FileText }, // Added
    ];

    // --- Components ---

    const Header = () => (
        <div className="am-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeSection !== 'dashboard' && (
                    <button className="am-menu-btn" onClick={() => setActiveSection('dashboard')} style={{ paddingLeft: 0, paddingRight: 4 }}>
                        <ChevronLeft size={24} />
                    </button>
                )}
                <div className="am-brand">
                    {activeSection === 'dashboard' ? 'Admin Panel' : navItems.find(i => i.id === activeSection)?.label}
                </div>
            </div>
            <button className="am-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={24} />
            </button>
        </div>
    );

    const FullScreenMenu = () => (
        <div className={`am-fs-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="am-fs-header">
                <div className="am-brand">Menu</div>
                <button className="am-menu-btn" onClick={() => setMobileMenuOpen(false)}>
                    <X size={24} />
                </button>
            </div>

            <div style={{ flex: 1 }}>
                {navItems.map(item => (
                    <div
                        key={item.id}
                        className={`am-nav-item ${activeSection === item.id ? 'active' : ''}`}
                        onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                    >
                        <item.icon size={22} />
                        {item.label}
                    </div>
                ))}
            </div>

            <button className="am-nav-item" style={{ color: 'var(--am-danger)' }} onClick={onLogout}>
                <LogOut size={22} />
                Logout
            </button>
        </div>
    );

    const DashboardHome = () => (
        <>
            <div className="am-section-title">Overview</div>
            <div className="am-stats-scroll">
                <div className="am-stat-card">
                    <span className="am-stat-value">{data.events?.length || 0}</span>
                    <span className="am-stat-label">Events</span>
                </div>

                <div className="am-stat-card">
                    <span className="am-stat-value">{data.media?.length || 0}</span>
                    <span className="am-stat-label">Media</span>
                </div>
                <div className="am-stat-card">
                    <span className="am-stat-value">{data.partners?.length || 0}</span>
                    <span className="am-stat-label">Partners</span>
                </div>
            </div>

            <div className="am-section-title">Quick Actions</div>
            <div className="am-actions-grid">
                {navItems.slice(1).map(item => (
                    <div
                        key={item.id}
                        className="am-action-btn"
                        onClick={() => setActiveSection(item.id)}
                    >
                        <div className="am-icon-box" style={{ background: 'transparent' }}>
                            <item.icon size={28} color="var(--am-text-muted)" />
                        </div>
                        <span className="am-action-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </>
    );

    const EventsList = () => {
        const upcomingEvents = (data.events || []).filter(e => e.status !== 'completed');
        const pastEvents = (data.events || []).filter(e => e.status === 'completed');
        const displayEvents = eventTab === 'upcoming' ? upcomingEvents : pastEvents;

        return (
            <>
                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
                    <button
                        onClick={() => setEventTab('upcoming')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: eventTab === 'upcoming' ? 'var(--am-primary)' : 'var(--am-surface)',
                            color: eventTab === 'upcoming' ? 'white' : 'var(--am-text-muted)',
                            fontWeight: 500,
                            fontSize: '14px'
                        }}
                    >
                        Upcoming ({upcomingEvents.length})
                    </button>
                    <button
                        onClick={() => setEventTab('past')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: eventTab === 'past' ? 'var(--am-primary)' : 'var(--am-surface)',
                            color: eventTab === 'past' ? 'white' : 'var(--am-text-muted)',
                            fontWeight: 500,
                            fontSize: '14px'
                        }}
                    >
                        Past ({pastEvents.length})
                    </button>
                </div>

                <div className="am-section-title">
                    {eventTab === 'upcoming' ? 'Upcoming Events' : 'Past Events'}
                </div>

                {displayEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--am-text-muted)' }}>
                        <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>No {eventTab} events found.</p>
                    </div>
                ) : (
                    <div className="am-list-container">
                        {displayEvents.map(event => (
                            <div key={event.id} className="am-compact-item" onClick={() => actions.openModal('events', event)}>
                                <div className="am-icon-box" style={{ color: eventTab === 'past' ? '#71717a' : '#ef4444' }}>
                                    <Calendar size={20} />
                                </div>
                                <div className="am-item-content">
                                    <div className="am-item-title">{event.title}</div>
                                    <div className="am-item-subtitle">{event.date} • {event.location}</div>
                                </div>
                                <div className="am-action-icon" onClick={(e) => { e.stopPropagation(); actions.deleteItem('events', event.id); }}>
                                    <Trash2 size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button className="am-fab" onClick={() => actions.openModal('events')}>
                    <Plus size={24} />
                </button>
            </>
        );
    };



    const MediaList = () => (
        <>
            <div className="am-section-title">Media Gallery</div>

            {/* Event Tag Selector */}
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                <label style={{
                    display: 'block',
                    fontSize: '13px',
                    color: 'var(--am-text-muted)',
                    marginBottom: '8px'
                }}>
                    Tag Uploads with Event (Optional)
                </label>
                <select
                    value={eventTagState?.selectedEvent || ''}
                    onChange={(e) => eventTagState?.setSelectedEvent(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--am-border)',
                        background: 'var(--am-surface)',
                        color: 'var(--am-text)',
                        fontSize: '14px'
                    }}
                >
                    <option value="">-- General / No Event --</option>
                    {(eventTagState?.events || []).map(evt => (
                        <option key={evt.id} value={evt.id}>{evt.title}</option>
                    ))}
                </select>
            </div>

            {/* Upload Zone */}
            <div className="am-upload-zone" onClick={actions.triggerMediaUpload}>
                <UploadCloud size={32} color="var(--am-primary)" />
                <h4>Tap to Upload Images/Videos</h4>
                <p>Max 50MB</p>
            </div>

            {/* YouTube Embed Option */}
            <div className="am-youtube-embed">
                {youtubeState?.showInput ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            className="am-youtube-input"
                            placeholder="Paste YouTube Link..."
                            value={youtubeState.url}
                            onChange={(e) => youtubeState.setUrl(e.target.value)}
                        />
                        <button
                            className="am-youtube-btn"
                            disabled={!youtubeState.url}
                            onClick={youtubeState.handleEmbed}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                ) : (
                    <button
                        className="am-btn-secondary"
                        onClick={() => youtubeState?.setShowInput(true)}
                        style={{ padding: '12px', borderRadius: '8px', background: 'var(--am-surface)', border: '1px solid var(--am-border)', color: 'var(--am-text)', width: '100%', fontSize: '14px' }}
                    >
                        + Add YouTube Video
                    </button>
                )}
            </div>

            {/* Upload Progress Display */}
            {mediaState?.progress && (
                <div className="am-upload-progress">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>{mediaState.progress.text}</span>
                        <span>{mediaState.progress.percent}%</span>
                    </div>
                    <div className="am-progress-bar">
                        <div className="am-progress-fill" style={{ width: `${mediaState.progress.percent}%` }} />
                    </div>
                </div>
            )}

            {mediaState?.error && (
                <div style={{ margin: '0 16px 20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
                    {mediaState.error}
                </div>
            )}

            {/* 3-Column Grid */}
            <div className="am-media-grid-3">
                {data.media.map(item => (
                    <div
                        key={item.id}
                        className="am-media-grid-item"
                        onClick={() => actions.openModal('media', item)}
                    >
                        <img
                            src={item.thumbnail || item.url}
                            alt="media"
                            className="am-media-img"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                        />
                        {/* Removed direct delete icon to use Action Sheet */}
                        {item.type === 'video' && (
                            <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 4px' }}>
                                <ImageIcon size={10} color="white" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );

    const BlogsList = () => (
        <>
            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
                <button
                    onClick={() => setNewsletterTab('newsletter')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: newsletterTab === 'newsletter' ? 'var(--am-primary)' : 'var(--am-surface)',
                        color: newsletterTab === 'newsletter' ? 'white' : 'var(--am-text-muted)',
                        fontWeight: 500,
                        fontSize: '14px'
                    }}
                >
                    Newsletter
                </button>
                <button
                    onClick={() => setNewsletterTab('press')}
                    style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: newsletterTab === 'press' ? 'var(--am-primary)' : 'var(--am-surface)',
                        color: newsletterTab === 'press' ? 'white' : 'var(--am-text-muted)',
                        fontWeight: 500,
                        fontSize: '14px'
                    }}
                >
                    Press
                </button>
            </div>

            {newsletterTab === 'newsletter' && (
                <>
                    <div className="am-section-title">Newsletter Posts</div>
                    <div className="am-list-container">
                        {(data.blogs || []).map(blog => (
                            <div key={blog.id} className="am-compact-item" onClick={() => actions.navigate(`/admin/newsletter/edit/${blog.id}`)}>
                                <div className="am-icon-box" style={{ color: '#fff' }}>
                                    <FileText size={20} />
                                </div>
                                <div className="am-item-content">
                                    <div className="am-item-title">{blog.title}</div>
                                    <div className="am-item-subtitle">{blog.author}</div>
                                </div>
                                <div className="am-action-icon" onClick={(e) => { e.stopPropagation(); actions.deleteItem('blogs', blog.id); }}>
                                    <Trash2 size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="am-fab" onClick={() => actions.navigate('/admin/newsletter/new')}>
                        <Plus size={24} />
                    </button>
                </>
            )}

            {newsletterTab === 'press' && (
                <>
                    <div className="am-section-title">Press & External Links</div>
                    <div className="am-list-container">
                        {(data.press || []).map(item => (
                            <div key={item.id} className="am-compact-item" onClick={() => actions.openModal('press', item)}>
                                <div className="am-icon-box" style={{ color: '#3b82f6' }}>
                                    <LinkIcon size={20} />
                                </div>
                                <div className="am-item-content">
                                    <div className="am-item-title">{item.title}</div>
                                    <div className="am-item-subtitle">{item.outlet} • {item.date}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ color: 'var(--am-primary)', padding: '8px' }}
                                    >
                                        <LinkIcon size={18} />
                                    </a>
                                    <div className="am-action-icon" onClick={(e) => { e.stopPropagation(); actions.deleteItem('press', item.id); }}>
                                        <Trash2 size={18} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="am-fab" onClick={() => actions.openModal('press')}>
                        <Plus size={24} />
                    </button>
                </>
            )}
        </>
    );

    const PartnersList = () => (
        <>
            <div className="am-section-title">Partners</div>
            <div className="am-list-container">
                {data.partners.map(partner => (
                    <div key={partner.id} className="am-compact-item" onClick={() => actions.openModal('partners', partner)}>
                        <div className="am-icon-box" style={{ color: '#a1a1aa' }}>
                            <Handshake size={20} />
                        </div>
                        <div className="am-item-content">
                            <div className="am-item-title">{partner.name}</div>
                            <div className="am-item-subtitle">{partner.description}</div>
                        </div>
                        <div className="am-action-icon" onClick={(e) => { e.stopPropagation(); actions.deleteItem('partners', partner.id); }}>
                            <Trash2 size={18} />
                        </div>
                    </div>
                ))}
            </div>
            <button className="am-fab" onClick={() => actions.openModal('partners')}>
                <Plus size={24} />
            </button>
        </>
    );

    // Main Content Switcher
    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard': return <DashboardHome />;
            case 'events': return <EventsList />;
            case 'registrations':
                // Navigate to registrations page
                navigate('/admin/registrations');
                return null;

            case 'media': return <MediaList />;
            case 'blogs': return <BlogsList />;
            case 'partners': return <PartnersList />;
            case 'classifieds': return <ClassifiedsList />;
            case 'documents': return <DocumentsList />;
            default: return <DashboardHome />;
        }
    };

    const ClassifiedsList = () => (
        <>
            <div className="am-section-title">Classifieds</div>
            <div className="am-list-container">
                {(data.classifieds || []).map(item => (
                    <div key={item.id} className="am-compact-item" onClick={() => actions.openModal('classifieds', item)}>
                        <div className="am-icon-box" style={{ color: '#ef4444' }}>
                            <Car size={20} />
                        </div>
                        <div className="am-item-content">
                            <div className="am-item-title">{item.title}</div>
                            {item.listingId && (
                                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#a1a1aa', marginBottom: '2px' }}>
                                    {item.listingId}
                                </div>
                            )}
                            <div className="am-item-subtitle">{item.price} • {item.year} • {item.transmission || '-'}</div>
                        </div>
                        <div className="am-action-icon" onClick={(e) => { e.stopPropagation(); actions.deleteItem('classifieds', item.id); }}>
                            <Trash2 size={18} />
                        </div>
                    </div>
                ))}
            </div>
            <button className="am-fab" onClick={() => actions.openModal('classifieds')}>
                <Plus size={24} />
            </button>
        </>
    );

    const DocumentsList = () => (
        <>
            <div className="am-section-title">Documents</div>
            <div className="am-list-container">
                {(data.documents || []).map(doc => (
                    <div key={doc.id} className="am-compact-item" onClick={() => actions.openModal('documents', doc)}>
                        <div className="am-icon-box" style={{ color: '#3b82f6' }}>
                            <FileText size={20} />
                        </div>
                        <div className="am-item-content">
                            <div className="am-item-title">{doc.title}</div>
                            <div className="am-item-subtitle">{doc.category}</div>
                        </div>
                        <div className="am-action-icon" onClick={(e) => { e.stopPropagation(); actions.deleteItem('documents', doc.id); }}>
                            <Trash2 size={18} />
                        </div>
                    </div>
                ))}
            </div>
            <button className="am-fab" onClick={() => actions.openModal('documents')}>
                <Plus size={24} />
            </button>
        </>
    );

    return (
        <div className="mobile-view-root">
            <Header />
            <FullScreenMenu />

            <div className="am-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminMobileView;
