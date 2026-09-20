(() => {
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const setTheme = (theme) => {
    const isLight = theme === 'light';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (themeMeta) themeMeta.content = isLight ? '#f7f7f3' : '#05061a';
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.setAttribute('aria-label', isLight ? 'Dark themega o‘tish' : 'Light themega o‘tish');
      themeToggle.querySelector('.theme-toggle-label').textContent = isLight ? 'dark' : 'light';
    }
  };
  setTheme(document.documentElement.dataset.theme || 'dark');
  themeToggle?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          instance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  }

  document.querySelectorAll('.project-trigger, .minimal-project-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.project-item, .minimal-project-item');
      const body = document.getElementById(button.getAttribute('aria-controls'));
      const opening = button.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll('.project-item.open, .minimal-project-item.open').forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          const openButton = openItem.querySelector('.project-trigger, .minimal-project-trigger');
          const openBody = document.getElementById(openButton.getAttribute('aria-controls'));
          openButton.setAttribute('aria-expanded', 'false');
          openBody.hidden = true;
        }
      });
      button.setAttribute('aria-expanded', String(opening));
      item.classList.toggle('open', opening);
      body.hidden = !opening;
    });
  });

  const nowPage = document.querySelector('.minimal-now-page');
  if (!nowPage || !window.nowData) return;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));

  const entryMarkup = (entry, kind) => {
    const meta = [entry.type, entry.rating ? `${entry.rating}/10` : '', entry.year].filter(Boolean).join(' · ');
    const link = entry.externalUrl ? `<a href="${escapeHtml(entry.externalUrl)}" target="_blank" rel="noopener noreferrer">ochish ↗</a>` : '';
    const author = kind === 'book' && entry.author ? `<p>${escapeHtml(entry.author)}${entry.year ? ` · ${entry.year}` : ''}</p>` : '';
    const poster = kind === 'media' ? (entry.poster_url ? `<div class="now-poster"><img src="${escapeHtml(entry.poster_url)}" alt="${escapeHtml(entry.title)} posteri" loading="lazy" onerror="this.parentElement.classList.add('is-error')"></div>` : '<div class="now-poster is-empty" aria-hidden="true"></div>') : '';
    return `<article class="now-entry${kind === 'media' ? ' now-media-entry' : ''}">${poster}<div><h3>${escapeHtml(entry.title)}</h3>${author}${kind === 'media' ? `<p>${escapeHtml(entry.type || '')}${entry.rating == null ? '' : ` · ${escapeHtml(entry.rating)}/10`}${entry.year ? ` · ${escapeHtml(entry.year)}` : ''}</p>` : ''}<p>${escapeHtml(entry.note || '')}</p>${link}</div>${kind === 'book' ? `<span class="now-entry-meta">${escapeHtml(meta)}</span>` : ''}</article>`;
  };

  const renderBooks = (status) => {
    const panel = document.getElementById(`book-panel-${status}`);
    const books = window.nowData.books && Array.isArray(window.nowData.books[status]) ? window.nowData.books[status] : [];
    if (panel) panel.innerHTML = books.length ? books.map((book) => entryMarkup(book, 'book')).join('') : `<p class="now-empty">${status === 'finished' ? 'O‘qilganlar' : status === 'reading' ? 'Hozir o‘qilayotganlar' : 'O‘qilmoqchi bo‘lganlar'} ro‘yxatida hozircha hech narsa yo‘q.</p>`;
  };

  const statusLabels = { watched: 'Ko‘rganlarim', watching: 'Hozir ko‘ryapman', watchlist: 'Ko‘rmoqchiman' };
  const renderMedia = (status) => {
    const panel = document.getElementById(`panel-${status}`);
    const media = window.nowData.media && Array.isArray(window.nowData.media[status]) ? window.nowData.media[status] : [];
    if (panel) panel.innerHTML = media.length ? media.map((item) => entryMarkup(item, 'media')).join('') : `<p class="now-empty">${statusLabels[status]} ro‘yxatida hozircha hech narsa yo‘q.</p>`;
  };

  const activateTab = (tab) => {
    const group = tab.dataset.tabGroup;
    const status = tab.dataset.status;
    document.querySelectorAll(`.now-tab[data-tab-group="${group}"]`).forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll(`.now-panel[data-tab-group="${group}"]`).forEach((panel) => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    if (group === 'books') renderBooks(status); else renderMedia(status);
  };

  renderBooks('finished');
  renderMedia('watched');
  document.querySelectorAll('.now-tab').forEach((tab, index, tabs) => {
    const groupTabs = Array.from(document.querySelectorAll(`.now-tab[data-tab-group="${tab.dataset.tabGroup}"]`));
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const groupIndex = groupTabs.indexOf(tab);
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? groupTabs.length - 1 : (groupIndex + (event.key === 'ArrowRight' ? 1 : -1) + groupTabs.length) % groupTabs.length;
      groupTabs[nextIndex].focus();
      activateTab(groupTabs[nextIndex]);
    });
  });

})();
