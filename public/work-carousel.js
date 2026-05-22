(() => {
  const TOTAL = 10;
  const VERSION = '7';
  let ready = false;
  let current = 0;
  let lock = false;
  const cache = [];

  const wrap = (n) => ((n % TOTAL) + TOTAL) % TOTAL;
  const srcFor = (i) => `/work/video-${String(wrap(i) + 1).padStart(2, '0')}.mp4?v=${VERSION}`;
  const isMobile = () => matchMedia('(max-width: 767px)').matches;

  const prime = (index) => {
    const video = document.createElement('video');
    cache.push(video);
    video.src = srcFor(index);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'auto';
    video.load();
  };

  [0, 1, 2].forEach(prime);

  const dims = () => isMobile()
    ? { mainW: 158, mainH: 265, sideW: 78, sideH: 142, sideX: 122, hiddenX: 245 }
    : { mainW: 252, mainH: 442, sideW: 152, sideH: 272, sideX: 230, hiddenX: 430 };

  const setVars = (el, vars) => {
    for (const key in vars) el.style.setProperty(key, vars[key]);
  };

  const setupVideo = (card, index, active) => {
    const video = card.querySelector('video');
    if (!video) return;
    const source = video.querySelector('source');
    const src = srcFor(index);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = active ? 'auto' : 'metadata';
    if (source && source.getAttribute('src') !== src) {
      source.setAttribute('src', src);
      video.load();
    }
    if (active) video.play().catch(() => {});
    else video.pause();
  };

  const init = () => {
    if (ready) return;
    const section = document.querySelector('#work');
    const track = document.querySelector('#work .marquee-track');
    if (!section || !track) return;

    const cards = Array.from(track.querySelectorAll('.work-card')).slice(0, TOTAL);
    if (cards.length < TOTAL) return;
    ready = true;

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
      const left = wrap(current - 1);
      const main = wrap(current);
      const right = wrap(current + 1);

      cards.forEach((card, i) => {
        card.classList.remove('is-main', 'is-side', 'is-hidden');

        if (i === main) {
          card.classList.add('is-main');
          setVars(card, {
            '--x': '0px', '--scale': '1', '--opacity': '1', '--rotate': '0deg',
            '--w': `${d.mainW}px`, '--h': `${d.mainH}px`, '--z': '30',
            '--filter': 'none', '--overlay': '0'
          });
          setupVideo(card, i, true);
          return;
        }

        if (i === left || i === right) {
          const side = i === left ? -1 : 1;
          card.classList.add('is-side');
          setVars(card, {
            '--x': `${side * d.sideX}px`, '--scale': '.9', '--opacity': isMobile() ? '.28' : '.38', '--rotate': `${side * 1.4}deg`,
            '--w': `${d.sideW}px`, '--h': `${d.sideH}px`, '--z': '10',
            '--filter': 'brightness(.54) saturate(.72)', '--overlay': '.9'
          });
          setupVideo(card, i, false);
          return;
        }

        const rawDistance = i - current;
        const side = Math.abs(rawDistance) > TOTAL / 2 ? -Math.sign(rawDistance) : Math.sign(rawDistance || 1);
        card.classList.add('is-hidden');
        setVars(card, {
          '--x': `${side * d.hiddenX}px`, '--scale': '.66', '--opacity': '0', '--rotate': `${side * 5}deg`,
          '--w': `${d.sideW}px`, '--h': `${d.sideH}px`, '--z': '1',
          '--filter': 'brightness(.35) saturate(.6)', '--overlay': '1'
        });
        setupVideo(card, i, false);
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
    setTimeout(() => {
      for (let i = 3; i < TOTAL; i += 1) setTimeout(() => prime(i), (i - 3) * 260);
    }, 1000);
  };

  const poll = setInterval(() => {
    init();
    if (ready) clearInterval(poll);
  }, 80);
  addEventListener('load', init, { once: true });
})();