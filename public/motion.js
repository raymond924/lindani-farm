/* Lindani Farm: motion, modelled on graftonsafaris.com.
   - Smooth scrolling (Lenis, assets/vendor/lenis.min.js)
   - Headings rise word by word from behind a mask
   - Text and cards fade up as they arrive; photos open out and settle from a zoom
   - The hero photo drifts slower than the page; the nav steps aside when scrolling down
   - Button labels roll on hover; the footer slides up over the closing panel
   Everything is skipped when the visitor prefers reduced motion. The inline script in
   <head> adds html.mo before first paint and removes it if this file never runs. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('mo')) return;
  window.LINDANI_MOTION = true;
  var EASE_IN_VIEW = 0.12;

  function $$(sel, ctx) { return [].slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- smooth scrolling ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({
      autoRaf: true, lerp: 0.1, smoothWheel: true,
      anchors: { offset: -96 },
      // let panels with their own scroll (concierge, calendar, menus, dialogs, grids) scroll natively
      prevent: function (node) { return !!(node.closest && node.closest('.fx-panel, [class*="dp-"], dialog, .ag-scroll, .ad-occ, .nav-links, [data-lenis-prevent]')); }
    });
    window.LINDANI_LENIS = lenis;
  }

  /* ---------- headings: words rise from behind a mask ---------- */
  function splitWords(h) {
    if (h.getAttribute('data-split')) return;
    h.setAttribute('data-split', '1');
    var words = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span'), i = document.createElement('span');
            w.className = 'w'; i.className = 'wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w); words.push(i);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(BR|SVG|IMG)$/i.test(n.tagName)) walk(n);
      });
    })(h);
    words.forEach(function (w, k) { w.style.transitionDelay = Math.min(k * 0.04, 0.4) + 's'; });
    h.classList.add('split');
  }

  /* ---------- what reveals ---------- */
  var heads = $$('main h1, main h2').filter(function (h) { return !h.closest('.hero, .fx-panel, dialog, .sr, [hidden]') && !h.classList.contains('sr'); });
  heads.forEach(splitWords);

  var SKIP = 'form, .hero, .fx-panel, dialog, #avail-out, .ag-scroll, .summary-card, .stack, [hidden], details p, .split, .tips-list a *';
  var fadeSel = 'main section :is(p, li, dl, details, figure, blockquote, .circle-link, .list-panel, .btn, .rates-list, .quick-card form, .tip, .steps li)';
  var fades = $$(fadeSel).filter(function (e) {
    if (e.closest(SKIP) && !e.matches('.quick-card form')) return false;
    if (e.tagName === 'FIGURE') return false;               // photos get their own reveal
    return true;
  });
  // only the outermost element of each group fades, so nothing fades twice
  fades = fades.filter(function (e) { return !fades.some(function (o) { return o !== e && o.contains(e); }); });
  fades.forEach(function (e) { e.classList.add('rv'); });

  var imgs = $$('main section figure, .gallery li').filter(function (f) { return !f.closest('.hero, .fx-panel, dialog, .summary-card') && f.querySelector('img'); });
  imgs.forEach(function (f) { f.classList.add('rv-img'); });

  // photos wait until they've loaded, so they never pop in half-drawn
  function show(t) {
    var img = t.classList.contains('rv-img') && t.querySelector('img');
    if (img && !(img.complete && img.naturalWidth)) {
      img.addEventListener('load', function () { t.classList.add('in'); }, { once: true });
      img.addEventListener('error', function () { t.classList.add('in'); }, { once: true });
      return;
    }
    t.classList.add('in');
  }

  // stagger siblings that arrive together
  var io = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (en) { return en.isIntersecting; }).map(function (en) { return en.target; });
    batch.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top - rb.top) || (ra.left - rb.left); });
    batch.forEach(function (t, i) {
      if (!t.classList.contains('split')) t.style.transitionDelay = Math.min(i * 0.06, 0.36) + 's';
      show(t);
      io.unobserve(t);
      // clear the delay afterwards so hover transitions stay snappy
      setTimeout(function () { if (!t.classList.contains('split')) t.style.transitionDelay = ''; }, 1600 + i * 80);
    });
  }, { rootMargin: '0px 0px -' + Math.round(EASE_IN_VIEW * 100) + '% 0px', threshold: 0 });
  // anything already on screen at load arrives straight away; the rest waits for its turn
  var first = [];
  heads.concat(fades, imgs).forEach(function (e) {
    var r = e.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && r.width) first.push(e); else io.observe(e);
  });
  first.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
  first.forEach(function (t, i) {
    if (!t.classList.contains('split')) t.style.transitionDelay = (0.1 + Math.min(i * 0.06, 0.36)) + 's';
    requestAnimationFrame(function () { requestAnimationFrame(function () { show(t); }); });
  });

  /* ---------- hero: text arrives, photo drifts ---------- */
  var hero = document.querySelector('.hero'), heroImg = hero && hero.querySelector(':scope > img');
  root.classList.add('mo-on');

  /* ---------- nav steps aside on the way down, returns on the way up ---------- */
  var nav = document.getElementById('nav'), links = document.getElementById('nav-links'), lastY = scrollY;

  /* ---------- footer slides over the closing panel ---------- */
  var footer = document.querySelector('.footer');
  var closer = footer && document.querySelector('main > section:last-of-type.enquire, main > .enquire:last-child');
  if (closer) closer.classList.add('closer');

  var ticking = false;
  function frame() {
    ticking = false;
    var y = scrollY, vh = innerHeight;
    if (heroImg) {
      var hb = hero.getBoundingClientRect().bottom;
      if (hb > 0) heroImg.style.translate = '0 ' + Math.round(Math.min(y, vh) * 0.22) + 'px';
    }
    if (nav) {
      var open = links && links.classList.contains('open');
      var busy = open || nav.contains(document.activeElement);
      if (busy || y < 300 || y < lastY - 6) nav.classList.remove('nav-away');
      else if (y > lastY + 6) nav.classList.add('nav-away');
      if (Math.abs(y - lastY) > 6) lastY = y;
    }
    if (closer) {
      var into = vh - footer.getBoundingClientRect().top;
      closer.style.translate = into > 0 ? '0 ' + Math.round(Math.min(into, footer.offsetHeight) * 0.2) + 'px' : '';
    }
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  frame();

  /* ---------- button labels roll on hover ---------- */
  function roll(btn) {
    if (btn.querySelector('.roll')) return;
    var host = btn.querySelector(':scope > span[data-i18n]') || btn;
    var tn = [].slice.call(host.childNodes).filter(function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
    if (!tn) return;
    var label = tn.textContent.trim();
    var r = document.createElement('span'); r.className = 'roll';
    var a = document.createElement('span'); a.className = 'roll-a'; a.textContent = label;
    var b = document.createElement('span'); b.className = 'roll-b'; b.textContent = label; b.setAttribute('aria-hidden', 'true');
    r.appendChild(a); r.appendChild(b);
    host.replaceChild(r, tn);
  }
  function rollAll() { $$('.btn, .fx-btn-book').forEach(roll); }
  rollAll();
  // the language switcher rewrites labels: roll them again afterwards
  $$('select[data-lang]').forEach(function (s) { s.addEventListener('change', function () { setTimeout(rollAll, 0); }); });
})();
