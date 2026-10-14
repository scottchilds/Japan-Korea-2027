const db = supabase.createClient('https://rnhokdffdbizovainxpn.supabase.co', 'sb_publishable_Vpf_xbvrYIfRjdJXrLSuRg_7Ozy9u_F');
const app = document.getElementById('app');
let user = null, days = [], acts = [], hearts = [], modal = null, err = '', sel = null, mode = 'plan', tabSet = false, pending = false, tmr, chan;
const today = () => new Date().toLocaleDateString('en-CA');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ft = s => { if (!s) return ''; const [h, m] = s.split(':'); return ((+h % 12) || 12) + ':' + m + ' ' + (+h < 12 ? 'AM' : 'PM'); };
const tm = s => esc((s || '').slice(0, 5));
const okUrl = u => /^https?:\/\//i.test(u || '');
const fixUrl = u => { u = (u || '').trim(); return u && !okUrl(u) ? 'https://' + u : u; };
const dayCmp = (x, y) => (x.day_date ? 0 : 1) - (y.day_date ? 0 : 1) || (x.day_date || '').localeCompare(y.day_date || '') || x.sort_order - y.sort_order;
const dayName = d => d.day_number ? `Day ${d.day_number}: ${d.city}` : (d.city || d.label);
const money = a => a.price_amount == null ? '' : a.price_currency === 'JPY' ? '¥' + Math.round(a.price_amount).toLocaleString() : '$' + Number(a.price_amount).toFixed(2);
const range = a => { const s = ft(a.start_time), e = ft(a.end_time); if (!s) return ''; if (!e) return s; return (s.slice(-2) === e.slice(-2) ? s.slice(0, -3) : s) + '–' + e; };

async function load() {
  const [d, a, h] = await Promise.all([
    db.from('days').select('*'),
    db.from('activities').select('*').order('created_at'),
    db.from('hearts').select('*')
  ]);
  const e = d.error || a.error || h.error;
  if (e) alert('Could not load data: ' + e.message);
  else {
    days = d.data; acts = a.data; hearts = h.data;
    if (!tabSet) { tabSet = true; const t = days.find(x => x.day_date === today()); if (t) { mode = 'trip'; sel = t.id; } }
  }
  render();
}

function badge(d) {
  return d.badge === 'ship' ? icon('ship', 18) : `<i class="dot ${d.badge === 'korea' ? 'kr' : ''}"></i>`;
}

