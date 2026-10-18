(() => {
  const input = document.getElementById('word-counter-input');
  if (!input) return;

  const wordCountOutput = document.getElementById('word-count');
  const characterCountOutput = document.getElementById('character-count');
  const nonspaceCountOutput = document.getElementById('nonspace-count');
  const lineCountOutput = document.getElementById('line-count');
  const readingTimeOutput = document.getElementById('reading-time');
  const limitType = document.getElementById('word-limit-type');
  const limitValue = document.getElementById('word-limit-value');
  const meter = document.getElementById('word-limit-meter');
  const progress = document.getElementById('word-limit-progress');
  const limitStatus = document.getElementById('word-limit-status');
  const clearButton = document.getElementById('clear-word-counter');
  const numberFormat = new Intl.NumberFormat('uz-UZ');
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('uz', { granularity: 'grapheme' })
    : null;
  const unitLabels = {
    characters: 'belgi',
    nonspace: 'bo‘shliqsiz belgi',
    words: 'so‘z',
  };

  const getCharacters = (text) => segmenter
    ? Array.from(segmenter.segment(text), (part) => part.segment)
    : Array.from(text);

  const render = () => {
    const text = input.value;
    const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
    const characters = getCharacters(text);
    const nonspaceCharacters = characters.reduce((count, character) => count + (/\s/u.test(character) ? 0 : 1), 0);
    const lines = text.length ? text.split(/\r\n|\r|\n/).length : 0;

    wordCountOutput.textContent = numberFormat.format(words);
    characterCountOutput.textContent = numberFormat.format(characters.length);
    nonspaceCountOutput.textContent = numberFormat.format(nonspaceCharacters);
    lineCountOutput.textContent = numberFormat.format(lines);
    readingTimeOutput.textContent = words === 0
      ? '0 daqiqa'
      : words < 200
        ? '1 daqiqadan kam'
        : `${numberFormat.format(Math.ceil(words / 200))} daqiqa`;

    const selectedUnit = limitType.value;
    const countByUnit = { characters: characters.length, nonspace: nonspaceCharacters, words };
    const currentCount = countByUnit[selectedUnit] ?? characters.length;
    const unitLabel = unitLabels[selectedUnit] ?? 'belgi';
    const limit = Number.parseInt(limitValue.value, 10);
    const validLimit = Number.isFinite(limit) && limit > 0;

    meter.classList.remove('is-near', 'is-over');
    limitStatus.classList.remove('is-near', 'is-over', 'is-invalid');
    progress.style.width = '0%';

    if (!validLimit) {
      meter.setAttribute('aria-valuemax', '1');
      meter.setAttribute('aria-valuenow', '0');
      meter.setAttribute('aria-valuetext', 'Limit kamida 1 bo‘lishi kerak');
      limitStatus.classList.add('is-invalid');
      limitStatus.textContent = 'Limit miqdori kamida 1 bo‘lishi kerak.';
      return;
    }

    const ratio = currentCount / limit;
    const percentage = Math.round(ratio * 100);
    meter.setAttribute('aria-valuemax', String(limit));
    meter.setAttribute('aria-valuenow', String(Math.min(currentCount, limit)));
    meter.setAttribute('aria-valuetext', `${numberFormat.format(currentCount)} / ${numberFormat.format(limit)} ${unitLabel}`);
    progress.style.width = `${Math.min(ratio * 100, 100)}%`;

    if (ratio >= 1) {
      meter.classList.add('is-over');
      limitStatus.classList.add('is-over');
      limitStatus.textContent = ratio === 1
        ? `Belgilangan limit to‘ldi (${percentage}%).`
        : `Limitdan ${numberFormat.format(currentCount - limit)} ${unitLabel} oshdi (${percentage}%).`;
    } else if (ratio >= 0.8) {
      meter.classList.add('is-near');
      limitStatus.classList.add('is-near');
      limitStatus.textContent = `Limitga yaqinlashyapsiz: ${percentage}% ishlatildi, yana ${numberFormat.format(limit - currentCount)} ${unitLabel} qoldi.`;
    } else {
      limitStatus.textContent = `${numberFormat.format(currentCount)} / ${numberFormat.format(limit)} ${unitLabel} (${percentage}%).`;
    }
  };

  input.addEventListener('input', render);
  limitType.addEventListener('change', render);
  limitValue.addEventListener('input', render);
  clearButton.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
  });

  render();
})();
