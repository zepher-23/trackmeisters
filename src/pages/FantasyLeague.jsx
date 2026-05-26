import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Flag, CheckCircle, AlertCircle, Loader2, ArrowRight, Settings, Gauge, Crown, TrendingUp, DollarSign, ChevronRight, BarChart3, HelpCircle, Zap, Shield, Target } from 'lucide-react';
import { COLLECTIONS, addDocument } from '../lib/firebase';

import f1Red from '../assets/f1-red.svg';
import f1White from '../assets/f1-white.svg';
import heroBgImage from '../assets/f1_fantasy_hero.png';
import tmLogo from '../assets/logo-white.png';

const FantasyLeague = () => {
    // ...
    // ... (rest of component)
    // ...

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        country: '',
        teamName: '',
        teamName2: '',
        teamName3: '',
        f1AccountName: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);



    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const registrationData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                country: formData.country,
                teamName: formData.teamName,
                teamName2: formData.teamName2,
                teamName3: formData.teamName3,
                f1AccountName: formData.f1AccountName,
                type: 'f1_fantasy',
                status: 'confirmed',
                createdAt: new Date().toISOString()
            };

            await addDocument(COLLECTIONS.REGISTRATIONS, registrationData);

            // Send confirmation email
            await fetch('/api/submit-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'fantasy-league', data: registrationData })
            });

            setStatus({ type: 'success', message: 'Welcome to the Fantasy League! You have been successfully registered.' });
            setFormData({ name: '', email: '', phone: '', city: '', country: '', teamName: '', teamName2: '', teamName3: '', f1AccountName: '' });

        } catch (error) {
            console.error("Fantasy Registration Error:", error);
            setStatus({ type: 'error', message: 'Failed to register. Please check your connection and try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fantasy-league-page" style={styles.container}>
            {/* Hero Section: Official Briefing */}
            <section style={styles.hero}>
                <div
                    className="fantasy-hero-bg"
                    style={styles.heroBg}
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
                        {/* Hero content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                            <div style={{
                                color: '#fff',
                                fontSize: 'clamp(24px, 4vw, 32px)',
                                fontWeight: '900',
                                letterSpacing: '4px',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                fontStyle: 'italic',
                                marginBottom: '5px'
                            }}>
                                TRACKMEISTERS
                            </div>
                            <h1 className="hero-title fantasy-hero-title" style={{
                                ...styles.heroTitle,
                                marginTop: '0px',
                                marginBottom: '15px'
                            }}>
                                <span style={{ color: 'var(--color-accent)' }}>FANTASY LEAGUE</span>
                            </h1>
                        </div>

                        {/* ── Prizes Section (Redesigned) ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.5 }}
                            className="fantasy-prizes-section"
                            style={{
                                maxWidth: '620px', width: '100%', marginBottom: '24px',
                            }}
                        >
                            <div style={{
                                display: 'flex', flexDirection: 'column', gap: '12px'
                            }}>
                                {/* Overall Champion (Hero Prize) */}
                                <div className="fantasy-champion-card" style={{
                                    display: 'flex', alignItems: 'center', gap: '16px',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(255, 215, 0, 0.1) 100%)',
                                    border: '1px solid rgba(255, 215, 0, 0.3)',
                                    boxShadow: '0 8px 32px rgba(255, 215, 0, 0.1)',
                                    position: 'relative',
                                    backdropFilter: 'blur(8px)',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 215, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.1)';
                                    }}
                                    onClick={() => document.getElementById('rewards').scrollIntoView({ behavior: 'smooth' })}
                                >
                                    {/* Shimmer effect */}
                                    <div className="fantasy-prizes-shimmer" style={{
                                        position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%',
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.05) 50%, transparent 100%)',
                                        pointerEvents: 'none',
                                    }} />

                                    <div style={{
                                        minWidth: '50px', height: '50px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #22c55e, #ffd700)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)'
                                    }}>
                                        <Crown size={26} color="#fff" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px', color: '#22c55e', marginBottom: '4px' }}>
                                            Overall Champion
                                        </div>
                                        <div style={{ fontSize: '16px', color: '#fff', lineHeight: 1.3, fontWeight: '700' }}>
                                            Wins a <span style={{ color: '#ffd700', fontSize: '19px', textShadow: '0 0 10px rgba(255,215,0,0.4)', fontWeight: '800' }}>Formula One Ticket</span> from TrackMeisters
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', color: '#ffd700', opacity: 0.7 }}>
                                        <ChevronRight size={24} />
                                    </div>
                                </div>

                                {/* Race Winner */}
                                <div className="fantasy-winner-card" style={{
                                    display: 'flex', alignItems: 'center', gap: '16px',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    position: 'relative',
                                    backdropFilter: 'blur(8px)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease, border-color 0.2s ease'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 42, 42, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    }}
                                    onClick={() => document.getElementById('rewards').scrollIntoView({ behavior: 'smooth' })}
                                >
                                    <div style={{
                                        minWidth: '50px', height: '50px', borderRadius: '12px',
                                        background: 'rgba(255, 42, 42, 0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Trophy size={24} color="var(--color-accent)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', color: '#fff', letterSpacing: '0.5px' }}>
                                            Race Winner
                                        </div>
                                        <div style={{ fontSize: '16px', color: '#fff', lineHeight: 1.3, fontWeight: '700', marginTop: '6px' }}>
                                            Wins exclusive <span style={{ color: '#ff4444', fontSize: '19px', textShadow: '0 0 10px rgba(255,42,42,0.4)', fontWeight: '800' }}>TrackMeisters awards</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="fantasy-hero-bottom" style={{ display: 'flex', flexDirection: 'column' }}>
                            <p className="hero-experts-title" style={{ fontSize: '20px', color: '#fff', fontWeight: '500', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                Ready To Take On The F1 Experts?
                            </p>
                            <p className="hero-join-text" style={{ ...styles.heroSubtitle, fontSize: '16px', maxWidth: '600px', marginTop: '0', marginBottom: '20px' }}>
                                Join the TrackMeisters India Fantasy League.
                            </p>

                            <div className="cta-button-container" style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                                    style={styles.ctaButton}
                                >
                                    Start Season <ArrowRight size={18} />
                                </motion.button>
                                <span style={{
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '14px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    fontWeight: '600',
                                    borderLeft: '2px solid var(--color-accent)',
                                    paddingLeft: '15px'
                                }}>
                                    Free To Play
                                </span>
                            </div>
                            <p className="rewards-text" style={{ fontSize: '13px', color: '#94a3b8', marginTop: '16px', marginBottom: 0, letterSpacing: '0.5px' }}>
                                Exclusive TrackMeisters rewards every race weekend.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Tech Lines */}
                <div style={styles.gridLines} />
            </section>

            {/* Section: Rewards and Recognition */}
            <section style={styles.sectionAlt} id="rewards">
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>REWARDS & RECOGNITION</h2>
                    <div style={styles.sectionLine} />
                </div>

                <div style={styles.telemetryGrid}>
                    {/* Race Weekend Winners */}
                    <div style={{
                        ...styles.telemetryCard,
                        background: 'linear-gradient(160deg, rgba(255, 42, 42, 0.03) 0%, rgba(0, 0, 0, 0.2) 100%)',
                        border: '1px solid rgba(255, 42, 42, 0.3)',
                        boxShadow: '0 4px 20px rgba(255, 42, 42, 0.1), inset 0 0 20px rgba(255, 42, 42, 0.05)'
                    }}>
                        <div style={{
                            ...styles.cardIcon,
                            background: 'rgba(255, 42, 42, 0.1)',
                            border: '1px solid rgba(255, 42, 42, 0.2)'
                        }}><Trophy color="var(--color-accent)" size={20} /></div>
                        <h3 style={{ fontSize: '20px', marginBottom: '5px', color: '#fff', letterSpacing: '0.5px' }}>Race Weekend Winners</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '15px' }}>Receive:</p>
                        <ul style={{ ...styles.scoringList, gap: '12px' }}>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>VIP Pass to TrackMeisters racing events</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>Official TrackMeisters Trophy</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>Trophy presentation at racetrack during racing event ceremony</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>Recognition across TrackMeisters platforms</span>
                            </li>
                        </ul>
                    </div>

                    {/* Overall Season Champion */}
                    <div style={{
                        ...styles.telemetryCard,
                        background: 'linear-gradient(160deg, rgba(255, 215, 0, 0.08) 0%, rgba(34, 197, 94, 0.03) 100%)',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                        boxShadow: '0 12px 30px rgba(255, 215, 0, 0.1), inset 0 0 20px rgba(255, 215, 0, 0.05)',
                        transform: 'translateY(-4px)'
                    }}>
                        <div style={{
                            ...styles.cardIcon,
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(34,197,94,0.2))',
                            border: '1px solid rgba(255, 215, 0, 0.4)',
                            boxShadow: '0 4px 10px rgba(255, 215, 0, 0.2)'
                        }}><Crown color="#ffd700" size={22} /></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '22px', color: '#ffd700', margin: 0, letterSpacing: '0.5px', textShadow: '0 2px 10px rgba(255,215,0,0.3)' }}>Overall Season Champion</h3>
                            <span style={{ fontSize: '10px', background: 'linear-gradient(90deg, #ffd700, #ffb700)', color: '#000', padding: '3px 10px', borderRadius: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 2px 5px rgba(255,215,0,0.4)' }}>Grand Prize</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '15px' }}>Receives:</p>
                        <ul style={{ ...styles.scoringList, gap: '12px' }}>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '8px', height: '8px', borderRadius: '50%', background: '#ffd700', flexShrink: 0, boxShadow: '0 0 8px #ffd700' }} />
                                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>One Formula One Ticket for one race in the 2027 Formula 1 season</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#ffd700', flexShrink: 0, opacity: 0.8 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>Official TrackMeisters Championship Trophy</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#ffd700', flexShrink: 0, opacity: 0.8 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>VIP Pass to all TrackMeisters Racing events</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#ffd700', flexShrink: 0, opacity: 0.8 }} />
                                <span style={{ color: 'var(--color-text-primary)' }}>Recognition across TrackMeisters platforms</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', fontStyle: 'italic' }}>Join Now:</h3>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => document.getElementById('register').scrollIntoView({ behavior: 'smooth' })}
                        style={styles.ctaButton}
                    >
                        Click Here! <ArrowRight size={18} />
                    </motion.button>
                </div>
            </section>

            {/* Section: How It Works (How to Play Timeline) */}
            <section style={styles.section} id="how-it-works">
                <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>HOW IT WORKS</h2>
                    <div style={styles.sectionLine} />
                </div>

                <div style={styles.timelineContainer}>
                    {[
                        { step: '01', title: 'Sign Up', desc: 'Create an account on the Official Formula One Fantasy platform or log in using your existing F1 account.' },
                        { step: '02', title: 'Construct', desc: 'Create 3 teams on the Official Fantasy platform.' },
                        { step: '03', title: 'Register', desc: 'Register on the TrackMeisters website below.', link: '#register' },
                        { step: '04', title: 'Join League', desc: 'Join the TrackMeisters India League using the league code provided after registration.' },
                        { step: '05', title: 'Verify', desc: 'Join the official TrackMeisters WhatsApp group to receive updates, announcements, and prize communication.' }
                    ].map((item, i) => (
                        <div key={i} style={{ ...styles.timelineItem, flex: '1 1 180px' }}>
                            <div style={styles.timelineNumber}>{item.step}</div>
                            <h3 style={styles.timelineTitle}>{item.title}</h3>
                            <p style={styles.timelineDesc}>
                                {item.desc}
                                {item.link && (
                                    <a href={item.link} onClick={(e) => { e.preventDefault(); document.getElementById('register').scrollIntoView({ behavior: 'smooth' }); }} style={{ display: 'block', marginTop: '10px', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 'bold' }}>Register Here &rarr;</a>
                                )}
                            </p>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '30px', padding: '15px 20px', background: 'rgba(255, 42, 42, 0.05)', borderLeft: '4px solid var(--color-accent)', borderRadius: '4px' }}>
                    <p style={{ color: 'var(--color-text-primary)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                        <AlertCircle size={16} color="var(--color-accent)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        <strong>Step 4 and Step 5 are mandatory</strong> to ensure you receive official communication regarding the league, winner announcements, prizes, and TrackMeisters events.
                    </p>
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


            {/* Registration Form - PRESERVED & THEMED */}
            <section style={styles.formSection} id="register">
                <div style={styles.formBg} />
                <div style={styles.formContainer}>
                    {status.type === 'success' ? (
                        /* ── Success Container ── */
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '12px' }} />
                                <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 8px 0' }}>You're In!</h2>
                                <p style={{ fontSize: '14px', color: '#22c55e', margin: 0 }}>{status.message}</p>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(128,128,128,0.2)', margin: '20px 0' }} />

                            {/* League Details */}
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Join the League</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '14px 18px', background: 'var(--color-surface)',
                                        border: '1px solid rgba(128,128,128,0.15)', borderRadius: '6px'
                                    }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>League Name</div>
                                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text-primary)', letterSpacing: '1px' }}>TRACKMEISTERS INDIA</div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '14px 18px', background: 'var(--color-surface)',
                                        border: '1px solid rgba(128,128,128,0.15)', borderRadius: '6px'
                                    }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>League Code</div>
                                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-accent)', letterSpacing: '2px', fontFamily: 'monospace' }}>P1GPF5CXE07</div>
                                        </div>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText('P1GPF5CXE07'); }}
                                            style={{
                                                background: 'rgba(255,42,42,0.1)', border: '1px solid var(--color-accent)',
                                                color: 'var(--color-accent)', padding: '6px 12px', borderRadius: '4px',
                                                cursor: 'pointer', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px'
                                            }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(128,128,128,0.2)', margin: '20px 0' }} />

                            {/* WhatsApp Section */}
                            <div>
                                <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Join Official WhatsApp Group</p>
                                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                                    Joining the WhatsApp group is <strong style={{ color: 'var(--color-accent)' }}>mandatory</strong> for league communication, winner announcements, and prizes.
                                </p>
                                <a
                                    href="https://chat.whatsapp.com/FNiwwc2nyZU4jb6Ha43GlQ?mode=gi_t"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                                        background: '#25D366', color: '#fff', padding: '14px 28px',
                                        borderRadius: '6px', textDecoration: 'none', fontWeight: '700',
                                        fontSize: '15px', letterSpacing: '0.5px', transition: 'opacity 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    Join WhatsApp Group
                                </a>
                            </div>
                        </div>
                    ) : (
                        /* ── Registration Form ── */
                        <>
                            {/* Form Header */}
                            <div style={{ ...styles.formHeader, marginBottom: '35px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)' }}>
                                    <HelpCircle size={18} color="var(--color-accent)" />
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--color-text-primary)' }}>
                                        New to Fantasy? <span style={{ color: 'var(--color-accent)' }}>See how it works above.</span>
                                    </h3>
                                </div>
                                <h2 style={{ fontSize: '36px', fontWeight: '800', margin: 0, color: 'var(--color-text-primary)', letterSpacing: '0.5px' }}>Player Registration</h2>
                            </div>

                            {status.message && (
                                <div style={{
                                    padding: '15px',
                                    marginBottom: '20px',
                                    borderRadius: '4px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid #ef4444',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '14px'
                                }}>
                                    <AlertCircle size={16} />
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
                                    <label style={styles.label}>Phone Number (Required)</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="+1 234..."
                                    />
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="Your City"
                                    />
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="Your Country"
                                    />
                                </div>

                                <div style={{ ...styles.inputWrapper, gridColumn: '1 / -1', marginTop: '10px' }}>
                                    <div style={{ height: '1px', background: 'rgba(128,128,128,0.2)' }} />
                                    <div style={{ margin: '15px 0 5px 0', padding: '15px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(128, 128, 128, 0.1)', borderRadius: '6px' }}>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '600' }}>3 Teams Mandatory.</p>
                                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <li>All three teams must stay in the league to qualify for prizes.</li>
                                            <li>Only your highest scoring team counts for classification.</li>
                                        </ul>
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--color-accent)', fontWeight: '500' }}>Note: Enter the exact team names as created on the Official Formula One Fantasy platform.</p>
                                </div>

                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>F1 Fantasy User Account Name (Required)</label>
                                    <input
                                        type="text"
                                        name="f1AccountName"
                                        value={formData.f1AccountName}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="Your F1 Account Username"
                                    />
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>Team 1 Name (Required)</label>
                                    <input
                                        type="text"
                                        name="teamName"
                                        value={formData.teamName}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="Team 1 Name"
                                    />
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>Team 2 Name (Required)</label>
                                    <input
                                        type="text"
                                        name="teamName2"
                                        value={formData.teamName2}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="Team 2 Name"
                                    />
                                </div>
                                <div style={styles.inputWrapper}>
                                    <label style={styles.label}>Team 3 Name (Required)</label>
                                    <input
                                        type="text"
                                        name="teamName3"
                                        value={formData.teamName3}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="Team 3 Name"
                                    />
                                </div>

                                <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Sign Up for F1 Fantasy'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </section>

            {/* Disclaimer */}
            <section style={{ padding: '40px 5%', background: 'var(--color-bg)', borderTop: '1px solid rgba(128,128,128,0.15)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', color: 'var(--color-text-secondary)' }}>Disclaimer</h4>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text-secondary)', maxWidth: '800px', margin: 0 }}>
                    TrackMeisters Fantasy League is an independent community league created within the Official Formula One Fantasy platform. TrackMeisters is not affiliated with, endorsed by, sponsored by, or officially associated with Formula One, Formula 1, or their parent companies. All trademarks and intellectual property related to Formula One are owned by their respective owners.
                </p>
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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5% 60px'
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
        marginBottom: '30px'
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
        color: '#ffffff',
        opacity: 0.15,
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
        color: '#e2e8f0',
        fontSize: '16px',
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
