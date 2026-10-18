(() => {
  const source = document.getElementById('markdown-source');
  const preview = document.getElementById('markdown-preview');
  const filenameInput = document.getElementById('markdown-filename');
  const clearButton = document.getElementById('clear-markdown');
  const downloadButton = document.getElementById('download-markdown');
  const status = document.getElementById('markdown-status');
  if (!source || !preview) return;

  const showEmptyPreview = () => {
    const message = document.createElement('p');
    message.className = 'markdown-empty';
    message.textContent = 'Markdown yozishni boshlang — natija shu yerda ko‘rinadi.';
    preview.replaceChildren(message);
  };

  const render = () => {
    const markdown = source.value;
    const hasContent = markdown.length > 0;
    clearButton.disabled = !hasContent;
    downloadButton.disabled = !hasContent;
    status.textContent = '';

    if (!hasContent) {
      showEmptyPreview();
      return;
    }

    if (!window.marked || typeof window.marked.parse !== 'function' || !window.DOMPurify || typeof window.DOMPurify.sanitize !== 'function') {
      preview.textContent = 'Preview kutubxonalari yuklanmadi. Sahifani qayta yuklab ko‘ring.';
      status.textContent = 'Markdown preview hozircha mavjud emas.';
      return;
    }

    try {
      const rendered = window.marked.parse(markdown, { gfm: true, breaks: false });
      const safeHtml = window.DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } });
      preview.innerHTML = safeHtml;
      preview.querySelectorAll('a[href]').forEach((link) => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
    } catch (error) {
      preview.textContent = 'Markdown previewni yaratishda xatolik yuz berdi.';
      status.textContent = 'Matnni tekshirib, qayta urinib ko‘ring.';
    }
  };

  const safeBaseFilename = () => {
    const rawName = filenameInput.value.trim().replace(/(?:\.md)+$/i, '');
    const safeName = rawName
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/^\.+|\.+$/g, '');
    return safeName || 'hujjat';
  };

  source.addEventListener('input', render);
  clearButton.addEventListener('click', () => {
    source.value = '';
    render();
    status.textContent = 'Matn tozalandi.';
    source.focus();
  });
  downloadButton.addEventListener('click', () => {
    if (!source.value.length) return;
    const filename = `${safeBaseFilename()}.md`;
    const blob = new Blob([source.value], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    status.textContent = `${filename} fayli yuklab olindi.`;
  });

  showEmptyPreview();
  render();
})();
