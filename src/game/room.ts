import type Phaser from "phaser";

export const ROOM_WIDTH = 800;
export const ROOM_HEIGHT = 520;
export const ROOM_INTERIOR_BOUNDS = { x: 39, y: 39, width: 722, height: 432 } as const;

export interface RoomRectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "wall" | "table" | "chair" | "keg" | "grill";
}

export const ROOM_WALLS: RoomRectangle[] = [
  { id: "north-wall", x: 400, y: 30, width: 740, height: 18, kind: "wall" },
  { id: "west-wall", x: 30, y: 255, width: 18, height: 450, kind: "wall" },
  { id: "east-wall", x: 770, y: 255, width: 18, height: 450, kind: "wall" },
  { id: "south-wall-west", x: 190, y: 480, width: 320, height: 18, kind: "wall" },
  { id: "south-wall-east", x: 610, y: 480, width: 320, height: 18, kind: "wall" },
];

export const ROOM_FURNISHINGS: RoomRectangle[] = [
  { id: "keg", x: 132, y: 94, width: 60, height: 62, kind: "keg" },
  { id: "grill", x: 668, y: 94, width: 100, height: 62, kind: "grill" },
  { id: "west-table", x: 290, y: 180, width: 140, height: 76, kind: "table" },
  { id: "east-table", x: 540, y: 180, width: 140, height: 76, kind: "table" },
  { id: "west-seat-customer", x: 240, y: 259, width: 40, height: 36, kind: "chair" },
  { id: "west-seat-empty", x: 340, y: 259, width: 40, height: 36, kind: "chair" },
  { id: "east-seat-west", x: 490, y: 259, width: 40, height: 36, kind: "chair" },
  { id: "east-seat-east", x: 590, y: 259, width: 40, height: 36, kind: "chair" },
];

export const OWNER_START = { x: 400, y: 410 } as const;
export const CUSTOMER_SEAT = { x: 240, y: 255 } as const;

export function drawRoom(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x241812, 1);
  graphics.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

  graphics.fillStyle(0x8a6243, 1);
  graphics.fillRect(
    ROOM_INTERIOR_BOUNDS.x,
    ROOM_INTERIOR_BOUNDS.y,
    ROOM_INTERIOR_BOUNDS.width,
    ROOM_INTERIOR_BOUNDS.height,
  );
  for (let y = 55; y < 466; y += 40) {
    graphics.lineStyle(1, 0x4c3427, 0.5);
    graphics.lineBetween(40, y, 760, y);
  }
  for (let x = 55; x < 750; x += 48) {
    graphics.lineStyle(1, 0x4c3427, 0.3);
    graphics.lineBetween(x, 40, x, 470);
  }

  graphics.fillStyle(0x573522, 1);
  graphics.lineStyle(2, 0x392316, 1);
  for (const wall of ROOM_WALLS) {
    graphics.fillRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
    graphics.strokeRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
  }

  graphics.fillStyle(0xc39a62, 1);
  graphics.fillRect(357, 447, 86, 26);
  graphics.lineStyle(2, 0x745033, 1);
  graphics.strokeRect(357, 447, 86, 26);
  scene.add.text(400, 459, "ENTRANCE", {
    color: "#5e3d29",
    fontFamily: "sans-serif",
    fontSize: "10px",
    fontStyle: "bold",
  }).setOrigin(0.5).setDepth(2);

  for (const furnishing of ROOM_FURNISHINGS) {
    drawFurnishing(graphics, furnishing);
  }

  scene.add.text(400, 70, "THE COPPER KETTLE", {
    color: "#f4d4a3",
    fontFamily: "sans-serif",
    fontSize: "15px",
    fontStyle: "bold",
    letterSpacing: 2,
  }).setOrigin(0.5).setDepth(2);
}

function drawFurnishing(graphics: Phaser.GameObjects.Graphics, furnishing: RoomRectangle): void {
  const left = furnishing.x - furnishing.width / 2;
  const top = furnishing.y - furnishing.height / 2;

  if (furnishing.kind === "table") {
    graphics.fillStyle(0x4d3022, 1);
    graphics.fillRect(left, top, furnishing.width, furnishing.height);
    graphics.fillStyle(0x8b5736, 1);
    graphics.fillRect(left + 5, top + 5, furnishing.width - 10, furnishing.height - 10);
    graphics.lineStyle(2, 0x3c251a, 1);
    graphics.strokeRect(left, top, furnishing.width, furnishing.height);
    graphics.fillStyle(0xe2c48d, 1);
    graphics.fillEllipse(furnishing.x - 25, furnishing.y, 23, 15);
    graphics.fillEllipse(furnishing.x + 25, furnishing.y, 23, 15);
    return;
  }

  if (furnishing.kind === "chair") {
    graphics.fillStyle(0x4d3022, 1);
    graphics.fillRect(left, top, furnishing.width, furnishing.height);
    graphics.fillStyle(0xb6804f, 1);
    graphics.fillRect(left + 5, top + 5, furnishing.width - 10, furnishing.height - 10);
    graphics.lineStyle(2, 0x3c251a, 1);
    graphics.strokeRect(left, top, furnishing.width, furnishing.height);
    return;
  }

  if (furnishing.kind === "keg") {
    graphics.fillStyle(0x4b2c1d, 1);
    graphics.fillRect(left, top, furnishing.width, furnishing.height);
    graphics.fillStyle(0x9a6236, 1);
    graphics.fillRect(left + 5, top + 5, furnishing.width - 10, furnishing.height - 10);
    graphics.lineStyle(3, 0x5a371f, 1);
    graphics.lineBetween(furnishing.x, top + 6, furnishing.x, top + furnishing.height - 6);
    graphics.lineStyle(4, 0xc09a61, 1);
    graphics.lineBetween(left + 5, furnishing.y - 12, left + furnishing.width - 5, furnishing.y - 12);
    graphics.lineBetween(left + 5, furnishing.y + 12, left + furnishing.width - 5, furnishing.y + 12);
    graphics.lineStyle(2, 0x332116, 1);
    graphics.strokeRect(left, top, furnishing.width, furnishing.height);
    return;
  }

  if (furnishing.kind === "grill") {
    graphics.fillStyle(0x302b27, 1);
    graphics.fillRect(left, top, furnishing.width, furnishing.height);
    graphics.fillStyle(0x706052, 1);
    graphics.fillRect(left + 5, top + 5, furnishing.width - 10, furnishing.height - 10);
    graphics.lineStyle(3, 0x27221e, 1);
    for (let x = left + 17; x < left + furnishing.width - 7; x += 14) {
      graphics.lineBetween(x, top + 7, x, top + furnishing.height - 7);
    }
    graphics.lineStyle(2, 0x27221e, 1);
    graphics.strokeRect(left, top, furnishing.width, furnishing.height);
  }
}
