(() => {
  const host = document.querySelector('[data-wave-mesh]');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    canvas.remove();
    return;
  }

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerPreference = window.matchMedia('(hover: hover) and (pointer: fine)');
  const coarsePointer = !pointerPreference.matches;
  const cameraHeight = 0.62;
  const near = 0.35;
  const far = 3.4;
  const frameInterval = coarsePointer ? 1000 / 24 : 1000 / 30;
  const rings = [];
  const pointer = { x: 0, z: 1.4, strength: 0, targetX: 0, targetZ: 1.4, targetStrength: 0 };

  let width = 0;
  let height = 0;
  let columns = 0;
  let rows = 0;
  let focalLength = 0;
  let horizon = 0;
  let pixelRatio = 1;
  let animationFrame = 0;
  let lastFrame = 0;
  let pageVisible = !document.hidden;
  let startTime = performance.now();
  let baseDotColor = [133, 139, 173];
  let accentColor = [168, 165, 255];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const cssColor = (token, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
    if (!hex) return fallback;
    const full = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
    return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
  };
  const refreshColors = () => {
    baseDotColor = cssColor('--muted', baseDotColor);
    accentColor = cssColor('--accent', accentColor);
  };

  const resize = () => {
    const nextWidth = host.clientWidth;
    const nextHeight = host.clientHeight;
    if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return false;

    width = nextWidth;
    height = nextHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.35 : 1.6);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    focalLength = Math.max(width, height * 1.2) * 0.55;
    horizon = height * 0.3;
    columns = Math.round(clamp(width / (coarsePointer ? 8.5 : 13), 30, coarsePointer ? 52 : 92));
    rows = Math.round(clamp(height / (coarsePointer ? 23 : 17), 22, 52));
    return true;
  };

  const halfWidthAtFar = () => (width / 2 / focalLength) * far * 1.05;

  const waveHeight = (x, z, time) => {
    let y =
      0.075 * Math.sin(x * 2.2 + time * 0.55) +
      0.06 * Math.sin(z * 2.9 - time * 0.72 + x * 0.8) +
      0.028 * Math.sin((x + z) * 6.1 + time * 1.2);

    if (pointer.strength > 0.01) {
      const distanceSquared = (x - pointer.x) ** 2 + (z - pointer.z) ** 2;
      y += 0.2 * pointer.strength * Math.exp(-distanceSquared / 0.075);
    }

    for (const ring of rings) {
      const age = time - ring.time;
      const distance = Math.hypot(x - ring.x, z - ring.z);
      const front = age * 1.05;
      y += 0.15 * Math.exp(-((distance - front) ** 2) / 0.018) * Math.exp(-age * 0.7);
    }
    return y;
  };

  const draw = (time) => {
    resize();
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    pointer.x += (pointer.targetX - pointer.x) * 0.09;
    pointer.z += (pointer.targetZ - pointer.z) * 0.09;
    pointer.strength += (pointer.targetStrength - pointer.strength) * 0.055;
    while (rings.length && time - rings[0].time > 5) rings.shift();

    const maxHalfWidth = halfWidthAtFar();
    for (let row = 0; row < rows; row += 1) {
      const z = far * Math.pow(near / far, row / Math.max(1, rows - 1));
      const fog = Math.pow(1 - (z - near) / (far - near), 1.25);
      const size = clamp(2.1 / z, 0.8, 2.7);
      context.fillStyle = `rgba(${baseDotColor.join(',')},${(0.025 + fog * 0.17).toFixed(3)})`;

      for (let column = 0; column < columns; column += 1) {
        const x = -maxHalfWidth + (column / Math.max(1, columns - 1)) * maxHalfWidth * 2;
        const y = waveHeight(x, z, time);
        const screenX = width / 2 + (x / z) * focalLength;
        if (screenX < -3 || screenX > width + 3) continue;
        const screenY = horizon + ((cameraHeight - y) / z) * focalLength;
        context.fillRect(screenX - size / 2, screenY - size / 2, size, size);

        if (y > 0.135 && fog > 0.15) {
          context.fillStyle = `rgba(${accentColor.join(',')},${(0.025 + fog * 0.12).toFixed(3)})`;
          const accentSize = size * 1.08;
          context.fillRect(screenX - accentSize / 2, screenY - accentSize / 2, accentSize, accentSize);
          context.fillStyle = `rgba(${baseDotColor.join(',')},${(0.025 + fog * 0.17).toFixed(3)})`;
        }
      }
    }
  };

  const elapsed = () => (performance.now() - startTime) / 1000;
  const loop = (timestamp) => {
    animationFrame = 0;
    if (!pageVisible || document.hidden || motionPreference.matches) return;
    if (timestamp - lastFrame >= frameInterval) {
      lastFrame = timestamp;
      draw(elapsed());
    }
    animationFrame = window.requestAnimationFrame(loop);
  };
  const wake = () => {
    if (!pageVisible || document.hidden || motionPreference.matches || animationFrame) return;
    animationFrame = window.requestAnimationFrame(loop);
  };
  const stop = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const groundPoint = (event) => {
    const rect = host.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    if (screenX < 0 || screenY < horizon + 4 || screenX > rect.width || screenY > rect.height) return null;
    const z = clamp((cameraHeight * focalLength) / (screenY - horizon), near, far);
    return { x: ((screenX - width / 2) * z) / focalLength, z };
  };

  const onPointerMove = (event) => {
    const point = groundPoint(event);
    if (!point) {
      pointer.targetStrength = 0;
      return;
    }
    pointer.targetX = point.x;
    pointer.targetZ = point.z;
    pointer.targetStrength = 0.8;
    wake();
  };
  const onPointerDown = (event) => {
    const point = groundPoint(event);
    if (point) {
      rings.push({ ...point, time: elapsed() });
      if (rings.length > 5) rings.shift();
      wake();
    }
  };
  const onVisibilityChange = () => {
    pageVisible = !document.hidden;
    if (pageVisible) wake();
    else stop();
  };
  const onMotionChange = () => {
    if (motionPreference.matches) {
      stop();
      rings.length = 0;
      pointer.targetStrength = 0;
      draw(3);
    } else {
      startTime = performance.now();
      wake();
    }
  };

  resize();
  refreshColors();
  draw(motionPreference.matches ? 3 : 0);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', wake, { passive: true });
  if (!coarsePointer && !motionPreference.matches) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
  }

  const themeObserver = new MutationObserver(() => {
    refreshColors();
    draw(elapsed());
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionChange);
  else if (motionPreference.addListener) motionPreference.addListener(onMotionChange);
  wake();
})();
