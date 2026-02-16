import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, User, Search, Filter, AlertTriangle, Loader2, Car, MapPin, Compass, Youtube } from 'lucide-react';
import { useEvents, getImageUrl } from '../hooks/useFirebase';

const Standings = () => {
    const { data: dbEvents, loading, error } = useEvents();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('All');
    const [selectedEvent, setSelectedEvent] = useState('All');
    const [selectedTrack, setSelectedTrack] = useState('All');
    const [selectedDirection, setSelectedDirection] = useState('All');
    const [selectedCar, setSelectedCar] = useState('All');



    // Helper to parse lap time string to milliseconds
    const parseLapTime = (timeStr) => {
        if (!timeStr) return Infinity;
        const cleanStr = timeStr.toString().trim();
        let minutes = 0;
        let seconds = 0;

        if (cleanStr.includes(':')) {
            const parts = cleanStr.split(':');
            minutes = parseFloat(parts[0]) || 0;

            if (parts.length >= 3) {
                // Format: mm:ss:ms (e.g., 1:12:450)
                const secInt = parseInt(parts[1]) || 0;
                const msPart = parts[2];
                // Treat the 3rd part as the decimal fraction
                seconds = parseFloat(`${secInt}.${msPart}`) || 0;
            } else {
                // Format: mm:ss.ms
                seconds = parseFloat(parts[1]) || 0;
            }
        } else {
            seconds = parseFloat(cleanStr) || 0;
        }
        return (minutes * 60) + seconds;
    };

    // Format date for filtering checks
    const getEventYear = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.getFullYear().toString();
    };

    const pastEventsRaw = (dbEvents || []).filter(e => e.status === 'completed');

    // Get available years
    const availableYears = useMemo(() => {
        const years = new Set(pastEventsRaw.map(e => getEventYear(e.date)).filter(y => y));
        if (years.size === 0) years.add(new Date().getFullYear().toString());
        return ['All', ...years].sort((a, b) => b - a);
    }, [pastEventsRaw]);

    // Get available events for the selected year
    const availableEvents = useMemo(() => {
        return ['All', ...pastEventsRaw
            .filter(e => selectedYear === 'All' || getEventYear(e.date) === selectedYear)
            .map(e => e.title)
            .sort()];
    }, [pastEventsRaw, selectedYear]);

    // Get available tracks
    const availableTracks = useMemo(() => {
        const tracks = new Set();
        pastEventsRaw.forEach(e => {
            const eventYear = getEventYear(e.date);
            if (selectedYear !== 'All' && eventYear !== selectedYear) return;
            const track = e.trackName || e.location;
            if (track) tracks.add(track);
        });
        const sortedTracks = Array.from(tracks).sort();
        // If no real data, provide defaults for UI preview if needed, or just empty
        // logic below handles empty state
        return sortedTracks;
    }, [pastEventsRaw, selectedYear]);

    // Get available directions
    const availableDirections = useMemo(() => {
        const directions = new Set(['Clockwise', 'Anti-Clockwise']); // Start with default options
        pastEventsRaw.forEach(e => {
            const eventYear = getEventYear(e.date);
            if (selectedYear !== 'All' && eventYear !== selectedYear) return;
            const track = e.trackName || e.location;
            if (selectedTrack !== 'All' && track !== selectedTrack) return;

            // Map legacy data
            let dir = e.trackDirection || e.direction;
            if (dir === 'Forward') dir = 'Clockwise';
            if (dir === 'Reverse') dir = 'Anti-Clockwise';

            if (dir) directions.add(dir);
        });

        return ['All', ...Array.from(directions).sort()];
    }, [pastEventsRaw, selectedYear, selectedTrack]);

    // Get available cars for the selected filters
    const availableCars = useMemo(() => {
        const cars = new Set();
        pastEventsRaw.forEach(event => {
            const eventYear = getEventYear(event.date);
            if (selectedYear !== 'All' && eventYear !== selectedYear) return;
            if (selectedEvent !== 'All' && event.title !== selectedEvent) return;
            const track = event.trackName || event.location;
            if (selectedTrack !== 'All' && track !== selectedTrack) return;
            // Filter by Direction
            const dir = event.trackDirection || event.direction;
            if (selectedDirection !== 'All' && dir !== selectedDirection) return;

            if (event.classResults) {
                Object.values(event.classResults).forEach(results => {
                    if (Array.isArray(results)) {
                        results.forEach(r => {
                            const carName = r.vehicle || r.car;
                            if (carName) cars.add(carName);
                        });
                    }
                });
            }
        });
        return ['All', ...Array.from(cars).sort()];
    }, [pastEventsRaw, selectedYear, selectedEvent, selectedTrack, selectedDirection]);

    // Auto-select first track
    useEffect(() => {
        if (availableTracks.length > 0) {
            // If currently selected track is not in available tracks (e.g. year change), select first
            if (selectedTrack === 'All' || !availableTracks.includes(selectedTrack)) {
                setSelectedTrack(availableTracks[0]);
            }
        } else {
            // If no tracks, maybe keep 'All' or null? keeping 'All' effectively shows empty state
            if (selectedTrack !== 'All') setSelectedTrack('All');
        }
    }, [availableTracks, selectedTrack]);


    const standings = useMemo(() => {
        // If no track selected (and tracks exist), don't show "Overall" - show nothing or wait for effect
        if (selectedTrack === 'All' && availableTracks.length > 0) return [];

        // ---- PASS 1: Collect ALL raw records per driver ----
        // This eliminates any dependency on event/class processing order.
        const driverRecords = {}; // { driverName: [{ time, timeMs, car, team, lapVideo, isWinner }] }

        pastEventsRaw.forEach(event => {
            const eventYear = getEventYear(event.date);
            if (selectedYear !== 'All' && eventYear !== selectedYear) return;
            if (selectedEvent !== 'All' && event.title !== selectedEvent) return;

            const track = event.trackName || event.location;
            if (track !== selectedTrack) return;

            let dir = event.trackDirection || event.direction;
            if (dir === 'Forward') dir = 'Clockwise';
            if (dir === 'Reverse') dir = 'Anti-Clockwise';
            if (!dir) dir = 'Clockwise';

            if (selectedDirection !== 'All' && dir !== selectedDirection) return;

            if (!event.classResults) return;

            Object.values(event.classResults).forEach(results => {
                if (!Array.isArray(results) || results.length === 0) return;

                // Identify Class Winner deterministically
                const sortedResults = [...results].sort((a, b) => {
                    const timeA = parseLapTime(a.time);
                    const timeB = parseLapTime(b.time);
                    if (timeA !== timeB) return timeA - timeB;
                    // Stable tie-breaker: by driver name
                    return (a.driver || '').localeCompare(b.driver || '');
                });
                const winnerName = sortedResults[0]?.driver?.trim();

                // Collect every result row
                results.forEach(r => {
                    if (!r.driver) return;
                    const car = r.vehicle || r.car;
                    if (selectedCar !== 'All' && car !== selectedCar) return;

                    const name = r.driver.trim();
                    const timeMs = parseLapTime(r.time);
                    const video = r.lapVideo || r.video || r.videoUrl || null;

                    if (!driverRecords[name]) driverRecords[name] = [];

                    driverRecords[name].push({
                        timeStr: r.time || '',
                        timeMs,
                        car: car || 'Unknown',
                        team: r.team || r.teamName || '-',
                        lapVideo: video,
                        isWinner: name === winnerName
                    });
                });
            });
        });

        // ---- PASS 2: Compute final stats deterministically from collected records ----
        const drivers = {};

        Object.entries(driverRecords).forEach(([name, records]) => {
            // Sort all records by time (ascending), then by whether they have a video (video first)
            const sorted = [...records].sort((a, b) => {
                if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
                // For equal times, prefer the one with a video link
                const aHasVideo = a.lapVideo ? 1 : 0;
                const bHasVideo = b.lapVideo ? 1 : 0;
                return bHasVideo - aHasVideo; // video first
            });

            const bestRecord = sorted[0];
            const wins = records.filter(r => r.isWinner).length;
            const races = records.length;

            // Use the latest (most recent) car and team info
            const lastRecord = records[records.length - 1];

            drivers[name] = {
                car: lastRecord.car,
                team: lastRecord.team !== '-' ? lastRecord.team : bestRecord.team,
                // Use video from fastest record first, otherwise grab any video from any record
                lapVideo: bestRecord.lapVideo || records.find(r => r.lapVideo)?.lapVideo || null,
                fastestLap: bestRecord.timeMs,
                fastestLapStr: bestRecord.timeMs !== Infinity ? bestRecord.timeStr.split(',')[0].trim() : '-',
                wins,
                races
            };
        });

        let data = Object.entries(drivers)
            .map(([name, stats]) => ({
                driver: name,
                car: stats.car,
                team: stats.team,
                lapVideo: stats.lapVideo,
                wins: stats.wins,
                races: stats.races,
                fastestLap: stats.fastestLapStr,
                fastestLapMs: stats.fastestLap
            }))
            .sort((a, b) => {
                // Trackmeister: Fastest Lap is King

                // Handle Infinity (no time set) - push to bottom
                if (a.fastestLapMs === Infinity && b.fastestLapMs === Infinity) {
                    return b.wins - a.wins; // If both no time, sort by wins
                }
                if (a.fastestLapMs === Infinity) return 1;
                if (b.fastestLapMs === Infinity) return -1;

                if (a.fastestLapMs !== b.fastestLapMs) return a.fastestLapMs - b.fastestLapMs;
                if (b.wins !== a.wins) return b.wins - a.wins;
                return a.driver.localeCompare(b.driver); // Consistent tie-breaker
            })
            .map((d, i) => ({ ...d, rank: i + 1 }));

        // Fallback data logic only if DB is empty AND we are in a state where we might want to show demo data
        // For now, removing fallback data to avoid confusion when filtering by real tracks. 
        // Or limiting it to when no tracks exist.
        if (data.length === 0 && (!dbEvents || dbEvents.length === 0)) {
            // Demo data
            return [
                { rank: 1, driver: 'Marcus Thorne', car: 'Porsche 911 GT3 RS', wins: 3, races: 5, fastestLap: '1:54.230' },
                { rank: 2, driver: 'Sarah Jenkins', car: 'BMW M4 CSL', wins: 1, races: 4, fastestLap: '1:55.105' },
                { rank: 3, driver: 'Viktor Rossi', car: 'Ferrari 488 Pista', wins: 1, races: 3, fastestLap: '1:54.890' },
            ];
        }

        // Apply Search Filter
        if (searchTerm) {
            data = data.filter(d =>
                d.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.car.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return data;

    }, [pastEventsRaw, dbEvents, selectedYear, selectedEvent, selectedTrack, selectedDirection, selectedCar, searchTerm, availableTracks]);

    return (
        <div className="app-container">
            <div className="page-content" style={{ paddingTop: 'var(--nav-height)' }}>
                {/* Hero */}
                <section style={{ padding: '60px 20px 40px', textAlign: 'center', background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>
                    <div className="events-hero-grid" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hero-title"
                        style={{ fontSize: '3rem', marginBottom: '20px', position: 'relative', zIndex: 2 }}
                    >
                        TRACKMEISTER LEADERBOARD
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 2 }}
                    >
                        Fastest drivers and lap records categorized by track.
                    </motion.p>
                </section>

                <section style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>

                    {/* Track Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        overflowX: 'auto',
                        paddingBottom: '20px',
                        marginBottom: '20px',
                        borderBottom: '1px solid var(--color-border)',
                        scrollbarWidth: 'none' // Hide scrollbar for cleaner look
                    }}>
                        {availableTracks.length > 0 ? availableTracks.map(track => (
                            <button
                                key={track}
                                onClick={() => setSelectedTrack(track)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '100px',
                                    border: selectedTrack === track ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    background: selectedTrack === track ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface)',
                                    color: selectedTrack === track ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {track}
                            </button>
                        )) : (
                            // Placeholder if no tracks (or data loading)
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', padding: '10px' }}>No tracks available</div>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>

                        {/* Search */}
                        <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
                            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} size={20} />
                            <input
                                type="text"
                                placeholder="Search driver or vehicle..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 48px',
                                    background: 'var(--color-bg)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '100px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

                            {/* Direction Toggle */}
                            <div style={{ display: 'flex', background: 'var(--color-bg)', padding: '4px', borderRadius: '100px', border: '1px solid var(--color-border)' }}>
                                {['Clockwise', 'Anti-Clockwise'].map((dir) => (
                                    <button
                                        key={dir}
                                        onClick={() => setSelectedDirection(selectedDirection === dir ? 'All' : dir)}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: '100px',
                                            border: 'none',
                                            background: selectedDirection === dir ? 'var(--color-accent)' : 'transparent',
                                            color: selectedDirection === dir ? '#ffffff' : 'var(--color-text-secondary)',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {dir === 'Clockwise' ? '↻' : '↺'} {dir}
                                    </button>
                                ))}
                            </div>

                            {/* Year Filter */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-bg)', padding: '6px 12px', borderRadius: '100px', border: '1px solid var(--color-border)' }}>
                                <Filter size={16} color="var(--color-text-secondary)" />
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(e.target.value);
                                        // Don't reset track when year changes, but maybe event
                                        setSelectedEvent('All');
                                    }}
                                    style={{
                                        padding: '4px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        outline: 'none'
                                    }}
                                >
                                    {availableYears.map(year => (
                                        <option key={year} value={year} style={{ background: '#1c1c1c', color: '#ffffff' }}>{year === 'All' ? 'All Time' : `${year} Season`}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Car Filter */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-bg)', padding: '6px 12px', borderRadius: '100px', border: '1px solid var(--color-border)' }}>
                                <Car size={16} color="var(--color-text-secondary)" />
                                <select
                                    value={selectedCar}
                                    onChange={(e) => setSelectedCar(e.target.value)}
                                    style={{
                                        padding: '4px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        outline: 'none',
                                        maxWidth: '200px'
                                    }}
                                >
                                    {availableCars.map(car => (
                                        <option key={car} value={car} style={{ background: '#1c1c1c', color: '#ffffff' }}>{car === 'All' ? 'All Cars' : car}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </div>

                    {/* Table */}
                    <div className="leaderboard-container">
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <div style={{ minWidth: '600px' }}>
                                {/* Loading & Empty States */}
                                {loading && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        <Loader2 className="spin" size={32} />
                                        <p>Loading standings...</p>
                                    </div>
                                )}

                                {!loading && standings.length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        <AlertTriangle size={32} style={{ marginBottom: '10px', color: 'var(--color-accent)' }} />
                                        <p>No standings found for the selected criteria.</p>
                                    </div>
                                )}

                                {!loading && standings.length > 0 && (
                                    <>
                                        {/* Header */}
                                        <div className="leaderboard-header-row">
                                            <div style={{ textAlign: 'center' }}>#</div>
                                            <div>Driver</div>
                                            <div>Team</div>
                                            <div>Vehicle</div>
                                            <div style={{ textAlign: 'center' }}>Wins</div>
                                            <div style={{ textAlign: 'center' }}>Races</div>
                                            <div style={{ textAlign: 'center' }}>Video</div>
                                            <div style={{ textAlign: 'right' }}>Best Lap</div>
                                        </div>

                                        {/* Entries */}
                                        {standings.map((driver, i) => (
                                            <motion.div
                                                key={i}
                                                className={`leaderboard-entry ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                            >
                                                <div className={`lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'default'}`}>
                                                    {driver.rank}
                                                </div>
                                                <div className="lb-driver">
                                                    <div className="lb-driver-avatar">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="lb-driver-name">{driver.driver}</span>
                                                </div>
                                                <div className="lb-team" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{driver.team}</div>
                                                <div className="lb-vehicle">{driver.car}</div>
                                                <div className="lb-stat">{driver.wins}</div>
                                                <div className="lb-stat" style={{ color: 'var(--color-text-secondary)' }}>{driver.races}</div>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    {driver.lapVideo && (
                                                        <a href={driver.lapVideo} target="_blank" rel="noopener noreferrer" style={{ color: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'opacity 0.2s' }} title="Watch Lap">
                                                            <Youtube size={18} />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="lb-time">{driver.fastestLap}</div>
                                            </motion.div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Standings;
