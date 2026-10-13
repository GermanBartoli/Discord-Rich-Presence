const enabled = document.getElementById('enabled')
const status = document.getElementById('status')

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
