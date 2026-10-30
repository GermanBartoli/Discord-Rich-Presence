import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import vm from 'node:vm'

const candidates = []
const timers = []
const delays = []
const input = new EventEmitter()
const source = readFileSync('native/host.mjs', 'utf8').replace(/^import .*\r?\n/gm, '')
vm.runInNewContext(source, {
  Buffer, randomUUID: () => 'prueba',
  process: { stdin: input, stdout: { write() {} }, pid: 1 },
  setTimeout(callback, delay) { delays.push(delay); timers.push(callback); return timers.length },
  net: { createConnection() {
    const socket = new EventEmitter()
    socket.frames = []
    socket.write = data => socket.frames.push(JSON.parse(data.subarray(8).toString()))
    socket.destroy = () => socket.emit('close')
    candidates.push(socket)
    return socket
  } }
})
function send(message) {
  const body = Buffer.from(JSON.stringify(message))
  const header = Buffer.alloc(4)
  header.writeUInt32LE(body.length)
  input.emit('data', Buffer.concat([header, body]))
}
function ready(socket) {
  socket.emit('connect')
  const body = Buffer.from(JSON.stringify({ evt: 'READY' }))
  const header = Buffer.alloc(8)
  header.writeUInt32LE(1)
  header.writeUInt32LE(body.length, 4)
  socket.emit('data', Buffer.concat([header, body]))
}
send({ kind: 'status' })
send({ kind: 'activity', activity: { details: 'Canción inicial' } })
assert.equal(candidates.length, 1, 'No debe abrir conexiones simultáneas')
for (let i = 0; i < 10; i++) candidates[i].emit('error', new Error('Discord cerrado'))
assert.equal(timers.length, 1)
send({ kind: 'activity', activity: { details: 'Última canción' } })
assert.equal(candidates.length, 10)
timers.shift()()
ready(candidates[10])
assert.equal(candidates[10].frames[1].args.activity.details, 'Última canción')
candidates[10].emit('close')
assert.equal(timers.length, 1)
timers.shift()()
ready(candidates[11])
assert.equal(candidates[11].frames[1].args.activity.details, 'Última canción')
candidates[11].emit('close')
send({ kind: 'clear' })
timers.shift()()
ready(candidates[12])
assert.equal(candidates[12].frames.length, 1, 'No debe restaurar una actividad limpiada')
console.log('OK: inicio tardío, reconexión, última actividad y limpieza')

// Agotar los intervalos y comprobar que cuatro horas se repiten.
candidates[12].emit('close')
const start = delays.length - 1
for (let attempt = 0; attempt < 14; attempt++) {
  const first = candidates.length
  send({ kind: 'status' })
  assert.equal(candidates.length, first)
  timers.shift()()
  for (let i = first; i < first + 10; i++) candidates[i].emit('error', new Error('Discord cerrado'))
  assert.equal(timers.length, 1)
}
assert.deepEqual(delays.slice(start), [1, 5, 5, 5, 5, 5, 5, 10, 20, 40, 60, 120, 240, 240, 240].map(m => m * 60_000))
timers.shift()()
ready(candidates.at(-1))
candidates.at(-1).emit('close')
assert.equal(delays.at(-1), 60_000, 'Conectarse debe reiniciar la espera a un minuto')
console.log('OK: intervalos incrementales, limite y reinicio tras conectar')
