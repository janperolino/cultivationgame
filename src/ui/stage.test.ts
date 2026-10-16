import { describe, expect, it } from 'vitest';
import { MAX_WIDTH, SAFE_WIDTH, STAGE_HEIGHT, stageFor } from './stage.ts';

describe('the stage', () => {
  it('is 1920 wide at 16:9, at the window height over 1080', () => {
    expect(stageFor(1920, 1080)).toMatchObject({ factor: 1, width: 1920, left: 0, top: 0 });
    const small = stageFor(1280, 720);
    expect(small.factor).toBeCloseTo(2 / 3);
    expect(small.width).toBeCloseTo(1920);
    expect(stageFor(3840, 2160)).toMatchObject({ factor: 2, width: 1920 });
  });

  it('is 1728 wide at 16:10 and 2520 at 21:9', () => {
    expect(stageFor(1920, 1200)).toMatchObject({ factor: 1200 / 1080, width: 1728 });
    expect(stageFor(1920, 1200).left).toBeCloseTo(0);
    expect(stageFor(2520, 1080)).toMatchObject({ factor: 1, width: MAX_WIDTH, left: 0 });
    const ultrawide = stageFor(2560, 1080);
    expect(ultrawide.width).toBe(MAX_WIDTH);
    expect(ultrawide.left).toBe(20);
  });

  it('pillarboxes past 21:9 and letterboxes below 16:10', () => {
    const superwide = stageFor(3840, 1080);
    expect(superwide).toMatchObject({ factor: 1, width: MAX_WIDTH, top: 0 });
    expect(superwide.left).toBe((3840 - MAX_WIDTH) / 2);
    const square = stageFor(1280, 1024);
    expect(square.factor).toBeCloseTo(1280 / SAFE_WIDTH);
    expect(square.width).toBe(SAFE_WIDTH);
    expect(square.left).toBeCloseTo(0);
    expect(square.top).toBeCloseTo((1024 - STAGE_HEIGHT * square.factor) / 2);
  });

  it('keeps the safe area the centre 1728', () => {
    expect(stageFor(1920, 1200)).toMatchObject({ safeLeft: 0, safeWidth: SAFE_WIDTH });
    expect(stageFor(1920, 1080).safeLeft).toBe(96);
    expect(stageFor(2560, 1080).safeLeft).toBe((MAX_WIDTH - SAFE_WIDTH) / 2);
  });

  it('never divides by nothing', () => {
    expect(stageFor(0, 0).factor).toBeGreaterThan(0);
  });
});
