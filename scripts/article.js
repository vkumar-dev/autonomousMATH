/**
 * Article Page Script
 * Handles reading progress, theme toggle, and sharing
 */

class ArticlePage {
  constructor() {
    this.progressBar = document.getElementById('progress-bar');
    this.themeToggle = document.getElementById('theme-toggle');
    this.currentTheme = null;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.setupReadingProgress();
    this.setupThemeToggle();
    this.setupShareButtons();
    this.applyStoredTheme();
    document.body.classList.add('theme-loaded');
  }

  /**
   * Setup reading progress bar
   */
  setupReadingProgress() {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      
      if (this.progressBar) {
        this.progressBar.style.width = `${progress}%`;
      }
    });
  }

  /**
   * Setup theme toggle button
   */
  setupThemeToggle() {
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }

  /**
   * Setup share buttons
   */
  setupShareButtons() {
    const shareButtons = document.querySelectorAll('[data-share]');
    
    shareButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const platform = btn.getAttribute('data-share');
        this.handleShare(platform);
      });
    });
  }

  /**
   * Handle share action
   */
  handleShare(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title.replace(' - autonomousMATH', ''));
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, '_blank', 'width=600,height=400');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
        break;
      case 'copy':
        navigator.clipboard.writeText(window.location.href)
          .then(() => {
            this.showCopyConfirmation();
          })
          .catch(err => {
            console.error('Failed to copy:', err);
          });
        break;
    }
  }

  /**
   * Show copy link confirmation
   */
  showCopyConfirmation() {
    const copyBtn = document.querySelector('[data-share="copy"]');
    if (copyBtn) {
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
      }, 2000);
    }
  }

  /**
   * Toggle article theme
   */
  toggleTheme() {
    const themes = [
      'theme-minimalist-clean',
      'theme-neon-nights',
      'theme-paper-ink',
      'theme-ocean-breeze',
      'theme-forest-calm',
      'theme-sunset-vibes',
      'theme-matrix-code',
      'theme-cotton-candy',
      'theme-industrial',
      'theme-aurora'
    ];

    // Remove current theme
    if (this.currentTheme) {
      document.body.classList.remove(this.currentTheme);
    }

    // Get next random theme (different from current)
    let newTheme;
    do {
      newTheme = themes[Math.floor(Math.random() * themes.length)];
    } while (newTheme === this.currentTheme && themes.length > 1);

    // Apply new theme
    document.body.classList.add(newTheme);
    this.currentTheme = newTheme;

    // Store preference
    localStorage.setItem('autonomousmath-article-theme', newTheme);

    console.log(`[ArticlePage] Theme changed to: ${newTheme}`);
  }

  /**
   * Apply stored theme or random one
   */
  applyStoredTheme() {
    const storedTheme = localStorage.getItem('autonomousmath-article-theme');
    const themeFromMeta = this.getThemeFromMeta();
    
    if (themeFromMeta) {
      // Use theme from article frontmatter
      const themeClass = `theme-${themeFromMeta}`;
      document.body.classList.add(themeClass);
      this.currentTheme = themeClass;
    } else if (storedTheme) {
      // Use stored preference
      document.body.classList.add(storedTheme);
      this.currentTheme = storedTheme;
    } else {
      // Apply random theme
      this.toggleTheme();
    }
  }

  /**
   * Get theme from meta tag or data attribute
   */
  getThemeFromMeta() {
    // Check for data attribute on body
    const bodyTheme = document.body.getAttribute('data-theme');
    if (bodyTheme) return bodyTheme;

    // Check for meta tag
    const metaTheme = document.querySelector('meta[name="article-theme"]');
    if (metaTheme) return metaTheme.getAttribute('content');

    return null;
  }
}

// Initialize article page
document.addEventListener('DOMContentLoaded', () => {
  window.articlePage = new ArticlePage();
});
