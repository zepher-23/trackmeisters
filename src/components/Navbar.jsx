import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logoWhite from '../assets/logo-white.png';

const navItems = [
    { label: 'Events', path: '/events' },
    { label: 'Media', path: '/media' },
    { label: 'Newsletter', path: '/newsletter' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
];

const moreItems = [
    { label: 'F1 Fantasy League', path: '/fantasy-league' },
    { label: 'Leaderboard', path: '/standings' },
    { label: 'Partners', path: '/partners' },
    { label: 'Classifieds', path: '/classifieds' }
];

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.more-dropdown')) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const isDarkHero = (location.pathname === '/' || location.pathname === '/fantasy-league') && !scrolled;

    return (
        <>
            <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${isDarkHero ? 'dark-hero-mode' : ''}`} data-page={location.pathname.substring(1) || 'home'}>
                <Link to="/" className="logo">
                    <img
                        src={logoWhite}
                        alt="Trackmeisters Logo"
                        className="logo-img"
                        style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                    />
                </Link>

                <div className="nav-links">
                    {navItems.map((item) => (
                        <Link key={item.label} to={item.path} className="nav-item">
                            {item.label}
                        </Link>
                    ))}

                    {/* More Dropdown */}
                    <div
                        className="nav-item more-dropdown"
                        style={{ position: 'relative', cursor: 'pointer', overflow: 'visible' }}
                    >
                        <span
                            onClick={() => setMoreOpen(!moreOpen)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            More <ChevronDown size={16} style={{ transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </span>

                        {moreOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 10px)',
                                    right: 0,
                                    background: 'var(--color-surface)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(128,128,128,0.2)',
                                    borderRadius: '8px',
                                    padding: '8px 0',
                                    minWidth: '200px',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                                    zIndex: 1000
                                }}
                            >
                                {moreItems.map((item) => (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        onClick={() => setMoreOpen(false)}
                                        style={{
                                            display: 'block',
                                            padding: '12px 16px',
                                            color: 'var(--color-text-primary)',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            whiteSpace: 'nowrap'
                                        }}
                                        className="dropdown-item"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                        <Menu size={24} color={isDarkHero ? '#ffffff' : 'var(--color-text-primary)'} />
                    </button>
                </div>
            </nav>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="mobile-menu"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <button
                            style={{ position: 'absolute', top: 25, right: 20 }}
                            onClick={() => setMobileOpen(false)}
                        >
                            <X size={32} color="var(--color-text-primary)" />
                        </button>
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                to={item.path}
                                className="mobile-link"
                                style={{ color: 'var(--color-text-primary)' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                        {/* More items shown directly on mobile */}
                        <div style={{
                            marginTop: '20px',
                            paddingTop: '20px',
                            borderTop: '1px solid rgba(128,128,128,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            width: '100%'
                        }}>
                            {moreItems.map((item) => (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    className="mobile-link"
                                    style={{ color: 'var(--color-text-primary)' }}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
