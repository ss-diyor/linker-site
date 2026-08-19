(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          instance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  }

  document.querySelectorAll('.project-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.project-item');
      const body = document.getElementById(button.getAttribute('aria-controls'));
      const opening = button.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll('.project-item.open').forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          const openButton = openItem.querySelector('.project-trigger');
          const openBody = document.getElementById(openButton.getAttribute('aria-controls'));
          openButton.setAttribute('aria-expanded', 'false');
          openBody.hidden = true;
        }
      });
      button.setAttribute('aria-expanded', String(opening));
      item.classList.toggle('open', opening);
      body.hidden = !opening;
    });
  });
})();
