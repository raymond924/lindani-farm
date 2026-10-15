// GET /api/availability.js: confirmed bookings for the site's date checker and calendar.
// Loaded as a script before features.js; it only exposes studio and dates, never guest details.
import { allBookings } from '../lib/common.mjs';

export default async () => {
  let booked = [];
  try {
    const todayIso = new Date().toISOString().slice(0, 10);
    // Never hold up the page: give up after 3 seconds and fall back to the data file.
    const list = await Promise.race([allBookings(), new Promise(r => setTimeout(() => r([]), 3000))]);
    list
      .filter(b => b.status === 'confirmed' && b.room && b.to >= todayIso)
      .forEach(b => b.room.split('+').forEach(room => booked.push({ room, from: b.from, to: b.to })));
  } catch (e) {
    console.error('availability failed', e);
  }
  return new Response('window.LODGE_LIVE = ' + JSON.stringify({ booked }) + ';\n', {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, max-age=60, stale-while-revalidate=120'
    }
  });
};

export const config = { path: '/api/availability.js' };
