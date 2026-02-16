import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Eye,
    Target,
    ShieldAlert,
    Award,
    Handshake,
    Mic2,
    Newspaper,
    CheckCircle2,
    Users,
    Map
} from 'lucide-react';
import { fetchCollection, COLLECTIONS } from '../lib/firebase';

const TEAM_DATA = [
    {
        name: 'Marcus Thorne',
        role: 'Founder & CEO',
        bio: 'Former GT3 driver with 15 years of competitive experience. Marcus founded the organization to bridge the gap between amateur track days and professional racing.',
        image: '/drivers/driver3.webp'
    },
    {
        name: 'Elena Vance',
        role: 'Chief Safety Officer',
        bio: 'Specialist in emergency response and circuit safety protocols. Elena manages our nationwide team of marshals and medical personnel.',
        image: '/drivers/driver2.webp'
    },
    {
        name: 'David Rossi',
        role: 'Director of Logistics',
        bio: 'Expert in large-scale event management. David oversees track permits, vendor relations, and the technical inspection teams.',
        image: '/drivers/driver1.webp'
    }
];

const AutoScrollCarousel = ({ items }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % items.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [items.length]);

    const member = items[index];

    // Ultra-smooth slide variants
    const variants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    };

    return (
        <div className="carousel-container" style={{ width: '100%' }}>
            {/* Increased height for breathing room */}
            <div className="carousel-wrapper" style={{ position: 'relative', height: '240px', width: '100%', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            top: 0,
                            left: 0,
                            // Theme-aware background
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
                            borderRadius: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            // Generous padding
                            padding: '30px',
                            boxSizing: 'border-box',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(12px)'
                        }}
                    >
                        {/* Header: Avatar + Info */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
                            <div style={{
                                backgroundImage: `url(${member.image})`,
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                flexShrink: 0,
                                border: '2px solid var(--color-accent)',
                                marginRight: '20px'
                            }}></div>

                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h3 style={{
                                    fontSize: '20px',
                                    color: 'var(--color-text-primary, #fff)',
                                    margin: '0 0 4px 0',
                                    fontWeight: '700',
                                    letterSpacing: '-0.5px',
                                    lineHeight: '1.2'
                                }}>{member.name}</h3>

                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--color-accent)',
                                    textTransform: 'uppercase',
                                    fontWeight: '700',
                                    letterSpacing: '1px'
                                }}>{member.role}</div>
                            </div>
                        </div>

                        {/* Body: Bio */}
                        <div style={{ width: '100%' }}>
                            <p style={{
                                fontSize: '15px',
                                color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
                                lineHeight: '1.6',
                                margin: 0,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontWeight: '400'
                            }}>{member.bio}</p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Minimalist Pagination Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingTop: '15px' }}>
                {items.map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            width: i === index ? 24 : 6,
                            backgroundColor: i === index ? 'var(--color-accent)' : 'var(--color-text-secondary, rgba(255,255,255,0.2))',
                            opacity: i === index ? 1 : 0.3
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                            height: '4px',
                            borderRadius: '2px',
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const About = () => {
    const navigate = useNavigate();
    const certifications = [
        { title: 'FMSCI Sanctioned', desc: 'All events governed by the Federation of Motor Sports Clubs of India.', icon: <CheckCircle2 /> },
        { title: 'Motorsport Standard Ops', desc: 'Events conducted using professional timing systems, scrutineering checks, and organized race procedures.', icon: <Award /> },
        { title: 'Certified Marshals', desc: 'Officials trained and licensed under FMSCI regulations.', icon: <ShieldAlert /> },
        { title: 'Advanced Medical', desc: 'ALS Ambulances and trauma teams on standby.', icon: <CheckCircle2 /> }
    ];

    const [pressItems, setPressItems] = useState([
        { outlet: 'Top Gear', title: 'The Future of Track Day Culture', date: 'Sept 2025', url: '#' },
        { outlet: 'AutoSport', title: 'Marcus Thorne on Grassroots Innovation', date: 'July 2025', url: '#' },
        { outlet: 'EVO Magazine', title: 'Safety First: The New Gold Standard', date: 'Jan 2025', url: '#' }
    ]);

    useEffect(() => {
        const loadPress = async () => {
            const data = await fetchCollection(COLLECTIONS.PRESS);
            if (data && data.length > 0) {
                setPressItems(data);
            }
        };
        loadPress();
    }, []);

    return (
        <div className="app-container about-page">
            <div className="page-content about-content">
                <section className="about-hero-cinematic">
                    <div className="hero-bg-layer" style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=2000&auto=format&fit=crop")',
                    }}>
                        <div className="hero-bg-gradient"></div>
                    </div>

                    <div className="hero-content-container">
                        <div className="hero-text-col">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <div className="established-text">
                                    <div className="accent-line"></div>
                                    Established 2015
                                </div>
                                <h1 className="hero-title about-hero-title" data-text="ENGINEERED PASSION">
                                    ENGINEERED PASSION
                                </h1>
                                <div style={{
                                    background: 'linear-gradient(to right, rgba(0,0,0,0.85), transparent)',
                                    padding: '40px 0 40px 40px',
                                    borderRadius: '0 8px 8px 0',
                                    borderLeft: '4px solid var(--color-accent)',
                                    marginBottom: '30px',
                                    maxWidth: '850px',
                                    backdropFilter: 'blur(4px)'
                                }}>
                                    <p style={{ fontSize: '24px', fontStyle: 'italic', fontWeight: '500', color: '#fff', marginBottom: '20px', fontFamily: 'serif', letterSpacing: '0.5px' }}>
                                        "Motorsport is more than speed. It is discipline, learning, and the pursuit of doing things right."
                                    </p>
                                    <div style={{ maxWidth: '700px' }}>
                                        <p className="hero-desc about-hero-desc" style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.7', color: 'rgba(255,255,255,0.9)' }}>
                                            Trackmeisters was created to build a fair, transparent, and professionally run motorsport platform for enthusiasts and competitors alike. From first time drivers to seasoned racers, we focus on structured formats, accurate timing, and meaningful recognition.
                                        </p>
                                        <p className="hero-desc about-hero-desc" style={{ margin: 0, fontSize: '16px', lineHeight: '1.7', color: 'rgba(255,255,255,0.9)' }}>
                                            Every event is designed to reward skill, consistency, and respect on track.
                                        </p>
                                    </div>
                                </div>

                            </motion.div>
                        </div>
                    </div>
                </section>



                <section className="max-width-container" style={{ paddingBottom: '60px', marginTop: '60px' }}>
                    <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>

                        {/* Vision Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                padding: '30px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)', opacity: 0.15, filter: 'blur(30px)' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginRight: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Eye size={20} color="var(--color-accent)" />
                                </div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>Our Vision</h2>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                                To create the most accessible yet professional motorsport ecosystem in the world, where safety and speed coexist for every level of driver.
                            </p>
                        </motion.div>

                        {/* Mission Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                padding: '30px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, #fff 0%, transparent 70%)', opacity: 0.1, filter: 'blur(30px)' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginRight: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Target size={20} color="#fff" />
                                </div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>Our Mission</h2>
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                                Delivering high-fidelity racing experiences through meticulous event planning, uncompromising safety standards, and cutting-edge technology.
                            </p>
                        </motion.div>

                    </div>
                </section>

                <section className="leadership-section" style={{ display: 'none' }}>
                    <div className="max-width-container">
                        <div className="section-header">
                            <h2 className="hero-title section-title">Leadership Team</h2>
                            <p className="section-subtitle">Industry veterans committed to excellence.</p>
                        </div>

                        {/* Desktop View: Standard Grid */}
                        <div className="leadership-grid leadership-desktop-view">
                            {TEAM_DATA.map((member, i) => (
                                <motion.div key={i} className="bento-item member-card">
                                    <div className="member-image" style={{ backgroundImage: `url(${member.image})` }}></div>
                                    <div className="member-info">
                                        <h3 className="member-name">{member.name}</h3>
                                        <div className="member-role">{member.role}</div>
                                        <p className="member-bio">{member.bio}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Mobile View: Auto-Scroll Carousel */}
                        <div className="leadership-mobile-view">
                            <AutoScrollCarousel items={TEAM_DATA} />
                        </div>
                    </div>
                </section>

                <section className="safety-section">
                    <div className="safety-grid">
                        <div className="safety-text-content">
                            <div className="section-eyebrow">Reliability</div>
                            <h2 className="hero-title section-title-left">Safety is our DNA</h2>
                            <p className="section-desc">
                                We operate under strict international racing guidelines. Every event is staffed by FMSCI certified marshals, expert medical teams, and experienced technical inspectors.
                            </p>
                            <ul className="safety-features-list">
                                <li><ShieldAlert color="var(--color-accent)" size={20} /> Med Support</li>
                                <li><CheckCircle2 color="var(--color-accent)" size={20} /> Tech Inspections</li>
                                <li><Users color="var(--color-accent)" size={20} /> Certified Marshals</li>
                                <li><Map color="var(--color-accent)" size={20} /> Track-side Safety</li>
                            </ul>
                        </div>
                        <div className="certs-grid">
                            {certifications.map((cert, i) => (
                                <div key={i} className="bento-item cert-card">
                                    <div className="cert-icon">{cert.icon}</div>
                                    <h4 className="cert-title">{cert.title}</h4>
                                    <p className="cert-desc">{cert.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>





                <section className="cta-section">
                    <motion.div
                        whileInView={{ opacity: 1, y: 0 }}
                        initial={{ opacity: 0, y: 40 }}
                        viewport={{ once: true }}
                        className="cta-container"
                    >
                        <Handshake size={64} color="var(--color-accent)" className="cta-icon" />
                        <h2 className="hero-title cta-title">Join Our Journey</h2>
                        <p className="cta-desc">
                            Whether you're a driver, a brand, or a track owner, we'd love to discuss how we can collaborate.
                        </p>
                        <button className="hero-cta" onClick={() => navigate('/contact')}>Work With Us</button>
                    </motion.div>
                </section>
            </div>
        </div>
    );
};

export default About;
