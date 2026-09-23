import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './ui/App'
import { lockPaper } from './ui/theme'
import './styles.css'

registerSW({ immediate: true })
lockPaper()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
