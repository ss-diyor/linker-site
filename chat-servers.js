(() => {
  const config = window.supabaseConfig;
  const $ = (id) => document.getElementById(id);
  const rail = $('community-server-rail');
  const list = $('community-server-list');
  const count = $('community-server-count');
  const emptyList = $('community-server-empty');
  const emptyRoom = $('community-room-empty');
  const room = $('community-room-content');
  const title = $('community-server-title');
  const description = $('community-server-description');
  const roomName = $('community-room-name');
  const roomMeta = $('community-room-meta');
  const lockState = $('community-lock-state');
  const messages = $('community-messages');
  const form = $('community-form');
  const input = $('community-input');
  const send = $('community-send');
  const errorBox = $('community-error');
  const turnstileBox = $('community-turnstile');
  if (!rail || !config || !window.supabase) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const siteKey = '0x4AAAAAAFuyXzBFPW9rCtNg';
  let servers = [];
  let current = null;
  let user = null;
  let messageChannel = null;
  let captchaWidget = null;
  let signingIn = null;
  let rendered = false;

  const showError = (message = '') => {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  };
  const safeName = (value) => (value || '').replace(/[<>]/g, '').trim();
  const time = (value) => new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  const visitorName = (id) => `Mehmon ${String(id).slice(0, 4).toUpperCase()}`;

  const getCaptchaToken = () => new Promise((resolve, reject) => {
    if (!window.turnstile) return reject(new Error('Captcha yuklanmadi'));
    turnstileBox.hidden = false;
    if (captchaWidget !== null) {
      try { window.turnstile.remove(captchaWidget); } catch {}
      turnstileBox.replaceChildren();
    }
    try {
      captchaWidget = window.turnstile.render(turnstileBox, {
        sitekey: siteKey,
        theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
        callback: (token) => { turnstileBox.hidden = true; resolve(token); },
        'expired-callback': () => reject(new Error('Captcha muddati tugadi')),
        'error-callback': () => reject(new Error('Captcha tekshiruvi xatosi')),
      });
    } catch (error) { reject(error); }
  });

  const waitForTurnstile = async () => {
    for (let attempt = 0; attempt < 40 && !window.turnstile; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    if (!window.turnstile) throw new Error('Captcha yuklanmadi');
  };

  const ensureSession = async () => {
    if (user) return user;
    if (signingIn) return signingIn;
    signingIn = (async () => {
      let { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      if (!session) {
        await waitForTurnstile();
        const captchaToken = await getCaptchaToken();
        const result = await client.auth.signInAnonymously({ options: { captchaToken } });
        if (result.error) throw result.error;
        session = result.data.session;
      }
      user = session.user;
      return user;
    })().finally(() => { signingIn = null; });
    return signingIn;
  };

  const renderServers = () => {
    list.replaceChildren();
    rail.replaceChildren();
    count.textContent = String(servers.length);
    emptyList.hidden = servers.length > 0;
    for (const server of servers) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `community-server-choice${current?.id === server.id ? ' is-active' : ''}`;
      button.dataset.communityServer = server.id;
      button.title = safeName(server.name);
      const icon = document.createElement('span');
      icon.className = 'community-server-icon';
      icon.style.setProperty('--server-color', /^#[0-9a-f]{6}$/i.test(server.color || '') ? server.color : '#a8a5ff');
      icon.textContent = safeName(server.name).slice(0, 1).toUpperCase() || '#';
      const label = document.createElement('span');
      label.className = 'community-server-label';
      label.textContent = safeName(server.name);
      const meta = document.createElement('small');
      meta.textContent = server.is_locked ? 'Yozish yopiq' : 'Ommaviy chat';
      button.append(icon, label, meta);
      list.append(button);

      const railButton = document.createElement('button');
      railButton.type = 'button';
      railButton.className = `community-rail-button${current?.id === server.id ? ' is-active' : ''}`;
      railButton.dataset.communityServer = server.id;
      railButton.title = safeName(server.name);
      railButton.style.setProperty('--server-color', /^#[0-9a-f]{6}$/i.test(server.color || '') ? server.color : '#a8a5ff');
      railButton.textContent = safeName(server.name).slice(0, 1).toUpperCase() || '#';
      rail.append(railButton);
    }
  };

  const renderMessages = (rows) => {
    const wasNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 100;
    messages.replaceChildren();
    if (!rows.length) {
      const intro = document.createElement('div');
      intro.className = 'community-welcome';
      intro.innerHTML = '<span>#</span><h2>Serverga xush kelibsiz</h2><p>Bu yerda suhbatni birinchi bo‘lib boshlang.</p>';
      messages.append(intro);
      rendered = true;
      return;
    }
    for (const item of rows) {
      const article = document.createElement('article');
      article.className = `community-message ${item.sender_type === 'admin' ? 'is-admin' : ''}`;
      article.dataset.messageId = item.id;
      const avatar = document.createElement('span');
      avatar.className = 'community-message-avatar';
      avatar.textContent = item.sender_type === 'admin' ? 'D' : visitorName(item.visitor_id).slice(-1);
      const content = document.createElement('div');
      content.className = 'community-message-body';
      const heading = document.createElement('div');
      heading.className = 'community-message-heading';
      const author = document.createElement('strong');
      author.textContent = item.sender_type === 'admin' ? 'Diyorbek' : visitorName(item.visitor_id);
      const date = document.createElement('time');
      date.dateTime = item.created_at;
      date.textContent = time(item.created_at);
      const body = document.createElement('p');
      body.textContent = item.body;
      heading.append(author, date);
      content.append(heading, body);
      article.append(avatar, content);
      messages.append(article);
    }
    rendered = true;
    if (wasNearBottom) messages.scrollTop = messages.scrollHeight;
  };

  const loadMessages = async () => {
    if (!current || !user) return;
    const { data, error } = await client.from('chat_server_messages')
      .select('id,server_id,visitor_id,sender_type,body,created_at')
      .eq('server_id', current.id).order('created_at', { ascending: false }).limit(300);
    if (error) {
      showError('Server xabarlari yuklanmadi. Supabase chat-server migration’ini tekshiring.');
      console.error('Community messages load failed:', error);
      return;
    }
    showError('');
    renderMessages((data || []).reverse());
  };

  const subscribe = () => {
    if (messageChannel) void client.removeChannel(messageChannel);
    if (!current) return;
    const serverId = current.id;
    messageChannel = client.channel(`community-server-${serverId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_server_messages', filter: `server_id=eq.${serverId}` }, (payload) => {
        const row = payload.new;
        if (!row || messages.querySelector(`[data-message-id="${row.id}"]`)) return;
        void loadMessages();
      }).subscribe((state) => {
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') showError('Jonli chat uzildi. Sahifani yangilang.');
      });
  };

  const selectServer = async (server) => {
    current = server;
    history.replaceState(null, '', `${location.pathname}?server=${encodeURIComponent(server.id)}`);
    renderServers();
    title.textContent = safeName(server.name);
    description.textContent = safeName(server.description) || 'Ochiq server suhbati';
    roomName.textContent = safeName(server.name);
    roomMeta.textContent = 'Ommaviy suhbat';
    lockState.hidden = !server.is_locked;
    input.disabled = Boolean(server.is_locked);
    send.disabled = Boolean(server.is_locked);
    input.placeholder = server.is_locked ? 'Bu serverda yozish vaqtincha yopiq' : `Xabarni #${safeName(server.name)} ga yuboring`;
    emptyRoom.hidden = true;
    room.hidden = false;
    try {
      await ensureSession();
      await loadMessages();
      subscribe();
    } catch (error) {
      showError(error.message?.includes('Captcha') || error.message?.includes('captcha')
        ? 'Xavfsizlik tekshiruvi o‘tmadi. Birozdan keyin qayta urinib ko‘ring.'
        : 'Chatga ulanish uchun anonim kirish amalga oshmadi. Supabase Auth sozlamalarini tekshiring.');
      console.error('Community auth failed:', error);
    }
  };

  const loadServers = async () => {
    const { data, error } = await client.from('chat_servers')
      .select('id,name,description,color,is_locked,position')
      .eq('is_published', true).order('position').order('created_at');
    if (error) {
      showError('Serverlar yuklanmadi. supabase/chat-servers.sql migratsiyasini bajaring.');
      console.error('Community servers load failed:', error);
      return;
    }
    servers = (data || []).map((server) => ({ ...server, message_count: 0 }));
    renderServers();
    if (!servers.length) { title.textContent = 'Serverlar tayyorlanmoqda'; return; }
    const requested = new URLSearchParams(location.search).get('server');
    const chosen = servers.find((server) => server.id === requested) || servers[0];
    await selectServer(chosen);
  };

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-community-server]') : null;
    if (!target) return;
    const server = servers.find((item) => item.id === target.dataset.communityServer);
    if (server) void selectServer(server);
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = input.value.trim();
    if (!body || !current || current.is_locked) return;
    send.disabled = true;
    showError('');
    try {
      await ensureSession();
      const { error } = await client.from('chat_server_messages').insert({
        server_id: current.id,
        visitor_id: user.id,
        sender_type: 'visitor',
        body,
      });
      if (error) throw error;
      input.value = '';
      input.style.height = 'auto';
      await loadMessages();
    } catch (error) {
      showError(error.code === '42501'
        ? 'Xabar yuborilmadi: server yopiq yoki yuborish limiti tugadi.'
        : 'Xabar yuborilmadi. Ulanishni tekshirib, qayta urinib ko‘ring.');
      console.error('Community message send failed:', error);
    } finally { send.disabled = Boolean(current?.is_locked); }
  });

  void loadServers();
})();
