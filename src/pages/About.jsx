import React from 'react';
import { motion } from 'framer-motion';
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

const About = () => {
    const team = [
        {
            name: 'Marcus Thorne',
            role: 'Founder & CEO',
            bio: 'Former GT3 driver with 15 years of competitive experience. Marcus founded the organization to bridge the gap between amateur track days and professional racing.',
            image: '/drivers/driver3.png' // Reusing existing assets for consistency
        },
        {
            name: 'Elena Vance',
            role: 'Chief Safety Officer',
            bio: 'Specialist in emergency response and circuit safety protocols. Elena manages our nationwide team of marshals and medical personnel.',
            image: '/drivers/driver2.png'
        },
        {
            name: 'David Rossi',
            role: 'Director of Logistics',
            bio: 'Expert in large-scale event management. David oversees track permits, vendor relations, and the technical inspection teams.',
            image: '/drivers/driver1.png'
        }
    ];

    const certifications = [
        { title: 'FIA Approved', desc: 'Circuit safety and event management protocols.', icon: <CheckCircle2 /> },
        { title: 'SCCA Licensed', desc: 'Certified race officials and timing personnel.', icon: <Award /> },
        { title: 'MSA Platinum', desc: 'Highest tier of track approval for international events.', icon: <ShieldAlert /> },
        { title: 'OSHA Safety', desc: 'Workplace and participant safety certification.', icon: <CheckCircle2 /> }
    ];

    const press = [
        { outlet: 'Top Gear', title: 'The Future of Track Day Culture', date: 'Sept 2025' },
        { outlet: 'AutoSport', title: 'Marcus Thorne on Grassroots Innovation', date: 'July 2025' },
        { outlet: 'EVO Magazine', title: 'Safety First: The New Gold Standard', date: 'Jan 2025' }
    ];

    return (
        <div className="app-container about-page">
            <div className="page-content about-content">

                {/* New Cinematic Hero Section */}
                <section className="about-hero-cinematic">
                    {/* Background Image Layer */}
                    <div className="hero-bg-layer" style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1547424436-283e3944431a?q=80&w=2000&auto=format&fit=crop")',
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
                                <p className="hero-desc about-hero-desc">
                                    Founded on the principles of precision and raw speed, we've spent a decade defining the next generation of motorsport culture.
                                </p>
                                <div className="hero-stats-row">
                                    <div className="stat-item">
                                        <div className="stat-number">500+</div>
                                        <div className="stat-label">Events Hosted</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-number">12k</div>
                                        <div className="stat-label">Active Drivers</div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-number">24</div>
                                        <div className="stat-label">Partner Circuits</div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Vision & Mission */}
                <section className="about-section-padding">
                    <div className="vision-mission-grid">
                        <motion.div
                            className="bento-item vision-item"
                            whileHover={{ y: -5 }}
                        >
                            <div className="icon-wrapper"><Eye size={48} /></div>
                            <h2 className="vision-title">Our Vision</h2>
                            <p className="vision-desc">
                                To create the most accessible yet professional motorsport ecosystem in the world, where safety and speed coexist for every level of driver.
                            </p>
                        </motion.div>
                        <motion.div
                            className="bento-item mission-item"
                            whileHover={{ y: -5 }}
                        >
                            <div className="icon-wrapper"><Target size={48} /></div>
                            <h2 className="vision-title">Our Mission</h2>
                            <p className="vision-desc">
                                Delivering high-fidelity racing experiences through meticulous event planning, uncompromising safety standards, and cutting-edge technology.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* Who Runs The Events */}
                <section className="leadership-section">
                    <div className="max-width-container">
                        <div className="section-header">
                            <h2 className="hero-title section-title">Leadership Team</h2>
                            <p className="section-subtitle">Industry veterans committed to excellence.</p>
                        </div>
                        <div className="leadership-grid">
                            {team.map((member, i) => (
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
                    </div>
                </section>

                {/* Safety Credentials & Certifications */}
                <section className="safety-section">
                    <div className="safety-grid">
                        <div className="safety-text-content">
                            <div className="section-eyebrow">Reliability</div>
                            <h2 className="hero-title section-title-left">Safety is our DNA</h2>
                            <p className="section-desc">
                                We operate under strict international racing guidelines. Every event is staffed by MSA certified marshals, ALS medical teams, and FIA technical inspectors.
                            </p>
                            <ul className="safety-features-list">
                                <li><ShieldAlert color="var(--color-accent)" size={20} /> 24/7 Med Support</li>
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

                {/* Partners & Associations */}
                <section className="about-affiliations-section">
                    <div className="max-width-container center-text">
                        <h2 className="bento-title affiliations-title">OFFICIAL AFFILIATIONS</h2>
                        <div className="affiliations-grid">
                            {['FIA', 'MSA', 'SCCA', 'ACO', 'IMSA', 'NASCAR'].map((a, i) => (
                                <div key={i} className="affiliation-logo">{a}</div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Speaking / Press Mentions */}
                <section className="press-section">
                    <div className="press-main-grid">
                        <div className="press-text-content">
                            <h2 className="hero-title section-title-left">In The Spotlight</h2>
                            <p className="section-desc">
                                Recognized by global media leaders for our commitment to changing track culture. Our leadership team regularly speaks at motorsport summits worldwide.
                            </p>
                            <div className="press-tags">
                                <div className="press-tag"><Mic2 size={24} /> Keynote Speakers</div>
                                <div className="press-tag"><Newspaper size={24} /> Press Archive</div>
                            </div>
                        </div>
                        <div className="press-list">
                            {press.map((item, i) => (
                                <motion.div
                                    key={i}
                                    className="bento-item press-card"
                                    whileHover={{ x: 10 }}
                                >
                                    <div className="press-card-inner">
                                        <div>
                                            <div className="press-outlet">{item.outlet}</div>
                                            <h4 className="press-title">{item.title}</h4>
                                        </div>
                                        <div className="press-date">{item.date}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Closing CTA */}
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
                        <button className="hero-cta">Work With Us</button>
                    </motion.div>
                </section>
            </div >
        </div >
    );
};

export default About;
