import { useI18n } from '../i18n/context'
import type { StaffingRow, Verification } from '../lib/staffing'

export interface RowCheck {
  at: Verification
  less: Verification | null
}


interface Props {
  average: readonly StaffingRow[]
  busy: readonly StaffingRow[]
  checks: Readonly<Record<number, RowCheck>>
  onVerify: (row: StaffingRow) => void
}

export function StaffTable({ average, busy, checks, onVerify }: Props) {
  const { t, f } = useI18n()
  const s = t.staffing
  const h = s.headers
  return (
    <div className="table-wrap">
      <table className="staff-table">
        <caption>{s.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{h.hour}</th>
            <th scope="col">{h.perHour}</th>
            <th scope="col">{h.avgLanes}</th>
            <th scope="col">{h.busyLanes}</th>
            <th scope="col">{h.surrogateP90}</th>
            <th scope="col">{h.simP90}</th>
            <th scope="col">{h.oneLess}</th>
            <th scope="col"><span className="sr-only">{h.verify}</span></th>
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
                <td className="num">{r.lanes ?? s.unattainable}</td>
                <td className="num">{b?.lanes ?? s.unattainable}</td>
                <td className="num">{r.predP90 === null ? '–' : f.wait(r.predP90)}</td>
                <td className="num">{c ? s.meets(f.wait(c.at.p90), Math.round(c.at.meets * 100)) : '–'}</td>
                <td className="num">{c ? (c.less ? s.meets(f.wait(c.less.p90), Math.round(c.less.meets * 100)) : s.singleLane) : '–'}</td>
                <td>{r.lanes !== null && <button type="button" onClick={() => onVerify(r)}>{s.verify}</button>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
