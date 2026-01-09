import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'normalize.css'
import './styles/global.scss'
import App from './App.jsx'

// Suppress console errors in production
if (import.meta.env.PROD) {
  const noop = () => { };
  console.error = noop;
  console.warn = noop;
  console.log = noop;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
