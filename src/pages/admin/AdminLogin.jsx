import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, AlertCircle } from 'lucide-react';
import './admin.css';
import logoWhite from '../../assets/logo-white.png';

const AdminLogin = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simple authentication - In production, use Netlify Identity or similar
        // Default credentials: admin / trackmaster2026
        if (credentials.username === 'admin' && credentials.password === 'trackmaster2026') {
            localStorage.setItem('adminAuth', JSON.stringify({
                authenticated: true,
                timestamp: Date.now()
            }));
            onLogin(true);
        } else {
            setError('Invalid credentials. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-bg"></div>

            <motion.div
                className="admin-login-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="admin-login-header">
                    <div className="admin-logo" style={{ background: 'transparent', width: 'auto', height: 'auto', padding: 0 }}>
                        <img src={logoWhite} alt="Trackmeisters" style={{ height: '64px' }} />
                    </div>
                    <h1>Admin Portal</h1>
                    <p>Secure access to website management</p>
                </div>

                <form onSubmit={handleSubmit} className="admin-login-form">
                    {error && (
                        <motion.div
                            className="admin-error"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <div className="admin-input-group">
                        <User size={18} className="input-icon" />
                        <input
                            type="text"
                            placeholder="Username"
                            value={credentials.username}
                            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                            required
                        />
                    </div>

                    <div className="admin-input-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            required
                        />
                    </div>

                    <motion.button
                        type="submit"
                        className="admin-login-btn"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Access Dashboard'}
                    </motion.button>
                </form>

                <div className="admin-login-footer">
                    <p>Protected area. Unauthorized access prohibited.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
