/* Lindani Farm: on-page features.
   Booking concierge, availability checker, booking request, book-direct note
   and language switcher. Content comes from lodge-data.js (window.LODGE).
   On the live site, confirmed bookings from the dashboard arrive as
   window.LODGE_LIVE (api/availability.js) and booking requests are saved
   through /api/booking. Without those, everything still works from the data file. */
(function () {
  'use strict';
  var D = window.LODGE;
  if (!D) return;
  if (window.LODGE_LIVE && Array.isArray(window.LODGE_LIVE.booked)) D.booked = D.booked.concat(window.LODGE_LIVE.booked);

  /* ---------- small helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); };
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;            // only ever used with text from lodge-data.js
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  var money = (function () {
    var f;
    try { f = new Intl.NumberFormat(D.currency.locale, { style: 'currency', currency: D.currency.code, maximumFractionDigits: 0 }); }
    catch (e) { f = { format: function (n) { return 'R ' + Math.round(n); } }; }
    return function (n) { return f.format(Math.round(n)); };
  })();
  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }
  var store = {
    get: function (area, key) { try { var v = window[area].getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (area, key, val) { try { window[area].setItem(key, JSON.stringify(val)); } catch (e) {} }
  };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;
  function nid(p) { return (p || 'f') + '-' + (++uid); }

  /* ---------- dates (YYYY-MM-DD strings, UTC maths so time zones never shift a day) ---------- */
  function toMs(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function toStr(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(s, n) { return toStr(toMs(s) + n * 864e5); }
  function today() { var d = new Date(); return toStr(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  function fmtDate(s) {
    try { return new Date(toMs(s)).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
    catch (e) { return s; }
  }
  function weekday(s) { return new Date(toMs(s)).getUTCDay(); }

  /* ---------- rates and availability ---------- */
  // the rate for one night: a season's exact rate if the night falls inside it, else the unit's rate
  function nightRate(room, dateStr) {
    for (var i = 0; i < D.seasons.length; i++) {
      var s = D.seasons[i];
      if (dateStr >= s.from && (!s.to || dateStr <= s.to)) return s.rate || room.rate * (s.multiplier || 1);
    }
    return room.rate;
  }
  // With NightsBridge connected, its calendar is the only source of availability:
  // the sample bookings in lodge-data.js are ignored and nothing here claims dates are full.
  var NB_LIVE = !!D.booking.nightsbridgeUrl;
  function nbUrl(from, to) {
    return D.booking.nightsbridgeUrl + (from && to ? (D.booking.nightsbridgeUrl.indexOf('?') < 0 ? '?' : '&') + 'startdate=' + from + '&enddate=' + to : '');
  }
  function isFree(roomId, from, to) {
    if (NB_LIVE) return true;
    return !D.booked.some(function (b) { return b.room === roomId && from < b.to && to > b.from; });
  }
  function otaSaving(direct) {
    var c = (D.booking.otaCommissionPercent || 0) / 100;
    return c > 0 && c < 1 ? Math.round(direct / (1 - c) - direct) : 0;
  }
  var minRule = D.booking.minNightsWeekendOnly ? 'Stays that include a Friday or Saturday night are at least ' + D.booking.minNights + ' nights.' : 'The minimum stay is ' + D.booking.minNights + ' nights.';

  /* ---------- language ---------- */
  var LANGS = { en: 'EN', de: 'DE', nl: 'NL', af: 'AF' };
  var NAMES = { en: 'English', de: 'Deutsch', nl: 'Nederlands', af: 'Afrikaans' };
  var lang = store.get('localStorage', 'lindani-lang');
  if (!D.i18n[lang]) lang = 'en';
  function t(key, vars) {
    var s = (D.i18n[lang] && D.i18n[lang][key]) || D.i18n.en[key] || key;
    return vars ? fill(s, vars) : s;
  }
  function applyLang() {
    document.documentElement.lang = lang === 'en' ? 'en-ZA' : lang;
    $$('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    $$('[data-i18n-html]').forEach(function (n) { n.innerHTML = t(n.getAttribute('data-i18n-html')); });
    $$('[data-i18n-label]').forEach(function (n) { n.setAttribute('aria-label', t(n.getAttribute('data-i18n-label'))); });
    $$('select[data-lang]').forEach(function (s) { s.value = lang; });
    renderNudges();
    if (chat.built) chat.relabel();
  }
  function initLang() {
    $$('select[data-lang]').forEach(function (s) {
      s.innerHTML = '';
      Object.keys(LANGS).forEach(function (k) { if (D.i18n[k]) s.appendChild(el('option', { value: k, text: LANGS[k] + ' · ' + NAMES[k] })); });
      s.value = lang;
      s.addEventListener('change', function () {
        lang = s.value; store.set('localStorage', 'lindani-lang', lang); applyLang();
      });
    });
    applyLang();
  }

  /* ---------- book-direct note ---------- */
  function nudgeText(amount) { return t('nudge', { amount: money(amount), ota: D.booking.otaName }); }
  // Only shown when there's a real saving to name
  function renderNudges() {
    $$('[data-nudge]').forEach(function (n) {
      var kind = n.getAttribute('data-nudge');
      if (kind === 'example') {
        n.hidden = otaSaving(1000) <= 0;
        if (n.hidden) return;
        // Example: two nights in the cheapest studio at the base rate
        var r = D.rooms.slice().sort(function (a, b) { return a.rate - b.rate; })[0];
        var direct = r.rate * D.booking.minNights;
        n.textContent = nudgeText(otaSaving(direct)) + ' (Example: ' + D.booking.minNights + ' nights in ' + r.name + ', ' +
          money(direct) + ' direct vs about ' + money(direct + otaSaving(direct)) + '.)';
      }
    });
  }

  /* ---------- rates table ---------- */
  function renderRates() {
    var box = $('#rates-list');
    if (!box) return;
    box.innerHTML = '';
    D.rooms.forEach(function (r) {
      box.appendChild(el('div', { class: 'rate-row' }, [
        el('div', { class: 'rate-main' }, [
          el('b', { text: r.name }),
          el('span', { text: r.bed + ' · sleeps ' + r.sleeps + (r.sleeps > r.maxAdults ? ' (' + r.maxAdults + ' adults + ' + (r.sleeps - r.maxAdults) + ' children)' : '') })
        ]),
        el('div', { class: 'rate-price' }, [el('b', { text: money(r.rate) }), el('span', { text: 'per night' })])
      ]));
    });
    // upcoming seasons only, e.g. "Festive season (1 Dec 2026 – 17 Jan 2027): R1,800"
    var today = new Date().toISOString().slice(0, 10);
    var dmy = function (x) { return new Date(toMs(x)).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
    var seasons = D.seasons.filter(function (s) { return !s.to || s.to >= today; }).map(function (s) {
      return s.name + ' (' + (s.to ? dmy(s.from) + ' – ' + dmy(s.to) : 'from ' + dmy(s.from)) + '): ' + money(nightRate(D.rooms[0], s.from));
    }).join(' · ');
    box.appendChild(el('p', { class: 'rate-foot', text: (seasons ? 'Seasonal rates: ' + seasons + '. ' : '') + minRule }));
  }

  /* ---------- sharing a message with the lodge ---------- */
  function waLink(text) { return 'https://wa.me/' + D.contact.whatsapp + '?text=' + encodeURIComponent(text); }
  function mailLink(subject, body) {
    return 'mailto:' + (D.contact.email || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  function shareButtons(subject, text, status) {
    var copyBtn = el('button', { type: 'button', class: 'fx-btn fx-btn-ghost', text: 'Copy text' });
    copyBtn.addEventListener('click', function () {
      var done = function () { status.textContent = 'Copied. Paste it into WhatsApp or an email to ' + D.contact.phoneDisplay + '.'; };
      try {
        navigator.clipboard.writeText(text).then(done, function () { selectFallback(); });
      } catch (e) { selectFallback(); }
      function selectFallback() {
        var ta = el('textarea', { class: 'fx-copy', readonly: true, 'aria-label': 'Request text' }); ta.value = text;
        status.textContent = 'Select the text below and copy it:'; status.after(ta); ta.focus(); ta.select();
      }
    });
    var row = el('div', { class: 'fx-share' }, [
      el('a', { class: 'fx-btn fx-btn-wa', href: waLink(text), target: '_blank', rel: 'noopener' }, ['Send on WhatsApp']),
      el('a', { class: 'fx-btn fx-btn-ghost', href: mailLink(subject, text) }, ['Send by email']),
      copyBtn
    ]);
    return row;
  }

  /* =====================================================================
     BOOKING CONCIERGE (chat widget)
     ===================================================================== */
  var chat = (function () {
    var KEY = 'lindani-concierge-v2';
    var S = store.get('sessionStorage', KEY) || { open: false, msgs: [] };
    var api = { built: false };
    var root, panel, log, input, qrRow, launcher, titleEl, closeBtn, sendBtn;

    function save() { store.set('sessionStorage', KEY, { open: S.open, msgs: S.msgs.slice(-60) }); }

    /* --- text matching: keywords, phrases, and small typos --- */
    function norm(s) { return (' ' + String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9&\- ]+/g, ' ').replace(/\s+/g, ' ') + ' '); }
    function lev(a, b) {
      if (Math.abs(a.length - b.length) > 2) return 9;
      var prev = [], cur, i, j;
      for (j = 0; j <= b.length; j++) prev[j] = j;
      for (i = 1; i <= a.length; i++) {
        cur = [i];
        for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
      return prev[b.length];
    }
    function match(text) {
      var n = norm(text), tokens = n.trim().split(' ');
      var scored = D.concierge.intents.map(function (it) {
        var s = 0;
        it.keywords.forEach(function (kw) {
          kw = kw.toLowerCase();
          if (kw.length > 4 && kw.slice(-1) === 's') kw = kw.slice(0, -1);   // "birds" also matches "bird…" 
          if (kw.indexOf(' ') >= 0) { if (n.indexOf(' ' + kw + ' ') >= 0) s += 3; return; }
          var best = 0;
          tokens.forEach(function (tk) {
            if (tk.length > 4 && tk.slice(-1) === 's') tk = tk.slice(0, -1);
            if (tk === kw) best = Math.max(best, 2);
            else if (kw.length >= 4 && (tk.indexOf(kw) === 0 || kw.indexOf(tk) === 0) && tk.length >= 4) best = Math.max(best, 1.5);
            else if (tk.length >= 4 && kw.length >= 4) {
              var d = lev(tk, kw);
              if (d <= (kw.length >= 7 ? 2 : 1)) best = Math.max(best, 1);
            }
          });
          s += best;
        });
        return { it: it, s: s };
      }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
      return scored;
    }
    function answerVars() {
      return {
        phone: D.contact.phoneDisplay, checkIn: D.booking.checkIn, checkOut: D.booking.checkOut, minNights: D.booking.minNights,
        area: D.contact.area, kids: D.policies.kids, pets: D.policies.pets, meals: D.meals, cancellation: D.policies.cancellation,
        payment: D.policies.payment, smoking: D.policies.smoking, policyUrl: D.booking.policyUrl || '',
        guideUrl: D.booking.onboardingUrl || ''
      };
    }
    function intentById(id) { return D.concierge.intents.filter(function (i) { return i.id === id; })[0]; }

    /* --- message rendering --- */
    function bubble(from, kids, cls) {
      var b = el('div', { class: 'fx-msg fx-' + from + (cls ? ' ' + cls : '') }, kids);
      log.appendChild(b);
      requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
      return b;
    }
    // Plain text, with [label](https://…) turned into a link that opens in a new tab.
    function textNode(s) {
      var p = el('p', { class: 'fx-text' }), re = /\[([^\]]+)\]\(([^\s)]+)\)/g, last = 0, m;
      s = String(s);
      while ((m = re.exec(s))) {
        p.appendChild(document.createTextNode(s.slice(last, m.index)));
        p.appendChild(el('a', { href: m[2], target: /^https?:/.test(m[2]) ? '_blank' : null, rel: 'noopener', text: m[1] }));
        last = re.lastIndex;
      }
      p.appendChild(document.createTextNode(s.slice(last)));
      return p;
    }
    function actionsRow(list) {
      return el('div', { class: 'fx-actions' }, list.map(function (a) {
        if (a.href) return el('a', { class: 'fx-chip', href: a.href, target: /^https?:/.test(a.href) ? '_blank' : null, rel: 'noopener', text: a.label,
          onclick: a.href.charAt(0) === '#' ? function () { if (window.innerWidth < 760) setOpen(false); } : null });
        return el('button', { type: 'button', class: 'fx-chip', text: a.label, onclick: function () { userSays(a.label, a.intent); } });
      }));
    }
    // Every message is stored as data and re-drawn from data, so the chat survives a page reload.
    function draw(m) {
      switch (m.kind) {
        case 'rooms': return bubble('bot', [textNode(m.text), roomsList(), actionsRow([{ label: t('qr_dates'), intent: 'dates' }, { label: t('qr_book'), intent: 'book' }])]);
        case 'actions': return bubble('bot', [textNode(m.text), actionsRow(m.actions)]);
        default: return bubble(m.from, [textNode(m.text)]);
      }
    }
    function push(m, quiet) {
      S.msgs.push(m); save();
      if (quiet || reduceMotion) return draw(m);
      var dots = bubble('bot', [el('span', { class: 'fx-typing', 'aria-label': 'Typing' }, [el('i'), el('i'), el('i')])]);
      setTimeout(function () { dots.remove(); draw(m); }, 380);
    }

    function roomsList() {
      return el('ul', { class: 'fx-rooms' }, D.rooms.map(function (r) {
        return el('li', null, [el('b', { text: r.name }), el('span', { text: r.blurb + ' ' + r.bed + ', sleeps ' + r.sleeps + '.' }),
          el('em', { text: 'from ' + money(r.rate) + ' / night' })]);
      }));
    }

    /* --- booking: one place to book, NightsBridge (the Book page when it isn't set) --- */
    function goBook(text) {
      var acts = NB_LIVE ? [{ label: 'Book on NightsBridge', href: nbUrl() }, { label: 'Booking policy', href: D.booking.policyUrl || 'policy.html' }]
        : [{ label: 'Check dates & book', href: 'book.html#request' }];
      push({ from: 'bot', kind: 'actions', text: text, actions: acts });
    }

    /* --- responding --- */
    function runIntent(it) {
      var vars = answerVars();
      switch (it.action) {
        case 'rooms': return push({ from: 'bot', kind: 'rooms', text: fill(it.answer, vars) });
        case 'dates':
        case 'book': return goBook(fill(it.answer, vars));
        case 'activities':
          return push({ from: 'bot', kind: 'actions', text: fill(it.answer, vars),
            actions: [{ label: t('qr_dates'), intent: 'dates' }, { label: 'Ask about activities on WhatsApp', href: waLink('Hello Lindani Farm, what can we do during our stay?') }] });
        case 'directions':
          var acts = [{ label: 'WhatsApp for directions', href: waLink('Hello Lindani Farm, could you send me directions to the farm?') }];
          if (D.contact.mapsLink) acts.unshift({ label: 'Open map', href: D.contact.mapsLink });
          var times = (D.distances || []).map(function (x) { return x.to + ': ' + x.time; }).join('\n');
          return push({ from: 'bot', kind: 'actions', text: D.directions + (times ? '\n\nDrive times:\n' + times : ''), actions: acts });
        case 'contact': return push({ from: 'bot', kind: 'actions', text: fill(it.answer, vars), actions: [{ label: 'WhatsApp the farm', href: waLink('Hello Lindani Farm, ') }] });
        default: return push({ from: 'bot', text: fill(it.answer, vars) });
      }
    }
    function respond(text) {
      var found = match(text);
      var top = found[0];
      if (top && (top.s >= 2 || (top.s >= 1 && (!found[1] || found[1].s < top.s)))) return runIntent(top.it);
      var opts = found.slice(0, 3).map(function (x) { return { label: labelFor(x.it.id), intent: x.it.id }; });
      if (!opts.length) opts = quickReplies().slice(0, 4);
      opts.push({ label: 'Ask on WhatsApp', href: waLink('Hello Lindani Farm, ' + text) });
      push({ from: 'bot', kind: 'actions', text: D.concierge.fallback, actions: opts });
    }
    function labelFor(id) {
      var map = { rooms: 'qr_rooms', activities: 'qr_activities', dates: 'qr_dates', directions: 'qr_directions', kidspets: 'qr_kids', kids: 'qr_kids', pets: 'qr_kids', book: 'qr_book' };
      return map[id] ? t(map[id]) : id.charAt(0).toUpperCase() + id.slice(1);
    }
    function quickReplies() {
      return [['qr_rooms', 'rooms'], ['qr_activities', 'activities'], ['qr_dates', 'dates'], ['qr_directions', 'directions'], ['qr_kids', 'kidspets'], ['qr_book', 'book']]
        .map(function (q) { return { label: t(q[0]), intent: q[1] }; });
    }
    function userSays(text, intentId) {
      push({ from: 'me', text: text }, true);
      var it = intentId && intentById(intentId);
      if (it) runIntent(it); else respond(text);
    }

    /* --- the widget shell --- */
    function build() {
      if (api.built) return;
      api.built = true;
      titleEl = el('h2', { id: 'fx-chat-title', class: 'fx-title' });
      closeBtn = el('button', { type: 'button', class: 'fx-close', onclick: function () { setOpen(false); } }, [
        svg('M6 6l12 12M18 6L6 18')]);
      log = el('div', { class: 'fx-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions', tabindex: '0', 'aria-label': 'Conversation' });
      qrRow = el('div', { class: 'fx-qr', role: 'group', 'aria-label': 'Suggested questions' });
      input = el('input', { type: 'text', id: 'fx-input', autocomplete: 'off', enterkeyhint: 'send' });
      sendBtn = el('button', { type: 'submit', class: 'fx-send' }, [svg('M4 12h16M13 5l7 7-7 7')]);
      var inLabel = el('label', { for: 'fx-input', class: 'fx-sr', text: 'Your question' });
      var form = el('form', { class: 'fx-input' }, [inLabel, input, sendBtn]);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!v) return;
        input.value = '';
        userSays(v);
      });
      panel = el('div', { class: 'fx-panel', id: 'fx-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'fx-chat-title', hidden: true }, [
        el('div', { class: 'fx-head' }, [
          el('span', { class: 'fx-avatar', 'aria-hidden': 'true', text: 'L' }),
          el('div', null, [titleEl, el('p', { class: 'fx-sub', text: D.showDemoNotice ? 'Demo · sample calendar' : 'Usually replies instantly' })]),
          closeBtn
        ]),
        log, qrRow, form
      ]);
      root.appendChild(panel);
      panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setOpen(false); } });
      api.relabel();
      if (!S.msgs.length) S.msgs.push({ from: 'bot', kind: 'greeting' });
      S.msgs.forEach(function (m) { m.kind === 'greeting' ? drawGreeting() : draw(m); });
      save();
    }
    function drawGreeting() { bubble('bot', [el('p', { class: 'fx-text fx-greeting', text: t('chat_greeting') })]); }
    api.relabel = function () {
      if (launcher) { $('.fx-launch-label', launcher).textContent = t('chat_open'); launcher.setAttribute('aria-label', t('chat_open')); }
      if (!titleEl) return;
      titleEl.textContent = t('chat_title');
      closeBtn.setAttribute('aria-label', t('chat_close'));
      sendBtn.setAttribute('aria-label', t('chat_send'));
      input.placeholder = t('chat_placeholder');
      $$('.fx-greeting', log).forEach(function (g) { g.textContent = t('chat_greeting'); });
      qrRow.innerHTML = '';
      quickReplies().forEach(function (q) { qrRow.appendChild(el('button', { type: 'button', class: 'fx-chip', text: q.label, onclick: function () { userSays(q.label, q.intent); } })); });
    };
    function svg(d) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.6');
      s.appendChild(p); return s;
    }
    function setOpen(open, intent) {
      if (open) build();
      S.open = open; save();
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', open);
      root.classList.toggle('is-open', open);
      if (open) {
        log.scrollTop = log.scrollHeight;
        if (intent) userSays(labelFor(intent), intent);
        if (window.innerWidth >= 760) input.focus();
        else closeBtn.focus();
      } else launcher.focus();
    }
    api.open = function (intent) { setOpen(true, intent); };

    root = el('div', { class: 'fx-chat', id: 'fx-chat' });
    launcher = el('button', { type: 'button', class: 'fx-launch', 'aria-expanded': 'false', 'aria-controls': 'fx-panel' }, [
      svg('M4 5h16v11H9l-5 4z'), el('span', { class: 'fx-launch-label' })]);
    launcher.addEventListener('click', function () { setOpen(!(panel && !panel.hidden)); });
    root.appendChild(launcher);
    document.body.appendChild(root);
    api.relabel();
    if (S.open) setOpen(true);
    return api;
  })();

  /* ---------- Contact page message form: hand the message to the farm ---------- */
  (function () {
    var form = $('#eform');
    if (!form) return;
    var box = el('div', { class: 'enq-send', hidden: true, 'aria-live': 'polite' });
    form.appendChild(box);
    document.addEventListener('lindani:enquiry', function (e) {
      var r = e.detail;
      var text = ['MESSAGE from the Lindani Farm website', 'Name: ' + r.name, 'Contact: ' + r.contact, '', r.message].join('\n');
      var status = el('p', { class: 'fx-small', role: 'status' });
      box.innerHTML = '';
      box.appendChild(el('p', { text: 'Thanks, ' + r.name.split(' ')[0] + '. Send your message to the farm:' }));
      box.appendChild(shareButtons('Message from ' + r.name, text, status));
      box.appendChild(status);
      box.hidden = false;
      $('a', box).focus();
    });
  })();

  /* ---------- footer contact from the data file ---------- */
  (function () {
    var em = $('#f-email');
    if (em && D.contact.email) { em.href = 'mailto:' + D.contact.email; em.textContent = D.contact.email; em.hidden = false; }
  })();

  // Any element with data-open-chat="<intent>" opens the concierge at that step
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open-chat]');
    if (!b) return;
    e.preventDefault();
    chat.open(b.getAttribute('data-open-chat') || null);
  });

  /* =====================================================================
     INNER PAGES: everything below fills sections from lodge-data.js
     ===================================================================== */
  var ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M4 12h16M13 5l7 7-7 7"/></svg>';
  function circleLink(href, label, ext) {
    var a = el('a', { class: 'circle-link', href: href, target: ext ? '_blank' : null, rel: ext ? 'noopener' : null }, [el('span', { text: label })]);
    a.appendChild(el('span', { class: 'circle', html: ARROW_SVG }));
    return a;
  }
  function bookUrl(o) {
    var p = []; Object.keys(o).forEach(function (k) { if (o[k] != null && o[k] !== '') p.push(k + '=' + encodeURIComponent(o[k])); });
    return 'book.html' + (p.length ? '?' + p.join('&') : '') + '#request';
  }
  function photo(name, alt, w, h, lazy) {
    return el('img', { src: 'assets/' + name + '.webp', alt: alt || '', width: w || 1080, height: h || 720, loading: lazy === false ? null : 'lazy', decoding: 'async' });
  }
  function fillList(id, items) {
    var ul = $('#' + id); if (!ul) return;
    ul.innerHTML = ''; items.forEach(function (t) { ul.appendChild(el('li', { text: t })); });
  }

  /* ---------- Studios page: one row per studio ---------- */
  (function () {
    var box = $('#studio-list'); if (!box) return;
    box.innerHTML = '';
    D.rooms.forEach(function (r) {
      var sleeps = 'Sleeps ' + r.sleeps + (r.sleeps > r.maxAdults ? ' (' + r.maxAdults + ' adults + ' + (r.sleeps - r.maxAdults) + ' children)' : '');
      var buy = el('div', { class: 'studio-buy' }, [
        el('div', { class: 'studio-price' }, [el('b', { text: 'from ' + money(r.rate) }), el('span', { text: 'per night' + (r.placeholder && D.showDemoNotice ? ' · sample rate' : '') })]),
        el('a', { class: 'btn btn-line', href: NB_LIVE ? nbUrl() : bookUrl({ room: r.id }), target: NB_LIVE ? '_blank' : null, rel: NB_LIVE ? 'noopener' : null, text: 'Book ' + r.name })
      ]);
      box.appendChild(el('article', { class: 'studio-row', id: r.id, 'aria-labelledby': r.id + '-t' }, [
        el('div', { class: 'studio-text' }, [
          el('span', { class: 'tag', html: '(&nbsp;' + sleeps.replace(/ /g, '&nbsp;') + '&nbsp;)' }),
          el('h3', { id: r.id + '-t', text: r.name }),
          el('p', { text: r.blurb + ' ' + r.bed + '.' }),
          el('ul', { class: 'studio-feats' }, D.amenities.slice(0, 4).map(function (a) { return el('li', { text: a }); })),
          buy
        ]),
        el('figure', null, [photo(r.photo || 'studio-bed', r.name + ': ' + r.blurb)])
      ]));
    });
  })();

  /* ---------- Studios page: availability grid (4 weeks per view) ---------- */
  (function () {
    var box = $('#avail-grid'); if (!box) return;
    if (NB_LIVE) {
      var intro = box.parentNode.querySelector('.section-head p');
      if (intro) intro.textContent = 'Availability is live on NightsBridge, our booking calendar, so what you see there is always up to date.';
      box.className = 'nb-panel';
      box.appendChild(el('p', { text: 'Open the calendar to see which nights are free for every unit, then book instantly. Book two interlinking units to stay together as a family.' }));
      box.appendChild(el('p', { class: 'nb-actions' }, [el('a', { class: 'btn btn-book', href: D.booking.nightsbridgeUrl, target: '_blank', rel: 'noopener', text: 'See live availability' }),
        document.createTextNode(' '), el('a', { class: 'nb-policy', href: D.booking.policyUrl || 'policy.html', text: 'Booking policy' })]));
      return;
    }
    var start = today(), DAYS = 28;
    function render() {
      DAYS = Math.max(7, Math.min(28, Math.floor((box.clientWidth - 220) / 43)));
      box.innerHTML = '';
      var end = addDays(start, DAYS - 1);
      var prev = el('button', { type: 'button', class: 'dp-nav', 'aria-label': 'Earlier dates', html: '&#8249;', disabled: start <= today() ? true : null,
        onclick: function () { start = addDays(start, -DAYS); if (start < today()) start = today(); render(); $('.dp-nav', box).focus(); } });
      var next = el('button', { type: 'button', class: 'dp-nav', 'aria-label': 'Later dates', html: '&#8250;',
        onclick: function () { start = addDays(start, DAYS); render(); $$('.dp-nav', box)[1].focus(); } });
      box.appendChild(el('div', { class: 'ag-top' }, [el('p', { text: fmtDate(start) + ' – ' + fmtDate(end) }), el('div', { class: 'ag-nav' }, [prev, next])]));
      var head = el('tr', null, [el('th', { class: 'ag-room', scope: 'col', text: 'Studio' })]);
      for (var i = 0; i < DAYS; i++) {
        var d = addDays(start, i), wd = weekday(d);
        head.appendChild(el('th', { scope: 'col', class: wd === 5 || wd === 6 ? 'is-weekend' : null }, [
          document.createTextNode(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][wd]), el('small', { text: String(+d.slice(8)) })]));
      }
      var body = el('tbody');
      D.rooms.forEach(function (r) {
        var tr = el('tr', null, [el('th', { class: 'ag-room', scope: 'row', text: r.name })]);
        for (var i = 0; i < DAYS; i++) {
          var d = addDays(start, i), free = isFree(r.id, d, addDays(d, 1));
          var label = r.name + ', night of ' + fmtDate(d) + (free ? ': free. Start a booking' : ': booked');
          tr.appendChild(el('td', null, [free
            ? el('a', { class: 'ag-cell', href: bookUrl({ from: d, to: addDays(d, D.booking.minNights), room: r.id }), 'aria-label': label, text: '+' })
            : el('span', { class: 'ag-cell', 'aria-label': label, role: 'img', text: '–' })]));
        }
        body.appendChild(tr);
      });
      box.appendChild(el('div', { class: 'ag-scroll', tabindex: '0', role: 'region', 'aria-label': 'Availability table, scroll sideways for more dates' },
        [el('table', { class: 'ag-table' }, [el('caption', { class: 'sr', text: 'Free and booked nights per studio' }), el('thead', null, [head]), body])]));
      box.appendChild(el('p', { class: 'ag-key' }, [el('span', null, [el('i'), 'Free: tap to book']), el('span', null, [el('i', { class: 'b' }), 'Booked']),
        D.showDemoNotice ? el('span', { class: 'tag', text: '( Sample calendar )' }) : null]));
    }
    render();
    var rw; addEventListener('resize', function () { clearTimeout(rw); rw = setTimeout(render, 200); });
  })();

  /* ---------- Lists: amenities, house rules, policies ---------- */
  fillList('amenity-list', D.amenities);
  fillList('rules-list', D.houseRules || []);
  fillList('policy-list', [D.policies.payment, D.policies.cancellation, D.policies.kids, D.policies.pets, D.policies.smoking,
    'Check-in from ' + D.booking.checkIn + ' to ' + (D.booking.latestArrival || '17:00') + ' (later by arrangement), check-out by ' + D.booking.checkOut + '. ' + minRule,
    'Changes are welcome up to 30 days before check-in, subject to availability.']);

  /* ---------- NightsBridge: once its link is set, every "Book" button books there ---------- */
  var NB = D.booking.nightsbridgeUrl;
  if (NB) {
    $$('a[data-book], a[data-nb-link], a[href="book.html"], a[href^="book.html#request"]').forEach(function (a) { a.href = NB; a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-nb]').forEach(function (e) { e.hidden = false; });
  }

  /* ---------- Links kept in lodge-data.js (booking policy, guest guide) ---------- */
  $$('a[data-link]').forEach(function (a) {
    var url = D.booking[a.getAttribute('data-link')];
    if (!url) { a.hidden = true; return; }
    a.href = url;
    if (/^https?:/.test(url)) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); }
  });

  /* ---------- FAQ ---------- */
  $$('#faq-list').forEach(function (box) {
    box.innerHTML = '';
    (D.faqs || []).forEach(function (f) {
      var url = f.link && D.booking[f.link], kids = [el('summary', { text: f.q }), el('p', { text: f.a })];
      if (url) kids.push(el('p', null, [el('a', { href: url, target: /^https?:/.test(url) ? '_blank' : null, rel: 'noopener', class: 'faq-link',
        text: f.link === 'onboardingUrl' ? 'Open the guest guide' : 'Read the full booking policy' })]));
      box.appendChild(el('details', null, kids));
    });
  });

  /* ---------- Explore page: filters + places ---------- */
  (function () {
    var list = $('#place-list'), bar = $('#place-filters'); if (!list || !bar) return;
    var TYPES = { all: 'All', wine: 'Wine', nature: 'Nature', family: 'Family', daytrip: 'Day trips', venue: 'Wedding venues', school: 'Schools', market: 'Markets' };
    var current = TYPES[new URLSearchParams(location.search).get('type')] ? new URLSearchParams(location.search).get('type') : 'all';
    function render() {
      list.innerHTML = '';
      (D.places || []).filter(function (p) { return current === 'all' || p.type === current; }).forEach(function (p) {
        var map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ' Paarl South Africa');
        var link = el('a', { class: 'map-link', href: map, target: '_blank', rel: 'noopener', 'aria-label': 'Open ' + p.name + ' in Maps' }, [el('span', { text: 'Map' })]);
        link.appendChild(el('span', { class: 'circle', html: ARROW_SVG }));
        list.appendChild(el('li', null, [
          el('div', null, [el('h3', { class: 'p-name', text: p.name }), el('span', { class: 'p-note', text: p.blurb })]),
          el('div', { class: 'p-side' }, [el('span', { class: 'tag', html: '(&nbsp;' + TYPES[p.type].replace(/ /g, '&nbsp;') + '&nbsp;·&nbsp;' + p.drive.replace(/ /g, '&nbsp;') + '&nbsp;)' }), link])]));
      });
      // Same device as the homepage list: first row dark, the rest faint until hovered
      var rows = $$('li', list);
      rows.forEach(function (li, i) { li.classList.toggle('on', i === 0); li.addEventListener('mouseenter', function () { rows.forEach(function (x) { x.classList.toggle('on', x === li); }); }); });
    }
    Object.keys(TYPES).forEach(function (k) {
      if (k !== 'all' && !(D.places || []).some(function (p) { return p.type === k; })) return;
      bar.appendChild(el('button', { type: 'button', class: 'chip-btn', 'aria-pressed': k === current ? 'true' : 'false', text: TYPES[k], 'data-k': k,
        onclick: function () { current = k; $$('.chip-btn', bar).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); }); render(); } }));
    });
    render();
  })();

  /* ---------- Farm page: gallery with a full-screen viewer ---------- */
  (function () {
    var ul = $('#gallery'); if (!ul) return;
    var items = D.gallery || [], idx = 0, dlg, img, cap, count, opener;
    function show(i) { idx = (i + items.length) % items.length; img.src = 'assets/' + items[idx].src + '.webp'; img.alt = items[idx].alt; cap.textContent = items[idx].alt; count.textContent = (idx + 1) + ' / ' + items.length; }
    function btn(cls, label, d, fn) { var b = el('button', { type: 'button', class: 'viewer-btn ' + cls, 'aria-label': label, onclick: fn }); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="' + d + '"/></svg>'; return b; }
    function build() {
      img = el('img', { alt: '' }); cap = el('figcaption'); count = el('p', { class: 'viewer-count', 'aria-live': 'polite' });
      dlg = el('dialog', { class: 'viewer', 'aria-label': 'Photo viewer' }, [el('figure', null, [img, cap]), count,
        btn('viewer-close', 'Close', 'M6 6l12 12M18 6L6 18', function () { dlg.close(); }),
        btn('viewer-prev', 'Previous photo', 'M15 5l-7 7 7 7', function () { show(idx - 1); }),
        btn('viewer-next', 'Next photo', 'M9 5l7 7-7 7', function () { show(idx + 1); })]);
      dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
      dlg.addEventListener('close', function () { document.documentElement.classList.remove('dp-lock'); if (opener) opener.focus(); });
      var x0 = null;
      dlg.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      dlg.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); x0 = null; });
      document.body.appendChild(dlg);
    }
    // Pick how many 2x2 tiles make a 4-column grid (and the 2-column phone grid) end on full rows
    var n = items.length, nBig = 0;
    for (var b = 0; b <= Math.floor(n / 3); b++) { if ((n + 3 * b) % 4 === 0 && (n - b) % 2 === 0) { nBig = b; break; } }
    var step = nBig ? Math.max(1, Math.floor(n / nBig)) : 0;
    items.forEach(function (g, i) {
      var isBig = nBig && i % step === 0 && i / step < nBig;
      ul.appendChild(el('li', { class: isBig ? 'g-big' : null }, [el('button', { type: 'button', 'aria-label': 'Open photo: ' + g.alt, onclick: function (e) {
        if (!dlg) build(); opener = e.currentTarget; show(i); document.documentElement.classList.add('dp-lock');
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      } }, [photo(g.src, g.alt)])]));
    });
  })();

  /* ---------- Contact page ---------- */
  (function () {
    var cards = $('#contact-cards');
    if (cards) {
      var add = function (tag, value, note, link, label, ext) {
        cards.appendChild(el('li', null, [el('span', { class: 'tag', html: '(&nbsp;' + tag + '&nbsp;)' }), el('b', { text: value }), el('p', { text: note }), circleLink(link, label, ext)]));
      };
      add('WhatsApp', D.contact.phoneDisplay, 'Quickest for questions and bookings.', waLink('Hello Lindani Farm, '), 'Open WhatsApp', true);
      add('Call', D.contact.phoneDisplay, 'Reservations, usually during the day.', 'tel:' + D.contact.phoneInternational, 'Call now');
      if (D.contact.email) add('Email', D.contact.email, 'For longer questions and groups.', 'mailto:' + D.contact.email, 'Send an email');
      add('Instagram', '@lindanifarm', 'Photos and news from the farm.', 'https://www.instagram.com/lindanifarm/', 'Follow us', true);
    }
    if ($('#directions-text')) $('#directions-text').textContent = D.directions;
    var ml = $('#map-link');
    if (ml) ml.appendChild(D.contact.mapsLink ? circleLink(D.contact.mapsLink, 'Open the map', true)
      : circleLink(waLink('Hello Lindani Farm, could you send me directions and the gate details?'), 'Ask for directions on WhatsApp', true));
    var dl = $('#distance-list');
    if (dl) (D.distances || []).forEach(function (d) { dl.appendChild(el('div', null, [el('dt', { text: d.to }), el('dd', { text: d.time })])); });
  })();

  renderRates();
  // booking card facts: the lowest nightly rate and the peak rate, from lodge-data.js
  (function () {
    var low = Math.min.apply(null, D.rooms.map(function (r) { return r.rate; }));
    var peak = Math.max.apply(null, D.seasons.map(function (x) { return x.rate || 0; }));
    $$('[data-fact="rate"]').forEach(function (e) { e.textContent = money(low); });
    if (peak > low) $$('[data-fact="peak"]').forEach(function (e) { e.textContent = ' (' + money(peak) + ' in peak season)'; });
  })();
  initLang();
})();
