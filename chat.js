(() => {
  const config = window.supabaseConfig;
  const start = document.getElementById('chat-start');
  const thread = document.getElementById('chat-thread');
  const startButton = document.getElementById('chat-start-button');
  const messages = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const error = document.getElementById('chat-error');
  const turnstileBox = document.getElementById('chat-turnstile');
  const greeting = document.getElementById('chat-start-greeting');

  const setError = (text = '') => {
    if (!error) return;
    error.textContent = text;
    error.hidden = !text;
  };

  if (!config || !window.supabase) {
    setError('Chat hozircha yuklanmadi. Sahifani yangilab ko‘ring.');
    if (startButton) startButton.disabled = true;
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  const turnstileSiteKey = '0x4AAAAAAFuyXzBFPW9rCtNg';
  const initialGreeting = 'Assalomu alaykum.';
  let conversation = null;
  let channel = null;
  let turnstileWidget = null;
  let hasRenderedMessages = false;

  const resizeInput = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  };

  input?.addEventListener('input', resizeInput);

  const formatTime = (value) => new Intl.DateTimeFormat('uz-UZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

  const renderMessages = (items) => {
    const existingIds = new Set(
      [...messages.querySelectorAll('[data-chat-message-id]')].map((bubble) => bubble.dataset.chatMessageId)
    );
    messages.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'chat-empty';
      empty.textContent = 'Birinchi xabarni siz yozing.';
      messages.append(empty);
      hasRenderedMessages = true;
      return;
    }

    items.forEach((item) => {
      const bubble = document.createElement('article');
      bubble.className = `chat-bubble ${item.sender_type}`;
      bubble.dataset.chatMessageId = item.id;
      if (hasRenderedMessages && !existingIds.has(String(item.id))) {
        bubble.classList.add('chat-message-enter');
      }
      bubble.textContent = item.body;
      const time = document.createElement('small');
      time.textContent = `${item.sender_type === 'admin' ? 'Diyorbek' : 'siz'} · ${formatTime(item.created_at)}`;
      bubble.append(time);
      messages.append(bubble);
    });
    hasRenderedMessages = true;
    messages.scrollTop = messages.scrollHeight;
  };

  const loadMessages = async () => {
    if (!conversation) return;
    const { data, error: queryError } = await client
      .from('chat_messages')
      .select('id, sender_type, body, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at');

    if (queryError) {
      setError('Xabarlarni yuklab bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.');
      return;
    }
    setError('');
    renderMessages(data || []);
  };

  const returnToStartAfterClosure = () => {
    if (channel) {
      void channel.unsubscribe();
      channel = null;
    }
    conversation = null;
    if (input) input.value = '';
    messages.replaceChildren();
    hasRenderedMessages = false;
    resizeInput();
    thread.hidden = true;
    start.hidden = false;
    startButton.disabled = false;
    startButton.textContent = 'Yangi suhbat';
    if (greeting) greeting.textContent = 'Suhbat yopildi. Yangi suhbat boshlashingiz mumkin.';
    setError('');
  };

  const subscribe = () => {
    if (!conversation) return;
    if (channel) void channel.unsubscribe();

    const conversationId = conversation.id;
    channel = client
      .channel(`visitor-chat-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        void loadMessages();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_conversations',
        filter: `id=eq.${conversationId}`,
      }, (payload) => {
        if (!payload.new || payload.new.id !== conversation?.id) return;
        conversation = { ...conversation, ...payload.new };
        if (conversation.status !== 'active') returnToStartAfterClosure();
      })
      .subscribe((state) => {
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          setError('Jonli chat ulanishi uzildi. Sahifani yangilab qayta urinib ko‘ring.');
        }
      });
  };

  const findActiveConversation = (visitorId) => client
    .from('chat_conversations')
    .select('*')
    .eq('visitor_id', visitorId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const showConversation = async (value, focusInput = false) => {
    conversation = value;
    start.hidden = true;
    thread.hidden = false;
    await loadMessages();
    subscribe();
    if (focusInput) input.focus();
  };

  const getCaptchaToken = () => new Promise((resolve, reject) => {
    if (!window.turnstile || !turnstileBox) {
      reject(new Error('Turnstile yuklanmadi.'));
      return;
    }

    turnstileBox.hidden = false;
    if (turnstileWidget !== null) {
      try {
        window.turnstile.remove(turnstileWidget);
      } catch {}
      turnstileWidget = null;
      turnstileBox.replaceChildren();
    }

    try {
      turnstileWidget = window.turnstile.render(turnstileBox, {
        sitekey: turnstileSiteKey,
        theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
        callback: resolve,
        'expired-callback': () => reject(new Error('Captcha muddati tugadi.')),
        'error-callback': () => reject(new Error('Captcha tekshiruvi muvaffaqiyatsiz tugadi.')),
      });
    } catch (captchaError) {
      reject(captchaError);
    }
  });

  const openChat = async () => {
    setError('');
    if (greeting) greeting.textContent = initialGreeting;
    startButton.disabled = true;
    startButton.textContent = 'tekshirilmoqda…';

    try {
      let { data: { session }, error: authError } = await client.auth.getSession();
      if (authError) throw authError;

      if (!session) {
        const captchaToken = await getCaptchaToken();
        const result = await client.auth.signInAnonymously({ options: { captchaToken } });
        if (result.error) throw result.error;
        session = result.data.session;
      }

      if (turnstileBox) turnstileBox.hidden = true;
      const existing = await findActiveConversation(session.user.id);
      if (existing.error) throw existing.error;

      if (existing.data) {
        conversation = existing.data;
      } else {
        const created = await client
          .from('chat_conversations')
          .insert({ visitor_id: session.user.id })
          .select()
          .single();
        if (created.error) throw created.error;
        conversation = created.data;
      }

      await showConversation(conversation, true);
    } catch (chatError) {
      const message = chatError.message || '';
      setError(message.includes('Anonymous')
        ? 'Anonim kirish Supabase Auth’da yoqilmagan.'
        : message.includes('Turnstile') || message.includes('Captcha')
          ? 'Captcha tekshiruvidan o‘tib bo‘lmadi. Qayta urinib ko‘ring.'
          : 'Chatni ochib bo‘lmadi. Keyinroq qayta urinib ko‘ring.');
      startButton.disabled = false;
      startButton.textContent = 'Start ↗';
    }
  };

  startButton?.addEventListener('click', openChat);

  const resumeExistingChat = async () => {
    startButton.disabled = true;
    startButton.textContent = 'Suhbat tekshirilmoqda…';

    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        startButton.textContent = 'Start ↗';
        return;
      }

      const existing = await findActiveConversation(session.user.id);
      if (existing.error) throw existing.error;
      if (!existing.data) {
        startButton.textContent = 'Yangi suhbat ↗';
        if (greeting) greeting.textContent = 'Yangi suhbat boshlashingiz mumkin.';
        return;
      }

      await showConversation(existing.data);
    } catch (resumeError) {
      console.error('Chat resume failed:', resumeError);
      setError('Oldingi suhbatni tiklab bo‘lmadi. Start tugmasini bosib qayta urinib ko‘ring.');
      startButton.textContent = 'Qayta urinib ko‘ring ↗';
    } finally {
      startButton.disabled = false;
    }
  };

  void resumeExistingChat();

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = input.value.trim();
    if (!body || !conversation || conversation.status !== 'active') return;

    const conversationId = conversation.id;
    const button = form.querySelector('button');
    button.disabled = true;
    setError('');

    try {
      const result = await client
        .from('chat_messages')
        .insert({ conversation_id: conversationId, sender_type: 'visitor', body });

      if (result.error) {
        if (result.error.code === '42501' || result.error.message?.includes('row-level')) {
          const { data } = await client
            .from('chat_conversations')
            .select('status')
            .eq('id', conversationId)
            .maybeSingle();
          if (data && data.status !== 'active') {
            returnToStartAfterClosure();
            return;
          }
          setError('Xabar yuborish limiti tugadi. Birozdan keyin qayta urinib ko‘ring.');
        } else {
          setError('Xabar yuborilmadi. Ulanishni tekshirib, qayta urinib ko‘ring.');
        }
        return;
      }

      input.value = '';
      resizeInput();
      await loadMessages();
    } catch {
      setError('Xabar yuborilmadi. Ulanishni tekshirib, qayta urinib ko‘ring.');
    } finally {
      button.disabled = false;
      if (!thread.hidden) input.focus();
    }
  });
})();
