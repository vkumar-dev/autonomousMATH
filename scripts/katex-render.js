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

  function renderMath(root) {
    if (typeof renderMathInElement !== 'function') {
      return;
    }
    try {
      renderMathInElement(root || document.body, options);
    } catch (error) {
      console.warn('[KaTeX]', error);
    }
  }

  window.renderMath = renderMath;

  document.addEventListener('DOMContentLoaded', () => {
    renderMath(document.body);
  });
})();
