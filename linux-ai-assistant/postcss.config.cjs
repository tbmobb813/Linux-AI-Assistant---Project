// Use whatever Tailwind PostCSS plugin is available. Tailwind v4 moved the
// PostCSS plugin into a separate package (@tailwindcss/postcss). During the
// rebase some environments may have v4 installed; attempt to load the new
// package first and fall back to the older `tailwindcss` plugin so tests and
// dev envs remain compatible.
const autoprefixer = require("autoprefixer");
let tailwindPlugin;
try {
  // Tailwind v4+ separate PostCSS plugin
  tailwindPlugin = require("@tailwindcss/postcss");
} catch (e) {
  // Fallback to older tailwindcss package
  tailwindPlugin = require("tailwindcss");
}

module.exports = {
  plugins: [tailwindPlugin(), autoprefixer()],
};
