(() => {
  const page = document.querySelector('.minimal-about-page');
  if (!page) return;

  const content = page.querySelector('.about-copy');
  const loading = page.querySelector('#about-content-loading');
  const interestsList = page.querySelector('#about-interests');
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
  const secureImageUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : '';
    } catch {
      return '';
    }
  };
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value == null ? '' : String(value);
  };

  const setInterestPreviewOpen = (trigger, open) => {
    if (!trigger) return;
    const item = trigger.closest('.about-interest-item');
    const preview = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.setAttribute('aria-expanded', String(open));
    if (preview) preview.setAttribute('aria-hidden', String(!open));
    if (item) item.classList.toggle('is-open', open);
  };

  const renderInterests = (items) => {
    if (!interestsList) return;
    interestsList.innerHTML = lines(items).map((item, index) => {
      const name = typeof item === 'string' ? item : item && typeof item === 'object' ? item.name : '';
      if (!name) return '';
      const color = item && typeof item === 'object' && colorIsValid(item.color) ? item.color : '';
      const imageUrl = item && typeof item === 'object' ? secureImageUrl(item.image_url) : '';
      const previewId = `about-interest-preview-${index + 1}`;
      const initial = Array.from(String(name))[0] || '?';
      const colorStyle = color ? ` style="--interest-color:${color}"` : '';
      const artClass = imageUrl ? 'about-interest-preview-art has-image' : 'about-interest-preview-art';
      const imageHtml = imageUrl ? `<img class="about-interest-preview-image" src="${esc(imageUrl)}" alt="" loading="lazy" decoding="async">` : '';
      return `<span class="about-interest-item"${colorStyle}>
        <button class="about-interest-tag" type="button" aria-expanded="false" aria-controls="${previewId}" aria-describedby="${previewId}">${esc(name)}</button>
        <span class="about-interest-preview" id="${previewId}" role="tooltip" aria-hidden="true">
          <span class="${artClass}" aria-hidden="true">${imageHtml}<span class="about-interest-preview-initial"${imageUrl ? ' hidden' : ''}>${esc(initial)}</span><span class="about-interest-preview-index">DI · ${String(index + 1).padStart(2, '0')}</span></span>
          <span class="about-interest-preview-copy"><span class="about-interest-preview-label">qiziqish</span><strong>${esc(name)}</strong></span>
        </span>
      </span>`;
    }).join('');
  };

  const bindInterestPreviews = () => {
    if (!interestsList || interestsList.dataset.previewBound) return;
    interestsList.dataset.previewBound = 'true';
    let touchPointerTrigger = null;

    const closeAll = (except = null) => {
      interestsList.querySelectorAll('.about-interest-tag[aria-expanded="true"]').forEach((trigger) => {
        if (trigger !== except) setInterestPreviewOpen(trigger, false);
      });
    };

    interestsList.addEventListener('pointerdown', (event) => {
      touchPointerTrigger = event.pointerType === 'touch' ? event.target.closest('.about-interest-tag') : null;
    });

    interestsList.addEventListener('pointerover', (event) => {
      if (event.pointerType === 'touch') return;
      const trigger = event.target.closest('.about-interest-tag');
      if (!trigger || !interestsList.contains(trigger)) return;
      const item = trigger.closest('.about-interest-item');
      if (item && item.contains(event.relatedTarget)) return;
      closeAll(trigger);
      setInterestPreviewOpen(trigger, true);
    });

    interestsList.addEventListener('pointerout', (event) => {
      if (event.pointerType === 'touch') return;
      const trigger = event.target.closest('.about-interest-tag');
      if (!trigger || !interestsList.contains(trigger)) return;
      const item = trigger.closest('.about-interest-item');
      if (item && item.contains(event.relatedTarget)) return;
      if (item && item.matches(':focus-within')) return;
      setInterestPreviewOpen(trigger, false);
    });

    interestsList.addEventListener('focusin', (event) => {
      const trigger = event.target.closest('.about-interest-tag');
      if (!trigger || !interestsList.contains(trigger)) return;
      if (touchPointerTrigger === trigger) return;
      closeAll(trigger);
      setInterestPreviewOpen(trigger, true);
    });

    interestsList.addEventListener('focusout', (event) => {
      const trigger = event.target.closest('.about-interest-tag');
      if (!trigger || !interestsList.contains(trigger)) return;
      const item = trigger.closest('.about-interest-item');
      if (!item || !item.contains(event.relatedTarget)) setInterestPreviewOpen(trigger, false);
    });

    interestsList.addEventListener('click', (event) => {
      const trigger = event.target.closest('.about-interest-tag');
      if (!trigger || !interestsList.contains(trigger) || !window.matchMedia('(hover: none)').matches) return;
      const isTouchTap = touchPointerTrigger === trigger;
      const shouldOpen = isTouchTap ? trigger.getAttribute('aria-expanded') !== 'true' : true;
      touchPointerTrigger = null;
      closeAll(trigger);
      setInterestPreviewOpen(trigger, shouldOpen);
    });

    interestsList.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeAll();
      event.stopPropagation();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!interestsList.contains(event.target)) closeAll();
    });

    interestsList.addEventListener('error', (event) => {
      const image = event.target;
      if (!image.matches || !image.matches('.about-interest-preview-image')) return;
      image.hidden = true;
      const fallback = image.parentElement.querySelector('.about-interest-preview-initial');
      if (fallback) fallback.hidden = false;
    }, true);
  };

  if (interestsList) {
    const fallbackInterests = Array.from(interestsList.children).map((element) => element.textContent.trim()).filter(Boolean);
    bindInterestPreviews();
    renderInterests(fallbackInterests);
  }

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
      renderInterests(data.interests);

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
