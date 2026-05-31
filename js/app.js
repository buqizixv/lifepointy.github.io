/* ========================================
   app.js — Router, SPA, i18n, Meta Tags, JSON-LD
   ======================================== */
(function () {
  'use strict';

  // --- State ---
  let currentLang = localStorage.getItem('lang') || 'en';
  let currentRoute = null; // 'home' | 'article' | 'category'

  // --- Helpers ---
  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || key;
  }

  function getArticleBySlug(slug) {
    return ARTICLES.find(function (a) { return a.slug === slug; });
  }

  function getCategoryBySlug(slug) {
    return CATEGORIES.find(function (c) { return c.slug === slug; });
  }

  function getArticlesByCategory(slug) {
    return ARTICLES.filter(function (a) { return a.category === slug; });
  }

  function getRelatedArticles(article) {
    if (!article || !article.related) return [];
    return article.related.map(function (s) { return getArticleBySlug(s); }).filter(Boolean);
  }

  // --- Language ---
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    var toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.textContent = t('lang_switch');
  }

  function switchLang() {
    setLang(currentLang === 'en' ? 'zh' : 'en');
    // Re-render current page
    var hash = window.location.hash;
    if (hash) {
      var slug = hash.replace('#/', '').replace('#', '');
      routeFromHash();
    } else {
      var path = window.location.pathname;
      if (path.indexOf('/article/') !== -1) {
        var articleSlug = path.split('/article/')[1].replace(/\/$/, '').split('/')[0];
        renderArticlePage(articleSlug);
      } else if (path.indexOf('/category/') !== -1) {
        var catSlug = path.split('/category/')[1].replace(/\/$/, '').split('/')[0];
        renderCategoryPage(catSlug);
      } else {
        renderHomePage();
      }
    }
    updateLangLinks();
  }

  // --- Meta Tags ---
  function updateMetaTags(opts) {
    opts = opts || {};
    var title = opts.title || t('site_name') + ' — ' + t('site_tagline');
    var desc = opts.desc || t('site_tagline');
    var url = opts.url || window.location.origin + '/';
    var image = opts.image || '';
    var type = opts.type || 'website';
    var keywords = opts.keywords || '';

    document.title = title;

    setMeta('meta-desc', 'content', desc);
    setMeta('meta-keywords', 'content', keywords);
    setMeta('meta-canonical', 'href', url);
    setMeta('meta-og-title', 'content', title);
    setMeta('meta-og-desc', 'content', desc);
    setMeta('meta-og-type', 'content', type);
    setMeta('meta-og-url', 'content', url);
    setMeta('meta-og-image', 'content', image);
    setMeta('meta-tw-title', 'content', title);
    setMeta('meta-tw-desc', 'content', desc);
    setMeta('meta-tw-image', 'content', image);

    if (document.getElementById('json-ld')) {
      document.getElementById('json-ld').remove();
    }
    if (opts.jsonld) {
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'json-ld';
      script.textContent = JSON.stringify(opts.jsonld);
      document.head.appendChild(script);
    }
  }

  function setMeta(id, attr, value) {
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }

  function updateLangLinks() {
    var url = window.location.href.split('?')[0];
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    var enUrl = url + sep + 'lang=en';
    var zhUrl = url + sep + 'lang=zh';
    setMeta('meta-hreflang-en', 'href', enUrl);
    setMeta('meta-hreflang-zh', 'href', zhUrl);
    setMeta('meta-og-locale', 'content', currentLang === 'zh' ? 'zh_CN' : 'en_US');
    setMeta('meta-og-locale-alt', 'content', currentLang === 'zh' ? 'en_US' : 'zh_CN');
  }

  // --- Render: Home Page ---
  function renderHomePage() {
    currentRoute = 'home';
    var main = document.getElementById('main-content');
    if (!main) return;

    updateMetaTags({
      title: t('site_name') + ' — ' + t('site_tagline'),
      desc: t('hero_sub'),
      type: 'website',
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Evil Cultivation Life Hacks',
        description: t('site_tagline'),
        url: window.location.origin + '/',
        inLanguage: ['en', 'zh']
      }
    });

    var catHtml = CATEGORIES.map(function (cat) {
      var name = currentLang === 'zh' ? cat.zh : cat.en;
      var desc = currentLang === 'zh' ? cat.desc_zh : cat.desc_en;
      var count = getArticlesByCategory(cat.slug).length;
      return '<a href="/category/' + cat.slug + '/" class="category-card">' +
        '<span class="category-icon">' + cat.icon + '</span>' +
        '<span class="category-name">' + name + '</span>' +
        '<span class="category-count">' + count + ' ' + t('category_count_suffix') + '</span>' +
        '</a>';
    }).join('');

    var articlesHtml = ARTICLES.map(function (a) {
      var ad = currentLang === 'zh' ? a.zh : a.en;
      var cat = getCategoryBySlug(a.category);
      var catName = currentLang === 'zh' ? (cat ? cat.zh : '') : (cat ? cat.en : '');
      return '<a href="/article/' + a.slug + '/" class="card" style="text-decoration:none;color:inherit">' +
        '<div class="card-body">' +
        '<span class="card-category">' + catName + '</span>' +
        '<h3>' + ad.title + '</h3>' +
        '<p class="card-summary">' + ad.summary + '</p>' +
        '<div class="card-meta"><span>' + a.date + '</span><span>~7 ' + t('reading_time') + '</span></div>' +
        '</div></a>';
    }).join('');

    var html = '<section class="hero">' +
      '<div class="hero-inner">' +
      '<span class="hero-badge">' + t('hero_badge') + '</span>' +
      '<h1>' + t('hero_title') + '</h1>' +
      '<p class="hero-sub">' + t('hero_sub') + '</p>' +
      '<div class="hero-cta">' +
      '<a href="#" class="btn btn-accent btn-lg" id="hero-browse-btn">' + t('hero_cta_primary') + '</a>' +
      '<a href="/category/home-genius/" class="btn btn-ghost btn-lg">' + t('hero_cta_secondary') + '</a>' +
      '</div>' +
      '<div class="hero-stats">' +
      '<div class="stat"><strong>' + t('hero_stat_1') + '</strong><span>' + t('hero_stat_1_label') + '</span></div>' +
      '<div class="stat"><strong>' + t('hero_stat_2') + '</strong><span>' + t('hero_stat_2_label') + '</span></div>' +
      '<div class="stat"><strong>' + t('hero_stat_3') + '</strong><span>' + t('hero_stat_3_label') + '</span></div>' +
      '</div></div></section>' +

      '<section class="section" id="categories">' +
      '<div class="section-inner">' +
      '<div class="section-header"><h2>' + t('section_categories') + '</h2><p>' + t('section_categories_sub') + '</p></div>' +
      '<div class="category-grid">' + catHtml + '</div></div></section>' +

      '<section class="section" id="all-hacks">' +
      '<div class="section-inner">' +
      '<div class="section-header"><h2>' + t('section_all') + '</h2><p>' + t('section_all_sub') + '</p></div>' +
      '<div class="filter-bar">' +
      '<input type="text" class="filter-input" id="filter-input" placeholder="' + t('filter_placeholder') + '">' +
      '<select class="filter-select" id="filter-category">' +
      '<option value="">' + t('filter_all') + '</option>' +
      CATEGORIES.map(function (c) { return '<option value="' + c.slug + '">' + (currentLang === 'zh' ? c.zh : c.en) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="card-grid" id="card-grid">' + articlesHtml + '</div></div></section>' +

      '<section class="cta-section">' +
      '<h2>' + t('cta_title') + '</h2>' +
      '<p>' + t('cta_sub') + '</p>' +
      '<a href="/category/home-genius/" class="btn btn-accent btn-lg">' + t('cta_button') + '</a></section>';

    main.innerHTML = html;

    // Scroll button (no hash)
    var browseBtn = document.getElementById('hero-browse-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.getElementById('all-hacks');
        if (target) { target.scrollIntoView({ behavior: 'smooth' }); }
      });
    }

    // Filter functionality
    var filterInput = document.getElementById('filter-input');
    var filterCategory = document.getElementById('filter-category');
    if (filterInput && filterCategory) {
      filterInput.addEventListener('input', filterArticles);
      filterCategory.addEventListener('change', filterArticles);
    }
  }

  function filterArticles() {
    var query = (document.getElementById('filter-input')?.value || '').toLowerCase();
    var cat = document.getElementById('filter-category')?.value || '';
    var cards = document.querySelectorAll('#card-grid .card');

    cards.forEach(function (card) {
      var text = card.textContent.toLowerCase();
      var cardCat = card.querySelector('.card-category')?.textContent || '';
      var matchSearch = !query || text.indexOf(query) !== -1;
      var matchCat = !cat || card.getAttribute('data-category') === cat;
      card.style.display = matchSearch && matchCat ? '' : 'none';
    });

    // Set data-category attributes on first render
    if (!cards[0]?.getAttribute('data-category')) {
      ARTICLES.forEach(function (a, i) {
        if (cards[i]) cards[i].setAttribute('data-category', a.category);
      });
    }
  }

  // --- Render: Article Page ---
  function renderArticlePage(slug) {
    currentRoute = 'article';
    var main = document.getElementById('main-content');
    if (!main) return;

    var article = getArticleBySlug(slug);
    if (!article) {
      main.innerHTML = '<div class="article-page"><div class="no-results"><p>Article not found.</p></div></div>';
      return;
    }

    var ad = currentLang === 'zh' ? article.zh : article.en;
    var cat = getCategoryBySlug(article.category);
    var catName = currentLang === 'zh' ? (cat ? cat.zh : '') : (cat ? cat.en : '');
    var related = getRelatedArticles(article);
    var bodyContent = ad.body || '';

    updateMetaTags({
      title: ad.title + ' — ' + t('site_name'),
      desc: ad.summary,
      url: window.location.origin + '/article/' + slug + '/',
      type: 'article',
      keywords: currentLang === 'zh' ? article.keywords_zh : article.keywords_en,
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: ad.title,
        description: ad.summary,
        datePublished: article.date,
        dateModified: article.date,
        author: { '@type': 'Organization', name: 'Evil Cultivation Life Hacks', url: window.location.origin + '/' },
        publisher: { '@type': 'Organization', name: 'Evil Cultivation Life Hacks', url: window.location.origin + '/' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.origin + '/article/' + slug + '/' },
        inLanguage: [currentLang],
        about: { '@type': 'Thing', name: catName }
      }
    });

    // Find prev/next articles
    var idx = ARTICLES.indexOf(article);
    var prev = idx > 0 ? ARTICLES[idx - 1] : null;
    var next = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;

    var relatedHtml = '';
    if (related.length > 0) {
      relatedHtml = '<div class="related-articles"><h3>' + t('related_title') + '</h3><div class="related-links">' +
        related.map(function (r) {
          var rd = currentLang === 'zh' ? r.zh : r.en;
          return '<a href="/article/' + r.slug + '/" class="related-link" data-nav>' + rd.title + '</a>';
        }).join('') + '</div></div>';
    }

    var navHtml = '<nav class="article-nav">';
    if (prev) {
      var pd = currentLang === 'zh' ? prev.zh : prev.en;
      navHtml += '<a href="/article/' + prev.slug + '/" data-nav>← ' + pd.title + '</a>';
    } else {
      navHtml += '<span></span>';
    }
    if (next) {
      var nd = currentLang === 'zh' ? next.zh : next.en;
      navHtml += '<a href="/article/' + next.slug + '/" data-nav>' + nd.title + ' →</a>';
    } else {
      navHtml += '<span></span>';
    }
    navHtml += '</nav>';

    var html = '<article class="article-page">' +
      '<nav class="breadcrumb">' +
      '<a href="/" data-nav>' + t('breadcrumb_home') + '</a><span class="sep">/</span>' +
      '<a href="/category/' + article.category + '/" data-nav>' + catName + '</a><span class="sep">/</span>' +
      '<span>' + ad.title + '</span></nav>' +
      '<header class="article-header">' +
      '<span class="article-category-tag">' + catName + '</span>' +
      '<h1>' + ad.title + '</h1>' +
      '<div class="article-meta"><span>' + t('published') + ': ' + article.date + '</span><span>~7 ' + t('reading_time') + '</span></div>' +
      '</header>' +
      '<div class="article-body">' + bodyContent + '</div>' +
      navHtml +
      relatedHtml +
      '</article>';

    main.innerHTML = html;

    // Re-bind filter for home page
    ensureFilterBound();
  }

  // --- Render: Category Page ---
  function renderCategoryPage(slug) {
    currentRoute = 'category';
    var main = document.getElementById('main-content');
    if (!main) return;

    var cat = getCategoryBySlug(slug);
    if (!cat) {
      main.innerHTML = '<div class="article-page"><div class="no-results"><p>Category not found.</p></div></div>';
      return;
    }

    var catName = currentLang === 'zh' ? cat.zh : cat.en;
    var catDesc = currentLang === 'zh' ? cat.desc_zh : cat.desc_en;
    var articles = getArticlesByCategory(slug);

    updateMetaTags({
      title: catName + ' — ' + t('site_name'),
      desc: catDesc,
      url: window.location.origin + '/category/' + slug + '/',
      type: 'website'
    });

    var cardsHtml = articles.map(function (a) {
      var ad = currentLang === 'zh' ? a.zh : a.en;
      return '<a href="/article/' + a.slug + '/" class="card" style="text-decoration:none;color:inherit">' +
        '<div class="card-body">' +
        '<span class="card-category">' + catName + '</span>' +
        '<h3>' + ad.title + '</h3>' +
        '<p class="card-summary">' + ad.summary + '</p>' +
        '<div class="card-meta"><span>' + a.date + '</span><span>~7 ' + t('reading_time') + '</span></div>' +
        '</div></a>';
    }).join('');

    var html = '<div class="article-page">' +
      '<nav class="breadcrumb">' +
      '<a href="/" data-nav>' + t('breadcrumb_home') + '</a><span class="sep">/</span>' +
      '<span>' + catName + '</span></nav>' +
      '<header class="article-header">' +
      '<span class="article-category-tag">' + cat.icon + ' ' + catName + '</span>' +
      '<h1>' + catName + '</h1>' +
      '<p style="color:var(--text-secondary);font-size:1.05rem;">' + catDesc + '</p>' +
      '</header>' +
      '<div class="card-grid">' + cardsHtml + '</div>' +
      '</div>';

    main.innerHTML = html;
  }

  function ensureFilterBound() {
    // No-op on article pages; filter only on home
  }

  // --- Routing ---
  function routeFromHash() {
    var hash = window.location.hash;
    if (hash.startsWith('#/article/')) {
      var slug = hash.replace('#/article/', '').replace(/\/$/, '');
      renderArticlePage(slug);
    } else if (hash.startsWith('#/category/')) {
      var catSlug = hash.replace('#/category/', '').replace(/\/$/, '');
      renderCategoryPage(catSlug);
    } else {
      renderHomePage();
    }
  }

  function navigateTo(url) {
    history.pushState(null, '', url);
    handleCurrentRoute();
    window.scrollTo(0, 0);
  }

  function handleCurrentRoute() {
    var path = window.location.pathname;
    if (path.indexOf('/article/') !== -1) {
      var slug = path.split('/article/')[1].replace(/\/$/, '').split('/')[0];
      renderArticlePage(slug);
    } else if (path.indexOf('/category/') !== -1) {
      var catSlug = path.split('/category/')[1].replace(/\/$/, '').split('/')[0];
      renderCategoryPage(catSlug);
    } else {
      renderHomePage();
    }
    updateLangLinks();
  }

  // --- Click Handling (SPA interception) ---
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-nav]');
    if (!link) return;
    e.preventDefault();
    var href = link.getAttribute('href');
    if (href && href !== '#') {
      navigateTo(href);
    }
  });

  // --- History ---
  window.addEventListener('popstate', function () {
    handleCurrentRoute();
  });

  // --- Cookie Consent ---
  function initCookieConsent() {
    if (localStorage.getItem('cookie-consent')) return;
    var banner = document.getElementById('cookie-consent');
    if (!banner) return;
    banner.style.display = 'block';
    var btn = document.getElementById('cookie-accept');
    if (btn) {
      btn.addEventListener('click', function () {
        localStorage.setItem('cookie-consent', '1');
        banner.style.display = 'none';
      });
    }
  }

  // --- Mobile Menu ---
  function initMobileMenu() {
    var toggle = document.getElementById('menu-toggle');
    var nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  // --- Init ---
  function init() {
    // Set initial language
    setLang(currentLang);

    // Check if page has pre-rendered content (SSG pages)
    var main = document.getElementById('main-content');
    var hasPreRendered = main && main.querySelector('.article-page');

    // Render based on current URL
    var path = window.location.pathname;
    if (path.indexOf('/article/') !== -1 || path.indexOf('/category/') !== -1) {
      // If content is already pre-rendered, skip re-render and just enable SPA for subsequent clicks
      if (hasPreRendered) {
        // Update lang links only; content is already in the HTML
        updateLangLinks();
      } else {
        handleCurrentRoute();
      }
    } else {
      var hash = window.location.hash;
      if (hash && (hash.startsWith('#/article/') || hash.startsWith('#/category/'))) {
        // Redirect hash URL to clean URL
        var cleanPath = hash.replace('#', '');
        history.replaceState(null, '', cleanPath);
        handleCurrentRoute();
      } else {
        renderHomePage();
      }
    }

    // Event listeners
    var langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', switchLang);
    }

    initCookieConsent();
    initMobileMenu();
    updateLangLinks();
  }

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
