/**
 * Generate app icon from the rocking chair SVG logo.
 * Produces resources/icon.ico (multi-size) and resources/icon.png (256x256).
 *
 * Usage: node scripts/generate-icon.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'resources')

// App icon SVG: rocking chair on dark rounded-rect background with amber stroke
const SVG = `
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0f0f17"/>
    </linearGradient>
    <linearGradient id="chair" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="256" height="256" rx="48" ry="48" fill="url(#bg)"/>

  <!-- Rocking chair (centered, scaled up from 64x64 viewBox) -->
  <g transform="translate(128,118) rotate(-12) scale(3.2) translate(-30,-26)">
    <!-- Back rest -->
    <path d="M20 10 C20 7, 22 5, 26 4 L34 4 C38 5, 40 7, 40 10 L40 30 L20 30 Z"
      stroke="url(#chair)" stroke-width="2" stroke-linejoin="round" fill="none"/>
    <!-- Back rest slats -->
    <line x1="24" y1="9" x2="24" y2="28" stroke="url(#chair)" stroke-width="1.2"/>
    <line x1="30" y1="7" x2="30" y2="28" stroke="url(#chair)" stroke-width="1.2"/>
    <line x1="36" y1="9" x2="36" y2="28" stroke="url(#chair)" stroke-width="1.2"/>

    <!-- Seat -->
    <path d="M14 30 L46 30 L48 34 L12 34 Z"
      stroke="url(#chair)" stroke-width="2" stroke-linejoin="round" fill="none"/>

    <!-- Left armrest -->
    <path d="M20 14 C16 14, 13 16, 13 20 L13 30"
      stroke="url(#chair)" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M13 20 L13 18 C13 15, 16 13, 20 13"
      stroke="url(#chair)" stroke-width="1.5" stroke-linecap="round" fill="none"/>

    <!-- Right armrest -->
    <path d="M40 14 C44 14, 47 16, 47 20 L47 30"
      stroke="url(#chair)" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M47 20 L47 18 C47 15, 44 13, 40 13"
      stroke="url(#chair)" stroke-width="1.5" stroke-linecap="round" fill="none"/>

    <!-- Legs -->
    <line x1="15" y1="34" x2="12" y2="46" stroke="url(#chair)" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="45" y1="34" x2="48" y2="46" stroke="url(#chair)" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="20" y1="34" x2="17" y2="46" stroke="url(#chair)" stroke-width="2" stroke-linecap="round"/>
    <line x1="40" y1="34" x2="43" y2="46" stroke="url(#chair)" stroke-width="2" stroke-linecap="round"/>

    <!-- Rocker -->
    <path d="M6 50 Q16 42, 30 42 Q44 42, 58 50"
      stroke="url(#chair)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M7 52 Q17 44.5, 30 44.5 Q43 44.5, 57 52"
      stroke="url(#chair)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </g>
</svg>
`

// ICO file format builder (multi-size)
function buildIco(pngBuffers) {
  // ICO header: 2 reserved + 2 type (1=ico) + 2 count
  const count = pngBuffers.length
  const headerSize = 6 + count * 16 // ICONDIR + ICONDIRENTRYs
  let offset = headerSize

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)      // reserved
  header.writeUInt16LE(1, 2)      // type: ICO
  header.writeUInt16LE(count, 4)  // image count

  for (let i = 0; i < count; i++) {
    const { width, buf } = pngBuffers[i]
    const entryOffset = 6 + i * 16
    header.writeUInt8(width >= 256 ? 0 : width, entryOffset)      // width (0 = 256)
    header.writeUInt8(width >= 256 ? 0 : width, entryOffset + 1)  // height
    header.writeUInt8(0, entryOffset + 2)   // color palette
    header.writeUInt8(0, entryOffset + 3)   // reserved
    header.writeUInt16LE(1, entryOffset + 4)  // color planes
    header.writeUInt16LE(32, entryOffset + 6) // bits per pixel
    header.writeUInt32LE(buf.length, entryOffset + 8)  // image size
    header.writeUInt32LE(offset, entryOffset + 12)     // image offset
    offset += buf.length
  }

  return Buffer.concat([header, ...pngBuffers.map(p => p.buf)])
}

async function main() {
  const svgBuffer = Buffer.from(SVG)

  // Generate multiple sizes for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const pngBuffers = []

  for (const size of sizes) {
    const buf = await sharp(svgBuffer, { density: 300 })
      .resize(size, size)
      .png()
      .toBuffer()
    pngBuffers.push({ width: size, buf })
  }

  // Save 256x256 PNG
  const png256 = pngBuffers.find(p => p.width === 256)
  writeFileSync(join(outDir, 'icon.png'), png256.buf)
  console.log('Created resources/icon.png (256x256)')

  // Build and save ICO
  const ico = buildIco(pngBuffers)
  writeFileSync(join(outDir, 'icon.ico'), ico)
  console.log(`Created resources/icon.ico (${sizes.join(', ')}px)`)
}

main().catch(console.error)
