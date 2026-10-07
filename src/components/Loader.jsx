import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Split Screen Loader (Homepage only)
 * Sequence:
 * 1. Initial Loading: Deep blue screen (#02233f) with "LOADING" text and animated running dots.
 * 2. Page Ready: Solid razor-thin white line emerges from the dots and draws outward along the path to the screen edges.
 * 3. Line Swell: Line slightly increases in thickness (subtly thicker center, tapered thin ends, no glow).
 * 4. Curtain Split: Screen splits along the curve with smooth easeInOut motion, top moving up and bottom moving down.
 */
const SplitLoader = ({ isLoading = true, isMobile = false }) => {
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

            // Step 2: Line reaches edges and visibly swells thicker before the split
            const t1 = setTimeout(() => {
                setPhase('thickening');
            }, 380);

            // Step 3: Screen splits open snappy and fast
            const t2 = setTimeout(() => {
                setPhase('splitting');
            }, 720);

            // Step 4: Split complete, unmount from DOM
            const t3 = setTimeout(() => {
                setPhase('done');
                setShouldRender(false);
            }, 1280);

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

    // SVG coordinate space: 1920 x 1080
    // Desktop: Exact path from Untitled Document.svg (vertical span: y=742.447 to y=296.947)
    // Mobile: Reduced vertical height by ~55% (vertical span: y=630 to y=430) for balanced mobile proportions
    
    // Split boundary polygons
    const topPolygon = isMobile
        ? "M 0,0 L 0,630 L 680,630 C 880,630 1040,430 1240,430 L 1920,430 L 1920,0 Z"
        : "M 0,0 L 0,742.447 L 759.086,742.447 C 921.676,742.447 960.159,296.947 1089.408,296.947 L 1920,296.947 L 1920,0 Z";

    const bottomPolygon = isMobile
        ? "M 0,630 L 680,630 C 880,630 1040,430 1240,430 L 1920,430 L 1920,1080 L 0,1080 Z"
        : "M 0,742.447 L 759.086,742.447 C 921.676,742.447 960.159,296.947 1089.408,296.947 L 1920,296.947 L 1920,1080 L 0,1080 Z";

    // Full dividing curve
    const fullCurve = isMobile
        ? "M 0,630 L 680,630 C 880,630 1040,430 1240,430 L 1920,430"
        : "M 0,742.447 L 759.086,742.447 C 921.676,742.447 960.159,296.947 1089.408,296.947 L 1920,296.947";

    // Center paths running from midpoint outwards to screen edges
    const centerToLeft = isMobile
        ? "M 960,530 C 870,580 780,630 680,630 L 0,630"
        : "M 936.75,519.7 C 890.65,631.07 840.38,742.447 759.086,742.447 L 0,742.447";

    const centerToRight = isMobile
        ? "M 960,530 C 1050,480 1140,430 1240,430 L 1920,430"
        : "M 936.75,519.7 C 982.85,408.32 1024.78,296.947 1089.408,296.947 L 1920,296.947";

    // Bold tapered ribbon: 8px at center, gracefully tapering down to needle-thin points at screen edges (x=0 and x=1920)
    const delicateTaperedRibbon = isMobile
        ? "M 0,630 L 680,626 C 880,626 1040,426 1240,426 L 1920,430 L 1240,434 C 1040,434 880,634 680,634 L 0,630 Z"
        : "M 0,742.447 L 759.086,738.447 C 921.676,738.447 960.159,292.947 1089.408,292.947 L 1920,296.947 L 1089.408,300.947 C 960.159,300.947 921.676,746.447 759.086,746.447 L 0,742.447 Z";

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

                    {/* Gradient to make red path thinner/softer at the edges of the screen */}
                    <linearGradient id="taperStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff2a2a" stopOpacity="0.25" />
                        <stop offset="15%" stopColor="#ff2a2a" stopOpacity="0.65" />
                        <stop offset="35%" stopColor="#ff2a2a" stopOpacity="1" />
                        <stop offset="65%" stopColor="#ff2a2a" stopOpacity="1" />
                        <stop offset="85%" stopColor="#ff2a2a" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#ff2a2a" stopOpacity="0.25" />
                    </linearGradient>
                </defs>
            </svg>

            {/* 1. SEAMLESS SOLID BACKDROP: Completely hides any split seam or path outline before the split begins */}
            {!isSplitting && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #032b4d 0%, #02233f 50%, #01182c 100%)',
                        zIndex: 5
                    }}
                />
            )}

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
                    zIndex: 2,
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
                        stroke="url(#splitBlueBg)"
                        strokeWidth="1.5"
                    />
                    {/* Edge line that moves with top curtain during split */}
                    {isSplitting && (
                        <path
                            d={fullCurve}
                            fill="none"
                            stroke="url(#taperStrokeGrad)"
                            strokeWidth="4.0"
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
                    zIndex: 2,
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
                        stroke="url(#splitBlueBg)"
                        strokeWidth="1.5"
                    />
                    {/* Edge line that moves with bottom curtain during split */}
                    {isSplitting && (
                        <path
                            d={fullCurve}
                            fill="none"
                            stroke="url(#taperStrokeGrad)"
                            strokeWidth="4.0"
                        />
                    )}
                </svg>
            </motion.div>

            {/* INITIAL LOADING MESSAGE */}
            <AnimatePresence>
                {phase === 'loading' && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 20,
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontFamily: "'Orbitron', sans-serif",
                                fontSize: isMobile ? '18px' : '24px',
                                fontWeight: '900',
                                letterSpacing: isMobile ? '3px' : '5px',
                                marginRight: isMobile ? '-3px' : '-5px'
                            }}
                        >
                            <span>Loading</span>
                            <span style={{ display: 'inline-flex', letterSpacing: isMobile ? '3px' : '5px' }}>
                                {[0, 1, 2].map((i) => (
                                    <motion.span
                                        key={i}
                                        animate={{
                                            opacity: [0.2, 1, 0.2],
                                            y: [0, -3.5, 0]
                                        }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.9,
                                            delay: i * 0.16,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        .
                                    </motion.span>
                                ))}
                            </span>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SOLID THIN WHITE LINE */}
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
                        zIndex: 10,
                        pointerEvents: 'none',
                        display: 'block'
                    }}
                >
                    {/* Left path */}
                    <motion.path
                        d={centerToLeft}
                        fill="none"
                        stroke="url(#taperStrokeGrad)"
                        initial={{ pathLength: 0, strokeWidth: 1.8 }}
                        animate={{
                            pathLength: 1,
                            strokeWidth: isThick ? 6.0 : 1.8
                        }}
                        transition={{
                            pathLength: { duration: 0.38, ease: "easeInOut" },
                            strokeWidth: { duration: 0.25, ease: "easeInOut" }
                        }}
                    />

                    {/* Right path */}
                    <motion.path
                        d={centerToRight}
                        fill="none"
                        stroke="url(#taperStrokeGrad)"
                        initial={{ pathLength: 0, strokeWidth: 1.8 }}
                        animate={{
                            pathLength: 1,
                            strokeWidth: isThick ? 6.0 : 1.8
                        }}
                        transition={{
                            pathLength: { duration: 0.38, ease: "easeInOut" },
                            strokeWidth: { duration: 0.25, ease: "easeInOut" }
                        }}
                    />

                    {/* Bold tapered center swell */}
                    <motion.path
                        d={delicateTaperedRibbon}
                        fill="url(#taperStrokeGrad)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isThick ? 1 : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                    />
                </svg>
            )}
        </div>
    );
};

