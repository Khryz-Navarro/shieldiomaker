import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
// shortcut: bundles all icon paths (~2 MB gzip), lazy-load or fetch per icon if load time matters
import * as simpleIcons from 'simple-icons'
import { badgeUrl, isCustomLogo, logoFileError, logoType, textOn } from './badge.js'

const icons = Object.values(simpleIcons)
const bySlug = new Map(icons.map((i) => [i.slug, i]))
const POPULAR = ['react', 'typescript', 'javascript', 'python', 'nodedotjs', 'docker', 'git', 'github', 'vite', 'tailwindcss',
  'nextdotjs', 'vuedotjs', 'svelte', 'rust', 'go', 'postgresql', 'mongodb', 'kubernetes', 'linux', 'githubactions', 'npm',
  'html5', 'css', 'figma'].map((s) => bySlug.get(s))
const STYLES = ['flat', 'flat-square', 'plastic', 'for-the-badge', 'social']
const MAX_RESULTS = 60
const LABEL_GREY = '#555555'
const TIPS = {
  label: 'Left side text. Leave empty for a single-section badge.',
  message: 'Right side text (required). Dashes, underscores and spaces are escaped for you.',
  labelLink: 'Optional URL opened when clicking the label (left) side. Needs a label.',
  messageLink: 'Optional URL opened when clicking the message (right) side.',
  color: 'Background of the message side. Picking an icon sets this to the brand color.',
  labelColor: 'Background of the label side. Defaults to Shields grey (#555).',
  style: 'flat: default rounded · flat-square: square corners · plastic: glossy · for-the-badge: large uppercase · social: GitHub-style',
  logoColor: 'Color of the icon on the badge. Applies to Simple Icons only, not uploaded logos.',
  icon: 'Search Simple Icons by name. Clicking one adds it as the badge logo.',
  upload: 'Use your own logo when Simple Icons doesn’t have it. SVG or PNG under 6 KB. It is embedded in the badge URL, and logo color does not apply.',
  format: 'Markdown and HTML wrap the whole badge in one link. "HTML, 2 links" uses <object> so each half keeps its own link, but GitHub strips it.',
}

// LinkedIn isn't in Simple Icons (removed at the brand's request), so its mark is inlined here.
const LINKEDIN = {
  path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z',
}
const SOCIALS = [
  ['GitHub', 'https://github.com/Khryz-Navarro', bySlug.get('github')],
  ['Facebook', 'https://www.facebook.com/navarro.khryz/', bySlug.get('facebook')],
  ['LinkedIn', 'https://www.linkedin.com/in/khryz-navarro-5abb4b398/', LINKEDIN],
  ['YouTube', 'https://www.youtube.com/@khryznavarro1521', bySlug.get('youtube')],
]
const SUPPORT_URL = 'https://buymeacoffee.com/khryznavarz'

// Markdown and <img> can only wrap the whole badge in one link; separate halves need <object>.
const attr = (s) => s.replaceAll('"', '&quot;')

