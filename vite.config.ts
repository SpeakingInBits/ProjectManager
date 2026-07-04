import { defineConfig } from 'vite';

// Relative base so the build works when served from a subpath (e.g. GitHub
// Pages project sites at <user>.github.io/<repo>/), without hardcoding the
// repo name. Vite substitutes '/' for this automatically in dev.
export default defineConfig({
  base: './',
});
