(() => {
  const list = document.querySelector('[data-timeline-list]');
  const config = window.supabaseConfig;
  if (!list || !config || !window.supabase) return;

  const db = window.supabase.createClient(config.url, config.publishableKey);
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
  const dateLabel = (event) => event.month ? `${months[event.month - 1]} ${event.year}` : String(event.year);
  const dateValue = (event) => event.month ? `${event.year}-${String(event.month).padStart(2, '0')}` : String(event.year);

  const render = (events) => {
    if (!events.length) return;
    list.innerHTML = events.map((event) => `<li class="timeline-item reveal visible${event.is_current ? ' timeline-current' : ''}"><div class="timeline-point" aria-hidden="true"></div><div class="timeline-content"><time datetime="${escapeHtml(dateValue(event))}">${escapeHtml(dateLabel(event))}</time><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p></div></li>`).join('');
  };

  db.from('timeline_events')
    .select('id, year, month, title, description, is_current, position, created_at')
    .order('year', { ascending: true })
    .order('month', { ascending: true, nullsFirst: true })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .then(({ data, error }) => {
      if (!error) render(data || []);
    });
})();