function InfoIcon() {
  return (
    <svg className="tip" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.2v4M8 4.6v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Field({ name, tip, children }) {
  return (
    <label className="field" title={tip}>
      <span className="field-name">{name} <InfoIcon /></span>
      {children}
    </label>
  )
}

function Icon({ icon, size = 24, color }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={icon.path} fill={color ?? `#${icon.hex}`} />
    </svg>
  )
}

function Segmented({ name, legend, tip, value, options, onChange }) {
  return (
    <fieldset className="segmented" title={tip}>
      <legend className="field-name">{legend} <InfoIcon /></legend>
      <div className="segments">
        {options.map(([id, text]) => (
          <label key={id} className="segment">
            <input type="radio" name={name} value={id} checked={value === id} onChange={() => onChange(id)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Copy({ text, disabled }) {
  const [status, setStatus] = useState('')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied')
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the snippet stays selectable.
      setStatus('Copy failed, select the snippet')
    }
    setTimeout(() => setStatus(''), 2500)
  }
  return (
    <button type="button" className="copy" onClick={copy} disabled={disabled} aria-live="polite">
      {status || 'Copy'}
    </button>
  )
}

// Elbow hairlines from each badge part down to its callout group, measured from live layout.
function useLeaders(containerRef, pairs, deps) {
  const [paths, setPaths] = useState([])
  useLayoutEffect(() => {
    const el = containerRef.current
    const draw = () => {
      if (!matchMedia('(min-width: 761px)').matches) return setPaths([])
      const box = el.getBoundingClientRect()
      // Every leader starts just under the badge, even the icon's, whose slot sits inside a half.
      const y1 = Math.round(el.querySelector('.badge').getBoundingClientRect().bottom - box.top) + 10
      setPaths(pairs.map(([id, anchorRef, groupRef], i) => {
        const a = anchorRef.current?.getBoundingClientRect()
        const g = groupRef.current?.getBoundingClientRect()
        if (!a || !g) return null
        const x1 = Math.round(a.left + a.width / 2 - box.left) + 0.5
        const x2 = Math.round(g.left - box.left) + 0.5
        const y2 = Math.round(g.top - box.top) - 2
        // A near-straight drop reads as a drawing error, so draw it straight.
        if (Math.abs(x2 - x1) < 16) return { id, d: `M${x1} ${y1}V${y2}` }
        const mid = Math.round(y1 + (y2 - y1) * (0.35 + i * 0.15)) + 0.5
        return { id, d: `M${x1} ${y1}V${mid}H${x2}V${y2}` }
      }).filter(Boolean))
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return paths
}

export default function App() {
  const [badge, setBadge] = useState({
    label: 'built with',
    message: 'React',
    color: '#61DAFB',
    labelColor: '',
    style: 'for-the-badge',
    logo: 'react',
    logoColor: '#ffffff',
    logoName: '',
    labelLink: '',
    messageLink: '',
  })
  const [query, setQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const finePointer = useMemo(() => matchMedia('(pointer: fine)').matches, [])
  const [active, setActive] = useState(finePointer ? 'message' : '')
  const [format, setFormat] = useState('md')
  const slotRef = useRef(null)
  const editorRef = useRef(null)
  const labelHalfRef = useRef(null)
  const messageHalfRef = useRef(null)
  const messageRef = useRef(null)
  const iconGroupRef = useRef(null)
  const labelGroupRef = useRef(null)
  const messageGroupRef = useRef(null)
  const set = (key) => (e) => setBadge({ ...badge, [key]: e.target.value })

  // Land the caret in the badge so it reads as editable; skip touch so phones don't pop the keyboard.
  useEffect(() => {
    if (!finePointer) return
    const input = messageRef.current
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [finePointer])

  const leaders = useLeaders(editorRef, [
    ['icon', slotRef, iconGroupRef],
    ['label', labelHalfRef, labelGroupRef],
    ['message', messageHalfRef, messageGroupRef],
  ], [badge.label, badge.message, badge.style, badge.logo])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return POPULAR
    return icons.filter((i) => i.title.toLowerCase().includes(q) || i.slug.includes(q)).slice(0, MAX_RESULTS)
  }, [query])

  const selected = bySlug.get(badge.logo)
  const custom = isCustomLogo(badge.logo)
  const hasLogo = Boolean(selected || custom)
  // Replace the message only if the user hasn't typed their own.
  const autoMessage = !badge.message || badge.message === selected?.title
  const pick = (icon) => {
    setBadge({ ...badge, logo: icon.slug, logoName: '', message: autoMessage ? icon.title : badge.message, color: `#${icon.hex}` })
    closePicker()
  }
  const closePicker = () => {
    setPickerOpen(false)
    setUploadError('')
    slotRef.current?.focus()
  }
  const removeLogo = () => setBadge({ ...badge, logo: '', logoName: '' })

  const upload = (e) => {
    const file = e.target.files[0]
    e.target.value = '' // lets the same file be chosen again after a fix
    if (!file) return
    const error = logoFileError(file)
    setUploadError(error)
    if (error) return
    const reader = new FileReader()
    reader.onload = () => {
      // Normalize the MIME type: an .svg with an empty type would otherwise read as octet-stream.
      const logo = reader.result.replace(/^data:[^;]*;/, `data:${logoType(file)};`)
      setBadge((b) => ({ ...b, logo, logoName: file.name }))
      closePicker()
    }
    reader.onerror = () => setUploadError('Could not read that file. Try again or choose another one.')
    reader.readAsDataURL(file)
  }

  const url = badgeUrl(badge)
  const alt = [badge.label, badge.message].filter(Boolean).join(' ')
  const href = badge.messageLink || (badge.label && badge.labelLink)
  const img = `<img alt="${attr(alt)}" src="${attr(url)}" />`
  const twoLinks = Boolean(badge.label && badge.labelLink && badge.messageLink)
  const outputs = {
    md: ['Markdown', href ? `[![${alt}](${url})](${href})` : `![${alt}](${url})`],
    html: ['HTML', href ? `<a href="${attr(href)}">${img}</a>` : img],
    ...(twoLinks && { object: ['HTML, 2 links', `<object data="${attr(url)}" type="image/svg+xml">${img}</object>`] }),
    url: ['URL', url],
  }
  const shown = outputs[format] ?? outputs.md
  const labelBg = badge.labelColor || LABEL_GREY

  const slot = (
    <button
      type="button"
      ref={slotRef}
      className={`slot ${hasLogo ? '' : 'slot-empty'}`}
      aria-label={selected ? `Change icon (${selected.title})` : custom ? `Change icon (custom logo ${badge.logoName})` : 'Add icon'}
      title={TIPS.icon}
      aria-expanded={pickerOpen}
      aria-controls="icon-picker"
      onClick={() => setPickerOpen(!pickerOpen)}
      onFocus={() => setActive('icon')}
    >
      {selected ? (
        <Icon icon={selected} color={badge.logoColor} />
      ) : custom ? (
        <img src={badge.logo} alt="" />
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )

  return (
    <div className="page">
      <header className="top">
        <h1>Shields.io Badge Maker</h1>
      </header>

      <main>
        <section className="bench" aria-label="Badge editor">
          <Segmented
            name="style"
            legend="Style"
            tip={TIPS.style}
            value={badge.style}
            options={STYLES.map((s) => [s, s])}
            onChange={(style) => setBadge({ ...badge, style })}
          />

          <div className="editor" ref={editorRef}>
            <svg className="leaders" aria-hidden="true">
              {leaders.map((l) => <path key={l.id} d={l.d} data-active={active === l.id || undefined} />)}
            </svg>
            <div className="badge-scroll">
              <div
                className={`badge s-${badge.style}`}
                style={{ '--lc': labelBg, '--lt': textOn(labelBg), '--mc': badge.color, '--mt': textOn(badge.color) }}
              >
                <div ref={labelHalfRef} className={`half half-label ${badge.label ? '' : 'half-empty'}`} title={TIPS.label}>
                  {badge.label && slot}
                  <input
                    aria-label="Label"
                    value={badge.label}
                    onChange={set('label')}
                    onFocus={() => setActive('label')}
                    placeholder="label"
                    size={Math.max(badge.label.length, 5)}
                    spellCheck="false"
                  />
                </div>
                <div ref={messageHalfRef} className={`half half-message ${badge.message ? '' : 'half-missing'}`} title={TIPS.message}>
                  {!badge.label && slot}
                  <input
                    ref={messageRef}
                    aria-label="Message"
                    value={badge.message}
                    onChange={set('message')}
                    onFocus={() => setActive('message')}
                    placeholder="message"
                    size={Math.max(badge.message.length, 7)}
                    spellCheck="false"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="callouts">
              <fieldset ref={iconGroupRef} className="callout" data-active={active === 'icon' || undefined} onFocus={() => setActive('icon')}>
                <legend>Icon</legend>
                <div className="callout-row">
                  <span className="icon-name">
                    {selected ? (
                      <><Icon icon={selected} size={18} /> {selected.title}</>
                    ) : custom ? (
                      <><img src={badge.logo} alt="" width="18" height="18" /> <span className="file-name">{badge.logoName}</span></>
                    ) : 'No icon'}
                  </span>
                  <button type="button" title={TIPS.icon} aria-expanded={pickerOpen} aria-controls="icon-picker" onClick={() => setPickerOpen(!pickerOpen)}>
                    {hasLogo ? 'Change' : 'Choose'}
                  </button>
                  {hasLogo && <button type="button" onClick={removeLogo}>Remove</button>}
                </div>
                <Field name="Logo color" tip={TIPS.logoColor}>
                  <input type="color" value={badge.logoColor} onChange={set('logoColor')} disabled={!selected} />
                </Field>
                {custom && <p className="hint">Uploaded logos keep their own colors.</p>}
              </fieldset>

              <fieldset ref={labelGroupRef} className="callout" data-active={active === 'label' || undefined} onFocus={() => setActive('label')}>
                <legend>Label</legend>
                <Field name="Label color" tip={TIPS.labelColor}>
                  <span className="row">
                    <input type="color" value={labelBg} onChange={set('labelColor')} />
                    {badge.labelColor && <button type="button" onClick={() => setBadge({ ...badge, labelColor: '' })}>Reset</button>}
                  </span>
                </Field>
                <Field name="Label link" tip={TIPS.labelLink}>
                  <input type="url" value={badge.labelLink} onChange={set('labelLink')} placeholder={badge.label ? 'optional, https://…' : 'add a label first'} disabled={!badge.label} />
                </Field>
              </fieldset>

              <fieldset ref={messageGroupRef} className="callout" data-active={active === 'message' || undefined} onFocus={() => setActive('message')}>
                <legend>Message</legend>
                <Field name="Message color" tip={TIPS.color}>
                  <input type="color" value={badge.color} onChange={set('color')} />
                </Field>
                <Field name="Message link" tip={TIPS.messageLink}>
                  <input type="url" value={badge.messageLink} onChange={set('messageLink')} placeholder="optional, https://…" />
                </Field>
              </fieldset>
            </div>
          </div>

          <p className="status">
            {active && <strong>Editing the {active}. </strong>}
            Type on the badge to edit it. Click its icon to change it.
          </p>

          {pickerOpen && (
            <div
              id="icon-picker"
              className="picker"
              role="region"
              aria-label="Icon picker"
              onKeyDown={(e) => e.key === 'Escape' && closePicker()}
            >
              <div className="picker-head">
                <Field name={`Search ${icons.length.toLocaleString()} Simple Icons`} tip={TIPS.icon}>
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. github, python, docker" autoFocus />
                </Field>
                <button type="button" className="close" aria-label="Close icon picker" onClick={closePicker}>
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <p className="hint" aria-live="polite">
                {!query.trim()
                  ? 'Popular icons. Search to see the rest.'
                  : results.length === 0
                    ? `No icon matches “${query.trim()}”. Upload your own logo below.`
                    : results.length === MAX_RESULTS
                      ? `Showing the first ${MAX_RESULTS} matches. Refine your search.`
                      : `${results.length} matches`}
              </p>
              <div className="icons">
                {results.map((icon) => (
                  <button
                    type="button"
                    key={icon.slug}
                    title={icon.title}
                    aria-pressed={icon.slug === badge.logo}
                    onClick={() => pick(icon)}
                  >
                    <Icon icon={icon} />
                    <span>{icon.title}</span>
                  </button>
                ))}
              </div>
              <div className="upload-row">
                <p className="hint">Not in Simple Icons? Upload an SVG or PNG under 6 KB.</p>
                <label className="upload" title={TIPS.upload}>
                  <input
                    type="file"
                    accept=".svg,.png,image/svg+xml,image/png"
                    onChange={upload}
                    aria-describedby={uploadError ? 'upload-error' : undefined}
                  />
                  <span>
                    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                      <path d="M8 11V3M4.5 6.5 8 3l3.5 3.5M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Upload logo
                  </span>
                </label>
                {uploadError && <p id="upload-error" className="upload-error" role="alert">{uploadError}</p>}
              </div>
            </div>
          )}
        </section>

        <section className="output" aria-label="Copy your badge">
          <figure className="render">
            {badge.message ? <img src={url} alt={alt} /> : <span className="hint">No badge yet</span>}
            <figcaption>Rendered by Shields.io</figcaption>
          </figure>
          <div className="snippet">
            <Segmented
              name="format"
              legend="Format"
              tip={TIPS.format}
              value={format in outputs ? format : 'md'}
              options={Object.entries(outputs).map(([id, [text]]) => [id, text])}
              onChange={setFormat}
            />
            <div className="code-row">
              <code>{badge.message ? shown[1] : 'Type a message on the badge to get a snippet.'}</code>
              <Copy text={shown[1]} disabled={!badge.message} />
            </div>
          </div>
        </section>

        <p className="support">
          Saved you some time?{' '}
          <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
            <Icon icon={bySlug.get('buymeacoffee')} size={16} color="currentColor" />
            Buy me a coffee
          </a>
        </p>
      </main>

      <footer>
        <p>© 2026 Khryz Navarro. All rights reserved.</p>
        {/* New tab, so following a link never throws away a badge in progress. */}
        <nav className="socials" aria-label="Social links">
          {SOCIALS.map(([name, href, icon]) => (
            <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name} title={name}>
              <Icon icon={icon} size={18} color="currentColor" />
            </a>
          ))}
          <a href="https://khryz-navarro.github.io/portfolio/" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
              </g>
            </svg>
            Portfolio
          </a>
        </nav>
      </footer>
    </div>
  )
}
