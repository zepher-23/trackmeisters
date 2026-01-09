import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Calendar, Trophy, Users, Flag, MapPin, ArrowUpRight } from 'lucide-react';

const Hero = () => {
    return (
        <section className="hero">
            <div className="hero-grid"></div>
            <div className="hero-content">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="hero-subtitle"
                >
                    Automotive Excellence
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="hero-title"
                    data-text="OWN THE TRACK"
                >
                    OWN THE TRACK
                </motion.h1>
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="hero-cta"
                >
                    Explore Events <ChevronRight size={18} />
                </motion.button>
            </div>
        </section>
    );
};

const Ticker = () => (
    <div className="ticker-container">
        <div className="ticker-track">
            {[...Array(20)].map((_, i) => (
                <React.Fragment key={i}>
                    <div className="ticker-item"><Flag size={16} /> NEXT RACE: NORDSCHLEIFE CUP - MAR 14</div>
                    <div className="ticker-item"><Trophy size={16} /> CHAMPIONSHIP STANDINGS UPDATED</div>
                    <div className="ticker-item"><Calendar size={16} /> TRACK DAY SLOTS OPEN FOR SILVERSTONE</div>
                </React.Fragment>
            ))}
        </div>
    </div>
);

const BentoGrid = () => {
    const handleMouseMove = (e) => {
        const { currentTarget: target } = e;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        target.style.setProperty("--mouse-x", `${x}px`);
        target.style.setProperty("--mouse-y", `${y}px`);
    };

    return (
        <section className="bento-grid">
            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item large"
                onMouseMove={handleMouseMove}
            >
                <div className="bento-bg" style={{ backgroundColor: '#222', backgroundImage: 'url("/gt3-endurance.webp")' }}></div>
                <div className="bento-content">
                    <div className="bento-subtitle">Featured Series</div>
                    <div className="bento-title">GT3 Endurance Cup</div>
                    <p style={{ color: '#aaa', marginTop: 10, maxWidth: '80%', fontSize: '15px' }}>The ultimate test of man and machine. 24 hours of grueling competition across Europe's finest circuits.</p>
                    <button className="hero-cta" style={{ marginTop: 30 }}>View Series <ChevronRight size={16} /></button>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item"
                onMouseMove={handleMouseMove}
            >
                <div className="bento-bg" style={{ backgroundImage: 'url("/track-days.webp")' }}></div>
                <div className="bento-content">
                    <MapPin size={32} color="var(--color-accent)" style={{ marginBottom: 20 }} />
                    <div className="bento-title" style={{ fontSize: 24 }}>Track Days</div>
                    <div className="bento-subtitle">Silverstone &bull; Spa &bull; Monza</div>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item"
                onMouseMove={handleMouseMove}
            >
                <div className="bento-bg" style={{ backgroundImage: 'url("/community.webp")' }}></div>
                <div className="bento-content">
                    <Users size={32} color="var(--color-highlight)" style={{ marginBottom: 20 }} />
                    <div className="bento-title" style={{ fontSize: 24 }}>Community</div>
                    <div className="bento-subtitle">Join 50k+ Drivers</div>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item wide"
                onMouseMove={handleMouseMove}
            >
                <div className="bento-bg" style={{ backgroundImage: 'url("/porsche-news.webp")', backgroundPosition: 'center 60%' }}></div>
                <div className="bento-content">
                    <div className="bento-subtitle">Latest News</div>
                    <div className="bento-title">Porsche 911 GT3 RS: Track Weapon</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15, color: 'var(--color-accent)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                        Read Article <ArrowUpRight size={18} />
                    </div>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item tall"
                onMouseMove={handleMouseMove}
            >
                <div className="bento-bg" style={{ backgroundImage: 'url("/nurburgring.webp")' }}></div>
                <div className="bento-content">
                    <div className="bento-subtitle">Leaderboard</div>
                    <div className="bento-title">Nürburgring</div>
                    <ul style={{ marginTop: 30, listStyle: 'none', color: '#ccc', fontSize: '14px', fontFamily: 'monospace' }}>
                        <li style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>
                            <span style={{ color: '#fff' }}>1. Alex M.</span>
                            <span style={{ color: 'var(--color-accent)' }}>6:44.2</span>
                        </li>
                        <li style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>
                            <span style={{ color: '#fff' }}>2. Sarah J.</span>
                            <span style={{ color: '#fff' }}>6:44.8</span>
                        </li>
                        <li style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>
                            <span style={{ color: '#fff' }}>3. Mike R.</span>
                            <span style={{ color: '#fff' }}>6:45.1</span>
                        </li>
                        <li style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>
                            <span style={{ color: '#fff' }}>4. David K.</span>
                            <span style={{ color: '#fff' }}>6:46.3</span>
                        </li>
                    </ul>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ scale: 0.98 }}
                className="bento-item"
                onMouseMove={handleMouseMove}
            >
                <div className="bento-bg" style={{ backgroundImage: 'url("/sponsorship.webp")' }}></div>
                <div className="bento-content">
                    <div className="bento-title" style={{ fontSize: 24 }}>Sponsorships</div>
                    <div className="bento-subtitle">Partner with us</div>
                    <ArrowUpRight size={24} style={{ position: 'absolute', bottom: 40, right: 40, color: 'white' }} />
                </div>
            </motion.div>
        </section>
    );
};

const Home = () => {
    return (
        <>
            <Hero />
            <Ticker />
            <BentoGrid />
        </>
    );
};

export default Home;
