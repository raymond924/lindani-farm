// POST /api/booking: a guest's booking request from the Book page or the concierge.
import { cleanStay, json, newId, notifyFarm, readJson, store } from '../lib/common.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await readJson(req);
  if (!body) return json({ error: 'Bad request' }, 400);
  if (body.website) return json({ ok: true, id: newId() });   // spam trap: a hidden field people never fill
  const { value, error } = cleanStay(body);
  if (error) return json({ error }, 400);
  const rec = {
    ...value, id: newId(), status: 'new', created: new Date().toISOString(),
    source: body.source === 'chat' ? 'Website chat' : 'Website booking form', hostNotes: ''
  };
  await store().setJSON('b/' + rec.id, rec);
  try { await notifyFarm(rec); } catch (e) { console.error('notify failed', e); }
  return json({ ok: true, id: rec.id });
};

export const config = { path: '/api/booking' };
