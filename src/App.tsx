import { useSyncExternalStore } from "react";
import { GameCanvas } from "./GameCanvas";
import {
  getHudState,
  requestRoomReset,
  subscribeHud,
} from "./game/hudStore";

export function App() {
  const state = useSyncExternalStore(subscribeHud, getHudState, getHudState);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="title-block">
          <p className="eyebrow">Small scene · service loop</p>
          <h1>The Copper Kettle</h1>
        </div>

        <div className="header-tools">
          <dl aria-label="Stock and coins" className="resource-strip">
            <div>
              <dt>Malt</dt>
              <dd>{state.stock.malt}</dd>
            </div>
            <div>
              <dt>Meat</dt>
              <dd>{state.stock.meat}</dd>
            </div>
            <div>
              <dt>Coins</dt>
              <dd>{state.coins}</dd>
            </div>
          </dl>
          <button className="reset-button" onClick={requestRoomReset} type="button">
            Reset room
          </button>
        </div>
      </header>

      <section aria-labelledby="room-heading" className="room-panel">
        <div className="panel-heading">
          <h2 id="room-heading">Taproom</h2>
          <p>Click the room, then use WASD or arrows to move and E to interact.</p>
        </div>
        <GameCanvas />
        <p aria-live="polite" className="scene-status" role="status">
          {state.nearbyHint ?? state.feedback}
        </p>
      </section>
    </main>
  );
}
