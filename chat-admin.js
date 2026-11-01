(() => {
  const config = window.supabaseConfig;
  if (!config || !window.supabase) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const panel = document.getElementById('chat-admin-panel');
  if (!panel) return;

  const list = document.getElementById('chat-conversation-list');
  const selected = document.getElementById('chat-admin-selected');
  const empty = document.getElementById('chat-admin-empty');
  const selectedId = document.getElementById('chat-admin-selected-id');
  const selectedStatus = document.getElementById('chat-admin-status');
  const messages = document.getElementById('chat-admin-messages');
  const form = document.getElementById('chat-admin-form');
  const input = document.getElementById('chat-admin-input');
  const unread = document.getElementById('chat-unread-count');
  const errorBox = document.getElementById('chat-admin-error');
  const closeConversationButton = document.getElementById('chat-admin-close-conversation');
  const closedNote = document.getElementById('chat-admin-closed-note');

  let conversations = [];
  let current = null;
  let inboxChannel = null;
  let initialized = false;
  let authGeneration = 0;
  let initPromise = null;
  let initPromiseGeneration = null;

  const setChatError = (text = '') => {
    errorBox.textContent = text;
    errorBox.hidden = !text;
  };

  const formatTime = (value) => new Intl.DateTimeFormat('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
  const statusLabel = (status) => ({ active: 'faol', closed: 'yopilgan', spam: 'spam' })[status] || status;

  const renderMessages = (items) => {
    messages.replaceChildren();
    items.forEach((item) => {
      const bubble = document.createElement('article');
      bubble.className = `chat-bubble ${item.sender_type}`;
      bubble.textContent = item.body;
      const time = document.createElement('small');
      time.textContent = `${item.sender_type === 'admin' ? 'siz' : 'visitor'} · ${formatTime(item.created_at)}`;
      bubble.append(time);
      messages.append(bubble);
    });
    messages.scrollTop = messages.scrollHeight;
  };

  const renderSelectedState = () => {
    if (!current) return;
    selectedId.textContent = current.id.slice(0, 8);
    selectedStatus.textContent = `Holat: ${statusLabel(current.status)}`;
    const isActive = current.status === 'active';
    selected.dataset.status = current.status;
    closeConversationButton.hidden = !isActive;
    form.hidden = !isActive;
    closedNote.hidden = isActive;
    closedNote.textContent = current.status === 'closed'
      ? 'Bu suhbat yopilgan. Foydalanuvchi yangi suhbat boshlashi mumkin.'
      : 'Bu suhbat faol emas.';
  };

  const loadUnreadCount = async () => {
    const { count, error: countError } = await client
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_type', 'visitor')
      .eq('is_read', false);

    if (countError) {
      unread.textContent = '— ta o‘qilmagan';
      setChatError('O‘qilmagan xabarlar sonini yuklab bo‘lmadi. Supabase chat migration’ini tekshiring.');
      return;
    }
    unread.textContent = `${count || 0} ta o‘qilmagan`;
  };

  const markConversationRead = async (conversationId) => {
    const { error: updateError } = await client
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'visitor')
      .eq('is_read', false);

    if (updateError) {
      setChatError('Xabarlarni o‘qilgan deb belgilab bo‘lmadi. Supabase’da supabase/chat-admin-fixes.sql migratsiyasini bajaring.');
      return;
    }
    await loadUnreadCount();
  };

  const loadSelected = async () => {
    if (!current) return;
    const selectedConversationId = current.id;
    const { data, error: queryError } = await client
      .from('chat_messages')
      .select('id, sender_type, body, created_at')
      .eq('conversation_id', selectedConversationId)
      .order('created_at');

    if (queryError) throw queryError;
    renderMessages(data || []);
    renderSelectedState();
    await markConversationRead(selectedConversationId);
  };

  const renderList = () => {
    list.replaceChildren();
    if (!conversations.length) {
      const message = document.createElement('p');
      message.className = 'admin-note';
      message.textContent = 'Hozircha chat xabarlari yo‘q.';
      list.append(message);
      return;
    }

    conversations.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chat-conversation-item${current?.id === item.id ? ' is-selected' : ''}`;
      button.dataset.status = item.status;
      button.dataset.chatAdminConversation = item.id;
      const title = document.createElement('strong');
      title.textContent = `Anonim suhbat · ${statusLabel(item.status)}`;
      const meta = document.createElement('small');
      meta.textContent = `${formatTime(item.updated_at)} · ${item.id.slice(0, 8)}`;
      button.append(title, meta);
      list.append(button);
    });
  };

  const load = async () => {
    const { data, error: queryError } = await client
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    if (queryError) throw queryError;

    const previousId = current?.id;
    conversations = data || [];
    current = previousId ? conversations.find((item) => item.id === previousId) || null : null;
    renderList();

    if (current) {
      selected.hidden = false;
      empty.hidden = true;
      await loadSelected();
    } else {
      if (previousId) {
        selected.hidden = true;
        empty.hidden = false;
        messages.replaceChildren();
      }
      await loadUnreadCount();
    }
  };

  const refreshInbox = async () => {
    try {
      setChatError('');
      await load();
    } catch (loadError) {
      setChatError('Chatlar yoki xabarlarni yuklab bo‘lmadi. Supabase RLS va migration’larini tekshiring.');
      console.error('Chat admin load failed:', loadError);
    }
  };

  const open = async (id) => {
    current = conversations.find((item) => item.id === id) || null;
    if (!current) return;
    setChatError('');
    empty.hidden = true;
    selected.hidden = false;
    renderList();
    renderSelectedState();
    try {
      await loadSelected();
    } catch (loadError) {
      setChatError('Tanlangan suhbat xabarlarini yuklab bo‘lmadi.');
      console.error('Chat message load failed:', loadError);
    }
  };

  const closeConversation = async () => {
    if (!current || current.status !== 'active') return;
    const conversationId = current.id;
    closeConversationButton.disabled = true;
    setChatError('');

    try {
      const { error: updateError } = await client
        .from('chat_conversations')
        .update({ status: 'closed' })
        .eq('id', conversationId)
        .eq('status', 'active');
      if (updateError) throw updateError;
      await refreshInbox();
    } catch (closeError) {
      setChatError('Suhbatni yopib bo‘lmadi. Qayta urinib ko‘ring.');
      console.error('Chat close failed:', closeError);
    } finally {
      closeConversationButton.disabled = false;
    }
  };

  const subscribeInbox = () => {
    if (inboxChannel) void inboxChannel.unsubscribe();
    inboxChannel = client
      .channel('admin-chat-inbox')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
      }, () => {
        void refreshInbox();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, () => {
        void refreshInbox();
      })
      .subscribe((state) => {
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          setChatError('Chat realtime ulanishida xatolik. Sahifani yangilang yoki inbox’ni qayta oching.');
        }
      });
  };

  const init = () => {
    if (initialized) return Promise.resolve();
    const generation = authGeneration;
    if (initPromise && initPromiseGeneration === generation) return initPromise;
    initPromiseGeneration = generation;

    initPromise = (async () => {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user || generation !== authGeneration) return;

      const { data: admin, error: adminError } = await client
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (adminError) throw adminError;
      if (!admin || generation !== authGeneration) return;

      panel.hidden = false;
      initialized = true;
      await refreshInbox();
      if (generation === authGeneration) subscribeInbox();
    })()
      .catch((initError) => {
        if (generation === authGeneration) {
          setChatError('Chat admin bo‘limini ishga tushirib bo‘lmadi.');
          console.error('Chat admin init failed:', initError);
        }
      })
      .finally(() => {
        if (initPromiseGeneration === generation) {
          initPromise = null;
          initPromiseGeneration = null;
        }
      });

    return initPromise;
  };

  const resetForLogout = () => {
    authGeneration += 1;
    initialized = false;
    if (inboxChannel) {
      void inboxChannel.unsubscribe();
      inboxChannel = null;
    }
    conversations = [];
    current = null;
    list.replaceChildren();
    messages.replaceChildren();
    selected.hidden = true;
    empty.hidden = false;
    panel.hidden = true;
    unread.textContent = '0 ta o‘qilmagan';
    setChatError('');
  };

  document.addEventListener('admin:authenticated', () => {
    void init();
  });
  document.addEventListener('admin:unauthenticated', resetForLogout);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const item = target.closest('[data-chat-admin-conversation]');
    if (item) {
      void open(item.dataset.chatAdminConversation);
      return;
    }
    if (target.closest('#chat-admin-close-conversation')) {
      void closeConversation();
      return;
    }
    if (target.closest('#chat-admin-close')) {
      current = null;
      selected.hidden = true;
      empty.hidden = false;
      setChatError('');
      renderList();
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!current || current.status !== 'active') return;
    const body = input.value.trim();
    if (!body) return;

    const conversationId = current.id;
    const button = form.querySelector('button');
    button.disabled = true;
    setChatError('');

    try {
      const { error: insertError } = await client
        .from('chat_messages')
        .insert({ conversation_id: conversationId, sender_type: 'admin', body });
      if (insertError) throw insertError;
      input.value = '';
      await refreshInbox();
    } catch (sendError) {
      setChatError('Reply yuborilmadi. RLS ruxsatlari va internet ulanishini tekshiring.');
      console.error('Chat reply failed:', sendError);
    } finally {
      button.disabled = false;
      if (!form.hidden) input.focus();
    }
  });

  void init();
})();
