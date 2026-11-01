// Shields static badge path segments: "-" and "_" are separators, so they're doubled; spaces become "_".
const escape = (s) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__').replace(/ /g, '_'))
const hex = (c) => c.replace('#', '')

// Same rule Shields.io uses to pick badge text: dark on bright backgrounds, white otherwise.
export function textOn(color) {
  const n = parseInt(hex(color), 16)
  const brightness = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 255000
  return brightness >= 0.69 ? '#333' : '#fff'
}

export const isCustomLogo = (logo) => logo.startsWith('data:')

// Custom logos ride inside the badge URL as a data URI. img.shields.io rendered a ~6 KB SVG
// (8.2k-char URL) and rejected ~12 KB with HTTP 431, so 6 KB keeps a safe margin.
export const MAX_LOGO_BYTES = 6 * 1024
const LOGO_TYPES = { svg: 'image/svg+xml', png: 'image/png' }

// Some systems report an empty MIME type for .svg, so fall back to the extension.
export function logoType({ name, type }) {
  return type || LOGO_TYPES[name.split('.').pop().toLowerCase()] || ''
}

export function logoFileError(file) {
  if (!Object.values(LOGO_TYPES).includes(logoType(file))) return 'Use an SVG or PNG file.'
  if (file.size > MAX_LOGO_BYTES) {
    return `That file is ${Math.ceil(file.size / 1024)} KB. Shields.io needs logos under 6 KB, so simplify or compress it and try again.`
  }
  return ''
}

export function badgeUrl({ label, message, color, labelColor, style, logo, logoColor, labelLink = '', messageLink = '' }) {
  const text = label ? [label, message] : [message]
  const params = new URLSearchParams()
  if (style !== 'flat') params.set('style', style)
  if (logo) params.set('logo', logo)
  // Shields ignores logoColor on custom (data URI) logos, so leave it out of the URL.
  if (logo && logoColor && !isCustomLogo(logo)) params.set('logoColor', hex(logoColor))
  if (labelColor) params.set('labelColor', hex(labelColor))
  // Shields reads the first `link` as the left (label) half and the second as the right (message) half.
  const links = label ? [labelLink, messageLink] : [messageLink]
  if (links.some(Boolean)) links.forEach((l) => params.append('link', l))
  const q = params.toString()
  return `https://img.shields.io/badge/${[...text.map(escape), hex(color)].join('-')}${q ? `?${q}` : ''}`
}
