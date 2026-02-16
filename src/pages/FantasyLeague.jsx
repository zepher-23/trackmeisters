import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Trophy, Users, Flag, CheckCircle, AlertCircle, Loader2, ArrowRight, Settings, Gauge, Crown, TrendingUp, DollarSign, ChevronRight, BarChart3, HelpCircle, Zap, Shield, Target } from 'lucide-react';
import { COLLECTIONS, addDocument } from '../lib/firebase';

import f1Red from '../assets/f1-red.svg';
import f1White from '../assets/f1-white.svg';
import heroBgImage from '../assets/f1_fantasy_hero.png';

const FantasyLeague = () => {
    // ...
    // ... (rest of component)
    // ...

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        teamName: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            await addDocument(COLLECTIONS.REGISTRATIONS, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                teamName: formData.teamName,
                type: 'f1_fantasy',
                status: 'confirmed',
                createdAt: new Date().toISOString()
            });

            setStatus({ type: 'success', message: 'Welcome to the Fantasy League! You have been successfully registered.' });
            setFormData({ name: '', email: '', phone: '', teamName: '' });

        } catch (error) {
            console.error("Fantasy Registration Error:", error);
            setStatus({ type: 'error', message: 'Failed to register. Please check your connection and try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div ref={containerRef} style={styles.container}>
            {/* Hero Section: Official Briefing */}
            <section style={styles.hero}>
                <motion.div
                    className="fantasy-hero-bg"
                    style={{ ...styles.heroBg, y: heroY }}
                />
                <div className="fantasy-hero-overlay" style={styles.heroOverlay} />

                {/* Huge F1 Logo on Right */}
                <motion.div
                    className="fantasy-f1-logo"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 0.8, x: 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{
                        position: 'absolute',
                        zIndex: 2,
                        pointerEvents: 'none'
                        // right/top handled by CSS class now
                    }}
                >
                    <img
                        src={f1White}
                        alt="F1 Logo Dark"
                        className="theme-logo-dark"
                        style={{ width: '100%', height: 'auto' }}
                    />
                    <img
                        src={f1Red}
                        alt="F1 Logo Light"
                        className="theme-logo-light"
                        style={{ width: '100%', height: 'auto' }}
                    />
                </motion.div>

                <div className="fantasy-hero-content" style={styles.heroContent}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Huge F1 Logo on Right */}
                        <div style={styles.badge}>OFFICIAL LEAGUE</div>
                        <h1 className="hero-title fantasy-hero-title" style={styles.heroTitle}>
                            F1 FANTASY<br />
                            <span style={{ color: 'var(--color-accent)' }}>CHAMPIONSHIP</span>
                        </h1>
                        <p style={styles.heroSubtitle}>
                            Build your team. Manage the cap. Dominate the grid.
                            <br />The ultimate strategy challenge for F1 fans.
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => document.getElementById('register').scrollIntoView({ behavior: 'smooth' })}
                            style={styles.ctaButton}
                        >
                            Start Season <ArrowRight size={18} />
                        </motion.button>
                    </motion.div>
                </div>

                {/* Tech Lines */}
                <div style={styles.gridLines} />
            </section>

            {/* Section: The Regulations (How to Play Timeline) */}
            <section style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>THE REGULATIONS</h2>
                    <div style={styles.sectionLine} />
                </div>

                <div style={styles.timelineContainer}>
                    {[
                        { step: '01', title: 'Sign Up', desc: 'Register your Team Principal license.' },
                        { step: '02', title: 'Construct', desc: 'Select 5 Drivers + 2 Constructors within $100M.' },
                        { step: '03', title: 'Manage', desc: 'Apply chips and make transfers before qualifying.' },
                        { step: '04', title: 'Compete', desc: 'Score points based on real-world race results.' }
                    ].map((item, i) => (
                        <div key={i} style={styles.timelineItem}>
                            <div style={styles.timelineNumber}>{item.step}</div>
                            <h3 style={styles.timelineTitle}>{item.title}</h3>
                            <p style={styles.timelineDesc}>{item.desc}</p>
                            {i < 3 && <div style={styles.timelineConnector} />}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '30px' }}>
                    <a
                        href="https://fantasy.formula1.com/en/game-rules"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-accent)',
                            fontWeight: '600',
                            textDecoration: 'none',
                            fontSize: '14px',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        View Official Game Rules <ArrowRight size={16} />
                    </a>
                    <a
                        href="https://fantasy.formula1.com/en/statistics"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-accent)',
                            fontWeight: '600',
                            textDecoration: 'none',
                            fontSize: '14px',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        View Player Statistics <ArrowRight size={16} />
                    </a>
                </div>
            </section>

            {/* Section: Telemetry & Scouting (Detailed Info) */}
            <section style={styles.sectionAlt}>
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>TELEMETRY DATA</h2>
                    <div style={styles.sectionLine} />
                </div>

                <div style={styles.telemetryGrid}>
                    {/* Card 1: Budget Cap */}
                    <div style={styles.telemetryCard}>
                        <div style={styles.cardIcon}><DollarSign color="var(--color-accent)" /></div>
                        <h3>Budget Cap</h3>
                        <div style={styles.statBig}>$100M</div>
                        <p style={styles.cardText}>
                            Build your team of 5 drivers + 2 constructors. Driver prices fluctuate based on performance throughout the season.
                        </p>
                    </div>

                    {/* Card 2: Scoring System */}
                    <div style={styles.telemetryCard}>
                        <div style={styles.cardIcon}><Target color="var(--color-accent)" /></div>
                        <h3>Race Scoring</h3>
                        <ul style={styles.scoringList}>
                            <li><span>P1 Race Win</span> <strong>+25 pts</strong></li>
                            <li><span>P2 / P3</span> <strong>+18 / +15 pts</strong></li>
                            <li><span>Pole Position</span> <strong>+10 pts</strong></li>
                            <li><span>Fastest Lap</span> <strong>+10 pts</strong></li>
                            <li><span>Driver of the Day</span> <strong>+10 pts</strong></li>
                            <li><span>Per Overtake</span> <strong>+1 pt</strong></li>
                            <li style={{ color: '#ef4444' }}><span>DNF</span> <strong>-20 pts</strong></li>
                        </ul>
                    </div>

                    {/* Card 3: Powerups (Chips) */}
                    <div style={styles.telemetryCard}>
                        <div style={styles.cardIcon}><Zap color="var(--color-accent)" /></div>
                        <h3>Strategic Chips</h3>
                        <div style={styles.chipItem}>
                            <strong>Wildcard</strong>
                            <span>Unlimited transfers for one race week without penalty.</span>
                        </div>
                        <div style={styles.chipItem}>
                            <strong>Limitless</strong>
                            <span>No budget cap for one race week - build your dream team.</span>
                        </div>
                        <div style={styles.chipItem}>
                            <strong>Extra DRS</strong>
                            <span>One driver scores 3x points for that race weekend.</span>
                        </div>
                    </div>

                    {/* Card 4: Constructor Bonuses (NEW) */}
                    <div style={styles.telemetryCard}>
                        <div style={styles.cardIcon}><Flag color="var(--color-accent)" /></div>
                        <h3>2025 Constructor Bonuses</h3>
                        <ul style={styles.scoringList}>
                            <li><span>Both drivers in Q3</span> <strong>+10 pts</strong></li>
                            <li><span>One driver in Q3</span> <strong>+5 pts</strong></li>
                            <li><span>Pit stop under 2.0s</span> <strong>+20 pts</strong></li>
                            <li><span>Fastest pit stop</span> <strong>+5 pts</strong></li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Section: The Paddock (Driver Market) */}
            <section style={styles.section}>
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>THE PADDOCK</h2>
                    <div style={styles.sectionLine} />
                </div>

                <div style={styles.marketContainer}>
                    <div style={styles.marketScroll}>
                        {[
                            { name: 'Verstappen', team: 'Red Bull', price: '$30.5M', points: '452', img: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/2col/image.png' },
                            { name: 'Norris', team: 'McLaren', price: '$28.0M', points: '410', img: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/2col/image.png' },
                            { name: 'Hamilton', team: 'Ferrari', price: '$26.5M', points: '380', img: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/2col/image.png' },
                            { name: 'Piastri', team: 'McLaren', price: '$24.0M', points: '350', img: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/2col/image.png' }
                        ].map((driver, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                style={styles.driverCard}
                            >
                                <div style={styles.driverTeam}>{driver.team}</div>
                                <div style={styles.driverName}>{driver.name}</div>
                                <div style={styles.driverStats}>
                                    <div>
                                        <span style={styles.statLabel}>Price</span>
                                        <div style={styles.statValue}>{driver.price}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={styles.statLabel}>Pts</span>
                                        <div style={styles.statValue}>{driver.points}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Registration Form - PRESERVED & THEMED */}
            <section style={styles.formSection} id="register">
                <div style={styles.formBg} />
                <div style={styles.formContainer}>
                    <div style={styles.formHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--color-accent)', borderRadius: '50%' }} />
                            <span style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>Secure Access</span>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: 'var(--color-text-primary)' }}>Driver Registration</h2>
                    </div>

                    {status.message && (
                        <div style={{
                            padding: '15px',
                            marginBottom: '20px',
                            borderRadius: '4px',
                            background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${status.type === 'success' ? '#22c55e' : '#ef4444'}`,
                            color: status.type === 'success' ? '#22c55e' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '14px'
                        }}>
                            {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {status.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.formGrid}>
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                style={styles.input}
                                required
                                placeholder="Your Name"
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                style={styles.input}
                                required
                                placeholder="email@address.com"
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>Team Name</label>
                            <input
                                type="text"
                                name="teamName"
                                value={formData.teamName}
                                onChange={handleChange}
                                style={styles.input}
                                required
                                placeholder="Team Name"
                            />
                        </div>
                        <div style={styles.inputWrapper}>
                            <label style={styles.label}>Phone (Optional)</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                style={styles.input}
                                placeholder="+1 234..."
                            />
                        </div>

                        <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Sign Up for F1 Fantasy'}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
};

// CSS VARIABLE BASED STYLES
const styles = {
    container: {
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-main)',
        overflowX: 'hidden',
        transition: 'background 0.3s ease, color 0.3s ease'
    },
    hero: {
        position: 'relative',
        height: '90vh',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5%',
        overflow: 'hidden'
    },
    heroBg: {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${heroBgImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        // backgroundPosition handled by CSS .fantasy-hero-bg
        zIndex: 0
    },
    // Use a gradient that respects the bg color for the fade
    heroOverlay: {
        position: 'absolute',
        inset: 0,
        // Note: For now assuming --color-bg is sufficient, but linear-gradient needs transparency tricks. 
        // Simplified approach below:
        // Always use dark gradient for contrast with white text/hero elements
        background: 'linear-gradient(90deg, #0f172a 0%, transparent 100%)',
        opacity: 0.95,
        zIndex: 1
    },
    heroContent: {
        position: 'relative',
        zIndex: 2
        // marginTop/maxWidth handled by CSS .fantasy-hero-content
    },
    badge: {
        display: 'inline-block',
        padding: '8px 16px',
        background: 'rgba(255, 42, 42, 0.1)',
        border: '1px solid var(--color-accent)',
        color: 'var(--color-accent)',
        letterSpacing: '2px',
        marginBottom: '16px',
        position: 'relative',
        zIndex: 10,
        textTransform: 'uppercase'
    },
    heroTitle: {
        // fontSize handled by CSS .fantasy-hero-title
        fontWeight: '900',
        lineHeight: 0.9,
        marginTop: '0px',
        marginBottom: '24px',
        textTransform: 'uppercase',
        fontStyle: 'italic',
        letterSpacing: '-2px',
        color: '#ffffff' // Force white for dark hero background
    },
    heroSubtitle: {
        fontSize: '20px',
        color: '#e2e8f0', // Force light gray for dark hero background
        marginTop: '10px',
        lineHeight: 1.5,
        maxWidth: '500px',
        marginBottom: '40px'
    },
    ctaButton: {
        background: 'var(--color-accent)',
        color: '#fff',
        border: 'none',
        padding: '16px 32px',
        fontSize: '16px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
    },
    gridLines: {
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(transparent, transparent 49px, rgba(128,128,128,0.05) 50px)',
        pointerEvents: 'none',
        zIndex: 1
    },
    section: {
        padding: '100px 5%',
        position: 'relative'
    },
    sectionAlt: {
        padding: '100px 5%',
        background: 'var(--color-surface)',
        borderTop: '1px solid rgba(128,128,128,0.1)',
        borderBottom: '1px solid rgba(128,128,128,0.1)'
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '60px'
    },
    sectionTitle: {
        fontSize: '32px',
        fontWeight: '800',
        color: 'var(--color-text-primary)',
        margin: 0,
        textTransform: 'uppercase',
        fontStyle: 'italic',
        whiteSpace: 'nowrap'
    },
    sectionLine: {
        height: '2px',
        background: 'linear-gradient(90deg, var(--color-accent) 0%, transparent 100%)',
        flexGrow: 1
    },
    timelineContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '40px'
    },
    timelineItem: {
        flex: '1 1 200px',
        position: 'relative'
    },
    timelineNumber: {
        fontSize: '48px',
        fontWeight: '900',
        color: 'var(--color-text-muted)',
        opacity: 0.2,
        marginBottom: '-20px',
        position: 'relative',
        zIndex: 0
    },
    timelineTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'var(--color-accent)',
        marginBottom: '10px',
        position: 'relative',
        zIndex: 1
    },
    timelineDesc: {
        color: 'var(--color-text-secondary)',
        fontSize: '14px',
        lineHeight: 1.6
    },
    timelineConnector: {
        position: 'absolute',
        top: '60px',
        right: '-20px',
        width: '40px',
        height: '2px',
        background: 'var(--color-text-muted)',
        opacity: 0.3,
        display: 'none'
    },
    telemetryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
    },
    telemetryCard: {
        background: 'var(--color-surface)',
        border: '1px solid rgba(128,128,128,0.1)',
        padding: '20px',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden'
    },
    cardIcon: {
        marginBottom: '12px',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 42, 42, 0.1)',
        borderRadius: '8px'
    },
    statBig: {
        fontSize: '32px',
        fontWeight: '800',
        color: 'var(--color-text-primary)',
        margin: '8px 0'
    },
    cardText: {
        color: 'var(--color-text-secondary)',
        fontSize: '13px',
        lineHeight: 1.5
    },
    scoringList: {
        padding: 0,
        margin: '8px 0 0 0',
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '13px'
    },
    chipItem: {
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(128,128,128,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '13px'
    },
    marketContainer: {
        overflowX: 'auto',
        paddingBottom: '20px'
    },
    marketScroll: {
        display: 'flex',
        gap: '20px',
        minWidth: 'max-content'
    },
    driverCard: {
        width: '280px',
        background: 'var(--color-surface)',
        border: '1px solid rgba(128,128,128,0.1)',
        borderRadius: '8px',
        padding: '20px',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.1)'
    },
    driverTeam: {
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '5px'
    },
    driverName: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: 'var(--color-text-primary)',
        marginBottom: '20px'
    },
    driverStats: {
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(128,128,128,0.1)',
        paddingTop: '15px'
    },
    statLabel: {
        fontSize: '11px',
        textTransform: 'uppercase',
        color: 'var(--color-text-secondary)',
        display: 'block',
        marginBottom: '5px'
    },
    statValue: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: 'var(--color-accent)'
    },
    // Form Styles (THEMED)
    formSection: {
        padding: '100px 20px',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center'
    },
    formBg: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, var(--color-surface) 0%, transparent 100%)',
        zIndex: -1
    },
    formContainer: {
        width: '100%',
        maxWidth: '800px',
        background: 'var(--color-bg)',
        border: '1px solid rgba(128,128,128,0.1)',
        borderRadius: '8px',
        padding: '50px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    formHeader: {
        marginBottom: '30px',
        borderBottom: '1px solid rgba(128,128,128,0.1)',
        paddingBottom: '20px'
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        alignItems: 'end'
    },
    inputWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'var(--color-text-secondary)',
        fontWeight: '600'
    },
    input: {
        background: 'var(--color-surface)',
        border: '1px solid rgba(128,128,128,0.2)',
        padding: '16px',
        color: 'var(--color-text-primary)',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.3s ease',
        borderRadius: '2px'
    },
    submitBtn: {
        background: 'var(--color-accent)',
        color: '#fff',
        border: 'none',
        padding: '16px 32px',
        fontSize: '14px',
        fontWeight: '700',
        letterSpacing: '1px',
        cursor: 'pointer',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textTransform: 'uppercase',
        transition: 'all 0.3s ease',
        width: '100%'
    }
};

export default FantasyLeague;
