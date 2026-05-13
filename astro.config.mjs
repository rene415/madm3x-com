import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://madm3x.com',
  integrations: [
    tailwind({ applyBaseStyles: false }),
  ],
});
