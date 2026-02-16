import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoWhite from '../assets/logo-white.png';
import logoBlack from '../assets/logo-black.png';

const Footer = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    setTheme(document.documentElement.getAttribute('data-theme'));
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        // Initial check in case it changed before observe
        setTheme(document.documentElement.getAttribute('data-theme') || 'dark');

        return () => observer.disconnect();
    }, []);

    return (
        <footer>
            <div className="footer-content">
                <div className="footer-col" style={{ gridColumn: 'span 2' }}>
                    <div className="logo" style={{ marginBottom: 20 }}>
                        <Link to="/">
                            <img src={theme === 'dark' ? logoWhite : logoBlack} alt="Trackmeisters" style={{ height: '48px', objectFit: 'contain' }} />
                        </Link>
                    </div>
                    <p style={{ color: '#666', maxWidth: 300 }}>Organizing the world's premier automotive events since 2010. Pure adrenaline, professional execution.</p>
                </div>
                <div className="footer-col">
                    <h4>Events</h4>
                    <ul>
                        <li><Link to="/events">Track Days</Link></li>
                        <li><Link to="/events">Racing Series</Link></li>
                        <li><Link to="/events">Car Meets</Link></li>
                        <li><Link to="/events">Tours</Link></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Company</h4>
                    <ul>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/careers">Careers</Link></li>
                        <li><Link to="/contact">Contact</Link></li>
                        <li><Link to="/partners">Partners</Link></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                        <li><Link to="/terms">Terms of Service</Link></li>
                        <li><Link to="/waivers">Waivers</Link></li>
                    </ul>
                </div>
            </div>
        </footer>
    );

};

export default Footer;
