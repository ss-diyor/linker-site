(() => {
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
      render(window.playlistData || [], true);
      return;
    }
    try {
      const client = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
      const { data, error } = await client.from('playlist_tracks')
        .select('title, artist, links, platform_colors, cover_url')
        .eq('is_published', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      render(data || []);
    } catch (error) {
      console.error('Playlist could not be loaded:', error);
      render(window.playlistData || [], true);
    }
  };

  load();
})();
