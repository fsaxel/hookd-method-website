(() => {
  const TOTAL = 10;
  const VERSION = '10';
  let ready = false;
  let current = 1;
  let lock = false;
  const cache = [];
  let order = Array.from({ length: TOTAL }, (_, i) => i);

  const wrap = (n) => ((n % TOTAL) + TOTAL) % TOTAL;
  const srcFor = (i) => `/work/video-${String(wrap(i) + 1).padStart(2, '0')}.mp4?v=${VERSION}`;
  const isMobile = () => matchMedia('(max-width: 767px)').matches;

  const getSize = async (index) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600);
    try {
      const response = await fetch(srcFor(index), { method: 'HEAD', cache: 'force-cache', signal: controller.signal });
      const length = Number(response.headers.get('content-length'));
      clearTimeout(timeout);
      return { index, size: Number.isFinite(length) && length > 0 ? length : 999999999 + index };
    } catch (_) {
      clearTimeout(timeout);
      return { index, size: 999999999 + index };
    }
  };

  const buildLightestOrder = async () => {
    const sizes = await Promise.all(order.map(getSize));
    const sorted = sizes.sort((a, b) => a.size - b.size).map((item) => item.index);
    const first = sorted.slice(0, 3);
    const rest = sorted.slice(3);
    order = [first[1] ?? 1, first[0] ?? 0, first[2] ?? 2, ...rest];
    current = 1;
  };

  const videoIndexAt = (slot) => order[wrap(slot)];

  const prime = (slotOrVideoIndex, isRealIndex = false) => new Promise((resolve) => {
    const videoIndex = isRealIndex ? wrap(slotOrVideoIndex) : videoIndexAt(slotOrVideoIndex);
    const video = document.createElement('video');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(videoIndex);
    };
    cache.push(video);
    video.src = srcFor(videoIndex);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'auto';
    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    video.load();
    setTimeout(finish, 2200);
  });

  const dims = () => isMobile()
    ? { mainW: 158, mainH: 265, sideW: 78, sideH: 142, sideX: 122, hiddenX: 245 }
    : { mainW: 252, mainH: 442, sideW: 152, sideH: 272, sideX: 230, hiddenX: 430 };

  const setVars = (el, vars) => {
    for (const key in vars) el.style.setProperty(key, vars[key]);
  };

  const setupVideo = (card, videoIndex, active) => {
    const video = card.querySelector('video');
    if (!video) return;
    const source = video.querySelector('source');
    const src = srcFor(videoIndex);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = active ? 'auto' : 'metadata';
    if (source && source.getAttribute('src') !== src) {
      source.setAttribute('src', src);
      video.load();
    }
    if (!source && video.getAttribute('src') !== src) {
      video.setAttribute('src', src);
      video.load();
    }
    if (active) video.play().catch(() => {});
    else video.pause();
  };

  const init = async () => {
    if (ready) return;
    const section = document.querySelector('#work');
    const track = document.querySelector('#work .marquee-track');
    if (!section || !track) return;

    const allCards = Array.from(track.querySelectorAll('.work-card'));
    const cards = allCards.slice(0, TOTAL);
    if (cards.length < 3) return;
    ready = true;

    section.style.opacity = '0';
    section.style.transition = 'opacity 220ms ease';

    await buildLightestOrder();
    await Promise.all([prime(0), prime(1), prime(2)]);

    section.classList.add('hookd-controlled-work');
    track.replaceChildren(...cards);

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'work-nav-button prev';
    prev.setAttribute('aria-label', 'Previous video');
    prev.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'work-nav-button next';
    next.setAttribute('aria-label', 'Next video');
    next.textContent = '›';

    section.append(prev, next);

    const apply = () => {
      const d = dims();
      const leftSlot = wrap(current - 1);
      const mainSlot = wrap(current);
      const rightSlot = wrap(current + 1);

      cards.forEach((card, slot) => {
        const videoIndex = videoIndexAt(slot);
        card.classList.remove('is-main', 'is-side', 'is-hidden');

        if (slot === mainSlot) {
          card.classList.add('is-main');
          setVars(card, {
            '--x': '0px', '--s': '1', '--o': '1', '--r': '0deg',
            '--w': `${d.mainW}px`, '--h': `${d.mainH}px`, '--z': '30',
            '--filter': 'none', '--pointer': 'auto', '--overlay': '0'
          });
          setupVideo(card, videoIndex, true);
          return;
        }

        if (slot === leftSlot || slot === rightSlot) {
          const side = slot === leftSlot ? -1 : 1;
          card.classList.add('is-side');
          setVars(card, {
            '--x': `${side * d.sideX}px`, '--s': '.9', '--o': isMobile() ? '.28' : '.38', '--r': `${side * 1.4}deg`,
            '--w': `${d.sideW}px`, '--h': `${d.sideH}px`, '--z': '10',
            '--filter': 'brightness(.54) saturate(.72)', '--pointer': 'none', '--overlay': '.9'
          });
          setupVideo(card, videoIndex, true);
          return;
        }

        const rawDistance = slot - current;
        const side = Math.abs(rawDistance) > TOTAL / 2 ? -Math.sign(rawDistance) : Math.sign(rawDistance || 1);
        card.classList.add('is-hidden');
        setVars(card, {
          '--x': `${side * d.hiddenX}px`, '--s': '.66', '--o': '0', '--r': `${side * 5}deg`,
          '--w': `${d.sideW}px`, '--h': `${d.sideH}px`, '--z': '1',
          '--filter': 'brightness(.35) saturate(.6)', '--pointer': 'none', '--overlay': '1'
        });
        setupVideo(card, videoIndex, false);
      });

      setTimeout(() => prime(current + 2), 180);
      setTimeout(() => prime(current - 2), 360);
    };

    const move = (direction) => {
      if (lock) return;
      lock = true;
      current = wrap(current + direction);
      apply();
      setTimeout(() => { lock = false; }, 740);
    };

    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    addEventListener('resize', apply);

    apply();
    requestAnimationFrame(() => { section.style.opacity = '1'; });

    setTimeout(() => {
      for (let slot = 3; slot < TOTAL; slot += 1) setTimeout(() => prime(slot), (slot - 3) * 320);
    }, 1200);
  };

  const poll = setInterval(() => {
    init();
    if (ready) clearInterval(poll);
  }, 80);
  addEventListener('DOMContentLoaded', init, { once: true });
  addEventListener('load', init, { once: true });
})();