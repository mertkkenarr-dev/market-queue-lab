import { parseParams, type StoreParams } from '@sim/params'
import raw from '../../../sim/params.json'

export type ParamsState = { status: 'ok'; params: StoreParams } | { status: 'error'; message: string }

/** Parametre dosyası bozuksa uygulama çökmez; hata ekranı gösterilir. */
export function loadParams(): ParamsState {
  try {
    return { status: 'ok', params: parseParams(raw) }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}
