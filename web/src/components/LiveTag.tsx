import { useEffect, useState } from 'react'
import type { ReplayStats } from '../types/scenario'

/** Sahnenin köşesinde düzenin adı ve o andaki kuyruk uzunluğu. */
export function LiveTag({ title, statsRef }: { title: string; statsRef: { current: ReplayStats } }) {
  const [waiting, setWaiting] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setWaiting(statsRef.current.waiting), 100)
    return () => window.clearInterval(id)
  }, [statsRef])
  return (
    <div className="live-tag">
      <span>{title}</span>
      <strong className="num" aria-live="off">{waiting}</strong>
      <small>kuyrukta</small>
    </div>
  )
}
