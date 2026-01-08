import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Placeholder from './pages/Placeholder';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/events" element={<Placeholder title="Events" />} />
          <Route path="/drivers" element={<Placeholder title="Drivers" />} />
          <Route path="/media" element={<Placeholder title="Media Gallery" />} />
          <Route path="/partners" element={<Placeholder title="Our Partners" />} />
          <Route path="/community" element={<Placeholder title="Community" />} />
          <Route path="/about" element={<Placeholder title="About Us" />} />
          <Route path="/careers" element={<Placeholder title="Careers" />} />
          <Route path="/privacy" element={<Placeholder title="Privacy Policy" />} />
          <Route path="/terms" element={<Placeholder title="Terms of Service" />} />
          <Route path="/waivers" element={<Placeholder title="Waivers" />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
