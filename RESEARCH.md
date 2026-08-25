# Local AI Model Resolver

## Purpose

Build a lightweight model-selection and inference layer for GitHub Actions.

The system should be able to:

1. Discover publicly available Hugging Face models.
2. Require **no Hugging Face authentication** for public/non-gated models.
3. Filter models according to the available compute resources.
4. Prefer recent models.
5. Prefer models suitable for programming, documentation, and agentic tasks.
6. Select an appropriate GGUF/llama.cpp-compatible model automatically.
7. Download the model only when required.
8. Run local inference without requiring an Ollama server.
9. Work inside GitHub Actions with minimal setup.

The intended runtime is:

```text
GitHub Actions
      │
      ▼
Model Resolver
      │
      ├── Hugging Face model discovery
      │
      ├── Public / non-gated filter
      │
      ├── Programming / instruct / agent filtering
      │
      ├── Parameter-size filtering
      │
      ├── Recency ranking
      │
      ├── Popularity ranking
      │
      └── GGUF / llama.cpp compatibility
      │
      ▼
Selected Model
      │
      ▼
Download
      │
      ▼
llama.cpp / node-llama-cpp
      │
      ▼
Local inference
      │
      ▼
Agent output
```

---

# 1. Current Hugging Face CLI

The Hugging Face CLI can be installed locally with:

```bash
curl -LsSf https://hf.co/cli/install.sh | bash
```

Verify:

```bash
hf --version
```

Public model discovery does not require:

```bash
hf auth login
```

provided that only public/non-gated models are being accessed.

---

# 2. Current Model Discovery Command

The current baseline command is:

```bash
hf models ls \
    --no-gated \
    --apps llama.cpp \
    --num-parameters min:3B,max:7B \
    --sort created_at \
    --limit 20 \
    --format json
```

This searches for:

* non-gated models
* llama.cpp-compatible models
* approximately 3B–7B parameter models
* sorted using creation date
* JSON output

The JSON output is particularly useful because it can be consumed directly by Python or another agent program.

---

# 3. Programming / Agent Model Discovery

The model should eventually be selected for a specific workload rather than simply being the newest model.

Primary workload:

```text
Programming
Documentation
Repository analysis
Code generation
Code modification
Reasoning
Agentic tasks
```

Potential Hugging Face discovery signals include:

### Search terms

```text
code
coding
coder
programming
instruct
agent
```

For example:

```bash
hf models ls \
    --search coding \
    --no-gated \
    --apps llama.cpp \
    --num-parameters min:3B,max:7B \
    --sort created_at \
    --limit 20 \
    --format json
```

Other searches can be performed separately:

```bash
hf models ls \
    --search coder \
    --no-gated \
    --apps llama.cpp \
    --num-parameters min:3B,max:7B \
    --sort created_at \
    --limit 20 \
    --format json
```

and:

```bash
hf models ls \
    --search instruct \
    --no-gated \
    --apps llama.cpp \
    --num-parameters min:3B,max:7B \
    --sort created_at \
    --limit 20 \
    --format json
```

These searches should eventually be combined by the resolver rather than relying on a single keyword.

---

# 4. Important Distinction: "Coding Model" vs "Good Model"

A Hugging Face tag or search result should not automatically be interpreted as proof that a model is good at programming.

The resolver should distinguish:

```text
MODEL DISCOVERY
        ↓
candidate models
        ↓
metadata filtering
        ↓
quality ranking
        ↓
final selection
```

Useful ranking signals include:

### Hard filters

* Public
* Non-gated
* llama.cpp/GGUF compatible
* 3B–7B parameters
* Appropriate quantization
* Appropriate model architecture
* Appropriate context length

### Soft ranking signals

* Creation date
* Downloads
* Likes
* Community adoption
* Model description
* Coding/instruct tags
* Benchmark information
* Quantization quality
* Context length

---

# 5. Suggested Model Score

A future resolver could calculate something similar to:

```text
model_score =
      30% task suitability
    + 20% model quality / benchmarks
    + 15% downloads
    + 15% recency
    + 10% parameter efficiency
    + 10% inference efficiency
```

The exact weights should be configurable.

For example:

```text
Coding Agent
     │
     ├── Coding capability       30
     ├── General reasoning       20
     ├── Downloads               15
     ├── Recency                 15
     ├── Size efficiency         10
     └── Runtime efficiency      10
```

---

