import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { applyTheme } from './ui/theme'
import './styles.css'

try {
  const raw = localStorage.getItem('riankeng:mirror:v1')
  const parsed = raw ? (JSON.parse(raw) as { settings?: { theme?: 'light' | 'dark' | 'system' } }) : null
  applyTheme(parsed?.settings?.theme)
} catch {
  applyTheme('system')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
