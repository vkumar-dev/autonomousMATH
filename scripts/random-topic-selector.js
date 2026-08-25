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

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomTopic() {
  const config = loadConfig();

  const category = pickRandom(config.categories);
  const wordList = pickRandom(config.wordLists || [[category.toLowerCase()]]);
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

  const selectedTopic = pickRandom(templates);

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
