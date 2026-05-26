import type { APIRoute } from 'astro';
import { stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GALLERIES_DIR } from '../../lib/galleries.ts';

export const GET: APIRoute = async ({ params }) => {
  const path = params.path ?? '';
  const parts = path.split('/');

  if (parts.length !== 2) {
    return new Response('Not found', { status: 404 });
  }

  const [slug, filename] = parts;

  // Security: prevent path traversal, only allow .webp
  if (
    slug.includes('..') || slug.includes('/') ||
    filename.includes('..') || filename.includes('/') ||
    !filename.endsWith('.webp')
  ) {
    return new Response('Forbidden', { status: 403 });
  }

  const filePath = join(GALLERIES_DIR, slug, 'photos', filename);

  try {
    const info   = await stat(filePath);
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        'Content-Type':   'image/webp',
        'Content-Length': String(info.size),
        'Cache-Control':  'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
