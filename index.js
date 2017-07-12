// import
const chalk = require('chalk')
const fs = require('fs')
const hsl2rgb = require('pure-color/convert/hsl2rgb')

// config
const CHUNK_SIZE = 2 ** 16
const FILE = process.argv[2]
const WIDTH = Math.floor((process.stdout.columns - 9) / 2)

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

/**
 * @description prints the offset as hexadecimal with fixed length
 * @param {Integer} offset address to print
 */
const address = address =>
	[
		(address & 0xf0000000) >> 28,
		(address & 0x0f000000) >> 24,
		(address & 0x00f00000) >> 20,
		(address & 0x000f0000) >> 16,
		(address & 0x0000f000) >> 12,
		(address & 0x00000f00) >> 8,
		(address & 0x000000f0) >> 4,
		(address & 0x0000000f) >> 0
	]
		.map(i => i.toString(16))
		.join('')
		.toUpperCase()

/**
 * @description prints a chunk
 * @param {Buffer} buffer buffer to print
 * @param {Integer} offset buffer offset compared to file
 */
const printChunk = (buffer, offset) => {
	const toPrint = []
	for (let i = 0; i < buffer.length; i++) {
		const position = offset + i
		const mod = position % WIDTH
		const isFirst = mod === 0
		const isLast = mod === WIDTH - 1

		if (isFirst) toPrint.push(address(position) + ' ')

		toPrint.push(colorHexTable[buffer[i]])

		if (isLast) toPrint.push('\n')
	}
	process.stdout.write(toPrint.join(''))
}

/**
 * @description reads a chunk of data from a file descriptor
 * @param {Integer} descriptor file descriptor
 * @param {Buffer} buffer buffer to store result in
 * @param {Integer} start start offset on file descriptor
 * @param {Integer} length chunk length
 */
const readChunk = (descriptor, buffer, start, length) =>
	new Promise((resolve, reject) => {
		fs.read(descriptor, buffer, 0, length, start, (error, data) => {
			if (error) return reject(error)
			resolve()
		})
	})

// go!
fs.stat(FILE, (error, { size }) => {
	const totalChunks = Math.ceil(size / CHUNK_SIZE)

	// open file
	fs.open(FILE, 'r', async (error, descriptor) => {
		// HACK: don't allocate first buffer outside of loop
		let buffer = {}

		for (let i = 0; i < totalChunks; i++) {
			const offset = i * CHUNK_SIZE

			// determine length to read
			const length = Math.min(CHUNK_SIZE, size - offset)

			// resize buffer if necessary
			if (length !== buffer.length) buffer = Buffer.alloc(length)

			// read & print
			await readChunk(descriptor, buffer, offset, length)
			printChunk(buffer, offset)
		}
		process.stdout.write('\n')
	})
})
