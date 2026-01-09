import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import './App.css';
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
// OPTIMIZED: Only preload the absolute critical above-the-fold assets for Home.
const ASSETS_TO_PRELOAD = [
  '/hero-bg.webp',
  'https://images.unsplash.com/photo-1547424436-283e3944431a?q=80&w=2000&auto=format&fit=crop'
];

// Media Page Assets to block loading for
const MEDIA_ASSETS = [
  '/media/season-highlights.webp',
  '/media/porsche-gt3.webp',
  '/media/cockpit-view.webp',
  '/media/monza-night.webp',
  '/media/carbon-composite.webp',
  '/media/apex-point.webp',
  '/media/driver-perspective.webp',
  '/media/monaco-gp.webp',
  '/media/helmet-design.webp',
  '/media/suzuka-rain.webp',
  '/media/pit-crew.webp',
  '/media/victory-lane.webp'
];

const preloadImages = (srcs) => {
  return Promise.all(srcs.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
};

// Route-specific critical assets to preload
const ROUTE_ASSETS = {
  '/': [
    '/hero-bg.webp',
    '/gt3-endurance.webp',
    '/track-days.webp',
    '/community.webp'
  ],
  '/media': MEDIA_ASSETS.slice(0, 6), // Preload first 6 media items
  '/drivers': [
    '/drivers/driver1.webp',
    '/drivers/driver2.webp',
    '/drivers/driver3.webp'
  ],
  '/events': [
    '/event-track-day.webp',
    '/event-race.webp',
    '/event-meetup.webp'
  ],
  '/about': [
    '/drivers/driver3.webp',
    '/drivers/driver2.webp',
    '/drivers/driver1.webp'
  ],
  '/partners': [
    // Preload a couple of key partner images if possible, or leave empty if relying on external
  ]
};

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const isFirstLoad = useRef(true);

  // Effect (Mount Only): Preload Critical Assets
  useEffect(() => {
    const loadInitialAssets = async () => {
      // Wait for CRITICAL assets + window load
      await preloadImages(ASSETS_TO_PRELOAD);

      if (document.readyState === 'complete') {
        finishLoading();
      } else {
        window.addEventListener('load', finishLoading);
        return () => window.removeEventListener('load', finishLoading);
      }
    };

    const finishLoading = () => {
      if (isFirstLoad.current) {
        // Reduced forced wait time for snappier experience
        setTimeout(() => {
          setIsLoading(false);
          isFirstLoad.current = false;
        }, 800);
      }
    };

    loadInitialAssets();
  }, []);

  // Effect (Navigation): Trigger Loader on route change
  useEffect(() => {
    if (!isFirstLoad.current) {
      setIsLoading(true);
      window.scrollTo(0, 0);

      const loadRouteAssets = async () => {
        // Identify assets for the current route
        const assets = ROUTE_ASSETS[location.pathname] || [];

        // Wait for assets to load (or fail/timeout)
        if (assets.length > 0) {
          await preloadImages(assets);
        }

        // Add a small artificial delay for smoothness ensuring loader doesn't flash too fast
        setTimeout(() => {
          setIsLoading(false);
        }, 400);
      };

      loadRouteAssets();
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
