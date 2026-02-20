#!/usr/bin/env node
/**
 * Génère le set favicon à partir de l'image source Supabase
 * Usage: node scripts/generate-favicon-from-url.mjs
 */
import sharp from 'sharp';
import toIco from 'to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_URL = 'https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/email-asset/favicon_rentanoo.png';
const GREEN = '#287a74';
const PADDING_PCT = 0.08; // 8% padding
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generateFavicons() {
  console.log('Downloading source image...');
  const buffer = await fetchImage(SOURCE_URL);
  const meta = await sharp(buffer).metadata();
  const { width, height } = meta;

  // Crop square from left (circle is typically left-aligned)
  const size = Math.min(width, height);
  const left = 0;
  const top = Math.max(0, (height - size) / 2);

  let circle = await sharp(buffer)
    .extract({ left: Math.round(left), top: Math.round(top), width: size, height: size })
    .toBuffer();

  const sizes = [
    [16, 'favicon-16x16.png'],
    [32, 'favicon-32x32.png'],
    [180, 'apple-touch-icon.png'],
    [192, 'android-chrome-192x192.png'],
    [512, 'android-chrome-512x512.png'],
  ];

  for (const [dim, filename] of sizes) {
    const pad = Math.round(dim * PADDING_PCT);
    const innerSize = dim - 2 * pad;
    const resized = await sharp(circle)
      .resize(innerSize, innerSize)
      .toBuffer();

    const output = await sharp({
      create: {
        width: dim,
        height: dim,
        channels: 4,
        background: { r: 0x28, g: 0x7a, b: 0x74, alpha: 1 },
      },
    })
      .composite([{ input: resized, left: pad, top: pad }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(PUBLIC_DIR, filename), output);
    console.log(`Created ${filename} (${dim}x${dim})`);
  }

  // favicon.ico
  const icon16 = await sharp(circle)
    .resize(16 - 2 * Math.round(16 * PADDING_PCT), 16 - 2 * Math.round(16 * PADDING_PCT))
    .toBuffer();
  const icon32 = await sharp(circle)
    .resize(32 - 2 * Math.round(32 * PADDING_PCT), 32 - 2 * Math.round(32 * PADDING_PCT))
    .toBuffer();

  const pad16 = Math.round(16 * PADDING_PCT);
  const pad32 = Math.round(32 * PADDING_PCT);

  const bg16 = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 0x28, g: 0x7a, b: 0x74, alpha: 1 } },
  })
    .composite([{ input: await sharp(icon16).resize(16 - 2 * pad16, 16 - 2 * pad16).toBuffer(), left: pad16, top: pad16 }])
    .png()
    .toBuffer();

  const bg32 = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 0x28, g: 0x7a, b: 0x74, alpha: 1 } },
  })
    .composite([{ input: await sharp(icon32).resize(32 - 2 * pad32, 32 - 2 * pad32).toBuffer(), left: pad32, top: pad32 }])
    .png()
    .toBuffer();

  const ico = await toIco([bg16, bg32]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), ico);
  console.log('Created favicon.ico (16x16, 32x32)');

  console.log('Done.');
}

generateFavicons().catch((e) => {
  console.error(e);
  process.exit(1);
});