/**
 * Fade Loader (All other pages)
 * Shows the branded Loading... screen and smoothly fades out with opacity animation when page loads
 */
const FadeLoader = ({ isLoading = true, isMobile = false }) => {
    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    key="fade-page-loader"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, pointerEvents: 'none' }}
                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 99999,
                        background: 'linear-gradient(135deg, #032b4d 0%, #02233f 50%, #01182c 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        pointerEvents: isLoading ? 'all' : 'none'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontFamily: "'Orbitron', sans-serif",
                            fontSize: isMobile ? '18px' : '24px',
                            fontWeight: '900',
                            letterSpacing: isMobile ? '3px' : '5px',
                            marginRight: isMobile ? '-3px' : '-5px'
                        }}
                    >
                        <span>Loading</span>
                        <span style={{ display: 'inline-flex', letterSpacing: isMobile ? '3px' : '5px' }}>
                            {[0, 1, 2].map((i) => (
                                <motion.span
                                    key={i}
                                    animate={{
                                        opacity: [0.2, 1, 0.2],
                                        y: [0, -3.5, 0]
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 0.9,
                                        delay: i * 0.16,
                                        ease: "easeInOut"
                                    }}
                                >
                                    .
                                </motion.span>
                            ))}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

/**
 * Universal Loader router component:
 * - Homepage: Screen splitting curtain animation
 * - All other pages: Elegant Loading... with smooth fade-out animation
 */
const Loader = ({ isLoading = true, isHomepage }) => {
    const isHome = typeof isHomepage === 'boolean'
        ? isHomepage
        : (typeof window !== 'undefined' && window.location.pathname === '/');

    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isHome) {
        return <SplitLoader isLoading={isLoading} isMobile={isMobile} />;
    }

    return <FadeLoader isLoading={isLoading} isMobile={isMobile} />;
};

export default Loader;