function card(a) {
  const n = hearts.filter(h => h.activity_id === a.id).length;
  const mine = hearts.some(h => h.activity_id === a.id && h.user_id === user.id);
  const det = [money(a), range(a)].filter(Boolean).join('<b class="sep">•</b>');
  const bk = a.status === 'booked';
  return `<div class="card">${okUrl(a.image_url) ? `<img src="${esc(a.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    <div class="cb"><h3>${esc(a.title)}</h3><div class="det">${det}</div>
    <div class="act"><span class="st ${bk ? 'bk' : ''}">${icon(bk ? 'trophy' : 'bulb', 22)}${bk ? 'Booked' : 'Idea'}</span>
    <button class="ib" data-a="edit-act" data-id="${a.id}" aria-label="Edit">${icon('edit', 22)}</button>
    ${okUrl(a.url) ? `<a class="ib" href="${esc(a.url)}" target="_blank" rel="noopener" aria-label="Open link">${icon('link', 22)}</a>` : ''}
    <button class="ib ${mine ? 'on' : ''}" data-a="heart" data-id="${a.id}" aria-label="Favorite">${icon('heart', 22)}<span>${n}</span></button></div></div></div>`;
}

function sheet() {
  const sorted = [...days].sort(dayCmp);
  let b;
  if (modal.t === 'day') {
    const d = days.find(x => x.id === modal.id);
    b = `<h2>Edit day</h2><form id="dayForm">
    <label>City<input name="city" value="${esc(d.city)}"></label>
    <label>Date<input type="date" name="day_date" value="${esc(d.day_date)}"></label>
    <div class="two"><label>Arrive<input type="time" name="arrival_time" value="${tm(d.arrival_time)}"></label>
    <label>Depart<input type="time" name="departure_time" value="${tm(d.departure_time)}"></label></div>
    <label>All aboard<input type="time" name="all_aboard_time" value="${tm(d.all_aboard_time)}"></label>
    <label>Notes<textarea name="notes" rows="2">${esc(d.notes)}</textarea></label>
    <div class="row"><button class="btn pri">Save</button><button type="button" class="btn" data-a="close">Cancel</button></div></form>`;
  } else {
    const a = acts.find(x => x.id === modal.id) || {day_id: sel, price_currency: 'USD', status: 'idea'};
    const opt = (v, l, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
    const more = modal.id ? `<h2 style="margin-top:16px">Booking details</h2>
    <label>Status<select name="status">${opt('idea', 'Idea', a.status)}${opt('booked', 'Booked', a.status)}</select></label>
    <label>Booked through<select name="booked_via">${opt('', 'Not set', a.booked_via || '')}${opt('ship', 'Ship excursion', a.booked_via)}${opt('independent', 'Independent', a.booked_via)}</select></label>
    <label>Provider<input name="provider" value="${esc(a.provider)}"></label>
    <label>Confirmation number<input name="confirmation_number" value="${esc(a.confirmation_number)}"></label>
    <label>Meeting point<input name="meeting_point" value="${esc(a.meeting_point)}"></label>
    <label>Map link<input name="map_url" inputmode="url" value="${esc(a.map_url)}"></label>
    <label>Name in Japanese<input name="name_ja" lang="ja" value="${esc(a.name_ja)}"></label>
    <label>Address in Japanese<input name="address_ja" lang="ja" value="${esc(a.address_ja)}"></label>
    <label>Image link<input name="image_url" inputmode="url" value="${esc(a.image_url)}"></label>` : '';
    b = `<h2>${modal.id ? 'Edit' : 'Add'} activity</h2><form id="actForm">
    <label>Title<input name="title" value="${esc(a.title)}"></label>
    <label>Link (optional)<input name="url" inputmode="url" value="${esc(a.url)}"></label>
    <label>Day<select name="day_id">${sorted.map(d => opt(d.id, esc(dayName(d)) + (d.day_date ? '' : ' (date TBD)'), a.day_id)).join('')}</select></label>
    <div class="two"><label>Start<input type="time" name="start_time" value="${tm(a.start_time)}"></label>
    <label>End<input type="time" name="end_time" value="${tm(a.end_time)}"></label></div>
    <div class="two"><label>Price<input type="number" step="0.01" min="0" inputmode="decimal" name="price_amount" value="${a.price_amount ?? ''}"></label>
    <label>Currency<select name="price_currency">${opt('USD', 'Dollars', a.price_currency)}${opt('JPY', 'Yen', a.price_currency)}</select></label></div>
    <label>Notes<textarea name="notes" rows="3">${esc(a.notes)}</textarea></label>${more}
    <div class="row"><button class="btn pri">Save</button><button type="button" class="btn" data-a="close">Cancel</button>
    ${modal.id ? '<button type="button" class="btn del" data-a="del-act">Delete</button>' : ''}</div></form>`;
  }
  return `<div class="ov"><div class="sheet">${b}</div></div>`;
}

function render() {
  if (!user) {
    app.innerHTML = `<div class="login"><h1 style="font-size:48px">Japan 2027</h1><form id="loginForm" style="margin-top:24px">
      <label>Email<input name="email" type="email" autocomplete="username" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      ${err ? `<p class="err">${esc(err)}</p>` : ''}<button class="btn pri">Sign in</button></form></div>`;
    return;
  }
  const vis = days.filter(d => mode === 'plan' || d.day_date).sort(dayCmp);
  if (!vis.some(d => d.id === sel)) sel = (vis.find(d => d.day_date === today()) || vis[0] || {}).id;
  const d = vis.find(x => x.id === sel);
  const list = d ? acts.filter(a => a.day_id === d.id && (mode === 'plan' || a.status === 'booked'))
    .sort((x, y) => (x.start_time || '99').localeCompare(y.start_time || '99')) : [];
  const second = d && (d.all_aboard_time || d.departure_time);
  const prev = document.querySelector('.pills'), keep = prev ? prev.scrollLeft : null;
  app.innerHTML = `<div class="pills"><button class="pill tog" data-a="mode" aria-label="Switch mode">${icon(mode === 'plan' ? 'calendar' : 'ship', 22)}</button>
    ${vis.map(v => `<button class="pill ${v.id === sel ? 'sel' : ''}" data-a="day" data-id="${v.id}">${badge(v)}${esc(dayName(v))}</button>`).join('')}</div>
    ${d ? `<div class="hd"><h1>${esc(d.city || d.label)}</h1>
    <div class="times">${d.arrival_time ? `<span><i style="color:var(--green)">${icon('anchor', 20)}</i>${ft(d.arrival_time)}</span>` : ''}
    ${second ? `<span><i style="color:var(--red)">${icon('anchor', 20)}</i>${ft(second)}</span>` : ''}<button class="ib" data-a="edit-day" data-id="${d.id}" aria-label="Edit day">${icon('edit', 22)}</button></div></div>
    <div class="cards">${list.map(card).join('') || `<div class="empty">${mode === 'trip' ? 'Nothing booked yet.' : 'No ideas yet. Tap + to add one.'}</div>`}</div>` : '<div class="empty">No days to show yet.</div>'}
    <div class="foot"><button data-a="reload">Reload latest</button><button data-a="export">Export backup</button><button data-a="signout">Sign out</button></div>
    <button class="fab" data-a="new-act" aria-label="Add activity">${icon('add', 80)}</button>${modal ? sheet() : ''}`;
  const pl = document.querySelector('.pills'), on = pl && pl.querySelector('.sel');
  if (pl) {
    if (keep != null) pl.scrollLeft = keep;
    if (on) { const r = on.getBoundingClientRect(), c = pl.getBoundingClientRect(); if (r.left < c.left || r.right > c.right) on.scrollIntoView({inline: 'center', block: 'nearest'}); }
  }
}

function exportAll() {
  const blob = new Blob([JSON.stringify({exported_at: new Date().toISOString(), days, activities: acts, hearts}, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'japan-2027-backup-' + today() + '.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function startLive() {
  if (chan) return;
  chan = db.channel('live').on('postgres_changes', {event: '*', schema: 'public'}, () => {
    clearTimeout(tmr); tmr = setTimeout(() => { if (modal) pending = true; else load(); }, 400);
  }).subscribe();
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const {a: act, id} = b.dataset;
  if (act === 'mode') { mode = mode === 'plan' ? 'trip' : 'plan'; render(); }
  else if (act === 'day') { sel = id; render(); window.scrollTo(0, 0); }
  else if (act === 'new-act') { modal = {t: 'act'}; render(); }
  else if (act === 'edit-act') { modal = {t: 'act', id}; render(); }
  else if (act === 'edit-day') { modal = {t: 'day', id}; render(); }
  else if (act === 'close') { modal = null; if (pending) { pending = false; await load(); } else render(); }
  else if (act === 'export') exportAll();
  else if (act === 'reload') location.href = location.pathname + '?v=' + Date.now();
  else if (act === 'signout') { await db.auth.signOut(); if (chan) { db.removeChannel(chan); chan = null; } user = null; days = []; acts = []; hearts = []; render(); }
  else if (act === 'heart') {
    const mine = hearts.some(h => h.activity_id === id && h.user_id === user.id);
    const r = mine ? await db.from('hearts').delete().eq('activity_id', id).eq('user_id', user.id) : await db.from('hearts').insert({activity_id: id});
    if (r.error) alert(r.error.message); else await load();
  } else if (act === 'del-act') {
    if (!confirm('Delete this activity?')) return;
    const r = await db.from('activities').delete().eq('id', modal.id);
    if (r.error) return alert(r.error.message);
    modal = null; await load();
  }
});

document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, v = Object.fromEntries(new FormData(f));
  const t = k => (v[k] || '').trim() || null;
  if (f.id === 'loginForm') {
    const {data, error} = await db.auth.signInWithPassword({email: v.email, password: v.password});
    if (error) { err = error.message; render(); return; }
    user = data.user; err = ''; await load(); startLive();
  } else if (f.id === 'actForm') {
    let url = fixUrl(v.url), title = v.title.trim(), preview = null;
    const old = acts.find(x => x.id === modal.id);
    if (url && !(v.image_url || '').trim() && (!old || old.url !== url || !old.image_url)) {
      const btn = f.querySelector('.pri'); btn.disabled = true; btn.textContent = 'Fetching preview...';
      try { preview = (await db.functions.invoke('link-preview', {body: {url}})).data; } catch (_) {}
      btn.disabled = false; btn.textContent = 'Save';
    }
    if (!title && preview && preview.title) title = preview.title;
    if (!title && url) { try { title = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {} }
    if (!title) return alert('Add a title or a link.');
    const row = {title, url: url || null, day_id: v.day_id, start_time: v.start_time || null, end_time: v.end_time || null,
      price_amount: v.price_amount === '' ? null : Number(v.price_amount), price_currency: v.price_currency, notes: t('notes')};
    if ('status' in v) Object.assign(row, {status: v.status, booked_via: v.booked_via || null, provider: t('provider'),
      confirmation_number: t('confirmation_number'), meeting_point: t('meeting_point'), map_url: fixUrl(v.map_url) || null,
      name_ja: t('name_ja'), address_ja: t('address_ja'), image_url: fixUrl(v.image_url) || null});
    if (preview && preview.image_url) row.image_url = preview.image_url;
    const r = modal.id ? await db.from('activities').update({...row, updated_at: new Date().toISOString()}).eq('id', modal.id) : await db.from('activities').insert(row);
    if (r.error) return alert(r.error.message);
    sel = row.day_id; modal = null; await load();
  } else if (f.id === 'dayForm') {
    const r = await db.from('days').update({city: t('city'), day_date: v.day_date || null, arrival_time: v.arrival_time || null,
      departure_time: v.departure_time || null, all_aboard_time: v.all_aboard_time || null, notes: t('notes')}).eq('id', modal.id);
    if (r.error) return alert(r.error.message);
    modal = null; await load();
  }
});

(async () => {
  const {data: {session}} = await db.auth.getSession();
  if (session) { user = session.user; await load(); startLive(); } else render();
})();
