# Project Architecture & Code Design

This document details the internal design, file structure, and logic of autonomousMATH.

## Directory Structure
```
autonomousMATH/
├── .github/workflows/         # GitHub Actions (6:41 PM IST / 13:11 UTC generation & deploy)
├── articles/                  # Generated questions in YYYY/MM/DD/ format
├── docs/                      # Technical documentation and history
├── prompts/                   # AI prompts for question generation
├── scripts/                   # Python & JavaScript logic
│   ├── model_resolver.py      # Automated open non-gated HF GGUF model discovery
│   ├── hf_inference.py        # Local llama.cpp inference runner
│   ├── random-topic-selector.js # Matrix seed picker (category, word list, genre, etc.)
│   ├── generate-article.js    # Article generation coordinator
│   ├── build-article-index.js # Article index builder
│   └── build-articles-content.js # Content cache builder
├── styles/                    # CSS themes for homepage and questions
└── templates/                 # HTML templates
```

## Generation Pipeline
1. **Model Discovery (`model_resolver.py`)**:
   - Queries Hugging Face Hub for public, non-gated GGUF models.
   - Filters parameters (3B–7B), quantizations (Q4_K_M preferred), and CPU file size limits.
   - Ranks models using a multi-factor score (task fit, recency, popularity, size efficiency).
   - Writes `selected-model.json`.

2. **Matrix Seed Selection (`random-topic-selector.js`)**:
   - Picks a category, word list, genre, writing style, storytelling method, and perspective from `random-blog-generator-config.json`.
   - Writes `selected-topic.json`.

3. **Question Invention & Article Generation (`generate-article.js` + `hf_inference.py`)**:
   - Loads `prompts/article-generation.txt` and prior questions to prevent duplication.
   - Executes local GGUF inference via `llama-cpp-python`.
   - Produces HTML5 containing KaTeX math expressions (`$...$`, `$$...$$`).
   - Writes the article under `articles/YYYY/MM/DD/`.

4. **Build & Deploy (`build-article-index.js`, `deploy.yml`)**:
   - Rebuilds JSON indices (`articles-index.json`, `articles-content.json`).
   - Deploys the main branch to GitHub Pages.

---
*For setup instructions, see [SETUP.md](../SETUP.md).*
