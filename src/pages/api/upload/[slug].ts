import type { APIRoute } from 'astro';
import { getGallery } from '../../../lib/galleries.ts';
import { processPhoto } from '../../../lib/photos.ts';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png',
  'image/heic', 'image/heif',
  'image/tiff', 'image/webp',
]);

export const POST: APIRoute = async ({ params, request, locals }) => {
  // Must be authenticated
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
  }

  const gallery = await getGallery(slug);
  if (!gallery) {
    return new Response(JSON.stringify({ error: 'Gallery not found' }), { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || typeof file === 'string') {
    return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
  }

  // Validate file type by MIME (browsers set this from extension)
  const mime = file.type.toLowerCase();
  if (!ALLOWED_TYPES.has(mime) && !mime.startsWith('image/')) {
    return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}` }), { status: 415 });
  }

  try {
    const buffer   = Buffer.from(await file.arrayBuffer());
    const filename = await processPhoto(slug, file.name, buffer);
    return new Response(JSON.stringify({ filename, src: `/photos/${slug}/${filename}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(`Upload error for ${slug}/${file.name}:`, err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Conversion failed' }), { status: 500 });
  }
};
