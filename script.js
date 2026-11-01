(() => {
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const themeIcons = {
    sun: '<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.8"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>',
    moon: '<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.6 8.6 0 1 0 20.2 15.3Z"></path></svg>',
  };
  if (themeToggle && !document.body.classList.contains('admin-page') && !document.body.classList.contains('chat-page')) {
    const chatLink = document.createElement('a');
    chatLink.className = 'chat-toggle';
    chatLink.href = '/chat';
    chatLink.setAttribute('aria-label', 'Anonim chatni ochish');
    chatLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 18.5 4 22l3.6-1.9A8.5 8.5 0 1 0 5 18.5Z"></path></svg>';
    themeToggle.insertAdjacentElement('beforebegin', chatLink);
  }
  const setTheme = (theme) => {
    const isLight = theme === 'light';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (themeMeta) themeMeta.content = isLight ? '#f7f7f3' : '#05061a';
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(isLight));
      const nextTheme = isLight ? 'dark' : 'light';
      themeToggle.setAttribute('aria-label', `${nextTheme === 'dark' ? 'Qorong‘i' : 'Yorug‘'} ko‘rinishga o‘tish`);
      themeToggle.title = `${nextTheme === 'dark' ? 'Dark' : 'Light'} theme`;
      themeToggle.innerHTML = themeIcons[nextTheme === 'dark' ? 'moon' : 'sun'];
    }
  };
  setTheme(document.documentElement.dataset.theme || 'dark');
  themeToggle?.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

  if (!document.body.classList.contains('admin-page') && !document.body.classList.contains('chat-page')) {
    const inviteKey = 'diyor-chat-invite-seen-v1';
    let alreadySeen = false;
    let welcomeWasSeen = false;
    try {
      alreadySeen = localStorage.getItem(inviteKey) === 'true';
      welcomeWasSeen = localStorage.getItem('diyor-welcome-intro-seen') === 'true';
    } catch {}

    if (!alreadySeen) {
      const hasWelcomeIntro = Boolean(document.querySelector('[data-welcome-intro]')) && !welcomeWasSeen;
      window.setTimeout(() => {
        let previousFocus = document.activeElement;
        const dialog = document.createElement('div');
        dialog.className = 'chat-invite-overlay';
        dialog.innerHTML = `
          <section class="chat-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="chat-invite-title" aria-describedby="chat-invite-description">
            <button class="chat-invite-close" type="button" data-chat-invite-close aria-label="Oynani yopish">×</button>
            <span class="chat-invite-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 18.5 4 22l3.6-1.9A8.5 8.5 0 1 0 5 18.5Z"></path><path d="M8 10h8M8 14h5"></path></svg></span>
            <p class="chat-invite-eyebrow">OCHIQ SUHBAT</p>
            <h2 id="chat-invite-title">Suhbatga qo‘shiling</h2>
            <p id="chat-invite-description" class="chat-invite-description">Qiziqarli mavzular bo‘yicha boshqalar bilan fikr almashing. Ism yoki email kiritish shart emas.</p>
            <ol class="chat-invite-steps"><li><span>01</span> Serverni tanlang</li><li><span>02</span> Xabaringizni yozing</li><li><span>03</span> Suhbatni davom ettiring</li></ol>
            <a class="chat-invite-join" href="/chat">Chatga kirish <span aria-hidden="true">↗</span></a>
            <button class="chat-invite-later" type="button" data-chat-invite-close>Hozir emas</button>
          </section>`;
        document.body.append(dialog);
        document.body.classList.add('chat-invite-open');
        try { localStorage.setItem(inviteKey, 'true'); } catch {}

        const close = () => {
          dialog.remove();
          document.body.classList.remove('chat-invite-open');
          if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
        dialog.addEventListener('click', (event) => {
          if (event.target === dialog || event.target.closest('[data-chat-invite-close]')) close();
        });
        dialog.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') { event.preventDefault(); close(); return; }
          if (event.key !== 'Tab') return;
          const controls = [...dialog.querySelectorAll('a[href],button:not([disabled])')];
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        dialog.querySelector('.chat-invite-close').focus();
      }, hasWelcomeIntro ? 5600 : 1000);
    }
  }

  const pageLoader = document.querySelector('.page-loader');
  const hidePageLoader = () => pageLoader?.classList.add('is-hidden');
  if (pageLoader) {
    window.addEventListener('load', hidePageLoader, { once: true });
    window.setTimeout(hidePageLoader, 4000);
  }

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


  const nowPage = document.querySelector('.minimal-now-page');
  if (!nowPage || !window.nowData) return;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));

  const entryMarkup = (entry, kind) => {
    const meta = [entry.type, entry.rating ? `${entry.rating}/10` : '', entry.year].filter(Boolean).join(' · ');
    const link = entry.externalUrl ? `<a href="${escapeHtml(entry.externalUrl)}" target="_blank" rel="noopener noreferrer">ochish ↗</a>` : '';
    const author = kind === 'book' && entry.author ? `<p>${escapeHtml(entry.author)}${entry.year ? ` · ${entry.year}` : ''}</p>` : '';
    const image = kind === 'media' ? (entry.poster_url ? `<div class="now-poster"><img src="${escapeHtml(entry.poster_url)}" alt="${escapeHtml(entry.title)} posteri" loading="lazy" onerror="this.parentElement.classList.add('is-error')"></div>` : '<div class="now-poster is-empty" aria-hidden="true"></div>') : (entry.cover_url ? `<div class="now-cover"><img src="${escapeHtml(entry.cover_url)}" alt="${escapeHtml(entry.title)} muqovasi" loading="lazy" onerror="this.parentElement.classList.add('is-error')"></div>` : '<div class="now-cover is-empty" aria-hidden="true"></div>');
    return `<article class="now-entry${kind === 'media' ? ' now-media-entry' : ' now-book-entry'}" data-now-detail-kind="${kind}" data-now-detail-id="${escapeHtml(entry.id || '')}" tabindex="0" role="button" aria-label="${escapeHtml(entry.title)} haqida batafsil">${image}<div><h3>${escapeHtml(entry.title)}</h3>${author}${kind === 'media' ? `<p>${escapeHtml(entry.type || '')}${entry.rating == null ? '' : ` · ${escapeHtml(entry.rating)}/10`}${entry.year ? ` · ${escapeHtml(entry.year)}` : ''}</p>` : ''}<p>${escapeHtml(entry.note || '')}</p>${link}</div>${kind === 'book' ? `<span class="now-entry-meta">${escapeHtml(meta)}</span>` : ''}</article>`;
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

  const detailModal = document.getElementById('now-detail-modal');
  const detailContent = document.getElementById('now-detail-content');
  const closeDetail = () => { if (detailModal) { detailModal.hidden = true; document.body.classList.remove('modal-open'); } };
  const openDetail = (kind, id) => {
    const list = kind === 'book' ? Object.values(window.nowData.books || {}).flat() : Object.values(window.nowData.media || {}).flat();
    const item = list.find((entry) => String(entry.id) === String(id));
    if (!item || !detailModal || !detailContent) return;
    const isBook = kind === 'book';
    const imageUrl = isBook ? item.cover_url : item.poster_url;
    const image = imageUrl ? `<img class="now-detail-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)} ${isBook ? 'muqovasi' : 'posteri'}" onerror="this.classList.add('is-error')">` : `<div class="now-detail-image is-empty" aria-hidden="true">${isBook ? 'muqova' : 'poster'}</div>`;
    const meta = isBook ? [item.author, item.year].filter(Boolean).join(' · ') : [item.type, item.rating == null ? '' : `${item.rating}/10`, item.year].filter(Boolean).join(' · ');
    const link = item.externalUrl ? `<a class="now-detail-link" href="${escapeHtml(item.externalUrl)}" target="_blank" rel="noopener noreferrer">Havolani ochish ↗</a>` : '';
    detailContent.innerHTML = `<div class="now-detail-layout">${image}<div class="now-detail-copy"><p class="section-label">${isBook ? 'kitob tafsilotlari' : 'media tafsilotlari'}</p><h2 id="now-detail-title">${escapeHtml(item.title)}</h2><p class="now-detail-meta">${escapeHtml(meta)}${item.status ? ` · ${escapeHtml(item.status)}` : ''}</p><p class="now-detail-note">${escapeHtml(item.note || 'Hozircha izoh qo‘shilmagan.')}</p>${link}</div></div>`;
    detailModal.hidden = false; document.body.classList.add('modal-open'); detailModal.querySelector('.now-detail-close').focus();
  };
  document.addEventListener('click', (event) => { const close = event.target.closest('[data-modal-close]'); if (close) return closeDetail(); const card = event.target.closest('[data-now-detail-kind]'); if (card && !event.target.closest('a')) openDetail(card.dataset.nowDetailKind, card.dataset.nowDetailId); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDetail(); const card = event.target.closest('[data-now-detail-kind]'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDetail(card.dataset.nowDetailKind, card.dataset.nowDetailId); } });

  if (!window.supabaseConfig || !window.supabase) {
    renderBooks('finished');
    renderMedia('watched');
  }
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
