/**
 * Homepage Script - Reel Feed Bootstrap
 */

class Homepage {
  constructor() {
    this.articles = [];
    this.contentCache = {};
    this.articlesGrid = document.getElementById('articles-grid');
    this.init();
  }

  async init() {
    try {
      await this.loadArticles();

      if (this.articles.length === 0) {
        this.renderEmptyState();
        return;
      }

      // Hand over ALL articles to the reel feed for uniform rendering
      if (window.articleFeed) {
        await window.articleFeed.initializeWithArticles(this.articles, this.contentCache);
      }

      const countElement = document.getElementById('articles-count');
      if (countElement) {
        countElement.textContent = `${this.articles.length} article${this.articles.length !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Failed to initialize homepage:', error);
      this.renderError();
    }
  }

  async loadArticles() {
    // Add cache-busting parameter to avoid stale content
    const bustParam = `?t=${window.CACHE_BUST || Date.now()}`;
    
    try {
      const [indexResponse, contentResponse] = await Promise.all([
        fetch('articles-index.json' + bustParam),
        fetch('articles-content.json' + bustParam)
      ]);

      if (!indexResponse.ok || !contentResponse.ok) {
        throw new Error('Failed to load article data files');
      }

      const indexData = await indexResponse.json();
      this.contentCache = await contentResponse.json();

      const fromIndex = (indexData.articles || []).map((item) => this.normalizeArticle(item));

      const indexedPaths = new Set(fromIndex.map((item) => item.path));
      const fromContent = Object.entries(this.contentCache)
        .filter(([path]) => !indexedPaths.has(path))
        .map(([path, raw]) => this.articleFromMarkdown(path, raw));

      this.articles = [...fromIndex, ...fromContent]
        .filter((item) => item.path)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(`[Homepage] Loaded ${this.articles.length} articles (latest first)`);
      console.log(`[Homepage] Latest article: ${this.articles[0]?.title}`);
      console.log(`[Homepage] Content cache keys: ${Object.keys(this.contentCache).length}`);
    } catch (error) {
      console.error('[Homepage] Error loading articles:', error);
      throw error;
    }
  }

  normalizeArticle(article) {
    return {
      title: article.title || 'Untitled',
      date: article.date || new Date(0).toISOString(),
      contentType: article.contentType || 'article',
      excerpt: article.excerpt || '',
      readingTime: article.readingTime || 5,
      path: article.path,
      theme: article.theme || 'default'
    };
  }

  articleFromMarkdown(path, rawContent) {
    // Clean code fences
    let cleaned = rawContent
      .replace(/^\s*```(?:markdown|html)?\s*\n/i, '')
      .replace(/^\s*```\s*\n/i, '')
      .replace(/\n\s*```\s*$/i, '');
    
    // Robust pattern for HTML with Frontmatter (handles truncated files)
    const frontmatterMatch = cleaned.match(/^(?:<!--\s*\n)?---\n([\s\S]*?)\n---(?:\n\s*-->)?/);
    
    const getField = (field, block) => {
      const match = block.match(new RegExp(`^${field}:\\s*(.*)$`, 'mi'));
      return match ? match[1].replace(/^["']|["']$/g, '').trim() : '';
    };

    const title = frontmatterMatch ? getField('title', frontmatterMatch[1]) : this.pathToTitle(path);
    const date = frontmatterMatch ? getField('date', frontmatterMatch[1]) : this.dateFromPath(path);
    const theme = frontmatterMatch ? getField('theme', frontmatterMatch[1]) : 'default';

    const body = frontmatterMatch ? cleaned.slice(frontmatterMatch[0].length).trim() : cleaned;
    
    // Extract excerpt: strip tags if HTML
    let textOnly = body;
    if (body.trim().startsWith('<')) {
      textOnly = body.replace(/<[^>]*>/g, ' ');
    }
    const excerpt = textOnly.split('\n').find((line) => line.trim() && !line.startsWith('#')) || '';

    return {
      title,
      date,
      contentType: 'article',
      excerpt: excerpt.slice(0, 180),
      readingTime: Math.max(1, Math.round(textOnly.split(/\s+/).length / 200)),
      path,
      theme
    };
  }

  pathToTitle(path) {
    return path
      .split('/')
      .pop()
      .replace(/\.(md|html)$/, '')
      .replace(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}_/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  dateFromPath(path) {
    const filename = path.split('/').pop() || '';
    const match = filename.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
    if (!match) return new Date(0).toISOString();

    const [, year, month, day, hour, min, sec] = match;
    return new Date(Date.UTC(+year, +month - 1, +day, +hour, +min, +sec)).toISOString();
  }

  async renderLatestArticle(article) {
    if (!this.articlesGrid) return;

    console.log(`[Homepage] Rendering latest article: ${article.title}`);
    
    const rawContent = this.contentCache[article.path];
    if (!rawContent) {
      this.renderFeaturedArticle(article);
      return;
    }

    // Parse the article
    let cleaned = rawContent
      .replace(/^\s*```(?:markdown|html)?\s*\n/i, '')
      .replace(/^\s*```\s*\n/i, '')
      .replace(/\n\s*```\s*$/i, '');
      
    const frontmatterMatch = cleaned.match(/^(?:<!--\s*\n)?---\n([\s\S]*?)\n---(?:\n\s*-->)?/);

    const body = frontmatterMatch ? cleaned.slice(frontmatterMatch[0].length).trim() : cleaned;
    const html = this.convertToHtml(body);
    const now = new Date(article.date);

    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const latestHtml = `
      <article class="featured-article-full">
        <div class="article-header-featured">
          <div class="badges">
            <span class="badge-new">Latest</span>
            <span class="badge-theme">${article.theme || 'default'}</span>
          </div>
          <h1 class="article-title-featured">${article.title}</h1>
          <div class="article-meta-featured">
            <span>📖 ${article.readingTime} min read</span>
            <span>🤖 AI Generated</span>
            <span>📅 ${formattedDate}</span>
          </div>
        </div>

        <div class="article-content-featured">
          ${html}
        </div>

        <div class="articles-separator">
          <span>More Articles</span>
        </div>
      </article>
    `;

    this.articlesGrid.innerHTML = latestHtml;
    
    if (this.articles.length > 1) {
      this.articlesGrid.classList.add('has-reel-feed');
    }
  }

  convertToHtml(content) {
    // Check if it's already HTML
    const trimmed = content.trim();
    if (trimmed.startsWith('<') || (trimmed.includes('<article') || trimmed.includes('<div') || trimmed.includes('<p'))) {
      return content;
    }

    let html = content
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^[\*\-] (.*?)$/gm, '<li>$1</li>')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/^(?!<[hpul])/gm, '<p>')
      .replace(/$/gm, '</p>')
      .replace(/<p><\/p>/g, '');

    return html;
  }


  renderEmptyState() {
    if (!this.articlesGrid) return;

    this.articlesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No articles yet</h3>
        <p>Our AI is working on the first article. Check back soon!</p>
      </div>
    `;
  }

  renderError() {
    if (!this.articlesGrid) return;

    this.articlesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Unable to load article reel</h3>
        <p>Please refresh the page or check back later.</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.homepage = new Homepage();
});
