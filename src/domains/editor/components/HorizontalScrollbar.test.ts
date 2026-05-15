/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { __horizontalScrollbarTesting } from './HorizontalScrollbar';

const { getScrollbarMetrics, MAX_THUMB_WIDTH } = __horizontalScrollbarTesting;

describe('HorizontalScrollbar metrics', () => {
  it('hides the bottom affordance when the current surface has no horizontal overflow', () => {
    expect(getScrollbarMetrics({
      clientWidth: 800,
      scrollLeft: 0,
      scrollWidth: 800,
      trackWidth: 600,
    })).toEqual({
      scrollable: false,
      thumbLeft: 0,
      thumbWidth: MAX_THUMB_WIDTH,
    });
  });

  it('hides the affordance while the track has no measurable width', () => {
    expect(getScrollbarMetrics({
      clientWidth: 800,
      scrollLeft: 0,
      scrollWidth: 1200,
      trackWidth: 0,
    }).scrollable).toBe(false);
  });

  it('caps the visible thumb width so shallow overflow does not produce a full-width bar', () => {
    const metrics = getScrollbarMetrics({
      clientWidth: 960,
      scrollLeft: 0,
      scrollWidth: 1080,
      trackWidth: 720,
    });

    expect(metrics.scrollable).toBe(true);
    expect(metrics.thumbWidth).toBe(MAX_THUMB_WIDTH);
  });

  it('maps horizontal scroll progress onto the capped thumb travel', () => {
    const metrics = getScrollbarMetrics({
      clientWidth: 500,
      scrollLeft: 250,
      scrollWidth: 1000,
      trackWidth: 400,
    });

    expect(metrics.scrollable).toBe(true);
    expect(metrics.thumbWidth).toBe(MAX_THUMB_WIDTH);
    expect(metrics.thumbLeft).toBe((400 - MAX_THUMB_WIDTH) / 2);
  });

  it('lets the compact thumb reach the right edge at maximum horizontal scroll', () => {
    const metrics = getScrollbarMetrics({
      clientWidth: 500,
      scrollLeft: 500,
      scrollWidth: 1000,
      trackWidth: 400,
    });

    expect(metrics.scrollable).toBe(true);
    expect(metrics.thumbWidth).toBe(MAX_THUMB_WIDTH);
    expect(metrics.thumbLeft).toBe(400 - MAX_THUMB_WIDTH);
  });
});
