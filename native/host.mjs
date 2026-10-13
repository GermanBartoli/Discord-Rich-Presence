import net from 'node:net'
import { randomUUID } from 'node:crypto'

const CLIENT_ID = '1559633203340513292'
const MAX_MESSAGE = 1024 * 1024
let input = Buffer.alloc(0)
let rpcInput = Buffer.alloc(0)
let socket = null
let ready = false
let latest = null

function reply(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(body.length)
  process.stdout.write(Buffer.concat([header, body]))
}

function frame(opcode, value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  const header = Buffer.alloc(8)
  header.writeUInt32LE(opcode, 0)
  header.writeUInt32LE(body.length, 4)
  socket.write(Buffer.concat([header, body]))
}

function setActivity(activity) {
  if (!ready || !socket) return
  frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity }, nonce: randomUUID() })
}

function handleRpc(chunk) {
  rpcInput = Buffer.concat([rpcInput, chunk])
  while (rpcInput.length >= 8) {
    const opcode = rpcInput.readUInt32LE(0)
    const size = rpcInput.readUInt32LE(4)
    if (size > MAX_MESSAGE) { socket.destroy(); return }
    if (rpcInput.length < size + 8) return
    const body = rpcInput.subarray(8, size + 8)
    rpcInput = rpcInput.subarray(size + 8)
    if (opcode === 3) {
      const pong = Buffer.alloc(8)
      pong.writeUInt32LE(4, 0)
      pong.writeUInt32LE(body.length, 4)
      socket.write(Buffer.concat([pong, body]))
      continue
    }
    if (opcode === 2) { socket.destroy(); return }
    try {
      const message = JSON.parse(body.toString('utf8'))
      if (message.evt === 'READY') {
        ready = true
        reply({ connected: true })
        if (latest) setActivity(latest)
      } else if (message.cmd === 'SET_ACTIVITY' && !message.evt) {
        reply({ connected: true })
      } else if (message.evt === 'ERROR') {
        reply({ connected: false, error: message.data?.message || 'Discord rechazó la actividad' })
      }
    } catch { reply({ connected: false, error: 'Respuesta inválida de Discord' }) }
  }
}

function connectToDiscord(index = 0) {
  if (index > 9) {
    reply({ connected: false, error: 'Abrí Discord de escritorio para mostrar la actividad' })
    return
  }
  const candidate = net.createConnection(`\\\\.\\pipe\\discord-ipc-${index}`)
  candidate.once('connect', () => {
    socket = candidate
    ready = false
    rpcInput = Buffer.alloc(0)
    candidate.on('data', handleRpc)
    candidate.on('close', () => { socket = null; ready = false; reply({ connected: false, error: 'Discord se desconectó' }) })
    frame(0, { v: 1, client_id: CLIENT_ID })
  })
  candidate.once('error', () => {
    if (socket !== candidate) connectToDiscord(index + 1)
  })
}

function handleMessage(message) {
  if (message.kind === 'status') {
    if (!socket) connectToDiscord()
    else reply({ connected: ready })
  } else if (message.kind === 'activity') {
    latest = message.activity
    if (!socket) connectToDiscord()
    else setActivity(latest)
  } else if (message.kind === 'clear') {
    latest = null
    setActivity(null)
  }
}

process.stdin.on('data', chunk => {
  input = Buffer.concat([input, chunk])
  while (input.length >= 4) {
    const size = input.readUInt32LE(0)
    if (size > MAX_MESSAGE) process.exit(1)
    if (input.length < size + 4) break
    const body = input.subarray(4, size + 4)
    input = input.subarray(size + 4)
    try { handleMessage(JSON.parse(body.toString('utf8'))) }
    catch { reply({ connected: false, error: 'Mensaje inválido de Chrome' }) }
  }
})
process.stdin.on('end', () => { if (ready) setActivity(null); process.exit(0) })
