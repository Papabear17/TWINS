function getQueryString(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function resolveRelativeUrl(base, value) {
  if (!value || value.startsWith('http') || value.startsWith('/') || value.startsWith('data:') || value.startsWith('#')) {
    return value;
  }
  if (value.startsWith('./')) {
    value = value.slice(2);
  }
  return base + value;
}

function rewriteAttributes(doc, base) {
  const attrs = ['src', 'href', 'srcset'];
  doc.querySelectorAll('*').forEach((el) => {
    attrs.forEach((attr) => {
      if (!el.hasAttribute(attr)) return;
      const value = el.getAttribute(attr);
      if (!value) return;
      if (attr === 'srcset') {
        const rewritten = value.split(',').map((part) => {
          const trimmed = part.trim();
          const [url, descriptor] = trimmed.split(/\s+/, 2);
          return resolveRelativeUrl(base, url) + (descriptor ? ' ' + descriptor : '');
        }).join(', ');
        el.setAttribute(attr, rewritten);
      } else {
        el.setAttribute(attr, resolveRelativeUrl(base, value));
      }
    });
  });
}

(async function () {
  const fragment = getQueryString('fragment');
  const name = fragment || 'tidak ada fragment';
  const target = document.getElementById('pageFragments') || document.getElementById('sectionsMount');
  document.getElementById('fragmentName').textContent = name;
  if (!fragment) {
    target.innerHTML = '<div class="preview-error">Query parameter <strong>fragment</strong> tidak ditemukan.</div>';
    return;
  }
  try {
    const response = await fetch(fragment);
    if (!response.ok) {
      throw new Error('Gagal memuat fragment: ' + response.status);
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const fragmentDir = fragment.substring(0, fragment.lastIndexOf('/') + 1);
    rewriteAttributes(doc, fragmentDir);
    target.innerHTML = '';
    Array.from(doc.body.childNodes).forEach((node) => target.appendChild(document.importNode(node, true)));
  } catch (error) {
    target.innerHTML = '<div class="preview-error">' + error.message + '</div>';
  }
})();
