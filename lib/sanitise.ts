/**
 * HTML sanitisation for LLM safety.
 *
 * Raw HTML from unknown sites may contain prompt injection payloads in
 * script tags, comments, data attributes, or event handlers. Stripping
 * these before LLM calls prevents the model from following instructions
 * embedded in analysed pages.
 */

const EVENT_HANDLER_RE = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g
const INLINE_SCRIPT_RE = /(<script\b[^>]*?)>([\s\S]*?)(<\/script>)/gi
const INLINE_STYLE_RE = /(<style\b[^>]*?)>([\s\S]*?)(<\/style>)/gi
const SVG_INTERNALS_RE = /(<svg\b[^>]*?>)([\s\S]*?)(<\/svg>)/gi
const DATA_URI_RE = /((?:src|href)\s*=\s*(?:"|'))data:[^"']+(?:"|')/gi
const IFRAME_SRCDOC_RE = /(\ssrcdoc\s*=\s*)(?:"[^"]*"|'[^']*')/gi

/**
 * Sanitise HTML for LLM consumption — standard mode.
 *
 * Keeps structural signals (tags, src/href, meta, class, data-* attributes).
 * Strips injection surfaces (inline scripts, event handlers, comments, data URIs).
 *
 * @param html  Raw HTML string
 * @param maxLength  Maximum output length after stripping (default 60000)
 */
export function sanitiseForLLM(html: string, maxLength = 60_000): string {
  let out = html

  // Strip HTML comments (common injection vector)
  out = out.replace(HTML_COMMENT_RE, "")

  // Strip inline script contents but keep tag + src attribute
  out = out.replace(INLINE_SCRIPT_RE, (_match, open, _contents, close) => {
    // Preserve src attribute if present
    const srcMatch = open.match(/\ssrc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i)
    const src = srcMatch ? ` ${srcMatch[0].trim()}` : ""
    return `<script${src} stripped-inline>${close}`
  })

  // Strip inline style contents
  out = out.replace(INLINE_STYLE_RE, (_match, open, _contents, close) => {
    return `${open} stripped>${close}`
  })

  // Strip SVG internals (keep the tag)
  out = out.replace(SVG_INTERNALS_RE, (_match, open, _internals, close) => {
    return `${open}[svg-stripped]${close}`
  })

  // Strip event handler attributes
  out = out.replace(EVENT_HANDLER_RE, "")

  // Strip data: URIs and base64 content in src/href
  out = out.replace(DATA_URI_RE, "$1[data-uri-stripped]\"")

  // Strip iframe srcdoc attributes
  out = out.replace(IFRAME_SRCDOC_RE, "$1\"[srcdoc-stripped]\"")

  // Truncate after stripping so more useful content fits
  if (out.length > maxLength) {
    out = out.slice(0, maxLength)
  }

  return out
}

/**
 * Compact sanitisation — more aggressive stripping for Tier 2 speed.
 *
 * Same as sanitiseForLLM plus: strips all attribute values except
 * src, href, content (on meta), class, id, data-*, type, rel, name.
 *
 * @param html  Raw HTML string
 * @param maxLength  Maximum output length (default 30000)
 */
export function sanitiseForLLMCompact(html: string, maxLength = 30_000): string {
  // First apply standard sanitisation
  let out = sanitiseForLLM(html, Infinity)

  // Strip non-essential attribute values
  // Keep: src, href, content, class, id, data-*, type, rel, name
  const KEEP_ATTRS = /^(?:src|href|content|class|id|type|rel|name)$/i
  const ATTR_RE = /\s([a-z][\w-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))/gi

  out = out.replace(ATTR_RE, (match, attrName: string) => {
    if (KEEP_ATTRS.test(attrName)) return match
    if (attrName.startsWith("data-")) return match
    return ""
  })

  // Collapse whitespace runs to save tokens
  out = out.replace(/\s{2,}/g, " ")

  if (out.length > maxLength) {
    out = out.slice(0, maxLength)
  }

  return out
}
