(() => {
  const total = 10;
  const version = '6';
  let started = false;
  let current = 0;
  let locked = false;
  const cache = [];

  const wrap = (n) => ((n % total) + total) % total;
  const srcFor = (i) => `/work/video-${String(wrap(i) + 1).padStart(2, '0')}.mp4?v=${version}`;
  const mobile = () => window.matchMedia('(max-width: 767px)').matches;

  const preload = (src) => {
    const v = document.createElement('video');
    cache.push(v);
    v.src = src;
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.loop = true;
    v.preload = 'auto';
    v.load();
  };

  [0, 1, 2].forEach((i) => preload(srcFor(i)));

  const setVars = (card, vars) => {
    Object.keys(vars).forEach((key) => card.style.setProperty(key, vars[key]));
  };

  const sizes = () => mobile()
    ? { mainW: 156, mainH: 260, sideW: 74, sideH: 135, sideX: 125, hiddenX: 245 }
    : { mainW: 250, mainH: 438, sideW: 150, sideH: 268, sideX: 236, hiddenX: 430 };

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
  };

  const init = () => {
    if (started) return;
    const section = document.querySelector('#work');
    const track = document.querySelector('#work .marquee-track');
    if (!section || !track) return;
    const cards = Array.from(track.querySelectorAll('.work-card')).slice(0, total);
    if (cards.length < total) return;
    started = true;

    track.replaceChildren(...cards);
    cards.forEach((card) => card.classList.remove('work-main', 'work-side', 'work-hidden', 'work-edge'));

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'work-nav-button prev';
    prev.setAttribute('aria-label', 'Previous work video');
    prev.textContent = '‹';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'work-nav-button next';
    next.setAttribute('aria-label', 'Next work video');
    next.textContent = '›';

    section.append(prev, next);

    const apply = () => {
      const m = sizes();
      const left = wrap(current - 1);
      const main = wrap(current);
      const right = wrap(current + 1);

      cards.forEach((card, i) => {
        card.classList.remove('work-main', 'work-side', 'work-hidden');
        if (i === main) {
          card.classList.add('work-main');
          setVars(card, { '--work-x': '0px', '--work-s': '1', '--work-o': '1', '--work-r': '0deg', '--work-w': `${m.mainW}px`, '--work-h': `${m.mainH}px`, '--work-z': '30', '--work-filter': 'none', '--work-pointer': 'auto', '--work-overlay': '0' });
          setupVideo(card, i, true);
        } else if (i === left) {
          card.classList.add('work-side');
          setVars(card, { '--work-x': `${-m.sideX}px`, '--work-s': '.92', '--work-o': mobile() ? '.26' : '.36', '--work-r': '-1.5deg', '--work-w': `${m.sideW}px`, '--work-h': `${m.sideH}px`, '--work-z': '10', '--work-filter': 'saturate(.72) brightness(.54)', '--work-pointer': 'none', '--work-overlay': '.95' });
          setupVideo(card, i, false);
        } else if (i === right) {
          card.classList.add('work-side');
          setVars(card, { '--work-x': `${m.sideX}px`, '--work-s': '.92', '--work-o': mobile() ? '.26' : '.36', '--work-r': '1.5deg', '--work-w': `${m.sideW}px`, '--work-h': `${m.sideH}px`, '--work-z': '10', '--work-filter': 'saturate(.72) brightness(.54)', '--work-pointer': 'none', '--work-overlay': '.95' });
          setupVideo(card, i, false);
        } else {
          const distance = wrap(i - current);
          const side = distance > total / 2 ? -1 : 1;
          card.classList.add('work-hidden');
          setVars(card, { '--work-x': `${side * m.hiddenX}px`, '--work-s': '.66', '--work-o': '0', '--work-r': `${side * 4}deg`, '--work-w': `${m.sideW}px`, '--work-h': `${m.sideH}px`, '--work-z': '1', '--work-filter': 'brightness(.35) saturate(.6)', '--work-pointer': 'none', '--work-overlay': '1' });
          setupVideo(card, i, false);
        }
      });

      setTimeout(() => preload(srcFor(current + 2)), 200);
      setTimeout(() => preload(srcFor(current - 2)), 420);
    };

    const move = (dir) => {
      if (locked) return;
      locked = true;
      current = wrap(current + dir);
      apply();
      setTimeout(() => { locked = false; }, 760);
    };

    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    window.addEventListener('resize', apply);
    apply();
    setTimeout(() => { for (let i = 3; i < total; i += 1) setTimeout(() => preload(srcFor(i)), (i - 3) * 280); }, 1200);
  };

  const timer = setInterval(() => {
    init();
    if (started) clearInterval(timer);
  }, 120);
  window.addEventListener('load', init, { once: true });
})();