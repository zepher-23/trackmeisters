import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Split Screen Loader
 * Features:
 * - Brand blue background (#02233f)
 * - White pulsing S-curve line matching the requested path
 * - Splits along the path when page finishes loading (top moves up, bottom moves down)
 * - Smoothly reveals the main content beneath
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
            }, 1000); // Allow split animation to finish before unmounting
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (!shouldRender) return null;

    // S-curve dividing path coordinates in viewBox="0 0 1000 600"
    const curvePath = "M 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180";
    const topPolygon = "M 0,0 L 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180 L 1000,0 Z";
    const bottomPolygon = "M 0,480 C 250,465 380,410 500,330 C 620,250 780,180 1000,180 L 1000,600 L 0,600 Z";

    // Smooth cubic bezier easing for clean cinematic curtain split
    const splitTransition = {
        duration: 0.85,
        ease: [0.77, 0, 0.175, 1]
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
            {/* SVG Defs for gradients & glowing filters */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="splitBlueBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#032b4d" />
                        <stop offset="50%" stopColor="#02233f" />
                        <stop offset="100%" stopColor="#01182c" />
                    </linearGradient>

                    <filter id="whiteLineGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="glow1" />
                        <feGaussianBlur stdDeviation="8" result="glow2" />
                        <feMerge>
                            <feMergeNode in="glow2" />
                            <feMergeNode in="glow1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
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

            {/* WHITE PULSING DIVIDING LINE */}
            <motion.svg
                viewBox="0 0 1000 600"
                preserveAspectRatio="none"
                initial={{ opacity: 1 }}
                animate={{ opacity: isSplitting ? 0 : 1 }}
                transition={{ duration: 0.25 }}
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
                {/* Ambient Soft Glow Line */}
                <motion.path
                    d={curvePath}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#whiteLineGlow)"
                    animate={{
                        opacity: isSplitting ? 0 : [0.3, 0.8, 0.3],
                        strokeWidth: [5, 8, 5]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.8,
                        ease: 'easeInOut'
                    }}
                />

                {/* Sharp Core White Pulsing Line */}
                <motion.path
                    d={curvePath}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#whiteLineGlow)"
                    animate={{
                        opacity: isSplitting ? 0 : [0.7, 1, 0.7],
                        strokeWidth: [2.5, 3.5, 2.5]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.8,
                        ease: 'easeInOut'
                    }}
                />

                {/* Travelling light pulse along the line */}
                {!isSplitting && (
                    <motion.path
                        d={curvePath}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="160 500"
                        filter="url(#whiteLineGlow)"
                        animate={{
                            strokeDashoffset: [0, -660]
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 2.2,
                            ease: 'linear'
                        }}
                    />
                )}
            </motion.svg>
        </div>
    );
};

export default Loader;
