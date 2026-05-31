/* ========================================
   build.js — SSG Build Script
   Generates pre-rendered HTML for all pages.
   Usage: node build.js [domain]
   ======================================== */
const fs = require('fs');
const path = require('path');

const DOMAIN = process.argv[2] || 'https://unorthodoxhacks.life';
const ROOT = __dirname;

// --- Load Data ---
let CATEGORIES, ARTICLES, I18N;
try {
  const content = require('./js/content.js');
  CATEGORIES = content.CATEGORIES;
  ARTICLES = content.ARTICLES;
  console.log(`Loaded ${ARTICLES.length} articles in ${CATEGORIES.length} categories.`);
} catch (e) {
  console.error('Failed to load content.js:', e.message);
  process.exit(1);
}

// --- Helpers ---
function esc(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function baseHTML(title, desc, bodyContent, extraHead, pageType, canonicalUrl, lang, altUrl) {
  lang = lang || 'en';
  altUrl = altUrl || (lang === 'en' ? canonicalUrl.replace(/\/$/, '') + '/zh/' : canonicalUrl.replace(/\/zh\/$/, '/'));
  var htmlLang = lang === 'zh' ? 'zh-CN' : 'en';
  var ogLocale = lang === 'zh' ? 'zh_CN' : 'en_US';
  var ogAlt = lang === 'zh' ? 'en_US' : 'zh_CN';
  var enUrl = lang === 'en' ? canonicalUrl : altUrl;
  var zhUrl = lang === 'zh' ? canonicalUrl : altUrl;
  var langLabel = lang === 'en' ? '中文' : 'English';
  var siteName = 'Unorthodox Life Hacks';
  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${esc(title)} — ${siteName}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="en" href="${enUrl}">
  <link rel="alternate" hreflang="zh" href="${zhUrl}">
  <meta property="og:title" content="${esc(title)} — ${siteName}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="${pageType || 'website'}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="${ogLocale}">
  <meta property="og:locale:alternate" content="${ogAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} — ${siteName}">
  <meta name="twitter:description" content="${esc(desc)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/css/style.css">
  ${extraHead || ''}
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="logo"><span class="logo-icon">🔥</span>UnorthodoxHacks</a>
      <nav class="main-nav">
        <a href="/">Home</a>
        <a href="/category/home-genius/">Household</a>
        <a href="/category/money-dark-arts/">Money</a>
        <a href="/about.html">About</a>
      </nav>
      <a href="${altUrl.replace(DOMAIN, '')}" class="lang-switch">${langLabel}</a>
    </div>
  </header>

  <main>${bodyContent}</main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-links">
        <a href="/about.html">About</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
      </div>
      <p class="footer-copy">© 2026 Unorthodox Life Hacks. All rights reserved.</p>
    </div>
  </footer>
  <script src="/js/i18n.js"></script>
  <script src="/js/content.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

function articleJSONLD(article, ad, cat, url) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: ad.title,
    description: ad.summary,
    datePublished: article.date,
    dateModified: article.date,
    author: { '@type': 'Organization', name: 'Unorthodox Life Hacks', url: DOMAIN + '/' },
    publisher: { '@type': 'Organization', name: 'Unorthodox Life Hacks', url: DOMAIN + '/' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: ['en', 'zh'],
    about: { '@type': 'Thing', name: cat ? cat.en : '' }
  });
}

