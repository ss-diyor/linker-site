(() => {
  const config = window.supabaseConfig;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.publishableKey);
  const loginView = document.getElementById('login-view');
  const dashboard = document.getElementById('dashboard-view');
  const error = document.getElementById('login-error');
  const status = document.getElementById('admin-status');
  let books = [], media = [], updates = [], timeline = [], playlistTracks = [], about = null;
  const $ = (id) => document.getElementById(id);
  const playlistDefaultColors = { spotify:'#1DB954', yandex:'#FFCC00', apple:'#FA243C', youtube:'#FF0000' };
  const validPlaylistHex = (value) => /^#[0-9a-fA-F]{6}$/.test(value || '');
  const setStatus = (text, isError = false) => { status.textContent = text; status.classList.toggle('admin-error', isError); };
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const isAdmin = async () => { const { data: { user } } = await client.auth.getUser(); if (!user) return null; const { data } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(); return data ? user : null; };
  const showDashboard = async (user) => { if (!user) { loginView.hidden = false; dashboard.hidden = true; return; } const { data: adminRow, error: adminError } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(); if (adminError || !adminRow) { await client.auth.signOut(); loginView.hidden = false; dashboard.hidden = true; error.textContent = adminError ? 'Admin jadvalini tekshirishda xatolik yuz berdi.' : 'Login muvaffaqiyatli, lekin bu account admin sifatida ruxsat etilmagan.'; error.hidden = false; return; } loginView.hidden = true; dashboard.hidden = false; $('admin-user').textContent = user.email || 'admin'; await loadAll(); };
  const loadAll = async () => { setStatus('yuklanmoqda…'); const [settings, bookResult, mediaResult, updateResult, timelineResult, aboutResult, playlistResult] = await Promise.all([client.from('now_settings').select('*').eq('id','default').maybeSingle(), client.from('books').select('*').order('position').order('created_at'), client.from('media_items').select('*').order('position').order('created_at'), client.from('updates').select('*').order('published_on', { ascending: false }).order('position').order('created_at', { ascending: false }), client.from('timeline_events').select('*').order('year').order('month', { ascending: true, nullsFirst: true }).order('position').order('created_at'), client.from('about_content').select('*').eq('id','default').maybeSingle(), client.from('playlist_tracks').select('*').order('position').order('created_at')]); if (settings.error || bookResult.error || mediaResult.error || updateResult.error || timelineResult.error || aboutResult.error) return setStatus('Ma’lumotlarni yuklashda xatolik yuz berdi. Supabase migration ishlaganini tekshiring.', true); books = bookResult.data || []; media = mediaResult.data || []; updates = updateResult.data || []; timeline = timelineResult.data || []; about = aboutResult.data || {}; playlistTracks = playlistResult.error ? [] : (playlistResult.data || []); $('focus-title').value = settings.data?.focus_title || ''; $('focus-subtitle').value = settings.data?.focus_subtitle || ''; fillAboutForm(); renderLists(); renderPlaylistList(); setStatus(playlistResult.error ? 'Playlist jadvali topilmadi. Supabase SQL Editor’da supabase/playlist.sql skriptini bajaring.' : ''); };
  const renderLists = () => { $('books-admin-list').innerHTML = books.length ? books.map((b) => `<div class="admin-list-item"><div><strong>${esc(b.title)}</strong><small>${esc(b.author)} · ${esc(b.status)}</small></div><div class="admin-list-actions"><button type="button" data-edit-book="${b.id}">tahrirlash</button><button type="button" data-delete-book="${b.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha kitob yo‘q.</p>'; $('media-admin-list').innerHTML = media.length ? media.map((m) => `<div class="admin-list-item"><div><strong>${esc(m.title)}</strong><small>${esc(m.type)} · ${esc(m.status)}${m.rating == null ? '' : ` · ${esc(m.rating)}/10`}</small></div><div class="admin-list-actions"><button type="button" data-edit-media="${m.id}">tahrirlash</button><button type="button" data-delete-media="${m.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha media yo‘q.</p>'; $('updates-admin-list').innerHTML = updates.length ? updates.map((u) => `<div class="admin-list-item"><div><strong>${esc(u.title)}</strong><small>${esc(u.published_on)} · ${u.is_published ? 'published' : 'yashirilgan'}</small></div><div class="admin-list-actions"><button type="button" data-edit-update="${u.id}">tahrirlash</button><button type="button" data-delete-update="${u.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha qayd yo‘q.</p>'; const months=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']; const timelineDate=(item)=>item.month ? `${months[item.month-1]} ${item.year}` : String(item.year); $('timeline-admin-list').innerHTML = timeline.length ? timeline.map((item) => `<div class="admin-list-item"><div><strong>${esc(item.title)}</strong><small>${esc(timelineDate(item))} · ${item.is_current ? 'joriy' : 'tarix'} · ${item.is_published ? 'published' : 'yashirilgan'}</small></div><div class="admin-list-actions"><button type="button" data-edit-timeline="${item.id}">tahrirlash</button><button type="button" data-delete-timeline="${item.id}">o‘chirish</button></div></div>`).join('') : '<p class="admin-note">Hozircha timeline voqeasi yo‘q.</p>'; };
  const renderPlaylistList = () => {
    const platformLabels = { spotify:'Spotify', yandex:'Yandex Music', apple:'Apple Music', youtube:'YouTube' };
    $('playlist-admin-list').innerHTML = playlistTracks.length ? playlistTracks.map((track) => {
      const platforms = Object.keys(platformLabels).filter((key) => track.links && track.links[key]).map((key) => platformLabels[key]).join(', ') || 'havola yo‘q';
      return `<div class="admin-list-item"><div><strong>${esc(track.title)}</strong><small>${esc(track.artist || 'Ijrochi ko‘rsatilmagan')} · ${esc(platforms)} · ${track.is_published ? 'saytda ko‘rinadi' : 'qoralama'}</small></div><div class="admin-list-actions"><button type="button" data-edit-playlist="${esc(track.id)}">tahrirlash</button><button type="button" data-delete-playlist="${esc(track.id)}">o‘chirish</button></div></div>`;
    }).join('') : '<p class="admin-note">Hozircha trek qo‘shilmagan.</p>';
  };
  const resetPlaylistForm = () => {
    $('playlist-form').reset();
    $('playlist-id').value = '';
    $('playlist-position').value = playlistTracks.reduce((max, item) => Math.max(max, Number(item.position) || 0), -1) + 1;
    $('playlist-published').checked = true;
    $('playlist-form').hidden = false;
    $('playlist-form').scrollIntoView({behavior:'smooth',block:'center'});
  };
  const fillPlaylist = (track) => {
    const links = track.links && typeof track.links === 'object' ? track.links : {};
    $('playlist-id').value = track.id || '';
    $('playlist-title').value = track.title || '';
    $('playlist-artist').value = track.artist || '';
    $('playlist-spotify').value = links.spotify || '';
    $('playlist-yandex').value = links.yandex || '';
    $('playlist-apple').value = links.apple || '';
    $('playlist-youtube').value = links.youtube || '';
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
  const addInterestRow = (item = {}) => { const value = typeof item === 'string' ? item : (item.name || ''); const color = typeof item === 'object' ? (item.color || '') : ''; const pickerColor = /^#[0-9a-fA-F]{3}$/.test(color) ? `#${color.slice(1).split('').map((part) => part + part).join('')}` : (color || '#808080'); const row = document.createElement('div'); row.className = 'about-interest-row'; row.innerHTML = `<input class="about-interest-name" placeholder="Masalan, Kino" value="${esc(value)}" required><input class="about-interest-picker" type="color" value="${pickerColor}" aria-label="Qiziqish rangini tanlash"><input class="about-interest-color" placeholder="default yoki #HEX" value="${esc(color)}" pattern="^$|^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$" maxlength="7" inputmode="text"><button class="admin-quiet-button" type="button" data-reset-interest-color>default</button><button class="admin-quiet-button" type="button" data-remove-interest>o‘chirish</button>`; $('about-interests-editor').appendChild(row); };
  const fillAboutForm = () => { $('about-bio-input').value=about.bio_intro||''; $('about-facts-input').value=(about.education_facts||[]).map((x)=>`${x.label} | ${x.value}`).join('\n'); $('about-goal-input').value=about.bio_goal||''; $('about-hard-input').value=(about.hard_skills||[]).join('\n'); $('about-soft-input').value=(about.soft_skills||[]).join('\n'); $('about-interests-editor').innerHTML=''; (about.interests||[]).forEach(addInterestRow); $('about-tech-input').value=about.bio_tech||''; $('about-quote-input').value=about.quote||''; $('about-quote-color').value=about.quote_color||''; $('about-quote-picker').value=/^#[0-9a-fA-F]{3}$/.test(about.quote_color||'') ? `#${about.quote_color.slice(1).split('').map((part) => part + part).join('')}` : (about.quote_color || '#a8a5ff'); $('about-languages-editor').innerHTML=''; (about.languages||[]).forEach(addLanguageRow); };
  const collectLanguages = () => Array.from(document.querySelectorAll('.about-language-row')).map((row) => ({ name: row.querySelector('.about-language-name').value.trim(), level: row.querySelector('.about-language-level').value })).filter((item) => item.name);
  const collectInterests = () => Array.from(document.querySelectorAll('.about-interest-row')).map((row) => ({ name: row.querySelector('.about-interest-name').value.trim(), color: row.querySelector('.about-interest-color').value.trim() })).filter((item) => item.name);
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
      await save('playlist_tracks', $('playlist-id').value, {
        title: $('playlist-title').value.trim(),
        artist: $('playlist-artist').value.trim(),
        links,
        platform_colors: platformColors,
        position: Number($('playlist-position').value) || 0,
        is_published: $('playlist-published').checked,
        updated_at: new Date().toISOString()
      });
      $('playlist-form').hidden = true;
      await loadAll();
      setStatus('Trek saqlandi.');
    } catch (error) {
      setStatus(['Faqat HTTPS havolalar ruxsat etiladi.', 'Rangni #RRGGBB HEX shaklida kiriting.'].includes(error.message) ? error.message : 'Trek saqlanmadi. Supabase jadvali va RLS sozlamalarini tekshiring.', true);
    }
  });
  $('timeline-form').addEventListener('submit', async (e) => { e.preventDefault(); try { const current = $('timeline-current').checked; if (current) await client.from('timeline_events').update({ is_current:false }).neq('id', $('timeline-id').value || '00000000-0000-0000-0000-000000000000'); await save('timeline_events', $('timeline-id').value, { year:Number($('timeline-year').value), month:$('timeline-month').value ? Number($('timeline-month').value) : null, title:$('timeline-title').value.trim(), description:$('timeline-description').value.trim(), position:Number($('timeline-position').value)||0, is_current:current, is_published:$('timeline-published').checked }); $('timeline-form').hidden=true; await loadAll(); } catch { setStatus('Timeline saqlashda xatolik.', true); } });
  $('media-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await save('media_items', $('media-id').value, { title:$('media-title').value.trim(), type:$('media-type').value, status:$('media-status').value, year:$('media-year').value ? Number($('media-year').value) : null, rating:$('media-rating').value ? Number($('media-rating').value) : null, external_url:$('media-url').value.trim()||null, poster_url:(await resolvePosterUrl($('media-poster-url').value.trim()))||null, note:$('media-note').value.trim() }); $('media-form').hidden=true; await loadAll(); } catch { setStatus('Media saqlashda xatolik.', true); } });
  $('update-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await save('updates', $('update-id').value, { title:$('update-title').value.trim(), content:$('update-content').value.trim(), external_url:$('update-url').value.trim()||null, source:$('update-source').value.trim()||null, published_on:$('update-date').value, position:Number($('update-position').value)||0, is_published:$('update-published').checked }); $('update-form').hidden=true; await loadAll(); } catch { setStatus('Qaydni saqlashda xatolik.', true); } });
  $('about-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await client.from('about_content').update({ bio_intro:$('about-bio-input').value.trim(), education_facts:factsFromText($('about-facts-input').value), bio_goal:$('about-goal-input').value.trim(), hard_skills:lineArray($('about-hard-input').value), soft_skills:lineArray($('about-soft-input').value), languages:collectLanguages(), interests:collectInterests(), quote_color:$('about-quote-color').value.trim(), bio_tech:$('about-tech-input').value.trim(), quote:$('about-quote-input').value.trim(), updated_at:new Date().toISOString() }).eq('id','default'); setStatus('About sahifasi saqlandi.'); await loadAll(); } catch { setStatus('About ma’lumotlarini saqlashda xatolik.', true); } });
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
    const resetColor = event.target.closest('[data-reset-playlist-color]');
    if (resetColor) {
      const key = resetColor.dataset.resetPlaylistColor;
      if (playlistDefaultColors[key]) {
        $('playlist-color-picker-' + key).value = playlistDefaultColors[key];
        $('playlist-color-hex-' + key).value = playlistDefaultColors[key];
      }
      return;
    }
    const add = event.target.closest('[data-add="playlist"]');
    if (add) { resetPlaylistForm(); return; }
    const edit = event.target.closest('[data-edit-playlist]');
    if (edit) {
      const track = playlistTracks.find((item) => item.id === edit.dataset.editPlaylist);
      if (track) fillPlaylist(track);
      return;
    }
    const remove = event.target.closest('[data-delete-playlist]');
    if (!remove || !confirm('Bu trek o‘chirilsinmi?')) return;
    try {
      const result = await client.from('playlist_tracks').delete().eq('id', remove.dataset.deletePlaylist);
      if (result.error) throw result.error;
      await loadAll();
      setStatus('Trek o‘chirildi.');
    } catch {
      setStatus('Trekni o‘chirishda xatolik yuz berdi.', true);
    }
  });
  client.auth.onAuthStateChange(async (_event, session) => { const user = session ? await isAdmin() : null; await showDashboard(user); });
  isAdmin().then(showDashboard);
})();
