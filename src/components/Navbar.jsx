import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    'Events', 'Drivers', 'Media', 'Partners', 'Community', 'About', 'Contact'
];

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Theme Toggle Effect
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location]);

    return (
        <>
            <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} data-page={location.pathname.substring(1) || 'home'}>
                <Link to="/" className="logo">
                    Track<span>meisters</span>
                </Link>

                <div className="nav-links">
                    {navItems.map((item) => (
                        <Link key={item} to={`/${item.toLowerCase()}`} className="nav-item">
                            {item}
                        </Link>
                    ))}
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn"
                        style={{
                            marginLeft: '20px',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        className="mobile-theme-btn"
                        onClick={toggleTheme}
                        style={{
                            display: 'none', // Shown via CSS media query
                            marginRight: '10px'
                        }}
                    >
                        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                    </button>
                    <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                        <Menu size={24} />
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
                                key={item}
                                to={`/${item.toLowerCase()}`}
                                className="mobile-link"
                                style={{ color: 'var(--color-text-primary)' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                {item}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
