import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Su GitHub Pages con repo del tipo username.github.io/nome-repo, i file statici
// sono serviti da un sottopercorso: imposta GITHUB_PAGES_BASE nel workflow di build
// (vedi .github/workflows/deploy.yml). In locale resta "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES_BASE || '/',
  server: {
    port: 5173,
  },
});
