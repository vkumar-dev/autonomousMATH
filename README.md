# autonomousMATH 🤖π

An AI-powered autonomous mathematics platform that ponders matrix seeds and invents new mathematical questions daily at 6:41 PM IST (13:11 UTC) via GitHub Actions.

![powered by GitHub Actions](https://img.shields.io/badge/powered%20by-GitHub%20Actions-blue)
![license MIT](https://img.shields.io/badge/license-MIT-blue)
![schedule 6:41 PM IST](https://img.shields.io/badge/schedule-6%3A41%20PM%20IST-purple)

## Core Features

- 🤖 **Fully Autonomous**: Dynamically selects open GGUF models from Hugging Face and generates new mathematical questions daily.
- 📐 **Dynamic Seed Matrix**: Combines mathematical categories, word lists, genres, perspectives, and storytelling methods into seeds.
- 💡 **Novel Question Focus**: The prompt specifically forces the AI to ponder the matrix seed and invent a fresh question (avoiding textbook re-hashes).
- 🧩 **Zero Ollama / Pure HF**: Uses an automated open non-gated model resolver based on [`RESEARCH.md`](RESEARCH.md) to discover and run local llama.cpp models inside GitHub Actions runners without requiring API keys or pre-installed servers.
- 🎨 **KaTeX & Day/Night Notebook**: Full LaTeX mathematical formula rendering in a single quiet notebook style with light/dark palettes.
- 📄 **GitHub Pages**: Automated deployment directly to GitHub Pages.

## How It Works

```
GitHub Actions Cron (6:41 PM IST / 13:11 UTC)
           │
           ▼
    Model Resolver (model_resolver.py)
  - Discovers open non-gated GGUF models on HF Hub
  - Ranks by task fit, size efficiency & recency
           │
           ▼
    Matrix Seed Picker (random-topic-selector.js)
  - Selects category, word list, genre, angle & style
           │
           ▼
    Hugging Face Local Inference (hf_inference.py + llama-cpp-python)
  - Ponders seeds & prior questions to invent a new question
  - Generates HTML essay with KaTeX math
           │
           ▼
    Commit & Deploy
  - Pushes article & indices to main branch
  - GitHub Pages deployment action builds live site
```

## Quick Start

1. **Clone/Fork**: `git clone https://github.com/vkumar-dev/autonomousMATH.git`
2. **Setup Pages**: Go to Repository Settings → Pages, source from `GitHub Actions`.
3. **Trigger Workflow**: Go to the Actions tab and manually run **Autonomous Math Question (HF GGUF)** or wait for 6:41 PM IST (13:11 UTC) daily.

## Documentation

- [`RESEARCH.md`](RESEARCH.md): Architecture of the local HF open GGUF model resolver.
- [`SETUP.md`](SETUP.md): Configuration and setup guidelines.
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md): Common issues and diagnostic steps.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): Guide for contributing to autonomousMATH.

## License

MIT License - See [LICENSE](LICENSE) for details.
