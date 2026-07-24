const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const svgPath = path.join(__dirname, '../public/icons/icon.svg')
const outputDir = path.join(__dirname, '../public/icons')

// Pastikan folder icons ada
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Cek SVG exists
if (!fs.existsSync(svgPath)) {
  console.error(`❌ SVG source not found: ${svgPath}`)
  console.error('   Buat dulu file public/icons/icon.svg')
  process.exit(1)
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generate() {
  console.log('🎨 Generating PWA icons dari icon.svg...\n')

  // Generate berbagai ukuran icon
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`)
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    console.log(`  ✓ icon-${size}.png (${size}x${size})`)
  }

  // Apple touch icon (180x180)
  await sharp(svgPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'))
  console.log('  ✓ apple-touch-icon.png (180x180)')

  // Favicon (32x32 dan 16x16)
  await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon-32.png'))
  console.log('  ✓ favicon-32.png (32x32)')

  await sharp(svgPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(outputDir, 'favicon-16.png'))
  console.log('  ✓ favicon-16.png (16x16)')

  console.log('\n✅ Semua icons berhasil dibuat di public/icons/')
  console.log('   Total files: ' + (sizes.length + 3))
}

generate().catch((err) => {
  console.error('❌ Error generating icons:', err)
  process.exit(1)
})