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
  const renderFolders = (folders, tracks) => {
    if (!foldersGrid) return;
    const params = new URLSearchParams(location.search);
    const selectedFolder = params.get('folder');
    const visibleFolders = Array.isArray(folders) ? folders : [];
    const currentFolder = visibleFolders.find((folder) => folder.id === selectedFolder);
    const currentFolderPanel = document.getElementById('playlist-current-folder');
    if (foldersLoading) foldersLoading.hidden = true;
    if (folderCount) { folderCount.textContent = currentFolder ? `${tracks.filter((track) => track.folder_id === currentFolder.id).length} ta trek` : `${visibleFolders.length} ta folder`; folderCount.hidden = false; }
    if (foldersEmpty) foldersEmpty.hidden = visibleFolders.length > 0 || Boolean(selectedFolder);
    foldersGrid.hidden = visibleFolders.length === 0 || Boolean(currentFolder);
    if (currentFolderPanel) {
      currentFolderPanel.hidden = !currentFolder;
      currentFolderPanel.replaceChildren();
      if (currentFolder) {
        const back = document.createElement('a'); back.className = 'playlist-folder-back'; back.href = '/playlist'; back.textContent = '← Barcha folderlar';
        const cover = document.createElement('div'); cover.className = 'playlist-current-folder-cover'; cover.style.setProperty('--folder-color', safeColor(currentFolder.color, '#A8A5FF'));
        if (safeImageUrl(currentFolder.cover_url)) { const image = document.createElement('img'); image.src = safeImageUrl(currentFolder.cover_url); image.alt = ''; image.loading = 'eager'; cover.append(image); }
        else { const mark = document.createElement('span'); mark.setAttribute('aria-hidden', 'true'); mark.textContent = '♫'; cover.append(mark); }
        const details = document.createElement('div'); details.className = 'playlist-current-folder-details';
        const title = document.createElement('h2'); title.textContent = currentFolder.name;
        details.append(title);
        if (currentFolder.description?.trim()) { const description = document.createElement('p'); description.textContent = currentFolder.description.trim(); details.append(description); }
        currentFolderPanel.append(back, cover, details);
      }
    }
    foldersGrid.replaceChildren();
    visibleFolders.forEach((folder) => {
      const card = document.createElement('a'); card.className = 'playlist-folder-card' + (selectedFolder === folder.id ? ' is-active' : ''); card.href = `/playlist?folder=${encodeURIComponent(folder.id)}`; card.style.setProperty('--folder-color', safeColor(folder.color, '#a8a5ff'));
      if (folder.cover_url && safeImageUrl(folder.cover_url)) { const image = document.createElement('img'); image.src = safeImageUrl(folder.cover_url); image.alt = `${folder.name} cover`; image.loading = 'lazy'; card.append(image); }
      const body = document.createElement('span'); body.className = 'playlist-folder-body'; const name = document.createElement('strong'); name.textContent = folder.name; const countText = document.createElement('small'); countText.textContent = `${tracks.filter((track) => track.folder_id === folder.id).length} ta trek`; body.append(name, countText); card.append(body); foldersGrid.append(card);
    });
  };

  const renderNotes = (source) => {
    const section = document.getElementById('playlist-notes-section');
    const notesList = document.getElementById('playlist-notes-list');
    if (!section || !notesList) return;
    const notes = Array.isArray(source) ? source.filter((note) => note && typeof note.content === 'string' && note.content.trim()) : [];
    section.hidden = notes.length === 0;
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
      const selectedFolder = new URLSearchParams(location.search).get('folder');
      render(foldersError ? tracks : selectedFolder ? tracks.filter((track) => track.folder_id === selectedFolder) : []);
      if (!selectedFolder && !foldersError) { if (empty) empty.hidden = true; if (list) list.hidden = true; if (count) { count.textContent = 'Folder ichidan trek tanlang'; count.hidden = false; } }
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
