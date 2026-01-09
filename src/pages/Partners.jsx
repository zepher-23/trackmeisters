import React from 'react';
import { motion } from 'framer-motion';
import {
    Handshake,
    BarChart3,
    Target,
    Globe,
    TrendingUp,
    Star,
    Quote,
    ArrowUpRight,
    Users,
    Zap,
    Trophy,
    Presentation
} from 'lucide-react';

const Partners = () => {
    const demographics = [
        { label: 'Annual Reach', value: '25M+', desc: 'Across digital and trackside channels' },
        { label: 'Core Audience', value: '18-45', desc: 'High-income motorsport enthusiasts' },
        { label: 'Engagement Rate', value: '12.4%', desc: 'Industry-leading social interaction' },
        { label: 'Global Presence', value: '45+', desc: 'International events and broadcasts' },
    ];

    const benefits = [
        {
            title: 'Global Visibility',
            icon: <Globe size={24} />,
            desc: 'Prominent branding at Silverstone GP and international GT championships.'
        },
        {
            title: 'Customer Acquisition',
            icon: <Target size={24} />,
            desc: 'Direct access to a pre-qualified community of automotive consumers.'
        },
        {
            title: 'Content Licensing',
            icon: <Presentation size={24} />,
            desc: 'Usage rights for high-fidelity event media for your own campaigns.'
        },
        {
            title: 'Bespoke Activations',
            icon: <Zap size={24} />,
            desc: 'Custom VIP areas, grid walks, and product showcase opportunities.'
        }
    ];

    const caseStudies = [
        {
            brand: 'Apex Performance Oils',
            conversion: '+42% Sales Lift',
            desc: 'Through year-long technical partnership and integrated content series showing product performance under extreme track conditions.',
            image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1000&auto=format&fit=crop'
        },
        {
            brand: 'Zenith Watch Co.',
            conversion: '1.2M Brand Impressions',
            desc: 'Exclusive "Official Timekeeper" status across the GT3 Cup Season, including bespoke digital content around precision and timing.',
            image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1200&auto=format&fit=crop'
        }
    ];

    const testimonials = [
        {
            name: 'Marcus Thorne',
            role: 'CEO, Hyperion Racing',
            text: 'Partnering with this community transformed our brand visibility. The engagement level is unlike any other motorsport platform.'
        },
        {
            name: 'Sarah Chen',
            role: 'Marketing Director, Volt Tyres',
            text: 'The conversion rates from the trackside activations exceeded our yearly targets within just three events.'
        }
    ];

    const logos = [
        'ROLEX', 'MOBIL 1', 'MICHELIN', 'BREMBO', 'RECARO', 'AKRAPOVIC'
    ];

    return (
        <div className="app-container partners-page">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>

                {/* New "Side Impact" Partner Hero */}
                <section style={{
                    minHeight: '80vh',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'var(--color-bg)',
                    padding: '80px 60px'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div className="events-hero-grid" style={{ opacity: 0.1 }}></div>
                    </div>

                    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 2 }}>

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                                <div style={{ height: '2px', width: '60px', background: 'var(--color-accent)' }}></div>
                                <span style={{ color: 'var(--color-accent)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '13px' }}>Enterprise Growth</span>
                            </div>

                            <h1 className="hero-title" style={{ fontSize: '7rem', lineHeight: '0.9', textAlign: 'left', marginBottom: '40px' }} data-text="UNFAIR ADVANTAGE">
                                UNFAIR ADVANTAGE
                            </h1>

                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '22px', lineHeight: '1.6', maxWidth: '600px', marginBottom: '50px' }}>
                                We don't just host events; we build high-performance marketing engines. Leverage our global platform to accelerate your brand's trajectory.
                            </p>

                            <div style={{ display: 'flex', gap: '25px' }}>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="hero-cta"
                                >
                                    Partner Portal <ArrowUpRight size={18} />
                                </motion.button>
                                <button className="hero-cta" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>View Media Kit</button>
                            </div>
                        </motion.div>

                        <div style={{ position: 'relative', height: '100%' }}>
                            {/* Decorative Elements */}
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                                transition={{ duration: 10, repeat: Infinity }}
                                style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'var(--color-accent)', filter: 'blur(150px)', opacity: 0.1, zIndex: 0 }}
                            ></motion.div>

                            {/* Image Stack */}
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <motion.div
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                    style={{
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <img src="https://images.unsplash.com/photo-1546768292-fb12f6c92568?q=80&w=1200&auto=format&fit=crop" style={{ width: '100%', display: 'block' }} alt="Racing Team" />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                    style={{
                                        position: 'absolute',
                                        bottom: '-40px',
                                        right: '-40px',
                                        width: '280px',
                                        background: 'rgba(255,255,255,0.03)',
                                        backdropFilter: 'blur(20px)',
                                        padding: '30px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                                    }}
                                >
                                    <BarChart3 color="var(--color-accent)" size={32} style={{ marginBottom: '15px' }} />
                                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>98%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Retention Rate</div>
                                </motion.div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Audience Demographics */}
                <section style={{ padding: '80px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 'auto' }}>
                        {demographics.map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="bento-item"
                                style={{ textAlign: 'center', padding: '40px 20px', minHeight: 'auto' }}
                            >
                                <div style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>{stat.label}</div>
                                <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--color-text-primary)', marginBottom: '10px' }}>{stat.value}</div>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{stat.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Sponsor Benefits */}
                <section style={{ padding: '100px 20px', background: 'var(--color-surface-hover)', margin: '80px 0' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '80px', alignItems: 'center' }}>
                            <div>
                                <h2 className="bento-title" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '30px' }}>Strategic Benefits</h2>
                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '18px', lineHeight: '1.8' }}>
                                    We offer a range of integration opportunities designed to meet your specific marketing objectives, from brand awareness to direct sales conversion.
                                </p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                {benefits.map((benefit, i) => (
                                    <div key={i} className="bento-item" style={{ minHeight: 'auto', padding: '30px' }}>
                                        <div style={{ color: 'var(--color-accent)', marginBottom: '15px' }}>{benefit.icon}</div>
                                        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px', color: '#fff' }}>{benefit.title}</h3>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{benefit.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Case Studies */}
                <section style={{ padding: '80px 20px', maxWidth: '1400px', margin: '0 auto' }}>
                    <h2 className="bento-title" style={{ fontSize: '2.5rem', marginBottom: '50px' }}>Proven Results</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '40px' }}>
                        {caseStudies.map((study, i) => (
                            <motion.div
                                key={i}
                                className="bento-item"
                                style={{ padding: 0, overflow: 'hidden', minHeight: '500px', display: 'flex', flexDirection: 'column' }}
                                whileHover={{ y: -10 }}
                            >
                                <div style={{ height: '300px', width: '100%', backgroundImage: `url(${study.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                <div style={{ padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#fff' }}>{study.brand}</h3>
                                        <div style={{ background: 'var(--color-accent)', padding: '5px 15px', borderRadius: '4px', fontSize: '12px', fontWeight: '900' }}>{study.conversion}</div>
                                    </div>
                                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>{study.desc}</p>
                                    <button style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-accent)', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' }}>
                                        Read Case Study <ArrowUpRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Partner Logo Marquee */}
                <section style={{ padding: '60px 0', overflow: 'hidden', background: '#000', margin: '80px 0' }}>
                    <div className="ticker-container" style={{ margin: 0, border: 'none' }}>
                        <div className="ticker-track">
                            {[...logos, ...logos].map((logo, i) => (
                                <div key={i} className="ticker-item" style={{ fontSize: '32px', fontWeight: '900', opacity: 0.3, letterSpacing: '5px' }}>
                                    {logo}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section style={{ padding: '100px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <Quote size={60} color="var(--color-accent)" style={{ margin: '0 auto 40px', opacity: 0.5 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
                        {testimonials.map((t, i) => (
                            <div key={i}>
                                <p style={{ fontSize: '20px', fontStyle: 'italic', lineHeight: '1.8', color: 'var(--color-text-primary)', marginBottom: '30px' }}>
                                    "{t.text}"
                                </p>
                                <h4 style={{ fontWeight: '900', color: '#fff' }}>{t.name}</h4>
                                <div style={{ color: 'var(--color-accent)', fontSize: '12px', textTransform: 'uppercase', marginTop: '5px' }}>{t.role}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Past Sponsors Section */}
                <section style={{ padding: '80px 20px', background: 'rgba(255,42,42,0.02)', marginTop: '80px' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
                        <h2 className="bento-title" style={{ fontSize: '24px', marginBottom: '40px', opacity: 0.7 }}>A Legacy of Collaboration</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', padding: '40px' }}>
                            {['CASTROL', 'PIRELLI', 'SPARCO', 'OMP', 'GARMIN', 'RED BULL'].map((p, i) => (
                                <div key={i} style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text-secondary)', opacity: 0.5 }}>{p}</div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Sponsorship Information CTA */}
                <section style={{ padding: '120px 20px', textAlign: 'center' }}>
                    <motion.div
                        whileInView={{ opacity: 1, scale: 1 }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        className="bento-item wide"
                        style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px', background: 'linear-gradient(45deg, #111, #050505)' }}
                    >
                        <Handshake size={60} color="var(--color-accent)" style={{ margin: '0 auto 30px' }} />
                        <h2 className="hero-title" style={{ fontSize: '3rem' }}>Start the Conversation</h2>
                        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '20px auto 40px', fontSize: '18px' }}>
                            We tailor every partnership to specific business goals. Contact our team to request a customized strategy for the upcoming season.
                        </p>
                        <button className="hero-cta" style={{ padding: '20px 60px' }}>Become a Partner</button>
                    </motion.div>
                </section>
            </div>
        </div>
    );
};

export default Partners;
