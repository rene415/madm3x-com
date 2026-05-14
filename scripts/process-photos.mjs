/**
 * process-photos.mjs
 * Run inside a Docker container (see README or Makefile).
 * 1. Reads EXIF from every source image → saves metadata.json sidecar
 * 2. Auto-orients, resizes to MAX_LONG_EDGE, converts to WebP
 * 3. Deletes originals
 */

import { readdir, writeFile, unlink, access } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';

const PHOTOS_DIR  = '/photos';
const MAX_LONG_EDGE = 2400;
const QUALITY       = 82;

const EXIF_TAGS = [
  'Make', 'Model', 'FNumber', 'ExposureTime', 'ISO',
  'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight',
];

function formatExposure(val) {
  if (val >= 1) return `${val}s`;
  return `1/${Math.round(1 / val)}s`;
}

function formatFStop(val) {
  return `f/${Number.isInteger(val) ? val : val.toFixed(1)}`;
}

async function exists(p) {
  return access(p).then(() => true).catch(() => false);
}

// ── discover images ───────────────────────────────────────────────────────────
const all   = await readdir(PHOTOS_DIR);
const images = all
  .filter(f => /\.(jpe?g|png|tiff?|heic)$/i.test(f))
  .sort();

console.log(`\nFound ${images.length} source image(s) in ${PHOTOS_DIR}\n`);

const metadata = {};
let converted = 0, skipped = 0, failed = 0;

for (const file of images) {
  const src     = join(PHOTOS_DIR, file);
  const webpName = basename(file, extname(file)) + '.webp';
  const webpPath = join(PHOTOS_DIR, webpName);

  process.stdout.write(`${file}  →  ${webpName} … `);

  // ── step 1: extract EXIF before touching the file ─────────────────────────
  let meta = null;
  try {
    const raw = await exifr.parse(src, EXIF_TAGS);
    if (raw) {
      const w = raw.ExifImageWidth ?? raw.ImageWidth ?? null;
      const h = raw.ExifImageHeight ?? raw.ImageHeight ?? null;
      meta = {
        dimensions: w && h ? `${w} × ${h}` : null,
        model:      [raw.Make, raw.Model].filter(Boolean).join(' ') || null,
        fstop:      raw.FNumber      != null ? formatFStop(raw.FNumber)         : null,
        exposure:   raw.ExposureTime != null ? formatExposure(raw.ExposureTime) : null,
        iso:        raw.ISO          != null ? String(raw.ISO)                  : null,
      };
    }
  } catch { /* no EXIF embedded */ }

  // ── step 2: convert (skip if WebP already exists) ─────────────────────────
  if (await exists(webpPath)) {
    process.stdout.write('already converted, cleaning up original\n');
    await unlink(src).catch(() => {});
    metadata[webpName] = meta;
    skipped++;
    continue;
  }

  try {
    await sharp(src)
      .rotate()                                                       // auto-orient
      .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    await unlink(src);
    metadata[webpName] = meta;
    converted++;
    process.stdout.write('✓\n');
  } catch (err) {
    process.stdout.write(`✗  ${err.message}\n`);
    failed++;
  }
}

// ── step 3: write sidecar ─────────────────────────────────────────────────────
await writeFile(
  join(PHOTOS_DIR, 'metadata.json'),
  JSON.stringify(metadata, null, 2),
);

console.log(`
────────────────────────────────────
  Converted : ${converted}
  Skipped   : ${skipped}  (already WebP)
  Failed    : ${failed}
  Sidecar   : metadata.json  (${Object.keys(metadata).length} entries)
────────────────────────────────────
`);

if (failed > 0) process.exit(1);