// --- Ensure directories ---
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- Generate article pages ---
function buildArticles() {
  console.log('\n--- Building Article Pages ---');
  let count = 0;
  ARTICLES.forEach(function (article) {
    var cat = CATEGORIES.find(function (c) { return c.slug === article.category; });

    // English version
    var enDir = path.join(ROOT, 'article', article.slug);
    ensureDir(enDir);
    var enBody = buildArticleBody(article, 'en', cat);
    var enJSONLD = articleJSONLD(article, article.en, cat, DOMAIN + '/article/' + article.slug + '/');
    var enHTML = baseHTML(
      article.en.title,
      article.en.summary,
      enBody,
      '<script type="application/ld+json">' + enJSONLD + '</script>',
      'article',
      DOMAIN + '/article/' + article.slug + '/',
      'en'
    );
    fs.writeFileSync(path.join(enDir, 'index.html'), enHTML, 'utf-8');
    count++;

    // Chinese version
    var zhDir = path.join(ROOT, 'article', article.slug, 'zh');
    ensureDir(zhDir);
    var zhBody = buildArticleBody(article, 'zh', cat);
    var zhJSONLD = articleJSONLD(article, article.zh, cat, DOMAIN + '/article/' + article.slug + '/zh/');
    var zhHTML = baseHTML(
      article.zh.title,
      article.zh.summary,
      zhBody,
      '<script type="application/ld+json">' + zhJSONLD + '</script>',
      'article',
      DOMAIN + '/article/' + article.slug + '/zh/',
      'zh'
    );
    fs.writeFileSync(path.join(zhDir, 'index.html'), zhHTML, 'utf-8');
    count++;

    console.log('  ' + article.slug + ' (en + zh)');
  });
  console.log('Generated ' + count + ' article pages.');
}

function buildArticleBody(article, lang, cat) {
  var ad = article[lang];
  var catName = lang === 'zh' ? (cat ? cat.zh : '') : (cat ? cat.en : '');
  var bodyContent = ad.body || '';

  // Get related articles
  var related = (article.related || []).map(function (s) {
    return ARTICLES.find(function (a) { return a.slug === s; });
  }).filter(Boolean);

  // Get prev/next
  var idx = ARTICLES.indexOf(article);
  var prev = idx > 0 ? ARTICLES[idx - 1] : null;
  var next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;

  var relatedHtml = '';
  if (related.length > 0) {
    var links = related.map(function (r) {
      var rd = lang === 'zh' ? r.zh : r.en;
      return '<a href="/article/' + r.slug + '/" class="related-link">' + esc(rd.title) + '</a>';
    }).join('');
    relatedHtml = '<div class="related-articles"><h3>' + (lang === 'zh' ? '相关妙招' : 'Related Life Hacks') + '</h3><div class="related-links">' + links + '</div></div>';
  }

  var breadcrumbHome = lang === 'zh' ? '首页' : 'Home';
  var published = lang === 'zh' ? '发布于' : 'Published';
  var readingTime = lang === 'zh' ? '分钟阅读' : 'min read';

  var navHtml = '<nav class="article-nav">';
  if (prev) {
    var pd = lang === 'zh' ? prev.zh : prev.en;
    navHtml += '<a href="/article/' + prev.slug + '/">← ' + esc(pd.title) + '</a>';
  } else { navHtml += '<span></span>'; }
  if (next) {
    var nd = lang === 'zh' ? next.zh : next.en;
    navHtml += '<a href="/article/' + next.slug + '/">' + esc(nd.title) + ' →</a>';
  } else { navHtml += '<span></span>'; }
  navHtml += '</nav>';

  return '<article class="article-page">' +
    '<nav class="breadcrumb">' +
    '<a href="/">' + breadcrumbHome + '</a><span class="sep">/</span>' +
    '<a href="/category/' + article.category + '/">' + esc(catName) + '</a><span class="sep">/</span>' +
    '<span>' + esc(ad.title) + '</span></nav>' +
    '<header class="article-header">' +
    '<span class="article-category-tag">' + esc(catName) + '</span>' +
    '<h1>' + esc(ad.title) + '</h1>' +
    '<div class="article-meta"><span>' + published + ': ' + article.date + '</span><span>~7 ' + readingTime + '</span></div>' +
    '</header>' +
    '<div class="article-body">' + bodyContent + '</div>' +
    navHtml +
    relatedHtml +
    '</article>';
}

// --- Generate category pages ---
function buildCategories() {
  console.log('\n--- Building Category Pages ---');
  var count = 0;
  CATEGORIES.forEach(function (cat) {
    var articles = ARTICLES.filter(function (a) { return a.category === cat.slug; });

    // English
    var enDir = path.join(ROOT, 'category', cat.slug);
    ensureDir(enDir);
    var enBody = buildCategoryBody(cat, articles, 'en');
    var enHTML = baseHTML(cat.en, cat.desc_en, enBody, '', 'website', DOMAIN + '/category/' + cat.slug + '/', 'en');
    fs.writeFileSync(path.join(enDir, 'index.html'), enHTML, 'utf-8');
    count++;

    // Chinese
    var zhDir = path.join(ROOT, 'category', cat.slug, 'zh');
    ensureDir(zhDir);
    var zhBody = buildCategoryBody(cat, articles, 'zh');
    var zhHTML = baseHTML(cat.zh, cat.desc_zh, zhBody, '', 'website', DOMAIN + '/category/' + cat.slug + '/zh/', 'zh');
    fs.writeFileSync(path.join(zhDir, 'index.html'), zhHTML, 'utf-8');
    count++;

    console.log('  ' + cat.slug + ' (' + articles.length + ' articles)');
  });
  console.log('Generated ' + count + ' category pages.');
}

