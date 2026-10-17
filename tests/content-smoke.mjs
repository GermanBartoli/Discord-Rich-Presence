import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const sent = []
const settings = { privacyMode: false, showCover: true, showTimestamps: true,
  hidePaused: false, showBrowsing: true, showButtons: true, links: true }
const video = { paused: false, duration: 180, currentTime: 30,
  addEventListener() {}, removeEventListener() {} }
const elements = {
  '.video-stream': video,
  '.title.ytmusic-player-bar': { textContent: 'Canción nueva', parentElement: {} },
  '.byline.ytmusic-player-bar a': { textContent: 'Artista', href: 'https://music.youtube.com/channel/artist' },
  '#song-image img': { src: 'https://yt3.googleusercontent.com/example=w120-h120' },
  '#left-controls > span': { textContent: '0:30 / 3:00' },
}
let onChanged
const context = {
  document: {
    querySelector: selector => selector.split(', ').map(part => elements[part]).find(Boolean) || null,
    querySelectorAll: () => [],
  },
  location: { href: 'https://music.youtube.com/watch?v=abc12345', pathname: '/watch' },
  navigator: { mediaSession: undefined },
  chrome: {
    runtime: { sendMessage: message => { sent.push(message); return Promise.resolve() }, onMessage: { addListener() {} } },
    storage: { local: { get: async defaults => ({ ...defaults, ...settings }) },
      onChanged: { addListener: listener => { onChanged = listener } } },
  },
  MutationObserver: class { observe() {} disconnect() {} },
  setInterval: () => 1,
  setTimeout, clearTimeout, URL, Date,
}

vm.runInNewContext(readFileSync('extension/youtube-music.js', 'utf8'), context)
assert.equal(sent[0].activity.details, 'Canción nueva')
assert.equal(sent[0].activity.state, 'Artista')
assert.equal(sent[0].activity.timestamps.end - sent[0].activity.timestamps.start, 180)
assert.equal(sent[0].activity.buttons[0].url, 'https://music.youtube.com/watch?v=abc12345')
video.paused = true
onChanged({ showCover: {} })
await new Promise(resolve => setImmediate(resolve))
assert.equal(sent.at(-1).activity.assets.small_image,
  'https://raw.githubusercontent.com/GermanBartoli/Discord-Rich-Presence/main/docs/icono-pausa.png')
assert.equal(sent.at(-1).activity.assets.small_text, 'En pausa')
settings.privacyMode = true
onChanged({ privacyMode: {} })
await new Promise(resolve => setImmediate(resolve))
assert.equal(sent.at(-1).activity.details, 'Escuchando una canción')
assert.equal(sent.at(-1).activity.buttons, undefined)
console.log('Lectura de canción, pausa y modo privacidad correctos')
