import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/** Statik formül; yalnızca bu dosyadaki sabit TeX dizgileriyle kullanılır (kullanıcı girdisi değil). */
export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(children, { displayMode: block, throwOnError: false, output: 'htmlAndMathml' }), [children, block])
  return block ? <div className="tex" dangerouslySetInnerHTML={{ __html: html }} /> : <span dangerouslySetInnerHTML={{ __html: html }} />
}
