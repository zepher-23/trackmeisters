import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Trophy,
    Zap,
    ShieldCheck,
    Star,
    TrendingUp,
    ChevronRight,
    Award,
    BarChart3,
    Heart,
    Flame,
    Navigation
} from 'lucide-react';

const Drivers = () => {
    const [hoveredDriver, setHoveredDriver] = useState(null);

    const drivers = [
        {
            id: 1,
            name: 'Alex "The Ghost" Morgan',
            subtitle: 'GT3 Endurance Champion',
            stats: { wins: 12, podiums: 28, fastLaps: 15 },
            bio: 'Known for surgical precision and late-braking maneuvers. Alex has been a dominant force in the GT3 circuit for over 5 years.',
            image: '/drivers/driver1.webp',
            rank: 'Platinum',
            car: 'Porsche 911 GT3 R'
        },
        {
            id: 2,
            name: 'Sarah "Apex" Jenkins',
            subtitle: 'Time Attack Specialist',
            stats: { wins: 8, podiums: 14, fastLaps: 22 },
            bio: 'A specialist in extracting every millisecond from the track. Sarah holds 4 track records across Europe.',
            image: '/drivers/driver2.webp',
            rank: 'Gold',
            car: 'Alpine A110 Cup'
        },
        {
            id: 3,
            name: 'Viktor "Vintage" Rossi',
            subtitle: 'Classic Series Legend',
            stats: { wins: 45, podiums: 82, fastLaps: 31 },
            bio: 'With decades of experience, Viktor brings the soul of classic racing to the modern track. A true mentor to the rookie program.',
            image: '/drivers/driver3.webp',
            rank: 'Legend',
            car: 'Maserati 250F (Historic)'
        }
    ];


    return (
        <div className="app-container drivers-page">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>

                {/* Hero Section */}
                <section className="drivers-hero-section" style={{ padding: '100px 20px', textAlign: 'center', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>
                    <div className="events-hero-grid" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.3 }}></div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <motion.h1
                            className="hero-title"
                            style={{ fontSize: '5rem', marginBottom: '20px' }}
                            data-text="ELITE DRIVERS"
                        >
                            ELITE DRIVERS
                        </motion.h1>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '700px', margin: '0 auto', fontSize: '18px' }}>
                            Meet the masters of the asphalt. From raw talent to seasoned legends, our community represents the peak of automotive passion.
                        </p>
                    </motion.div>
                </section>

                {/* Driver Profiles Section */}
                <section style={{ padding: '80px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '50px' }}>
                        <h2 className="bento-title" style={{ fontSize: '32px', margin: 0 }}>Driver Profiles</h2>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-accent)' }}>1.2k</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }} className="stat-label">Active Drivers</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-highlight)' }}>45</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }} className="stat-label">Pro Licenses</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                        {drivers.map((driver) => (
                            <motion.div
                                key={driver.id}
                                className="bento-item driver-card-light"
                                style={{
                                    padding: 0,
                                    overflow: 'hidden',
                                    minHeight: '500px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: hoveredDriver === driver.id ? '1px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.3s ease'
                                }}
                                onHoverStart={() => setHoveredDriver(driver.id)}
                                onHoverEnd={() => setHoveredDriver(null)}
                            >
                                <div style={{ height: '300px', position: 'relative', overflow: 'hidden' }}>
                                    <motion.div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundImage: `url(${driver.image})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                        animate={{ scale: hoveredDriver === driver.id ? 1.05 : 1 }}
                                        transition={{ duration: 0.6 }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: '100%',
                                        padding: '20px',
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-end'
                                    }}>
                                        <div>
                                            <div style={{ color: 'var(--color-accent)', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', marginBottom: '5px' }}>
                                                {driver.rank} Class
                                            </div>
                                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>{driver.name}</h3>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', backdropFilter: 'blur(5px)', color: '#fff' }}>
                                            {driver.car}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '30px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                                        {driver.bio}
                                    </p>
                                    <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                        <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }} className="stat-value">{driver.stats.wins}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }} className="stat-label">Wins</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }} className="stat-value">{driver.stats.podiums}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }} className="stat-label">Podiums</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }} className="stat-value">{driver.stats.fastLaps}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }} className="stat-label">Fast Laps</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Rookie Program Section */}
                <section style={{ padding: '100px 20px', background: 'var(--color-surface-hover)' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '60px', alignItems: 'center' }}>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <div style={{ color: 'var(--color-accent)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px' }}>The Academy</div>
                            <h2 className="hero-title" style={{ fontSize: '3.5rem', textAlign: 'left', marginBottom: '30px' }} data-text="ROOKIE PROGRAM">ROOKIE PROGRAM</h2>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '18px', lineHeight: '1.8', marginBottom: '40px' }}>
                                Every legend started somewhere. Our Rookie Program provides the foundation for tomorrow's champions. Under the guidance of professional instructors, you'll learn race craft, telemetry analysis, and precision driving.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                                <div>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#fff' }} className="academy-feature-title">
                                        <Navigation size={18} color="var(--color-accent)" /> Track Basics
                                    </h4>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Mastering the racing line and braking zones.</p>
                                </div>
                                <div>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#fff' }} className="academy-feature-title">
                                        <ShieldCheck size={18} color="var(--color-accent)" /> Safety First
                                    </h4>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Advanced car control and emergency maneuvers.</p>
                                </div>
                            </div>
                            <button className="hero-cta">Apply to Academy <ChevronRight size={18} /></button>
                        </motion.div>
                        <div style={{ position: 'relative' }}>
                            <img
                                src="/drivers/rookie.webp"
                                alt="Rookie Training"
                                style={{ width: '100%', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                background: 'var(--color-accent)',
                                padding: '20px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 10px 30px rgba(255, 42, 42, 0.3)'
                            }}>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>94%</div>
                                <div style={{ fontSize: '10px', color: '#fff', textTransform: 'uppercase', opacity: 0.8 }}>Pro License Rate</div>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Progress & Stats (Optional Feature) */}
                <section style={{ padding: '80px 20px', background: 'var(--color-bg)' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px' }}>
                            {[
                                { label: 'Total Laps', icon: <TrendingUp />, value: '458,922', color: 'var(--color-accent)' },
                                { label: 'Trophies Awarded', icon: <Award />, value: '1,204', color: 'var(--color-highlight)' },
                                { label: 'Active Regions', icon: <Navigation />, value: '24', color: '#fff' },
                                { label: 'Safety Index', icon: <ShieldCheck />, value: '98.5%', color: '#25D366' }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    className="bento-item"
                                    style={{ padding: '30px', textAlign: 'center', minHeight: 'auto' }}
                                    whileHover={{ y: -5 }}
                                >
                                    <div style={{ color: stat.color, marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                                        {React.cloneElement(stat.icon, { size: 32 })}
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--color-text-primary)', marginBottom: '5px' }}>{stat.value}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Vehicle Showcase (Optional Feature) */}
                <section style={{ padding: '100px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                        <h2 className="bento-title" style={{ fontSize: '32px', textAlign: 'center' }}>The Machines</h2>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Explore the vehicles powering our top-tier performance.</p>
                    </div>
                    <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', padding: 0 }}>
                        <div className="bento-item large" style={{ padding: 0, overflow: 'hidden' }}>
                            <img src="/drivers/vehicle1.webp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Track Car" />
                            <div className="bento-content" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '40px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                                <div className="bento-subtitle">Ultimate Performance</div>
                                <h3 className="bento-title">GT3 RS TRACK SPEC</h3>
                                <p style={{ color: '#ccc', fontSize: '14px', marginTop: '10px' }}>525 HP, 4.0L Flat-Six. The benchmark for street-legal track performance.</p>
                            </div>
                        </div>
                        <div className="bento-item" style={{ padding: '40px', background: 'var(--color-accent)' }}>
                            <Flame size={48} color="#fff" style={{ marginBottom: '20px' }} />
                            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', marginBottom: '20px' }}>Custom Tuning</h3>
                            <p style={{ color: '#fff', opacity: 0.9, marginBottom: '30px' }}>Our in-house engineers provide custom suspension and aero tuning for all club members.</p>
                            <button className="hero-cta tuner-btn">Consult a Tuner</button>
                        </div>
                        <div className="bento-item" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '40px' }}>
                                <BarChart3 size={32} color="var(--color-highlight)" style={{ marginBottom: '20px' }} />
                                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '15px' }}>Live Telemetry</h3>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Analyze your sector times and braking points with our real-time GPS tracking system.</p>
                            </div>
                            <div style={{ height: '150px', background: 'rgba(255,255,255,0.05)', marginTop: 'auto', display: 'flex', alignItems: 'flex-end', padding: '0 20px', gap: '5px' }}>
                                {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75, 60].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        style={{ flex: 1, background: 'var(--color-highlight)', height: `${h}%`, opacity: 0.5 + h / 200, borderRadius: '4px 4px 0 0' }}
                                        animate={{ height: [`${h}%`, `${Math.min(100, h + 15)}%`, `${h}%`] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Drivers;
