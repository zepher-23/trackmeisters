import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, Trophy, Users, Flag, MapPin, ArrowUpRight, Mail } from 'lucide-react';
import { useEvents, useBlogs, useClassifieds, useMedia } from '../hooks/useFirebase';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const Hero = ({ config }) => {
    return (
        <section className="hero" style={config?.image ? { backgroundImage: `url(${config.image})` } : {}}>
            <div className="hero-grid"></div>
            <div className="hero-content">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="hero-subtitle"
                    style={config?.taglineColor ? { color: config.taglineColor } : {}}
                >
                    {config?.tagline || "Automotive Excellence"}
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="hero-title"
                    data-text={config?.title || "OWN THE TRACK"}
                    style={config?.titleColor ? { color: config.titleColor, WebkitTextStroke: '0px' } : {}}
                >
                    {config?.title || "OWN THE TRACK"}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{
                        maxWidth: '600px',
                        margin: '0 auto 24px',
                        fontSize: '1.1rem',
                        color: config?.descriptionColor || 'rgba(255, 255, 255, 0.8)',
                        lineHeight: '1.6',
                        fontWeight: '400'
                    }}
                >
                    {config?.description || "India's premier motorsport community. Experience high-octane track days, competitive racing leagues, and exclusive automotive events designed for the true enthusiast."}
                </motion.p>
                <Link to="/events">
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="hero-cta"
                    >
                        Upcoming Events <ChevronRight size={18} />
                    </motion.button>
                </Link>

                {/* Mobile Quick Links */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="hero-mobile-links"
                    style={{
                        marginTop: '32px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        justifyContent: 'center',
                        maxWidth: '100%',
                    }}
                >
                    {[
                        { name: 'Leaderboard', path: '/standings', icon: <Trophy size={14} color="#FFD700" /> },
                        { name: 'Newsletter', path: '/newsletter', icon: <Mail size={14} color="#60A5FA" /> },
                        { name: 'F1 Fantasy', path: '/fantasy-league', icon: <Flag size={14} color="#F87171" /> }
                    ].map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '30px',
                                color: 'white',
                                textDecoration: 'none',
                                fontSize: '13px',
                                fontWeight: '500',
                                letterSpacing: '0.5px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {link.icon}
                            {link.name}
                        </Link>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

const Ticker = () => {
    const { data: events } = useEvents();
    const { data: blogs } = useBlogs();

    // Prepare Ticker Data
    const tickerItems = [];

    // Add Next Race
    const nextEvent = events?.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    if (nextEvent) {
        tickerItems.push({ icon: <Flag size={16} />, text: `NEXT RACE: ${nextEvent.title.toUpperCase()} - ${new Date(nextEvent.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}` });
    }

    // Add Latest News
    const latestNews = blogs?.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
    if (latestNews) {
        tickerItems.push({ icon: <Trophy size={16} />, text: `NEWS: ${latestNews.title.toUpperCase()}` });
    }

    // Add Track Days info
    const trackDay = events?.find(e => e.type === 'Track Day' && new Date(e.date) >= new Date());
    if (trackDay) {
        tickerItems.push({ icon: <Calendar size={16} />, text: `TRACK DAY SLOTS OPEN FOR ${trackDay.location.split(',')[0].toUpperCase()}` });
    }

    // Fallbacks if no data
    if (tickerItems.length === 0) {
        tickerItems.push({ icon: <Flag size={16} />, text: "UPCOMING EVENTS ANNOUNCED SOON" });
        tickerItems.push({ icon: <Trophy size={16} />, text: "JOIN THE CHAMPIONSHIP TODAY" });
    }

    // Duplicate for smooth loop
    const displayItems = [...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems];

    return (
        <div className="ticker-container">
            <div className="ticker-track">
                {displayItems.map((item, i) => (
                    <div key={i} className="ticker-item">{item.icon} {item.text}</div>
                ))}
            </div>
        </div>
    );
};

const BentoGrid = ({ config }) => {
    const { data: events, loading: eventsLoading } = useEvents();
    const { data: blogs, loading: blogsLoading } = useBlogs();
    const { data: classifieds, loading: classifiedsLoading } = useClassifieds();

    // Process Events
    const upcomingEvents = events
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const nextEvent = upcomingEvents[0];
    const trackDays = upcomingEvents.filter(e => e.type === 'Track Day').slice(0, 3);

    // Process News
    const latestNews = blogs
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];

    // Process Classifieds (High Price or Random Featured)
    const featuredCar = classifieds
        .filter(c => c.isPublished !== false)
        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))[0];

    const handleMouseMove = (e) => {
        const { currentTarget: target } = e;
        if (target.dataset.isTicking === 'true') return;
        target.dataset.isTicking = 'true';
        requestAnimationFrame(() => {
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            target.style.setProperty("--mouse-x", `${x}px`);
            target.style.setProperty("--mouse-y", `${y}px`);
            target.dataset.isTicking = 'false';
        });
    };

    if (eventsLoading || blogsLoading || classifiedsLoading) {
        return (
            <section className="bento-grid">
                <div className="bento-item large" style={{ background: '#1a1a1a', animation: 'pulse 2s infinite' }}></div>
                <div className="bento-item" style={{ background: '#1a1a1a', animation: 'pulse 2s infinite' }}></div>
                <div className="bento-item" style={{ background: '#1a1a1a', animation: 'pulse 2s infinite' }}></div>
                <div className="bento-item wide" style={{ background: '#1a1a1a', animation: 'pulse 2s infinite' }}></div>
                <div className="bento-item tall" style={{ background: '#1a1a1a', animation: 'pulse 2s infinite' }}></div>
                <div className="bento-item" style={{ background: '#1a1a1a', animation: 'pulse 2s infinite' }}></div>
            </section>
        );
    }

    return (
        <section className="bento-grid">
            {/* LARGE: Next Big Event */}
            <Link to="/events" style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="bento-item large"
                    onMouseMove={handleMouseMove}
                    style={config?.nextEvent?.textColor ? { color: config.nextEvent.textColor } : {}}
                >
                    <div className="bento-bg">
                        <img
                            src={config?.nextEvent?.overrideImage || nextEvent?.image || "/gt3-endurance.webp"}
                            alt={nextEvent?.title || "Featured Event"}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }}
                        />
                    </div>
                    <div className="bento-content">
                        <div className="bento-subtitle">{config?.nextEvent?.subtitle || (nextEvent ? new Date(nextEvent.date).toLocaleDateString('en-GB') : "Coming Soon")}</div>
                        <div className="bento-title">{config?.nextEvent?.title || nextEvent?.title || "Season 2026"}</div>
                        <p style={{ color: config?.nextEvent?.textColor ? 'inherit' : '#aaa', marginTop: 10, maxWidth: '80%', fontSize: '15px', opacity: 0.8 }}>
                            {nextEvent ? `${nextEvent.type} at ${nextEvent.location}` : "Check back for upcoming race events."}
                        </p>
                        <button className="hero-cta" style={{ marginTop: 30, color: 'inherit', borderColor: 'currentColor' }}>View Calendar <ChevronRight size={16} /></button>
                    </div>
                </motion.div>
            </Link>

            {/* MEDIUM: Track Days List */}
            <Link to="/events?type=Track%20Day" style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="bento-item"
                    onMouseMove={handleMouseMove}
                    style={config?.trackDays?.textColor ? { color: config.trackDays.textColor } : {}}
                >
                    <div className="bento-bg">
                        <img src={config?.trackDays?.overrideImage || "/track-days.webp"} alt="Track Days" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
                    </div>
                    <div className="bento-content">
                        <MapPin size={32} color={config?.trackDays?.textColor || "var(--color-accent)"} style={{ marginBottom: 20 }} />
                        <div className="bento-title" style={{ fontSize: 24 }}>{config?.trackDays?.title || "Next Track Days"}</div>
                        <div className="bento-subtitle" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                            {config?.trackDays?.subtitle ? (
                                <span style={{ fontSize: '13px' }}>{config.trackDays.subtitle}</span>
                            ) : trackDays.length > 0 ? (
                                trackDays.map(td => (
                                    <span key={td.id} style={{ fontSize: '13px' }}>
                                        {td.location.split(',')[0]} &bull; {new Date(td.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                ))
                            ) : (
                                <span>No available dates</span>
                            )}
                        </div>
                    </div>
                </motion.div>
            </Link>

            {/* MEDIUM: Community (Static) */}
            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item"
                onMouseMove={handleMouseMove}
                style={config?.community?.textColor ? { color: config.community.textColor } : {}}
            >
                <div className="bento-bg">
                    <img src={config?.community?.overrideImage || "/community.webp"} alt="Community" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
                </div>
                <div className="bento-content">
                    <Users size={32} color={config?.community?.textColor || "var(--color-highlight)"} style={{ marginBottom: 20 }} />
                    <div className="bento-title" style={{ fontSize: 24 }}>{config?.community?.title || "Community"}</div>
                    <div className="bento-subtitle">{config?.community?.subtitle || "Join 50k+ Drivers"}</div>
                </div>
            </motion.div>

            {/* WIDE: Latest News */}
            <Link to={latestNews ? `/news/${latestNews.id}` : '/news'} style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="bento-item wide"
                    onMouseMove={handleMouseMove}
                    style={config?.news?.textColor ? { color: config.news.textColor } : {}}
                >
                    <div className="bento-bg">
                        <img
                            src={config?.news?.overrideImage || latestNews?.coverImage || "/porsche-news.webp"}
                            alt={config?.news?.title || latestNews?.title || "Latest News"}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }}
                        />
                    </div>
                    <div className="bento-content">
                        <div className="bento-subtitle">{config?.news?.subtitle || latestNews?.category || "Latest News"}</div>
                        <div className="bento-title">{config?.news?.title || latestNews?.title || "Porsche 911 GT3 RS: Track Weapon"}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15, color: config?.news?.textColor || 'var(--color-accent)', fontWeight: 600, fontSize: '14px' }}>
                            Read Article <ArrowUpRight size={18} />
                        </div>
                    </div>
                </motion.div>
            </Link>

            {/* TALL: Featured Classified */}
            <Link to="/classifieds" style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="bento-item tall"
                    onMouseMove={handleMouseMove}
                    style={config?.classifieds?.textColor ? { color: config.classifieds.textColor } : {}}
                >
                    <div className="bento-bg">
                        <img
                            src={config?.classifieds?.overrideImage || featuredCar?.featuredImage || featuredCar?.images?.[0] || "/nurburgring.webp"}
                            alt="Featured Car"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }}
                        />
                    </div>
                    <div className="bento-content">
                        <div className="bento-subtitle">{config?.classifieds?.subtitle || "Featured Listing"}</div>
                        <div className="bento-title">
                            {config?.classifieds?.title || (featuredCar ? `${featuredCar.year} ${featuredCar.make} ${featuredCar.model}` : "Marketplace")}
                        </div>
                        {featuredCar && (
                            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                                <span style={{
                                    background: config?.classifieds?.textColor || 'var(--color-accent)',
                                    color: config?.classifieds?.textColor ? '#000' : 'white',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold'
                                }}>
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(featuredCar.price).replace('INR', '₹')}
                                </span>
                            </div>
                        )}
                        {!featuredCar && (
                            <ul style={{ marginTop: 30, listStyle: 'none', color: config?.classifieds?.textColor ? 'inherit' : '#ccc', fontSize: '14px', fontFamily: 'monospace', opacity: 0.8 }}>
                                <li style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>
                                    <span style={{ color: 'inherit' }}>Browse</span>
                                    <span style={{ color: config?.classifieds?.textColor || 'var(--color-accent)' }}>Cars</span>
                                </li>
                            </ul>
                        )}
                    </div>
                </motion.div>
            </Link>

            {/* WIDE: Leaderboard */}
            <Link to="/standings" style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="bento-item wide"
                    onMouseMove={handleMouseMove}
                >
                    <div className="bento-bg" style={{ background: '#000' }}>
                        <img
                            src="/event-race.webp"
                            alt="Leaderboard"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1541348263662-e068662d82af?q=80&w=1000&auto=format&fit=crop';
                            }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #000 30%, rgba(0,0,0,0.6) 60%, transparent 100%)' }}></div>
                    </div>
                    <div className="bento-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div className="bento-subtitle">Season 2026</div>
                                <div className="bento-title" style={{ fontSize: 28 }}>Standings</div>
                            </div>
                            <Trophy size={24} color="#FFD700" />
                        </div>

                        {/* Mini Leaderboard Table */}
                        <div style={{ marginTop: 20, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(() => {
                                // Logic to calculate standings (simplified from Standings.jsx)
                                const pastEventsRaw = (events || []).filter(e => e.status === 'completed');
                                const drivers = {};
                                const parseLapTime = (timeStr) => {
                                    if (!timeStr) return Infinity;
                                    const cleanStr = timeStr.trim();
                                    let minutes = 0, seconds = 0;
                                    if (cleanStr.includes(':')) {
                                        const parts = cleanStr.split(':');
                                        minutes = parseFloat(parts[0]) || 0;
                                        seconds = parseFloat(parts[1]) || 0;
                                    } else {
                                        seconds = parseFloat(cleanStr) || 0;
                                    }
                                    return (minutes * 60) + seconds;
                                };

                                pastEventsRaw.forEach(event => {
                                    if (event.classResults) {
                                        Object.values(event.classResults).forEach(results => {
                                            if (!Array.isArray(results) || results.length === 0) return;
                                            const sortedResults = [...results].sort((a, b) => parseLapTime(a.time) - parseLapTime(b.time));

                                            // Winner
                                            const winner = sortedResults[0];
                                            if (winner && winner.driver) {
                                                const winName = winner.driver.trim();
                                                if (!drivers[winName]) drivers[winName] = { wins: 0, fastestLap: Infinity };
                                                drivers[winName].wins += 1;
                                            }

                                            // Fastest laps
                                            results.forEach(r => {
                                                if (!r.driver) return;
                                                const name = r.driver.trim();
                                                if (!drivers[name]) drivers[name] = { wins: 0, fastestLap: Infinity };
                                                const timeMs = parseLapTime(r.time);
                                                if (timeMs < drivers[name].fastestLap) drivers[name].fastestLap = timeMs;
                                            });
                                        });
                                    }
                                });

                                let data = Object.entries(drivers)
                                    .map(([name, stats]) => ({ driver: name, wins: stats.wins, fastestLapMs: stats.fastestLap }))
                                    .sort((a, b) => (b.wins !== a.wins) ? b.wins - a.wins : a.fastestLapMs - b.fastestLapMs)
                                    .slice(0, 6);

                                // Fallback if no real data
                                if (data.length === 0) {
                                    data = [
                                        { driver: 'Marcus Thorne', wins: 3 },
                                        { driver: 'Sarah Jenkins', wins: 1 },
                                        { driver: 'Viktor Rossi', wins: 1 },
                                        { driver: 'Alex Morgan', wins: 0 },
                                        { driver: 'David Chen', wins: 0 },
                                        { driver: 'James Wilson', wins: 0 },
                                    ];
                                }

                                return data.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--color-text-secondary)', fontWeight: 'bold', width: '15px' }}>{i + 1}</span>
                                            <span style={{ color: '#fff' }}>{d.driver}</span>
                                        </div>
                                        <div style={{ color: 'var(--color-text-secondary)' }}>{d.wins} Win{d.wins !== 1 ? 's' : ''}</div>
                                    </div>
                                ));
                            })()}
                        </div>

                        <div style={{ marginTop: 15, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-accent)', fontWeight: 600, fontSize: '12px' }}>
                            Full Standings <ArrowUpRight size={14} />
                        </div>
                    </div>
                </motion.div>
            </Link>

            {/* MEDIUM: Sponsorships (Static) */}
            <Link to="/contact" style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}>
                <motion.div
                    whileHover={{ scale: 0.98 }}
                    className="bento-item"
                    onMouseMove={handleMouseMove}
                    style={config?.sponsorship?.textColor ? { color: config.sponsorship.textColor } : {}}
                >
                    <div className="bento-bg">
                        <img src={config?.sponsorship?.overrideImage || "/sponsorship.webp"} alt="Sponsorship" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
                    </div>
                    <div className="bento-content">
                        <div className="bento-title" style={{ fontSize: 24 }}>{config?.sponsorship?.title || "Sponsorships"}</div>
                        <div className="bento-subtitle">{config?.sponsorship?.subtitle || "Partner with us"}</div>
                        <ArrowUpRight size={24} style={{ position: 'absolute', bottom: 40, right: 40, color: config?.sponsorship?.textColor || 'white' }} />
                    </div>
                </motion.div>
            </Link>
        </section>
    );
};

