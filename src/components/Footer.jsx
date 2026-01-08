import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
    <footer>
        <div className="footer-content">
            <div className="footer-col" style={{ gridColumn: 'span 2' }}>
                <div className="logo" style={{ marginBottom: 20 }}>Track<span>meisters</span></div>
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

export default Footer;
