import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Trophy, Clock, Shield, AlertTriangle, Download, ChevronRight, Car, Flag } from 'lucide-react';

const Events = () => {
    const [activeTab, setActiveTab] = useState('upcoming');

    // Sample data for events
    const upcomingEvents = [
        {
            id: 1,
            title: 'Summer Track Day',
            date: 'Aug 15, 2026',
            location: 'Silverstone Circuit',
            type: 'Track Day',
            image: '/event-track-day.png',
            slots: '15/40'
        },
        {
            id: 2,
            title: 'GT3 Cup Round 4',
            date: 'Sept 02, 2026',
            location: 'Brands Hatch',
            type: 'Race',
            image: '/event-race.png',
            slots: 'Open'
        },
        {
            id: 3,
            title: 'JDM Legends Meet',
            date: 'Sept 10, 2026',
            location: 'Ace Cafe',
            type: 'Meetup',
            image: '/event-meetup.png',
            slots: 'Free'
        },
    ];

    const pastEvents = [
        { id: 101, title: 'Spring Time Attack', date: 'April 10, 2026', location: 'Donington Park', winner: 'Alex M. (1:14.2)' },
        { id: 102, title: 'Endurance Qualifier', date: 'May 22, 2026', location: 'Silverstone', winner: 'Team Redline' },
    ];

    const vehicleClasses = [
        { name: 'Street Class', desc: 'Road legal cars with minimal mods', required: 'DOT Tires, Helmet', img: 'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Club Sport', desc: 'Roll cage required, semi-slicks', required: 'HANS Device, Race Suit', img: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Unlimited', desc: 'No restrictions, full race builds', required: 'FIA Homologation', img: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop' },
        { name: 'GT3 Class', desc: 'Official GT3 spec race cars', required: 'Full Cage, Fire Sys', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop' },
        { name: 'Time Attack', desc: 'Pure lap time competition builds', required: 'Aero Kit, Slick Tires', img: '/time-attack.png' },
        { name: 'Classic Series', desc: 'Vintage performance vehicles', required: 'Period Correct Mods', img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=1000&auto=format&fit=crop' },
    ];

    return (
        <div className="app-container">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>

                {/* Events Hero */}
                <section style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>
                    <div className="events-hero-grid" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hero-title"
                        style={{ fontSize: '4rem', marginBottom: '20px', position: 'relative', zIndex: 2 }}
                        data-text="RACING CALENDAR"
                    >
                        RACING CALENDAR
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 2 }}
                    >
                        Join the ultimate motorsport community. From casual track days to competitive league racing.
                    </motion.p>
                </section>

                {/* Event Types */}
                <section style={{ padding: '60px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <h2 className="bento-title" style={{ fontSize: '24px', marginBottom: '40px', borderLeft: '4px solid var(--color-accent)', paddingLeft: '20px' }}>Event Types</h2>
                    <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gridAutoRows: 'auto' }}>
                        {[
                            { title: 'Track Days', icon: <Clock size={32} />, desc: 'Open pit lane sessions for all skill levels. Improve your lap times in a safe environment.', img: '/event-track-day.png' },
                            { title: 'Competitive Racing', icon: <Trophy size={32} />, desc: 'Wheel-to-wheel action in various classes. Points championships with season-end prizes.', img: '/event-race.png' },
                            { title: 'Car Meets', icon: <Car size={32} />, desc: 'Social gatherings to admire builds, share knowledge, and connect with fellow enthusiasts.', img: '/event-meetup.png' }
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

                {/* Registration & Tickets */}
                <section className="registration-section" style={{ padding: '60px 20px', maxWidth: '1400px', margin: '0 auto 40px', borderRadius: '12px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h2 className="bento-title" style={{ fontSize: '32px' }}>Registration & Tickets</h2>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Choose your experience level and secure your spot.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {[
                            { title: 'Spectator Pass', price: '$25', features: ['General Admission', 'Paddock Access', 'Live Timing App'], button: 'Get Pass' },
                            { title: 'Track Day Entry', price: '$299', features: ['Full Day Access', 'Instructor Option', 'Paddock Garage'], button: 'Register' },
                            { title: 'VIP Grid Access', price: '$499', features: ['Hospitality Suite', 'Grid Walk', 'Driver Meet & Greet'], button: 'Go VIP' }
                        ].map((pkg, i) => (
                            <div key={i} className="bento-item" style={{ minHeight: 'auto', textAlign: 'center', padding: '40px 30px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>{pkg.title}</h3>
                                <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--color-accent)', marginBottom: '20px' }}>{pkg.price}</div>
                                <ul style={{ listStyle: 'none', marginBottom: '30px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                    {pkg.features.map((f, j) => <li key={j} style={{ marginBottom: '10px' }}>{f}</li>)}
                                </ul>
                                <button className="hero-cta" style={{ width: '100%', justifyContent: 'center' }}>{pkg.button}</button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Main Content Tabs */}
                <section style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', borderBottom: '1px solid var(--color-surface-hover, rgba(0,0,0,0.1))' }}>
                        {['upcoming', 'past', 'rules'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '15px 30px',
                                    background: 'transparent',
                                    color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                    borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    fontSize: '14px'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'upcoming' && (
                        <div style={{ display: 'grid', gap: '30px' }}>
                            {upcomingEvents.map(event => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="upcoming-event-card"
                                >
                                    <div className="event-image-wrapper">
                                        <div className="event-image-bg" style={{ backgroundImage: `url(${event.image})` }}></div>
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
                                            <button className="hero-cta">Register Now</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'past' && (
                        <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', padding: 0 }}>
                            {pastEvents.map(event => (
                                <div key={event.id} className="bento-item" style={{ minHeight: 'auto' }}>
                                    <div style={{ opacity: 0.5, marginBottom: '10px' }}>{event.date}</div>
                                    <h4 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{event.title}</h4>
                                    <p>{event.location}</p>
                                    <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255, 42, 42, 0.1)', border: '1px solid var(--color-accent)', borderRadius: '4px', fontSize: '14px' }}>
                                        <Trophy size={14} style={{ display: 'inline', marginRight: '5px' }} />
                                        Winner: {event.winner}
                                    </div>
                                    <button style={{ marginTop: '15px', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        View Results <ChevronRight size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'rules' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                            <div>
                                <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>Safety & Requirements</h3>
                                <ul style={{ listStyle: 'none', space: 'y-4' }}>
                                    {[
                                        'Helmet Snell SA2020 or newer required',
                                        'Tow hook must be installed',
                                        'Convertibles must have roll bar',
                                        'No leaks (oil, coolant, fluid)',
                                        'Long sleeve shirt and pants required'
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
                                    {['Tech Inspection Form', 'Flags & Rules Handbook', 'Parental Waiver', 'Track Map PDF'].map((doc, i) => (
                                        <div key={i} className="bento-item" style={{ minHeight: 'auto', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                            <span>{doc}</span>
                                            <Download size={18} color="var(--color-highlight)" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Track Info & Classes */}
                <section style={{ padding: '60px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', padding: 0, gridAutoRows: 'auto' }}>
                        <div className="bento-item" style={{ position: 'relative', padding: '0', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                            <img
                                src="/track-map.png"
                                alt="Track Layout"
                                style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.8 }}
                            />
                            <div className="bento-content" style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', padding: '30px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                                <h3 className="bento-title" style={{ fontSize: '24px' }}>Track Layout</h3>
                                <div className="bento-subtitle">Silverstone GP</div>
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
                <section style={{ padding: '60px 20px', maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
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
