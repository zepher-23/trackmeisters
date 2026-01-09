import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

// Critical assets to preload for the "First Paint" experience
const ASSETS_TO_PRELOAD = [
  '/gt3-endurance.png',
  '/track-days.png',
  '/community.png',
  '/porsche-news.png',
  '/nurburgring.png',
  '/sponsorship.png',
  '/drivers/driver1.png',
  '/drivers/driver2.png',
  '/drivers/driver3.png',
  // Remote Hero Image
  'https://images.unsplash.com/photo-1547424436-283e3944431a?q=80&w=2000&auto=format&fit=crop'
];

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAssets = async () => {
      const promises = ASSETS_TO_PRELOAD.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = src;
          img.onload = resolve;
          img.onerror = resolve; // Resolve even on error to prevent checking forever
        });
      });

      // Wait for all specific assets
      await Promise.all(promises);

      // Also ensure the window load event has fired (covers CSS, scripts, other resources)
      if (document.readyState === 'complete') {
        // slight delay for smoothness
        setTimeout(() => setIsLoading(false), 800);
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => setIsLoading(false), 800);
        });
      }
    };

    loadAssets();
  }, []);

  return (
    <>
      {isLoading && <Loader />}
      {/* Hide app content while loading to prevent flash of unstyled content, 
          OR keep it mounted but hidden/underneath? 
          Mounting it allows React to build the DOM, so when we remove Loader, it's instant.
      */}
      <div style={{ display: isLoading ? 'none' : 'block' }}>
        <Router>
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
        </Router>
      </div>
    </>
  );
}

export default App;
