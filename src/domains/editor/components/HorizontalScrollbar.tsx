import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface HorizontalScrollbarProps {
  getScroller: () => HTMLElement | null;
}

interface ScrollbarMetrics {
  scrollable: boolean;
  thumbLeft: number;
  thumbWidth: number;
}

const MIN_THUMB_WIDTH = 56;
const MAX_THUMB_WIDTH = 160;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getScrollbarMetrics(input: {
  clientWidth: number;
  scrollLeft: number;
  scrollWidth: number;
  trackWidth: number;
}): ScrollbarMetrics {
  const maxScroll = input.scrollWidth - input.clientWidth;
  if (input.trackWidth <= 0) {
    return {
      scrollable: false,
      thumbLeft: 0,
      thumbWidth: MIN_THUMB_WIDTH,
    };
  }

  if (maxScroll <= 1) {
    return {
      scrollable: true,
      thumbLeft: 0,
      thumbWidth: Math.min(MAX_THUMB_WIDTH, input.trackWidth),
    };
  }

  const proportionalWidth = (input.clientWidth / input.scrollWidth) * input.trackWidth;
  const thumbWidth = clamp(proportionalWidth, MIN_THUMB_WIDTH, Math.min(MAX_THUMB_WIDTH, input.trackWidth));
  const travel = Math.max(0, input.trackWidth - thumbWidth);
  const thumbLeft = travel > 0 ? (input.scrollLeft / maxScroll) * travel : 0;

  return {
    scrollable: true,
    thumbLeft: clamp(thumbLeft, 0, travel),
    thumbWidth,
  };
}

export function HorizontalScrollbar({ getScroller }: HorizontalScrollbarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    maxScroll: number;
    startScrollLeft: number;
    startX: number;
    travel: number;
  } | null>(null);
  const [metrics, setMetrics] = useState<ScrollbarMetrics>({
    scrollable: false,
    thumbLeft: 0,
    thumbWidth: MIN_THUMB_WIDTH,
  });
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    const scroller = getScroller();
    const track = trackRef.current;
    if (!scroller || !track) {
      setMetrics((current) => current.scrollable ? { ...current, scrollable: false } : current);
      return;
    }

    const trackWidth = track.clientWidth;
    setMetrics(getScrollbarMetrics({
      clientWidth: scroller.clientWidth,
      scrollLeft: scroller.scrollLeft,
      scrollWidth: scroller.scrollWidth,
      trackWidth,
    }));
  }, [getScroller]);

  useEffect(() => {
    let currentScroller: HTMLElement | null = null;
    let cleanupScroller = () => {};
    let cleanupTrack = () => {};
    let scrollerResizeObserver: ResizeObserver | null = null;
    let trackResizeObserver: ResizeObserver | null = null;

    const bindScroller = () => {
      const nextScroller = getScroller();
      if (nextScroller !== currentScroller) {
        cleanupScroller();
        cleanupTrack();
        scrollerResizeObserver?.disconnect();
        trackResizeObserver?.disconnect();
        scrollerResizeObserver = null;
        trackResizeObserver = null;
        currentScroller = nextScroller;

        const track = trackRef.current;
        if (track && typeof ResizeObserver !== 'undefined') {
          trackResizeObserver = new ResizeObserver(measure);
          trackResizeObserver.observe(track);
          cleanupTrack = () => trackResizeObserver?.disconnect();
        } else {
          cleanupTrack = () => {};
        }

        if (nextScroller) {
          const handleScroll = () => measure();
          const handleWheel = (event: WheelEvent) => {
            const maxScroll = nextScroller.scrollWidth - nextScroller.clientWidth;
            if (maxScroll <= 1) return;

            const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.shiftKey
                ? event.deltaY
                : 0;
            if (horizontalDelta === 0) return;

            event.preventDefault();
            nextScroller.scrollLeft = clamp(nextScroller.scrollLeft + horizontalDelta, 0, maxScroll);
            measure();
          };
          nextScroller.addEventListener('scroll', handleScroll, { passive: true });
          nextScroller.addEventListener('wheel', handleWheel, { passive: false });
          cleanupScroller = () => {
            nextScroller.removeEventListener('scroll', handleScroll);
            nextScroller.removeEventListener('wheel', handleWheel);
          };

          if (typeof ResizeObserver !== 'undefined') {
            scrollerResizeObserver = new ResizeObserver(measure);
            scrollerResizeObserver.observe(nextScroller);
            const firstChild = nextScroller.firstElementChild;
            if (firstChild instanceof HTMLElement) {
              scrollerResizeObserver.observe(firstChild);
            }
          }
        } else {
          cleanupScroller = () => {};
        }
      }
      measure();
    };

    const frame = window.requestAnimationFrame(bindScroller);
    const interval = window.setInterval(bindScroller, 300);
    window.addEventListener('resize', bindScroller);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener('resize', bindScroller);
      cleanupScroller();
      cleanupTrack();
      scrollerResizeObserver?.disconnect();
      trackResizeObserver?.disconnect();
    };
  }, [getScroller, measure]);

  const scrollToTrackPoint = useCallback((clientX: number) => {
    const scroller = getScroller();
    const track = trackRef.current;
    if (!scroller || !track || !metrics.scrollable) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const travel = Math.max(0, track.clientWidth - metrics.thumbWidth);
    if (maxScroll <= 0 || travel <= 0) return;

    const rect = track.getBoundingClientRect();
    const thumbLeft = clamp(clientX - rect.left - metrics.thumbWidth / 2, 0, travel);
    scroller.scrollLeft = (thumbLeft / travel) * maxScroll;
    measure();
  }, [getScroller, measure, metrics.scrollable, metrics.thumbWidth]);

  const handleTrackPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.prism-horizontal-scrollbar__thumb')) return;
    event.preventDefault();
    scrollToTrackPoint(event.clientX);
  }, [scrollToTrackPoint]);

  const handleThumbPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = getScroller();
    const track = trackRef.current;
    if (!scroller || !track || !metrics.scrollable) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const travel = Math.max(0, track.clientWidth - metrics.thumbWidth);
    if (maxScroll <= 0 || travel <= 0) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      maxScroll,
      startScrollLeft: scroller.scrollLeft,
      startX: event.clientX,
      travel,
    };
    setDragging(true);
  }, [getScroller, metrics.scrollable, metrics.thumbWidth]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const scroller = getScroller();
    if (!drag || !scroller) return;

    const delta = event.clientX - drag.startX;
    scroller.scrollLeft = clamp(
      drag.startScrollLeft + (delta / drag.travel) * drag.maxScroll,
      0,
      drag.maxScroll,
    );
    measure();
  }, [getScroller, measure]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by WebKit during window transitions.
      }
    }
  }, []);

  return (
    <div
      ref={trackRef}
      className="prism-horizontal-scrollbar"
      data-scrollable={metrics.scrollable ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
      onPointerDown={handleTrackPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="prism-horizontal-scrollbar__thumb"
        onPointerDown={handleThumbPointerDown}
        style={{
          transform: `translateX(${metrics.thumbLeft}px)`,
          width: `${metrics.thumbWidth}px`,
        }}
      />
    </div>
  );
}

export const __horizontalScrollbarTesting = {
  getScrollbarMetrics,
  MIN_THUMB_WIDTH,
  MAX_THUMB_WIDTH,
};
