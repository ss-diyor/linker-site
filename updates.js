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
    if (!list) return;
    if (error) { list.innerHTML = '<p class="updates-empty">Ma’lumotlarni yuklab bo‘lmadi.</p>'; return; }
    if (!data?.length) {
      list.innerHTML = '<p class="updates-empty">Hozircha bu yerda hech narsa yo‘q.</p>';
      return;
    }
    const latest = render(data[0]);
    const older = data.slice(1);
    const olderMarkup = older.length ? `<div class="updates-older" id="updates-older" hidden>${older.map(render).join('')}</div><button class="updates-toggle" type="button" aria-expanded="false" aria-controls="updates-older"><span class="updates-toggle-label">Barcha xabarlarni ko‘rsatish</span><span class="updates-toggle-icon" aria-hidden="true">⌄</span></button>` : '';
    list.innerHTML = `${latest}${olderMarkup}`;
    const toggle = list.querySelector('.updates-toggle');
    const olderList = list.querySelector('.updates-older');
    if (toggle && olderList) {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        olderList.hidden = expanded;
        toggle.querySelector('.updates-toggle-label').textContent = expanded ? 'Barcha xabarlarni ko‘rsatish' : 'Xabarlarni yashirish';
      });
    }
  };
  load();
})();
