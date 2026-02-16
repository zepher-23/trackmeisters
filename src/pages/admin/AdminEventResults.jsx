import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Trophy, Timer, AlertCircle, X, Users, Plus, Trash2, Edit2, Clock, Upload, FileText } from 'lucide-react';
import { fetchDocument, updateDocument } from '../../lib/firebase';
import { uploadFileToCloudinary } from '../../lib/cloudinary';
import './admin.css';

const AdminEventResults = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [event, setEvent] = useState(null);

    const [formData, setFormData] = useState({
        winner: '',
        fastestLap: '',
        fastestDriver: '',
        fastestCar: '',
        totalRacers: '',
        status: 'completed'
    });

    const [activeClassTab, setActiveClassTab] = useState(null);

    // Structure: { "Class Name": [{ pos: 1, driver: "", car: "", time: "" }] }
    const [classResults, setClassResults] = useState({});

    // State for PDF Uploads
    const [resultFiles, setResultFiles] = useState([]);
    const [uploadingPdfs, setUploadingPdfs] = useState(false);

    // --- Time Calculation Helpers ---
    const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        let cleanStr = timeStr.toString().trim();
        let isNegative = false;

        if (cleanStr.startsWith('-')) {
            isNegative = true;
            cleanStr = cleanStr.substring(1);
        }

        let minutes = 0;
        let seconds = 0;

        if (cleanStr.includes(':')) {
            const parts = cleanStr.split(':');
            minutes = parseFloat(parts[0]) || 0;

            if (parts.length === 2) {
                // Format: mm:ss.ms (standard)
                seconds = parseFloat(parts[1]) || 0;
            } else if (parts.length >= 3) {
                // Format: mm:ss:ms (user input variant, e.g. 1:12:11)
                // Treat the 3rd part as the decimal/fraction of the second
                const secInt = parseInt(parts[1]) || 0;
                const msPart = parts[2];
                seconds = parseFloat(`${secInt}.${msPart}`) || 0;
            }
        } else {
            seconds = parseFloat(cleanStr) || 0;
        }
        const totalSeconds = (minutes * 60) + seconds;
        return isNegative ? -totalSeconds : totalSeconds;
    };

    const formatTime = (secondsTotal) => {
        if (!secondsTotal && secondsTotal !== 0) return '';
        const absSeconds = Math.abs(secondsTotal);
        const mins = Math.floor(absSeconds / 60);
        const secs = (absSeconds % 60).toFixed(3);
        const secsStr = secs < 10 ? `0${secs}` : secs;
        return mins > 0 ? `${mins}:${secsStr}` : secsStr;
    };

    const calculateRowTotal = (lapsStr, penaltyStr) => {
        const laps = lapsStr ? lapsStr.split(',').map(l => parseTime(l.trim())).filter(t => t > 0) : [];
        const penalty = parseTime(penaltyStr);

        let fastestLap = 0;
        if (laps.length > 0) {
            fastestLap = Math.min(...laps);
        } else {
            // If no laps, but maybe there's a penalty? 
            // If no laps, Total Time is usually invalid or just penalty?
            // Let's assume 0.
            if (penalty === 0) return '';
        }

        const total = fastestLap + penalty;
        // Total can be negative if bonus > fastest lap, but rare. 
        // We typically just show the time value.
        return total !== 0 ? formatTime(total) : '';
    };

    const recalculateDiffs = (rows) => {
        // We do NOT sort here to avoid jumping rows while editing.
        // We calculate diff against the racer listed immediately above.
        return rows.map((row, idx) => {
            if (idx === 0) return { ...row, diff: '-' };

            const prevRow = rows[idx - 1];
            const currentTotal = parseTime(row.totalTime);
            const prevTotal = parseTime(prevRow.totalTime);

            if (currentTotal > 0 && prevTotal > 0) {
                const diff = currentTotal - prevTotal;
                const sign = diff < 0 ? '-' : '+';
                return { ...row, diff: `${sign}${formatTime(diff)}` };
            }
            return { ...row, diff: '' };
        });
    };

    const findFastestLap = (rows) => {
        let fastest = Infinity;
        let fastestStr = '';
        rows.forEach(r => {
            const laps = r.laps ? r.laps.split(',').map(l => l.trim()) : [];
            // Also check 'time' field if laps are empty? No, rely on laps if present.
            // Or check the 'time' field too which is 'Best'.
            // Let's check all individual laps.
            laps.forEach(l => {
                const t = parseTime(l);
                if (t > 0 && t < fastest) {
                    fastest = t;
                    fastestStr = l;
                }
            });
            // Fallback to 'time' (Best) field if manually entered
            const bestManual = parseTime(r.time);
            if (bestManual > 0 && bestManual < fastest) {
                fastest = bestManual;
                fastestStr = r.time;
            }
        });
        return fastestStr;
    }
    // ----------------------------

    // State for Lap Editor Modal
    const [activeLapEdit, setActiveLapEdit] = useState(null); // { className, rowIndex, driverName, carName, laps: [] }

    // Lap Editor Methods
    const openLapEditor = (className, rowIndex, currentLaps, driverName, carName) => {
        // Parse current string into array
        let lapArray = [];
        if (currentLaps) {
            lapArray = currentLaps.toString().split(',').map(l => l.trim()).filter(l => l);
        }
        if (lapArray.length === 0) lapArray = ['']; // Start with one empty if none

        setActiveLapEdit({
            className,
            rowIndex,
            driverName: driverName || 'Unknown Driver',
            carName: carName || 'Unknown Car',
            laps: lapArray
        });
    };

    const closeLapEditor = () => {
        setActiveLapEdit(null);
    };

    const updateLapInEditor = (idx, value) => {
        if (!activeLapEdit) return;
        const newLaps = [...activeLapEdit.laps];
        newLaps[idx] = value;
        setActiveLapEdit({ ...activeLapEdit, laps: newLaps });
    };

    const addLapInEditor = () => {
        if (!activeLapEdit) return;
        setActiveLapEdit({ ...activeLapEdit, laps: [...activeLapEdit.laps, ''] });
    };

    const removeLapInEditor = (idx) => {
        if (!activeLapEdit) return;
        const newLaps = [...activeLapEdit.laps];
        newLaps.splice(idx, 1);
        setActiveLapEdit({ ...activeLapEdit, laps: newLaps });
    };

    const saveLapsFromEditor = () => {
        if (!activeLapEdit) return;
        // Join non-empty laps
        const lapString = activeLapEdit.laps.filter(l => l.trim()).join(', ');

        setClassResults(prev => {
            const className = activeLapEdit.className;
            const rowIndex = activeLapEdit.rowIndex;
            const currentRows = [...(prev[className] || [])];
            const row = currentRows[rowIndex];

            // 1. Update Laps
            const updatedRow = { ...row, laps: lapString };

            // 2. Auto-Calc Total Time
            updatedRow.totalTime = calculateRowTotal(lapString, updatedRow.penalty);

            // 3. Auto-Calc Best Lap (optional but helpful)
            // Find best lap in the new list
            const lapTimes = activeLapEdit.laps.map(l => ({ str: l, val: parseTime(l) })).filter(x => x.val > 0);
            if (lapTimes.length > 0) {
                lapTimes.sort((a, b) => a.val - b.val);
                updatedRow.time = lapTimes[0].str;
            }

            currentRows[rowIndex] = updatedRow;

            // 4. Recalculate Diffs for the class
            const reCalcedRows = recalculateDiffs(currentRows);

            return { ...prev, [className]: reCalcedRows };
        });

        closeLapEditor();
    };

    useEffect(() => {
        if (id) {
            loadEventData();
        }
    }, [id]);

    const loadEventData = async () => {
        setLoading(true);
        try {
            const data = await fetchDocument('events', id);
            if (data) {
                setEvent(data);
                setFormData({
                    winner: data.winner || '',
                    fastestLap: data.fastestLap || '',
                    fastestDriver: data.fastestDriver || '',
                    fastestCar: data.fastestCar || '',
                    totalRacers: data.totalRacers || '',
                    status: data.status || 'completed'
                });

                if (data.resultFiles) {
                    setResultFiles(data.resultFiles);
                }

                // Set initial active tab
                if (data.classes && data.classes.length > 0) {
                    setActiveClassTab(data.classes[0].name);
                }

                // Initialize classResults
                if (data.classResults) {
                    setClassResults(data.classResults);
                } else if (data.classes && data.classes.length > 0) {
                    // Initialize empty rows for available classes
                    const initialResults = {};
                    data.classes.forEach(cls => {
                        initialResults[cls.name] = [{ pos: '1', compNo: '', driver: '', car: '', time: '', lapVideo: '', laps: '', penalty: '', totalTime: '', diff: '' }];
                    });
                    setClassResults(initialResults);
                }
            } else {
                setError('Event not found');
            }
        } catch (err) {
            console.error('Error loading event:', err);
            setError('Failed to load event data');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingPdfs(true);
        setError(null);

        try {
            const uploadedFiles = [];
            for (const file of files) {
                const url = await uploadFileToCloudinary(file, 'results');
                uploadedFiles.push({
                    name: file.name,
                    url: url,
                    uploadedAt: new Date().toISOString()
                });
            }
            setResultFiles(prev => [...prev, ...uploadedFiles]);
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload one or more files');
        } finally {
            setUploadingPdfs(false);
        }
    };

    const handleDeleteFile = (index) => {
        setResultFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateDocument('events', id, {
                ...formData,
                classResults,
                resultFiles
            });
            navigate('/admin');
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save results');
        } finally {
            setSaving(false);
        }
    };

    const updateClassResult = (className, index, field, value) => {
        setClassResults(prev => {
            const newClassRows = [...(prev[className] || [])];
            const row = { ...newClassRows[index], [field]: value };

            // Auto-calc Total if penalty changes
            if (field === 'penalty') {
                row.totalTime = calculateRowTotal(row.laps, value);
            }

            // If totalTime is manually edited, we trust it, so we don't overwrite it with formula
            // unless laps/penalty changes.

            newClassRows[index] = row;

            // Recalculate Diffs always (sorting might change if pos changes, totals change etc)
            const reCalcedRows = recalculateDiffs(newClassRows);

            return { ...prev, [className]: reCalcedRows };
        });
    };

    const addClassRow = (className) => {
        setClassResults(prev => ({
            ...prev,
            [className]: [
                ...(prev[className] || []),
                { pos: (prev[className]?.length || 0) + 1, compNo: '', driver: '', car: '', time: '', lapVideo: '', laps: '', penalty: '', totalTime: '', diff: '' }
            ]
        }));
    };

    const removeClassRow = (className, index) => {
        setClassResults(prev => {
            const newClassRows = [...(prev[className] || [])];
            newClassRows.splice(index, 1);
            // Re-index positions
            const reindexed = newClassRows.map((row, i) => ({ ...row, pos: i + 1 }));
            return { ...prev, [className]: reindexed };
        });
    };

    if (loading) {
        return (
            <div className="admin-page-loading">
                <Loader2 className="spin" size={32} />
            </div>
        );
    }

    if (!event) return <div className="admin-error">Event not found</div>;

    return (
        <div className="admin-dashboard">
            {/* Lap Editor Modal Overlay */}
            {activeLapEdit && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--admin-bg)', width: '100%', maxWidth: '500px',
                        borderRadius: '12px', border: '1px solid var(--admin-border)',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={18} className="text-primary" /> Manage Laps
                                </h3>
                                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                                    {activeLapEdit.driverName} • {activeLapEdit.carName}
                                </p>
                            </div>
                            <button onClick={closeLapEditor} style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {activeLapEdit.laps.map((lap, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', width: '40px' }}>Lap {idx + 1}</span>
                                        <input
                                            type="text"
                                            value={lap}
                                            onChange={(e) => updateLapInEditor(idx, e.target.value)}
                                            placeholder="1:xx.xxx"
                                            className="admin-form-input"
                                            autoFocus={idx === activeLapEdit.laps.length - 1} // Autofocus last one if added
                                        />
                                        <button
                                            onClick={() => removeLapInEditor(idx)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                                            title="Remove Lap"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addLapInEditor}
                                className="admin-btn admin-btn-secondary"
                                style={{ width: '100%', marginTop: '15px', justifyContent: 'center', borderStyle: 'dashed' }}
                            >
                                <Plus size={16} /> Add Another Lap
                            </button>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '20px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={closeLapEditor} className="admin-btn admin-btn-secondary">Cancel</button>
                            <button onClick={saveLapsFromEditor} className="admin-btn admin-btn-primary">Save Laps</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-main" style={{ marginLeft: 0 }}>
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
                            <h1 style={{ marginBottom: '4px' }}>Event Results</h1>
                            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', margin: 0 }}>
                                {event.title} • {event.date}
                            </p>
                        </div>
                    </div>
                    <div className="admin-header-actions">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="admin-btn admin-btn-primary"
                        >
                            {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                            {saving ? 'Saving...' : 'Save Results'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="admin-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <div className="admin-card">
                    <div style={{ width: '100%' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={18} className="text-primary" /> Overall Summary
                        </h3>

                        <div className="admin-form-group">
                            <label className="admin-form-label">Event Status</label>
                            <select
                                className="admin-form-select"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="completed">Completed</option>
                                <option value="upcoming">Revert to Upcoming</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', marginTop: '6px' }}>
                                Changing to 'Upcoming' will move this event back to the main list.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Total Racers</label>
                                <div className="admin-input-group">
                                    <Users size={16} className="input-icon" style={{ top: '20px' }} />
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.totalRacers}
                                        onChange={(e) => setFormData({ ...formData, totalRacers: e.target.value })}
                                        placeholder="e.g. 42"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-form-label">Fastest Lap Time</label>
                                <div className="admin-input-group">
                                    <Timer size={16} className="input-icon" style={{ top: '20px' }} />
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.fastestLap}
                                        onChange={(e) => setFormData({ ...formData, fastestLap: e.target.value })}
                                        placeholder="e.g. 1:14.200"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-form-label">Fastest Driver</label>
                                <div className="admin-input-group">
                                    <Trophy size={16} className="input-icon" style={{ top: '20px', color: '#ffd700' }} />
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.fastestDriver}
                                        onChange={(e) => setFormData({ ...formData, fastestDriver: e.target.value })}
                                        placeholder="Name"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>

                            <div className="admin-form-group">
                                <label className="admin-form-label">Fastest Car</label>
                                <div className="admin-input-group">
                                    <Trophy size={16} className="input-icon" style={{ top: '20px', color: '#ffd700' }} />
                                    <input
                                        type="text"
                                        className="admin-form-input"
                                        value={formData.fastestCar}
                                        onChange={(e) => setFormData({ ...formData, fastestCar: e.target.value })}
                                        placeholder="Car Model"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="admin-form-group" style={{ marginTop: '20px' }}>
                            <label className="admin-form-label">Overall Winner (Optional Display)</label>
                            <input
                                type="text"
                                className="admin-form-input"
                                value={formData.winner}
                                onChange={(e) => setFormData({ ...formData, winner: e.target.value })}
                                placeholder="e.g. Alex M. (Porsche 911 GT3)"
                            />
                        </div>

                        <div className="admin-form-group" style={{ marginTop: '30px', borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} /> Result Documents (PDF)
                            </h3>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                                <label className="admin-btn admin-btn-secondary" style={{ cursor: loading || uploadingPdfs ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {uploadingPdfs ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                                    {uploadingPdfs ? 'Uploading...' : 'Upload PDF'}
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        multiple
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                        disabled={loading || uploadingPdfs}
                                    />
                                </label>
                                <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>
                                    Select multiple PDF files.
                                </span>
                            </div>

                            {resultFiles.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {resultFiles.map((file, idx) => (
                                        <div key={file.url || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-bg)', padding: '10px', borderRadius: '6px', border: '1px solid var(--admin-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <FileText size={18} style={{ color: '#ef4444' }} />
                                                <div>
                                                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--admin-text)' }}>{file.name}</div>
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--color-primary)', textDecoration: 'none' }}>View Document</a>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFile(idx)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                title="Remove File"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Class-wise Leaderboards */}
                        <div style={{ marginTop: '40px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--admin-text)', marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
                                Class Leaderboards
                            </h3>

                            {!event.classes || event.classes.length === 0 ? (
                                <p style={{ color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>No specifically defined classes for this event.</p>
                            ) : (
                                <div>
                                    {/* Class Tabs */}
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
                                        {event.classes.map((cls, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveClassTab(cls.name)}
                                                className={`admin-btn ${activeClassTab === cls.name ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                {cls.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Active Class Table */}
                                    {activeClassTab && (
                                        <div style={{ background: 'var(--admin-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                                            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: 'var(--admin-text)' }}>
                                                {activeClassTab} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--admin-text-secondary)' }}>Results</span>
                                            </h4>

                                            <div style={{ overflowX: 'auto' }}>
                                                <table className="admin-table" style={{ fontSize: '13px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '60px' }}>Pos</th>
                                                            <th style={{ width: '80px' }}>Comp</th>
                                                            <th style={{ minWidth: '180px' }}>Driver</th>
                                                            <th style={{ minWidth: '160px' }}>Car</th>
                                                            <th style={{ width: '100px' }}>Video</th>
                                                            <th style={{ width: '100px' }}>Best</th>
                                                            <th style={{ minWidth: '200px' }}>Laps</th>
                                                            <th style={{ width: '80px' }}>Pen</th>
                                                            <th style={{ width: '120px' }}>Total</th>
                                                            <th style={{ width: '100px' }}>Diff</th>
                                                            <th style={{ width: '40px' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(classResults[activeClassTab] || []).map((row, rowIdx) => (
                                                            <tr key={rowIdx}>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.pos}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'pos', e.target.value)}
                                                                        style={{ width: '40px', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '4px', textAlign: 'center' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.compNo || ''}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'compNo', e.target.value)}
                                                                        placeholder="#"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.driver}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'driver', e.target.value)}
                                                                        placeholder="Name"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.car}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'car', e.target.value)}
                                                                        placeholder="Car"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.lapVideo || ''}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'lapVideo', e.target.value)}
                                                                        placeholder="Link"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.time}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'time', e.target.value)}
                                                                        placeholder="Best"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        onClick={() => openLapEditor(activeClassTab, rowIdx, row.laps, row.driver, row.car)}
                                                                        style={{
                                                                            width: '100%',
                                                                            background: row.laps ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                                            border: '1px solid var(--admin-border)',
                                                                            color: row.laps ? 'var(--color-primary)' : 'var(--admin-text-secondary)',
                                                                            padding: '6px',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            textAlign: 'left',
                                                                            fontSize: '12px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between'
                                                                        }}
                                                                    >
                                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {row.laps ? row.laps : 'Add Laps'}
                                                                        </span>
                                                                        <Edit2 size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                                                                    </button>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.penalty || ''}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'penalty', e.target.value)}
                                                                        placeholder="Pen"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.totalTime || ''}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'totalTime', e.target.value)}
                                                                        placeholder="Total"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={row.diff || ''}
                                                                        onChange={(e) => updateClassResult(activeClassTab, rowIdx, 'diff', e.target.value)}
                                                                        placeholder="Diff"
                                                                        style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: '#fff', padding: '6px' }}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        onClick={() => removeClassRow(activeClassTab, rowIdx)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button
                                                    onClick={() => addClassRow(activeClassTab)}
                                                    className="admin-btn admin-btn-sm admin-btn-secondary"
                                                    style={{ marginTop: '10px' }}
                                                >
                                                    + Add Row
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminEventResults;
