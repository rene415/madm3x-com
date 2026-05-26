import { readdir, readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';

export const DATA_DIR      = process.env.DATA_DIR ?? join(process.cwd(), 'data');
export const GALLERIES_DIR = join(DATA_DIR, 'galleries');

export interface GalleryMeta {
  slug:      string;
  title:     string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoMeta {
  dimensions: string | null;
  model:      string | null;
  fstop:      string | null;
  exposure:   string | null;
  iso:        string | null;
}

async function pathExists(p: string) {
  return access(p).then(() => true).catch(() => false);
}

// ── ensure directories exist on first call ────────────────────────────────────
async function ensureGalleriesDir() {
  await mkdir(GALLERIES_DIR, { recursive: true });
}

// ── gallery CRUD ──────────────────────────────────────────────────────────────
export async function listGalleries(): Promise<GalleryMeta[]> {
  await ensureGalleriesDir();
  const entries = await readdir(GALLERIES_DIR, { withFileTypes: true });
  const galleries = await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(async e => {
        try {
          const raw = await readFile(join(GALLERIES_DIR, e.name, 'gallery.json'), 'utf8');
          return JSON.parse(raw) as GalleryMeta;
        } catch { return null; }
      })
  );
  return (galleries.filter(Boolean) as GalleryMeta[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getGallery(slug: string): Promise<GalleryMeta | null> {
  try {
    const raw = await readFile(join(GALLERIES_DIR, slug, 'gallery.json'), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

export async function galleryExists(slug: string): Promise<boolean> {
  return pathExists(join(GALLERIES_DIR, slug, 'gallery.json'));
}

export async function createGallery(title: string, slug: string): Promise<GalleryMeta> {
  await ensureGalleriesDir();
  const dir = join(GALLERIES_DIR, slug);
  await mkdir(join(dir, 'photos'), { recursive: true });
  const meta: GalleryMeta = {
    slug, title, published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(dir, 'gallery.json'), JSON.stringify(meta, null, 2));
  await writeFile(join(dir, 'metadata.json'), '{}');
  return meta;
}

export async function updateGallery(
  slug: string,
  updates: Partial<Pick<GalleryMeta, 'title' | 'published'>>
): Promise<GalleryMeta | null> {
  const current = await getGallery(slug);
  if (!current) return null;
  const updated: GalleryMeta = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(join(GALLERIES_DIR, slug, 'gallery.json'), JSON.stringify(updated, null, 2));
  return updated;
}

export async function deleteGallery(slug: string): Promise<void> {
  await rm(join(GALLERIES_DIR, slug), { recursive: true, force: true });
}

// ── photos ────────────────────────────────────────────────────────────────────
export async function listPhotos(slug: string): Promise<string[]> {
  const dir = join(GALLERIES_DIR, slug, 'photos');
  if (!await pathExists(dir)) return [];
  const files = await readdir(dir);
  return files.filter(f => f.endsWith('.webp')).sort();
}

export async function getMetadata(slug: string): Promise<Record<string, PhotoMeta>> {
  try {
    const raw = await readFile(join(GALLERIES_DIR, slug, 'metadata.json'), 'utf8');
    return JSON.parse(raw);
  } catch { return {}; }
}

export async function saveMetadata(slug: string, data: Record<string, PhotoMeta>): Promise<void> {
  await writeFile(join(GALLERIES_DIR, slug, 'metadata.json'), JSON.stringify(data, null, 2));
}

// ── photo URL helper ──────────────────────────────────────────────────────────
export function photoUrl(slug: string, filename: string): string {
  return `/photos/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`;
}

// ── random sample from all published galleries (for homepage) ─────────────────
export interface HomePhoto {
  src:          string;
  meta:         PhotoMeta | null;
  gallerySlug:  string;
  galleryTitle: string;
}

export async function randomHomePhotos(maxTotal = 100): Promise<HomePhoto[]> {
  const galleries = await listGalleries();
  const published = galleries.filter(g => g.published);
  if (published.length === 0) return [];

  // Distribute slots evenly across galleries, at least 1 per gallery
  const perGallery = Math.max(1, Math.ceil(maxTotal / published.length));

  const result: HomePhoto[] = [];

  for (const gallery of published) {
    const photos   = await listPhotos(gallery.slug);
    const metadata = await getMetadata(gallery.slug);
    // Shuffle and take up to perGallery photos from this gallery
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    for (const filename of shuffled.slice(0, perGallery)) {
      result.push({
        src:          photoUrl(gallery.slug, filename),
        meta:         metadata[filename] ?? null,
        gallerySlug:  gallery.slug,
        galleryTitle: gallery.title,
      });
    }
  }

  // Interleave galleries, then cap at maxTotal (use all if fewer available)
  return result
    .sort(() => Math.random() - 0.5)
    .slice(0, maxTotal);
}
