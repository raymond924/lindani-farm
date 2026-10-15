// /api/admin/:action: the bookings dashboard (admin.html).
//   POST login   { password }                        -> { token }
//   GET  list                                         -> { bookings }
//   POST update  { id, status?, room?, hostNotes? }   -> { booking }
//   POST add     { name, from, to, room, ... }        -> { booking }   (phone, Booking.com and other bookings)
//   POST delete  { id }                               -> { ok }
import { STATUSES, allBookings, cleanRoom, cleanStay, json, makeToken, newId, passwordOk, readJson, store, tokenOk } from '../lib/common.mjs';

const SOURCES = ['Phone or WhatsApp', 'Booking.com', 'Airbnb', 'NightsBridge', 'Walk-in', 'Other'];
const ID = /^\d{14}-[0-9a-f]{6}$/;

export default async (req, context) => {
  const action = context.params.action;

  if (action === 'login') {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!process.env.ADMIN_PASSWORD) return json({ error: 'The dashboard password has not been set up yet (ADMIN_PASSWORD in Netlify).' }, 503);
    const body = await readJson(req, 1000);
    if (!body || !passwordOk(body.password)) {
      await new Promise(r => setTimeout(r, 800));   // slows down password guessing
      return json({ error: 'That password is not right.' }, 401);
    }
    return json({ token: makeToken() });
  }

  if (!tokenOk(req)) return json({ error: 'Please sign in again.' }, 401);
  const s = store();

  if (action === 'list' && req.method === 'GET') {
    const bookings = (await allBookings()).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    return json({ bookings });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await readJson(req);
  if (!body) return json({ error: 'Bad request' }, 400);

  if (action === 'add') {
    const { value, error } = cleanStay(body, true);
    if (error) return json({ error }, 400);
    const rec = {
      ...value, id: newId(), created: new Date().toISOString(), hostNotes: '',
      status: STATUSES.includes(body.status) ? body.status : 'confirmed',
      source: SOURCES.includes(body.source) ? body.source : 'Other'
    };
    await s.setJSON('b/' + rec.id, rec);
    return json({ booking: rec });
  }

  if (typeof body.id !== 'string' || !ID.test(body.id)) return json({ error: 'Unknown booking.' }, 400);
  const key = 'b/' + body.id;
  const rec = await s.get(key, { type: 'json' });
  if (!rec) return json({ error: 'That booking no longer exists.' }, 404);

  if (action === 'update') {
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return json({ error: 'Unknown status.' }, 400);
      rec.status = body.status;
      rec[body.status + 'At'] = new Date().toISOString();
    }
    if (body.room !== undefined) {
      const room = cleanRoom(body.room);
      if (room === null) return json({ error: 'Unknown studio.' }, 400);
      rec.room = room;
    }
    if (body.hostNotes !== undefined) rec.hostNotes = String(body.hostNotes).slice(0, 2000);
    rec.updated = new Date().toISOString();
    await s.setJSON(key, rec);
    return json({ booking: rec });
  }

  if (action === 'delete') {
    await s.delete(key);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
};

export const config = { path: '/api/admin/:action' };
