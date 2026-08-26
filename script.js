(() => {
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
    const author = kind === 'book' && entry.author ? `<p>${escapeHtml(entry.author)}${entry.year ? ` · ${escapeHtml(entry.year)}` : ''}</p>` : '';
    return `<article class="now-entry"><div><h3>${escapeHtml(entry.title)}</h3>${author}<p>${escapeHtml(entry.note || '')}</p>${link}</div><span class="now-entry-meta">${escapeHtml(meta)}</span></article>`;
  };

  const renderBooks = () => {
    const target = document.getElementById('books-list');
    const books = Array.isArray(window.nowData.books) ? window.nowData.books : [];
    target.innerHTML = books.length ? books.map((book) => entryMarkup(book, 'book')).join('') : '<p class="now-empty">Hozircha bu yerga kitoblar qo‘shilmagan.</p>';
  };

  const statusLabels = { watched: 'ko‘rganlarim', watching: 'hozir ko‘ryapman', watchlist: 'watchlist' };
  const renderMedia = (status) => {
    const panel = document.getElementById(`panel-${status}`);
    const media = window.nowData.media && Array.isArray(window.nowData.media[status]) ? window.nowData.media[status] : [];
    panel.innerHTML = media.length ? media.map((item) => entryMarkup(item, 'media')).join('') : `<p class="now-empty">${statusLabels[status]} ro‘yxatida hozircha hech narsa yo‘q.</p>`;
  };

  const activateTab = (tab) => {
    const status = tab.dataset.status;
    document.querySelectorAll('.now-tab').forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('.now-panel').forEach((panel) => { panel.hidden = panel.id !== `panel-${status}`; });
    renderMedia(status);
  };

  renderBooks();
  renderMedia('watched');
  document.querySelectorAll('.now-tab').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });

  const updated = document.getElementById('now-updated');
  if (updated && window.nowData.lastUpdated) {
    const date = new Date(`${window.nowData.lastUpdated}T00:00:00`);
    updated.dateTime = window.nowData.lastUpdated;
    updated.textContent = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
})();
