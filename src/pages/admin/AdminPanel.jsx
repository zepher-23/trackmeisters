import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import BlogEditPage from './BlogEditPage';
import RegistrationsList from './RegistrationsList';
import AdminEventForm from './AdminEventForm';
import AdminEventResults from './AdminEventResults';
import AdminHomepage from './AdminHomepage';

const AdminPanel = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        // Check for existing auth session
        const auth = localStorage.getItem('adminAuth');
        if (auth) {
            const { authenticated, timestamp } = JSON.parse(auth);
            // Session expires after 24 hours
            const isValid = authenticated && (Date.now() - timestamp) < 24 * 60 * 60 * 1000;
            setIsAuthenticated(isValid);
            if (!isValid) {
                localStorage.removeItem('adminAuth');
            }
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (status) => {
        setIsAuthenticated(status);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        setIsAuthenticated(false);
    };

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
                color: '#fff'
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    return (
        <Routes>
            <Route path="/" element={<AdminDashboard onLogout={handleLogout} />} />
            <Route path="/homepage" element={<AdminHomepage />} />
            <Route path="/registrations" element={<RegistrationsList />} />
            <Route path="/newsletter/new" element={<BlogEditPage />} />
            <Route path="/newsletter/edit/:id" element={<BlogEditPage />} />
            <Route path="/events/new" element={<AdminEventForm />} />
            <Route path="/events/edit/:id" element={<AdminEventForm />} />
            <Route path="/events/results/:id" element={<AdminEventResults />} />
        </Routes>
    );
};

export default AdminPanel;
