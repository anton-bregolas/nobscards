import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import { I18nProvider } from './i18n'
import App from './App.tsx'

function getLang(): string {
  try {
    const raw = localStorage.getItem('cardsSettings')
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (typeof parsed.language === 'string') return parsed.language
    }
  } catch { /* ignore */ }
  return 'ru'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider lang={getLang()}>
      <App />
    </I18nProvider>
  </StrictMode>,
)
