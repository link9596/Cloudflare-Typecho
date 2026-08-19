import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import themeLoader from './src/integrations/theme-loader.ts';
import pluginLoader from './src/integrations/plugin-loader.ts';
import clientLoader from './src/integrations/client-loader.ts';
import { sharedAliases } from './vite.shared.mjs';

const isBuild = process.argv.includes('build');

export default defineConfig({
  session: false,
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    inspectorPort: isBuild ? false : undefined,
  }),
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        "script-src 'self' https://static.cloudflareinsights.com",
        "style-src 'self' 'unsafe-inline'",
        "media-src 'self' https://files.atlinker.cn",
        "img-src 'self' data: blob:",
        "connect-src 'self' https://static.cloudflareinsights.com",
        "font-src 'self' data:",
      ],
    },
  },
  integrations: [themeLoader(), pluginLoader(), clientLoader()],
  vite: {
    resolve: {
      alias: sharedAliases,
    },
  },
})