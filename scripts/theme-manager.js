/**
 * Theme Manager
 * Applies persisted theme and supports explicit light/dark toggle
 */

const THEMES = ['theme-white', 'theme-black'];
const THEME_STORAGE_KEY = 'autonomousmath-theme';

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.applyInitialTheme());
    } else {
      this.applyInitialTheme();
    }
  }

  getRandomTheme() {
    const randomIndex = Math.floor(Math.random() * THEMES.length);
    return THEMES[randomIndex];
  }

  getSavedTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(saved) ? saved : null;
  }

  applyTheme(themeName) {
    THEMES.forEach((theme) => {
      document.body.classList.remove(theme);
    });

    document.body.classList.add(themeName);
    this.currentTheme = themeName;

    this.updateThemeIndicator(themeName);
    this.updateThemeToggleLabel(themeName);

    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    document.body.classList.add('theme-loaded');

    console.log(`[ThemeManager] Applied theme: ${themeName}`);
  }

  applyInitialTheme() {
    const savedTheme = this.getSavedTheme();
    const theme = savedTheme || this.getRandomTheme();
    this.applyTheme(theme);
  }

  toggleTheme() {
    const currentIndex = THEMES.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    this.applyTheme(THEMES[nextIndex]);
  }

  updateThemeIndicator(themeName) {
    const indicator = document.getElementById('current-theme');
    if (!indicator) return;

    const displayName = themeName.replace('theme-', '').replace(/\b\w/g, (l) => l.toUpperCase());
    indicator.textContent = displayName;
  }

  updateThemeToggleLabel(themeName) {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    if (themeName === 'theme-black') {
      button.textContent = '☀️ Light';
      return;
    }

    button.textContent = '🌙 Dark';
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

window.themeManager = new ThemeManager();

document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh-theme');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.themeManager.toggleTheme();
    });
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      window.themeManager.toggleTheme();
    });
  }
});
