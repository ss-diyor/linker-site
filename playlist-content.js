(() => {
  const foldersGrid = document.getElementById('playlist-folders-grid');
  const foldersLoading = document.getElementById('playlist-folders-loading');
  const foldersEmpty = document.getElementById('playlist-folders-empty');
  const folderCount = document.getElementById('playlist-folder-count');
  const list = document.getElementById('playlist-list');
  const empty = document.getElementById('playlist-empty');
  const loading = document.getElementById('playlist-loading');
  const count = document.getElementById('playlist-count');
  const errorMessage = document.getElementById('playlist-error');
  if (!list || !empty || !count) return;

  const platforms = [
    ['spotify', 'Spotify', '#1DB954'],
    ['yandex', 'Yandex Music', '#FFCC00'],
    ['apple', 'Apple Music', '#FA243C'],
    ['youtube', 'YouTube', '#FF0000']
  ];
  const safeColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback;
  const safeUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  };
  const safeImageUrl = (value) => safeUrl(value);
  const requestedFolderId = () => {
    const match = location.pathname.match(/^\/playlist\/folder\/([^/]+)\/?$/);
    if (match) { try { return decodeURIComponent(match[1]); } catch { return ''; } }
    return new URLSearchParams(location.search).get('folder') || '';
  };
  const renderFolders = (folders, tracks) => {
    if (!foldersGrid) return;
    const selectedFolder = requestedFolderId();
    const visibleFolders = Array.isArray(folders) ? folders : [];
    const currentFolder = visibleFolders.find((folder) => folder.id === selectedFolder);
    const currentFolderPanel = document.getElementById('playlist-current-folder');
    const foldersSection = document.getElementById('playlist-folders-section');
    const tracksSection = document.querySelector('.playlist-section');
    if (foldersSection) foldersSection.hidden = Boolean(currentFolder);
    if (tracksSection) tracksSection.hidden = !currentFolder;
    const notesSection = document.getElementById('playlist-notes-section');
    if (notesSection) notesSection.hidden = true;
    if (foldersLoading) foldersLoading.hidden = true;
    if (folderCount) { folderCount.textContent = currentFolder ? `${tracks.filter((track) => track.folder_id === currentFolder.id).length} ta trek` : `${visibleFolders.length} ta folder`; folderCount.hidden = false; }
    if (foldersEmpty) foldersEmpty.hidden = visibleFolders.length > 0 || Boolean(currentFolder);
    foldersGrid.hidden = visibleFolders.length === 0 || Boolean(currentFolder);
    if (currentFolderPanel) {
      currentFolderPanel.hidden = !currentFolder;
      currentFolderPanel.replaceChildren();
      if (currentFolder) {
        const cover = document.createElement('div'); cover.className = 'playlist-current-folder-cover'; cover.style.setProperty('--folder-color', safeColor(currentFolder.color, '#A8A5FF'));
        if (safeImageUrl(currentFolder.cover_url)) { const image = document.createElement('img'); image.src = safeImageUrl(currentFolder.cover_url); image.alt = ''; image.loading = 'eager'; cover.append(image); }
        else { const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); mark.setAttribute('viewBox', '0 0 160 120'); mark.setAttribute('aria-hidden', 'true'); mark.innerHTML = '<path d="M13 28a9 9 0 0 1 9-9h42l16 13h58a9 9 0 0 1 9 9v56a9 9 0 0 1-9 9H22a9 9 0 0 1-9-9z" fill="currentColor"/><path d="M13 45h134v52a9 9 0 0 1-9 9H22a9 9 0 0 1-9-9z" fill="white" fill-opacity=".13"/>'; cover.append(mark); }
        const details = document.createElement('div'); details.className = 'playlist-current-folder-details';
        const title = document.createElement('h2'); title.textContent = currentFolder.name;
        details.append(title);
        if (currentFolder.description?.trim()) { const description = document.createElement('p'); description.textContent = currentFolder.description.trim(); details.append(description); }
        currentFolderPanel.append(cover, details);
      }
    }
    foldersGrid.replaceChildren();
    visibleFolders.forEach((folder) => {
      const card = document.createElement('a'); card.className = 'playlist-folder-card'; card.href = `/playlist?folder=${encodeURIComponent(folder.id)}`; card.style.setProperty('--folder-color', safeColor(folder.color, '#A8A5FF'));
      const visual = document.createElement('span'); visual.className = 'playlist-folder-visual'; visual.setAttribute('aria-hidden', 'true');
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 160 120'); icon.setAttribute('focusable', 'false');
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path'); shape.setAttribute('d', 'M13 28a9 9 0 0 1 9-9h42l16 13h58a9 9 0 0 1 9 9v56a9 9 0 0 1-9 9H22a9 9 0 0 1-9-9z'); shape.setAttribute('fill', 'currentColor'); icon.append(shape);
      const coverUrl = safeImageUrl(folder.cover_url);
      if (coverUrl) {
        const clipId = `playlist-folder-cover-${String(folder.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath'); clip.id = clipId;
        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); clipRect.setAttribute('x', '20'); clipRect.setAttribute('y', '43'); clipRect.setAttribute('width', '120'); clipRect.setAttribute('height', '48'); clipRect.setAttribute('rx', '5'); clip.append(clipRect); defs.append(clip); icon.append(defs);
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image'); image.setAttribute('href', coverUrl); image.setAttribute('x', '20'); image.setAttribute('y', '43'); image.setAttribute('width', '120'); image.setAttribute('height', '48'); image.setAttribute('preserveAspectRatio', 'xMidYMid slice'); image.setAttribute('clip-path', `url(#${clipId})`); icon.append(image);
      }
      visual.append(icon);
      const body = document.createElement('span'); body.className = 'playlist-folder-body'; const name = document.createElement('strong'); name.textContent = folder.name; const countText = document.createElement('small'); countText.textContent = `${tracks.filter((track) => track.folder_id === folder.id).length} ta trek`; body.append(name, countText); card.append(visual, body); foldersGrid.append(card);
    });
    if (currentFolder) {
      const canonicalPath = `/playlist?folder=${encodeURIComponent(currentFolder.id)}`;
      document.title = `${currentFolder.name} — Playlist — Diyorbek Sultanov`;
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://diyorsultanov.uz${canonicalPath}`);
    } else {
      document.title = 'Playlist — Diyorbek Sultanov';
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://diyorsultanov.uz/playlist');
    }
  };

  const renderNotes = (source) => {
    const section = document.getElementById('playlist-notes-section');
    const notesList = document.getElementById('playlist-notes-list');
    if (!section || !notesList) return;
    const notes = Array.isArray(source) ? source.filter((note) => note && typeof note.content === 'string' && note.content.trim()) : [];
    section.hidden = true;
    const fragment = document.createDocumentFragment();
    notes.forEach((note) => {
      const item = document.createElement('li');
      item.className = 'playlist-note';
      const text = document.createElement('p');
      text.textContent = note.content.trim();
      item.append(text);
      fragment.append(item);
    });
    notesList.replaceChildren(fragment);
  };

  const render = (source, hasError = false) => {
    const tracks = Array.isArray(source)
      ? source.filter((track) => track && typeof track.title === 'string' && track.title.trim())
      : [];
    count.textContent = `${tracks.length} ta trek`;
    count.hidden = false;
    if (loading) loading.hidden = true;
    if (errorMessage) errorMessage.hidden = !hasError;
    empty.hidden = tracks.length > 0 || hasError;
    list.hidden = tracks.length === 0;

    const fragment = document.createDocumentFragment();
    tracks.forEach((track, index) => {
      const item = document.createElement('li');
      item.className = 'playlist-track';

      const number = document.createElement('span');
      number.className = 'playlist-track-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(index + 1).padStart(2, '0');

      const main = document.createElement('div');
      main.className = 'playlist-track-main';
      const coverUrl = safeImageUrl(track.cover_url);
      if (coverUrl) {
        const cover = document.createElement('div');
        cover.className = 'playlist-track-cover';
        const image = document.createElement('img');
        image.className = 'playlist-track-cover-image';
        image.src = coverUrl;
        image.alt = `${track.title.trim()} albom muqovasi`;
        image.width = 240;
        image.height = 240;
        image.loading = 'lazy';
        image.decoding = 'async';
        cover.append(image);
        main.append(cover);
      }

      const details = document.createElement('div');
      details.className = 'playlist-track-details';
      const title = document.createElement('h3');
      title.textContent = track.title.trim();
      details.append(title);
      if (typeof track.artist === 'string' && track.artist.trim()) {
        const artist = document.createElement('p');
        artist.textContent = track.artist.trim();
        details.append(artist);
      }

      const links = document.createElement('div');
      links.className = 'playlist-platform-links';
      links.setAttribute('aria-label', `${track.title.trim()} tinglash havolalari`);
      platforms.forEach(([key, label, defaultColor]) => {
        const href = safeUrl(track.links?.[key]);
        if (!href) return;
        const anchor = document.createElement('a');
        anchor.className = `playlist-platform-link playlist-platform-${key}`;
        anchor.href = href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.style.setProperty('--platform-color', safeColor(track.platform_colors?.[key], defaultColor));
        anchor.textContent = label;
        links.append(anchor);
      });

      main.append(details);
      item.append(number, main);
      if (links.childElementCount) item.append(links);
      fragment.append(item);
    });
    list.replaceChildren(fragment);
  };

  const load = async () => {
    if (!window.supabaseConfig || !window.supabase) {
      renderFolders([], window.playlistData || []); render(window.playlistData || [], true);
      return;
    }
    try {
      const client = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
      const [{ data, error }, { data: folders, error: foldersError }] = await Promise.all([
        client.from('playlist_tracks').select('id, title, artist, links, platform_colors, cover_url, folder_id').eq('is_published', true).order('position', { ascending: true }).order('created_at', { ascending: true }),
        client.from('playlist_folders').select('id, name, description, color, cover_url').eq('is_published', true).order('position', { ascending: true }).order('created_at', { ascending: true })
      ]);
      if (error) {
        const legacy = await client.from('playlist_tracks').select('id, title, artist, links, platform_colors, cover_url').eq('is_published', true).order('position', { ascending: true }).order('created_at', { ascending: true });
        if (!legacy.error) { renderFolders([], legacy.data || []); render(legacy.data || [], true); return; }
        throw error;
      }
      const tracks = data || [];
      renderFolders(foldersError ? [] : (folders || []), tracks);
      const selectedFolder = requestedFolderId();
      const folderExists = (folders || []).some((folder) => folder.id === selectedFolder);
      render(!foldersError && folderExists ? tracks.filter((track) => track.folder_id === selectedFolder) : [], Boolean(foldersError));
      try {
        const { data: notes, error: notesError } = await client.from('playlist_notes')
          .select('content')
          .eq('is_published', true)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true });
        if (notesError) throw notesError;
        renderNotes(notes || []);
      } catch (notesError) {
        console.warn('Playlist notes could not be loaded:', notesError);
        renderNotes([]);
      }
    } catch (error) {
      console.error('Playlist could not be loaded:', error);
      renderFolders([], window.playlistData || []); render(window.playlistData || [], true);
    }
  };

  load();
})();
