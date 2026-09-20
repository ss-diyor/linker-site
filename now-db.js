(() => {
  if (!document.querySelector('.minimal-now-page') || !window.supabaseConfig || !window.supabase) return;
  const db = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const link = (url) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">ochish ↗</a>` : '';
  const cover = (book) => book.cover_url ? `<div class="now-cover"><img src="${esc(book.cover_url)}" alt="${esc(book.title)} muqovasi" loading="lazy" onerror="this.parentElement.classList.add('is-error')"></div>` : '<div class="now-cover is-empty" aria-hidden="true"></div>';
  const renderBook = (book) => `<article class="now-entry now-book-entry" data-now-detail-kind="book" data-now-detail-id="${esc(book.id)}" tabindex="0" role="button" aria-label="${esc(book.title)} haqida batafsil">${cover(book)}<div><h3>${esc(book.title)}</h3><p>${esc(book.author)}${book.year ? ` · ${esc(book.year)}` : ''}</p><p>${esc(book.note || '')}</p>${link(book.external_url)}</div><span class="now-entry-meta">${esc(book.status)}</span></article>`;
  const poster = (item) => item.poster_url ? `<div class="now-poster"><img src="${esc(item.poster_url)}" alt="${esc(item.title)} posteri" loading="lazy" onerror="this.parentElement.classList.add('is-error')"></div>` : '<div class="now-poster is-empty" aria-hidden="true"></div>';
  const renderMedia = (item) => `<article class="now-entry now-media-entry" data-now-detail-kind="media" data-now-detail-id="${esc(item.id)}" tabindex="0" role="button" aria-label="${esc(item.title)} haqida batafsil">${poster(item)}<div><h3>${esc(item.title)}</h3><p>${esc(item.type)}${item.rating == null ? '' : ` · ${esc(item.rating)}/10`}${item.year ? ` · ${esc(item.year)}` : ''}</p><p>${esc(item.note || '')}</p>${link(item.external_url)}</div></article>`;
  const empty = (text) => `<p class="now-empty">${text}</p>`;
  const load = async () => {
    const [settings, books, media] = await Promise.all([
      db.from('now_settings').select('*').eq('id', 'default').maybeSingle(),
      db.from('books').select('*').eq('is_published', true).order('position').order('created_at'),
      db.from('media_items').select('*').eq('is_published', true).order('position').order('created_at')
    ]);
    if (settings.error || books.error || media.error) return;
    if (settings.data) {
      const focus = document.querySelector('.now-focus-text');
      if (focus) { focus.innerHTML = `${esc(settings.data.focus_title)}<br><span>${esc(settings.data.focus_subtitle)}</span>`; focus.hidden = false; }
      const time = document.getElementById('now-updated');
      if (time && settings.data.last_updated) { time.dateTime = settings.data.last_updated; time.textContent = new Date(`${settings.data.last_updated}T00:00:00`).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
    }
    window.nowData.books = { finished: [], reading: [], paused: [] };
    (books.data || []).forEach((book) => { if (window.nowData.books[book.status]) window.nowData.books[book.status].push({ ...book, externalUrl: book.external_url }); });
    window.nowData.media = { watched: [], watching: [], watchlist: [] };
    (media.data || []).forEach((item) => { if (window.nowData.media[item.status]) window.nowData.media[item.status].push({ ...item, externalUrl: item.external_url }); });
    ['finished','reading','paused'].forEach((status) => { const panel = document.getElementById(`book-panel-${status}`); const items = (books.data || []).filter((book) => book.status === status); if (panel) panel.innerHTML = items.length ? items.map(renderBook).join('') : empty(`${status === 'finished' ? 'O‘qilganlar' : status === 'reading' ? 'Hozir o‘qilayotganlar' : 'O‘qilmoqchi bo‘lganlar'} ro‘yxatida hozircha hech narsa yo‘q.`); });
    ['watched','watching','watchlist'].forEach((status) => { const panel = document.getElementById(`panel-${status}`); const items = (media.data || []).filter((item) => item.status === status); if (panel) panel.innerHTML = items.length ? items.map(renderMedia).join('') : empty(`${status === 'watched' ? 'Ko‘rilganlar' : status === 'watching' ? 'Hozir ko‘rilayotganlar' : 'Watchlist'} ro‘yxatida hozircha hech narsa yo‘q.`); });
  };
  load();
})();
