# Troubleshooting & Maintenance

A comprehensive guide for common issues and maintaining your autonomous blog.

## Common Issues

### ❌ Articles are not generating
1. **Check Actions Tab**: View failed workflow logs in GitHub Actions.
2. **Verify API Key**: Check that `GEMINI_API_KEY` (or `AI_API_KEY`) is correctly set in **Settings → Secrets**.
3. **API Rate Limits**: Gemini's free tier allows 1,500 requests/day. Wait for reset if exceeded.

### ❌ GitHub Pages not updating
1. **Wait for Deployment**: Deployment can take up to 2-3 minutes after generation.
2. **Check Deployment Workflow**: Verify the "Deploy to GitHub Pages" job succeeded.
3. **Clear Browser Cache**: Sometimes changes are not immediately visible in your browser.

### ❌ Home Page showing 404
1. **Check Config**: Go to **Settings → Pages** and ensure "Source" is set to "Deploy from a branch" → `main` branch → `/ (root)`.
2. **index.html**: Ensure the `index.html` file exists in the repository root.

## Monitoring & Health Checks

### Check Blog Status (Local)
Use the included script to check the status of a local blog loop:
```bash
./scripts/check-blog-status.sh
```

### Live Log Monitoring
To watch generation in real-time on your local machine or WSL:
```bash
tail -f ralph-blog.log
```

### Verify Dependencies
Ensure the project is properly configured:
- [ ] Blog loop running: `ps aux | grep ralph-blog`
- [ ] Logs accessible: `tail ralph-blog.log`
- [ ] Git remote configured: `git remote -v`
- [ ] Gemini API key set: `echo $GEMINI_API_KEY`

## Historical Fixes

- **Article Viewer Fix**: Resolved issues with article rendering by updating `markdown-viewer.js`.
- **Deployment Loop Fix**: Implemented `[skip ci]` flag to prevent recursive GitHub Actions triggers.
- **GitHub Pages Configuration**: Corrected the deployment branch path to the root directory.

---
*For technical design and architecture details, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).*
