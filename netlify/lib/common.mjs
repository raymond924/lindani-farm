// Shared helpers for the Lindani Farm booking functions.
// Bookings are stored in Netlify Blobs (store "bookings", one JSON blob per booking).
import { getStore } from '@netlify/blobs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Keep in step with the studio ids in lodge-data.js.
export const ROOMS = ['studio-1', 'studio-2', 'studio-3', 'studio-4'];
export const STATUSES = ['new', 'confirmed', 'declined', 'cancelled'];

export const store = () => getStore({ name: 'bookings', consistency: 'strong' });

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export function newId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + randomBytes(3).toString('hex');
}

export async function readJson(req, limit = 8000) {
  if (+(req.headers.get('content-length') || 0) > limit) return null;
  const text = await req.text();
  if (text.length > limit) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

export async function allBookings() {
  const s = store();
  const { blobs } = await s.list({ prefix: 'b/' });
  const items = await Promise.all(blobs.map(b => s.get(b.key, { type: 'json' })));
  return items.filter(Boolean);
}

/* ---------- validation ---------- */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v, lo, hi, dflt) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : dflt; };
const day = s => Date.parse(s + 'T00:00:00Z');

export function cleanRoom(v) {
  const room = str(v, 80);
  if (!room) return '';
  const ids = room.split('+');
  if (new Set(ids).size !== ids.length || !ids.every(id => ROOMS.includes(id))) return null;
  return ids.join('+');
}

// Returns { value } or { error }. `staff` relaxes the rules for bookings the farm adds itself.
export function cleanStay(b, staff = false) {
  const v = {
    name: str(b.name, 100), email: str(b.email, 200), phone: str(b.phone, 40),
    from: str(b.from, 10), to: str(b.to, 10),
    adults: int(b.adults, 1, 8, NaN), kids: int(b.kids, 0, 6, 0),
    room: cleanRoom(b.room), notes: str(b.notes, 1000),
    estimate: int(b.estimate, 0, 1000000, 0)
  };
  if (!v.name) return { error: 'Add a name.' };
  if (v.email && !EMAIL.test(v.email)) return { error: 'Add a valid email address.' };
  if (!staff && !v.email) return { error: 'Add a valid email address.' };
  if (!staff && v.phone.replace(/\D/g, '').length < 9) return { error: 'Add a phone number.' };
  if (!DATE.test(v.from) || !DATE.test(v.to) || isNaN(day(v.from)) || isNaN(day(v.to))) return { error: 'Add valid dates.' };
  const nights = (day(v.to) - day(v.from)) / 864e5;
  if (nights < 1 || nights > 60) return { error: 'Check the dates.' };
  if (!staff && day(v.from) < Date.now() - 2 * 864e5) return { error: 'The arrival date has passed.' };
  if (Number.isNaN(v.adults)) return { error: 'Check the number of adults.' };
  if (v.room === null) return { error: 'Unknown studio.' };
  return { value: v };
}

/* ---------- dashboard sign-in ----------
   The password is the ADMIN_PASSWORD environment variable (set in Netlify).
   A sign-in returns a token that lasts 12 hours. Changing the password signs everyone out. */
const secret = () => process.env.ADMIN_PASSWORD || '';
const sign = s => createHmac('sha256', 'lindani-admin:' + secret()).update(s).digest('base64url');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export function passwordOk(p) {
  if (!secret() || typeof p !== 'string') return false;
  const h = s => createHmac('sha256', 'pw').update(s).digest('hex');
  return same(h(p), h(secret()));
}
export function makeToken() {
  const exp = String(Date.now() + 12 * 3600e3);
  return exp + '.' + sign(exp);
}
export function tokenOk(req) {
  if (!secret()) return false;
  const [exp, sig] = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').split('.');
  if (!exp || !sig || !(+exp > Date.now())) return false;
  return same(sig, sign(exp));
}

/* ---------- optional email to the farm (Resend, free tier) ----------
   Set RESEND_API_KEY and NOTIFY_EMAIL in Netlify to receive an email for every new request. */
export async function notifyFarm(r) {
  const key = process.env.RESEND_API_KEY, to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  const site = process.env.URL || '';
  const text = [
    'New booking request from the website (not yet confirmed).', '',
    'Name: ' + r.name, 'Email: ' + r.email, 'Phone: ' + r.phone,
    'Dates: ' + r.from + ' to ' + r.to,
    'Guests: ' + r.adults + ' adults' + (r.kids ? ', ' + r.kids + ' children' : ''),
    'Studio: ' + (r.room || 'not chosen'),
    r.estimate ? 'Website estimate: R ' + r.estimate : '',
    r.notes ? 'Notes: ' + r.notes : '', '',
    site ? 'Confirm or decline it in the dashboard: ' + site + '/admin' : ''
  ].filter(Boolean).join('\n');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || 'Lindani Farm website <onboarding@resend.dev>',
      to: [to], reply_to: r.email || undefined,
      subject: 'Booking request: ' + r.name + ', ' + r.from + ' to ' + r.to, text
    })
  });
}
