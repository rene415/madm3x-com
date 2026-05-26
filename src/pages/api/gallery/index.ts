import type { APIRoute } from 'astro';
import { createGallery, galleryExists } from '../../../lib/galleries.ts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { title, slug } = await request.json();

  if (!title?.trim() || !slug?.trim()) {
    return new Response(JSON.stringify({ error: 'Title and slug are required' }), { status: 400 });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return new Response(
      JSON.stringify({ error: 'Slug must be lowercase letters, numbers, and hyphens (e.g. yosemite-2026)' }),
      { status: 400 }
    );
  }

  if (await galleryExists(slug)) {
    return new Response(JSON.stringify({ error: `Gallery "${slug}" already exists` }), { status: 409 });
  }

  const gallery = await createGallery(title.trim(), slug);
  return new Response(JSON.stringify(gallery), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
