import { lazy, Suspense, useEffect, useState } from 'react'
import { Nav, viewFromHash, type ViewId } from './components/Nav'
import { useI18n } from './i18n/context'
const StoryView = lazy(() => import('./views/StoryView'))
const LabView = lazy(() => import('./views/LabView'))
const StaffingView = lazy(() => import('./views/StaffingView'))
const ValidationView = lazy(() => import('./views/ValidationView'))
const MethodView = lazy(() => import('./views/MethodView'))

export default function App() {
  const { t } = useI18n()
  const [view, setView] = useState<ViewId>(() => viewFromHash(window.location.hash))
  useEffect(() => {
    const on = () => {
      setView(viewFromHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <div className="app">
      <header className="top">
        <a className="wordmark" href="#/">{t.brand}</a>
        <Nav view={view} />
      </header>
      <main>
        <Suspense fallback={<div className="state" role="status"><p>{t.loading}</p></div>}>
          {view === 'hikaye' && <StoryView />}
          {view === 'lab' && <LabView />}
          {view === 'kasa' && <StaffingView />}
          {view === 'dogrulama' && <ValidationView />}
          {view === 'yontem' && <MethodView />}
        </Suspense>
      </main>
      <footer className="foot">
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}
