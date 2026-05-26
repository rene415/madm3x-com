import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: 'https://madm3x.com',
  integrations: [
    tailwind({ applyBaseStyles: false }),
  ],
});
