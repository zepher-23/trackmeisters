import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Split Screen Loader
 * Sequence:
 * 1. Initial Loading: Deep blue screen (#02233f) with "LOADING" text and animated running dots.
 * 2. Page Ready: Solid razor-thin white line emerges from the dots and draws outward along the path to the screen edges.
 * 3. Line Swell: Line slightly increases in thickness (subtly thicker center, tapered thin ends, no glow).
 * 4. Curtain Split: Screen splits along the curve with smooth easeInOut motion, top moving up and bottom moving down.
 */
const Loader = ({ isLoading = true }) => {
    // Phases: 'loading' | 'drawing' | 'thickening' | 'splitting' | 'done'
    const [phase, setPhase] = useState('loading');
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        if (isLoading) {
            setPhase('loading');
            setShouldRender(true);
        } else {
            // Step 1: Shoot thin line outward from center dots to edges
            setPhase('drawing');

            // Step 2: Line reaches edges and increases thickness slightly
            const t1 = setTimeout(() => {
                setPhase('thickening');
            }, 520);

            // Step 3: Screen splits along the path with easeInOut
            const t2 = setTimeout(() => {
                setPhase('splitting');
            }, 800);

            // Step 4: Split complete, unmount from DOM
            const t3 = setTimeout(() => {
                setPhase('done');
                setShouldRender(false);
            }, 1720);

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
            };
        }
    }, [isLoading]);

    if (!shouldRender) return null;

    const isSplitting = phase === 'splitting' || phase === 'done';
    const isLineVisible = phase === 'drawing' || phase === 'thickening' || phase === 'splitting';
    const isThick = phase === 'thickening' || phase === 'splitting';

    // SVG coordinate space: 1000 x 600
    // Split boundary polygons
    const topPolygon = "M 0,0 L 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180 L 1000,0 Z";
    const bottomPolygon = "M 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180 L 1000,600 L 0,600 Z";

    // Full dividing curve
    const fullCurve = "M 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180";

    // Center paths running from midpoint (500, 330) outwards to the screen edges
    const centerToLeft = "M 500,330 C 380,410 250,465 0,480";
    const centerToRight = "M 500,330 C 620,250 780,180 1000,180";

    // Ultra-delicate tapered ribbon: ~2.0px in center tapering to needle tips at both ends (no glow)
    const delicateTaperedRibbon = "M 0,480 C 250,464.5 380,409.3 500,329.1 C 620,249.2 780,179.6 1000,180 C 780,180.4 620,250.8 500,330.9 C 380,410.7 250,465.4 0,480 Z";

    // Smooth easeInOut easing for the split animation
    const splitTransition = {
        duration: 0.88,
        ease: "easeInOut"
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
                overflow: 'hidden',
                pointerEvents: isSplitting ? 'none' : 'all',
                backgroundColor: 'transparent'
            }}
        >
            {/* SVG Defs */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="splitBlueBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#032b4d" />
                        <stop offset="50%" stopColor="#02233f" />
                        <stop offset="100%" stopColor="#01182c" />
                    </linearGradient>

                    {/* Gradient to make ends thinner/softer compared to the center */}
                    <linearGradient id="taperStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                        <stop offset="15%" stopColor="#ffffff" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="85%" stopColor="#ffffff" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.35" />
                    </linearGradient>
                </defs>
            </svg>

            {/* TOP HALF: Moves upward on split */}
            <motion.div
                initial={{ y: '0%' }}
                animate={{ y: isSplitting ? '-102%' : '0%' }}
                transition={splitTransition}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    willChange: 'transform'
                }}
            >
                <svg
                    viewBox="0 0 1000 600"
                    preserveAspectRatio="none"
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                    }}
                >
                    <path
                        d={topPolygon}
                        fill="url(#splitBlueBg)"
                    />
                    {/* Edge line that moves with top curtain during split */}
                    {isSplitting && (
                        <path
                            d={fullCurve}
                            fill="none"
                            stroke="url(#taperStrokeGrad)"
                            strokeWidth="1.2"
                        />
                    )}
                </svg>
            </motion.div>

            {/* BOTTOM HALF: Moves downward on split */}
            <motion.div
                initial={{ y: '0%' }}
                animate={{ y: isSplitting ? '102%' : '0%' }}
                transition={splitTransition}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    willChange: 'transform'
                }}
            >
                <svg
                    viewBox="0 0 1000 600"
                    preserveAspectRatio="none"
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'block'
                    }}
                >
                    <path
                        d={bottomPolygon}
                        fill="url(#splitBlueBg)"
                    />
                    {/* Edge line that moves with bottom curtain during split */}
                    {isSplitting && (
                        <path
                            d={fullCurve}
                            fill="none"
                            stroke="url(#taperStrokeGrad)"
                            strokeWidth="1.2"
                        />
                    )}
                </svg>
            </motion.div>

            {/* INITIAL LOADING MESSAGE WITH RUNNING DOTS */}
            <AnimatePresence>
                {phase === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            top: '55%', // Centered exactly on path midpoint (500, 330 in 600h = 55%)
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#ffffff',
                            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                            fontSize: '12px',
                            fontWeight: '600',
                            letterSpacing: '5px',
                            textTransform: 'uppercase',
                            zIndex: 10,
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}
                    >
                        <span>LOADING</span>
                        <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                            {[0, 1, 2].map((i) => (
                                <motion.span
                                    key={i}
                                    animate={{
                                        opacity: [0.2, 1, 0.2],
                                        y: [0, -3.5, 0],
                                        scale: [0.85, 1.25, 0.85]
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 0.9,
                                        delay: i * 0.16,
                                        ease: "easeInOut"
                                    }}
                                    style={{
                                        display: 'inline-block',
                                        width: '4px',
                                        height: '4px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ffffff'
                                    }}
                                />
                            ))}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SOLID THIN WHITE LINE (RUNS FROM DOTS TOWARDS EDGES, THICKENS SLIGHTLY, THEN SPLITS) */}
            {isLineVisible && !isSplitting && (
                <svg
                    viewBox="0 0 1000 600"
                    preserveAspectRatio="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        display: 'block'
                    }}
                >
                    {/* Left path: draws outward from center (500, 330) to left edge (0, 480) */}
                    <motion.path
                        d={centerToLeft}
                        fill="none"
                        stroke="url(#taperStrokeGrad)"
                        initial={{ pathLength: 0, strokeWidth: 0.9 }}
                        animate={{
                            pathLength: 1,
                            strokeWidth: isThick ? 1.6 : 0.9
                        }}
                        transition={{
                            pathLength: { duration: 0.5, ease: "easeInOut" },
                            strokeWidth: { duration: 0.25, ease: "easeInOut" }
                        }}
                    />

                    {/* Right path: draws outward from center (500, 330) to right edge (1000, 180) */}
                    <motion.path
                        d={centerToRight}
                        fill="none"
                        stroke="url(#taperStrokeGrad)"
                        initial={{ pathLength: 0, strokeWidth: 0.9 }}
                        animate={{
                            pathLength: 1,
                            strokeWidth: isThick ? 1.6 : 0.9
                        }}
                        transition={{
                            pathLength: { duration: 0.5, ease: "easeInOut" },
                            strokeWidth: { duration: 0.25, ease: "easeInOut" }
                        }}
                    />

                    {/* Subtle delicate tapered center swell when thickened */}
                    <motion.path
                        d={delicateTaperedRibbon}
                        fill="#ffffff"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isThick ? 0.85 : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                    />
                </svg>
            )}
        </div>
    );
};

export default Loader;

