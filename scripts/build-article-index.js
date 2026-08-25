#!/usr/bin/env node

/**
 * Build Article Index
 * Scans all articles and creates a JSON index for fast loading
 * Run this during deployment
 */

const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '..', 'articles');
const INDEX_FILE = path.join(__dirname, '..', 'articles-index.json');

/**
 * Extract frontmatter from content
 */
function extractFrontmatter(content) {
  // Handle markdown code fences or html code fences
  let cleanContent = content
    .replace(/^\s*```(?:markdown|html)?\s*\n/i, '')
    .replace(/^\s*```\s*\n/i, '');
  
  // Look for frontmatter in standard --- block or <!-- --- block
  const match = cleanContent.match(/^(?:<!--\s*\n)?---\n([\s\S]*?)\n---(?:\n\s*-->)?/);
  if (!match) return null;
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    
    // Remove quotes
    value = value.replace(/^["']|["']$/g, '');
    
    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim().replace(/["']/g, ''));
    }
    
    // Parse numbers
    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }
    
    frontmatter[key] = value;
  }
  
  return frontmatter;
}

/**
 * Extract ISO date from article filename
 * Filenames follow: YYYY-MM-DD-HH-mm-ss_slug.(md|html)
 * Returns UTC ISO string — always use filename, NOT frontmatter, for dates
 */
function dateFromFilename(filename) {
  const match = filename.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, min, sec] = match;
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +min, +sec));
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Extract excerpt from content
 */
function extractExcerpt(content, frontmatter) {
  if (frontmatter && frontmatter.excerpt) {
    return frontmatter.excerpt;
  }
  
  // Clean content
  let cleanContent = content
    .replace(/^\s*```(?:markdown|html)?\s*\n/i, '')
    .replace(/^\s*```\s*\n/i, '');
  
  // Remove frontmatter (both formats)
  const withoutFrontmatter = cleanContent.replace(/^(?:<!--\s*\n)?---\n[\s\S]*?\n---(?:\n\s*-->)?\n/, '');
  
  // If HTML, strip tags for excerpt
  let textOnly = withoutFrontmatter;
  if (withoutFrontmatter.includes('<')) {
    textOnly = withoutFrontmatter.replace(/<[^>]*>/g, ' ');
  }

  // Get first non-empty block
  const lines = textOnly.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 20) {
      // Truncate to 150 characters
      if (trimmed.length > 150) {
        return trimmed.slice(0, 147) + '...';
      }
      return trimmed;
    }
  }
  
  return 'Click to read more...';
}

/**
 * Build article index
 */
function buildArticleIndex() {
  const articles = [];
  
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.log('Articles directory does not exist yet');
    writeIndex({ articles, lastBuilt: new Date().toISOString() });
    return;
  }
  
  function scanDirectory(dir, relativePath = '') {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, path.join(relativePath, file));
      } else if (file.endsWith('.md') || file.endsWith('.html')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const frontmatter = extractFrontmatter(content);

        if (frontmatter && frontmatter.title) {
          const articlePath = path.join(relativePath, file).replace(/\\/g, '/');
          const dateFromName = dateFromFilename(file);

          articles.push({
            title: frontmatter.title,
            date: dateFromName || frontmatter.date || new Date(0).toISOString(),
            theme: frontmatter.theme || 'default',
            topic: frontmatter.topic || '',
            contentType: frontmatter.contentType || 'article',
            excerpt: extractExcerpt(content, frontmatter),
            readingTime: frontmatter.readingTime || 5,
            wordCount: frontmatter.wordCount || 0,
            keywords: frontmatter.keywords || [],
            path: articlePath
          });
        }
      }
    }
  }
  
  scanDirectory(ARTICLES_DIR);
  
  // Sort by date descending
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const index = {
    articles,
    total: articles.length,
    lastBuilt: new Date().toISOString()
  };
  
  writeIndex(index);
  console.log(`Article index built: ${articles.length} articles`);
  
  return index;
}

/**
 * Write index to file
 */
function writeIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Run if called directly
if (require.main === module) {
  buildArticleIndex();
}

module.exports = { buildArticleIndex };
