import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowUpRight } from 'lucide-react';

const Contact = () => {
    const [formState, setFormState] = useState({ name: '', email: '', message: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Message sent! We will see you on the track.');
        setFormState({ name: '', email: '', message: '' });
    };

    return (
        <section id="contact" className="contact-section" style={{ paddingTop: '150px' }}>
            <div className="contact-container">
                <div className="contact-info">
                    <h2>Get in Touch</h2>
                    <p>Ready to race? Have questions about our events or sponsorship opportunities? Contact the Trackmeisters team today.</p>

                    <div className="contact-methods">
                        <div className="contact-method-item">
                            <div className="contact-icon"><MapPin size={20} /></div>
                            <span>Nürburgring Boulevard 1, 53520 Nürburg, Germany</span>
                        </div>
                        <div className="contact-method-item">
                            <div className="contact-icon"><Calendar size={20} /></div>
                            <span>Mon - Fri: 9:00 AM - 6:00 PM</span>
                        </div>
                    </div>

                    <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
                        Chat on WhatsApp <ArrowUpRight size={16} />
                    </a>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="contact-form"
                >
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formState.name}
                                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formState.email}
                                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea
                                className="form-textarea"
                                value={formState.message}
                                onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                required
                            ></textarea>
                        </div>
                        <button type="submit" className="submit-btn">Send Message</button>
                    </form>
                </motion.div>
            </div>
        </section>
    );
};

export default Contact;
