import { describe, it, expect } from 'vitest';
import {
  mergeWatchedIntervals,
  calculateWatchPercentage,
  isLessonCompleted,
} from '../src/services/progression.service.js';

describe('Video Heartbeat & Anti-Cheat Engine', () => {
  const VIDEO_DURATION = 600; // 10 minutes (600 seconds)

  describe('mergeWatchedIntervals - Interval Union & Clamping', () => {
    it('initializes with a single valid watched interval', () => {
      const existing: { start: number; end: number }[] = [];
      const incoming = [{ start: 0, end: 15 }];
      const result = mergeWatchedIntervals(existing, incoming, VIDEO_DURATION);

      expect(result.mergedSegments).toEqual([{ start: 0, end: 15 }]);
      expect(result.totalUniqueSeconds).toBe(15);
      expect(result.percent).toBeCloseTo((15 / 600) * 100, 2);
    });

    it('merges contiguous and overlapping intervals correctly', () => {
      const existing = [
        { start: 0, end: 30 },
        { start: 40, end: 70 },
      ];
      const incoming = [
        { start: 25, end: 50 }, // Bridges the 0-30 and 40-70 gap
      ];
      const result = mergeWatchedIntervals(existing, incoming, VIDEO_DURATION);

      // Should merge into a single continuous interval [0, 70]
      expect(result.mergedSegments).toEqual([{ start: 0, end: 70 }]);
      expect(result.totalUniqueSeconds).toBe(70);
    });

    it('merges multiple disjoint intervals maintaining sort order', () => {
      const existing = [{ start: 100, end: 120 }];
      const incoming = [
        { start: 10, end: 30 },
        { start: 200, end: 250 },
      ];
      const result = mergeWatchedIntervals(existing, incoming, VIDEO_DURATION);

      expect(result.mergedSegments).toEqual([
        { start: 10, end: 30 },
        { start: 100, end: 120 },
        { start: 200, end: 250 },
      ]);
      expect(result.totalUniqueSeconds).toBe(20 + 20 + 50); // 90 seconds
    });

    it('clamps intervals exceeding video duration', () => {
      const existing = [{ start: 580, end: 600 }];
      const incoming = [{ start: 590, end: 750 }]; // Exceeds 600s duration
      const result = mergeWatchedIntervals(existing, incoming, VIDEO_DURATION);

      expect(result.mergedSegments).toEqual([{ start: 580, end: 600 }]);
      expect(result.totalUniqueSeconds).toBe(20);
    });

    it('ignores invalid intervals (start >= end or negative values)', () => {
      const existing = [{ start: 0, end: 10 }];
      const incoming = [
        { start: 20, end: 20 }, // 0 duration
        { start: 50, end: 30 }, // negative duration
        { start: -10, end: 5 }, // negative start
      ];
      const result = mergeWatchedIntervals(existing, incoming, VIDEO_DURATION);

      expect(result.mergedSegments).toEqual([{ start: 0, end: 10 }]);
      expect(result.totalUniqueSeconds).toBe(10);
    });
  });

  describe('Anti-Cheat: Forward Seeking Prevention', () => {
    it('forward seeking to 500s does not grant 500 seconds of watch time', () => {
      // Student watches 0-15s, then skips to 500s and sends 500-515s
      const existing = [{ start: 0, end: 15 }];
      const incoming = [{ start: 500, end: 515 }];
      const result = mergeWatchedIntervals(existing, incoming, VIDEO_DURATION);

      expect(result.mergedSegments).toEqual([
        { start: 0, end: 15 },
        { start: 500, end: 515 },
      ]);
      expect(result.totalUniqueSeconds).toBe(30); // Only 30s actual watch time
      expect(result.percent).toBeCloseTo(5.0, 1);
    });

    it('replaying the same watched segment is idempotent and adds 0 seconds', () => {
      const existing = [{ start: 0, end: 120 }];
      const replayed = [{ start: 10, end: 50 }]; // Rewatched section
      const result = mergeWatchedIntervals(existing, replayed, VIDEO_DURATION);

      expect(result.mergedSegments).toEqual([{ start: 0, end: 120 }]);
      expect(result.totalUniqueSeconds).toBe(120);
    });

    it('rejects impossible-speed intervals that exceed max wall-clock threshold', () => {
      // An interval claiming to watch 500 seconds in a single 15s heartbeat window
      const existing: { start: number; end: number }[] = [];
      const impossible = [{ start: 0, end: 500 }]; // In one single packet with MAX_INTERVAL_DURATION_SECONDS = 120
      const result = mergeWatchedIntervals(existing, impossible, VIDEO_DURATION);

      // Heartbeat with unrealistic > 120s chunk is rejected
      expect(result.totalUniqueSeconds).toBe(0);
      expect(result.mergedSegments).toEqual([]);
    });
  });

  describe('Auto-Completion Threshold (90% Boundary Rules)', () => {
    it('539 seconds of 600 (89.83%) does NOT meet 90% threshold', () => {
      const percent = calculateWatchPercentage(539, 600);
      expect(percent).toBe(89.83);
      expect(isLessonCompleted(539, 600, 90)).toBe(false);
    });

    it('540 seconds of 600 (90.00%) MEETS 90% threshold and auto-completes', () => {
      const percent = calculateWatchPercentage(540, 600);
      expect(percent).toBe(90);
      expect(isLessonCompleted(540, 600, 90)).toBe(true);
    });

    it('custom threshold (e.g. 80%) completes at 480 seconds', () => {
      expect(isLessonCompleted(479, 600, 80)).toBe(false);
      expect(isLessonCompleted(480, 600, 80)).toBe(true);
    });
  });
});
