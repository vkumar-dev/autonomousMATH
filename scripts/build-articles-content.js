#!/usr/bin/env node

/**
 * Build Articles Content Cache
 * Caches article content alongside metadata for reliable client-side loading
 */

const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '..', 'articles');
const CONTENT_CACHE_FILE = path.join(__dirname, '..', 'articles-content.json');

function readArticleContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}:`, error.message);
    return null;
  }
}

function buildArticlesContent() {
  const contentCache = {};
  
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.log('Articles directory does not exist');
    fs.writeFileSync(CONTENT_CACHE_FILE, JSON.stringify(contentCache, null, 2));
    return;
  }

  // Recursively find all .md files
  function walkDir(dir) {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (stat.isFile() && (entry.endsWith('.md') || entry.endsWith('.html'))) {
        const relativePath = path.relative(ARTICLES_DIR, fullPath);
        const content = readArticleContent(fullPath);
        
        if (content) {
          contentCache[relativePath] = content;
        }
      }
    }
  }
  
  walkDir(ARTICLES_DIR);
  
  // Write content cache
  fs.writeFileSync(CONTENT_CACHE_FILE, JSON.stringify(contentCache, null, 2));
  
  console.log(`✅ Articles content cached: ${Object.keys(contentCache).length} articles`);
}

if (require.main === module) {
  buildArticlesContent();
}

module.exports = { buildArticlesContent };
