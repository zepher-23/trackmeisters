import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Calendar, MapPin, Flag, Timer, ChevronLeft, Medal, Users, Image as ImageIcon, FileText, Download, Youtube } from 'lucide-react';
import { useMedia, useEvents, getImageUrl } from '../hooks/useFirebase';

const PastEventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('class_results');
    const [selectedClass, setSelectedClass] = useState(null);
    const { data: allMedia } = useMedia();

    // Filter media for this event
    const eventMedia = allMedia.filter(item => item.eventId === id);

    const { data: dbEvents, loading } = useEvents();

    // Find event by ID
    const event = dbEvents.find(e => e.id === id);

    // Auto-select first class tab
    useEffect(() => {
        if (event?.classResults && !selectedClass) {
            const keys = Object.keys(event.classResults);
            if (keys.length > 0) setSelectedClass(keys[0]);
        }
    }, [event, selectedClass]);

    // If loading or not found (handle gracefully)
    if (loading) return <div className="app-container" style={{ paddingTop: 'var(--nav-height)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    if (!event) return <div className="app-container" style={{ paddingTop: 'var(--nav-height)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Event not found</div>;

    // Helper to parse lap time string to milliseconds for sorting
    const parseLapTime = (timeStr) => {
        if (!timeStr) return Infinity;
        const cleanStr = timeStr.trim();
        let minutes = 0;
        let seconds = 0;

        if (cleanStr.includes(':')) {
            const parts = cleanStr.split(':');
            minutes = parseFloat(parts[0]) || 0;
            seconds = parseFloat(parts[1]) || 0;
        } else {
            seconds = parseFloat(cleanStr) || 0;
        }

        return (minutes * 60) + seconds;
    };

    // Derive data from classResults
    let derivedTotalRacers = 0;
    let derivedFastestLapStr = '-';
    let derivedFastestLapTime = Infinity;
    let derivedWinner = 'TBD';
    const uniqueDrivers = new Set();

    if (event.classResults) {
        Object.values(event.classResults).forEach(results => {
            if (Array.isArray(results)) {
                results.forEach(r => {
                    // Add driver to Set to track unique participants
                    if (r.driver) uniqueDrivers.add(r.driver.trim().toLowerCase());

                    const timeMs = parseLapTime(r.time);
                    if (timeMs < derivedFastestLapTime) {
                        derivedFastestLapTime = timeMs;
                        derivedFastestLapStr = r.time;
                        // Assuming the overall winner is the one with the fastest lap if not explicitly set
                        derivedWinner = r.driver;
                    }
                });
            }
        });
        derivedTotalRacers = uniqueDrivers.size;
    }

    const eventDetails = {
        title: event.title,
        date: new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        location: event.location,
        image: getImageUrl(event.image, '/event-race.webp'),
        description: event.description || `A thrilling ${event.type} event at ${event.location}.`,
        winner: event.winner || derivedWinner,
        fastestLap: event.fastestLap || derivedFastestLapStr,
        totalRacers: event.totalRacers || derivedTotalRacers
    };

    return (
        <div className="app-container" style={{ paddingTop: 'var(--nav-height)', minHeight: '100vh' }}>
            {/* Hero Section */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/2', maxHeight: '500px', overflow: 'hidden' }}>
                <img
                    src={eventDetails.image}
                    alt={eventDetails.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-bg), transparent)' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <button
                        onClick={() => navigate('/events')}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', marginBottom: '20px', cursor: 'pointer' }}
                    >
                        <ChevronLeft size={20} /> Back to Events
                    </button>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ fontSize: '48px', fontWeight: '800', marginBottom: '15px' }}
                    >
                        {eventDetails.title}
                    </motion.h1>
                    <div style={{ display: 'flex', gap: '30px', color: 'var(--color-text-secondary)', fontSize: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} color="var(--color-accent)" /> {eventDetails.date}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} color="var(--color-accent)" /> {eventDetails.location}</div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
                {/* PDF Results Section */}
                {event.resultFiles && event.resultFiles.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={20} color="var(--color-accent)" /> Official Result Documents
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                            {event.resultFiles.map((file, idx) => (
                                <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bento-item"
                                    style={{
                                        padding: '20px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        minHeight: 'auto',
                                        border: '1px solid var(--color-border)',
                                        transition: 'transform 0.2s, border-color 0.2s',
                                        background: 'transparent'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <FileText size={24} color="#ef4444" />
                                        <span style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }} title={file.name}>{file.name}</span>
                                    </div>
                                    <Download size={18} color="var(--color-text-secondary)" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="event-tabs-container" style={{ display: 'flex', gap: '5px', marginBottom: '40px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {[
                        { id: 'class_results', label: 'Results', icon: <Timer size={18} /> },
                        { id: 'classes', label: 'Classes', icon: <Flag size={18} /> },
                        { id: 'event_summary', label: 'Summary', icon: <Trophy size={18} /> },
                        { id: 'gallery', label: 'Gallery', icon: <ImageIcon size={18} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="event-tab-btn"
                            style={{
                                padding: '12px 16px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                fontSize: '14px'
                            }}
                        >
                            {tab.icon} <span className="event-tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'class_results' && (
                        <div>


                            {event.classResults && Object.keys(event.classResults).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                    {/* Class Tabs */}
                                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                                        {Object.keys(event.classResults).map((clsName) => (
                                            <button
                                                key={clsName}
                                                onClick={() => setSelectedClass(clsName)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    border: selectedClass === clsName ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                                                    background: selectedClass === clsName ? 'var(--color-accent)' : 'transparent',
                                                    color: selectedClass === clsName ? 'var(--color-bg)' : 'var(--color-text-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {clsName}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Selected Class Table */}
                                    {selectedClass && event.classResults[selectedClass] && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h3 style={{ fontSize: 'clamp(18px, 4vw, 24px)' }}>{selectedClass} <span style={{ color: 'var(--color-text-secondary)', fontSize: 'clamp(14px, 3vw, 18px)' }}>Results</span></h3>
                                            </div>

                                            <div style={{ overflowX: 'auto', background: 'var(--color-surface)', borderRadius: '0', border: '1px solid var(--color-border)', WebkitOverflowScrolling: 'touch' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '14px' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', width: '50px', textAlign: 'center' }}>Pos</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Comp. No</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Name</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Class/Category</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Video</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Laptime</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Penalty</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Total Time</th>
                                                            <th style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>Diff. to Prev</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {event.classResults[selectedClass].sort((a, b) => (Number(a.pos) || 999) - (Number(b.pos) || 999)).map((row, index) => (
                                                            <tr key={index} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                                                                <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                                        background: row.pos == 1 ? '#fbbf24' : row.pos == 2 ? '#94a3b8' : row.pos == 3 ? '#b45309' : 'transparent',
                                                                        color: row.pos <= 3 ? '#000' : 'inherit',
                                                                        fontSize: '13px'
                                                                    }}>
                                                                        {row.pos}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px 8px' }}>{row.compNo || '-'}</td>
                                                                <td style={{ padding: '12px 8px', fontWeight: '600' }}>{row.driver}</td>
                                                                <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>{selectedClass}</td>
                                                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                                    {row.lapVideo ? (
                                                                        <a href={row.lapVideo} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ff0000' }}>
                                                                            <Youtube size={16} />
                                                                        </a>
                                                                    ) : '-'}
                                                                </td>
                                                                <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: 'var(--color-accent)' }}>{row.laps || row.time || '-'}</td>
                                                                <td style={{ padding: '12px 8px', color: '#ef4444' }}>{row.penalty || '-'}</td>
                                                                <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>{row.totalTime || '-'}</td>
                                                                <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)' }}>{row.diff || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
                                    <Trophy size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                    <h3>Results Pending</h3>
                                    <p>Official class results have not been posted yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'classes' && (
                        <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', padding: 0, gap: '20px' }}>
                            {event.classes && event.classes.length > 0 ? (
                                event.classes.map((cls, i) => {
                                    // Calculate winner from classResults if available
                                    const classResultList = event.classResults && event.classResults[cls.name];
                                    const winner = classResultList ? classResultList.find(r => r.pos == 1)?.driver || 'TBD' : 'TBD';
                                    const entryCount = classResultList ? classResultList.length : 0;

                                    return (
                                        <div key={i} className="bento-item" style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 style={{ fontSize: '22px', fontWeight: '700' }}>{cls.name}</h4>
                                                <Flag size={24} color="var(--color-accent)" />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-secondary)', fontSize: '16px' }}>
                                                <Users size={18} /> {entryCount} Entrants
                                            </div>
                                            <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--color-surface-hover)' }}>
                                                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Class Winner</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '18px' }}>
                                                    <Medal size={20} color="#fbbf24" /> {winner}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1/-1', color: 'var(--color-text-secondary)' }}>
                                    No classes defined for this event.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'event_summary' && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Trophy size={64} color="var(--color-accent)" style={{ margin: '0 auto 20px' }} />
                            <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Event Summary</h2>
                            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto 40px' }}>
                                {eventDetails.description}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', textAlign: 'left' }}>
                                <div className="bento-item" style={{ minHeight: 'auto', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), transparent)' }}>
                                    <h4 style={{ color: '#22c55e', marginBottom: '10px', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Fastest Lap</h4>
                                    <div style={{ fontSize: '36px', fontWeight: '800' }}>{eventDetails.fastestLap}</div>
                                </div>
                                <div className="bento-item" style={{ minHeight: 'auto', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)' }}>
                                    <h4 style={{ color: '#3b82f6', marginBottom: '10px', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Driver w/ Most Wins</h4>
                                    <div style={{ fontSize: '36px', fontWeight: '800' }}>{eventDetails.winner}</div>
                                    <div style={{ marginTop: '5px' }}>Overall Winner</div>
                                </div>
                                <div className="bento-item" style={{ minHeight: 'auto', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), transparent)' }}>
                                    <h4 style={{ color: '#ef4444', marginBottom: '10px', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Total No. of Racers</h4>
                                    <div style={{ fontSize: '36px', fontWeight: '800' }}>{eventDetails.totalRacers || '-'}</div>
                                    <div style={{ marginTop: '5px' }}>Registered Participants</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'gallery' && (
                        <div style={{ padding: '0 20px' }}>
                            {eventMedia.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                    {eventMedia.map(item => (
                                        <div key={item.id} style={{ borderRadius: '12px', overflow: 'hidden', height: '200px', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                                            <img
                                                src={getImageUrl(item.thumbnail || item.url)}
                                                alt={item.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: '12px' }}>
                                    <ImageIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                    <h3>No photos found</h3>
                                    <p>Event photos haven't been uploaded yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default PastEventDetails;
