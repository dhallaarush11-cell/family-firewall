import type {
  Scenario,
  ScenarioNode,
  ScenarioOption,
  Flag,
  Tactic,
  PressureBand,
  Outcome,
  HistoryStep
} from './types';

export * from './types';

export function clampPressure(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function getPressureBand(pressure: number): PressureBand {
  const clamped = clampPressure(pressure);
  if (clamped <= 39) return 'Calm';
  if (clamped <= 69) return 'Rising';
  return 'High pressure';
}

export function calculateOutcome(flags: Set<Flag> | Flag[]): Outcome {
  const flagSet = flags instanceof Set ? flags : new Set(flags);
  const hasMovedMoney = flagSet.has('moved_money');
  const hasSharedOtp = flagSet.has('shared_otp');
  const hasSharedInfo = flagSet.has('shared_info');
  const hasHungUp = flagSet.has('hung_up');
  const hasToldSomeone = flagSet.has('told_someone');
  const hasUsedPause = flagSet.has('used_pause');

  if (hasMovedMoney) {
    return 'retry';
  }

  const riskyActionsAbsent = !hasMovedMoney && !hasSharedOtp && !hasSharedInfo;
  const safeActionsPresent = hasHungUp || hasToldSomeone || hasUsedPause;

  if (riskyActionsAbsent && safeActionsPresent) {
    return 'safe';
  }

  return 'almost';
}

export class DrillEngine {
  private scenario: Scenario;
  private currentNodeId: string | 'END';
  private pressure: number;
  private flags: Set<Flag>;
  private tacticsSeen: Set<Tactic>;
  private history: HistoryStep[];
  private isComplete: boolean;
  private outcome?: Outcome;

  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.currentNodeId = scenario.start;
    this.flags = new Set<Flag>();
    this.tacticsSeen = new Set<Tactic>();
    this.history = [];
    this.isComplete = false;

    // Starts at 20
    let initialPressure = 20;

    // When a caller node is shown, add its pressureDelta
    const startNode = this.scenario.nodes[this.currentNodeId];
    if (startNode) {
      if (startNode.speaker === 'caller') {
        initialPressure += startNode.pressureDelta;
        for (const t of startNode.tactics) {
          this.tacticsSeen.add(t);
        }
      }
    }

    this.pressure = clampPressure(initialPressure);
  }

  public getScenario(): Scenario {
    return this.scenario;
  }

  public getCurrentNodeId(): string | 'END' {
    return this.currentNodeId;
  }

  public getCurrentNode(): ScenarioNode | null {
    if (this.currentNodeId === 'END') return null;
    return this.scenario.nodes[this.currentNodeId] || null;
  }

  public getPressure(): number {
    return this.pressure;
  }

  public getPressureBand(): PressureBand {
    return getPressureBand(this.pressure);
  }

  public getFlags(): Flag[] {
    return Array.from(this.flags);
  }

  public getTacticsSeen(): Tactic[] {
    return Array.from(this.tacticsSeen);
  }

  public getHistory(): HistoryStep[] {
    return [...this.history];
  }

  public isFinished(): boolean {
    return this.isComplete;
  }

  public getOutcome(): Outcome | undefined {
    return this.outcome;
  }

  public chooseOption(optionId: string): {
    option: ScenarioOption;
    nextNodeId: string | 'END';
    pressure: number;
    band: PressureBand;
    isComplete: boolean;
    outcome?: Outcome;
  } {
    if (this.isComplete || this.currentNodeId === 'END') {
      throw new Error('Drill is already complete');
    }

    const currentNode = this.getCurrentNode();
    if (!currentNode) {
      throw new Error(`Node ${this.currentNodeId} not found in scenario`);
    }

    const option = currentNode.options.find(opt => opt.id === optionId);
    if (!option) {
      throw new Error(`Option ${optionId} not found in node ${this.currentNodeId}`);
    }

    const pressureBefore = this.pressure;

    // Collect flags
    for (const flag of option.flags) {
      this.flags.add(flag);
    }

    // When the user chooses an option marked calm, subtract 10
    let nextPressure = this.pressure;
    if (option.calm) {
      nextPressure -= 10;
    }
    nextPressure = clampPressure(nextPressure);

    // Record step in history
    this.history.push({
      nodeId: this.currentNodeId,
      optionChosen: option,
      flagsAdded: [...option.flags],
      pressureBeforeOption: pressureBefore,
      pressureAfterOption: nextPressure
    });

    const nextId = option.next;
    this.currentNodeId = nextId;

    if (nextId === 'END') {
      this.isComplete = true;
      this.outcome = calculateOutcome(this.flags);
      this.pressure = nextPressure;
    } else {
      const nextNode = this.scenario.nodes[nextId];
      if (!nextNode) {
        throw new Error(`Target node ${nextId} not found in scenario`);
      }
      if (nextNode.speaker === 'caller') {
        nextPressure += nextNode.pressureDelta;
        for (const t of nextNode.tactics) {
          this.tacticsSeen.add(t);
        }
      }
      this.pressure = clampPressure(nextPressure);
    }

    return {
      option,
      nextNodeId: this.currentNodeId,
      pressure: this.pressure,
      band: this.getPressureBand(),
      isComplete: this.isComplete,
      outcome: this.outcome
    };
  }
}

// Backward compatibility alias for any existing reference
export const DeterministicDrillEngine = DrillEngine;
