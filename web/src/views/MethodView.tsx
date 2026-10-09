import { MethodEn } from '../content/method.en'
import { MethodTr } from '../content/method.tr'
import { useI18n } from '../i18n/context'

export default function MethodView() {
  const { lang } = useI18n()
  return lang === 'tr' ? <MethodTr /> : <MethodEn />
}
