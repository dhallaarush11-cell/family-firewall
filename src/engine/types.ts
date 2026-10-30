export type Flag =
  | 'hung_up'
  | 'told_someone'
  | 'used_pause'
  | 'shared_info'
  | 'shared_otp'
  | 'moved_money';

export type Tactic =
  | 'authority'
  | 'urgency'
  | 'isolation'
  | 'secrecy'
  | 'fear'
  | 'info_request'
  | 'payment_request';

export type LocalizedString = {
  en: string;
  hing: string;
  hi: string;
};

export interface ScenarioOption {
  id: string;
  label: LocalizedString;
  flags: Flag[];
  calm?: boolean;
  next: string; // node ID or "END"
}

export interface ScenarioNode {
  speaker: 'caller';
  tactics: Tactic[];
  pressureDelta: number;
  text: LocalizedString;
  options: ScenarioOption[];
}

export interface Scenario {
  id: string;
  version: number;
  start: string;
  title: LocalizedString;
  caller: LocalizedString;
  nodes: Record<string, ScenarioNode>;
}

export type PressureBand = 'Calm' | 'Rising' | 'High pressure';

export type Outcome = 'safe' | 'almost' | 'retry';

export interface HistoryStep {
  nodeId: string;
  optionChosen: ScenarioOption;
  flagsAdded: Flag[];
  pressureBeforeOption: number;
  pressureAfterOption: number;
}
