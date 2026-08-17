import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { signalAppReady } from '@/lib/boot'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found in index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dismiss the boot screen from index.html. Called after render rather than
// from a component so a crash inside any one section still clears the panel.
signalAppReady()
