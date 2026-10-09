import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LangProvider } from './i18n/context'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root bulunamadı')
createRoot(root).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
)
