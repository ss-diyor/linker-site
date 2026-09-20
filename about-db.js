(() => {
  const page = document.querySelector('.minimal-about-page');
  if (!page || !window.supabaseConfig || !window.supabase) return;
  const db = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const lines = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
  const render = async () => {
    const { data, error } = await db.from('about_content').select('*').eq('id', 'default').maybeSingle();
    if (error || !data) return;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || ''; };
    set('about-bio', data.bio_intro);
    set('about-goal', data.bio_goal);
    set('about-tech', data.bio_tech);
    const facts = document.getElementById('about-facts');
    if (facts) facts.innerHTML = lines(data.education_facts).map((item) => `<div class="about-fact"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join('');
    const skills = document.getElementById('about-skills');
    if (skills) skills.innerHTML = `<div><span>hard skills</span><p>${lines(data.hard_skills).map(esc).join(' · ')}</p></div><div><span>soft skills</span><p>${lines(data.soft_skills).map(esc).join(' · ')}</p></div>`;
    const languages = document.getElementById('about-languages');
    if (languages) languages.innerHTML = lines(data.languages).map((item) => `<div class="about-fact"><span>${esc(item.name)}</span><strong>${esc(item.level)}</strong></div>`).join('');
    const interests = document.getElementById('about-interests');
    if (interests) interests.innerHTML = lines(data.interests).map((item) => `<span>${esc(item)}</span>`).join('');
    set('about-quote', data.quote);
    page.querySelector('.about-copy')?.removeAttribute('hidden');
  };
  render();
})();
