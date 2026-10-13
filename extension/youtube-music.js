// Adaptación de la actividad YouTube Music de PreMiD; ver THIRD_PARTY_NOTICES.md.
const LOGO = 'https://cdn.rcd.gg/PreMiD/websites/Y/YouTube%20Music/assets/logo.png'
let video = null
let observed = null
let updateTimer = null
let settleTimer = null
let lastPayload = ''
let startBrowsing = Math.floor(Date.now() / 1000)
let lastPath = location.pathname

function text(selector) {
  return document.querySelector(selector)?.textContent?.trim() || ''
}

function image(selector) {
  const src = document.querySelector(selector)?.src
  if (!src || !/^https?:\/\//.test(src)) return undefined
  return src.replace(/(https?:\/\/yt3\.googleusercontent\.com\/[^?\s]*=)w\d+-h\d+/, '$1w544-h544')
}

function playerTimes() {
  const raw = text('#left-controls > span') || text('.ytMusicMiniPlayerTimeInfo')
  const times = raw.split(' / ')
  const seconds = value => value.split(':').reduce((total, part) => total * 60 + Number(part), 0)
  if (times.length !== 2) return null
  const current = seconds(times[0])
  const duration = seconds(times[1])
  return Number.isFinite(current) && Number.isFinite(duration) && duration > 0 && current <= duration + 1
    ? [current, duration] : null
}

function timestamps(media) {
  const visible = playerTimes()
  let current = media?.currentTime
  let duration = media?.duration
  if (!Number.isFinite(current) || !Number.isFinite(duration) || duration <= 0 || current > duration + 1
    || (visible && Math.abs(duration - visible[1]) > 2)) {
    if (!visible) return undefined
    ;[current, duration] = visible
  }
  const start = Math.floor(Date.now() / 1000 - current)
  return { start, end: start + Math.ceil(duration) }
}

function getActivity() {
  const media = document.querySelector('.video-stream')
  const session = navigator.mediaSession
  const state = media && Number.isFinite(media.duration)
    ? media.paused ? 'paused' : 'playing'
    : session?.playbackState || 'none'
  const title = text('.ytmusicTrackInfoTitle, .title.ytmusic-player-bar') || session?.metadata?.title
  const artist = text('.ytmusicTrackInfoByline a, .byline.ytmusic-player-bar a') || session?.metadata?.artist
  const album = session?.metadata?.album
  const artwork = image('#song-image img') || image('.ytmusicTrackInfoThumbnail')
    || image('ytmusic-player-bar img#img') || session?.metadata?.artwork?.at(-1)?.src || LOGO
  const watchId = new URL(location.href).searchParams.get('v')
  const artistLink = document.querySelector('.ytmusicTrackInfoByline a[href], .byline a[href]')?.href
  const songUrl = watchId ? `https://music.youtube.com/watch?v=${encodeURIComponent(watchId)}` : undefined

  if (['playing', 'paused'].includes(state) && title) {
    const activity = {
      type: 2, details: title, state: artist || undefined,
      assets: { large_image: artwork, large_text: album || 'YouTube Music',
        ...(state === 'paused' ? { small_image: LOGO, small_text: 'En pausa' } : {}) },
      buttons: songUrl ? [{ label: 'Escuchar canción', url: songUrl }] : undefined,
      details_url: songUrl,
      state_url: artistLink,
    }
    if (state === 'playing') activity.timestamps = timestamps(media)
    return activity
  }

  // Navegación equivalente al ajuste Show Browsing, activado por defecto en el original.
  if (lastPath !== location.pathname) {
    lastPath = location.pathname
    startBrowsing = Math.floor(Date.now() / 1000)
  }
  const path = location.pathname
  let details = 'Explorando YouTube Music'
  let browsingState
  if (path === '/') details = 'En el inicio'
  else if (path === '/explore') details = 'Explorando música'
  else if (path.startsWith('/library/')) { details = 'Explorando la biblioteca'; browsingState = text('#tabs .iron-selected .tab') }
  else if (path.startsWith('/playlist')) { details = 'Explorando una playlist'; browsingState = text('#contents ytmusic-responsive-header-renderer h1 .title') }
  else if (path.startsWith('/search')) { details = 'Buscando música'; browsingState = document.querySelector('.search-container input')?.value }
  else if (path.startsWith('/channel')) { details = 'Explorando un canal'; browsingState = text('#header .title') }
  else if (path.startsWith('/new_releases')) details = 'Explorando lanzamientos'
  else if (path.startsWith('/charts')) details = 'Explorando listas'
  else if (path.startsWith('/moods_and_genres')) details = 'Explorando géneros'
  return { type: 0, details, state: browsingState || undefined,
    assets: { large_image: LOGO }, timestamps: { start: startBrowsing } }
}

function update() {
  const current = document.querySelector('.video-stream')
  if (current !== video) {
    for (const event of ['loadedmetadata', 'playing', 'pause', 'seeked']) {
      video?.removeEventListener(event, schedule)
      current?.addEventListener(event, schedule)
    }
    video = current
  }
  const track = document.querySelector('ytmusic-track-info')?.parentElement
    || document.querySelector('.title.ytmusic-player-bar')?.parentElement
  if (track !== observed) {
    observer.disconnect()
    if (track) observer.observe(track, { childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['src', 'title'] })
    observed = track
  }
  const activity = getActivity()
  const payload = JSON.stringify(activity)
  if (payload !== lastPayload) {
    lastPayload = payload
    chrome.runtime.sendMessage({ kind: 'activity', activity }).catch(() => {})
  }
}

function schedule() {
  clearTimeout(updateTimer)
  updateTimer = setTimeout(update, 150)
}

const observer = new MutationObserver(() => {
  schedule()
  clearTimeout(settleTimer)
  settleTimer = setTimeout(update, 1200)
})
chrome.runtime.onMessage.addListener(message => {
  if (message.kind === 'refresh') { lastPayload = ''; update() }
})
update()
setInterval(update, 5000)
