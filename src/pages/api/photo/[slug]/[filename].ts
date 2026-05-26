import type { APIRoute } from 'astro';
import { deletePhoto } from '../../../../lib/photos.ts';
import { getGallery } from '../../../../lib/galleries.ts';

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { slug, filename } = params;
  if (!slug || !filename) return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400 });
  if (!filename.endsWith('.webp')) return new Response(JSON.stringify({ error: 'Invalid file' }), { status: 400 });

  if (!await getGallery(slug)) return new Response(JSON.stringify({ error: 'Gallery not found' }), { status: 404 });

  await deletePhoto(slug, filename);
  return new Response(null, { status: 204 });
};
