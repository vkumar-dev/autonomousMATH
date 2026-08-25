/**
 * Article Feed - Reel style vertical snap feed for full posts
 */

class ArticleFeed {
  constructor() {
    this.articlesPerPage = 4;
    this.currentPage = 0;
    this.allArticles = [];
    this.contentCache = {};
    this.isLoading = false;
    this.observer = null;
    this.setupIndexCircle();
  }

  setupIntersectionObserver() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.isLoading) {
          this.loadMoreArticles();
        }
      },
      {
        root: document.getElementById('articles-grid'),
        threshold: 0.4
      }
    );

    this.observer.observe(sentinel);
  }

  async loadContentCache() {
    if (Object.keys(this.contentCache).length > 0) {
      return;
    }

    const response = await fetch('articles-content.json');
    if (!response.ok) {
      throw new Error('Failed to load content cache');
    }

    this.contentCache = await response.json();
  }

  async initializeWithArticles(articles, initialContentCache = {}) {
    this.allArticles = articles;
    this.currentPage = 0;
    this.contentCache = initialContentCache;

    await this.loadContentCache();

    const feedContainer = document.getElementById('articles-grid');
    if (!feedContainer) return;

    feedContainer.innerHTML = '<div id="scroll-sentinel"></div>';
    this.setupIntersectionObserver();
    this.loadMoreArticles();
  }

  async loadMoreArticles() {
    if (this.isLoading) return;

    this.isLoading = true;

    const startIndex = this.currentPage * this.articlesPerPage;
    const endIndex = startIndex + this.articlesPerPage;
    const newArticles = this.allArticles.slice(startIndex, endIndex);

    if (newArticles.length === 0) {
      this.isLoading = false;
      return;
    }

    const feedContainer = document.getElementById('articles-grid');
    const sentinel = document.getElementById('scroll-sentinel');

    if (feedContainer && sentinel) {
      const newHTML = newArticles
        .map((article, index) => this.createArticlePage(article, startIndex + index === 0))
        .join('');
      sentinel.insertAdjacentHTML('beforebegin', newHTML);
    }

    this.currentPage += 1;
    this.isLoading = false;
  }

  createArticlePage(article, isLatest) {
    const rawContent = this.contentCache[article.path] || '';
    
    // Clean code fences
    let cleaned = rawContent
      .replace(/^\s*```(?:markdown|html)?\s*\n/i, '')
      .replace(/^\s*```\s*\n/i, '')
      .replace(/\n\s*```\s*$/i, '');
     
    // Robust pattern for HTML with Frontmatter
    const frontmatterMatch = cleaned.match(/^(?:<!--\s*\n)?---\n([\s\S]*?)\n---(?:\n\s*-->)?/);
    
    const contentOnly = frontmatterMatch ? cleaned.slice(frontmatterMatch[0].length).trim() : cleaned;
    const htmlContent = this.convertToHtml(contentOnly);

    const timeInfo = window.TimeFormatter
      ? window.TimeFormatter.getFullTimeInfo(article.date)
      : {
          dateTime: this.formatDate(article.date),
          relativeTime: 'recently'
        };

    return `
      <article class="reel-article ${isLatest ? 'is-latest' : ''}">
        <div class="reel-shell">
          <div class="reel-header">
            <div class="reel-meta">
              ${isLatest ? '<span class="latest-pill">Latest</span>' : ''}
              <span>${this.escapeHtml(article.contentType || 'article')}</span>
              <span>•</span>
              <span title="${this.escapeHtml(timeInfo.relativeTime)}">${this.escapeHtml(timeInfo.dateTime)}</span>
              <span>•</span>
              <span>${article.readingTime || 5} min read</span>
            </div>
            <a href="view-article.html?article=${encodeURIComponent(article.path)}" class="btn-maximize" target="_blank" title="Read full article">
              ⤢
            </a>
          </div>

          <h2 class="reel-title">${this.escapeHtml(article.title)}</h2>

          <div class="reel-content">${htmlContent}</div>
        </div>
      </article>
    `;
  }

  convertToHtml(content) {
    // Check if it's already HTML
    const trimmed = content.trim();
    if (trimmed.startsWith('<') || (trimmed.includes('<article') || trimmed.includes('<div') || trimmed.includes('<p'))) {
      return content;
    }

    // Markdown conversion (preserving original logic but skipping pre-escaping)
    let html = content
      // Alert Boxes
      .replace(/^> \[!NOTE\]\n> (.*?)$/gm, (match, content) => {
        return `<div class="alert alert-note"><div class="alert-icon">ℹ️</div><div class="alert-content"><span class="alert-title">Note</span>${content}</div></div>`;
      })
      .replace(/^> \[!TIP\]\n> (.*?)$/gm, (match, content) => {
        return `<div class="alert alert-tip"><div class="alert-icon">💡</div><div class="alert-content"><span class="alert-title">Pro Tip</span>${content}</div></div>`;
      })
      // Headers
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Blockquotes
      .replace(/^> (.*?)$/gm, (match, content) => {
        if (content.startsWith('[!')) return match;
        return `<blockquote>${content}</blockquote>`;
      })
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Lists
      .replace(/^[\*\-] (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>')
      // Paragraphs
      .replace(/(?:\r?\n){2,}/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');

    return html;
  }


  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupIndexCircle() {
    const circleHTML = `
      <a href="articles-list.html" id="index-circle" title="View all article titles">☰</a>
    `;
    document.body.insertAdjacentHTML('beforeend', circleHTML);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.articleFeed = new ArticleFeed();
});
