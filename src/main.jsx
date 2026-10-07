import React from 'react'
import ReactDOM from 'react-dom/client'
// Orden de las hojas: marca Filmpilot, Tailwind (sus utilidades ajustan las clases de
// marca) y después las de cada pantalla, que llegan con App (Landing.css) o en diferido.
import './brand/filmpilot.css'
import './index.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
