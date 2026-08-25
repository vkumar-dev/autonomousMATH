/**
 * Render TeX in article bodies after they land in the DOM.
 */
(function () {
  const options = {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false }
    ],
    throwOnError: false,
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  };

  let attempts = 0;

  function renderMath(root) {
    const target = root || document.body;
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(target, options);
      } catch (error) {
        console.warn('[KaTeX]', error);
      }
    } else if (attempts < 20) {
      attempts += 1;
      setTimeout(() => renderMath(target), 150);
    }
  }

  window.renderMath = renderMath;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderMath(document.body);
    });
  } else {
    renderMath(document.body);
  }
})();
