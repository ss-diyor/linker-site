(() => {
  const source = document.getElementById('markdown-source');
  const preview = document.getElementById('markdown-preview');
  const filenameInput = document.getElementById('markdown-filename');
  const clearButton = document.getElementById('clear-markdown');
  const downloadButton = document.getElementById('download-markdown');
  const status = document.getElementById('markdown-status');
  const toolbar = document.getElementById('markdown-format-toolbar');
  const fileInput = document.getElementById('markdown-open-file');
  if (!source || !preview) return;

  let savedSelection = { start: 0, end: 0, direction: 'none' };
  let history = [];
  let historyIndex = -1;
  let historyTimer = null;

  const getSelection = () => {
    if (document.activeElement === source) {
      savedSelection = {
        start: source.selectionStart,
        end: source.selectionEnd,
        direction: source.selectionDirection || 'none'
      };
    }
    const start = Math.min(savedSelection.start, source.value.length);
    const end = Math.min(Math.max(savedSelection.end, start), source.value.length);
    return { start, end, direction: savedSelection.direction };
  };

  const rememberSelection = () => {
    if (document.activeElement !== source) return;
    savedSelection = {
      start: source.selectionStart,
      end: source.selectionEnd,
      direction: source.selectionDirection || 'none'
    };
  };

  const updateHistoryButtons = () => {
    const undoButton = toolbar?.querySelector('[data-md-action="undo"]');
    const redoButton = toolbar?.querySelector('[data-md-action="redo"]');
    if (undoButton) undoButton.disabled = historyIndex <= 0;
    if (redoButton) redoButton.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  };

  const captureState = () => ({
    value: source.value,
    selectionStart: source.selectionStart,
    selectionEnd: source.selectionEnd,
    selectionDirection: source.selectionDirection || 'none'
  });

  const saveHistory = () => {
    const state = captureState();
    const current = history[historyIndex];
    if (current?.value === state.value) {
      history[historyIndex] = state;
      updateHistoryButtons();
      return;
    }
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    if (history.length > 100) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  };

  const flushHistory = () => {
    if (historyTimer !== null) {
      window.clearTimeout(historyTimer);
      historyTimer = null;
    }
    saveHistory();
  };

  const queueHistory = () => {
    if (historyTimer !== null) window.clearTimeout(historyTimer);
    historyTimer = window.setTimeout(() => {
      historyTimer = null;
      saveHistory();
    }, 300);
  };

  const render = () => {
    const markdown = source.value;
    const hasContent = markdown.length > 0;
    if (clearButton) clearButton.disabled = !hasContent;
    if (downloadButton) downloadButton.disabled = !hasContent;
    if (status) status.textContent = '';

    if (!hasContent) {
      const message = document.createElement('p');
      message.className = 'markdown-empty';
      message.textContent = 'Markdown yozishni boshlang — natija shu yerda ko‘rinadi.';
      preview.replaceChildren(message);
      return;
    }

    if (!window.marked || typeof window.marked.parse !== 'function' || !window.DOMPurify || typeof window.DOMPurify.sanitize !== 'function') {
      preview.textContent = 'Preview kutubxonalari yuklanmadi. Sahifani qayta yuklab ko‘ring.';
      if (status) status.textContent = 'Markdown preview hozircha mavjud emas.';
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
      if (status) status.textContent = 'Matnni tekshirib, qayta urinib ko‘ring.';
    }
  };

  const setEditorValue = (value, selectionStart, selectionEnd, message) => {
    if (historyTimer !== null) {
      window.clearTimeout(historyTimer);
      historyTimer = null;
    }
    source.value = value;
    source.focus();
    source.setSelectionRange(selectionStart, selectionEnd);
    rememberSelection();
    render();
    saveHistory();
    if (status && message) status.textContent = message;
  };

  const restoreHistory = (nextIndex, message) => {
    if (historyTimer !== null) {
      window.clearTimeout(historyTimer);
      historyTimer = null;
    }
    historyIndex = nextIndex;
    const state = history[historyIndex];
    source.value = state.value;
    source.focus();
    source.setSelectionRange(state.selectionStart, state.selectionEnd, state.selectionDirection);
    rememberSelection();
    render();
    updateHistoryButtons();
    if (status) status.textContent = message;
  };

  const undo = () => {
    flushHistory();
    if (historyIndex > 0) restoreHistory(historyIndex - 1, 'Oxirgi amal bekor qilindi.');
  };

  const redo = () => {
    flushHistory();
    if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1, 'Amal qayta bajarildi.');
  };

  const replaceSelection = (replacement, innerStart, innerEnd, message) => {
    const { start, end } = getSelection();
    const value = source.value.slice(0, start) + replacement + source.value.slice(end);
    setEditorValue(value, start + innerStart, start + innerEnd, message);
  };

  const wrapSelection = (before, after, placeholder, label) => {
    const { start, end } = getSelection();
    const value = source.value;
    const selected = value.slice(start, end);
    const left = value.slice(0, start);
    const right = value.slice(end);

    const marker = before.length === after.length && /^[*_~`]+$/.test(before) ? before[0] : '';
    const markerRunLength = (text) => marker ? (text.match(new RegExp(`${marker === '*' ? '\\*' : marker === '_' ? '_' : marker}+$`))?.[0].length || 0) : 0;
    const leftMarkerRun = markerRunLength(left);
    const rightMarkerRun = markerRunLength(right);
    const nestedEmphasisRun = (marker === '*' || marker === '_') && leftMarkerRun >= 3 && leftMarkerRun % 2 === 1;
    const isWrapped = marker
      ? leftMarkerRun === rightMarkerRun && (leftMarkerRun === before.length || nestedEmphasisRun)
      : left.endsWith(before) && right.startsWith(after);

    if (selected && isWrapped) {
      const unwrapped = left.slice(0, -before.length) + selected + right.slice(after.length);
      const selectionStart = start - before.length;
      setEditorValue(unwrapped, selectionStart, selectionStart + selected.length, `${label} formati olib tashlandi.`);
      return;
    }

    const text = selected || placeholder;
    const replacement = `${before}${text}${after}`;
    replaceSelection(replacement, before.length, before.length + text.length, `${label} formati qo‘llandi.`);
  };

  const prefixPatterns = {
    heading: /^#{1,6}\s+/,
    ul: /^\s*[-*+]\s+/,
    ol: /^\s*\d+\.\s+/,
    task: /^\s*[-*+]\s+\[[ xX]\]\s+/,
    quote: /^\s*>\s?/
  };

  const prefixText = {
    heading: '## ',
    ul: '- ',
    task: '- [ ] ',
    quote: '> '
  };

  const applyLineFormat = (action) => {
    const value = source.value;
    const { start, end } = getSelection();
    const blockStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    let blockEnd = value.indexOf('\n', end);
    if (blockEnd < 0) blockEnd = value.length;
    const original = value.slice(blockStart, blockEnd);
    const emptyLine = original.length === 0;
    const content = emptyLine
      ? (action === 'heading' ? 'Sarlavha' : action === 'quote' ? 'Iqtibos' : 'Ro‘yxat bandi')
      : original;
    const lines = content.split('\n');
    const pattern = prefixPatterns[action];
    const removePrefix = lines.every((line) => pattern.test(line));
    const transformed = lines.map((line, index) => {
      if (removePrefix) return line.replace(pattern, '');
      if (action === 'ol') return `${line.match(/^\s*/)?.[0] || ''}${index + 1}. ${line.trimStart()}`;
      return `${prefixText[action]}${line}`;
    }).join('\n');
    const nextValue = value.slice(0, blockStart) + transformed + value.slice(blockEnd);
    const selectionStart = blockStart;
    const selectionEnd = blockStart + transformed.length;
    const label = action === 'heading' ? 'Sarlavha' : action === 'ul' || action === 'ol' || action === 'task' ? 'Ro‘yxat' : 'Iqtibos';
    setEditorValue(nextValue, selectionStart, selectionEnd, `${label} formati qo‘llandi.`);
  };

  const insertBlock = (block, selectedStart = 0, selectedEnd = 0, message = 'Blok qo‘shildi.') => {
    const { start, end } = getSelection();
    const value = source.value;
    const before = start > 0 && value[start - 1] !== '\n' ? '\n\n' : '';
    const after = end < value.length && value[end] !== '\n' ? '\n\n' : (end < value.length ? '\n' : '');
    const replacement = before + block + after;
    replaceSelection(replacement, before.length + selectedStart, before.length + selectedEnd, message);
  };

  const safeBaseFilename = () => {
    const rawName = filenameInput?.value.trim().replace(/(?:\.md)+$/i, '') || '';
    const safeName = rawName
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/^\.+|\.+$/g, '');
    return safeName || 'hujjat';
  };

  const handleAction = (action) => {
    switch (action) {
      case 'open':
        fileInput?.click();
        break;
      case 'undo':
        undo();
        break;
      case 'redo':
        redo();
        break;
      case 'heading':
      case 'ul':
      case 'ol':
      case 'task':
      case 'quote':
        applyLineFormat(action);
        break;
      case 'bold':
        wrapSelection('**', '**', 'qalin matn', 'Qalin');
        break;
      case 'italic':
        wrapSelection('*', '*', 'kursiv matn', 'Kursiv');
        break;
      case 'underline':
        wrapSelection('<u>', '</u>', 'tagi chizilgan matn', 'Tagiga chizish');
        break;
      case 'strike':
        wrapSelection('~~', '~~', 'ustidan chizilgan matn', 'Ustidan chizish');
        break;
      case 'inline-code':
        wrapSelection('`', '`', 'kod', 'Qator ichidagi kod');
        break;
      case 'code-block':
        wrapSelection('```\n', '\n```', 'kod bu yerda', 'Kod bloki');
        break;
      case 'link': {
        const { start, end } = getSelection();
        const selected = source.value.slice(start, end);
        const url = window.prompt('Havola manzilini kiriting:', 'https://');
        if (url === null || !url.trim()) return;
        const label = selected || 'havola matni';
        const text = `[${label}](${url.trim()})`;
        replaceSelection(text, 1, 1 + label.length, 'Havola qo‘shildi.');
        break;
      }
      case 'image': {
        const { start, end } = getSelection();
        const selected = source.value.slice(start, end).replace(/\s+/g, ' ').trim();
        const url = window.prompt('Rasm manzilini kiriting:', 'https://');
        if (url === null || !url.trim()) return;
        const alt = selected || 'Rasm tavsifi';
        const text = `![${alt}](${url.trim()})`;
        replaceSelection(text, 2, 2 + alt.length, 'Rasm Markdown sintaksisida qo‘shildi.');
        break;
      }
      case 'table':
        insertBlock('| Sarlavha 1 | Sarlavha 2 |\n| --- | --- |\n| Qiymat | Qiymat |', 2, 12, 'Jadval shabloni qo‘shildi.');
        break;
      case 'rule':
        insertBlock('---', 0, 3, 'Ajratuvchi chiziq qo‘shildi.');
        break;
      default:
        break;
    }
  };

  source.addEventListener('input', () => {
    rememberSelection();
    render();
    queueHistory();
  });
  ['select', 'keyup', 'mouseup', 'focus'].forEach((eventName) => source.addEventListener(eventName, rememberSelection));
  source.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const shortcuts = { b: 'bold', i: 'italic', u: 'underline' };
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (key === 'y') {
      event.preventDefault();
      redo();
      return;
    }
    if (shortcuts[key]) {
      event.preventDefault();
      handleAction(shortcuts[key]);
    }
  });

  if (toolbar) {
    toolbar.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) event.preventDefault();
    });
    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-md-action]');
      if (!button || button.disabled) return;
      handleAction(button.dataset.mdAction);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        history = [];
        historyIndex = -1;
        setEditorValue(text, 0, 0, `${file.name} fayli ochildi.`);
      } catch (error) {
        if (status) status.textContent = 'Faylni ochishda xatolik yuz berdi.';
      } finally {
        fileInput.value = '';
      }
    });
  }

  clearButton?.addEventListener('click', () => {
    setEditorValue('', 0, 0, 'Matn tozalandi.');
  });

  downloadButton?.addEventListener('click', () => {
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
    if (status) status.textContent = `${filename} fayli yuklab olindi.`;
  });

  history.push(captureState());
  historyIndex = 0;
  updateHistoryButtons();
  render();
})();