function buildCategoryBody(cat, articles, lang) {
  var catName = lang === 'zh' ? cat.zh : cat.en;
  var catDesc = lang === 'zh' ? cat.desc_zh : cat.desc_en;
  var readingTime = lang === 'zh' ? '分钟阅读' : 'min read';
  var home = lang === 'zh' ? '首页' : 'Home';

  var cards = articles.map(function (a) {
    var ad = lang === 'zh' ? a.zh : a.en;
    return '<a href="/article/' + a.slug + '/" class="card" style="text-decoration:none;color:inherit">' +
      '<div class="card-body">' +
      '<span class="card-category">' + esc(catName) + '</span>' +
      '<h3>' + esc(ad.title) + '</h3>' +
      '<p class="card-summary">' + esc(ad.summary) + '</p>' +
      '<div class="card-meta"><span>' + a.date + '</span><span>~7 ' + readingTime + '</span></div>' +
      '</div></a>';
  }).join('');

  return '<div class="article-page">' +
    '<nav class="breadcrumb"><a href="/">' + home + '</a><span class="sep">/</span><span>' + esc(catName) + '</span></nav>' +
    '<header class="article-header">' +
    '<span class="article-category-tag">' + cat.icon + ' ' + esc(catName) + '</span>' +
    '<h1>' + esc(catName) + '</h1>' +
    '<p style="color:var(--text-secondary);font-size:1.05rem;">' + esc(catDesc) + '</p></header>' +
    '<div class="card-grid">' + cards + '</div></div>';
}

// --- Generate sitemap ---
function buildSitemap() {
  console.log('\n--- Building Sitemap ---');
  var urls = [];

  // Home
  urls.push('  <url><loc>' + DOMAIN + '/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>');

  // Articles
  ARTICLES.forEach(function (a) {
    urls.push('  <url><loc>' + DOMAIN + '/article/' + a.slug + '/</loc><lastmod>' + a.date + '</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>');
  });

  // Categories
  CATEGORIES.forEach(function (c) {
    urls.push('  <url><loc>' + DOMAIN + '/category/' + c.slug + '/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>');
  });

  var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls.join('\n') + '\n</urlset>';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf-8');
  console.log('sitemap.xml generated with ' + urls.length + ' URLs.');
}

// --- Generate robots.txt ---
function buildRobots() {
  var robots = 'User-agent: *\nAllow: /\nSitemap: ' + DOMAIN + '/sitemap.xml\n';
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf-8');
  console.log('robots.txt generated.');
}

// --- Check images ---
function checkImages() {
  var imgDir = path.join(ROOT, 'image');
  if (!fs.existsSync(imgDir)) return;
  console.log('\n--- Image Check ---');
  var files = fs.readdirSync(imgDir);
  files.forEach(function (f) {
    var fp = path.join(imgDir, f);
    var stat = fs.statSync(fp);
    var kb = stat.size / 1024;
    if (kb > 300) {
      console.warn('  ⚠ ' + f + ' is ' + Math.round(kb) + 'KB — exceeds 300KB limit. Consider compressing.');
    }
  });
}

// --- Main ---
console.log('Evil Cultivation Life Hacks — SSG Build');
console.log('Domain: ' + DOMAIN);
console.log('Output: ' + ROOT);

buildArticles();
buildCategories();
buildSitemap();
buildRobots();
checkImages();

console.log('\n✅ Build complete!');
console.log('  Articles: ' + ARTICLES.length);
console.log('  Categories: ' + CATEGORIES.length);
console.log('  Total pages generated: ' + (ARTICLES.length * 2 + CATEGORIES.length * 2 + 1));
