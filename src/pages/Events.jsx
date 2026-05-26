import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Clock, Shield, AlertTriangle, Download, ChevronRight, Car, Flag, Loader2, X, Users, User, CheckCircle, Youtube } from 'lucide-react';
import { useEvents, useDocuments, getImageUrl } from '../hooks/useFirebase';
import gp1TrackImage from '../assets/GP1-track.png';




const Events = () => {

    const { data: dbEvents, loading, error } = useEvents();

    const { data: documents } = useDocuments();
    const navigate = useNavigate();

    const openRegistration = (item) => {
        const params = new URLSearchParams({
            eventId: item.id,
            event: item.title
        });
        navigate(`/register?${params.toString()}`);
    };

    // Helper to parse lap time string to milliseconds
    const parseLapTime = (timeStr) => {
        if (!timeStr) return Infinity;
        const cleanStr = timeStr.toString().trim();
        let minutes = 0;
        let seconds = 0;

        if (cleanStr.includes(':')) {
            const parts = cleanStr.split(':');
            minutes = parseFloat(parts[0]) || 0;

            if (parts.length >= 3) {
                // Format: mm:ss:ms (e.g., 1:12:450)
                const secInt = parseInt(parts[1]) || 0;
                const msPart = parts[2];
                // Treat the 3rd part as the decimal fraction
                seconds = parseFloat(`${secInt}.${msPart}`) || 0;
            } else {
                // Format: mm:ss.ms
                seconds = parseFloat(parts[1]) || 0;
            }
        } else {
            seconds = parseFloat(cleanStr) || 0;
        }
        return (minutes * 60) + seconds;
    };

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // Fallback if invalid date
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Filter events by status (safely handle undefined dbEvents)
    const eventsSafe = dbEvents || [];
    const pendingEvents = eventsSafe.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
    const completedEvents = eventsSafe.filter(e => e.status === 'completed');

    const upcomingEvents = pendingEvents.map(e => ({
        id: e.id,
        title: e.title,
        date: formatDate(e.date),
        location: e.location,
        type: e.type,
        image: getImageUrl(e.image, '/event-placeholder.webp'),
        slots: e.slots
    }));

    const pastEventsRaw = completedEvents.map(e => ({
        ...e, // Spread all properties including classResults
        date: formatDate(e.date),
        image: getImageUrl(e.image, '/event-placeholder.webp')
    }));

    // State for Past Events Scalability
    const [selectedYear, setSelectedYear] = useState('All');
    const [visibleCount, setVisibleCount] = useState(5);
    const [selectedTrack, setSelectedTrack] = useState(null);

    const availableTracks = React.useMemo(() => {
        const tracks = new Set();
        pastEventsRaw.forEach(e => {
            if (e.classResults && Object.keys(e.classResults).length > 0) {
                const track = e.trackName || e.location;
                if (track) tracks.add(track);
            }
        });
        return Array.from(tracks).sort();
    }, [pastEventsRaw]);

    React.useEffect(() => {
        if (!selectedTrack && pastEventsRaw.length > 0) {
            let latest = null;
            let latestDate = -Infinity;
            pastEventsRaw.forEach(e => {
                if (!e.classResults || Object.keys(e.classResults).length === 0) return;
                const time = new Date(e.date).getTime();
                if (!isNaN(time) && time > latestDate) {
                    latestDate = time;
                    latest = e.trackName || e.location;
                }
            });
            if (!latest) {
                const first = pastEventsRaw.find(e => e.classResults && Object.keys(e.classResults).length > 0);
                if (first) latest = first.trackName || first.location;
            }
            if (latest) setSelectedTrack(latest);
        }
    }, [pastEventsRaw, selectedTrack]);

    // Filter past events by year
    const filteredPastEvents = pastEventsRaw.filter(event => {
        if (selectedYear === 'All') return true;
        return new Date(event.date).getFullYear().toString() === selectedYear;
    });

    // Get unique years from past events for the filter dropdown
    const availableYears = ['All', ...new Set(pastEventsRaw.map(e => new Date(e.date).getFullYear().toString()))].sort((a, b) => b - a);

    // Slice events for display based on visibleCount
    const displayedPastEvents = filteredPastEvents.slice(0, visibleCount);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 5);
    };

    const vehicleClasses = [
        { name: 'Street Stock Class', desc: 'Road legal cars with minimal modifications', required: 'INAC3', img: 'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Modified Cars Class', desc: 'Engine capacity based competition', required: 'INAC2 • 1100cc, 1400cc, 1600cc', img: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Performance Cars Class', desc: 'Brand and model specific competition', required: 'INAC2 • Single brand/model battle', img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Classic Cars', desc: 'Vintage and heritage performance cars', required: 'INAC2', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Race Spec Cars', desc: 'Full competition builds and dedicated race cars', required: 'INAC1', img: '/time-attack.webp' },
        { name: 'Imported Performance Cars', desc: 'Privately imported performance vehicles', required: 'CBU and exclusive global models', img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=1000&auto=format&fit=crop' },
    ];

    const standings = React.useMemo(() => {
        // ---- PASS 1: Collect ALL raw records per driver ----
        const driverRecords = {};

        pastEventsRaw.forEach(event => {
            const track = event.trackName || event.location;
            if (selectedTrack && track !== selectedTrack) return; // Only process selected track

            if (!event.classResults) return;

            Object.values(event.classResults).forEach(results => {
                if (!Array.isArray(results) || results.length === 0) return;

                // Identify Class Winner deterministically
                const sortedResults = [...results].sort((a, b) => {
                    const timeA = parseLapTime(a.time);
                    const timeB = parseLapTime(b.time);
                    if (timeA !== timeB) return timeA - timeB;
                    return (a.driver || '').localeCompare(b.driver || '');
                });
                const winnerName = sortedResults[0]?.driver?.trim();

                // Collect every result row
                results.forEach(r => {
                    if (!r.driver) return;
                    const name = r.driver.trim();
                    const carRaw = r.vehicle || r.car || 'Unknown';
                    const car = carRaw.trim().replace(/\s+/g, ' ');
                    const timeMs = parseLapTime(r.time);
                    const video = r.lapVideo || r.video || r.videoUrl || null;

                    // Normalize name and car for case-insensitive and space-insensitive grouping
                    const normName = name.toLowerCase().replace(/\s+/g, ' ');
                    const normCar = car.toLowerCase().replace(/\s+/g, ' ');
                    const groupKey = `${normName}__${normCar}`;

                    if (!driverRecords[groupKey]) {
                        driverRecords[groupKey] = { name, car, records: [] };
                    }

                    driverRecords[groupKey].records.push({
                        driverName: name,
                        timeStr: r.time || '',
                        timeMs,
                        car: car || 'Unknown',
                        team: r.team || r.teamName || '-',
                        lapVideo: video,
                        isWinner: name === winnerName
                    });
                });
            });
        });

        // ---- PASS 2: Compute final stats deterministically ----
        const drivers = {};

        Object.entries(driverRecords).forEach(([groupKey, group]) => {
            const { name, car, records } = group;
            // Sort all records by time (ascending), then by whether they have a video (video first)
            const sorted = [...records].sort((a, b) => {
                if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
                const aHasVideo = a.lapVideo ? 1 : 0;
                const bHasVideo = b.lapVideo ? 1 : 0;
                return bHasVideo - aHasVideo;
            });

            const bestRecord = sorted[0];
            const wins = records.filter(r => r.isWinner).length;
            const races = records.length;
            const lastRecord = records[records.length - 1];

            drivers[groupKey] = {
                name: bestRecord.driverName || name,
                car: bestRecord.car || car,
                team: lastRecord.team !== '-' ? lastRecord.team : bestRecord.team,
                lapVideo: bestRecord.lapVideo || records.find(r => r.lapVideo)?.lapVideo || null,
                fastestLap: bestRecord.timeMs,
                fastestLapStr: bestRecord.timeMs !== Infinity ? bestRecord.timeStr.split(',')[0].trim() : '-',
                wins,
                races
            };
        });

        const derivedStandings = Object.entries(drivers)
            .map(([groupKey, stats]) => ({
                driver: stats.name,
                car: stats.car,
                team: stats.team,
                lapVideo: stats.lapVideo,
                wins: stats.wins,
                races: stats.races,
                fastestLap: stats.fastestLapStr,
                fastestLapMs: stats.fastestLap
            }))
            .sort((a, b) => {
                // Handle Infinity (no time set) - push to bottom
                if (a.fastestLapMs === Infinity && b.fastestLapMs === Infinity) {
                    return b.wins - a.wins; // If both no time, sort by wins
                }
                if (a.fastestLapMs === Infinity) return 1;
                if (b.fastestLapMs === Infinity) return -1;

                if (a.fastestLapMs !== b.fastestLapMs) return a.fastestLapMs - b.fastestLapMs;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.driver.localeCompare(b.driver);
            });

        return derivedStandings.slice(0, 10).map((d, i) => ({ ...d, rank: i + 1 }));

    }, [pastEventsRaw, dbEvents, selectedTrack]);


    return (
        <div className="app-container">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>

                {/* Events Hero */}
                <section className="events-hero-section" style={{ padding: '60px 20px 40px', textAlign: 'center', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>
                    <div className="events-hero-grid" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hero-title events-hero-title"
                        style={{ fontSize: '4rem', marginBottom: '20px', position: 'relative', zIndex: 2 }}
                        data-text="RACING CALENDAR"
                    >
                        RACING CALENDAR
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="events-hero-desc"
                        style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 2 }}
                    >
                        Join the ultimate motorsport community. From casual track days to competitive racing.
                    </motion.p>

                    {/* Featured Event Card */}
                    {upcomingEvents[0] && (
                        <motion.div
                            className="next-race-wrapper"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            style={{
                                maxWidth: '1200px',
                                margin: '40px auto 0',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexWrap: 'wrap',
                                position: 'relative',
                                zIndex: 10,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                textAlign: 'left',
                            }}
                        >
                            {/* Image Side */}
                            <div style={{ flex: '0 0 auto', width: '540px', maxWidth: '100%', position: 'relative', overflow: 'hidden' }}>
                                <img
                                    src={upcomingEvents[0].image || '/event-placeholder.webp'}
                                    alt={upcomingEvents[0].title}
                                    style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '20px',
                                    left: '20px',
                                    background: '#ef4444',
                                    color: 'white',
                                    padding: '6px 16px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    letterSpacing: '1px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                }}>
                                    NEXT RACE
                                </div>
                            </div>

                            {/* Content Side */}
                            <div className="next-race-content" style={{ flex: '1 1 350px', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div className="next-race-meta" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', color: 'var(--color-accent)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {upcomingEvents[0].date}</span>
                                    <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }}></span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {upcomingEvents[0].location}</span>
                                </div>

                                <h2 className="next-race-title" style={{ fontSize: '38px', fontWeight: '800', lineHeight: '1', marginBottom: '12px', color: 'var(--color-text-primary)' }}>{upcomingEvents[0].title}</h2>
                                <p className="next-race-desc" style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-secondary)', marginBottom: '30px', maxWidth: '90%' }}>
                                    Entries closing soon! Secure your spot on the grid.
                                </p>

                                <div className="next-race-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                    <motion.button
                                        onClick={() => openRegistration(upcomingEvents[0])}
                                        className="hero-cta"
                                        style={{ fontSize: '16px', padding: '14px 32px', cursor: 'pointer', border: 'none', background: 'var(--color-accent)', color: 'white' }}
                                        animate={{ boxShadow: ['0 0 0px rgba(239, 68, 68, 0)', '0 0 25px rgba(239, 68, 68, 0.8)', '0 0 0px rgba(239, 68, 68, 0)'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        REGISTER NOW
                                    </motion.button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                                        <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600', fontSize: '14px' }}>{upcomingEvents[0].slots || 'Open'} Spots</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </section>



                {/* Championship Leaderboard */}
                <section style={{ padding: '60px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="leaderboard-section-header">
                        <div>
                            <h2 className="bento-title" style={{ fontSize: '32px', borderLeft: '4px solid var(--color-accent)', paddingLeft: '20px', marginBottom: '10px' }}>
                                Trackmeisters Leaderboard
                            </h2>
                            <p style={{ marginLeft: '24px', color: 'var(--color-text-secondary)', maxWidth: '800px', lineHeight: '1.6' }}>
                                The Trackmeisters Leaderboard is permanent recognition. Only verified fastest laps earn a place. Drivers can defend their times or return to beat them in future events. This is where performance is recorded and remembered.
                            </p>
                        </div>
                        <button className="hero-cta" style={{ fontSize: '14px', padding: '10px 24px' }} onClick={() => navigate('/standings')}>Full Standings <ChevronRight size={16} /></button>
                    </div>

                    {/* Track Selection UI */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        paddingBottom: '20px',
                        marginBottom: '20px',
                        scrollbarWidth: 'none'
                    }}>
                        {availableTracks.length > 0 && availableTracks.map(track => (
                            <button
                                key={track}
                                onClick={() => setSelectedTrack(track)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '100px',
                                    border: selectedTrack === track ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    background: selectedTrack === track ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface)',
                                    color: selectedTrack === track ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {track}
                            </button>
                        ))}
                    </div>

                    <div className="leaderboard-container">
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <div style={{ minWidth: '950px' }}>
                                {/* Header */}
                                <div className="leaderboard-header-row">
                                    <div style={{ textAlign: 'center' }}>#</div>
                                    <div>Driver</div>
                                    <div>Team</div>
                                    <div>Vehicle</div>
                                    <div style={{ textAlign: 'center' }}>Wins</div>
                                    <div style={{ textAlign: 'center' }}>Races</div>
                                    <div style={{ textAlign: 'center' }}>Video</div>
                                    <div style={{ textAlign: 'right' }}>Best Lap</div>
                                </div>

                                {/* Entries */}
                                {standings.map((driver, i) => (
                                    <motion.div
                                        key={i}
                                        className={`leaderboard-entry ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05, duration: 0.3 }}
                                    >
                                        <div className={`lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'default'}`}>
                                            {driver.rank}
                                        </div>
                                        <div className="lb-driver">
                                            <div className="lb-driver-avatar">
                                                <User size={14} />
                                            </div>
                                            <span className="lb-driver-name">{driver.driver}</span>
                                        </div>
                                        <div className="lb-team">{driver.team}</div>
                                        <div className="lb-vehicle">{driver.car}</div>
                                        <div className="lb-stat">{driver.wins}</div>
                                        <div className="lb-stat" style={{ color: 'var(--color-text-secondary)' }}>{driver.races}</div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {driver.lapVideo && (
                                                <a href={driver.lapVideo} target="_blank" rel="noopener noreferrer" style={{ color: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'opacity 0.2s' }} title="Watch Lap">
                                                    <Youtube size={18} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="lb-time">{driver.fastestLap}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>


                </section>

                {/* Event Types */}
                <section style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <h2 className="bento-title" style={{ fontSize: '24px', marginBottom: '40px', borderLeft: '4px solid var(--color-accent)', paddingLeft: '20px' }}>Event Types</h2>
                    <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gridAutoRows: 'auto' }}>
                        {[
                            { title: 'Racing Events', icon: <Trophy size={32} />, desc: 'Time attack and autocross competitions across diverse terrains. Push your limits and earn your place on the leaderboard.', img: '/event-race.webp' },
                            { title: 'Trackdays and Training', icon: <Clock size={32} />, desc: 'Performance focused track sessions and driver coaching designed to sharpen skills and unlock faster lap times.', img: '/event-track-day.webp' },
                            { title: 'Customised Corporate Events', icon: <Car size={32} />, desc: 'Premium motorsport experiences for automotive brands including track activations, product demonstrations, and high impact customer engagement.', img: '/event-meetup.webp' }
                        ].map((type, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -5 }}
                                className="bento-item bright-card"
                                style={{ minHeight: '300px', padding: '0', display: 'block' }}
                            >
                                <div className="bento-bg" style={{ backgroundImage: `url(${type.img})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1)' }}></div>
                                <div className="bento-content" style={{ padding: '30px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'var(--card-overlay, linear-gradient(to top, rgba(0,0,0,0.9), transparent))' }}>
                                    <div style={{ color: 'var(--color-accent)', marginBottom: '10px' }}>{type.icon}</div>
                                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '10px' }}>{type.title}</h3>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{type.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Visitor Access */}
                <section style={{ padding: '20px 20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#22c55e' }}>
                            <Users size={20} />
                        </div>
                        <h2 className="bento-title" style={{ fontSize: '24px', margin: 0 }}>Spectator Passes</h2>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>

                        {/* General Pass Card */}
                        <motion.div
                            whileHover={{ y: -3 }}
                            style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                maxWidth: '400px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>VIP PASS</h3>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Premium Motorsport Experience</div>
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text-primary)' }}>₹500</div>
                            </div>

                            <ul style={{ flex: 1, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {[
                                    'All General Benefits Included',
                                    '360 Degree Watch Tower View',
                                    'Paddock Entry and Pit Walk',
                                    'Access Close to Race Cars'
                                ].map((item, i) => (
                                    <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                        <CheckCircle size={14} color="#22c55e" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => navigate('/register?mode=visitor')}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)'; }}
                                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'; }}
                            >
                                Select
                            </button>
                        </motion.div>



                    </div>
                </section>

                {/* Upcoming Events Section */}
                <section id="upcoming" style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <h2 className="bento-title" style={{ fontSize: '32px', marginBottom: '20px', borderLeft: '4px solid var(--color-accent)', paddingLeft: '20px' }}>Upcoming Events</h2>
                    <div style={{ marginBottom: '40px', maxWidth: '800px', paddingLeft: '20px' }}>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px', color: 'var(--color-text-primary)' }}>Discover what is coming next.</h3>
                        <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-secondary)', marginBottom: '15px' }}>
                            Our events span tarmac autocross, time attack, track days, and special motorsport experiences. Each event follows a clear structure, defined classes, and transparent timing to ensure fair competition.
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Limited entries. Real competition.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gap: '30px' }}>
                        {upcomingEvents.map(event => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="upcoming-event-card"
                            >
                                <div className="event-image-wrapper">
                                    <img
                                        src={event.image || '/event-placeholder.webp'}
                                        alt={event.title}
                                        className="event-image-bg"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/600x400/1a1a1a/ffffff?text=Event+Image';
                                        }}
                                    />
                                </div>
                                <div className="event-card-details">
                                    <div className="event-main-info">
                                        <div className="event-type-tag">{event.type}</div>
                                        <h3 className="event-card-title">{event.title}</h3>
                                        <div className="event-meta-info">
                                            <div className="event-meta-item"><Calendar size={14} /> {event.date}</div>
                                            <div className="event-meta-item"><MapPin size={14} /> {event.location}</div>
                                        </div>
                                    </div>
                                    <div className="event-action-area">
                                        <div className="event-availability">Availability: <span>{event.slots}</span></div>
                                        <motion.button
                                            className="hero-cta"
                                            onClick={() => openRegistration(event)}
                                            animate={{ boxShadow: ['0 0 0px rgba(239, 68, 68, 0)', '0 0 20px rgba(239, 68, 68, 0.6)', '0 0 0px rgba(239, 68, 68, 0)'] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            Register Now
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Past Events Section */}
                <section id="past" style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h2 className="bento-title" style={{ fontSize: '32px', marginBottom: '10px', borderLeft: '4px solid var(--color-accent)', paddingLeft: '20px' }}>Past Events Archive</h2>
                            <p style={{ marginLeft: '24px', color: 'var(--color-text-secondary)', maxWidth: '650px', lineHeight: '1.6', fontSize: '15px' }}>
                                Explore our history of speed. Relive the excitement of previous events, check past results, and see how the competition unfolded. From lap times to photo galleries, it's all archived here.
                            </p>
                        </div>

                        {/* Year Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Filter Year:</span>
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    setSelectedYear(e.target.value);
                                    setVisibleCount(5); // Reset visible count on filter change
                                }}
                                style={{
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                        }}
                    >
                        {displayedPastEvents.length > 0 ? (
                            displayedPastEvents.map((event, i) => {
                                // Helper to parse lap time string to milliseconds for sorting
                                const parseLapTime = (timeStr) => {
                                    if (!timeStr) return Infinity;
                                    const cleanStr = timeStr.toString().trim();
                                    let minutes = 0;
                                    let seconds = 0;

                                    if (cleanStr.includes(':')) {
                                        const parts = cleanStr.split(':');
                                        minutes = parseFloat(parts[0]) || 0;

                                        if (parts.length >= 3) {
                                            // Format: mm:ss:ms (e.g., 1:12:450)
                                            const secInt = parseInt(parts[1]) || 0;
                                            const msPart = parts[2];
                                            // Treat the 3rd part as the decimal fraction
                                            seconds = parseFloat(`${secInt}.${msPart}`) || 0;
                                        } else {
                                            // Format: mm:ss.ms
                                            seconds = parseFloat(parts[1]) || 0;
                                        }
                                    } else {
                                        seconds = parseFloat(cleanStr) || 0;
                                    }
                                    return (minutes * 60) + seconds;
                                };

                                // Derive data if not explicitly set
                                let derivedTotalRacers = 0;
                                let derivedFastestLapStr = '-';
                                let derivedFastestLapTime = Infinity;
                                let derivedWinner = 'TBD';
                                const uniqueDrivers = new Set();

                                if (event.classResults) {
                                    Object.values(event.classResults).forEach(results => {
                                        if (Array.isArray(results)) {
                                            results.forEach(r => {
                                                if (r.driver) uniqueDrivers.add(r.driver.trim().toLowerCase());
                                                const timeMs = parseLapTime(r.time);
                                                if (timeMs < derivedFastestLapTime) {
                                                    derivedFastestLapTime = timeMs;
                                                    derivedFastestLapStr = r.time;
                                                    derivedWinner = r.driver;
                                                }
                                            });
                                        }
                                    });
                                    derivedTotalRacers = uniqueDrivers.size;
                                }

                                const displayWinner = event.winner || derivedWinner;
                                const displayRacers = event.totalRacers || derivedTotalRacers;

                                // Structured Horizontal List Card Design
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        className="bento-item past-event-card-horizontal"
                                        style={{
                                            padding: '0',
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            overflow: 'hidden',
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            height: 'auto',
                                            width: '100%',
                                        }}
                                        onClick={() => navigate(`/events/past/${event.id}`)}
                                    >
                                        {/* Image Section - Feature Image */}
                                        <div className="event-image-wrapper" style={{ position: 'relative' }}>
                                            <img
                                                src={event.image || "/event-placeholder.webp"}
                                                alt={event.title}
                                                className="event-image-bg"
                                                onError={(e) => e.target.src = '/event-placeholder.webp'}
                                            />
                                            <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                                <span style={{
                                                    background: 'rgba(0,0,0,0.6)',
                                                    backdropFilter: 'blur(4px)',
                                                    color: '#fff',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    {new Date(event.date).getFullYear()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content Section - Structured Layout */}
                                        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, gap: '8px' }}>

                                            {/* Type Tag */}
                                            <div style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                                {event.type}
                                            </div>

                                            {/* Title */}
                                            <h3 className="event-card-title" style={{ fontSize: '18px', fontWeight: '800', lineHeight: '1.2', color: 'var(--color-text-primary)', margin: 0 }}>
                                                {event.title || event.name || "Untitled Event"}
                                            </h3>

                                            {/* Date & Location */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Calendar size={12} />
                                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)' }}></div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <MapPin size={12} /> {event.location}
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Trophy size={12} color="var(--color-highlight)" />
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-highlight)' }}>
                                                        {typeof displayWinner === 'object' ? 'Review' : displayWinner}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Users size={12} />
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                                                        {displayRacers} Drivers
                                                    </span>
                                                </div>
                                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '600' }}>
                                                    View <ChevronRight size={14} color="var(--color-accent)" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-secondary)', width: '100%' }}>
                                <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>🏁</div>
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '10px' }}>No events found</h3>
                                <p>No completed events found for the selected year.</p>
                            </div>
                        )}
                    </div>

                    {/* Load More Button */}
                    {displayedPastEvents.length < filteredPastEvents.length && (
                        <div style={{ textAlign: 'center', marginTop: '40px' }}>
                            <button
                                onClick={handleLoadMore}
                                className="hero-cta"
                                style={{
                                    padding: '12px 40px',
                                    fontSize: '14px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}
                            >
                                Load More Events
                            </button>
                        </div>
                    )}
                </section>



                {/* Rules & Downloads Section */}
                <section id="rules" style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <h2 className="bento-title" style={{ fontSize: '32px', marginBottom: '30px', borderLeft: '4px solid var(--color-accent)', paddingLeft: '20px' }}>Rules & Resources</h2>
                    <div className="rules-resources-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        <div>
                            <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>Safety & Requirements</h3>
                            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                                {[
                                    'Helmet with properly secured chin strap is mandatory. No exceptions',
                                    'Gloves, closed shoes and pants are mandatory for all drivers',
                                    'Convertibles must be equipped with roll bar protection',
                                    'Zero tolerance for fluid leaks. Any vehicle leaking oil, coolant, or brake fluid will not be allowed on track',
                                    'Any driver found speeding, testing, or driving irresponsibly outside the circuit will be immediately disqualified and banned from leaderboard eligibility',
                                    'Village access roads are narrow and used by residents. Drive slowly and respectfully. Reckless behavior will result in immediate disqualification'
                                ].map((rule, i) => (
                                    <li key={i} style={{ padding: '15px', borderBottom: '1px solid var(--color-surface-hover, rgba(0,0,0,0.1))', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <Shield size={18} color="var(--color-accent)" /> {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>Downloads</h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {(documents || []).length > 0 ? (
                                    (documents || []).map((doc, i) => (
                                        <a key={doc.id || i}
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bento-item"
                                            style={{
                                                minHeight: 'auto',
                                                padding: '15px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontWeight: '600' }}>{doc.title}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{doc.category}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Download size={18} color="var(--color-highlight)" />
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '10px' }}>No documents uploaded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>



                {/* Track Info & Classes */}
                <section style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', padding: 0, gridAutoRows: 'auto' }}>
                        <div className="bento-item" style={{ position: 'relative', padding: '0', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                            <img
                                src={gp1TrackImage}
                                alt="Track Layout"
                                style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.8 }}
                            />
                            <div className="bento-content" style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', padding: '30px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                                <h3 className="bento-title" style={{ fontSize: '24px' }}>Track Layout</h3>
                                <div className="bento-subtitle">GP1 Performance</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                            {vehicleClasses.map((cls, i) => (
                                <div key={i} className="bento-item bright-card" style={{ minHeight: '120px', padding: '0', position: 'relative', overflow: 'hidden' }}>
                                    <div className="bento-bg" style={{ backgroundImage: `url(${cls.img})`, transform: 'scale(1)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                    <div className="bento-content" style={{ padding: '15px', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--card-overlay, linear-gradient(to top, rgba(0,0,0,0.8), transparent))' }}>
                                        <h4 style={{ color: 'var(--color-accent)', fontWeight: '700', fontSize: '14px' }}>{cls.name}</h4>
                                        <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', margin: '4px 0', fontWeight: '600' }}>{cls.desc}</p>
                                        <div style={{ fontSize: '9px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cls.required}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Safety & Compliance Grid */}
                <section style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 className="bento-title" style={{ fontSize: '24px', marginBottom: '60px' }}>Safety & Compliance</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
                        {[
                            { title: 'Medical Support', icon: <Shield size={40} />, desc: 'On-site paramedics and ambulance at every event.' },
                            { title: 'Tech Inspection', icon: <Car size={40} />, desc: 'Mandatory safety checks for all vehicles before track entry.' },
                            { title: 'Professional Marshals', icon: <Flag size={40} />, desc: 'Expert track-side flagging and incident response.' },
                            { title: 'Drivers Briefing', icon: <AlertTriangle size={40} />, desc: 'Compulsory safety meeting before every session.' }
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ color: 'var(--color-accent)', marginBottom: '20px', display: 'inline-block' }}>{item.icon}</div>
                                <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>{item.title}</h4>
                                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

            </div>


        </div>
    );
};

export default Events;