const Section = ({ title, subtitle, description, linkText, linkTo, image, align = 'left', stats = [] }) => (
    <section style={{
        padding: '60px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{ maxWidth: '1200px', width: '100%', display: 'grid', gridTemplateColumns: align === 'left' ? '1.2fr 0.8fr' : '0.8fr 1.2fr', gap: '40px', alignItems: 'center' }}>
            {align === 'left' ? (
                <>
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div style={{ color: 'var(--color-accent)', fontWeight: 'bold', letterSpacing: '1.5px', marginBottom: '8px', fontSize: '14px' }}>{subtitle}</div>
                        <h2 style={{ fontSize: '2rem', lineHeight: 1.2, marginBottom: '16px' }}>{title}</h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '480px' }}>{description}</p>

                        {stats.length > 0 && (
                            <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                {stats.map((stat, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>{stat.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '1px' }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Link to={linkTo} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem' }}>
                            {linkText} <div style={{ background: 'var(--color-accent)', borderRadius: '50%', padding: '6px', display: 'flex' }}><ArrowUpRight size={16} /></div>
                        </Link>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ position: 'relative', maxWidth: '400px', margin: '0 0 0 auto' }}
                    >
                        <div style={{ position: 'absolute', top: -15, right: -15, width: '60px', height: '60px', border: '1px solid var(--color-accent)', zIndex: 0 }}></div>
                        <img src={image} alt={title} style={{ width: '100%', borderRadius: '4px', position: 'relative', zIndex: 1, transition: 'transform 0.5s' }}
                        />
                    </motion.div>
                </>
            ) : (
                <>
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ position: 'relative', maxWidth: '400px', margin: '0 auto 0 0' }}
                    >
                        <div style={{ position: 'absolute', bottom: -15, left: -15, width: '60px', height: '60px', border: '1px solid var(--color-accent)', zIndex: 0 }}></div>
                        <img src={image} alt={title} style={{ width: '100%', borderRadius: '4px', position: 'relative', zIndex: 1, transition: 'transform 0.5s' }}
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div style={{ color: 'var(--color-accent)', fontWeight: 'bold', letterSpacing: '1.5px', marginBottom: '8px', fontSize: '14px' }}>{subtitle}</div>
                        <h2 style={{ fontSize: '2rem', lineHeight: 1.2, marginBottom: '16px' }}>{title}</h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '480px' }}>{description}</p>

                        {stats.length > 0 && (
                            <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                                {stats.map((stat, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>{stat.value}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginTop: '5px', letterSpacing: '1px' }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Link to={linkTo} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem' }}>
                            {linkText} <div style={{ background: 'var(--color-accent)', borderRadius: '50%', padding: '6px', display: 'flex' }}><ArrowUpRight size={16} /></div>
                        </Link>
                    </motion.div>
                </>
            )}
        </div>
    </section>
);

const Home = () => {
    const { data: events } = useEvents();
    const { data: media } = useMedia();
    const { data: classifieds } = useClassifieds();
    const [config, setConfig] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            if (!db) return;
            try {
                const docRef = doc(db, 'site_content', 'homepage');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setConfig(docSnap.data());
                }
            } catch (error) {
                console.error("Error loading homepage config:", error);
            }
        };
        fetchConfig();
    }, []);

    // Calculate Dynamic Stats
    const upcomingEventsCount = events ? events.filter(e => new Date(e.date) >= new Date()).length : 0;
    const nextEventLocation = events && events.length > 0
        ? events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.location?.split(',')[0] || 'TBA'
        : 'TBA';

    const mediaCount = media ? media.length : 0;
    const classifiedsCount = classifieds ? classifieds.filter(c => c.isPublished !== false).length : 0;

    return (
        <>
            <Hero config={config?.hero} />
            <Ticker />
            <BentoGrid config={config?.bento} />

            <Section
                subtitle="EXPERIENCE THE THRILL"
                title="Upcoming Events"
                description="Join us at world-class circuits for track days, competitive racing, and community meetups. Whether you're a novice or a pro, there's a slot on the grid for you."
                linkText="View Calendar"
                linkTo="/events"
                image="/event-track-day.webp"
                align="left"
                stats={[
                    { value: upcomingEventsCount, label: 'Upcoming Events' },
                    { value: nextEventLocation, label: 'Next Race' }
                ]}
            />

            <Section
                subtitle="VISUAL EXCITEMENT"
                title="Media Gallery"
                description="Relive the highlights. Browse high-definition photography and cinematic films from our latest events. Download your track side memories."
                linkText="Explore Gallery"
                linkTo="/media"
                image="/media/season-highlights.webp"
                align="right"
                stats={[
                    { value: `${mediaCount > 0 ? mediaCount + '+' : 500}`, label: 'Photos & Videos' },
                    { value: '4K', label: 'Quality' }
                ]}
            />

            <Section
                subtitle="THE MARKETPLACE"
                title="Classifieds"
                description="Buy and sell premium performance cars and parts. A curated marketplace for the Trackmeisters community to find their next track weapon."
                linkText="Browse Listings"
                linkTo="/classifieds"
                image="/gt3-endurance.webp"
                align="left"
                stats={[
                    { value: classifiedsCount, label: 'Active Listings' },
                    { value: 'Verified', label: 'Sellers' }
                ]}
            />

            <Section
                subtitle="WHO WE ARE"
                title="About Trackmeisters"
                description="Born from a passion for motorsport, we are a community dedicated to the pursuit of driving excellence. Learn about our history, our mission, and the team behind the events."
                linkText="Learn More"
                linkTo="/about"
                image="/community.webp"
                align="right"
                stats={[
                    { value: '2015', label: 'Established' },
                    { value: '50k+', label: 'Community Members' }
                ]}
            />
        </>
    );
};

export default Home;
