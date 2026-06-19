/**
 * Inject PWA / iOS "Add to Home Screen" metadata into <head> at runtime.
 *
 * Expo's `web.output: "single"` serves a fixed default index.html and does NOT
 * run `app/+html.tsx`, so we can't ship these tags statically. iOS Safari reads
 * the live DOM when you tap Share → Add to Home Screen, and Chrome re-reads the
 * manifest link, so injecting on load is enough to make the app installable and
 * launch standalone (no browser chrome), with an icon and themed status bar.
 */
function setMeta(name: string, content: string, media?: string) {
  const selector = `meta[name="${name}"]${media ? `[media="${media}"]` : ''}`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    if (media) el.setAttribute('media', media);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

if (typeof document !== 'undefined') {
  // Fit the notch and stop the zoom-jump when a TextField is focused on iOS.
  setMeta(
    'viewport',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  );
  setMeta('apple-mobile-web-app-capable', 'yes');
  setMeta('mobile-web-app-capable', 'yes');
  setMeta('apple-mobile-web-app-status-bar-style', 'default');
  setMeta('apple-mobile-web-app-title', 'oeoeoe');
  setMeta('theme-color', '#ffffff', '(prefers-color-scheme: light)');
  setMeta('theme-color', '#000000', '(prefers-color-scheme: dark)');
  setLink('apple-touch-icon', '/icons/apple-touch-icon.png');
  setLink('manifest', '/manifest.json');

  if (!document.getElementById('pwa-style')) {
    const style = document.createElement('style');
    style.id = 'pwa-style';
    // Match the page background per scheme (no white flash / themed safe-area gutters).
    style.textContent =
      ':root{color-scheme:light dark}body{overscroll-behavior-y:none}' +
      '@media(prefers-color-scheme:dark){body{background:#000}}' +
      '@media(prefers-color-scheme:light){body{background:#fff}}';
    document.head.appendChild(style);
  }
}

export {};