# 6. Why GGUF Matters

The model resolver should not simply select a model repository.

It should ultimately identify a usable GGUF file.

For example:

```text
Model
  │
  ├── Q4_K_M
  ├── Q5_K_M
  ├── Q6_K
  └── Q8_0
```

For a GitHub Actions CPU runner, a lower-bit quantization may be preferable because:

* download size is smaller
* RAM requirements are lower
* inference is faster
* startup time is lower

A future resolver should therefore select both:

```text
MODEL
+
QUANTIZATION
```

rather than just:

```text
MODEL
```

---

# 7. Initial Target

The first version should remain extremely simple.

### Input

```text
Task: coding_agent
Minimum parameters: 3B
Maximum parameters: 7B
Maximum model size: configurable
Gated: false
Runtime: llama.cpp
```

### Output

```text
model_id
quantization
download URL
parameter count
creation date
downloads
```

Example conceptual output:

```json
{
  "model": "some-org/some-coder-model-GGUF",
  "parameters": "7B",
  "quantization": "Q4_K_M",
  "created": "2026-08-25",
  "downloads": 123456,
  "gated": false
}
```

---

# 8. Future Python Resolver

The Hugging Face Python API should eventually replace shell parsing for the model-selection logic.

Conceptually:

```python
from huggingface_hub import HfApi

api = HfApi()

models = api.list_models(
    gated=False,
    num_parameters="min:3B,max:7B",
    sort="downloads",
    limit=100,
    token=False,
)
```

The resolver can then perform its own filtering and ranking.

This is preferable once the logic becomes more sophisticated.

---

# 9. Desired Architecture

The eventual project should have three independent components.

## Model Resolver

Responsible for:

```text
Hugging Face
      ↓
discover
      ↓
filter
      ↓
rank
      ↓
select
```

## Model Runtime

Responsible for:

```text
selected GGUF
      ↓
llama.cpp / node-llama-cpp
      ↓
inference
```

## Agent

Responsible for:

```text
repository
documents
tasks
      ↓
LLM
      ↓
reasoning
      ↓
actions
```

Keeping these separate means the model can be replaced without changing the agent.

---

# 10. GitHub Actions Goal

The eventual workflow should be close to:

```yaml
steps:
  - name: Discover model
    run: python model_resolver.py

  - name: Run local AI agent
    run: python agent.py
```

The workflow should ideally require:

```text
No Ollama
No Ollama server
No API key
No OpenAI API
No Hugging Face token
No manually selected model
```

For public models:

```text
GitHub Runner
     ↓
HF public model discovery
     ↓
automatic model selection
     ↓
GGUF download
     ↓
local inference
     ↓
agent
```

---

# 11. Long-Term Idea

The ultimate abstraction should be:

```bash
ai-agent \
    --task coding \
    --max-parameters 7B
```

The user should not need to know which model is currently best.

The system determines:

```text
What task?
      ↓
What models are available?
      ↓
Which are public?
      ↓
Which are compatible?
      ↓
Which fit the hardware?
      ↓
Which are good at the task?
      ↓
Which is the best current choice?
      ↓
Download
      ↓
Run
```

This turns Hugging Face into a dynamic model marketplace/catalog and makes the inference runtime interchangeable.

---

# 12. Initial Technology Choice

### Model discovery

**Hugging Face CLI / ****`huggingface_hub`**** Python API**

### Model format

**GGUF**

### Runtime

**llama.cpp** or **node-llama-cpp**

### Execution environment

**GitHub Actions**

### Authentication

**None for public/non-gated models**

### Initial model range

**3B–7B**

### Primary tasks

**Programming + documentation + repository/agent work**

---

# 13. Next Development Step

Before implementing the full resolver, investigate the available Hugging Face metadata for coding models.

Specifically determine:

1. Which HF filters identify coding models reliably.
2. Whether `pipeline_tag` is useful for code-generation models.
3. Whether model tags can be queried directly.
4. How to reliably identify GGUF repositories.
5. How to identify individual GGUF quantizations.
6. How to determine GGUF file sizes.
7. How to determine context length.
8. Whether benchmark metadata is available through the API.
9. Whether downloads and likes are useful quality signals.
10. How to calculate a practical score for GitHub Actions CPU runners.

The goal is **not** to hardcode today's best model.

The goal is to build a resolver that can discover the best suitable model automatically as the model ecosystem changes.

