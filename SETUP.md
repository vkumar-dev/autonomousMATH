# Setup Guide - autonomousMATH

Complete step-by-step setup for your autonomous AI mathematics platform.

## Prerequisites

- GitHub account
- Basic knowledge of Git

---

## 1. Quick Start

### Autonomous HF Model Discovery & Local Inference ⭐
`autonomousMATH` runs fully autonomously on GitHub Actions runners:
1. It automatically discovers the latest open, non-gated GGUF models on Hugging Face using `scripts/model_resolver.py`.
2. It downloads the selected model and executes local `llama.cpp` inference via `scripts/hf_inference.py`.
3. No API key, Hugging Face token, or Ollama server is required for public models!

---

## 2. GitHub Configuration

### Create Repository
1. Create a new **Public** repository named `autonomousMATH`.
2. Push the project files to your repository on branch `main`.

### Enable GitHub Pages
1. Go to **Settings → Pages**.
2. Source: **GitHub Actions**.
3. Your site will be published automatically upon push to `main`.

### Enable Workflows
1. Go to the **Actions** tab.
2. Enable workflows if prompted.
3. Schedule: Automatically runs once daily at **3:14 PM IST / 09:44 UTC** (π-time).

---

## 3. Local Testing

To test model discovery and article generation locally:
```bash
# 1. Discover suitable HF GGUF model
python3 scripts/model_resolver.py

# 2. Select matrix seed
node scripts/random-topic-selector.js

# 3. Generate article with HF GGUF inference
node scripts/generate-article.js

# 4. Build indices
node scripts/build-article-index.js
node scripts/build-articles-content.js
```

---
*For troubleshooting and details on the model resolver architecture, see [RESEARCH.md](./RESEARCH.md) and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).*
