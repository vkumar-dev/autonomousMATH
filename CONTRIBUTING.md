# Contributing to autonomousMATH

Thank you for interest in contributing! This guide helps you contribute effectively.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/autonomousMATH.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit and push
7. Open a Pull Request

## Project Structure

```
autonomousMATH/
├── .github/workflows/     # GitHub Actions workflows
├── articles/              # Generated math articles
├── prompts/               # AI prompts for math questions
├── scripts/               # JavaScript & Python model resolver utilities
├── styles/                # CSS themes
├── templates/             # HTML templates
└── index.html             # Homepage
```

## Development Workflow

### Testing Changes

1. **Test locally** when possible
2. **Use workflow_dispatch** to manually trigger workflows
3. **Check GitHub Pages** after deployment

### Code Style

**JavaScript:**
- Use ES6+ features
- Use const/let (no var)
- Add JSDoc comments for functions
- Follow existing patterns

**CSS:**
- Use CSS variables for theming
- Mobile-first responsive design
- BEM-like naming conventions

**Prompts:**
- Clear, specific instructions
- Include examples
- Define output format

## Areas for Contribution

### High Priority

1. **Topic Sources**: Integrate real-time trending topic APIs
2. **Theme Variations**: Create new article themes
3. **Prompt Improvement**: Enhance AI prompt quality
4. **Accessibility**: Improve screen reader support, keyboard navigation

### Medium Priority

1. **Analytics Dashboard**: Create analytics page
2. **Social Sharing**: Improve share functionality
3. **SEO Optimization**: Add meta tags, sitemap
4. **Performance**: Optimize loading speed

### Low Priority

1. **Additional Themes**: More homepage/article themes
2. **Documentation**: Improve guides and examples
3. **Testing**: Add automated tests

## Making Changes

### Adding a New Theme

1. Create CSS file: `styles/article-your-theme.css`
2. Follow existing theme pattern
3. Add theme to `scripts/generate-article.js`:
   ```javascript
   const ARTICLE_THEMES = [
     // ... existing themes
     'your-theme'
   ];
   ```
4. Update template if needed
5. Test with sample article

### Improving Prompts

1. Edit prompt file in `prompts/`
2. Test with manual workflow trigger
3. Compare output quality
4. Document changes

### Adding Features

1. Check existing issues first
2. Create issue for discussion if major change
3. Implement in feature branch
4. Test thoroughly
5. Update documentation

## Pull Request Guidelines

### PR Title

Use conventional commits format:
- `feat: Add new article theme`
- `fix: Correct theme switching bug`
- `docs: Update setup instructions`
- `refactor: Improve topic selector logic`

### PR Description

Include:
- What changes were made
- Why changes were made
- How to test the changes
- Screenshots if UI changes

### Before Submitting

- [ ] Code follows existing style
- [ ] Changes tested locally
- [ ] Workflow tested (if applicable)
- [ ] Documentation updated
- [ ] No console errors

## Issue Guidelines

### Creating Issues

1. Check existing issues first
2. Use clear, descriptive title
3. Provide detailed description
4. Include relevant labels

### Issue Labels

- `enhancement`: New feature request
- `bug`: Something not working
- `documentation`: Documentation improvements
- `help wanted`: Need community help
- `good first issue`: Good for newcomers
- `priority: high/critical/medium/low`: Priority level

## Questions?

- Open an issue for discussion
- Check existing documentation
- Review GitHub Actions logs

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Accept constructive criticism
- Focus on what's best for the community

---

Thank you for contributing to autonomousMATH! 🤖π
