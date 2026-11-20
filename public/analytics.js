// This site copies public/ directly; browsers cannot resolve npm package imports.
// Use Vercel's static-site script without adding a bundler or weakening the CSP.
window.va = window.va || function (...args) {
  (window.vaq = window.vaq || []).push(args);
};

const scriptSrc = '/_vercel/insights/script.js';
if (!document.head.querySelector(`script[src="${scriptSrc}"]`)) {
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.defer = true;
  document.head.appendChild(script);
}
