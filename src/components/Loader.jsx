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

            // Step 2: Line reaches edges and increases thickness slightly (snappy)
            const t1 = setTimeout(() => {
                setPhase('thickening');
            }, 420);

            // Step 3: Screen splits open snappy and fast
            const t2 = setTimeout(() => {
                setPhase('splitting');
            }, 640);

            // Step 4: Split complete, unmount from DOM
            const t3 = setTimeout(() => {
                setPhase('done');
                setShouldRender(false);
            }, 1200);

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

    // SVG coordinate space: 1920 x 1080 (Exact path from Untitled Document.svg)
    // Horizontal bottom at y=742.447, S-curve transition (x=759.086 to x=1089.408), horizontal top at y=296.947
    
    // Split boundary polygons
    const topPolygon = "M 0,0 L 0,742.447 L 759.086,742.447 C 921.676,742.447 960.159,296.947 1089.408,296.947 L 1920,296.947 L 1920,0 Z";
    const bottomPolygon = "M 0,742.447 L 759.086,742.447 C 921.676,742.447 960.159,296.947 1089.408,296.947 L 1920,296.947 L 1920,1080 L 0,1080 Z";

    // Full dividing curve
    const fullCurve = "M 0,742.447 L 759.086,742.447 C 921.676,742.447 960.159,296.947 1089.408,296.947 L 1920,296.947";

    // Center paths running from midpoint (936.75, 519.7) outwards to screen edges
    const centerToLeft = "M 936.75,519.7 C 890.65,631.07 840.38,742.447 759.086,742.447 L 0,742.447";
    const centerToRight = "M 936.75,519.7 C 982.85,408.32 1024.78,296.947 1089.408,296.947 L 1920,296.947";

    // Tapered ribbon: 3px in the center, tapering down to needle-thin points at screen edges (x=0 and x=1920)
    const delicateTaperedRibbon = "M 0,742.447 L 759.086,740.947 C 921.676,740.947 960.159,295.447 1089.408,295.447 L 1920,296.947 L 1089.408,298.447 C 960.159,298.447 921.676,743.947 759.086,743.947 L 0,742.447 Z";

    // Snappy, fast easeInOut cubic-bezier curve for the screen split
    const splitTransition = {
        duration: 0.52,
        ease: [0.76, 0, 0.24, 1]
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

                    {/* Gradient to make ends thinner/softer at the edges of the screen */}
                    <linearGradient id="taperStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                        <stop offset="15%" stopColor="#ffffff" stopOpacity="0.65" />
                        <stop offset="35%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="65%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="85%" stopColor="#ffffff" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
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
                    viewBox="0 0 1920 1080"
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
                            strokeWidth="2.0"
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
                    viewBox="0 0 1920 1080"
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
                            strokeWidth="2.0"
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
                            top: '48.1%', // Centered on curve midpoint (936.75, 519.7 in 1920x1080)
                            left: '48.8%',
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
                    viewBox="0 0 1920 1080"
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
                    {/* Left path: draws outward from center (936.75, 519.7) to left edge (0, 742.447) */}
                    <motion.path
                        d={centerToLeft}
                        fill="none"
                        stroke="url(#taperStrokeGrad)"
                        initial={{ pathLength: 0, strokeWidth: 1.5 }}
                        animate={{
                            pathLength: 1,
                            strokeWidth: isThick ? 2.6 : 1.5
                        }}
                        transition={{
                            pathLength: { duration: 0.4, ease: "easeInOut" },
                            strokeWidth: { duration: 0.2, ease: "easeInOut" }
                        }}
                    />

                    {/* Right path: draws outward from center (936.75, 519.7) to right edge (1920, 296.947) */}
                    <motion.path
                        d={centerToRight}
                        fill="none"
                        stroke="url(#taperStrokeGrad)"
                        initial={{ pathLength: 0, strokeWidth: 1.5 }}
                        animate={{
                            pathLength: 1,
                            strokeWidth: isThick ? 2.6 : 1.5
                        }}
                        transition={{
                            pathLength: { duration: 0.4, ease: "easeInOut" },
                            strokeWidth: { duration: 0.2, ease: "easeInOut" }
                        }}
                    />

                    {/* Subtle delicate tapered center swell when thickened */}
                    <motion.path
                        d={delicateTaperedRibbon}
                        fill="#ffffff"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isThick ? 0.85 : 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    />
                </svg>
            )}
        </div>
    );
};

export default Loader;

