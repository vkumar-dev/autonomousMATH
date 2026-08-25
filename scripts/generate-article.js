#!/usr/bin/env node

/**
 * Generate a math article from a matrix seed using local Hugging Face GGUF inference.
 * The model ponders the topic / word list and invents a preferably-new question.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOPIC_FILE = path.join(ROOT, 'selected-topic.json');
const MODEL_FILE = path.join(ROOT, 'selected-model.json');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const PROMPT_FILE = path.join(ROOT, 'prompts', 'article-generation.txt');
const INDEX_FILE = path.join(ROOT, 'articles-index.json');
const RESOLVER = path.join(__dirname, 'model_resolver.py');
const INFERENCE = path.join(__dirname, 'hf_inference.py');

const ARTICLE_THEMES = [
  'minimalist-clean', 'neon-nights', 'paper-ink', 'ocean-breeze', 'forest-calm',
  'sunset-vibes', 'matrix-code', 'cotton-candy', 'industrial', 'aurora', 'chalkboard'
];

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function generateDatePath(now) {
  return path.join(
    String(now.getFullYear()),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  );
}

function generateTimestamp(now) {
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('-');
}

function calculateReadingTime(wordCount) {
  return Math.max(1, Math.ceil(wordCount / 200));
}

function loadPriorQuestions() {
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }
  try {
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    const articles = index.articles || [];
    return articles
      .slice(0, 40)
      .map((article) => article.question || article.title)
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

function pythonBin() {
  return process.env.PYTHON || 'python3';
}

function runPython(script, extraArgs, options = {}) {
  const result = spawnSync(pythonBin(), [script, ...extraArgs], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeout || 20 * 60 * 1000,
    cwd: ROOT,
    env: process.env
  });
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(result.error ? result.error.message : `${path.basename(script)} exited ${result.status}`);
  }
  return result.stdout || '';
}

function ensureModelSelection() {
  if (fs.existsSync(MODEL_FILE)) {
    return JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
  }
  console.log('Selecting a public non-gated Hugging Face GGUF model…');
  runPython(RESOLVER, [], { timeout: 5 * 60 * 1000 });
  return JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
}

function callHfInference(prompt) {
  const promptPath = path.join(os.tmpdir(), `autonomousmath-prompt-${Date.now()}.txt`);
  fs.writeFileSync(promptPath, prompt, 'utf8');
  try {
    return runPython(INFERENCE, ['--prompt-file', promptPath], { timeout: 25 * 60 * 1000 });
  } finally {
    try {
      fs.unlinkSync(promptPath);
    } catch (error) {
      // ignore
    }
  }
}

function extractQuestion(content, fallback) {
  const questionField = content.match(/^question:\s*["']?(.+?)["']?\s*$/im);
  if (questionField) {
    return questionField[1].trim();
  }
  const posed = content.match(/<p class="posed-question">[\s\S]*?<\/strong>\s*([^<]+)/i);
  if (posed) {
    return posed[1].trim();
  }
  return fallback;
}

function extractTitle(content, fallback) {
  const fm = content.match(/^title:\s*["']?(.+?)["']?\s*$/im);
  if (fm) {
    return fm[1].trim();
  }
  const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    return h1[1].replace(/<[^>]+>/g, '').trim();
  }
  return fallback;
}

async function generateArticle() {
  if (!fs.existsSync(TOPIC_FILE)) {
    throw new Error('No selected topic found. Run random-topic-selector.js first.');
  }

  const topicData = JSON.parse(fs.readFileSync(TOPIC_FILE, 'utf8'));
  const model = ensureModelSelection();
  console.log('Generating article for seed:', topicData.topic);
  console.log('Word list:', (topicData.wordList || []).join(', '));
  console.log('Model:', model.model, model.filename);

  let prompt = fs.existsSync(PROMPT_FILE)
    ? fs.readFileSync(PROMPT_FILE, 'utf8')
    : 'Ponder {{TOPIC}} and the words {{WORD_LIST}} and invent a new mathematical question.';

  const theme = ARTICLE_THEMES[Math.floor(Math.random() * ARTICLE_THEMES.length)];
  const now = new Date();
  const prior = loadPriorQuestions();
  const priorBlock = prior.length
    ? prior.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : '(none yet — invent freely, but make it specific)';

  prompt = prompt
    .replace(/\{\{TOPIC\}\}/g, topicData.topic)
    .replace(/\{\{WORD_LIST\}\}/g, Array.isArray(topicData.wordList) ? topicData.wordList.join(', ') : String(topicData.wordList || ''))
    .replace(/\{\{ANGLE\}\}/g, topicData.angle || 'A precise surprise')
    .replace(/\{\{TONE\}\}/g, topicData.tone || 'thoughtful')
    .replace(/\{\{GENRE\}\}/g, topicData.genre || 'Question Essay')
    .replace(/\{\{STYLE\}\}/g, topicData.writingStyle || 'Chalkboard Lecture')
    .replace(/\{\{METHOD\}\}/g, topicData.storytellingMethod || 'Question-Answer Format')
    .replace(/\{\{DEPTH\}\}/g, topicData.depthLevel || 'Intermediate Understanding')
    .replace(/\{\{AUDIENCE\}\}/g, topicData.targetAudience || 'Curious Minds')
    .replace(/\{\{WORD_COUNT\}\}/g, String(topicData.estimatedWords || 850))
    .replace(/\{\{KEYWORDS\}\}/g, Array.isArray(topicData.keywords) ? topicData.keywords.join(', ') : String(topicData.keywords || topicData.category || 'mathematics'))
    .replace(/\{\{CONTENT_TYPE\}\}/g, topicData.type || 'article')
    .replace(/\{\{THEME\}\}/g, theme)
    .replace(/\{\{PRIOR_QUESTIONS\}\}/g, priorBlock);

  console.log('Running local Hugging Face GGUF inference…');
  let content = callHfInference(prompt);
  content = content.replace(/^\s*```html\s*\n/i, '').replace(/^\s*```\s*\n/i, '').replace(/\n\s*```\s*$/i, '');

  const title = extractTitle(content, topicData.topic);
  const question = extractQuestion(content, title);
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

  const finalContent = !content.includes('---')
    ? `<!--
---
title: "${title.replace(/"/g, '\\"')}"
date: "${now.toISOString()}"
theme: "${theme}"
topic: "${topicData.topic.replace(/"/g, '\\"')}"
question: "${question.replace(/"/g, '\\"')}"
wordCount: ${wordCount}
readingTime: ${calculateReadingTime(wordCount)}
excerpt: "A novel mathematical question grown from ${topicData.category || 'the matrix'}."
contentType: "${topicData.type || 'article'}"
generated: "hf-gguf"
model: "${model.model}"
---
-->

${content}`
    : content;

  const datePath = generateDatePath(now);
  const timestamp = generateTimestamp(now);
  const slug = generateSlug(title || topicData.topic);
  const articleDir = path.join(ARTICLES_DIR, datePath);
  const articleFile = path.join(articleDir, `${timestamp}_${slug}.html`);

  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(articleFile, finalContent);
  console.log('Article created:', articleFile);
  console.log('Question:', question);

  if (fs.existsSync(TOPIC_FILE)) {
    fs.unlinkSync(TOPIC_FILE);
  }

  return { file: articleFile, theme, question, model: model.model };
}

async function main() {
  try {
    const result = await generateArticle();
    console.log('Article generation complete:', result.file);
  } catch (error) {
    console.error('Error generating article:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateArticle };
