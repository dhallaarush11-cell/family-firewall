import { describe, it, expect } from 'vitest';
import {
  calculateSingleDrillPoints,
  calculateReadinessScore,
  calculateDrillStreak,
  isWeeklyBoosterDue
} from './readiness';

describe('Readiness Score Engine (Unvalidated Heuristic)', () => {
  it('awards 30 points if hung_up', () => {
    const points = calculateSingleDrillPoints({
      hung_up: true,
      shared_info: true,
      shared_otp: true,
      moved_money: true,
      told_someone: false,
      used_pause: false
    });
    expect(points).toBe(30);
  });

  it('awards 25 points if no shared_info and no shared_otp', () => {
    const points = calculateSingleDrillPoints({
      hung_up: false,
      shared_info: false,
      shared_otp: false,
      moved_money: true,
      told_someone: false
    });
    expect(points).toBe(25);
  });

  it('awards 25 points if no moved_money', () => {
    const points = calculateSingleDrillPoints({
      hung_up: false,
      shared_info: true,
      shared_otp: true,
      moved_money: false,
      told_someone: false
    });
    expect(points).toBe(25);
  });

  it('awards 20 points if told_someone or used_pause', () => {
    const pointsTold = calculateSingleDrillPoints({
      hung_up: false,
      shared_info: true,
      shared_otp: true,
      moved_money: true,
      told_someone: true
    });
    expect(pointsTold).toBe(20);

    const pointsPause = calculateSingleDrillPoints({
      hung_up: false,
      shared_info: true,
      shared_otp: true,
      moved_money: true,
      used_pause: true
    });
    expect(pointsPause).toBe(20);
  });

  it('awards 100 points for a completely safe drill', () => {
    const points = calculateSingleDrillPoints({
      hung_up: true,
      shared_info: false,
      shared_otp: false,
      moved_money: false,
      told_someone: true
    });
    expect(points).toBe(100);
  });

  it('calculates weighted average of last 5 drills and categorizes bands', () => {
    const now = 1700000000000;
    // 5 drills, all 100 points, performed recently
    const perfectDrills = [
      { hung_up: true, shared_info: false, shared_otp: false, moved_money: false, told_someone: true, timestamp: now - 3600000 },
      { hung_up: true, shared_info: false, shared_otp: false, moved_money: false, told_someone: true, timestamp: now - 86400000 },
      { hung_up: true, shared_info: false, shared_otp: false, moved_money: false, told_someone: true, timestamp: now - 2 * 86400000 },
      { hung_up: true, shared_info: false, shared_otp: false, moved_money: false, told_someone: true, timestamp: now - 3 * 86400000 },
      { hung_up: true, shared_info: false, shared_otp: false, moved_money: false, told_someone: true, timestamp: now - 4 * 86400000 }
    ];

    const result = calculateReadinessScore(perfectDrills, now);
    expect(result.score).toBe(100);
    expect(result.band).toBe('Ready');
    expect(result.caption).toBe('Readiness, not immunity.');
  });

  it('categorizes intermediate score (40-74) as Building', () => {
    const now = 1700000000000;
    // Drill score: hung up (30) + no money (25) = 55 points
    const drill = {
      hung_up: true,
      shared_info: true,
      shared_otp: false,
      moved_money: false,
      told_someone: false,
      timestamp: now - 10000
    };
    const result = calculateReadinessScore([drill], now);
    expect(result.score).toBe(55);
    expect(result.band).toBe('Building');
  });

  it('categorizes low score (0-39) as Starting', () => {
    const now = 1700000000000;
    // Drill score: only told_someone (20 points)
    const drill = {
      hung_up: false,
      shared_info: true,
      shared_otp: true,
      moved_money: true,
      told_someone: true,
      timestamp: now - 10000
    };
    const result = calculateReadinessScore([drill], now);
    expect(result.score).toBe(20);
    expect(result.band).toBe('Starting');
  });

  it('applies time decay penalty of 10 points per full week after the first week', () => {
    const now = 1700000000000;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Last drill was 8 days ago (1 full week -> 0 penalty weeks)
    const drill8DaysAgo = {
      hung_up: true,
      shared_info: false,
      shared_otp: false,
      moved_money: false,
      told_someone: true,
      timestamp: now - 8 * ONE_DAY
    };
    expect(calculateReadinessScore([drill8DaysAgo], now).score).toBe(100);

    // Last drill was 15 days ago (2 full weeks -> 1 penalty week = -10 points)
    const drill15DaysAgo = {
      ...drill8DaysAgo,
      timestamp: now - 15 * ONE_DAY
    };
    expect(calculateReadinessScore([drill15DaysAgo], now).score).toBe(90);

    // Last drill was 22 days ago (3 full weeks -> 2 penalty weeks = -20 points)
    const drill22DaysAgo = {
      ...drill8DaysAgo,
      timestamp: now - 22 * ONE_DAY
    };
    expect(calculateReadinessScore([drill22DaysAgo], now).score).toBe(80);
  });

  it('clamps scores to 0..100', () => {
    const now = 1700000000000;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    // Low score that decays massively
    const oldDrill = {
      hung_up: false,
      shared_info: true,
      shared_otp: true,
      moved_money: true,
      told_someone: true, // 20 points
      timestamp: now - 100 * ONE_DAY // 14 weeks ago -> -130 points
    };
    const result = calculateReadinessScore([oldDrill], now);
    expect(result.score).toBe(0);
    expect(result.band).toBe('Starting');
  });

  it('computes drill streak accurately', () => {
    const now = 1700000000000;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Drills in week 0, week 1, week 2
    const timestamps = [
      now - 2 * ONE_DAY,  // week 0
      now - 9 * ONE_DAY,  // week 1
      now - 16 * ONE_DAY // week 2
    ];
    expect(calculateDrillStreak(timestamps, now)).toBe(3);

    // If no drill in the last 7 days, streak is 0
    const brokenTimestamps = [
      now - 10 * ONE_DAY,
      now - 17 * ONE_DAY
    ];
    expect(calculateDrillStreak(brokenTimestamps, now)).toBe(0);
  });

  it('identifies when weekly booster is due', () => {
    const now = 1700000000000;
    const ONE_DAY = 24 * 60 * 60 * 1000;

    expect(isWeeklyBoosterDue(null, now)).toBe(true);
    expect(isWeeklyBoosterDue(now - 3 * ONE_DAY, now)).toBe(false);
    expect(isWeeklyBoosterDue(now - 8 * ONE_DAY, now)).toBe(true);
  });
});
