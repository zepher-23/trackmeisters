import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    'Events', 'Drivers', 'Media', 'Partners', 'Community', 'About', 'Contact'
];

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
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

    return (
        <>
            <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
                <Link to="/" className="logo">
                    Track<span>meisters</span>
                </Link>

                <div className="nav-links">
                    {navItems.map((item) => (
                        <Link key={item} to={`/${item.toLowerCase()}`} className="nav-item">
                            {item}
                        </Link>
                    ))}
                </div>

                <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
                    <Menu size={24} />
                </button>
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
                            <X size={32} color="white" />
                        </button>
                        {navItems.map((item) => (
                            <Link
                                key={item}
                                to={`/${item.toLowerCase()}`}
                                className="mobile-link"
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
