import React from 'react';
import { motion } from 'framer-motion';

const Loader = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: '#050505',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    color: '#fff',
                    letterSpacing: '5px',
                    marginBottom: '20px',
                    fontFamily: "'Orbitron', sans-serif" // Assuming this font is loaded or system font
                }}
            >
                Loading...  
            </motion.div>

            <div style={{
                width: '200px',
                height: '2px',
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut"
                    }}
                    style={{
                        width: '50%',
                        height: '100%',
                        background: 'var(--color-accent, #ff3333)',
                        position: 'absolute'
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '10px',
                    letterSpacing: '2px',
                    marginTop: '15px'
                }}
            >
                INITIALIZING SYSTEMS...
            </motion.div>
        </div>
    );
};

export default Loader;
