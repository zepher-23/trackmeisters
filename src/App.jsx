import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Loader from './components/Loader';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Placeholder from './pages/Placeholder';

import Media from './pages/Media';
import Events from './pages/Events';
import Drivers from './pages/Drivers';
import Partners from './pages/Partners';
import About from './pages/About';

// OPTIMIZED: Only preload the absolute critical above-the-fold assets.
// Everything else should lazy load naturally to reduce initial wait time.
const ASSETS_TO_PRELOAD = [
  '/hero-bg.png', // Critical for Home Page
  'https://images.unsplash.com/photo-1547424436-283e3944431a?q=80&w=2000&auto=format&fit=crop' // Critical for About Page Hero
];

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  // Ref to track if it's the very first initial load
  const isFirstLoad = useRef(true);

  // Effect (Mount Only): Preload Critical Assets
  useEffect(() => {
    const loadAssets = async () => {
      const promises = ASSETS_TO_PRELOAD.map((src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          // Resolve nicely even on error to avoid hanging
          img.onload = resolve;
          img.onerror = resolve;
        });
      });

      // Wait for CRITICAL assets + window load
      await Promise.all(promises);

      if (document.readyState === 'complete') {
        finishLoading();
      } else {
        window.addEventListener('load', finishLoading);
        return () => window.removeEventListener('load', finishLoading);
      }
    };

    const finishLoading = () => {
      // Only turn off loading if this was the initial asset load
      if (isFirstLoad.current) {
        // Reduced forced wait time for snappier experience
        setTimeout(() => {
          setIsLoading(false);
          isFirstLoad.current = false;
        }, 800);
      }
    };

    loadAssets();
  }, []);

  // Effect (Navigation): Trigger Loader on route change
  useEffect(() => {
    // If it's NOT the first load (which is handled above), trigger a nav loader
    if (!isFirstLoad.current) {
      setIsLoading(true);
      window.scrollTo(0, 0); // Reset scroll position

      // Faster transition for navigation (snappy)
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: isLoading ? 'all' : 'none',
        opacity: isLoading ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out'
      }}>
        {/* Always render loader but fade it out */}
        <Loader />
      </div>

      {/* Main Content */}
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/events" element={<Events />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/media" element={<Media />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/community" element={<Placeholder title="Community" />} />
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Placeholder title="Careers" />} />
          <Route path="/privacy" element={<Placeholder title="Privacy Policy" />} />
          <Route path="/terms" element={<Placeholder title="Terms of Service" />} />
          <Route path="/waivers" element={<Placeholder title="Waivers" />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Footer />
      </div>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
