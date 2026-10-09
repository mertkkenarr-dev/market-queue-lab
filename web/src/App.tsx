import { lazy, Suspense, useEffect, useState } from 'react'
import { Nav, viewFromHash, type ViewId } from './components/Nav'
import LabView from './views/LabView'

const StaffingView = lazy(() => import('./views/StaffingView'))
const ValidationView = lazy(() => import('./views/ValidationView'))

export default function App() {
  const [view, setView] = useState<ViewId>(() => viewFromHash(window.location.hash))
  useEffect(() => {
    const on = () => setView(viewFromHash(window.location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <main className="app">
      <header className="top">
        <h1>Kuyruk Laboratuvarı</h1>
        <p>Gerçek market verisinden öğrenilmiş müşteri ve servis süresi modeliyle, ayrık-olay simülasyonu. Aynı müşteriler, farklı kuyruk düzeni.</p>
        <Nav view={view} />
      </header>
      <Suspense fallback={<div className="state"><p>Yükleniyor</p></div>}>
        {view === 'lab' && <LabView />}
        {view === 'kasa' && <StaffingView />}
        {view === 'dogrulama' && <ValidationView />}
      </Suspense>
    </main>
  )
}
