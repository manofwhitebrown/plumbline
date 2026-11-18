// Vite config. base './' makes the build work on GitHub Pages and inside the APK.
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Short git hash, or "dev" if git is not available.
function gitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const date = new Date().toISOString().slice(0, 10);
// Shown in Settings so the owner can see which build is on the laptop.
const build = `Plumbline v${pkg.version} · build ${gitHash()} · ${date}`;

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 800 },
  server: { host: true, port: 5173 }
});
