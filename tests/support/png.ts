import { deflateSync } from 'node:zlib'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let value = n
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/**
 * - `transparent`: a gold block in the middle of a clear background (a well-made logo)
 * - `opaque`: every pixel filled, so there is no transparency
 * - `edge`: transparent background, but the artwork runs into the image border
 */
export type PngStyle = 'transparent' | 'opaque' | 'edge'

/** A valid RGBA PNG made without any dependency, so tests control exact pixel sizes and transparency. */
export function makePng(width: number, height: number, style: PngStyle = 'transparent'): Buffer {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inBlock = x > width * 0.2 && x < width * 0.8 && y > height * 0.3 && y < height * 0.7
      const painted = style === 'opaque' || (style === 'edge' ? x < width * 0.5 : inBlock)
      const offset = y * stride + 1 + x * 4
      if (!painted) continue
      raw[offset] = 0xd8
      raw[offset + 1] = 0xb0
      raw[offset + 2] = 0x6a
      raw[offset + 3] = 0xff
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
