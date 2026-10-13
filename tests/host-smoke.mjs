import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const exe = resolve('native/launcher/publish/Launcher.exe')
const child = spawn(exe, { stdio: ['pipe', 'pipe', 'pipe'] })
function send(message) {
  const body = Buffer.from(JSON.stringify(message))
  const header = Buffer.alloc(4)
  header.writeUInt32LE(body.length)
  child.stdin.write(Buffer.concat([header, body]))
}
send({ kind: 'status' })

const timeout = setTimeout(() => { child.kill(); process.exitCode = 1 }, 5000)
let pending = Buffer.alloc(0)
let responses = 0
child.stdout.on('data', chunk => {
  pending = Buffer.concat([pending, chunk])
  while (pending.length >= 4) {
    const size = pending.readUInt32LE(0)
    if (pending.length < size + 4) return
    const result = JSON.parse(pending.subarray(4, size + 4).toString('utf8'))
    pending = pending.subarray(size + 4)
    if (!result.connected) { console.error(result.error); process.exitCode = 1; clearTimeout(timeout); child.stdin.end(); return }
    responses++
    if (responses === 1) {
      send({ kind: 'activity', activity: { type: 2, details: 'Prueba local', state: 'YouTube Music',
        assets: { large_image: 'https://cdn.rcd.gg/PreMiD/websites/Y/YouTube%20Music/assets/logo.png' },
        buttons: [{ label: 'Abrir YouTube Music', url: 'https://music.youtube.com/' }],
        details_url: 'https://music.youtube.com/' } })
    } else if (responses === 2) {
      console.log('Discord aceptó SET_ACTIVITY')
      send({ kind: 'clear' })
    } else {
      console.log('Discord aceptó la limpieza')
      clearTimeout(timeout)
      child.stdin.end()
    }
  }
})
child.on('error', error => { console.error(error.message); clearTimeout(timeout); process.exitCode = 1 })
