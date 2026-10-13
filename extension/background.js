const HOST = 'com.germanbartoli.discord_rich_presence'
let port = null
let connected = false
let error = ''
let latest = null
let latestTab = null
let lastSent = 0
let timer = null

async function isEnabled() {
  const { enabled = true } = await chrome.storage.local.get('enabled')
  return enabled
}

function disconnect() {
  if (port) {
    port.postMessage({ kind: 'clear' })
    port.disconnect()
    port = null
  }
  connected = false
}

function connect() {
  if (port) return
  try {
    port = chrome.runtime.connectNative(HOST)
    port.onMessage.addListener(message => {
      connected = message.connected === true
      error = message.error || ''
    })
    port.onDisconnect.addListener(() => {
      error = chrome.runtime.lastError?.message || 'Conector local desconectado'
      port = null
      connected = false
    })
    port.postMessage({ kind: 'status' })
  } catch (cause) {
    error = String(cause)
  }
}

function sendLatest() {
  timer = null
  if (!latest) return
  connect()
  if (!port) return
  port.postMessage({ kind: 'activity', activity: latest })
  lastSent = Date.now()
}

function scheduleSend() {
  clearTimeout(timer)
  timer = setTimeout(sendLatest, Math.max(0, 4100 - (Date.now() - lastSent)))
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  ;(async () => {
    if (message.kind === 'status') {
      reply({ enabled: await isEnabled(), connected, error })
    } else if (message.kind === 'toggle') {
      await chrome.storage.local.set({ enabled: Boolean(message.enabled) })
      if (!message.enabled) {
        clearTimeout(timer)
        latest = null
        disconnect()
        error = ''
      } else {
        connect()
        chrome.tabs.query({ url: 'https://music.youtube.com/*' }, tabs => {
          for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { kind: 'refresh' }).catch(() => {})
        })
      }
      reply({ ok: true })
    } else if (message.kind === 'activity' && sender.tab?.url?.startsWith('https://music.youtube.com/')) {
      if (!(await isEnabled())) return reply({ ok: false })
      latestTab = sender.tab.id
      latest = message.activity
      if (latest) scheduleSend()
      else {
        clearTimeout(timer)
        if (port) port.postMessage({ kind: 'clear' })
      }
      reply({ ok: true })
    }
  })().catch(cause => reply({ error: String(cause) }))
  return true
})

chrome.tabs.onRemoved.addListener(tabId => {
  if (tabId === latestTab) {
    latest = null
    latestTab = null
    clearTimeout(timer)
    if (port) port.postMessage({ kind: 'clear' })
  }
})
