/**
 * HTMLサニタイズユーティリティ（SEC-006）
 *
 * v-html で使用する前にHTMLをサニタイズして XSS を防止
 * 許可するタグ: b, i, em, strong, br, p, ul, ol, li, code, pre, a (href のみ)
 */

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li',
  'code', 'pre', 'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
])

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class']),
  div: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
}

/**
 * HTMLをサニタイズ
 * - スクリプトタグ・イベントハンドラを除去
 * - 許可されていないタグを除去
 * - javascript: URLを除去
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  let result = html

  // script タグを完全除去
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // イベントハンドラ属性を除去 (on*)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')

  // javascript: URL を除去
  result = result.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')

  // data: URL を除去（画像以外）
  result = result.replace(/(?:src|href)\s*=\s*["']?\s*data:(?!image\/)/gi, 'href="')

  // style 属性内の expression/url を除去
  result = result.replace(/style\s*=\s*["'][^"']*(?:expression|url)\s*\([^)]*\)[^"']*["']/gi, '')

  // 許可されていないタグを除去
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    const tag = tagName.toLowerCase()
    if (ALLOWED_TAGS.has(tag)) {
      // 許可タグ内の不要な属性を除去
      if (match.startsWith('</')) {
        return `</${tag}>`
      }

      const allowedAttrs = ALLOWED_ATTRIBUTES[tag]
      if (!allowedAttrs) {
        // 属性なしで返す
        const isSelfClosing = match.endsWith('/>')
        return isSelfClosing ? `<${tag} />` : `<${tag}>`
      }

      // 許可された属性だけを残す
      const attrRegex = /\s+([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
      const attrs: string[] = []
      let attrMatch: RegExpExecArray | null = null

      while ((attrMatch = attrRegex.exec(match)) !== null) {
        const attrName = attrMatch[1].toLowerCase()
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ''
        if (allowedAttrs.has(attrName)) {
          // href に javascript: が含まれていないか再チェック
          if (attrName === 'href' && /^\s*javascript:/i.test(attrValue)) {
            continue
          }
          attrs.push(`${attrName}="${escapeAttr(attrValue)}"`)
        }
      }

      // a タグには自動で rel="noopener noreferrer" を追加
      if (tag === 'a' && !attrs.some((a) => a.startsWith('rel='))) {
        attrs.push('rel="noopener noreferrer"')
      }

      const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : ''
      return `<${tag}${attrStr}>`
    }
    // 許可されていないタグは除去
    return ''
  })

  return result
}

/**
 * HTML属性値のエスケープ
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * プレーンテキストをHTMLエスケープ
 */
export function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
