// import
const chalk = require('chalk')
const fs = require('fs')
const hsl2rgb = require('pure-color/convert/hsl2rgb')

// config
const WIDTH = Math.floor(process.stdout.columns / 2)
const FILE = process.argv[2]
const CHUNK_SIZE = 1024

// create lookup table
const colorHexTable = (() => {
	const result = []
	for (let i = 0; i < 256; i++) {
		const rgb = hsl2rgb([i / 256 * 360, 100, 50]).map(i => Math.floor(i))
		let string
		if (i >= 32 && i <= 126) string = String.fromCharCode(i) + ' '
		else string = ((i >> 4).toString(16) + (i & 0xf).toString(16)).toUpperCase()
		result.push(chalk.black.bgRgb(...rgb)(string))
	}
	return result
})()

// helper
const print = (buffer, offset) => {
	const toPrint = []
	for (let i = 0; i < buffer.length; i++)
		toPrint[i] =
			colorHexTable[buffer[i]] +
			((i + offset) % WIDTH === WIDTH - 1 ? '\n' : '')
	process.stdout.write(toPrint.join(''))
}

// read as chunks
const readChunk = (descriptor, buffer, start, length) =>
	new Promise((resolve, reject) => {
		fs.read(descriptor, buffer, 0, length, start, (error, data) => {
			if (error) return reject(error)
			resolve()
		})
	})

// go!
fs.stat(FILE, (error, stat) => {
	const chunks = Math.ceil(stat.size / CHUNK_SIZE)
	fs.open(FILE, 'r', async (error, descriptor) => {
		const buffer = Buffer.alloc(CHUNK_SIZE)
		for (let i = 0; i < chunks; i++) {
			if ((i + 1) * CHUNK_SIZE <= stat.size) {
				await readChunk(descriptor, buffer, i * CHUNK_SIZE, CHUNK_SIZE)
				print(buffer, i * CHUNK_SIZE)
			} else {
				const buffer = Buffer.alloc(stat.size - i * CHUNK_SIZE)
				await readChunk(
					descriptor,
					buffer,
					i * CHUNK_SIZE,
					stat.size - i * CHUNK_SIZE
				)
				print(buffer, i * CHUNK_SIZE)
			}
		}
	})
})
