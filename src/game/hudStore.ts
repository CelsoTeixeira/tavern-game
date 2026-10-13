import { createInitialScenario, type Ingredient, type ScenarioState } from "./scenario";

export interface HudState {
  stock: Record<Ingredient, number>;
  coins: number;
  nearbyHint: string | null;
  feedback: string;
}

function createSnapshot(scenario: ScenarioState, nearbyHint: string | null): HudState {
  return {
    stock: { ...scenario.stock },
    coins: scenario.coins,
    nearbyHint,
    feedback: scenario.feedback,
  };
}

let snapshot = createSnapshot(createInitialScenario(), null);
let lastSignature = JSON.stringify(snapshot);
const listeners = new Set<() => void>();
let resetHandler: (() => void) | null = null;

export function getHudState(): HudState {
  return snapshot;
}

export function setHudState(scenario: ScenarioState, nearbyHint: string | null): void {
  const next = createSnapshot(scenario, nearbyHint);
  const signature = JSON.stringify(next);
  if (signature === lastSignature) return;

  snapshot = next;
  lastSignature = signature;
  for (const listener of listeners) listener();
}

export function subscribeHud(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function registerResetHandler(handler: () => void): () => void {
  resetHandler = handler;
  return () => {
    if (resetHandler === handler) resetHandler = null;
  };
}

export function requestRoomReset(): void {
  resetHandler?.();
}
