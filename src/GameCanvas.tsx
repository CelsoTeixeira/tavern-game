import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./game/room";
import { TavernScene } from "./game/TavernScene";

export function GameCanvas() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    let game: Phaser.Game | null = null;
    const startupFrame = window.requestAnimationFrame(() => {
      if (!parent.isConnected) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: "#241812",
        audio: { noAudio: true },
        physics: {
          default: "arcade",
          arcade: { debug: false },
        },
        scale: {
          width: ROOM_WIDTH,
          height: ROOM_HEIGHT,
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [TavernScene],
      });
    });

    return () => {
      window.cancelAnimationFrame(startupFrame);
      game?.destroy(true);
    };
  }, []);

  return <div className="game-canvas-host" ref={host} />;
}
