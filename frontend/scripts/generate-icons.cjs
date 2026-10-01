const sharp = require('sharp');
const path = require('path');

const BG = '#0a0a0d';
const SRC = path.join(__dirname, '..', 'public', 'logo.png');
const OUT = (name) => path.join(__dirname, '..', 'public', name);

async function makeIcon(size, outName, paddingRatio) {
  const logoWidth = Math.round(size * (1 - paddingRatio * 2));
  const logo = await sharp(SRC)
    .resize({ width: logoWidth, fit: 'inside' })
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: logo,
        left: Math.round((size - logoMeta.width) / 2),
        top: Math.round((size - logoMeta.height) / 2),
      },
    ])
    .png()
    .toFile(OUT(outName));
  console.log('wrote', outName);
}

async function main() {
  await makeIcon(192, 'icon-192.png', 0.14);
  await makeIcon(512, 'icon-512.png', 0.14);
  await makeIcon(512, 'icon-512-maskable.png', 0.22);
  await makeIcon(180, 'apple-touch-icon.png', 0.14);
}

main();
