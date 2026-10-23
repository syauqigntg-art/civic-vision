// Legacy config loaded explicitly through @config in app/globals.css.
// Tailwind v4 no longer supports the v3 corePlugins.preflight switch; preflight
// is omitted by importing only theme.css and utilities.css in the stylesheet.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
