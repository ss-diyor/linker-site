(() => {
  const list = document.getElementById('playlist-list');
  const empty = document.getElementById('playlist-empty');
  const count = document.getElementById('playlist-count');
  if (!list || !empty || !count) return;

  const platforms = [
    ['spotify', 'Spotify'],
    ['yandex', 'Yandex Music'],
    ['apple', 'Apple Music'],
    ['youtube', 'YouTube']
  ];
  const safeUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  };
  const tracks = Array.isArray(window.playlistData)
    ? window.playlistData.filter((track) => track && typeof track.title === 'string' && track.title.trim())
    : [];

  count.textContent = `${tracks.length} ta trek`;
  empty.hidden = tracks.length > 0;

  const fragment = document.createDocumentFragment();
  tracks.forEach((track, index) => {
    const item = document.createElement('li');
    item.className = 'playlist-track';

    const number = document.createElement('span');
    number.className = 'playlist-track-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1).padStart(2, '0');

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
    platforms.forEach(([key, label]) => {
      const href = safeUrl(track.links?.[key]);
      if (!href) return;
      const anchor = document.createElement('a');
      anchor.className = `playlist-platform-link playlist-platform-${key}`;
      anchor.href = href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = label;
      links.append(anchor);
    });

    item.append(number, details);
    if (links.childElementCount) item.append(links);
    fragment.append(item);
  });

  list.replaceChildren(fragment);
})();
