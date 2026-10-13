const enabled = document.getElementById('enabled')
const status = document.getElementById('status')
const defaults = { privacyMode: false, showCover: true, showTimestamps: true,
  hidePaused: false, showBrowsing: true, showButtons: true, links: true }

async function refresh() {
  const state = await chrome.runtime.sendMessage({ kind: 'status' })
  enabled.checked = state.enabled
  status.textContent = !state.enabled ? 'Actividad desactivada' : state.error || (state.connected ? 'Conectado a Discord' : 'Esperando a Discord de escritorio')
}

enabled.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({ kind: 'toggle', enabled: enabled.checked })
  refresh()
})

refresh()

chrome.storage.local.get(defaults).then(settings => {
  for (const input of document.querySelectorAll('[data-setting]')) {
    input.checked = settings[input.dataset.setting]
    input.addEventListener('change', async () => {
      await chrome.storage.local.set({ [input.dataset.setting]: input.checked })
      chrome.runtime.sendMessage({ kind: 'refresh' })
    })
  }
})
