(() => {
  const page = document.querySelector('.minimal-about-page');
  if (!page) return;

  const content = page.querySelector('.about-copy');
  const loading = page.querySelector('#about-content-loading');
  if (!content) return;

  const revealContent = () => {
    if (loading) loading.hidden = true;
    content.hidden = false;
  };
  const esc = (value = '') => String(value).replace(/[&<>\'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const lines = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
  const capitalizeFirst = (value = '') => {
    const text = String(value ?? '');
    return text ? text.charAt(0).toLocaleUpperCase('uz-UZ') + text.slice(1) : '';
  };
  const colorIsValid = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value);
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value == null ? '' : String(value);
  };

  const render = async () => {
    try {
      if (!window.supabaseConfig || !window.supabase) return;

      const db = window.supabase.createClient(window.supabaseConfig.url, window.supabaseConfig.publishableKey);
      const { data, error } = await db.from('about_content').select('*').eq('id', 'default').maybeSingle();
      if (error || !data) {
        if (error) console.error('About content could not be loaded:', error);
        return;
      }

      const factsHtml = lines(data.education_facts)
        .filter((item) => item && typeof item === 'object')
        .map((item) => `<div class="about-fact"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`)
        .join('');
      const skillsHtml = `<div><span>hard skills</span><p>${lines(data.hard_skills).map(esc).join(' · ')}</p></div><div><span>soft skills</span><p>${lines(data.soft_skills).map(esc).join(' · ')}</p></div>`;
      const languagesHtml = lines(data.languages)
        .filter((item) => item && typeof item === 'object')
        .map((item) => `<div class="about-fact"><span>${esc(capitalizeFirst(item.name))}</span><strong>${esc(item.level)}</strong></div>`)
        .join('');
      const interestsHtml = lines(data.interests).map((item) => {
        const name = typeof item === 'string' ? item : item && typeof item === 'object' ? item.name : '';
        if (!name) return '';
        const color = item && typeof item === 'object' && colorIsValid(item.color) ? item.color : '';
        return `<span class="about-interest-tag"${color ? ` style="--interest-color:${color}"` : ''}>${esc(name)}</span>`;
      }).join('');
      const quoteColor = colorIsValid(data.quote_color) ? data.quote_color : 'var(--accent)';

      setText('about-bio', data.bio_intro);
      setText('about-goal', data.bio_goal);
      setText('about-tech', data.bio_tech);

      const facts = document.getElementById('about-facts');
      if (facts) facts.innerHTML = factsHtml;
      const skills = document.getElementById('about-skills');
      if (skills) skills.innerHTML = skillsHtml;
      const languages = document.getElementById('about-languages');
      if (languages) languages.innerHTML = languagesHtml;
      const interests = document.getElementById('about-interests');
      if (interests) interests.innerHTML = interestsHtml;

      const quote = document.getElementById('about-quote');
      if (quote) {
        quote.textContent = data.quote || '';
        quote.style.setProperty('--quote-line-color', quoteColor);
      }
    } catch (error) {
      console.error('About content could not be loaded:', error);
    } finally {
      revealContent();
    }
  };

  render();
})();
