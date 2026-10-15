/* Lindani Farm: bookings dashboard.
   Talks to the Netlify functions in netlify/functions/admin.mjs. Studio names, the guest
   guide and policy links come from lodge-data.js. Guest-submitted text is only ever set
   with textContent. */
(function () {
  'use strict';
  var D = window.LODGE || { rooms: [], booking: {}, contact: {} };
  var TOKEN_KEY = 'lindani-admin-token';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var state = { bookings: [], tab: 'new', loaded: false };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function store(fn) { try { return fn(); } catch (e) { return null; } }
  function getToken() { return store(function () { return sessionStorage.getItem(TOKEN_KEY); }); }
  function setToken(t) { store(function () { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); }); }

  /* ---------- dates and money ---------- */
  function ms(d) { return Date.parse(d + 'T00:00:00Z'); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function addDays(d, n) { return iso(ms(d) + n * 864e5); }
  function todayIso() { var t = new Date(); return iso(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())); }
  function nights(a, b) { return Math.round((ms(b) - ms(a)) / 864e5); }
  function fmt(d, opts) { return new Date(ms(d)).toLocaleDateString('en-ZA', Object.assign({ weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }, opts || {})); }
  function money(n) { return 'R ' + Math.round(n).toLocaleString('en-ZA'); }
  function ago(isoTime) {
    var m = Math.round((Date.now() - Date.parse(isoTime)) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' min ago';
    if (m < 60 * 24) return Math.round(m / 60) + ' h ago';
    return new Date(isoTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  }
  function roomName(id) {
    if (!id) return 'No studio yet';
    return id.split('+').map(function (x) { var r = D.rooms.filter(function (y) { return y.id === x; })[0]; return r ? r.name : x; }).join(' + ');
  }
  function guests(b) { return b.adults + ' adult' + (b.adults > 1 ? 's' : '') + (b.kids ? ', ' + b.kids + ' child' + (b.kids > 1 ? 'ren' : '') : ''); }
  function overlaps(a, b) { return a.from < b.to && a.to > b.from; }
  function shareRoom(a, b) { if (!a.room || !b.room) return false; var x = a.room.split('+'); return b.room.split('+').some(function (r) { return x.indexOf(r) >= 0; }); }

  /* ---------- API ---------- */
  function api(action, body) {
    var opts = { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + (getToken() || '') } };
    if (body) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch('/api/admin/' + action, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (res.status === 401 && action !== 'login') { setToken(null); showLogin('Your session ended. Please sign in again.'); }
        if (!res.ok) throw new Error(j.error || 'Something went wrong (' + res.status + ').');
        return j;
      });
    }, function () { throw new Error('Can\'t reach the booking system. Check your connection. (The dashboard only works on the live Netlify site.)'); });
  }

  var toastTimer;
  function toast(msg) {
    var s = $('#status'); s.textContent = msg; s.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { s.classList.remove('on'); }, 3200);
  }

  /* ---------- sign in ---------- */
  function showLogin(msg) {
    $('#dash').hidden = true; $('#bar-actions').hidden = true; $('#login').hidden = false;
    $('#login-err').textContent = msg || '';
    $('#pw').focus();
  }
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('#pw').value, btn = $('#login-form button');
    if (!pw) { $('#login-err').textContent = 'Enter the password.'; return; }
    btn.disabled = true; $('#login-err').textContent = '';
    api('login', { password: pw }).then(function (j) {
      setToken(j.token); $('#pw').value = ''; start();
    }).catch(function (err) { $('#login-err').textContent = err.message; })
      .then(function () { btn.disabled = false; });
  });
  $('#signout').addEventListener('click', function () { setToken(null); state.bookings = []; showLogin(); });
  $('#refresh').addEventListener('click', function () { load(true); });

  function start() {
    $('#login').hidden = true; $('#dash').hidden = false; $('#bar-actions').hidden = false;
    $('#today-label').textContent = fmt(todayIso(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    load();
  }
  function load(manual) {
    return api('list').then(function (j) {
      state.bookings = j.bookings || []; state.loaded = true;
      if (state.tab === 'new' && !counts().new && !manual) state.tab = counts().upcoming ? 'upcoming' : 'new';
      render();
      if (manual) toast('Up to date.');
    }).catch(function (err) { if (getToken()) toast(err.message); });
  }

  /* ---------- views ---------- */
  function counts() {
    var t = todayIso(), c = { new: 0, upcoming: 0, past: 0, declined: 0, all: state.bookings.length };
    state.bookings.forEach(function (b) {
      if (b.status === 'new') c.new++;
      else if (b.status === 'confirmed') c[b.to >= t ? 'upcoming' : 'past']++;
      else c.declined++;
    });
    return c;
  }
  function inTab(b) {
    var t = todayIso();
    switch (state.tab) {
      case 'new': return b.status === 'new';
      case 'upcoming': return b.status === 'confirmed' && b.to >= t;
      case 'past': return b.status === 'confirmed' && b.to < t;
      case 'declined': return b.status === 'declined' || b.status === 'cancelled';
      default: return true;
    }
  }
  function clashes(b) {
    if (b.status !== 'new' && b.status !== 'confirmed') return [];
    return state.bookings.filter(function (o) { return o.id !== b.id && o.status === 'confirmed' && overlaps(b, o) && shareRoom(b, o); });
  }

  function render() {
    var t = todayIso(), in30 = addDays(t, 30), c = counts();
    document.title = (c.new ? '(' + c.new + ') ' : '') + 'Bookings · Lindani Farm';

    var conf = state.bookings.filter(function (b) { return b.status === 'confirmed'; });
    $('#st-new').textContent = c.new;
    $('#st-arr').textContent = conf.filter(function (b) { return b.from >= t && b.from < in30; }).length;
    $('#st-nights').textContent = conf.reduce(function (sum, b) {
      var a = b.from > t ? b.from : t, z = b.to < in30 ? b.to : in30, rooms = b.room ? b.room.split('+').length : 1;
      return sum + Math.max(0, nights(a, z)) * rooms;
    }, 0);
    $('#st-val').textContent = money(conf.filter(function (b) { return b.to >= t; }).reduce(function (s, b) { return s + (b.estimate || 0); }, 0));

    renderOcc(t);

    Array.prototype.forEach.call($('#tabs').children, function (btn) {
      var k = btn.getAttribute('data-tab'), label = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', label);
      btn.textContent = label;
      btn.appendChild(el('span', { class: 'n', text: String(c[k]) }));
      btn.setAttribute('aria-selected', String(k === state.tab));
    });

    var list = $('#list'), rows = state.bookings.filter(inTab);
    if (state.tab === 'past' || state.tab === 'all') rows = rows.slice().reverse();
    if (state.tab === 'new') rows = rows.slice().sort(function (a, b) { return a.created < b.created ? 1 : -1; });
    list.innerHTML = '';
    if (!rows.length) {
      list.appendChild(el('li', { class: 'ad-empty', text: {
        new: 'No new requests. Requests from the website appear here.', upcoming: 'No upcoming confirmed bookings.',
        past: 'No past bookings yet.', declined: 'Nothing declined or cancelled.', all: 'No bookings yet.' }[state.tab] }));
      return;
    }
    rows.forEach(function (b) { list.appendChild(card(b)); });
  }

  function renderOcc(t) {
    var days = [], i, box = $('#occ');
    for (i = 0; i < 14; i++) days.push(addDays(t, i));
    var head = el('tr', null, [el('th', { class: 'room', scope: 'col', text: 'Studio' })].concat(days.map(function (d) {
      return el('th', { scope: 'col' }, [new Date(ms(d)).toLocaleDateString('en-ZA', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2), el('br'), String(+d.slice(8))]);
    })));
    var body = D.rooms.map(function (r) {
      return el('tr', null, [el('th', { class: 'room', scope: 'row', text: r.name })].concat(days.map(function (d) {
        var night = { from: d, to: addDays(d, 1), room: r.id };
        var here = state.bookings.filter(function (b) { return (b.status === 'confirmed' || b.status === 'new') && overlaps(night, b) && shareRoom(night, b); });
        var nConf = here.filter(function (b) { return b.status === 'confirmed'; }).length;
        var cls = nConf > 1 ? 'clash' : nConf ? 'conf' : here.length ? 'new' : '';
        var label = here.length ? here.map(function (b) { return b.name + (b.status === 'new' ? ' (request)' : ''); }).join(', ') : 'Free';
        return el('td', { class: cls || null, title: fmt(d) + ': ' + label }, [el('span', { class: 'sr', text: label })]);
      })));
    });
    box.innerHTML = '';
    box.appendChild(el('table', null, [el('thead', null, [head]), el('tbody', null, body)]));
  }

  /* ---------- messages to the guest ---------- */
  function waNumber(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    else if (d.charAt(0) === '0') d = '27' + d.slice(1);
    return d.length >= 9 ? d : '';
  }
  function message(b) {
    var first = (b.name || '').split(' ')[0], n = nights(b.from, b.to);
    var dates = fmt(b.from, { weekday: 'long' }) + ' to ' + fmt(b.to, { weekday: 'long' }) + ' (' + n + ' night' + (n > 1 ? 's' : '') + ')';
    var B = D.booking || {};
    if (b.status === 'confirmed') {
      var lines = ['Hi ' + first + ', thank you for booking Lindani Farm! We\'re happy to confirm ' + roomName(b.room) + ' from ' + dates + '.'];
      if (b.estimate) lines.push('The total is ' + money(b.estimate) + '. A ' + (B.depositPercent || 50) + '% deposit of ' + money(b.estimate * (B.depositPercent || 50) / 100) + ' secures your stay, with the balance due on arrival. ' + (B.depositInstructions || ''));
      if (B.onboardingUrl) lines.push('Everything for your stay (directions, check-in from ' + (B.checkIn || '14:00') + ', Wi-Fi and house rules) is in our guest guide: ' + B.onboardingUrl);
      if (B.policyUrl) lines.push('Our booking policy: ' + B.policyUrl);
      lines.push('See you soon!\nLindani Farm');
      return lines.join('\n\n');
    }
    if (b.status === 'declined' || b.status === 'cancelled') {
      return 'Hi ' + first + ', thank you for your request for ' + dates + '. Unfortunately we\'re fully booked then. Would other dates work for you? We\'d love to have you.\n\nLindani Farm';
    }
    return 'Hi ' + first + ', thank you for your booking request for ' + dates + ' at Lindani Farm. ';
  }

  /* ---------- one booking ---------- */
  function card(b) {
    var n = nights(b.from, b.to), clash = clashes(b);
    var phoneWa = waNumber(b.phone), msg = message(b);
    var left = el('div', null, [
      el('div', { class: 'ad-card-top' }, [
        el('span', { class: 'ad-pill ' + b.status, text: { new: 'New request', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled' }[b.status] || b.status }),
        el('span', { class: 'ad-meta', text: (b.source || '') + ' · ' + ago(b.created) })
      ]),
      el('h3', { text: b.name }),
      el('p', { class: 'ad-dates', text: fmt(b.from) + ' → ' + fmt(b.to) + ' · ' + n + ' night' + (n > 1 ? 's' : '') }),
      el('p', { class: 'ad-meta', text: guests(b) + ' · ' + roomName(b.room) + (b.estimate ? ' · ' + (b.source && b.source.indexOf('Website') === 0 ? 'website estimate ' : '') + money(b.estimate) : '') }),
      el('dl', { class: 'ad-dl' }, [
        b.phone ? el('div', { style: 'display:contents' }, [el('dt', { text: 'Phone' }), el('dd', null, [el('a', { href: 'tel:' + b.phone.replace(/[^\d+]/g, ''), text: b.phone })])]) : null,
        b.email ? el('div', { style: 'display:contents' }, [el('dt', { text: 'Email' }), el('dd', null, [el('a', { href: 'mailto:' + b.email, text: b.email })])]) : null
      ]),
      b.notes ? el('p', { class: 'ad-guest-notes', text: 'Guest notes: ' + b.notes }) : null,
      clash.length ? el('p', { class: 'ad-warn', text: 'Clashes with ' + clash.map(function (o) { return o.name + ' (' + fmt(o.from) + ' – ' + fmt(o.to) + ', ' + roomName(o.room) + ')'; }).join('; ') + '.' }) : null
    ]);

    var roomSel = el('select', { id: 'room-' + b.id }, [el('option', { value: '', text: 'No studio yet' })].concat(
      D.rooms.map(function (r) { return el('option', { value: r.id, text: r.name, selected: b.room === r.id }); })));
    if (b.room && b.room.indexOf('+') > 0) roomSel.appendChild(el('option', { value: b.room, selected: true, text: roomName(b.room) }));
    roomSel.addEventListener('change', function () { update(b, { room: roomSel.value }, 'Studio saved.'); });

    var notes = el('textarea', { id: 'notes-' + b.id, rows: 2, placeholder: 'Only you see these: deposit paid, arrival time…' });
    notes.value = b.hostNotes || '';
    var saved = el('p', { class: 'ad-saved', 'aria-live': 'polite' });
    notes.addEventListener('change', function () {
      api('update', { id: b.id, hostNotes: notes.value }).then(function (j) { Object.assign(b, j.booking); saved.textContent = 'Notes saved.'; })
        .catch(function (err) { saved.textContent = err.message; });
    });

    var actions = [];
    if (b.status === 'new') {
      actions.push(el('button', { type: 'button', class: 'btn btn-book', onclick: function () {
        if (!b.room && !confirm('No studio is chosen yet, so this booking won\'t block the website calendar. Confirm anyway?')) return;
        if (clash.length && !confirm('This clashes with another confirmed booking. Confirm anyway?')) return;
        update(b, { status: 'confirmed' }, 'Confirmed. Now send the guest their confirmation.');
      } }, ['Confirm']));
      actions.push(el('button', { type: 'button', class: 'ad-btn ad-btn-line', onclick: function () { update(b, { status: 'declined' }, 'Declined. Let the guest know.'); } }, ['Decline']));
    } else if (b.status === 'confirmed') {
      actions.push(el('button', { type: 'button', class: 'ad-btn ad-btn-text', onclick: function () {
        if (confirm('Mark ' + b.name + '\'s booking as cancelled? It frees the studio on the website.')) update(b, { status: 'cancelled' }, 'Marked as cancelled.');
      } }, ['Mark cancelled']));
    } else {
      actions.push(el('button', { type: 'button', class: 'ad-btn ad-btn-text', onclick: function () { update(b, { status: 'new' }, 'Moved back to requests.'); } }, ['Move back to requests']));
    }

    var send = [];
    if (phoneWa) send.push(el('a', { class: 'ad-btn ad-btn-dark', href: 'https://wa.me/' + phoneWa + '?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener' },
      [b.status === 'confirmed' ? 'Send confirmation on WhatsApp' : b.status === 'new' ? 'Reply on WhatsApp' : 'Let them know on WhatsApp']));
    if (b.email) send.push(el('a', { class: 'ad-btn ad-btn-line', href: 'mailto:' + b.email + '?subject=' + encodeURIComponent('Your Lindani Farm ' + (b.status === 'confirmed' ? 'booking' : 'booking request') + ': ' + fmt(b.from) + ' to ' + fmt(b.to)) + '&body=' + encodeURIComponent(msg) }, ['Email guest']));

    var del = el('button', { type: 'button', class: 'ad-btn ad-btn-text ad-btn-danger', onclick: function () {
      if (!confirm('Delete ' + b.name + '\'s ' + (b.status === 'new' ? 'request' : 'booking') + ' for good? Use this for spam or test entries.')) return;
      api('delete', { id: b.id }).then(function () {
        state.bookings = state.bookings.filter(function (x) { return x.id !== b.id; }); render(); toast('Deleted.');
      }).catch(function (err) { toast(err.message); });
    } }, ['Delete']);

    var right = el('div', { class: 'ad-side' }, [
      el('div', { class: 'field' }, [el('label', { for: 'room-' + b.id, text: 'Studio' }), roomSel]),
      el('div', { class: 'ad-row' }, actions),
      send.length ? el('div', { class: 'ad-row' }, send) : null,
      el('div', { class: 'field' }, [el('label', { for: 'notes-' + b.id, text: 'Your notes' }), notes, saved]),
      el('div', { class: 'ad-row' }, [del])
    ]);
    return el('li', { class: 'ad-card' + (b.status === 'new' ? ' is-new' : ''), id: 'b-' + b.id }, [left, right]);
  }

  function update(b, patch, done) {
    return api('update', Object.assign({ id: b.id }, patch)).then(function (j) {
      Object.assign(b, j.booking); render(); toast(done);
      var again = document.getElementById('b-' + b.id);
      if (again) { var a = again.querySelector('a.ad-btn-dark') || again.querySelector('button'); if (a) a.focus(); }
      else if (patch.status) {
        // The card moved to another tab: follow it.
        state.tab = patch.status === 'confirmed' ? 'upcoming' : patch.status === 'new' ? 'new' : 'declined';
        render();
        var moved = document.getElementById('b-' + b.id);
        if (moved) { moved.scrollIntoView({ block: 'center' }); var f = moved.querySelector('a.ad-btn-dark,button'); if (f) f.focus({ preventScroll: true }); }
      }
    }).catch(function (err) { toast(err.message); render(); });
  }

  $('#tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-tab]'); if (!btn) return;
    state.tab = btn.getAttribute('data-tab'); render();
  });

  /* ---------- add a booking ---------- */
  var dlg = $('#add-dialog'), af = $('#add-form');
  function opts(sel, lo, hi, v) { for (var i = lo; i <= hi; i++) sel.appendChild(el('option', { value: i, text: String(i), selected: i === v })); }
  $('#a-room').appendChild(el('option', { value: '', text: 'Not decided' }));
  D.rooms.forEach(function (r) { $('#a-room').appendChild(el('option', { value: r.id, text: r.name })); });
  opts($('#a-adults'), 1, 8, 2); opts($('#a-kids'), 0, 6, 0);
  $('#add-open').addEventListener('click', function () {
    af.reset(); $('#add-err').textContent = '';
    $('#a-from').value = todayIso(); $('#a-to').value = addDays(todayIso(), (D.booking && D.booking.minNights) || 2);
    dlg.showModal(); $('#a-name').focus();
  });
  $('#add-cancel').addEventListener('click', function () { dlg.close(); });
  $('#a-from').addEventListener('change', function () {
    if ($('#a-from').value && (!$('#a-to').value || $('#a-to').value <= $('#a-from').value)) $('#a-to').value = addDays($('#a-from').value, 1);
  });
  af.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = af.elements, body = {
      name: f.name.value.trim(), source: f.source.value, phone: f.phone.value.trim(), email: f.email.value.trim(),
      from: f.from.value, to: f.to.value, room: f.room.value, adults: +f.adults.value, kids: +f.kids.value,
      estimate: +String(f.estimate.value).replace(/[^\d]/g, '') || 0, notes: f.notes.value.trim(), status: 'confirmed'
    };
    if (!body.name) { $('#add-err').textContent = 'Add the guest\'s name.'; f.name.focus(); return; }
    if (!body.from || !body.to || body.to <= body.from) { $('#add-err').textContent = 'Check the dates: leave must be after arrive.'; f.to.focus(); return; }
    var btn = af.querySelector('[type=submit]'); btn.disabled = true;
    api('add', body).then(function (j) {
      state.bookings.push(j.booking);
      state.bookings.sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
      dlg.close(); state.tab = 'upcoming'; render(); toast('Booking saved. The studio is blocked on the website.');
    }).catch(function (err) { $('#add-err').textContent = err.message; })
      .then(function () { btn.disabled = false; });
  });

  /* ---------- keep it fresh while the tab is open ---------- */
  setInterval(function () {
    if (getToken() && !document.hidden && !dlg.open && !(document.activeElement && document.activeElement.closest('textarea'))) load();
  }, 60000);

  if (getToken()) start(); else showLogin();
})();
