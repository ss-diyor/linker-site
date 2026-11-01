(() => {
  const config = window.supabaseConfig;
  const $ = (id) => document.getElementById(id);
  const panel = $('chat-server-admin');
  if (!panel || !config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.publishableKey);
  const list = $('chat-server-admin-list');
  const count = $('chat-server-admin-count');
  const errorBox = $('chat-server-admin-error');
  const form = $('chat-server-form');
  const inboxSelect = $('chat-server-inbox-select');
  const inboxMessages = $('chat-server-inbox-messages');
  const inboxEmpty = $('chat-server-inbox-empty');
  const inboxForm = $('chat-server-inbox-form');
  const inboxInput = $('chat-server-inbox-input');
  let servers = [];
  let currentUser = null;
  let activeServerId = '';
  let channel = null;
  let initGeneration = 0;
  let initPromise = null;

  const error = (text = '') => { errorBox.textContent = text; errorBox.hidden = !text; };
  const fmt = (value) => new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  const label = (value) => (value || '').replace(/[<>]/g, '');

  const resetForm = () => {
    form.reset();
    $('chat-server-id').value = '';
    $('chat-server-color').value = '#A8A5FF';
    $('chat-server-published').checked = true;
    $('chat-server-locked').checked = false;
  };

  const fillForm = (server) => {
    $('chat-server-id').value = server.id;
    $('chat-server-name').value = server.name;
    $('chat-server-description').value = server.description || '';
    $('chat-server-color').value = /^#[0-9a-f]{6}$/i.test(server.color || '') ? server.color : '#A8A5FF';
    $('chat-server-position').value = server.position || 0;
    $('chat-server-published').checked = Boolean(server.is_published);
    $('chat-server-locked').checked = Boolean(server.is_locked);
    $('chat-server-name').focus();
  };

  const render = () => {
    count.textContent = `${servers.length} ta server`;
    list.replaceChildren();
    inboxSelect.replaceChildren(new Option('Server tanlang', ''));
    for (const server of servers) {
      const item = document.createElement('div');
      item.className = 'admin-list-item chat-server-admin-item';
      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = label(server.name);
      const meta = document.createElement('small');
      meta.textContent = `${server.is_published ? 'saytda ochiq' : 'yashirilgan'} · ${server.is_locked ? 'yozish yopiq' : 'yozish ochiq'} · ${server.position} tartib`;
      info.append(name, meta);
      const actions = document.createElement('div');
      actions.className = 'admin-list-actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.dataset.editCommunityServer = server.id; edit.textContent = 'tahrirlash';
      const publish = document.createElement('button');
      publish.type = 'button'; publish.dataset.toggleCommunityPublish = server.id;
      publish.textContent = server.is_published ? 'yashirish' : 'ochish';
      const lock = document.createElement('button');
      lock.type = 'button'; lock.dataset.toggleCommunityLock = server.id;
      lock.textContent = server.is_locked ? 'yozishni ochish' : 'yozishni yopish';
      actions.append(edit, publish, lock);
      item.append(info, actions);
      list.append(item);
      inboxSelect.add(new Option(`${server.name}${server.is_published ? '' : ' · yashirin'}`, server.id));
    }
    if (activeServerId && servers.some((server) => server.id === activeServerId)) inboxSelect.value = activeServerId;
    else activeServerId = '';
  };

  const loadServers = async () => {
    const { data, error: queryError } = await client.from('chat_servers').select('*').order('position').order('created_at');
    if (queryError) throw queryError;
    servers = data || [];
    render();
  };

  const loadInbox = async () => {
    if (!activeServerId) {
      inboxMessages.hidden = true; inboxForm.hidden = true; inboxEmpty.hidden = false;
      inboxEmpty.textContent = 'Server tanlang yoki yangi server yarating.';
      inboxMessages.replaceChildren();
      return;
    }
    inboxEmpty.hidden = true; inboxMessages.hidden = false; inboxForm.hidden = false;
    const { data, error: queryError } = await client.from('chat_server_messages')
      .select('id,visitor_id,sender_type,body,created_at').eq('server_id', activeServerId)
      .order('created_at', { ascending: true }).limit(300);
    if (queryError) throw queryError;
    inboxMessages.replaceChildren();
    if (!data?.length) {
      const blank = document.createElement('p'); blank.className = 'community-inbox-blank';
      blank.textContent = 'Bu serverda hali xabar yo‘q.'; inboxMessages.append(blank); return;
    }
    for (const message of data) {
      const row = document.createElement('article'); row.className = `community-message ${message.sender_type === 'admin' ? 'is-admin' : ''}`;
      const avatar = document.createElement('span'); avatar.className = 'community-message-avatar';
      avatar.textContent = message.sender_type === 'admin' ? 'D' : String(message.visitor_id).slice(-1).toUpperCase();
      const body = document.createElement('div'); body.className = 'community-message-body';
      const heading = document.createElement('div'); heading.className = 'community-message-heading';
      const author = document.createElement('strong');
      author.textContent = message.sender_type === 'admin' ? 'Siz · admin' : `Mehmon ${String(message.visitor_id).slice(0, 4).toUpperCase()}`;
      const date = document.createElement('time'); date.dateTime = message.created_at; date.textContent = fmt(message.created_at);
      const text = document.createElement('p'); text.textContent = message.body;
      heading.append(author, date); body.append(heading, text); row.append(avatar, body); inboxMessages.append(row);
    }
    inboxMessages.scrollTop = inboxMessages.scrollHeight;
  };

  const refresh = async () => {
    try { error(''); await loadServers(); await loadInbox(); }
    catch (loadError) {
      error('Serverlar yoki xabarlarni yuklashda xatolik. Supabase’da supabase/chat-servers.sql migration’ini bajaring.');
      console.error('Server admin load failed:', loadError);
    }
  };

  const init = () => {
    const generation = initGeneration;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user || generation !== initGeneration) return;
      const { data: admin, error: adminError } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (adminError) throw adminError;
      if (!admin || generation !== initGeneration) return;
      currentUser = user;
      panel.hidden = false;
      await refresh();
      if (generation !== initGeneration) return;
      if (channel) void client.removeChannel(channel);
      channel = client.channel('chat-server-admin-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_server_messages' }, () => { void loadInbox().catch((e) => console.error(e)); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_servers' }, () => { void refresh(); })
        .subscribe();
    })().catch((initError) => {
      error('Server chat boshqaruvini ishga tushirib bo‘lmadi. Migration va admin RLS sozlamalarini tekshiring.');
      console.error('Server admin init failed:', initError);
    }).finally(() => { initPromise = null; });
    return initPromise;
  };

  const reset = () => {
    initGeneration += 1; currentUser = null; servers = []; activeServerId = '';
    if (channel) { void client.removeChannel(channel); channel = null; }
    panel.hidden = true; list.replaceChildren(); inboxSelect.replaceChildren(new Option('Server tanlang', ''));
    inboxMessages.replaceChildren(); inboxMessages.hidden = true; inboxForm.hidden = true; inboxEmpty.hidden = false;
    resetForm(); error('');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('chat-server-id').value;
    const record = {
      name: $('chat-server-name').value.trim(), description: $('chat-server-description').value.trim(),
      color: $('chat-server-color').value, position: Number($('chat-server-position').value) || 0,
      is_published: $('chat-server-published').checked, is_locked: $('chat-server-locked').checked,
    };
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    try {
      const result = id
        ? await client.from('chat_servers').update(record).eq('id', id)
        : await client.from('chat_servers').insert(record);
      if (result.error) throw result.error;
      resetForm(); await refresh();
    } catch (saveError) {
      error('Server saqlanmadi. Migration, admin ruxsati va Supabase ulanishini tekshiring.');
      console.error('Server save failed:', saveError);
    } finally { button.disabled = false; }
  });

  list.addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    const server = servers.find((item) => item.id === (button.dataset.editCommunityServer || button.dataset.toggleCommunityPublish || button.dataset.toggleCommunityLock));
    if (!server) return;
    if (button.dataset.editCommunityServer) { fillForm(server); return; }
    const update = button.dataset.toggleCommunityPublish
      ? { is_published: !server.is_published }
      : { is_locked: !server.is_locked };
    button.disabled = true;
    try {
      const { error: updateError } = await client.from('chat_servers').update(update).eq('id', server.id);
      if (updateError) throw updateError;
      await refresh();
    } catch (updateError) { error('Server holatini o‘zgartirib bo‘lmadi.'); console.error(updateError); }
  });

  $('chat-server-cancel').addEventListener('click', () => { resetForm(); error(''); });
  inboxSelect.addEventListener('change', () => {
    activeServerId = inboxSelect.value;
    void loadInbox().catch((loadError) => { error('Server xabarlari yuklanmadi.'); console.error(loadError); });
  });
  inboxForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = inboxInput.value.trim(); if (!body || !activeServerId || !currentUser) return;
    const button = inboxForm.querySelector('button'); button.disabled = true;
    try {
      const { error: sendError } = await client.from('chat_server_messages').insert({
        server_id: activeServerId, visitor_id: currentUser.id, sender_type: 'admin', body,
      });
      if (sendError) throw sendError;
      inboxInput.value = ''; await loadInbox();
    } catch (sendError) { error('Serverga xabar yuborilmadi. Admin RLS ruxsatini tekshiring.'); console.error(sendError); }
    finally { button.disabled = false; }
  });

  document.addEventListener('admin:authenticated', () => { void init(); });
  document.addEventListener('admin:unauthenticated', reset);
  void init();
})();
