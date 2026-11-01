import { test } from 'node:test'
import assert from 'node:assert/strict'
import { badgeUrl, logoFileError, logoType, MAX_LOGO_BYTES, textOn } from './badge.js'

test('custom data URI logos keep the URI and drop logoColor', () => {
  const logo = 'data:image/svg+xml;base64,PHN2Zz4='
  const url = new URL(badgeUrl({ ...base, logo, logoColor: '#ffffff' }))
  assert.equal(url.searchParams.get('logo'), logo)
  assert.equal(url.searchParams.get('logoColor'), null)
})

test('logo file checks type and size', () => {
  assert.equal(logoFileError({ name: 'a.svg', type: 'image/svg+xml', size: 900 }), '')
  assert.equal(logoFileError({ name: 'a.png', type: 'image/png', size: MAX_LOGO_BYTES }), '')
  assert.equal(logoFileError({ name: 'a.svg', type: '', size: 900 }), '', 'empty MIME falls back to extension')
  assert.equal(logoType({ name: 'Logo.SVG', type: '' }), 'image/svg+xml')
  assert.match(logoFileError({ name: 'a.jpg', type: 'image/jpeg', size: 900 }), /SVG or PNG/)
  assert.match(logoFileError({ name: 'a.svg', type: 'image/svg+xml', size: MAX_LOGO_BYTES + 1 }), /under 6 KB/)
})

test('badge text color follows background brightness', () => {
  assert.equal(textOn('#61DAFB'), '#333')
  assert.equal(textOn('#ffffff'), '#333')
  assert.equal(textOn('#555555'), '#fff')
  assert.equal(textOn('#2496ED'), '#fff')
})

const base = { label: '', message: 'React', color: '#61DAFB', labelColor: '', style: 'flat', logo: '', logoColor: '' }

test('message only', () => {
  assert.equal(badgeUrl(base), 'https://img.shields.io/badge/React-61DAFB')
})

test('links: label and message halves, empty slot keeps a half unlinked', () => {
  const q = (b) => new URL(badgeUrl({ ...base, ...b })).searchParams.getAll('link')
  assert.deepEqual(q({}), [])
  assert.deepEqual(q({ messageLink: 'https://b.com' }), ['https://b.com'])
  assert.deepEqual(q({ label: 'x', messageLink: 'https://b.com' }), ['', 'https://b.com'])
  assert.deepEqual(q({ label: 'x', labelLink: 'https://a.com' }), ['https://a.com', ''])
  assert.deepEqual(q({ labelLink: 'https://a.com' }), [], 'no label half without a label')
})

test('escapes separators and adds params', () => {
  assert.equal(
    badgeUrl({ ...base, label: 'built-with', message: 'my_app v1', style: 'for-the-badge', logo: 'react', logoColor: '#fff' }),
    'https://img.shields.io/badge/built--with-my__app_v1-61DAFB?style=for-the-badge&logo=react&logoColor=fff',
  )
})
