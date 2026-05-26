import type { APIRoute } from 'astro';
import { updateGallery, deleteGallery, getGallery } from '../../../lib/galleries.ts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { slug } = params;
  if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });

  const updates = await request.json();
  const gallery = await updateGallery(slug, updates);
  if (!gallery) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  return new Response(JSON.stringify(gallery), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { slug } = params;
  if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });

  if (!await getGallery(slug)) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  await deleteGallery(slug);
  return new Response(null, { status: 204 });
};
