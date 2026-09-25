import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { leaveIfSignedOut } from './gate-check'
import { App } from './ui/App'
import { lockPaper } from './ui/theme'
import './styles.css'

registerSW({ immediate: true })
lockPaper()
// Production only: the dev server leaves /learn/ open, and asks nothing of the gate.
if (import.meta.env.PROD) {
  void leaveIfSignedOut({ online: navigator.onLine, fetchImpl: fetch, go: (url) => location.replace(url) })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
