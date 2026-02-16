import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, deleteDocument } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Calendar, Mail, Phone, User, Download, Filter, Search, Users, Clock, ArrowLeft, Trash2, AlertTriangle, X, Loader2, Eye, FileText, CheckCircle, Car, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import './admin.css';

const RegistrationsList = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('events'); // 'events' or 'fantasy'
    const [eventsList, setEventsList] = useState([]);
    const [eventsMap, setEventsMap] = useState({});

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [itemToView, setItemToView] = useState(null);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const eventParam = searchParams.get('event');
        if (eventParam) {
            setSelectedEvent(eventParam);
        }
        fetchData();
    }, [searchParams]);

    const fetchData = async () => {
        if (!db) {
            console.warn('Firebase DB not initialized');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const eventsSnapshot = await getDocs(collection(db, 'events'));
            const eventsData = eventsSnapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title
            }));

            const eventLookup = {};
            eventsData.forEach(event => {
                eventLookup[event.id] = event.title;
            });
            setEventsMap(eventLookup);
            setEventsList(eventsData.map(e => e.title));

            const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().createdAt
            }));

            setRegistrations(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleViewClick = (reg) => {
        setItemToView(reg);
        setViewModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDocument('registrations', itemToDelete);
            setRegistrations(prev => prev.filter(item => item.id !== itemToDelete));
            setDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete registration. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const getEventName = (reg) => {
        if (reg.type === 'f1_fantasy') {
            return 'F1 Fantasy League';
        }
        if (reg.eventId && eventsMap[reg.eventId]) {
            return eventsMap[reg.eventId];
        }
        return reg.event || 'Unknown Event';
    };

    const filteredData = registrations.filter(item => {
        // Mode Filtering
        if (viewMode === 'fantasy') {
            if (item.type !== 'f1_fantasy') return false;
        } else {
            if (item.type === 'f1_fantasy') return false;
        }

        const currentEventName = getEventName(item);
        const matchesEvent = selectedEvent === 'All' || currentEventName === selectedEvent;
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.email?.toLowerCase().includes(searchTerm.toLowerCase());

        // In fantasy mode, ignore event filter (as there's only one "event")
        if (viewMode === 'fantasy') return matchesSearch;

        return matchesEvent && matchesSearch;
    });

    const exportToExcel = () => {
        if (filteredData.length === 0) return;

        const dataToExport = filteredData.map(row => {
            const date = row.timestamp ? new Date(row.timestamp).toLocaleDateString() : '';
            const eventName = getEventName(row);
            const classes = row.selectedClasses ? row.selectedClasses.map(c => c.name).join('; ') : '';

            return {
                'Registration ID': row.registrationId || 'N/A',
                'Name': row.name,
                'Email': row.email,
                'Phone': row.phone,
                'Gender': row.gender,
                'Address': row.address,
                'Emerg. Contact': row.emergencyContact,
                'Event': eventName,
                'Type': row.type,
                'Selected Classes': classes,
                'Total Amount': row.totalAmount,
                'Status': row.status,
                'FMSCI License': row.fmsciLicense,
                'Team Name': row.teamName,
                'Car Model': row.carModel,
                'Engine': row.engineDisplacement,
                'Reg No': row.registrationNumber,
                'Is Race Build': row.isRaceBuild ? 'Yes' : 'No',
                'RC Link': row.vehicleRC,
                'Insurance Link': row.vehicleInsurance,
                'Payment Screenshot': row.paymentScreenshot,
                'Comments': row.comments,
                'Date': date
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

        // Adjust column widths (optional but nice)
        const wscols = [
            { wch: 15 }, // ID
            { wch: 20 }, // Name
            { wch: 25 }, // Email
            { wch: 15 }, // Phone
            { wch: 10 }, // Gender
            { wch: 30 }, // Address
            { wch: 15 }, // Emergency
            { wch: 20 }, // Event
            { wch: 10 }, // Type
            { wch: 30 }, // Classes
            { wch: 10 }, // Amount
            { wch: 10 }, // Status
        ];
        worksheet['!cols'] = wscols;

        const filename = `registrations_${viewMode}_${selectedEvent.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, filename);
    };

    return (
        <div className="admin-dashboard">
            <div className="admin-main" style={{ marginLeft: 0 }}>
                {/* Header */}
                <div className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => navigate('/admin')}
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '8px' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ marginBottom: '4px', fontSize: '24px' }}>Registrations</h1>
                            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', margin: 0 }}>
                                Manage event signups
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <button onClick={exportToExcel} className="admin-btn admin-btn-primary">
                            <Download size={16} /> Export Excel
                        </button>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                            Exporting: <strong style={{ color: 'var(--admin-text)' }}>
                                {viewMode === 'fantasy' ? 'F1 Fantasy' : (selectedEvent === 'All' ? 'All Events' : selectedEvent)}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid var(--admin-border)', marginBottom: '20px', display: 'flex', gap: '24px' }}>
                    <button
                        onClick={() => setViewMode('events')}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: viewMode === 'events' ? 'var(--admin-primary)' : 'var(--admin-text-secondary)',
                            borderBottom: viewMode === 'events' ? '2px solid var(--admin-primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Car size={18} /> Event Registrations
                    </button>
                    <button
                        onClick={() => setViewMode('fantasy')}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: viewMode === 'fantasy' ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                            borderBottom: viewMode === 'fantasy' ? '2px solid var(--admin-accent)' : '2px solid transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Trophy size={18} /> F1 Fantasy 2026
                    </button>
                </div>

                {/* Filters & Stats */}
                <div className="admin-card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
                        {viewMode === 'events' && (
                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                <label className="admin-form-label"><Filter size={14} /> Filter by Event</label>
                                <div className="admin-input-group">
                                    <select
                                        value={selectedEvent}
                                        onChange={(e) => setSelectedEvent(e.target.value)}
                                        className="admin-form-select"
                                    >
                                        <option value="All">All Events</option>
                                        {eventsList.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label className="admin-form-label"><Search size={14} /> Search</label>
                            <div className="admin-input-group">
                                <input
                                    type="text"
                                    placeholder="Search name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="admin-form-input"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', padding: '10px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={20} className="text-primary" />
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: '800' }}>{filteredData.length}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>
                                        {viewMode === 'fantasy' ? 'Teams' : 'Total'}
                                    </div>
                                </div>
                            </div>
                            {viewMode === 'events' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={20} className="text-success" color="#10b981" />
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: '800' }}>{eventsList.length}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Events</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Trophy size={20} className="text-accent" color="#ef4444" />
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: '800' }}>2026</div>
                                        <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Season</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="admin-page-loading">
                        <Loader2 className="spin" size={32} />
                    </div>
                ) : filteredData.length > 0 ? (
                    <>
                        {/* Desktop View: Standard Table */}
                        <div className="admin-card admin-desktop-view">
                            <div style={{ overflowX: 'auto' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            {viewMode === 'events' ? <th>Event</th> : <th>Team Name</th>}
                                            <th>Contact</th>
                                            {viewMode === 'events' && <th>Type</th>}
                                            <th>Date</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map(reg => (
                                            <tr key={reg.id} onClick={() => handleViewClick(reg)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} className="hover-row">
                                                <td>
                                                    <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                                                        {reg.registrationId || '---'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255, 42, 42, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <User size={12} className="text-primary" />
                                                        </div>
                                                        {reg.name}
                                                    </div>
                                                </td>
                                                <td>
                                                    {viewMode === 'events' ? (
                                                        <span className="badge badge-primary" style={{ background: 'rgba(255, 42, 42, 0.15)', color: '#ff6b6b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                                            {getEventName(reg)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontWeight: '700', color: 'var(--admin-accent)', fontSize: '13px' }}>
                                                            {reg.teamName || 'N/A'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={10} /> {reg.email}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={10} /> {reg.phone || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                {viewMode === 'events' && (
                                                    <td>
                                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-secondary)' }}>
                                                            {reg.selectedClass?.name || reg.type || 'Reg'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td style={{ fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                                                    {reg.timestamp ? new Date(reg.timestamp).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td>
                                                    {/* View button removed, row is clickable */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(reg.id); }}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', padding: '4px' }}
                                                        className="hover-text-danger"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile View: Fixed Sticky Table */}
                        <div className="admin-mobile-view" style={{ marginTop: '20px' }}>
                            <div style={{
                                maxWidth: 'calc(100vw - 40px)',
                                overflowX: 'auto',
                                borderRadius: '12px',
                                border: '1px solid var(--admin-border)',
                                background: 'var(--admin-surface)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}>
                                <table className="admin-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            {/* Sticky User Column */}
                                            <th style={{
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 20,
                                                background: '#02233f', // Solid color matching --admin-bg
                                                borderRight: '1px solid var(--admin-border)',
                                                borderBottom: '1px solid var(--admin-border)',
                                                minWidth: '160px',
                                                whiteSpace: 'nowrap',
                                                padding: '12px 16px'
                                            }}>
                                                User Details
                                            </th>
                                            <th style={{ minWidth: '120px', whiteSpace: 'nowrap', background: 'rgba(10, 40, 70, 0.5)', padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>
                                                {viewMode === 'events' ? 'Event' : 'Team Name'}
                                            </th>
                                            <th style={{ minWidth: '160px', whiteSpace: 'nowrap', background: 'rgba(10, 40, 70, 0.5)', padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>Contact</th>
                                            {viewMode === 'events' && (
                                                <th style={{ minWidth: '100px', whiteSpace: 'nowrap', background: 'rgba(10, 40, 70, 0.5)', padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>Type</th>
                                            )}
                                            <th style={{ minWidth: '100px', whiteSpace: 'nowrap', background: 'rgba(10, 40, 70, 0.5)', padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>Date</th>
                                            <th style={{ minWidth: '80px', whiteSpace: 'nowrap', background: 'rgba(10, 40, 70, 0.5)', padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map(reg => (
                                            <tr key={reg.id} onClick={() => handleViewClick(reg)} style={{ cursor: 'pointer' }}>
                                                {/* Sticky User Cell */}
                                                <td style={{
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 10,
                                                    background: '#0a2846', // Solid color approximating surface
                                                    borderRight: '1px solid var(--admin-border)',
                                                    borderBottom: '1px solid var(--admin-border)',
                                                    whiteSpace: 'nowrap',
                                                    padding: '12px 16px'
                                                }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ fontWeight: '700', color: 'var(--admin-text)', fontSize: '13px' }}>{reg.name}</div>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--admin-text-secondary)', opacity: 0.8 }}>
                                                            {reg.registrationId || '---'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border)', padding: '12px 16px' }}>
                                                    {viewMode === 'events' ? (
                                                        <span className="badge badge-primary" style={{ background: 'rgba(255, 42, 42, 0.15)', color: '#ff6b6b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                                            {getEventName(reg)}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontWeight: '700', color: 'var(--admin-accent)', fontSize: '13px' }}>
                                                            {reg.teamName || 'N/A'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border)', padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={10} /> {reg.email}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={10} /> {reg.phone || 'N/A'}</div>
                                                    </div>
                                                </td>
                                                {viewMode === 'events' && (
                                                    <td style={{ whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border)', padding: '12px 16px' }}>
                                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-secondary)' }}>
                                                            {reg.selectedClass?.name || reg.type || 'Reg'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td style={{ whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border)', padding: '12px 16px', fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                                                    {reg.timestamp ? new Date(reg.timestamp).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap', borderBottom: '1px solid var(--admin-border)', padding: '12px 16px' }}>
                                                    {/* View button removed */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(reg.id); }}
                                                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--admin-danger)', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="admin-empty-state">
                        <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3>No registrations found</h3>
                        <p>Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeleteModalOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="admin-card"
                            style={{ maxWidth: '400px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Delete Registration?</h3>
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                                <div style={{
                                    width: '60px', height: '60px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <AlertTriangle size={32} className="text-danger" />
                                </div>
                                <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                                    Are you sure you want to delete this registration?
                                    <br />
                                    <span style={{ color: 'var(--admin-danger)', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                                        This action cannot be undone.
                                    </span>
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="admin-btn admin-btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="admin-btn admin-btn-danger"
                                    style={{ flex: 1 }}
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* View Details Modal */}
            <AnimatePresence>
                {viewModalOpen && itemToView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewModalOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="admin-card"
                            style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--admin-surface)', zIndex: 10 }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {itemToView.name}
                                        <span style={{ fontSize: '12px', background: 'var(--admin-primary)', padding: '2px 8px', borderRadius: '12px', color: 'white' }}>
                                            {itemToView.registrationId || 'ID N/A'}
                                        </span>
                                    </h3>
                                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
                                        {getEventName(itemToView)} • {new Date(itemToView.timestamp).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewModalOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                {/* Status & Quick Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: itemToView.status === 'confirmed' ? '#22c55e' : '#eab308', textTransform: 'capitalize' }}>
                                            {itemToView.status || 'Pending'}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Amount</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--admin-text)' }}>
                                            {itemToView.totalAmount || 'Free'}
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={18} /> Personal Details
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Full Name</label>
                                            <div style={{ fontSize: '14px' }}>{itemToView.name}</div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Email</label>
                                            <div style={{ fontSize: '14px' }}>{itemToView.email}</div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Phone</label>
                                            <div style={{ fontSize: '14px' }}>{itemToView.phone || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Gender</label>
                                            <div style={{ fontSize: '14px' }}>{itemToView.gender || 'N/A'}</div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Address</label>
                                            <div style={{ fontSize: '14px' }}>{itemToView.address || 'N/A'}</div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Emergency Contact</label>
                                            <div style={{ fontSize: '14px' }}>{itemToView.emergencyContact || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* F1 Fantasy Specific Details */}
                            {itemToView.type === 'f1_fantasy' && (
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Trophy size={18} className="text-accent" /> F1 Fantasy Team
                                    </h4>
                                    <div style={{ padding: '16px', background: 'rgba(255, 42, 42, 0.1)', border: '1px solid var(--admin-primary)', borderRadius: '8px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Team Name</label>
                                        <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>{itemToView.teamName || 'N/A'}</div>
                                    </div>
                                </div>
                            )}

                            {/* Racing & Vehicle Information - Show only if NOT F1 Fantasy */}
                            {itemToView.type !== 'f1_fantasy' && (
                                <>
                                    <div>
                                        <h4 style={{ fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Car size={18} /> Racing & Vehicle Details
                                        </h4>

                                        {itemToView.isRaceBuild && (
                                            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: '6px', fontSize: '14px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertTriangle size={18} />
                                                <strong>Purpose-Built Race Car</strong> (Non-Street Legal)
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>FMSCI License</label>
                                                <div style={{ fontSize: '14px' }}>{itemToView.fmsciLicense || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Team Name</label>
                                                <div style={{ fontSize: '14px' }}>{itemToView.teamName || 'N/A'}</div>
                                            </div>

                                            <div style={{ height: '1px', background: 'var(--admin-border)', gridColumn: '1 / -1', margin: '10px 0' }}></div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Car Make & Model</label>
                                                <div style={{ fontSize: '14px' }}>{itemToView.carModel || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Engine Displacement</label>
                                                <div style={{ fontSize: '14px' }}>{itemToView.engineDisplacement || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Registration Number</label>
                                                <div style={{ fontSize: '14px' }}>{itemToView.registrationNumber || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Documents */}
                                        <div style={{ marginTop: '20px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Documents</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                                {itemToView.vehicleRC ? (
                                                    <a href={itemToView.vehicleRC} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '6px', color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
                                                        <FileText size={18} /> View Vehicle RC
                                                    </a>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', color: 'var(--admin-text-secondary)', fontSize: '14px' }}>
                                                        <FileText size={18} /> No RC Uploaded
                                                    </div>
                                                )}

                                                {itemToView.vehicleInsurance ? (
                                                    <a href={itemToView.vehicleInsurance} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '6px', color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
                                                        <FileText size={18} /> View Insurance
                                                    </a>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', color: 'var(--admin-text-secondary)', fontSize: '14px' }}>
                                                        <FileText size={18} /> No Insurance Uploaded
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {itemToView.paymentScreenshot && (
                                            <div style={{ marginTop: '20px', borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '10px' }}>Payment Proof</label>
                                                <a href={itemToView.paymentScreenshot} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                                    <img
                                                        src={itemToView.paymentScreenshot}
                                                        alt="Payment Screenshot"
                                                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Participation Details */}
                            <div>
                                <h4 style={{ fontSize: '16px', fontWeight: '700', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={18} /> Participation Details
                                </h4>

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Selected Classes / Passes</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {itemToView.selectedClasses && itemToView.selectedClasses.length > 0 ? (
                                            itemToView.selectedClasses.map((cls, idx) => (
                                                <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--admin-border)', padding: '6px 12px', borderRadius: '4px', fontSize: '13px' }}>
                                                    {cls.name} <span style={{ opacity: 0.5, marginLeft: '6px' }}>{cls.price}</span>
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>None selected or Visitor Pass</span>
                                        )}
                                    </div>
                                </div>

                                {itemToView.comments && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--admin-text-secondary)', marginBottom: '4px' }}>Comments / Special Requests</label>
                                        <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--admin-border)', borderRadius: '6px', fontSize: '14px', whiteSpace: 'pre-line' }}>
                                            {itemToView.comments}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--admin-border)' }}>
                                <button
                                    onClick={() => setViewModalOpen(false)}
                                    className="admin-btn admin-btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default RegistrationsList;
