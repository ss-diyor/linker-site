(() => {
  const config = window.supabaseConfig;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.publishableKey);
  const start = document.getElementById('chat-start');
  const thread = document.getElementById('chat-thread');
  const startButton = document.getElementById('chat-start-button');
  const messages = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const error = document.getElementById('chat-error');
  const status = document.getElementById('chat-status');
  let conversation = null;
  let channel = null;
  const setError = (text = '') => { error.textContent = text; error.hidden = !text; };
  const formatTime = (value) => new Intl.DateTimeFormat('uz-UZ', { dateStyle:'short', timeStyle:'short' }).format(new Date(value));
  const renderMessages = (items) => {
    messages.replaceChildren();
    if (!items.length) { const empty = document.createElement('p'); empty.className = 'chat-empty'; empty.textContent = 'Birinchi xabarni siz yozing.'; messages.append(empty); return; }
    items.forEach((item) => { const bubble = document.createElement('article'); bubble.className = `chat-bubble ${item.sender_type}`; bubble.textContent = item.body; const time = document.createElement('small'); time.textContent = `${item.sender_type === 'admin' ? 'Diyorbek' : 'siz'} · ${formatTime(item.created_at)}`; bubble.append(time); messages.append(bubble); });
    messages.scrollTop = messages.scrollHeight;
  };
  const loadMessages = async () => { if (!conversation) return; const { data, error: queryError } = await client.from('chat_messages').select('id, sender_type, body, created_at').eq('conversation_id', conversation.id).order('created_at'); if (queryError) return setError('Xabarlarni yuklab bo‘lmadi.'); renderMessages(data || []); };
  const subscribe = () => { channel?.unsubscribe(); channel = client.channel(`visitor-chat-${conversation.id}`).on('postgres_changes', { event:'*', schema:'public', table:'chat_messages', filter:`conversation_id=eq.${conversation.id}` }, loadMessages).subscribe(); };
  const openChat = async () => {
    setError(''); startButton.disabled = true; startButton.textContent = 'ochilmoqda…';
    try {
      let { data: { session }, error: authError } = await client.auth.getSession();
      if (authError) throw authError;
      if (!session) { const result = await client.auth.signInAnonymously(); if (result.error) throw result.error; session = result.data.session; }
      const existing = await client.from('chat_conversations').select('*').eq('visitor_id', session.user.id).in('status', ['active','closed']).order('updated_at', { ascending:false }).limit(1).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) conversation = existing.data;
      else { const created = await client.from('chat_conversations').insert({ visitor_id:session.user.id }).select().single(); if (created.error) throw created.error; conversation = created.data; }
      start.hidden = true; thread.hidden = false; status.textContent = conversation.status; await loadMessages(); subscribe(); input.focus();
    } catch (chatError) { setError(chatError.message?.includes('Anonymous') ? 'Anonim kirish Supabase Auth’da yoqilmagan.' : 'Chatni ochib bo‘lmadi. Keyinroq qayta urinib ko‘ring.'); startButton.disabled = false; startButton.textContent = 'Start ↗'; }
  };
  startButton?.addEventListener('click', openChat);
  form?.addEventListener('submit', async (event) => { event.preventDefault(); const body = input.value.trim(); if (!body || !conversation || conversation.status !== 'active') return; const button = form.querySelector('button'); button.disabled = true; setError(''); const result = await client.from('chat_messages').insert({ conversation_id:conversation.id, sender_type:'visitor', body }).select().single(); if (result.error) setError(result.error.message.includes('row-level') ? 'Xabar yuborish chekloviga yetdingiz. Bir ozdan keyin urinib ko‘ring.' : 'Xabar yuborilmadi.'); else { input.value = ''; await loadMessages(); } button.disabled = false; input.focus(); });
})();
