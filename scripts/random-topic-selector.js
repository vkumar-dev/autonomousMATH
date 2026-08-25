#!/usr/bin/env node

/**
 * Random Math Generator (Matrix Edition)
 * Picks one value from each matrix dimension plus a word list.
 * The model later ponders these seeds and invents a novel question.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'random-blog-generator-config.json');
const TOPIC_OUTPUT = path.join(__dirname, '..', 'selected-topic.json');
const INDEX_FILE = path.join(__dirname, '..', 'articles-index.json');

// Keep mathematical vocabulary aligned with the selected category. The fallback
// remains available for new categories, but unrelated word-list/category pairs
// are now strongly discouraged.
const FAMILY_HINTS = [
  [['prime', 'number', 'analytic', 'arithmetic', 'continued fraction'], ['prime', 'gap', 'sieve', 'infinity', 'density']],
  [['geometry', 'topology', 'manifold', 'knot', 'tiling', 'fractal'], ['manifold', 'curvature', 'geodesic', 'tangent', 'metric']],
  [['algebra', 'group', 'ring', 'field', 'module', 'category', 'representation'], ['group', 'homomorphism', 'kernel', 'quotient', 'action']],
  [['analysis', 'measure', 'fourier', 'function', 'operator', 'differential', 'dynamical', 'ergodic'], ['limit', 'epsilon', 'sequence', 'compact', 'complete']],
  [['graph', 'combinatorics', 'ramsey', 'spectral', 'percolation'], ['graph', 'eigenvalue', 'spectrum', 'walk', 'cut']],
  [['probability', 'stochastic', 'statistics', 'random', 'information', 'entropy', 'coding'], ['probability', 'expectation', 'martingale', 'tail', 'concentration']],
  [['logic', 'set', 'model', 'proof', 'recursion', 'gödel', 'constructive'], ['proof', 'axiom', 'model', 'consistency', 'undecidable']],
  [['algorithm', 'complexity', 'cryptography', 'optimization', 'programming'], ['algorithm', 'complexity', 'reduction', 'oracle', 'hardness']]
];

function recentTopics() {
  try {
    const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    return (index.articles || []).slice(0, 60).map((article) =>
      `${article.category || ''} ${article.topic || ''} ${article.title || ''}`.toLowerCase());
  } catch (_) { return []; }
}

function wordListScore(category, words) {
  const text = category.toLowerCase();
  const wordText = words.join(' ').toLowerCase();
  const family = FAMILY_HINTS.find(([hints]) => hints.some((hint) => text.includes(hint)));
  if (!family) return 0.25;
  return family[1].some((word) => wordText.includes(word.split(' ')[0])) ? 1 : 0;
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomTopic() {
  const config = loadConfig();

  const category = pickRandom(config.categories);
  const wordLists = config.wordLists || [[category.toLowerCase()]];
  const rankedLists = wordLists
    .map((words) => ({ words, score: wordListScore(category, words) + Math.random() * 0.15 }))
    .sort((a, b) => b.score - a.score);
  const wordList = pickRandom(rankedLists.slice(0, Math.max(1, Math.ceil(rankedLists.length * 0.3))).map((item) => item.words));
  const genre = pickRandom(config.genres);
  const style = pickRandom(config.writingStyles);
  const method = pickRandom(config.storytellingMethods);
  const perspective = pickRandom(config.perspectives);
  const depth = pickRandom(config.depthLevels);
  const audience = pickRandom(config.targetAudiences);
  const angleSelection = pickRandom(config.angles);

  const templates = [
    `${category}: a ${perspective.toLowerCase()} question`,
    `Pondering ${category} through ${wordList.slice(0, 3).join(', ')}`,
    `A ${genre.toLowerCase()} in ${category}`,
    `What ${category} still cannot answer`,
    `The ${perspective.toLowerCase()} side of ${category}`,
    `${category} and the words ${wordList[0]}, ${wordList[1]}`,
    `An open-looking question in ${category}`,
    `Rethinking ${category} from a ${perspective.toLowerCase()} stance`,
    `${wordList[0]} meets ${category}`,
    `A small question with large ${category} shadows`
  ];

  const history = recentTopics();
  const candidates = templates.filter((template) => {
    const signature = `${category} ${wordList.slice(0, 3).join(' ')} ${template}`.toLowerCase();
    return !history.some((old) => signature.split(/\s+/).filter((token) => token.length > 4).filter((token) => old.includes(token)).length >= 4);
  });
  const selectedTopic = pickRandom(candidates.length ? candidates : templates);

  const wordCountMap = {
    'Introduction to Basics': 700,
    'Intermediate Understanding': 900,
    'Advanced Exploration': 1100,
    'Expert Deep Dive': 1200,
    'Popular Mathematics': 800,
    'Thought Experiment': 900,
    'Olympiad Flavor': 800,
    'Research Adjacent': 1000
  };

  const estimatedWords = wordCountMap[depth] || 850;

  return {
    topic: selectedTopic,
    category,
    wordList,
    genre,
    writingStyle: style,
    storytellingMethod: method,
    perspective,
    depthLevel: depth,
    targetAudience: audience,
    angle: angleSelection,
    tone: style.toLowerCase().includes('humorous') ? 'humorous'
      : style.toLowerCase().includes('formal') ? 'formal'
        : style.toLowerCase().includes('casual') ? 'casual' : 'thoughtful',
    type: genre,
    keywords: [category, perspective, genre, ...wordList.slice(0, 3)],
    estimatedWords
    ,selection: { wordListAlignment: wordListScore(category, wordList), historySize: history.length }
  };
}

try {
  const topic = generateRandomTopic();

  console.log('π  Matrix seed selection complete:');
  console.log(`   Topic: ${topic.topic}`);
  console.log(`   Category: ${topic.category}`);
  console.log(`   Word list: ${topic.wordList.join(', ')}`);
  console.log(`   Genre: ${topic.genre}`);
  console.log(`   Perspective: ${topic.perspective}`);
  console.log(`   Audience: ${topic.targetAudience}`);

  fs.writeFileSync(TOPIC_OUTPUT, JSON.stringify(topic, null, 2));
} catch (error) {
  console.error('Error generating random topic:', error.message);
  process.exit(1);
}
