(() => {
  const config = window.supabaseConfig;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.publishableKey);
  const loginView = document.getElementById('login-view');
  const dashboard = document.getElementById('dashboard-view');
  const error = document.getElementById('login-error');
  const status = document.getElementById('admin-status');
  let books = [], media = [], updates = [], timeline = [], playlistTracks = [], playlistFolders = [], playlistNotes = [], about = null;
  const $ = (id) => document.getElementById(id);
  const playlistDefaultColors = { spotify:'#1DB954', yandex:'#FFCC00', apple:'#FA243C', youtube:'#FF0000' };
  const validPlaylistHex = (value) => /^#[0-9a-fA-F]{6}$/.test(value || '');
  const playlistCoverBucket = 'playlist-covers';
  const playlistCoverMaxBytes = 5 * 1024 * 1024;
  const playlistCoverTypes = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/avif':'avif' };
  let playlistCoverPreviewObjectUrl = '';
  const showPlaylistCoverPreview = (source, alt = 'Trek muqovasi', previewId = 'playlist-cover-preview') => {
    const preview = $(previewId);
    if (playlistCoverPreviewObjectUrl && playlistCoverPreviewObjectUrl !== source) { URL.revokeObjectURL(playlistCoverPreviewObjectUrl); playlistCoverPreviewObjectUrl = ''; }
    preview.replaceChildren();
    preview.classList.toggle('is-empty', !source);
    if (!source) { const label = document.createElement('span'); label.textContent = 'Muqova tanlanmagan'; preview.append(label); return; }
    const image = document.createElement('img'); image.src = source; image.alt = alt; preview.append(image);
  };
  const ownedPlaylistCoverPath = (value) => {
    if (!value) return null;
    try {
      const imageUrl = new URL(value);
      const projectUrl = new URL(config.url);
      const prefix = `/storage/v1/object/public/${playlistCoverBucket}/`;
      if (imageUrl.origin !== projectUrl.origin || !imageUrl.pathname.startsWith(prefix)) return null;
      return decodeURIComponent(imageUrl.pathname.slice(prefix.length));
    } catch { return null; }
  };
  const removePlaylistCover = async (value) => {
    const path = ownedPlaylistCoverPath(value);
    if (!path) return;
    try {
      const { error: storageError } = await client.storage.from(playlistCoverBucket).remove([path]);
      if (storageError) console.warn('Playlist cover cleanup failed:', storageError.message);
    } catch (storageError) { console.warn('Playlist cover cleanup failed:', storageError); }
  };
  const uploadPlaylistCover = async (file, prefix = 'tracks') => {
    if (!file) return null;
    if (!playlistCoverTypes[file.type]) throw new Error('Muqova JPG, PNG, WebP yoki AVIF formatida bo‘lishi kerak.');
    if (file.size > playlistCoverMaxBytes) throw new Error('Muqova fayli 5 MB dan katta bo‘lmasligi kerak.');
    const path = `${prefix}/${crypto.randomUUID()}.${playlistCoverTypes[file.type]}`;
    const { error: uploadError } = await client.storage.from(playlistCoverBucket).upload(path, file, {
      cacheControl:'31536000', upsert:false, contentType:file.type
    });
    if (uploadError) throw new Error('Fayl yuklanmadi. Supabase SQL Editor’da supabase/playlist.sql va supabase/playlist-folders.sql migration’larini bajaring.');
    const { data } = client.storage.from(playlistCoverBucket).getPublicUrl(path);
    return { path, url:data.publicUrl };
  };
  const setStatus = (text, isError = false) => { status.textContent = text; status.classList.toggle('admin-error', isError); };
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const isAdmin = async () => { const { data: { user } } = await client.auth.getUser(); if (!user) return null; const { data } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(); return data ? user : null; };
  const showDashboard = async (user) => { if (!user) { loginView.hidden = false; dashboard.hidden = true; return; } const { data: adminRow, error: adminError } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(); if (adminError || !adminRow) { await client.auth.signOut(); loginView.hidden = false; dashboard.hidden = true; error.textContent = adminError ? 'Admin jadvalini tekshirishda xatolik yuz berdi.' : 'Login muvaffaqiyatli, lekin bu account admin sifatida ruxsat etilmagan.'; error.hidden = false; return; } loginView.hidden = true; dashboard.hidden = false; $('admin-user').textContent = user.email || 'admin'; await loadAll(); };
  const loadAll = async () => { setStatus('yuklanmoqda…'); const [settings, bookResult, mediaResult, updateResult, timelineResult, aboutResult, playlistResult, folderResult, notesResult] = await Promise.all([client.from('now_settings').select('*').eq('id','default').maybeSingle(), client.from('books').select('*').order('position').order('created_at'), client.from('media_items').select('*').order('position').order('created_at'), client.from('updates').select('*').order('published_on', { ascending: false }).order('position').order('created_at', { ascending: false }), client.from('timeline_events').select('*').order('year').order('month', { ascending: true, nullsFirst: true }).order('position').order('created_at'), client.from('about_content').select('*').eq('id','default').maybeSingle(), client.from('playlist_tracks').select('*').order('position').order('created_at'), client.from('playlist_folders').select('*').order('position').order('created_at'), client.from('playlist_notes').select('*').order('position').order('created_at')]); if (settings.error || bookResult.error || mediaResult.error || updateResult.error || timelineResult.error || aboutResult.error) return setStatus('Ma’lumotlarni yuklashda xatolik yuz berdi. Supabase migration ishlaganini tekshiring.', true); books = bookResult.data || []; media = mediaResult.data || []; updates = updateResult.data || []; timeline = timelineResult.data || []; about = aboutResult.data || {}; playlistTracks = playlistResult.error ? [] : (playlistResult.data || []); playlistFolders = folderResult.error ? [] : (folderResult.data || []); playlistNotes = notesResult.error ? [] : (notesResult.data || []); $('focus-title').value = settings.data?.focus_title || ''; $('focus-subtitle').value = settings.data?.focus_subtitle || ''; fillAboutForm(); renderLists(); renderPlaylistFolders(); renderPlaylistList(); renderPlaylistNotesList(); const playlistLoadError = folderResult.error ? `Folder jadvali yuklanmadi: ${folderResult.error.message}` : playlistResult.error ? `Treklar jadvali yuklanmadi: ${playlistResult.error.message}` : notesResult.error ? `Playlist notes yuklanmadi: ${notesResult.error.message}` : ''; setStatus(playlistLoadError || ''); };
  const renderLists = () => { $('books-admin-list').innerHTML = books.length ? books.map((b) => `<div class="admin-list-item"><div><strong>${esc(b.title)}</strong><small>${esc(b.author)} · ${esc(b.status)}</small></div><div class="admin-list-actions"><button type="button" data-edit-book="${b.id}">tahrirlash</button><button type="button" data-delete-book="${b.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha kitob yo‘q.</p>'; $('media-admin-list').innerHTML = media.length ? media.map((m) => `<div class="admin-list-item"><div><strong>${esc(m.title)}</strong><small>${esc(m.type)} · ${esc(m.status)}${m.rating == null ? '' : ` · ${esc(m.rating)}/10`}</small></div><div class="admin-list-actions"><button type="button" data-edit-media="${m.id}">tahrirlash</button><button type="button" data-delete-media="${m.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha media yo‘q.</p>'; $('updates-admin-list').innerHTML = updates.length ? updates.map((u) => `<div class="admin-list-item"><div><strong>${esc(u.title)}</strong><small>${esc(u.published_on)} · ${u.is_published ? 'published' : 'yashirilgan'}</small></div><div class="admin-list-actions"><button type="button" data-edit-update="${u.id}">tahrirlash</button><button type="button" data-delete-update="${u.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha qayd yo‘q.</p>'; const months=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']; const timelineDate=(item)=>item.month ? `${months[item.month-1]} ${item.year}` : String(item.year); $('timeline-admin-list').innerHTML = timeline.length ? timeline.map((item) => `<div class="admin-list-item"><div><strong>${esc(item.title)}</strong><small>${esc(timelineDate(item))} · ${item.is_current ? 'joriy' : 'tarix'} · ${item.is_published ? 'published' : 'yashirilgan'}</small></div><div class="admin-list-actions"><button type="button" data-edit-timeline="${item.id}">tahrirlash</button><button type="button" data-delete-timeline="${item.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha timeline voqeasi yo‘q.</p>'; };
  const renderPlaylistFolders = () => {
    $('playlist-folder-admin-list').innerHTML = playlistFolders.length ? playlistFolders.map((folder) => {
      const trackCount = playlistTracks.filter((track) => track.folder_id === folder.id).length;
      return `<div class="admin-list-item"><div><strong>${esc(folder.name)}</strong><small>${folder.is_published ? 'saytda ko‘rinadi' : 'qoralama'} · ${trackCount} ta trek · ${esc(folder.color || '#A8A5FF')}</small></div><div class="admin-list-actions"><button type="button" data-edit-playlist-folder="${esc(folder.id)}">tahrirlash</button><button type="button" data-delete-playlist-folder="${esc(folder.id)}">o‘chirish</button></div></div>`;
    }).join('') : '<p class="admin-note">Hozircha folder yo‘q. “+ yangi folder” tugmasi orqali yarating.</p>';
    const select = $('playlist-folder-id');
    const picker = $('playlist-folder-options');
    if (!select || !picker) return;
    const current = select.value;
    select.replaceChildren(new Option('Folder tanlanmagan', ''));
    picker.replaceChildren();
    const noFolder = document.createElement('button');
    noFolder.type = 'button'; noFolder.className = 'playlist-folder-option'; noFolder.dataset.playlistFolderOption = '';
    noFolder.setAttribute('aria-pressed', current ? 'false' : 'true');
    noFolder.innerHTML = '<span class="playlist-folder-option-icon" aria-hidden="true">♪</span><span><strong>Foldersiz</strong><small>Umumiy ro‘yxatda ko‘rinadi</small></span>';
    picker.append(noFolder);
    playlistFolders.forEach((folder) => {
      const option = new Option(folder.name, folder.id);
      select.add(option);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'playlist-folder-option';
      button.dataset.playlistFolderOption = folder.id;
      button.style.setProperty('--folder-color', validPlaylistHex(folder.color) ? folder.color : '#A8A5FF');
      button.setAttribute('aria-pressed', current === folder.id ? 'true' : 'false');
      const icon = document.createElement('span'); icon.className = 'playlist-folder-option-icon'; icon.setAttribute('aria-hidden', 'true');
      if (folder.cover_url) { const image = document.createElement('img'); image.src = folder.cover_url; image.alt = ''; image.loading = 'lazy'; icon.replaceChildren(image); } else icon.textContent = '▰';
      const label = document.createElement('span'); label.className = 'playlist-folder-option-copy';
      const name = document.createElement('strong'); name.textContent = folder.name;
      const meta = document.createElement('small'); meta.textContent = `${playlistTracks.filter((track) => track.folder_id === folder.id).length} ta trek${folder.is_published ? '' : ' · qoralama'}`;
      label.append(name, meta); button.append(icon, label); picker.append(button);
    });
    if (playlistFolders.some((folder) => folder.id === current)) select.value = current;
    $('playlist-folder-picker-help').textContent = playlistFolders.length ? 'Tanlangan folder ichida treklar alohida ko‘rsatiladi.' : 'Hozircha folder yo‘q. Avval “Playlist folderlari” bo‘limida folder yarating.';
  };
  const syncPlaylistFolderSelection = () => {
    const selectedId = $('playlist-folder-id').value;
    $('playlist-folder-options').querySelectorAll('[data-playlist-folder-option]').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.playlistFolderOption === selectedId ? 'true' : 'false');
    });
  };
  const refreshPlaylistFolders = async () => {
    const { data, error: folderError } = await client.from('playlist_folders').select('id, name, description, color, cover_url, position, is_published').order('position');
    if (folderError) throw folderError;
    playlistFolders = data || [];
    renderPlaylistFolders();
  };
  const resetPlaylistFolderForm = () => { $('playlist-folder-form').reset(); $('playlist-folder-id').value=''; $('playlist-folder-color').value='#A8A5FF'; $('playlist-folder-color-picker').value='#A8A5FF'; $('playlist-folder-cover-file').value=''; $('playlist-folder-cover-url').value=''; showPlaylistCoverPreview('', 'Folder cover', 'playlist-folder-cover-preview'); $('playlist-folder-position').value=playlistFolders.reduce((max,item)=>Math.max(max,Number(item.position)||0),-1)+1; $('playlist-folder-published').checked=true; $('playlist-folder-form').hidden=false; $('playlist-folder-form').scrollIntoView({behavior:'smooth',block:'center'}); };
  const fillPlaylistFolder = (folder) => { $('playlist-folder-id').value=folder.id||''; $('playlist-folder-name').value=folder.name||''; $('playlist-folder-description').value=folder.description||''; $('playlist-folder-color').value=folder.color||'#A8A5FF'; $('playlist-folder-color-picker').value=folder.color||'#A8A5FF'; $('playlist-folder-cover-file').value=''; $('playlist-folder-cover-url').value=folder.cover_url||''; showPlaylistCoverPreview(folder.cover_url||'', `${folder.name||'Folder'} cover`, 'playlist-folder-cover-preview'); $('playlist-folder-position').value=Number(folder.position)||0; $('playlist-folder-published').checked=!!folder.is_published; $('playlist-folder-form').hidden=false; $('playlist-folder-form').scrollIntoView({behavior:'smooth',block:'center'}); };
  const renderPlaylistList = () => {
    const platformLabels = { spotify:'Spotify', yandex:'Yandex Music', apple:'Apple Music', youtube:'YouTube' };
    $('playlist-admin-list').innerHTML = playlistTracks.length ? playlistTracks.map((track) => {
      const platforms = Object.keys(platformLabels).filter((key) => track.links && track.links[key]).map((key) => platformLabels[key]).join(', ') || 'havola yo‘q';
      const folderName = playlistFolders.find((folder) => folder.id === track.folder_id)?.name || 'Foldersiz';
      return `<div class="admin-list-item"><div><strong>${esc(track.title)}</strong><small>${esc(track.artist || 'Ijrochi ko‘rsatilmagan')} · ${esc(folderName)} · ${esc(platforms)} · ${track.is_published ? 'saytda ko‘rinadi' : 'qoralama'}</small></div><div class="admin-list-actions"><button type="button" data-edit-playlist="${esc(track.id)}">tahrirlash</button><button type="button" data-delete-playlist="${esc(track.id)}">o‘chirish</button></div></div>`;
    }).join('') : '<p class="admin-note">Hozircha trek qo‘shilmagan.</p>';
  };
  const renderPlaylistNotesList = () => {
    $('playlist-notes-admin-list').innerHTML = playlistNotes.length ? playlistNotes.map((note) => `<div class="admin-list-item"><div><strong>${esc(note.content)}</strong><small>${note.is_published ? 'saytda ko‘rinadi' : 'yashirilgan'} · tartib ${esc(note.position)}</small></div><div class="admin-list-actions"><button type="button" data-edit-playlist-note="${esc(note.id)}">tahrirlash</button><button type="button" data-delete-playlist-note="${esc(note.id)}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha qisqa note yo‘q.</p>';
  };
  const resetPlaylistNoteForm = () => {
    $('playlist-note-form').reset();
    $('playlist-note-id').value = '';
    $('playlist-note-position').value = playlistNotes.reduce((max, note) => Math.max(max, Number(note.position) || 0), -1) + 1;
    $('playlist-note-published').checked = true;
    $('playlist-note-form').hidden = false;
    $('playlist-note-form').scrollIntoView({behavior:'smooth',block:'center'});
  };
  const fillPlaylistNote = (note) => {
    $('playlist-note-id').value = note.id || '';
    $('playlist-note-content').value = note.content || '';
    $('playlist-note-position').value = Number(note.position) || 0;
    $('playlist-note-published').checked = !!note.is_published;
    $('playlist-note-form').hidden = false;
    $('playlist-note-form').scrollIntoView({behavior:'smooth',block:'center'});
  };
  const resetPlaylistForm = () => {
    $('playlist-form').reset();
    $('playlist-id').value = '';
    $('playlist-cover-file').value = '';
    $('playlist-cover-url').value = '';
    showPlaylistCoverPreview('');
    $('playlist-folder-id').value = ''; syncPlaylistFolderSelection(); $('playlist-position').value = playlistTracks.reduce((max, item) => Math.max(max, Number(item.position) || 0), -1) + 1;
    $('playlist-published').checked = true;
    $('playlist-form').hidden = false;
    $('playlist-form').scrollIntoView({behavior:'smooth',block:'center'});
  };
  const fillPlaylist = (track) => {
    const links = track.links && typeof track.links === 'object' ? track.links : {};
    $('playlist-id').value = track.id || '';
    $('playlist-title').value = track.title || '';
    $('playlist-artist').value = track.artist || ''; $('playlist-folder-id').value = track.folder_id || ''; syncPlaylistFolderSelection();
    $('playlist-spotify').value = links.spotify || '';
    $('playlist-yandex').value = links.yandex || '';
    $('playlist-apple').value = links.apple || '';
    $('playlist-youtube').value = links.youtube || '';
    $('playlist-cover-file').value = '';
    $('playlist-cover-url').value = track.cover_url || '';
    showPlaylistCoverPreview(track.cover_url || '', `${track.title || 'Trek'} muqovasi`);
    const colors = track.platform_colors && typeof track.platform_colors === 'object' ? track.platform_colors : {};
    Object.entries(playlistDefaultColors).forEach(([key, fallback]) => { const color = validPlaylistHex(colors[key]) ? colors[key].toUpperCase() : fallback; $('playlist-color-picker-' + key).value = color; $('playlist-color-hex-' + key).value = color; });
    $('playlist-position').value = Number(track.position) || 0;
    $('playlist-published').checked = !!track.is_published;
    $('playlist-form').hidden = false;
    $('playlist-form').scrollIntoView({behavior:'smooth',block:'center'});
  };
  const playlistUrl = (id) => {
    const value = $(id).value.trim();
    if (!value) return '';
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname) throw new Error('Faqat HTTPS havolalar ruxsat etiladi.');
    return url.href;
  };
  const fill = (prefix, item) => { $(prefix+'-id').value=item.id||''; $(prefix+'-title').value=item.title||''; if(prefix==='book'){ $('book-author').value=item.author||''; $('book-year').value=item.year||''; $('book-status').value=item.status||'reading'; $('book-url').value=item.external_url||''; $('book-cover-url').value=item.cover_url||''; updateBookCoverPreview(); $('book-note').value=item.note||''; } else { $('media-type').value=item.type||'movie'; $('media-status').value=item.status||'watched'; $('media-year').value=item.year||''; $('media-rating').value=item.rating??''; $('media-url').value=item.external_url||''; $('media-poster-url').value=item.poster_url||''; updatePosterPreview(); $('media-note').value=item.note||''; } $(prefix+'-form').hidden=false; $(prefix+'-form').scrollIntoView({behavior:'smooth',block:'center'}); };
  const save = async (table, id, payload) => { const result = id ? await client.from(table).update(payload).eq('id',id) : await client.from(table).insert(payload); if(result.error) throw result.error; };
  const fillTimeline = (item) => { $('timeline-id').value=item.id||''; $('timeline-year').value=item.year||''; $('timeline-month').value=item.month||''; $('timeline-title').value=item.title||''; $('timeline-description').value=item.description||''; $('timeline-position').value=item.position||0; $('timeline-current').checked=!!item.is_current; $('timeline-published').checked=!!item.is_published; $('timeline-form').hidden=false; $('timeline-form').scrollIntoView({behavior:'smooth',block:'center'}); };
  const fillUpdate = (item) => { $('update-id').value=item.id||''; $('update-title').value=item.title||''; $('update-content').value=item.content||''; $('update-url').value=item.external_url||''; $('update-source').value=item.source||''; $('update-date').value=item.published_on||''; $('update-position').value=item.position||0; $('update-published').checked=!!item.is_published; $('update-form').hidden=false; $('update-form').scrollIntoView({behavior:'smooth',block:'center'}); };
  const lineArray = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean);
  const factsFromText = (value) => lineArray(value).map((line) => { const [label, ...rest] = line.split('|'); return { label: label.trim(), value: rest.join('|').trim() }; }).filter((item) => item.label && item.value);
  const languageLevels = ['A1','A2','B1','B2','C1','C2','native'];
  const addLanguageRow = (item = {}) => { const row = document.createElement('div'); row.className = 'about-language-row'; row.innerHTML = `<input class="about-language-name" placeholder="Til" value="${esc(item.name || '')}"><select class="about-language-level">${languageLevels.map((level) => `<option value="${level}" ${item.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select><button class="admin-quiet-button" type="button" data-remove-language>o‘chirish</button>`; $('about-languages-editor').appendChild(row); };
  const addInterestRow = (item = {}) => {
    const value = typeof item === 'string' ? item : (item.name || '');
    const color = typeof item === 'object' && item ? (item.color || '') : '';
    const imageUrl = typeof item === 'object' && item ? (item.image_url || '') : '';
    const pickerColor = /^#[0-9a-fA-F]{3}$/.test(color) ? `#${color.slice(1).split('').map((part) => part + part).join('')}` : (color || '#808080');
    const row = document.createElement('div');
    row.className = 'about-interest-row';
    row.innerHTML = `<input class="about-interest-name" placeholder="Masalan, Kino" value="${esc(value)}" required><input class="about-interest-image-url" type="url" placeholder="Rasm URL (HTTPS, to‘g‘ridan-to‘g‘ri)" value="${esc(imageUrl)}" aria-label="${esc(value || 'Qiziqish')} uchun rasm URL" autocomplete="off"><input class="about-interest-picker" type="color" value="${pickerColor}" aria-label="Qiziqish rangini tanlash"><input class="about-interest-color" placeholder="default yoki #HEX" value="${esc(color)}" pattern="^$|^#[0-9A-Fa-f]{3}([0-9a-fA-F]{3})?$" maxlength="7" inputmode="text"><button class="admin-quiet-button" type="button" data-reset-interest-color>default</button><button class="admin-quiet-button" type="button" data-remove-interest>o‘chirish</button>`;
    $('about-interests-editor').appendChild(row);
  };
  const fillAboutForm = () => { $('about-bio-input').value=about.bio_intro||''; $('about-facts-input').value=(about.education_facts||[]).map((x)=>`${x.label} | ${x.value}`).join('\n'); $('about-goal-input').value=about.bio_goal||''; $('about-hard-input').value=(about.hard_skills||[]).join('\n'); $('about-soft-input').value=(about.soft_skills||[]).join('\n'); $('about-interests-editor').innerHTML=''; (about.interests||[]).forEach(addInterestRow); $('about-tech-input').value=about.bio_tech||''; $('about-quote-input').value=about.quote||''; $('about-quote-color').value=about.quote_color||''; $('about-quote-picker').value=/^#[0-9a-fA-F]{3}$/.test(about.quote_color||'') ? `#${about.quote_color.slice(1).split('').map((part) => part + part).join('')}` : (about.quote_color || '#a8a5ff'); $('about-languages-editor').innerHTML=''; (about.languages||[]).forEach(addLanguageRow); };
  const collectLanguages = () => Array.from(document.querySelectorAll('.about-language-row')).map((row) => ({ name: row.querySelector('.about-language-name').value.trim(), level: row.querySelector('.about-language-level').value })).filter((item) => item.name);
  const invalidInterestImageUrlMessage = 'Qiziqish rasmi uchun yaroqli HTTPS URL kiriting.';
  const normalizeInterestImageUrl = (value) => {
    const raw = value.trim();
    if (!raw) return '';
    let url;
    try { url = new URL(raw); } catch { throw new Error(invalidInterestImageUrlMessage); }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error(invalidInterestImageUrlMessage);
    return url.href;
  };
  const collectInterests = () => Array.from(document.querySelectorAll('.about-interest-row'))
    .filter((row) => row.querySelector('.about-interest-name').value.trim())
    .map((row) => ({ name: row.querySelector('.about-interest-name').value.trim(), color: row.querySelector('.about-interest-color').value.trim(), image_url: normalizeInterestImageUrl(row.querySelector('.about-interest-image-url').value) }));
  $('login-form').addEventListener('submit', async (e) => { e.preventDefault(); error.hidden=true; const submit = $('login-form').querySelector('[type="submit"]'); submit.disabled = true; submit.setAttribute('aria-busy', 'true'); const originalLabel = submit.innerHTML; submit.textContent = 'tekshirilmoqda…'; try { const { data: { user }, error: authError } = await client.auth.signInWithPassword({ email: $('login-email').value.trim(), password: $('login-password').value }); if(authError){ error.textContent = authError.message || 'Email yoki parol noto‘g‘ri.'; error.hidden=false; return; } await showDashboard(user); } catch { error.textContent = 'Login vaqtida kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring.'; error.hidden=false; } finally { submit.disabled = false; submit.removeAttribute('aria-busy'); submit.innerHTML = originalLabel; } });
  $('logout-button').addEventListener('click', async () => { await client.auth.signOut(); await showDashboard(null); });
  $('settings-form').addEventListener('submit', async (e) => { e.preventDefault(); const { error: e1 } = await client.from('now_settings').update({ focus_title:$('focus-title').value.trim(), focus_subtitle:$('focus-subtitle').value.trim(), updated_at:new Date().toISOString() }).eq('id','default'); setStatus(e1 ? 'Sozlamani saqlashda xatolik.' : 'Sozlamalar saqlandi.', !!e1); });
  $('book-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await save('books', $('book-id').value, { title:$('book-title').value.trim(), author:$('book-author').value.trim(), year:$('book-year').value ? Number($('book-year').value) : null, status:$('book-status').value, external_url:$('book-url').value.trim()||null, cover_url:(await resolvePosterUrl($('book-cover-url').value.trim()))||null, note:$('book-note').value.trim() }); $('book-form').hidden=true; await loadAll(); } catch { setStatus('Kitobni saqlashda xatolik.', true); } });
  const wikipediaFileTitle = (value) => { try { const url = new URL(value); if (!/(wikipedia|wikimedia)\.org$/i.test(url.hostname) && !/(^|\.)wikipedia\.org$/i.test(url.hostname)) return null; const match = url.pathname.match(/\/(?:wiki\/)?File:(.+)$/i) || url.pathname.match(/\/Special:Redirect\/file\/(.+)$/i); return match ? decodeURIComponent(match[1]).replace(/_/g, ' ') : null; } catch { return null; } };
  const resolvePosterUrl = async (value) => { const title = wikipediaFileTitle(value); if (!title) return value; const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(`File:${title}`)}`; try { const response = await fetch(api); const data = await response.json(); const page = Object.values(data.query?.pages || {})[0]; return page?.imageinfo?.[0]?.url || value; } catch { return value; } };
  const updatePosterPreview = async () => { const input = $('media-poster-url'); const preview = $('media-poster-preview'); if (!input || !preview) return; const typedUrl = input.value.trim(); preview.hidden = !typedUrl; preview.classList.remove('is-error'); preview.innerHTML = typedUrl ? '<span>poster yuklanmoqda…</span>' : ''; if (!typedUrl) return; const url = await resolvePosterUrl(typedUrl); preview.innerHTML = `<img src="${esc(url)}" alt="Poster preview" onerror="this.parentElement.classList.add('is-error'); this.innerHTML='<span>Rasm URL ishlamadi</span>';">`; };
  $('media-poster-url').addEventListener('input', updatePosterPreview);
  const updateBookCoverPreview = async () => { const input = $('book-cover-url'); const preview = $('book-cover-preview'); if (!input || !preview) return; const typedUrl = input.value.trim(); preview.hidden = !typedUrl; preview.classList.remove('is-error'); preview.innerHTML = typedUrl ? '<span>muqova yuklanmoqda…</span>' : ''; if (!typedUrl) return; const url = await resolvePosterUrl(typedUrl); preview.innerHTML = `<img src="${esc(url)}" alt="Cover preview" onerror="this.parentElement.classList.add('is-error'); this.innerHTML='<span>Rasm URL ishlamadi</span>';">`; };
  $('book-cover-url').addEventListener('input', updateBookCoverPreview);
  $('playlist-cover-file').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!playlistCoverTypes[file.type]) { event.target.value = ''; showPlaylistCoverPreview($('playlist-cover-url').value || ''); setStatus('Muqova JPG, PNG, WebP yoki AVIF formatida bo‘lishi kerak.', true); return; }
    if (file.size > playlistCoverMaxBytes) { event.target.value = ''; showPlaylistCoverPreview($('playlist-cover-url').value || ''); setStatus('Muqova fayli 5 MB dan katta bo‘lmasligi kerak.', true); return; }
    playlistCoverPreviewObjectUrl = URL.createObjectURL(file);
    showPlaylistCoverPreview(playlistCoverPreviewObjectUrl, `${$('playlist-title').value.trim() || 'Trek'} muqovasi`);
  });
  $('playlist-cover-clear').addEventListener('click', () => {
    $('playlist-cover-file').value = '';
    $('playlist-cover-url').value = '';
    showPlaylistCoverPreview('');
  });

  $('playlist-folder-cover-file').addEventListener('change', (event) => { const file=event.target.files?.[0]; if (!file) return; if (!playlistCoverTypes[file.type] || file.size > playlistCoverMaxBytes) { event.target.value=''; return; } playlistCoverPreviewObjectUrl=URL.createObjectURL(file); showPlaylistCoverPreview(playlistCoverPreviewObjectUrl, `${$('playlist-folder-name').value.trim() || 'Folder'} cover`, 'playlist-folder-cover-preview'); });
  $('playlist-folder-cover-clear').addEventListener('click', () => { $('playlist-folder-cover-file').value=''; $('playlist-folder-cover-url').value=''; showPlaylistCoverPreview('', 'Folder cover', 'playlist-folder-cover-preview'); });
  $('playlist-folder-color-picker').addEventListener('input', (e) => $('playlist-folder-color').value=e.target.value.toUpperCase());
  $('playlist-folder-color').addEventListener('input', (e) => { if (validPlaylistHex(e.target.value)) $('playlist-folder-color-picker').value=e.target.value; });
  $('reset-playlist-folder-color').addEventListener('click', () => { $('playlist-folder-color').value='#A8A5FF'; $('playlist-folder-color-picker').value='#A8A5FF'; });
  $('playlist-folder-form').addEventListener('submit', async (e) => { e.preventDefault(); let uploaded=null; try { const color=$('playlist-folder-color').value.trim(); if (!validPlaylistHex(color)) throw new Error('Folder rangini #RRGGBB HEX shaklida kiriting.'); const previous=$('playlist-folder-cover-url').value||''; const file=$('playlist-folder-cover-file').files?.[0]||null; let cover=previous||null; if(file){ uploaded=await uploadPlaylistCover(file,'folders'); cover=uploaded.url; } await save('playlist_folders',$('playlist-folder-id').value,{name:$('playlist-folder-name').value.trim(),description:$('playlist-folder-description').value.trim(),color:color.toUpperCase(),cover_url:cover,position:Number($('playlist-folder-position').value)||0,is_published:$('playlist-folder-published').checked,updated_at:new Date().toISOString()}); if(previous&&previous!==cover) await removePlaylistCover(previous); $('playlist-folder-form').hidden=true; await loadAll(); setStatus('Folder saqlandi.'); } catch(error){ if(uploaded) await removePlaylistCover(uploaded.url); setStatus(error.message||'Folder saqlashda xatolik.',true); } });
  $('playlist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const links = {
        spotify: playlistUrl('playlist-spotify'),
        yandex: playlistUrl('playlist-yandex'),
        apple: playlistUrl('playlist-apple'),
        youtube: playlistUrl('playlist-youtube')
      };
      Object.keys(links).forEach((key) => { if (!links[key]) delete links[key]; });
      if (!Object.keys(links).length) return setStatus('Kamida bitta platforma havolasini kiriting.', true);
      const platformColors = Object.fromEntries(Object.entries(playlistDefaultColors).map(([key, fallback]) => {
        const value = $('playlist-color-hex-' + key).value.trim();
        if (value && !validPlaylistHex(value)) throw new Error('Rangni #RRGGBB HEX shaklida kiriting.');
        return [key, value ? value.toUpperCase() : fallback];
      }));
      const previousCover = $('playlist-cover-url').value || '';
      const selectedFile = $('playlist-cover-file').files?.[0] || null;
      let uploadedCover = null;
      let coverUrl = previousCover || null;
      if (selectedFile) {
        setStatus('Muqova yuklanmoqda…');
        uploadedCover = await uploadPlaylistCover(selectedFile);
        coverUrl = uploadedCover.url;
      }
      try {
        await save('playlist_tracks', $('playlist-id').value, {
          title: $('playlist-title').value.trim(),
          folder_id: $('playlist-folder-id').value || null,
          artist: $('playlist-artist').value.trim(),
          links,
          platform_colors: platformColors,
          cover_url: coverUrl,
          position: Number($('playlist-position').value) || 0,
          is_published: $('playlist-published').checked,
          updated_at: new Date().toISOString()
        });
      } catch (error) {
        if (uploadedCover) await removePlaylistCover(uploadedCover.url);
        throw error;
      }
      if (previousCover && previousCover !== coverUrl) await removePlaylistCover(previousCover);
      $('playlist-form').hidden = true;
      await loadAll();
      setStatus('Trek saqlandi.');
    } catch (error) {
      const message = ['Faqat HTTPS havolalar ruxsat etiladi.', 'Rangni #RRGGBB HEX shaklida kiriting.', 'Muqova JPG, PNG, WebP yoki AVIF formatida bo‘lishi kerak.', 'Muqova fayli 5 MB dan katta bo‘lmasligi kerak.'].includes(error.message) ? error.message : error.message.startsWith('Fayl yuklanmadi.') ? error.message : 'Trek saqlanmadi. Supabase jadvali, Storage va RLS sozlamalarini tekshiring.';
      setStatus(message, true);
    }
  });
  $('playlist-note-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const content = $('playlist-note-content').value.trim();
      if (!content) return setStatus('Note matnini kiriting.', true);
      await save('playlist_notes', $('playlist-note-id').value, {
        content,
        position:Number($('playlist-note-position').value) || 0,
        is_published:$('playlist-note-published').checked,
        updated_at:new Date().toISOString()
      });
      $('playlist-note-form').hidden = true;
      await loadAll();
      setStatus('Qisqa note saqlandi.');
    } catch {
      setStatus('Qisqa note saqlanmadi. Supabase migration va admin RLS sozlamalarini tekshiring.', true);
    }
  });
  $('timeline-form').addEventListener('submit', async (e) => { e.preventDefault(); try { const current = $('timeline-current').checked; if (current) await client.from('timeline_events').update({ is_current:false }).neq('id', $('timeline-id').value || '00000000-0000-0000-0000-000000000000'); await save('timeline_events', $('timeline-id').value, { year:Number($('timeline-year').value), month:$('timeline-month').value ? Number($('timeline-month').value) : null, title:$('timeline-title').value.trim(), description:$('timeline-description').value.trim(), position:Number($('timeline-position').value)||0, is_current:current, is_published:$('timeline-published').checked }); $('timeline-form').hidden=true; await loadAll(); } catch { setStatus('Timeline saqlashda xatolik.', true); } });
  $('media-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await save('media_items', $('media-id').value, { title:$('media-title').value.trim(), type:$('media-type').value, status:$('media-status').value, year:$('media-year').value ? Number($('media-year').value) : null, rating:$('media-rating').value ? Number($('media-rating').value) : null, external_url:$('media-url').value.trim()||null, poster_url:(await resolvePosterUrl($('media-poster-url').value.trim()))||null, note:$('media-note').value.trim() }); $('media-form').hidden=true; await loadAll(); } catch { setStatus('Media saqlashda xatolik.', true); } });
  $('update-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await save('updates', $('update-id').value, { title:$('update-title').value.trim(), content:$('update-content').value.trim(), external_url:$('update-url').value.trim()||null, source:$('update-source').value.trim()||null, published_on:$('update-date').value, position:Number($('update-position').value)||0, is_published:$('update-published').checked }); $('update-form').hidden=true; await loadAll(); } catch { setStatus('Qaydni saqlashda xatolik.', true); } });
  $('about-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const interests = collectInterests();
      await client.from('about_content').update({ bio_intro:$('about-bio-input').value.trim(), education_facts:factsFromText($('about-facts-input').value), bio_goal:$('about-goal-input').value.trim(), hard_skills:lineArray($('about-hard-input').value), soft_skills:lineArray($('about-soft-input').value), languages:collectLanguages(), interests, quote_color:$('about-quote-color').value.trim(), bio_tech:$('about-tech-input').value.trim(), quote:$('about-quote-input').value.trim(), updated_at:new Date().toISOString() }).eq('id','default');
      setStatus('About sahifasi saqlandi.');
      await loadAll();
    } catch (error) {
      setStatus(error?.message === invalidInterestImageUrlMessage ? error.message : 'About ma’lumotlarini saqlashda xatolik.', true);
    }
  });
  $('add-language').addEventListener('click', () => addLanguageRow());
  $('add-interest').addEventListener('click', () => addInterestRow());
  $('about-quote-picker').addEventListener('input', (e) => { $('about-quote-color').value = e.target.value.toUpperCase(); });
  $('about-quote-color').addEventListener('input', (e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) $('about-quote-picker').value = e.target.value; });
  $('reset-quote-color').addEventListener('click', () => { $('about-quote-color').value = ''; $('about-quote-picker').value = '#a8a5ff'; });
  document.addEventListener('input', (e) => { const row = e.target.closest('.about-interest-row'); if (!row) return; if (e.target.classList.contains('about-interest-picker')) row.querySelector('.about-interest-color').value = e.target.value.toUpperCase(); if (e.target.classList.contains('about-interest-color') && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) row.querySelector('.about-interest-picker').value = e.target.value; });
  document.addEventListener('input', (event) => { const picker = event.target.closest('[data-playlist-color-picker]'); if (picker) { $('playlist-color-hex-' + picker.dataset.playlistColorPicker).value = picker.value.toUpperCase(); return; } if (event.target.classList.contains('playlist-color-hex') && validPlaylistHex(event.target.value)) { const key = event.target.id.replace('playlist-color-hex-', ''); $('playlist-color-picker-' + key).value = event.target.value.toUpperCase(); } });
  document.addEventListener('click', (e) => { if (e.target.dataset.removeLanguage) e.target.closest('.about-language-row').remove(); if (e.target.dataset.removeInterest) e.target.closest('.about-interest-row').remove(); if (e.target.dataset.resetInterestColor) { const row = e.target.closest('.about-interest-row'); row.querySelector('.about-interest-color').value = ''; row.querySelector('.about-interest-picker').value = '#808080'; } });
  document.addEventListener('click', async (e) => { const t=e.target; if(t.dataset.add){ $(t.dataset.add+'-form').hidden=false; if(t.dataset.add === 'update' && !$('update-date').value) $('update-date').value = new Date().toISOString().slice(0, 10); } if(t.dataset.cancel){ $(t.dataset.cancel+'-form').hidden=true; } if(t.dataset.editBook){ fill('book', books.find((x)=>x.id===t.dataset.editBook)); } if(t.dataset.editMedia){ fill('media', media.find((x)=>x.id===t.dataset.editMedia)); } if(t.dataset.editUpdate){ fillUpdate(updates.find((x)=>x.id===t.dataset.editUpdate)); } if(t.dataset.editTimeline){ fillTimeline(timeline.find((x)=>x.id===t.dataset.editTimeline)); } if(t.dataset.deleteUpdate && confirm('Bu qayd o‘chirilsinmi?')){ await client.from('updates').delete().eq('id',t.dataset.deleteUpdate); await loadAll(); } if(t.dataset.deleteBook && confirm('Bu kitob o‘chirilsinmi?')){ await client.from('books').delete().eq('id',t.dataset.deleteBook); await loadAll(); } if(t.dataset.deleteMedia && confirm('Bu media o‘chirilsinmi?')){ await client.from('media_items').delete().eq('id',t.dataset.deleteMedia); await loadAll(); } if(t.dataset.deleteTimeline && confirm('Bu timeline voqeasi o‘chirilsinmi?')){ await client.from('timeline_events').delete().eq('id',t.dataset.deleteTimeline); await loadAll(); } });
  document.addEventListener('click', async (event) => {
    const folderOption = event.target.closest('[data-playlist-folder-option]');
    if (folderOption) {
      const folderId = folderOption.dataset.playlistFolderOption || '';
      $('playlist-folder-id').value = folderId;
      syncPlaylistFolderSelection();
      return;
    }
    const resetColor = event.target.closest('[data-reset-playlist-color]');
    if (resetColor) {
      const key = resetColor.dataset.resetPlaylistColor;
      if (playlistDefaultColors[key]) {
        $('playlist-color-picker-' + key).value = playlistDefaultColors[key];
        $('playlist-color-hex-' + key).value = playlistDefaultColors[key];
      }
      return;
    }
    const addNote = event.target.closest('[data-add="playlist-note"]');
    if (addNote) { resetPlaylistNoteForm(); return; }
    const editNote = event.target.closest('[data-edit-playlist-note]');
    if (editNote) {
      const note = playlistNotes.find((item) => item.id === editNote.dataset.editPlaylistNote);
      if (note) fillPlaylistNote(note);
      return;
    }
    const removeNote = event.target.closest('[data-delete-playlist-note]');
    if (removeNote) {
      if (!confirm('Bu qisqa note o‘chirilsinmi?')) return;
      try {
        const result = await client.from('playlist_notes').delete().eq('id', removeNote.dataset.deletePlaylistNote);
        if (result.error) throw result.error;
        await loadAll();
        setStatus('Qisqa note o‘chirildi.');
      } catch { setStatus('Qisqa note o‘chirishda xatolik yuz berdi.', true); }
      return;
    }
    const addFolder = event.target.closest('[data-add="playlist-folder"]');
    if (addFolder) { resetPlaylistFolderForm(); return; }
    const editFolder = event.target.closest('[data-edit-playlist-folder]');
    if (editFolder) { const folder = playlistFolders.find((item) => item.id === editFolder.dataset.editPlaylistFolder); if (folder) fillPlaylistFolder(folder); return; }
    const deleteFolder = event.target.closest('[data-delete-playlist-folder]');
    if (deleteFolder && confirm('Bu folder o‘chirilsinmi? Treklar folderdan ajratiladi.')) { await client.from('playlist_folders').delete().eq('id', deleteFolder.dataset.deletePlaylistFolder); await loadAll(); return; }
    const add = event.target.closest('[data-add="playlist"]');
    if (add) { try { await refreshPlaylistFolders(); resetPlaylistForm(); } catch (error) { renderPlaylistFolders(); resetPlaylistForm(); setStatus(`Folderlar yuklanmadi: ${error.message}`, true); } return; }
    const edit = event.target.closest('[data-edit-playlist]');
    if (edit) {
      const track = playlistTracks.find((item) => item.id === edit.dataset.editPlaylist);
      if (track) { try { await refreshPlaylistFolders(); } catch (error) { renderPlaylistFolders(); setStatus(`Folderlar yuklanmadi: ${error.message}`, true); } fillPlaylist(track); }
      return;
    }
    const remove = event.target.closest('[data-delete-playlist]');
    if (!remove || !confirm('Bu trek o‘chirilsinmi?')) return;
    try {
      const track = playlistTracks.find((item) => item.id === remove.dataset.deletePlaylist);
      const result = await client.from('playlist_tracks').delete().eq('id', remove.dataset.deletePlaylist);
      if (result.error) throw result.error;
      if (track?.cover_url) await removePlaylistCover(track.cover_url);
      await loadAll();
      setStatus('Trek o‘chirildi.');
    } catch {
      setStatus('Trekni o‘chirishda xatolik yuz berdi.', true);
    }
  });
  client.auth.onAuthStateChange(async (_event, session) => { const user = session ? await isAdmin() : null; await showDashboard(user); });
  isAdmin().then(showDashboard);
})();
