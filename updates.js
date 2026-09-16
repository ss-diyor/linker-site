(() => {
  const section = document.querySelector('.updates-section');
  if (!section || !window.supabaseConfig || !window.supabase) return;
  const db = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const render = (item) => {
    const date = item.published_on ? new Date(`${item.published_on}T00:00:00`).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '';
    const source = item.source ? `<span>${esc(item.source)}</span>` : '';
    const link = item.external_url ? `<a href="${esc(item.external_url)}" target="_blank" rel="noopener noreferrer">ochish ↗</a>` : '';
    return `<article class="update-entry"><div><h3>${esc(item.title)}</h3><p>${esc(item.content || '')}</p>${link}</div><div class="update-meta">${source}<time datetime="${esc(item.published_on || '')}">${esc(date)}</time></div></article>`;
  };
  const load = async () => {
    const { data, error } = await db.from('updates').select('*').eq('is_published', true).order('published_on', { ascending: false }).order('position').order('created_at', { ascending: false });
    const list = document.getElementById('updates-list');
    if (!list || error) return;
    list.innerHTML = data?.length ? data.map(render).join('') : '<p class="updates-empty">Hozircha bu yerda hech narsa yo‘q.</p>';
  };
  load();
})();
