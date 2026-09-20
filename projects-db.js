(() => {
  const page = document.querySelector('.minimal-projects-page');
  if (!page || !window.supabaseConfig || !window.supabase) return;
  const db = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const render = async () => {
    const { data, error } = await db.from('projects').select('*').eq('is_published', true).order('position').order('created_at');
    if (error || !data) return;
    const list = document.querySelector('.project-links');
    if (!list) return;
    list.innerHTML = data.length ? data.map((project) => `<article class="minimal-project-item"><button class="minimal-project-trigger" aria-expanded="false" aria-controls="project-${project.id}"><span>${esc(project.title)}</span><span aria-hidden="true">+</span></button><div class="minimal-project-body" id="project-${project.id}" hidden><p>${esc(project.description)}</p>${project.external_url ? `<a href="${esc(project.external_url)}" target="_blank" rel="noopener noreferrer">${esc(project.link_label || 'ochish ↗')}</a>` : ''}</div></article>`).join('') : '<p class="now-empty">Hozircha loyihalar qo‘shilmagan.</p>';
    page.querySelectorAll('.minimal-project-trigger').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.minimal-project-item');
        const body = document.getElementById(button.getAttribute('aria-controls'));
        const opening = button.getAttribute('aria-expanded') !== 'true';
        page.querySelectorAll('.minimal-project-item.open').forEach((openItem) => { if (openItem !== item) { openItem.classList.remove('open'); const openButton = openItem.querySelector('.minimal-project-trigger'); openButton.setAttribute('aria-expanded', 'false'); document.getElementById(openButton.getAttribute('aria-controls')).hidden = true; } });
        button.setAttribute('aria-expanded', String(opening)); item.classList.toggle('open', opening); body.hidden = !opening;
      });
    });
  };
  render();
})();
