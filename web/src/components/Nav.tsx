export type ViewId = 'lab' | 'kasa' | 'dogrulama'

const ITEMS: { id: ViewId; label: string; hash: string }[] = [
  { id: 'lab', label: 'Laboratuvar', hash: '#/' },
  { id: 'kasa', label: 'Kaç kasa lazım?', hash: '#/kasa' },
  { id: 'dogrulama', label: 'Doğrulama', hash: '#/dogrulama' },
]

export const viewFromHash = (hash: string): ViewId => ITEMS.find((i) => i.hash === hash)?.id ?? 'lab'

export function Nav({ view }: { view: ViewId }) {
  return (
    <nav className="nav" aria-label="Sayfalar">
      {ITEMS.map((i) => (
        <a key={i.id} href={i.hash} aria-current={view === i.id ? 'page' : undefined}>{i.label}</a>
      ))}
    </nav>
  )
}
