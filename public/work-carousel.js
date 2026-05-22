(() => {
  const TOTAL = 10;
  const VERSION = '12';
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let ready = false;
  let current = 1;
  let lock = false;
  const cache = [];

  const wrap = (n) => ((n % TOTAL) + TOTAL) % TOTAL;
  const indexForSlot = (slot) => order[wrap(slot)];
  const srcForSlot = (slot) => `/work/video-${String(indexForSlot(slot) + 1).padStart(2, '0')}.mp4?v=${VERSION}`;
  const isMobile = () => matchMedia('(max-width: 767px)').matches;

  const prime = (slot) => {
    const v = document.createElement('video');
    cache.push(v);
    v.src = srcForSlot(slot);
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.loop = true;
    v.preload = 'auto';
    v.load();
  };

  [0, 1, 2].forEach(prime);

  const dims = () => isMobile()
    ? { mainW: 158, mainH: 265, sideW: 78, sideH: 142, sideX: 122, hiddenX: 245 }
    : { mainW: 252, mainH: 442, sideW: 152, sideH: 272, sideX: 230, hiddenX: 430 };

  const setVars = (el, vars) => {
    for (const key in vars) el.style.setProperty(key, vars[key]);
  };

  const setupVideo = (card, slot, active) => {
    const video = card.querySelector('video');
    if (!video) return;
    const source = video.querySelector('source');
    const src = srcForSlot(slot);

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = active ? 'auto' : 'metadata';

    if (source && source.src !== src) {
      source.src = src;
      video.load();
    } else if (!source && video.src !== src) {
      video.src = src;
      video.load();
    }

    if (active) video.play().catch(() => {});
    else video.pause();
  };

  const init = () => {
    if (ready) return;
    const section = document.querySelector('#work');
    const track = document.querySelector('#work .marquee-track');
    const offers = document.querySelector('#offers');
    if (!section || !track) return;

    if (offers && section.nextElementSibling !== offers) {
      offers.parentNode.insertBefore(section, offers);
    }

    const cards = Array.from(track.querySelectorAll('.work-card')).slice(0, TOTAL);
    if (cards.length < 3) return;

    ready = true;
    window.__HOOKD_WORK_UNLOCK__ = true;
    section.classList.add('hookd-controlled-work');
    section.style.opacity = '1';
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
        card.classList.remove('is-main', 'is-side', 'is-hidden');

        if (slot === mainSlot) {
          card.classList.add('is-main');
          setVars(card, {
            '--x': '0px', '--s': '1', '--o': '1', '--r': '0deg',
            '--w': `${d.mainW}px`, '--h': `${d.mainH}px`, '--z': '30',
            '--filter': 'none', '--pointer': 'auto', '--overlay': '0'
          });
          setupVideo(card, slot, true);
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
          setupVideo(card, slot, true);
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
        setupVideo(card, slot, false);
      });

      setTimeout(() => prime(current + 2), 200);
      setTimeout(() => prime(current - 2), 420);
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
      for (let slot = 3; slot < TOTAL; slot += 1) setTimeout(() => prime(slot), (slot - 3) * 360);
    }, 900);
  };

  const poll = setInterval(() => {
    init();
    if (ready) clearInterval(poll);
  }, 40);
  addEventListener('DOMContentLoaded', init, { once: true });
  addEventListener('load', init, { once: true });
})();