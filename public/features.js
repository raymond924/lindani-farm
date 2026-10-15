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
  function nightsBetween(a, b) { return Math.round((toMs(b) - toMs(a)) / 864e5); }
  function today() { var d = new Date(); return toStr(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  function fmtDate(s) {
    try { return new Date(toMs(s)).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
    catch (e) { return s; }
  }
  function weekday(s) { return new Date(toMs(s)).getUTCDay(); }

  /* ---------- rates and availability ---------- */
  function seasonMultiplier(dateStr) {
    var md = dateStr.slice(5);
    for (var i = 0; i < D.seasons.length; i++) {
      var s = D.seasons[i];
      var inside = s.from <= s.to ? (md >= s.from && md <= s.to) : (md >= s.from || md <= s.to);
      if (inside) return s.multiplier;
    }
    return 1;
  }
  function stayPrice(room, from, to) {
    var total = 0, n = nightsBetween(from, to);
    for (var i = 0; i < n; i++) total += room.rate * seasonMultiplier(addDays(from, i));
    return Math.round(total);
  }
  function isFree(roomId, from, to) {
    return !D.booked.some(function (b) { return b.room === roomId && from < b.to && to > b.from; });
  }
  function freeRooms(from, to) { return D.rooms.filter(function (r) { return isFree(r.id, from, to); }); }
  // Cheapest set of free studios that fits the party (four studios = 15 combinations, so try them all).
  function bestCombo(rooms, adults, kids, from, to) {
    var best = null;
    for (var mask = 1; mask < (1 << rooms.length); mask++) {
      var set = rooms.filter(function (r, i) { return mask & (1 << i); });
      var maxA = set.reduce(function (a, r) { return a + r.maxAdults; }, 0);
      var beds = set.reduce(function (a, r) { return a + r.sleeps; }, 0);
      if (maxA < adults || beds < adults + kids) continue;
      var price = set.reduce(function (a, r) { return a + stayPrice(r, from, to); }, 0);
      if (!best || set.length < best.rooms.length || (set.length === best.rooms.length && price < best.price)) best = { rooms: set, price: price };
    }
    return best;
  }
  function otaSaving(direct) {
    var c = (D.booking.otaCommissionPercent || 0) / 100;
    return c > 0 && c < 1 ? Math.round(direct / (1 - c) - direct) : 0;
  }
  // Booking policy: the minimum stay applies when the stay includes a Friday or Saturday night.
  function minNightsFor(from, to) {
    if (!D.booking.minNightsWeekendOnly) return D.booking.minNights;
    for (var d = from; d < to; d = addDays(d, 1)) { var w = new Date(toMs(d)).getUTCDay(); if (w === 5 || w === 6) return D.booking.minNights; }
    return 1;
  }
  var minRule = D.booking.minNightsWeekendOnly ? 'Stays that include a Friday or Saturday night are at least ' + D.booking.minNights + ' nights.' : 'The minimum stay is ' + D.booking.minNights + ' nights.';
  // Booking policy: 50% deposit within 24 hours and the balance 7 days before check-in, or full payment when arrival is closer than that.
  function paymentPlan(from, total) {
    var dep = D.booking.depositPercent || 50, days = D.booking.balanceDueDays || 7;
    if (!total) return null;
    if (from < addDays(today(), days)) return { full: true, text: 'Arrival is less than ' + days + ' days away, so the full ' + money(total) + ' is due within 24 hours of booking.' };
    var d = Math.round(total * dep / 100);
    return { full: false, deposit: d, balance: total - d, balanceDue: addDays(from, -days),
      text: dep + '% deposit (' + money(d) + ') within 24 hours of booking; balance (' + money(total - d) + ') by ' + fmtDate(addDays(from, -days)) + '. Or pay in full. EFT only.' };
  }
  function validStay(from, to) {
    if (!from || !to) return 'Choose an arrival and a departure date.';
    if (from < today()) return 'Arrival can\'t be in the past.';
    var n = nightsBetween(from, to);
    if (n < 1) return 'Departure needs to be after arrival.';
    if (n < minNightsFor(from, to)) return minRule;
    if (n > D.booking.maxNights) return 'For stays longer than ' + D.booking.maxNights + ' nights, please contact us directly.';
    return '';
  }

  /* ---------- date range picker ----------
     Replaces each pair of native date inputs with two buttons that open one
     calendar. The native inputs stay in the form (hidden) and keep the values,
     so every form reads its dates exactly as before. */
  var picker = (function () {
    var DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var pairs = [], st = null, pop, backdrop, monthsEl, hintEl, sumEl, doneBtn;
    var MAXD = 540;
    function fullNight(d) { return D.rooms.every(function (r) { return !isFree(r.id, d, addDays(d, 1)); }); }
    function firstFullAfter(from) {
      for (var i = 1; i <= D.booking.maxNights; i++) { var n = addDays(from, i); if (fullNight(n)) return n; }
      return addDays(from, D.booking.maxNights);
    }
    function monthStart(d) { return d.slice(0, 8) + '01'; }
    function addMonths(m, k) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + k; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + '-' + String(mo + 1).padStart(2, '0') + '-01'; }
    function monthName(m) { try { return new Date(toMs(m)).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return m.slice(0, 7); } }
    function longDate(d) { try { return new Date(toMs(d)).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return d; } }
    function wide() { return window.innerWidth >= 760; }
    function asStart(d) { return d < today() || d > addDays(today(), MAXD) || fullNight(d); }
    function disabled(d) {
      if (st.step === 'to' && st.from && d > st.from) return nightsBetween(st.from, d) < minNightsFor(st.from, d) || d > firstFullAfter(st.from);
      return asStart(d);
    }
    function svgIcon() {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'dp-ico');
      s.innerHTML = '<rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.5"/>';
      return s;
    }
    function attach(a, b) {
      if (!a || !b || a._dp) return;
      var pair = { a: a, b: b, btns: {} };
      [['from', a], ['to', b]].forEach(function (x) {
        var which = x[0], input = x[1];
        var lab = input.labels && input.labels[0] ? input.labels[0].textContent.replace('*', '').trim() : (which === 'from' ? 'Arrive' : 'Leave');
        var btn = el('button', { type: 'button', class: 'dp-trigger' }, [el('span', { class: 'dp-val' }), svgIcon()]);
        btn._lab = lab;
        btn.addEventListener('click', function () { open(pair, which, btn); });
        input.classList.add('dp-native'); input.setAttribute('tabindex', '-1'); input.setAttribute('aria-hidden', 'true');
        input.addEventListener('focus', function () { btn.focus(); });
        input.after(btn);
        input._dp = pair; pair.btns[which] = btn;
      });
      pairs.push(pair); sync(pair);
    }
    function sync(pair) {
      [['from', pair.a], ['to', pair.b]].forEach(function (x) {
        var btn = pair.btns[x[0]], v = x[1].value;
        $('.dp-val', btn).textContent = v ? fmtDate(v) : 'Add date';
        btn.classList.toggle('is-empty', !v);
        btn.setAttribute('aria-label', btn._lab + ': ' + (v ? longDate(v) : 'not chosen') + '. Open calendar');
      });
    }
    function syncAll() { pairs = pairs.filter(function (p) { return document.body.contains(p.a); }); pairs.forEach(sync); }

    function build() {
      backdrop = el('div', { class: 'dp-backdrop', hidden: true, onclick: function () { close(true); } });
      hintEl = el('p', { class: 'dp-hint', 'aria-live': 'polite' });
      monthsEl = el('div', { class: 'dp-months' });
      sumEl = el('p', { class: 'dp-sum' });
      doneBtn = el('button', { type: 'button', class: 'fx-btn fx-btn-book', text: 'Done', onclick: function () { close(true); } });
      pop = el('div', { class: 'dp-pop', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose your dates', hidden: true }, [
        el('div', { class: 'dp-top' }, [
          el('button', { type: 'button', class: 'dp-nav', 'aria-label': 'Previous month', html: '&#8249;', onclick: function () { shift(-1); } }),
          hintEl,
          el('button', { type: 'button', class: 'dp-nav', 'aria-label': 'Next month', html: '&#8250;', onclick: function () { shift(1); } })
        ]),
        monthsEl,
        el('p', { class: 'dp-legend' }, [el('span', { class: 'dp-key', 'aria-hidden': 'true', text: '12' }), ' Fully booked' + (D.showDemoNotice ? ' · sample calendar' : '')]),
        el('div', { class: 'dp-foot' }, [sumEl, el('div', { class: 'dp-foot-btns' }, [
          el('button', { type: 'button', class: 'fx-btn fx-btn-ghost', text: 'Clear', onclick: function () { st.from = ''; st.to = ''; st.step = 'from'; render(); } }),
          doneBtn])])
      ]);
      pop.addEventListener('keydown', onKey);
      monthsEl.addEventListener('mouseover', function (e) {
        var d = e.target.closest('[data-d]');
        if (st && st.step === 'to' && st.from && d) { st.hover = d.getAttribute('data-d'); paint(); }
      });
      monthsEl.addEventListener('mouseleave', function () { if (st) { st.hover = ''; paint(); } });
      document.body.appendChild(backdrop); document.body.appendChild(pop);
      window.addEventListener('resize', function () { if (st) { render(); place(); } });
      window.addEventListener('scroll', function () { if (st && wide()) place(); }, { passive: true });
      document.addEventListener('mousedown', function (e) {
        if (st && wide() && !pop.contains(e.target) && !e.target.closest('.dp-trigger')) close(true);
      });
    }
    function open(pair, which, btn) {
      if (!pop) build();
      var a = pair.a.value, b = pair.b.value;
      st = { pair: pair, btn: btn, from: a, to: b, step: which === 'to' && a ? 'to' : 'from', hover: '' };
      var focus = (which === 'to' && b) ? b : (a || today());
      st.view = monthStart(focus < today() ? today() : focus);
      st.focus = focus < today() ? today() : focus;
      pop.hidden = false; backdrop.hidden = wide();
      document.documentElement.classList.toggle('dp-lock', !wide());
      render(); place(); focusDay();
    }
    function close(commitPartial) {
      if (!st) return;
      var s0 = st; st = null;
      if (commitPartial !== false) commit(s0);
      pop.hidden = true; backdrop.hidden = true; document.documentElement.classList.remove('dp-lock');
      s0.btn.focus();
    }
    function commit(s0) {
      var p = s0.pair;
      if (p.a.value !== s0.from) { p.a.value = s0.from; p.a.dispatchEvent(new Event('change', { bubbles: true })); p.a.dispatchEvent(new Event('input', { bubbles: true })); }
      if (s0.to || !s0.from) { if (p.b.value !== s0.to) { p.b.value = s0.to; p.b.dispatchEvent(new Event('change', { bubbles: true })); p.b.dispatchEvent(new Event('input', { bubbles: true })); } }
      syncAll();
    }
    function place() {
      if (!wide()) { pop.style.cssText = ''; pop.classList.add('dp-sheet'); return; }
      pop.classList.remove('dp-sheet');
      var r = st.btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
      var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      var top = r.bottom + 8;
      if (top + h > window.innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - h - 8);
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    }
    function shift(k) { st.view = addMonths(st.view, k); st.focus = addMonths(st.focus.slice(0, 8) + '01', k); render(); }
    function render() {
      var n = wide() ? 2 : 1;
      monthsEl.innerHTML = '';
      monthsEl.style.gridTemplateColumns = 'repeat(' + n + ',minmax(0,1fr))';
      for (var k = 0; k < n; k++) {
        var m = addMonths(st.view, k), days = el('div', { class: 'dp-days' });
        DAY.forEach(function (d) { days.appendChild(el('span', { class: 'dp-dow', 'aria-hidden': 'true', text: d.slice(0, 2) })); });
        var lead = (weekday(m) + 6) % 7;
        for (var i = 0; i < lead; i++) days.appendChild(el('span', { class: 'dp-pad' }));
        for (var d = m; d.slice(0, 7) === m.slice(0, 7); d = addDays(d, 1)) {
          days.appendChild(el('button', { type: 'button', class: 'dp-day', 'data-d': d, tabindex: '-1', text: String(+d.slice(8)),
            onclick: (function (dd) { return function () { pick(dd); }; })(d) }));
        }
        monthsEl.appendChild(el('div', { class: 'dp-month' }, [el('p', { class: 'dp-mname', text: monthName(m) }), days]));
      }
      var first = st.view, last = addMonths(st.view, n);
      if (st.focus < first || st.focus >= last) st.focus = first < today() ? today() : first;
      $$('.dp-nav', pop)[0].disabled = st.view <= monthStart(today());
      paint();
    }
    function paint() {
      var lo = st.from, hi = st.to || (st.step === 'to' && st.hover > st.from ? st.hover : '');
      $$('.dp-day', monthsEl).forEach(function (b) {
        var d = b.getAttribute('data-d'), full = fullNight(d), dis = disabled(d);
        b.disabled = dis;
        b.classList.toggle('is-full', full);
        b.classList.toggle('is-today', d === today());
        b.classList.toggle('is-start', d === lo);
        b.classList.toggle('is-end', !!hi && d === hi);
        b.classList.toggle('in-range', !!(lo && hi && d > lo && d < hi));
        b.setAttribute('tabindex', d === st.focus ? '0' : '-1');
        b.setAttribute('aria-pressed', d === lo || d === st.to ? 'true' : 'false');
        b.setAttribute('aria-label', longDate(d) + (full ? ', fully booked' : '') + (d === lo ? ', arrival' : '') + (d === st.to ? ', departure' : '') + (dis && !full ? ', not available' : ''));
      });
      var nights = st.from && st.to ? nightsBetween(st.from, st.to) : 0;
      hintEl.textContent = st.step === 'from' || !st.from ? 'Choose your arrival date' : 'Now choose your departure date' + (D.booking.minNights > 1 ? (D.booking.minNightsWeekendOnly ? ' (minimum ' + D.booking.minNights + ' nights over a weekend)' : ' (minimum ' + D.booking.minNights + ' nights)') : '');
      sumEl.textContent = st.from ? fmtDate(st.from) + ' → ' + (st.to ? fmtDate(st.to) + ' · ' + nights + ' night' + (nights > 1 ? 's' : '') : '…') : 'No dates chosen';
      doneBtn.textContent = st.from && !st.to ? 'Done (arrival only)' : 'Done';
    }
    function focusDay() {
      var b = $('.dp-day[data-d="' + st.focus + '"]', monthsEl);
      if (b) b.focus({ preventScroll: true });
    }
    function pick(d) {
      if (st.step === 'to' && st.from && d > st.from) {
        st.to = d; st.focus = d; paint();
        setTimeout(function () { close(true); }, reduceMotion ? 0 : 220);
      } else {
        st.from = d; st.to = ''; st.step = 'to'; st.focus = d; st.hover = ''; paint(); focusDay();
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(false); return; }
      if (e.key === 'Tab') {
        var f = $$('button:not([disabled])', pop).filter(function (b) { return !b.classList.contains('dp-day') || b.getAttribute('tabindex') === '0'; });
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        return;
      }
      if (!e.target.classList.contains('dp-day')) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      var d = st.focus;
      if (step) d = addDays(d, step);
      else if (e.key === 'PageUp') d = addMonths(monthStart(d), -1).slice(0, 8) + d.slice(8);
      else if (e.key === 'PageDown') d = addMonths(monthStart(d), 1).slice(0, 8) + d.slice(8);
      else if (e.key === 'Home') d = addDays(d, -((weekday(d) + 6) % 7));
      else if (e.key === 'End') d = addDays(d, 6 - ((weekday(d) + 6) % 7));
      else return;
      e.preventDefault();
      if (d < today()) d = today();
      var n = wide() ? 2 : 1;
      if (monthStart(d) < st.view) st.view = monthStart(d);
      if (monthStart(d) >= addMonths(st.view, n)) st.view = addMonths(monthStart(d), 1 - n);
      st.focus = d;
      if (!$('.dp-day[data-d="' + d + '"]', monthsEl)) render(); else paint();
      if (st.step === 'to' && st.from) { st.hover = d; paint(); }
      focusDay();
    }
    return { attach: attach, syncAll: syncAll };
  })();

  function nextOpenings(q) {
    var n = nightsBetween(q.from, q.to), found = [];
    for (var i = 1; i <= 60 && found.length < 2; i++) {
      var a = addDays(q.from, i), b = addDays(a, n);
      if (bestCombo(freeRooms(a, b), q.adults, q.kids, a, b)) { found.push(a); i += n; }
    }
    return found.map(function (a) { return { from: a, to: addDays(a, n) }; });
  }

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
  function nudgeEl(amount) { return amount > 0 ? el('p', { class: 'nudge', text: nudgeText(amount) }) : document.createTextNode(''); }
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
    var same = D.rooms.every(function (r) { return r.rate === D.rooms[0].rate; });
    var seasons = D.seasons.map(function (s) {
      var md = function (x) { return new Date(Date.UTC(2001, +x.slice(0, 2) - 1, +x.slice(3))).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' }); };
      var pct = Math.round((s.multiplier - 1) * 100);
      return s.name + ' (' + md(s.from) + ' – ' + md(s.to) + '): ' + (same ? money(Math.round(D.rooms[0].rate * s.multiplier)) + ' a night' : (pct > 0 ? '+' : '') + pct + '%');
    }).join(' · ');
    box.appendChild(el('p', { class: 'rate-foot', text: (seasons ? 'Seasonal rates: ' + seasons + '. ' : '') + minRule }));
  }

  /* ---------- sharing a request or plan with the lodge ---------- */
  function waLink(text) { return 'https://wa.me/' + D.contact.whatsapp + '?text=' + encodeURIComponent(text); }
  function mailLink(subject, body) {
    return 'mailto:' + (D.contact.email || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  function guideNote() {
    if (!D.booking.onboardingUrl) return document.createTextNode('');
    return el('p', { class: 'fx-small fx-guide' }, ['Once the farm confirms your stay, the ',
      el('a', { href: D.booking.onboardingUrl, target: '_blank', rel: 'noopener', text: 'Lindani guest guide' }),
      ' has everything for your arrival: directions, self check-in, Wi-Fi and house rules.']);
  }
  // Save a booking request to the farm's dashboard. Resolves with { id }; rejects when the
  // booking system can't be reached (for example when the site is opened from a file).
  function sendRequest(r, est, source) {
    if (D.booking.liveRequests === false || !window.fetch || location.protocol === 'file:') return Promise.reject(new Error('offline'));
    var body = { name: r.name, email: r.email, phone: r.phone, from: r.from, to: r.to, adults: r.adults, kids: r.kids,
      room: r.room || '', notes: r.notes || '', estimate: est || 0, source: source, website: r.website || '' };
    return fetch('/api/booking', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) { return res.json().then(function (j) { if (!res.ok || !j.ok) throw new Error(j.error || 'failed'); return j; }); });
  }
  function receivedNote(name) {
    return el('p', null, ['Thank you' + (name ? ', ' + name.split(' ')[0] : '') + '. Your request is with the farm. They\'ll confirm availability and send your invoice by WhatsApp or email.']);
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
      var p = el('p', { class: 'fx-text' }), re = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, last = 0, m;
      s = String(s);
      while ((m = re.exec(s))) {
        p.appendChild(document.createTextNode(s.slice(last, m.index)));
        p.appendChild(el('a', { href: m[2], target: '_blank', rel: 'noopener', text: m[1] }));
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

    /* --- booking: one place to book, the Book page --- */
    function goBook(text) {
      if (bookHere) {
        push({ from: 'bot', text: text + ' The form is right here on this page.' });
        bookHere({});
        if (window.innerWidth < 760) setOpen(false);
        return;
      }
      push({ from: 'bot', kind: 'actions', text: text, actions: [{ label: 'Check dates & book', href: 'book.html#request' }] });
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

  // Links like book.html?from=2026-11-20&to=2026-11-22&room=studio-3 pre-fill the booking forms
  var URLQ = (function () {
    var q = {}; try { new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; }); } catch (e) {}
    var ok = function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d || '') && d >= today(); };
    if (!ok(q.from)) delete q.from;
    if (!ok(q.to) || (q.from && q.to <= q.from)) delete q.to;
    if (q.room && !D.rooms.some(function (r) { return r.id === q.room; })) delete q.room;
    return q;
  })();
  // On the Book page "Request" fills in the form there; elsewhere it opens the Book page
  var bookHere = null;

  /* =====================================================================
     AVAILABILITY CHECKER (the "Plan your stay here" form under the hero)
     ===================================================================== */
  (function () {
    var form = $('#qform'), out = $('#avail-out');
    if (!form || !out) return;
    var f = form.elements, t0 = today();
    f.from.min = t0; f.to.min = addDays(t0, 1);
    // Default to the next weekend at least three days away, so the form shows a real example
    var fri = addDays(t0, ((5 - weekday(t0) + 7) % 7) || 7);
    if (nightsBetween(t0, fri) < 3) fri = addDays(fri, 7);
    f.from.value = URLQ.from || fri; f.to.value = URLQ.to || addDays(f.from.value, D.booking.minNights);
    if (+URLQ.adults) f.adults.value = String(Math.min(8, +URLQ.adults));
    if (URLQ.kids) f.kids.value = String(Math.min(4, +URLQ.kids || 0));
    picker.attach(f.from, f.to);
    f.from.addEventListener('change', function () {
      if (!f.from.value) return;
      f.to.min = addDays(f.from.value, 1);
      if (!f.to.value || f.to.value <= f.from.value) f.to.value = addDays(f.from.value, D.booking.minNights);
      picker.syncAll();
    });
    function setErr(input, msg) {
      var id = input.id + '-err', box = document.getElementById(id);
      if (!msg) { if (box) box.remove(); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); return; }
      if (!box) { box = el('p', { class: 'err', id: id }); input.parentNode.appendChild(box); }
      box.textContent = msg; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
    }
    function card(name, sub, total, nights, btnLabel, prefill) {
      return el('li', { class: 'avail-card' }, [
        el('div', null, [el('b', { class: 'avail-name', text: name }), el('span', { class: 'avail-sub', text: sub })]),
        el('div', { class: 'avail-price' }, [el('b', { text: money(total) }), el('span', { text: 'for ' + nights + ' night' + (nights > 1 ? 's' : '') + ' · about ' + money(total / nights) + ' a night' })]),
        el('button', { type: 'button', class: 'btn avail-btn', text: btnLabel, onclick: function () { if (D.booking.nightsbridgeUrl) window.open(D.booking.nightsbridgeUrl, '_blank', 'noopener'); else if (bookHere) bookHere(prefill); else location.href = bookUrl(prefill); } })
      ]);
    }
    function run(q) {
      out.innerHTML = '';
      var n = nightsBetween(q.from, q.to), party = q.adults + q.kids;
      var free = freeRooms(q.from, q.to);
      var fit = free.filter(function (r) { return r.maxAdults >= q.adults && r.sleeps >= party; });
      var head = fmtDate(q.from) + ' – ' + fmtDate(q.to) + ' · ' + n + ' night' + (n > 1 ? 's' : '') + ' · ' + party + ' guest' + (party > 1 ? 's' : '');
      var base = { from: q.from, to: q.to, adults: q.adults, kids: q.kids };
      if (fit.length) {
        out.appendChild(el('div', { class: 'avail-top' }, [el('h3', { class: 'avail-title', text: (fit.length === 1 ? 'One studio is' : fit.length + ' studios are') + ' free' }),
          D.showDemoNotice ? el('span', { class: 'tag', text: '( Sample calendar )' }) : null]));
        out.appendChild(el('p', { class: 'avail-meta', text: head }));
        out.appendChild(el('ul', { class: 'avail-list' }, fit.map(function (r) {
          return card(r.name, r.bed + ' · sleeps ' + r.sleeps, stayPrice(r, q.from, q.to), n, 'Request ' + r.name,
            Object.assign({ room: r.id }, base));
        })));
        out.appendChild(nudgeEl(otaSaving(Math.min.apply(null, fit.map(function (r) { return stayPrice(r, q.from, q.to); })))));
      } else {
        var combo = bestCombo(free, q.adults, q.kids, q.from, q.to);
        if (combo) {
          out.appendChild(el('h3', { class: 'avail-title', text: 'Free if you take ' + combo.rooms.length + ' studios' }));
          out.appendChild(el('p', { class: 'avail-meta', text: head + '. No single studio sleeps ' + party + '.' }));
          out.appendChild(el('ul', { class: 'avail-list' }, [card(combo.rooms.map(function (r) { return r.name; }).join(' + '),
            combo.rooms.map(function (r) { return r.bed; }).join(' · '), combo.price, n, 'Request these studios',
            Object.assign({ room: combo.rooms.map(function (r) { return r.id; }).join('+') }, base))]));
          out.appendChild(nudgeEl(otaSaving(combo.price)));
        } else {
          out.appendChild(el('h3', { class: 'avail-title', text: 'Those dates are full' }));
          out.appendChild(el('p', { class: 'avail-meta', text: head }));
          var alt = nextOpenings(q);
          if (alt.length) {
            out.appendChild(el('p', { class: 'avail-meta', text: 'The next free dates for the same length of stay:' }));
            out.appendChild(el('div', { class: 'fx-actions' }, alt.map(function (a) {
              return el('button', { type: 'button', class: 'fx-chip', text: fmtDate(a.from) + ' – ' + fmtDate(a.to), onclick: function () {
                f.from.value = a.from; f.to.value = a.to; picker.syncAll(); run({ from: a.from, to: a.to, adults: q.adults, kids: q.kids });
              } });
            })));
          }
          out.appendChild(el('p', { class: 'avail-meta' }, [el('a', { href: waLink('Hello Lindani Farm, do you have space from ' + fmtDate(q.from) + ' to ' + fmtDate(q.to) + ' for ' + party + ' guests?'), target: '_blank', rel: 'noopener', class: 'avail-link', text: 'Ask the farm on WhatsApp' })]));
        }
      }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = { from: f.from.value, to: f.to.value, adults: +f.adults.value, kids: +f.kids.value };
      setErr(f.from, ''); setErr(f.to, '');
      var msg = validStay(q.from, q.to);
      if (msg) {
        var target = !q.from || q.from < today() ? f.from : f.to;
        setErr(target, msg); target.focus(); out.innerHTML = ''; return;
      }
      run(q);
    });
    // Show real results straight away for the default weekend
    run({ from: f.from.value, to: f.to.value, adults: +f.adults.value, kids: +f.kids.value });
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
        el('a', { class: 'btn btn-line', href: bookUrl({ room: r.id }), text: 'Book ' + r.name })
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
    'Check-in from ' + D.booking.checkIn + ' (latest arrival ' + (D.booking.latestArrival || '20:00') + '), check-out by ' + D.booking.checkOut + '. ' + minRule,
    'Changes are welcome up to 30 days before check-in, subject to availability.']);

  /* ---------- NightsBridge: once its link is set, every "Book" button books there ---------- */
  var NB = D.booking.nightsbridgeUrl;
  if (NB) {
    $$('a[data-book], a[data-nb-link]').forEach(function (a) { a.href = NB; a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-nb]').forEach(function (e) { e.hidden = false; });
  }

  /* ---------- Links kept in lodge-data.js (booking policy, guest guide) ---------- */
  $$('a[data-link]').forEach(function (a) {
    var url = D.booking[a.getAttribute('data-link')];
    if (url) a.href = url; else a.hidden = true;
  });

  /* ---------- FAQ ---------- */
  $$('#faq-list').forEach(function (box) {
    box.innerHTML = '';
    (D.faqs || []).forEach(function (f) {
      var url = f.link && D.booking[f.link], kids = [el('summary', { text: f.q }), el('p', { text: f.a })];
      if (url) kids.push(el('p', null, [el('a', { href: url, target: '_blank', rel: 'noopener', class: 'faq-link',
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

  /* ---------- Book page: request form with a live price summary ---------- */
  (function () {
    var form = $('#book-form'); if (!form) return;
    var f = form.elements, sum = $('#sum-body'), note = $('#bnote');
    f.room.appendChild(el('option', { value: '', text: 'Not sure yet, please suggest' }));
    D.rooms.forEach(function (r) { f.room.appendChild(el('option', { value: r.id, text: r.name + ' (sleeps ' + r.sleeps + ')' })); });
    var t0 = today(); f.from.min = t0; f.to.min = addDays(t0, 1);
    if (URLQ.from) f.from.value = URLQ.from;
    if (URLQ.to) f.to.value = URLQ.to; else if (URLQ.from) f.to.value = addDays(URLQ.from, D.booking.minNights);
    if (URLQ.room) f.room.value = URLQ.room;
    // Start from the dates in the checker above, so nothing is typed twice
    var q = $('#qform');
    if (q && !f.from.value) { f.from.value = q.elements.from.value; f.to.value = q.elements.to.value; f.adults.value = q.elements.adults.value; f.kids.value = q.elements.kids.value; }
    picker.attach(f.from, f.to);
    var send = el('div', { class: 'book-send', hidden: true, 'aria-live': 'polite' });
    form.after(send);

    function roomOf(id) { return D.rooms.filter(function (r) { return r.id === id; })[0]; }
    function summary() {
      sum.innerHTML = '';
      var a = f.from.value, b = f.to.value, r = roomOf(f.room.value), n = a && b ? nightsBetween(a, b) : 0;
      if (!a || !b || n < 1) { sum.appendChild(el('p', { class: 'fx-small', text: 'Choose your dates and a studio to see the price here.' })); return; }
      var rows = [['Dates', fmtDate(a) + ' – ' + fmtDate(b)], ['Nights', String(n)],
        ['Guests', f.adults.value + ' adult' + (+f.adults.value > 1 ? 's' : '') + (+f.kids.value ? ', ' + f.kids.value + ' child' + (+f.kids.value > 1 ? 'ren' : '') : '')],
        ['Studio', r ? r.name : 'We\'ll suggest one']];
      var avail = r ? isFree(r.id, a, b) : !!bestCombo(freeRooms(a, b), +f.adults.value, +f.kids.value, a, b);
      var combo = r ? null : bestCombo(freeRooms(a, b), +f.adults.value, +f.kids.value, a, b);
      if (!r && combo) rows[3] = ['Studio', 'We suggest ' + combo.rooms.map(function (x) { return x.name; }).join(' + ')];
      var shown = r || (combo && combo.rooms[0]);
      if (shown) sum.appendChild(el('figure', { class: 'sum-photo' }, [photo(shown.photo || 'studio-bed', shown.name)]));
      sum.appendChild(el('dl', { class: 'sum-rows' }, rows.map(function (x) { return el('div', null, [el('dt', { text: x[0] }), el('dd', { text: x[1] })]); })));
      var total = r ? stayPrice(r, a, b) : (combo ? combo.price : 0);
      if (total) {
        sum.appendChild(el('div', { class: 'sum-total' }, [el('span', { text: r ? 'Estimated total' : 'From' }), el('b', { text: money(total) })]));
        sum.appendChild(nudgeEl(otaSaving(total)));
        var plan = paymentPlan(a, total);
        if (plan) sum.appendChild(el('p', { class: 'fx-small sum-plan', text: plan.text }));
      }
      sum.appendChild(el('p', { class: 'fx-small', text: (avail ? 'Looks free on our calendar. ' : 'Looks booked for these dates: we\'ll suggest alternatives. ') + (D.showDemoNotice ? '(Sample calendar.)' : '') }));
    }
    ['change', 'input'].forEach(function (ev) { form.addEventListener(ev, summary); });
    summary();

    bookHere = function (p) {
      if (p.from) f.from.value = p.from; if (p.to) f.to.value = p.to;
      if (p.adults) f.adults.value = String(p.adults); if (p.kids != null) f.kids.value = String(p.kids);
      f.room.value = p.room && p.room.indexOf('+') < 0 ? p.room : '';
      if (p.room && p.room.indexOf('+') > 0) f.notes.value = 'We\'d like ' + p.room.split('+').map(function (id) { return roomOf(id).name; }).join(' and ') + '. ' + f.notes.value;
      picker.syncAll(); summary();
      $('#request').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      setTimeout(function () { f.name.focus({ preventScroll: true }); }, reduceMotion ? 0 : 600);
    };

    function setErr(input, msg) {
      var id = input.id + '-err', box = document.getElementById(id);
      if (!msg) { if (box) box.remove(); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); return; }
      if (!box) { box = el('p', { class: 'err', id: id }); input.parentNode.appendChild(box); }
      box.textContent = msg; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
    }
    var sentKey = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = { website: f.website ? f.website.value : '', name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), from: f.from.value, to: f.to.value,
        adults: +f.adults.value, kids: +f.kids.value, room: f.room.value, notes: f.notes.value.trim() };
      var errs = [[f.name, v.name ? '' : 'Add your name.'],
        [f.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ? '' : 'Add a valid email address.'],
        [f.phone, v.phone.replace(/\D/g, '').length >= 9 ? '' : 'Add a phone number we can WhatsApp.'],
        [f.from, validStay(v.from, v.to)]];
      var r = roomOf(v.room);
      if (r && (r.maxAdults < v.adults || r.sleeps < v.adults + v.kids)) errs.push([f.room, r.name + ' sleeps ' + r.sleeps + '. Choose another studio or let us suggest one.']);
      else errs.push([f.room, '']);
      var first = null, n = 0;
      errs.forEach(function (x) { setErr(x[0], x[1]); if (x[1]) { n++; if (!first) first = x[0]; } });
      if (first) { note.dataset.state = 'err'; note.textContent = n === 1 ? 'One field needs attention.' : n + ' fields need attention.'; first.focus(); send.hidden = true; return; }
      var nights = nightsBetween(v.from, v.to), est = r ? stayPrice(r, v.from, v.to) : 0;
      var text = ['BOOKING REQUEST (not yet confirmed), sent from the Lindani Farm website',
        'Name: ' + v.name, 'Email: ' + v.email, 'Phone: ' + v.phone,
        'Dates: ' + fmtDate(v.from) + ' to ' + fmtDate(v.to) + ' (' + nights + ' nights)',
        'Guests: ' + v.adults + ' adult' + (v.adults > 1 ? 's' : '') + (v.kids ? ', ' + v.kids + ' child' + (v.kids > 1 ? 'ren' : '') : ''),
        'Studio: ' + (r ? r.name : 'Not chosen, please suggest'), est ? 'Website estimate: ' + money(est) : null,
        v.notes ? 'Notes: ' + v.notes : null, '', 'Please confirm availability and send the invoice. Thank you!']
        .filter(function (x) { return x !== null; }).join('\n');
      var key = JSON.stringify(v), btn = $('[type=submit]', form), subject = 'Booking request: ' + fmtDate(v.from) + ' to ' + fmtDate(v.to);
      function handOff() {
        note.dataset.state = 'ok'; note.textContent = 'Almost done: send your request to the farm below.';
        var status = el('p', { class: 'fx-small', role: 'status' });
        send.innerHTML = '';
        send.appendChild(el('p', { class: 'fx-badge', text: 'Booking request · not a confirmed booking' }));
        send.appendChild(el('p', { text: 'Send it on WhatsApp or by email and the farm will confirm availability and send your invoice.' }));
        send.appendChild(shareButtons(subject, text, status));
        send.appendChild(status);
        send.appendChild(guideNote());
        send.hidden = false;
        $('a', send).focus();
      }
      function received() {
        note.dataset.state = 'ok'; note.textContent = 'Request sent.';
        var status = el('p', { class: 'fx-small', role: 'status' });
        send.innerHTML = '';
        send.appendChild(el('p', { class: 'fx-badge', text: 'Request received · not yet confirmed' }));
        send.appendChild(receivedNote(v.name));
        send.appendChild(guideNote());
        send.appendChild(el('p', { class: 'fx-small', text: 'Want a quicker answer? Send it on WhatsApp too:' }));
        send.appendChild(shareButtons(subject, text, status));
        send.appendChild(status);
        send.hidden = false;
        send.setAttribute('tabindex', '-1'); send.focus();
      }
      if (sentKey === key) { received(); return; }
      btn.disabled = true; note.dataset.state = ''; note.textContent = 'Sending your request…';
      sendRequest(v, est, 'book').then(function () { sentKey = key; received(); }, handOff)
        .then(function () { btn.disabled = false; });
    });
  })();

  renderRates();
  initLang();
})();
