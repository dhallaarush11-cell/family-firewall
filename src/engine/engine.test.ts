import { describe, it, expect } from 'vitest';
import {
  DrillEngine,
  clampPressure,
  getPressureBand,
  calculateOutcome,
  type Scenario
} from './index';
import digitalArrestScenario from '../scenarios/digital_arrest.json';

const scenario = digitalArrestScenario as Scenario;

describe('Scenario Engine & Rules', () => {
  describe('Pressure Clamp & Bands', () => {
    it('clamps pressure values within 0 to 100', () => {
      expect(clampPressure(-25)).toBe(0);
      expect(clampPressure(0)).toBe(0);
      expect(clampPressure(50)).toBe(50);
      expect(clampPressure(100)).toBe(100);
      expect(clampPressure(150)).toBe(100);
    });

    it('categorizes pressure into correct bands: Calm, Rising, High pressure', () => {
      // 0-39: Calm
      expect(getPressureBand(0)).toBe('Calm');
      expect(getPressureBand(20)).toBe('Calm');
      expect(getPressureBand(39)).toBe('Calm');

      // 40-69: Rising
      expect(getPressureBand(40)).toBe('Rising');
      expect(getPressureBand(55)).toBe('Rising');
      expect(getPressureBand(69)).toBe('Rising');

      // 70-100: High pressure
      expect(getPressureBand(70)).toBe('High pressure');
      expect(getPressureBand(85)).toBe('High pressure');
      expect(getPressureBand(100)).toBe('High pressure');
      // out of bounds clamp check
      expect(getPressureBand(120)).toBe('High pressure');
      expect(getPressureBand(-10)).toBe('Calm');
    });
  });

  describe('Outcome Determination Rules', () => {
    it('returns "retry" if moved_money is present', () => {
      expect(calculateOutcome(['moved_money', 'hung_up', 'used_pause'])).toBe('retry');
      expect(calculateOutcome(['moved_money'])).toBe('retry');
      expect(calculateOutcome(['moved_money', 'shared_otp', 'shared_info'])).toBe('retry');
    });

    it('returns "safe" if moved_money, shared_otp, and shared_info are all absent AND at least one safe flag is present', () => {
      expect(calculateOutcome(['hung_up'])).toBe('safe');
      expect(calculateOutcome(['told_someone'])).toBe('safe');
      expect(calculateOutcome(['used_pause'])).toBe('safe');
      expect(calculateOutcome(['hung_up', 'told_someone', 'used_pause'])).toBe('safe');
    });

    it('returns "almost" if moved_money is absent but safe conditions are not met', () => {
      // Risky flags present
      expect(calculateOutcome(['shared_otp', 'hung_up'])).toBe('almost');
      expect(calculateOutcome(['shared_info', 'told_someone'])).toBe('almost');
      expect(calculateOutcome(['shared_info', 'shared_otp', 'used_pause'])).toBe('almost');

      // No flags at all (safe action missing)
      expect(calculateOutcome([])).toBe('almost');
    });
  });

  describe('Engine Initial State & Pressure Dynamics', () => {
    it('starts at 20 and adds initial caller node pressureDelta', () => {
      const engine = new DrillEngine(scenario);
      // Starts at 20, n1 has pressureDelta = 20 -> 20 + 20 = 40
      expect(engine.getPressure()).toBe(40);
      expect(engine.getPressureBand()).toBe('Rising');
      expect(engine.getCurrentNodeId()).toBe('n1');
      expect(engine.isFinished()).toBe(false);
      expect(engine.getTacticsSeen()).toEqual(['authority', 'fear']);
    });

    it('reduces pressure by 10 when calm option is chosen', () => {
      const engine = new DrillEngine(scenario);
      // n1:b has calm: true, next: n2 (which has pressureDelta: 25)
      // Initial: 40 -> option chosen: 40 - 10 = 30 -> enter n2: 30 + 25 = 55
      const res = engine.chooseOption('b');
      expect(res.nextNodeId).toBe('n2');
      expect(engine.getPressure()).toBe(55);
      expect(engine.getPressureBand()).toBe('Rising');
    });

    it('does not reduce pressure when non-calm option is chosen', () => {
      const engine = new DrillEngine(scenario);
      // n1:c has no calm, next: n2 (pressureDelta: 25)
      // Initial: 40 -> option chosen: 40 -> enter n2: 40 + 25 = 65
      const res = engine.chooseOption('c');
      expect(res.nextNodeId).toBe('n2');
      expect(engine.getPressure()).toBe(65);
    });
  });

  describe('Every Path in Digital Arrest Scenario', () => {
    // Collect all terminal paths via depth-first search
    function findAllPaths(nodeId: string, currentPath: string[]): string[][] {
      if (nodeId === 'END') {
        return [currentPath];
      }
      const node = scenario.nodes[nodeId];
      if (!node) return [];

      const paths: string[][] = [];
      for (const opt of node.options) {
        paths.push(...findAllPaths(opt.next, [...currentPath, opt.id]));
      }
      return paths;
    }

    const allPaths = findAllPaths(scenario.start, []);

    it('finds all 23 valid terminal paths in the scenario graph', () => {
      expect(allPaths.length).toBe(23);
    });

    allPaths.forEach((path, idx) => {
      it(`executes Path #${idx + 1}: [${path.join(' -> ')}] correctly`, () => {
        const engine = new DrillEngine(scenario);
        let finalOutcome;

        for (const optionId of path) {
          const stepRes = engine.chooseOption(optionId);
          if (stepRes.isComplete) {
            finalOutcome = stepRes.outcome;
          }
        }

        expect(engine.isFinished()).toBe(true);
        expect(engine.getCurrentNodeId()).toBe('END');
        expect(engine.getCurrentNode()).toBeNull();
        expect(finalOutcome).toBeDefined();
        expect(engine.getOutcome()).toBe(finalOutcome);

        const flags = engine.getFlags();
        const hasMovedMoney = flags.includes('moved_money');
        const hasSharedOtp = flags.includes('shared_otp');
        const hasSharedInfo = flags.includes('shared_info');
        const safeFlags = ['hung_up', 'told_someone', 'used_pause'];
        const hasSafeFlag = flags.some(f => safeFlags.includes(f));

        if (hasMovedMoney) {
          expect(finalOutcome).toBe('retry');
        } else if (!hasSharedOtp && !hasSharedInfo && hasSafeFlag) {
          expect(finalOutcome).toBe('safe');
        } else {
          expect(finalOutcome).toBe('almost');
        }

        // Pressure must always be bounded
        expect(engine.getPressure()).toBeGreaterThanOrEqual(0);
        expect(engine.getPressure()).toBeLessThanOrEqual(100);
      });
    });

    // Explicit specific path assertions
    it('Path n1:a ends immediately with "safe"', () => {
      const engine = new DrillEngine(scenario);
      const res = engine.chooseOption('a');
      expect(res.isComplete).toBe(true);
      expect(res.outcome).toBe('safe');
      expect(engine.getFlags()).toEqual(expect.arrayContaining(['hung_up', 'told_someone']));
    });

    it('Path n1:b -> n2:b -> n3:b -> n4:c ends with "retry" due to moved_money', () => {
      const engine = new DrillEngine(scenario);
      engine.chooseOption('b'); // n1:b -> n2
      engine.chooseOption('b'); // n2:b -> n3
      engine.chooseOption('b'); // n3:b -> n4
      const res = engine.chooseOption('c'); // n4:c -> END (moved_money)
      expect(res.isComplete).toBe(true);
      expect(res.outcome).toBe('retry');
      expect(engine.getFlags()).toContain('moved_money');
    });

    it('Path n1:c -> n2:c -> n3:b -> n4:a ends with "almost" (gave info & OTP, then hung up)', () => {
      const engine = new DrillEngine(scenario);
      engine.chooseOption('c'); // n1:c -> n2
      engine.chooseOption('c'); // n2:c -> n3
      engine.chooseOption('b'); // n3:b -> n4 (shared_info, shared_otp)
      const res = engine.chooseOption('a'); // n4:a -> END (hung_up)
      expect(res.isComplete).toBe(true);
      expect(res.outcome).toBe('almost');
      expect(engine.getFlags()).toContain('shared_otp');
      expect(engine.getFlags()).toContain('shared_info');
      expect(engine.getFlags()).toContain('hung_up');
      expect(engine.getFlags()).not.toContain('moved_money');
    });
  });
});
