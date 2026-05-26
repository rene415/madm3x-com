import { readFile, writeFile, unlink, access } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';
import { GALLERIES_DIR, getMetadata, saveMetadata } from './galleries.ts';

const MAX_LONG_EDGE = 2400;
const QUALITY       = 82;
const EXIF_TAGS     = [
  'Make', 'Model', 'FNumber', 'ExposureTime', 'ISO',
  'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight',
];

function formatExposure(val: number) {
  if (val >= 1) return `${val}s`;
  return `1/${Math.round(1 / val)}s`;
}

function formatFStop(val: number) {
  return `f/${Number.isInteger(val) ? val : val.toFixed(1)}`;
}

async function pathExists(p: string) {
  return access(p).then(() => true).catch(() => false);
}

function uniqueWebpName(base: string, suffix?: number): string {
  return suffix ? `${base}-${suffix}.webp` : `${base}.webp`;
}

export async function processPhoto(
  gallerySlug: string,
  originalFilename: string,
  buffer: Buffer,
): Promise<string> {
  const photosDir = join(GALLERIES_DIR, gallerySlug, 'photos');

  // ── extract EXIF from the original bytes ─────────────────────────────────
  let meta = null;
  try {
    const raw = await exifr.parse(buffer, EXIF_TAGS);
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
  } catch { /* no EXIF */ }

  // ── build a unique .webp filename ─────────────────────────────────────────
  const base   = basename(originalFilename, extname(originalFilename));
  let webpName = uniqueWebpName(base);
  let suffix   = 1;
  while (await pathExists(join(photosDir, webpName))) {
    webpName = uniqueWebpName(base, suffix++);
  }

  // ── convert ───────────────────────────────────────────────────────────────
  await sharp(buffer)
    .rotate()                                                   // auto-orient from EXIF
    .resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })
    .toFile(join(photosDir, webpName));

  // ── update metadata sidecar ───────────────────────────────────────────────
  const sidecar = await getMetadata(gallerySlug);
  sidecar[webpName] = meta;
  await saveMetadata(gallerySlug, sidecar);

  return webpName;
}

export async function deletePhoto(gallerySlug: string, filename: string): Promise<void> {
  const filepath = join(GALLERIES_DIR, gallerySlug, 'photos', filename);
  await unlink(filepath).catch(() => {});

  const sidecar = await getMetadata(gallerySlug);
  delete sidecar[filename];
  await saveMetadata(gallerySlug, sidecar);
}
