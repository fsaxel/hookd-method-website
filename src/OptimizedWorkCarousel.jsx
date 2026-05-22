import React from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

const workVideos = Array.from(
  { length: 10 },
  (_, index) => `/work/video-${String(index + 1).padStart(2, "0")}.mp4?v=3`
);

const visibleSlots = [-1, 0, 1];
const wrapIndex = (index) => (index + workVideos.length) % workVideos.length;

function VideoCard({ index, slot, source, loaded, active, onReady, onSelect }) {
  const videoRef = React.useRef(null);
  const eager = active || slot === 1;

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const syncPlayback = () => {
      if (!active || document.visibilityState !== "visible") {
        video.pause();
        return;
      }

      const play = () => video.play().catch(() => {});
      if (video.readyState >= 3) play();
      else video.addEventListener("canplay", play, { once: true });
    };

    syncPlayback();
    video.addEventListener("loadeddata", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);

    return () => {
      video.pause();
      video.removeEventListener("loadeddata", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [active, source]);

  return (
    <button
      type="button"
      className={`owc-card owc-card-${slot} ${active ? "is-active" : ""}`}
      onClick={active ? undefined : onSelect}
      aria-label={active ? `Video ${index + 1}` : `Show video ${index + 1}`}
      aria-current={active ? "true" : undefined}
    >
      <video
        ref={videoRef}
        src={source}
        muted
        loop
        playsInline
        preload={eager ? "auto" : "metadata"}
        disablePictureInPicture
        onLoadedData={() => onReady(index)}
        onCanPlay={() => onReady(index)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className="owc-scrim" />
      <span className="owc-pill">
        <Play className="h-2.5 w-2.5 fill-white text-white" />
        HOOKD.
      </span>
      {!active && !loaded && <span className="owc-loader" />}
    </button>
  );
}

export default function OptimizedWorkCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [inView, setInView] = React.useState(false);
  const [readyIndexes, setReadyIndexes] = React.useState(() => new Set([0]));
  const stageRef = React.useRef(null);

  const move = React.useCallback((direction) => {
    setActiveIndex((current) => wrapIndex(current + direction));
  }, []);

  const markReady = React.useCallback((index) => {
    setReadyIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !("IntersectionObserver" in window)) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "420px 0px", threshold: 0.01 }
    );

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!inView) return undefined;

    const preloadIndexes = [activeIndex, activeIndex + 1, activeIndex - 1].map(wrapIndex);
    const links = preloadIndexes.map((index) => {
      const href = workVideos[index];
      const existing = document.head.querySelector(`link[data-work-video="${href}"]`);
      if (existing) return existing;

      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.type = "video/mp4";
      link.href = href;
      link.dataset.workVideo = href;
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((link) => {
        if (link.dataset.workVideo !== workVideos[activeIndex]) link.remove();
      });
    };
  }, [activeIndex, inView]);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduceMotion || !inView) return undefined;

    const interval = window.setInterval(() => move(1), 4800);
    return () => window.clearInterval(interval);
  }, [inView, move, paused]);

  const cards = visibleSlots.map((slot) => {
    const index = wrapIndex(activeIndex + slot);
    return {
      index,
      slot,
      source: workVideos[index],
      loaded: readyIndexes.has(index),
      active: slot === 0,
    };
  });

  return (
    <section
      id="work"
      className="optimized-work-carousel relative overflow-hidden py-6 md:py-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={stageRef} className="owc-stage relative mx-auto h-[310px] w-full max-w-[760px] sm:h-[380px] md:h-[500px]">
        {cards.map((card) => (
          <VideoCard
            key={`${card.slot}-${card.index}`}
            {...card}
            onReady={markReady}
            onSelect={() => setActiveIndex(card.index)}
          />
        ))}
      </div>
      <button type="button" onClick={() => move(-1)} className="owc-nav prev" aria-label="Previous video">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => move(1)} className="owc-nav next" aria-label="Next video">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="owc-dots mt-5 flex justify-center gap-2">
        {workVideos.map((video, index) => (
          <button
            key={`${video}-dot`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? "w-7 bg-[#ff5a00]" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
            aria-label={`Show video ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
