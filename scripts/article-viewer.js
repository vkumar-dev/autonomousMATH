/**
 * Article Viewer
 * Converts markdown articles to HTML and displays them, or renders HTML articles directly
 */

class ArticleViewer {
  constructor() {
    this.articlePath = this.extractArticlePathFromUrl();
    this.init();
  }

  /**
   * Extract article path from URL
   * e.g., /autonomousMATH/view-article.html?article=2026/02/26/my-article.html
   */
  extractArticlePathFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const article = params.get('article');
    
    if (!article) {
      // Try from hash
      const hash = window.location.hash.slice(1);
      if (hash) return hash;
    }
    
    return article;
  }

  /**
   * Initialize viewer
   */
  async init() {
    try {
      if (!this.articlePath) {
        this.showError('No article specified');
        return;
      }

      // Load content
      const rawContent = await this.loadContent();
      const { frontmatter, content } = this.parseContent(rawContent);
      
      // Render HTML
      this.renderArticle(frontmatter, content);
      
    } catch (error) {
      console.error('Error loading article:', error);
      this.showError(`Failed to load article: ${error.message}`);
    }
  }

  /**
   * Load content file - uses content cache first, then tries direct fetch
   */
  async loadContent() {
    console.log('[ArticleViewer] Loading article:', this.articlePath);
    
    try {
      // First, try to load from content cache
      const cacheResponse = await fetch('articles-content.json');
      if (cacheResponse.ok) {
        const contentCache = await cacheResponse.json();
        const content = contentCache[this.articlePath];
        
        if (content) {
          return content;
        }
      }
    } catch (error) {
      console.warn('[ArticleViewer] Content cache error:', error.message);
    }
    
    // Fallback: try direct file fetch
    try {
      let response = await fetch(`articles/${this.articlePath}`);
      if (!response.ok) {
        response = await fetch(this.articlePath);
      }
      
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn('[ArticleViewer] Direct fetch failed:', error.message);
    }
    
    throw new Error(`Could not load article: ${this.articlePath}`);
  }

  /**
    * Parse frontmatter and content
    */
   parseContent(raw) {
     // Clean code fences
     let cleaned = raw
      .replace(/^\s*```(?:markdown|html)?\s*\n/i, '')
      .replace(/^\s*```\s*\n/i, '')
      .replace(/\n\s*```\s*$/i, '');
     
     // Robust pattern for HTML with Frontmatter (handles truncated files)
     // First try to find the frontmatter block
     const frontmatterMatch = cleaned.match(/^(?:<!--\s*\n)?---\n([\s\S]*?)\n---(?:\n\s*-->)?/);
     
     if (!frontmatterMatch) {
       // Fallback for very simple markdown or missing frontmatter
       return { frontmatter: {}, content: cleaned };
     }

     const frontmatter = this.parseFrontmatterBlock(frontmatterMatch[1]);
     
     // Content is everything after the frontmatter match
     let content = cleaned.slice(frontmatterMatch[0].length).trim();

     return { frontmatter, content };
   }

  /**
   * Parse YAML-like frontmatter
   */
  parseFrontmatterBlock(block) {
    const data = {};
    const lines = block.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Remove quotes and handle basic multi-line or quoted strings
      value = value.replace(/^["']|["']$/g, '');

      // Parse arrays [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      }

      data[key] = value;
    }

    return data;
  }

  /**
   * Convert markdown to HTML (only if it's not already HTML)
   */
  markdownToHtml(markdown) {
    // Simple heuristic: if it contains common HTML tags at the start or throughout, treat as HTML
    const trimmed = markdown.trim();
    if (trimmed.startsWith('<') || (trimmed.includes('<article') || trimmed.includes('<div') || trimmed.includes('<p'))) {
      return markdown;
    }

    let html = markdown
      // Headers
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      // Alert Boxes
      .replace(/^> \[!NOTE\]\n> (.*?)$/gm, (match, content) => {
        return `<div class="alert alert-note"><div class="alert-icon">ℹ️</div><div class="alert-content"><span class="alert-title">Note</span>${content}</div></div>`;
      })
      .replace(/^> \[!TIP\]\n> (.*?)$/gm, (match, content) => {
        return `<div class="alert alert-tip"><div class="alert-icon">💡</div><div class="alert-content"><span class="alert-title">Pro Tip</span>${content}</div></div>`;
      })
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Code blocks
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      // Blockquotes
      .replace(/^> (.*?)$/gm, (match, content) => {
        if (content.startsWith('[!')) return match;
        return `<blockquote>${content}</blockquote>`;
      })
      // Lists
      .replace(/^[\*\-] (.*?)$/gm, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hpulb])/gm, '<p>')
      .replace(/$/gm, '</p>')
      .replace(/<p><\/p>/g, '');

    return html;
  }

  /**
   * Render article to page
   */
  renderArticle(frontmatter, content) {
    const html = this.markdownToHtml(content);
    const now = new Date(frontmatter.date || new Date());
    const formattedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeInfo = typeof TimeFormatter !== 'undefined' ? TimeFormatter.getFullTimeInfo(now) : { dateTime: formattedDate, relativeTime: 'recently', fullText: 'Generated recently' };

    const articleHtml = `
      <article class="article-page">
        <nav class="article-nav">
          <a href="index.html" class="nav-home"><span class="nav-icon">←</span><span class="nav-text">autonomousMATH</span></a>
          <a href="index.html?view=list" class="nav-articles"><span class="nav-text">View All Questions</span><span class="nav-icon">📰</span></a>
        </nav>

        <header class="article-header">
          <div class="header-content">
            <div class="article-meta">
              <span class="meta-type">${this.escapeHtml(frontmatter.contentType || 'Question')}</span>
              <span class="meta-theme">${this.escapeHtml(frontmatter.theme || 'default')}</span>
              <span class="meta-date" title="${timeInfo.dateTime}">${timeInfo.relativeTime}</span>
            </div>
            <h1 class="article-title">${this.escapeHtml(frontmatter.title || 'Untitled')}</h1>
            <p class="article-excerpt">${this.escapeHtml(frontmatter.excerpt || '')}</p>
          </div>
        </header>

        <main class="article-content">
          <div id="article-body">${html}</div>
          <footer class="article-footer">
            <p class="generated-info"><span class="bot-icon">🤖</span> This question was autonomously generated by autonomousMATH</p>
            <p class="generation-date">${timeInfo.fullText}</p>
          </a>
          </footer>
        </main>
      </article>
    `;

    document.body.innerHTML = articleHtml;
    document.title = `${frontmatter.title || 'Question'} - autonomousMATH`;
    this.applyTheme(frontmatter.theme);
  }

  applyTheme(theme) {
    document.body.classList.remove('theme-white', 'theme-black');
    const themeClass = theme ? `theme-${theme.split('-')[0]}` : (Math.random() > 0.5 ? 'theme-white' : 'theme-black');
    document.body.classList.add(themeClass, 'theme-loaded');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    document.body.innerHTML = `<div class="error-container"><h2>Error Loading Article</h2><p>${this.escapeHtml(message)}</p><a href="index.html">Back to Home</a></div>`;
    document.body.classList.add('theme-white', 'theme-loaded');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ArticleViewer();
});
