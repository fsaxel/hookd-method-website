import React from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

const workVideos = Array.from(
  { length: 10 },
  (_, index) => `/work/video-${String(index + 1).padStart(2, "0")}.mp4?v=3`
);

const visibleSlots = [-1, 0, 1];
const wrapIndex = (index) => (index + workVideos.length) % workVideos.length;

function idle(callback, timeout = 900) {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(id);
}

function VideoCard({ index, slot, source, loaded, active, onSelect }) {
  const videoRef = React.useRef(null);

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
        preload={active || loaded ? "auto" : "metadata"}
        disablePictureInPicture
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
  const [blobUrls, setBlobUrls] = React.useState(() => new Map());
  const stageRef = React.useRef(null);
  const blobUrlsRef = React.useRef(new Map());
  const requestsRef = React.useRef(new Map());

  const move = React.useCallback((direction) => {
    setActiveIndex((current) => wrapIndex(current + direction));
  }, []);

  const warmVideo = React.useCallback((index) => {
    const normalizedIndex = wrapIndex(index);
    if (blobUrlsRef.current.has(normalizedIndex)) {
      return Promise.resolve(blobUrlsRef.current.get(normalizedIndex));
    }
    if (requestsRef.current.has(normalizedIndex)) {
      return requestsRef.current.get(normalizedIndex);
    }

    const request = fetch(workVideos[normalizedIndex], {
      cache: "force-cache",
      priority: normalizedIndex === activeIndex ? "high" : "low",
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Video ${normalizedIndex + 1} failed to load`);
        return response.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.set(normalizedIndex, objectUrl);
        setBlobUrls(new Map(blobUrlsRef.current));
        return objectUrl;
      })
      .catch(() => null)
      .finally(() => {
        requestsRef.current.delete(normalizedIndex);
      });

    requestsRef.current.set(normalizedIndex, request);
    return request;
  }, [activeIndex]);

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

    const criticalIndexes = [activeIndex, activeIndex + 1, activeIndex - 1, activeIndex + 2].map(wrapIndex);
    criticalIndexes.forEach(warmVideo);

    return idle(() => {
      workVideos.forEach((_, index) => {
        if (!criticalIndexes.includes(index)) {
          window.setTimeout(() => warmVideo(index), index * 120);
        }
      });
    }, 1200);
  }, [activeIndex, inView, warmVideo]);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduceMotion || !inView) return undefined;

    const interval = window.setInterval(() => move(1), 4800);
    return () => window.clearInterval(interval);
  }, [inView, move, paused]);

  React.useEffect(() => () => {
    blobUrlsRef.current.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }, []);

  const cards = visibleSlots.map((slot) => {
    const index = wrapIndex(activeIndex + slot);
    return {
      index,
      slot,
      source: blobUrls.get(index) || workVideos[index],
      loaded: blobUrls.has(index),
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
