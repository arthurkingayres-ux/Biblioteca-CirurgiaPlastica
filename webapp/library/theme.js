// theme.js — Atlas/Atlas Noir theme init. MUST run in <head> before CSS.
(function () {
  const STORAGE_KEY = 'atlasTheme';
  const VALID = ['light', 'dark'];

  function systemPref() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function resolve() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(stored) ? stored : systemPref();
  }

  function apply(theme) {
    const t = VALID.includes(theme) ? theme : 'light';
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1A1713' : '#F4EFE4');
  }

  function toggle() {
    const next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
    window.dispatchEvent(new CustomEvent('atlas:themechange', { detail: next }));
  }

  apply(resolve());

  // React to system changes only if user hasn't chosen.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!localStorage.getItem(STORAGE_KEY)) apply(systemPref());
    });
  }

  window.AtlasTheme = { apply, toggle, get: () => document.documentElement.getAttribute('data-theme') };
})();
