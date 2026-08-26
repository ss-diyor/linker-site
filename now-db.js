(() => {
  if (!document.querySelector('.minimal-now-page') || !window.supabaseConfig || !window.supabase) return;
  const db = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const link = (url) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">ochish ↗</a>` : '';
  const renderBook = (book) => `<article class="now-entry"><div><h3>${esc(book.title)}</h3><p>${esc(book.author)}${book.year ? ` · ${esc(book.year)}` : ''}</p><p>${esc(book.note || '')}</p>${link(book.external_url)}</div><span class="now-entry-meta">${esc(book.status)}</span></article>`;
  const renderMedia = (item) => `<article class="now-entry"><div><h3>${esc(item.title)}</h3><p>${esc(item.type)}${item.rating == null ? '' : ` · ${esc(item.rating)}/10`}${item.year ? ` · ${esc(item.year)}` : ''}</p><p>${esc(item.note || '')}</p>${link(item.external_url)}</div></article>`;
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
      if (focus) focus.innerHTML = `${esc(settings.data.focus_title)}<br><span>${esc(settings.data.focus_subtitle)}</span>`;
      const time = document.getElementById('now-updated');
      if (time && settings.data.last_updated) { time.dateTime = settings.data.last_updated; time.textContent = new Date(`${settings.data.last_updated}T00:00:00`).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
    }
    document.getElementById('books-list').innerHTML = books.data?.length ? books.data.map(renderBook).join('') : empty('Hozircha bu yerga kitoblar qo‘shilmagan.');
    ['watched','watching','watchlist'].forEach((status) => { const panel = document.getElementById(`panel-${status}`); const items = (media.data || []).filter((item) => item.status === status); if (panel) panel.innerHTML = items.length ? items.map(renderMedia).join('') : empty(`${status === 'watched' ? 'Ko‘rilganlar' : status === 'watching' ? 'Hozir ko‘rilayotganlar' : 'Watchlist'} ro‘yxatida hozircha hech narsa yo‘q.`); });
  };
  load();
})();
