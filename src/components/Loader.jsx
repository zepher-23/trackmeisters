import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Split Screen Loader
 * Features:
 * - Brand blue background (#02233f)
 * - Clean white S-curve path (thick in the center, tapering to thin trails at the ends, no glow)
 * - Pulsing originates from the center of the path and radiates outward
 * - Ease-in-out cinematic split animation along the curve when page finishes loading
 */
const Loader = ({ isLoading = true }) => {
    const [shouldRender, setShouldRender] = useState(isLoading);
    const [isSplitting, setIsSplitting] = useState(false);

    useEffect(() => {
        if (isLoading) {
            setShouldRender(true);
            setIsSplitting(false);
        } else {
            // Initiate the split reveal animation
            setIsSplitting(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 1050); // Allow split animation to finish before unmounting
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (!shouldRender) return null;

    // Boundary curves for top and bottom split halves
    const topPolygon = "M 0,0 L 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180 L 1000,0 Z";
    const bottomPolygon = "M 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180 L 1000,600 L 0,600 Z";

    // Tapered ribbon path: ~10px thick in the center, tapering smoothly to razor-thin ends
    const taperedRibbon = "M 0,480 C 250,463 380,406 500,325 C 620,246 780,178 1000,180 C 780,182 620,254 500,335 C 380,414 250,467 0,480 Z";

    // Outward pulse paths originating at the center (500, 330)
    const centerToLeft = "M 500,330 C 380,410 250,465 0,480";
    const centerToRight = "M 500,330 C 620,250 780,180 1000,180";

    // Smooth easeInOut transition for split curtain animation
    const splitTransition = {
        duration: 0.95,
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
            {/* SVG Defs for crisp background gradient (no glow filters) */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="splitBlueBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#032b4d" />
                        <stop offset="50%" stopColor="#02233f" />
                        <stop offset="100%" stopColor="#01182c" />
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
                </svg>
            </motion.div>

            {/* WHITE TAPERED PATH & CENTER-OUTWARD PULSES (NO GLOW) */}
            <motion.svg
                viewBox="0 0 1000 600"
                preserveAspectRatio="none"
                initial={{ opacity: 1 }}
                animate={{ opacity: isSplitting ? 0 : 1 }}
                transition={{ duration: 0.2 }}
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
                {/* Core Tapered Line (thick center, thin tips) pulsing from the center */}
                <motion.path
                    d={taperedRibbon}
                    fill="#ffffff"
                    style={{
                        transformOrigin: '500px 330px'
                    }}
                    animate={
                        isSplitting
                            ? { opacity: 0 }
                            : {
                                  opacity: [0.65, 1, 0.65],
                                  scaleY: [0.85, 1.15, 0.85],
                                  scaleX: [0.98, 1.01, 0.98]
                              }
                    }
                    transition={{
                        repeat: Infinity,
                        duration: 1.8,
                        ease: 'easeInOut'
                    }}
                />

                {/* Symmetrical Outward Light Pulses: Originating at center (500, 330) */}
                {!isSplitting && (
                    <>
                        {/* Left pulse: flows from center (500, 330) outwards to left tip (0, 480) */}
                        <motion.path
                            d={centerToLeft}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="130 520"
                            animate={{
                                strokeDashoffset: [130, -450],
                                opacity: [0.2, 1, 0.7, 0]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 1.8,
                                ease: 'easeOut'
                            }}
                        />

                        {/* Right pulse: flows from center (500, 330) outwards to right tip (1000, 180) */}
                        <motion.path
                            d={centerToRight}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="130 520"
                            animate={{
                                strokeDashoffset: [130, -450],
                                opacity: [0.2, 1, 0.7, 0]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 1.8,
                                ease: 'easeOut'
                            }}
                        />
                    </>
                )}
            </motion.svg>
        </div>
    );
};

export default Loader;
