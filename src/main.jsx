import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

const root = document.getElementById('root');
const reactRoot = createRoot(root)
reactRoot.render(
  <BrowserRouter>
     {/* <StrictMode> __запросы дважды отправляются из за StrictMode__ */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    {/* </StrictMode> */}
  </BrowserRouter>,
)