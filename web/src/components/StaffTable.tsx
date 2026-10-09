import type { StaffingRow, Verification } from '../lib/staffing'

export interface RowCheck {
  at: Verification
  less: Verification | null
}

const sec = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)} dk ${String(Math.round(s % 60)).padStart(2, '0')} sn` : `${Math.round(s)} sn`)

interface Props {
  average: readonly StaffingRow[]
  busy: readonly StaffingRow[]
  checks: Readonly<Record<number, RowCheck>>
  onVerify: (row: StaffingRow) => void
}

export function StaffTable({ average, busy, checks, onVerify }: Props) {
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>Vekil model önerisi ve simülatörle sınama (sınama ortalama gün talebiyle yapılır)</caption>
        <thead>
          <tr>
            <th scope="col">Saat</th>
            <th scope="col">Müşteri / saat</th>
            <th scope="col">Ortalama gün: kasa</th>
            <th scope="col">Yoğun gün: kasa</th>
            <th scope="col">Vekil P90</th>
            <th scope="col">Simülatör P90</th>
            <th scope="col">Bir eksik kasa (sim.)</th>
            <th scope="col"><span className="sr-only">Sına</span></th>
          </tr>
        </thead>
        <tbody>
          {average.map((r, i) => {
            const c = checks[r.hour]
            const b = busy[i]
            return (
              <tr key={r.hour}>
                <th scope="row" className="num">{String(r.hour).padStart(2, '0')}:00</th>
                <td className="num">{Math.round(r.lamPerHour)}</td>
                <td className="num">{r.lanes ?? 'sağlanamıyor'}</td>
                <td className="num">{b?.lanes ?? 'sağlanamıyor'}</td>
                <td className="num">{r.predP90 === null ? '–' : sec(r.predP90)}</td>
                <td className="num">{c ? `${sec(c.at.p90)} · %${Math.round(c.at.meets * 100)} sağlıyor` : '–'}</td>
                <td className="num">{c ? (c.less ? `${sec(c.less.p90)} · %${Math.round(c.less.meets * 100)} sağlıyor` : 'tek kasa') : '–'}</td>
                <td>{r.lanes !== null && <button type="button" onClick={() => onVerify(r)}>Sına</button>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
