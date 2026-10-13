import Phaser from "phaser";
import { CUSTOMER_SEAT, ROOM_FURNISHINGS } from "./room";
import {
  DEMO_SCENARIO,
  type Product,
  type ScenarioState,
  type StationId,
} from "./scenario";

const STATION_IDS: readonly StationId[] = ["keg", "grill"];
const PRODUCT_BY_STATION: Record<StationId, Product> = {
  keg: "ale",
  grill: "meal",
};

interface StationIndicator {
  id: StationId;
  product: Product;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  ring: Phaser.GameObjects.Graphics;
  readyBadge: Phaser.GameObjects.Graphics;
  status: "idle" | "cooking" | "ready";
}

interface ProductIndicator {
  product: Product;
  container: Phaser.GameObjects.Container;
  neededMarker: Phaser.GameObjects.Arc;
  statusBadge: Phaser.GameObjects.Graphics;
}

export interface SceneHud {
  update(scenario: ScenarioState): void;
}

export function createSceneHud(scene: Phaser.Scene): SceneHud {
  const order = createOrderIndicator(scene);
  const stations = STATION_IDS.map((id) => createStationIndicator(scene, id));

  return {
    update(scenario) {
      updateOrderIndicator(order, scenario);
      for (const indicator of stations) updateStationIndicator(indicator, scenario);
    },
  };
}

function createOrderIndicator(scene: Phaser.Scene): {
  container: Phaser.GameObjects.Container;
  products: ProductIndicator[];
  deadlineTimer: Phaser.GameObjects.Graphics;
  status: Phaser.GameObjects.Graphics;
} {
  const container = scene.add.container(CUSTOMER_SEAT.x, CUSTOMER_SEAT.y - 28).setDepth(11);
  const products = [
    createProductIndicator(scene, "ale", -11),
    createProductIndicator(scene, "meal", 11),
  ];
  for (const product of products) container.add(product.container);

  const deadlineTimer = scene.add.graphics();
  const status = scene.add.graphics();
  container.add([deadlineTimer, status]);

  return { container, products, deadlineTimer, status };
}

function createProductIndicator(scene: Phaser.Scene, product: Product, x: number): ProductIndicator {
  const background = scene.add.circle(0, 0, 9, 0x261912).setStrokeStyle(1, 0x9a7046);
  const icon = scene.add.graphics();
  drawProductIcon(icon, product, 0.72);
  const neededMarker = scene.add.circle(6, 6, 2, 0xe4bb77);
  const statusBadge = scene.add.graphics();
  const container = scene.add.container(x, 0, [background, icon, neededMarker, statusBadge]);
  return { product, container, neededMarker, statusBadge };
}

function drawProductIcon(graphics: Phaser.GameObjects.Graphics, product: Product, scale = 1): void {
  graphics.setScale(scale);
  if (product === "ale") {
    graphics.fillStyle(0xd99d45, 1);
    graphics.fillRoundedRect(-4, -4, 8, 9, 1);
    graphics.fillStyle(0xffe7b0, 1);
    graphics.fillEllipse(0, -4, 8, 3);
    graphics.lineStyle(1.5, 0xffe7b0, 1);
    graphics.strokeCircle(4, 0, 2.5);
    graphics.lineStyle(1, 0x7e4c24, 1);
    graphics.strokeRoundedRect(-4, -4, 8, 9, 1);
  } else {
    graphics.fillStyle(0xf2dfb6, 1);
    graphics.fillEllipse(0, 0, 16, 12);
    graphics.lineStyle(1, 0x76513a, 1);
    graphics.strokeEllipse(0, 0, 16, 12);
    graphics.fillStyle(0x8f4b2d, 1);
    graphics.fillEllipse(0, 0, 10, 7);
    graphics.fillStyle(0x91aa60, 1);
    graphics.fillEllipse(-1, -1, 4, 3);
  }
}

function updateOrderIndicator(
  indicator: ReturnType<typeof createOrderIndicator>,
  scenario: ScenarioState,
): void {
  const { pedido } = scenario;
  for (const product of indicator.products) {
    const requested = pedido.status !== "expired" &&
      pedido.requestedProducts.includes(product.product);
    const delivered = pedido.deliveredProducts.includes(product.product);
    product.container.setVisible(requested);
    product.neededMarker.setVisible(requested && !delivered);
    product.statusBadge.clear();
    product.statusBadge.setVisible(requested && delivered);
    if (requested && delivered) drawCheckBadge(product.statusBadge, 6, -6, 4, 0x4f794d, 0xf1ffe6);
  }

  if (pedido.status === "active") {
    const progress = clampProgress(pedido.remainingMs / DEMO_SCENARIO.pedidoDurationMs);
    const color = pedido.remainingMs <= 10_000 ? 0xffab89 : 0xf1c980;
    drawProgressDisc(indicator.deadlineTimer, 33, 0, 6, progress, 0x806547, color);
    indicator.deadlineTimer.setVisible(true);
    indicator.status.clear().setVisible(false);
    return;
  }

  indicator.deadlineTimer.clear().setVisible(false);
  indicator.status.clear();
  if (pedido.status === "served") {
    drawCheckBadge(indicator.status, 33, 0, 7, 0x4f794d, 0xf1ffe6);
  } else {
    drawCrossBadge(indicator.status, 33, 0, 7, 0x74453b, 0xffc0a7);
  }
  indicator.status.setVisible(true);
}

function drawCheckBadge(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  fillColor: number,
  strokeColor: number,
): void {
  graphics.fillStyle(fillColor, 1);
  graphics.fillCircle(x, y, radius);
  graphics.lineStyle(1.4, strokeColor, 1);
  graphics.beginPath();
  graphics.moveTo(x - radius * 0.48, y);
  graphics.lineTo(x - radius * 0.12, y + radius * 0.38);
  graphics.lineTo(x + radius * 0.5, y - radius * 0.42);
  graphics.strokePath();
}

function drawCrossBadge(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  fillColor: number,
  strokeColor: number,
): void {
  graphics.fillStyle(fillColor, 1);
  graphics.fillCircle(x, y, radius);
  graphics.lineStyle(1.4, strokeColor, 1);
  graphics.beginPath();
  graphics.moveTo(x - radius * 0.35, y - radius * 0.35);
  graphics.lineTo(x + radius * 0.35, y + radius * 0.35);
  graphics.moveTo(x + radius * 0.35, y - radius * 0.35);
  graphics.lineTo(x - radius * 0.35, y + radius * 0.35);
  graphics.strokePath();
}

function drawProgressRing(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  progress: number,
  trackColor: number,
  arcColor: number,
): void {
  graphics.clear();
  const clampedProgress = clampProgress(progress);
  graphics.lineStyle(1.75, trackColor, 1);
  graphics.strokeCircle(x, y, radius);
  if (clampedProgress === 0) return;

  graphics.lineStyle(1.75, arcColor, 1);
  if (clampedProgress === 1) {
    graphics.strokeCircle(x, y, radius);
    return;
  }

  const startAngle = -Math.PI / 2;
  graphics.beginPath();
  graphics.arc(x, y, radius, startAngle, startAngle + Math.PI * 2 * clampedProgress, false);
  graphics.strokePath();
}

function drawProgressDisc(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  progress: number,
  trackColor: number,
  arcColor: number,
): void {
  graphics.clear();
  const clampedProgress = clampProgress(progress);
  graphics.fillStyle(trackColor, 1);
  graphics.fillCircle(x, y, radius);
  if (clampedProgress === 0) return;

  graphics.fillStyle(arcColor, 1);
  if (clampedProgress === 1) {
    graphics.fillCircle(x, y, radius);
    return;
  }

  const startAngle = -Math.PI / 2;
  graphics.beginPath();
  graphics.moveTo(x, y);
  graphics.arc(x, y, radius, startAngle, startAngle + Math.PI * 2 * clampedProgress, false);
  graphics.closePath();
  graphics.fillPath();
}

function clampProgress(progress: number): number {
  return Number.isFinite(progress) ? Phaser.Math.Clamp(progress, 0, 1) : 0;
}

function createStationIndicator(scene: Phaser.Scene, id: StationId): StationIndicator {
  const furnishing = ROOM_FURNISHINGS.find((item) => item.id === id);
  if (!furnishing) throw new Error(`Scene station is missing from the fixed room layout: ${id}`);

  const product = PRODUCT_BY_STATION[id];
  const container = scene.add.container(
    furnishing.x,
    furnishing.y - furnishing.height / 2 - 12,
  ).setDepth(9).setVisible(false);
  const background = scene.add.graphics();
  const ring = scene.add.graphics();
  const icon = scene.add.graphics();
  drawProductIcon(icon, product, 0.72);
  const readyBadge = scene.add.graphics();
  container.add([background, ring, icon, readyBadge]);

  return { id, product, container, background, ring, readyBadge, status: "idle" };
}

function updateStationIndicator(indicator: StationIndicator, scenario: ScenarioState): void {
  const station = scenario.stations[indicator.id];
  const status = station.outputReady
    ? "ready"
    : station.jobRemainingMs === null
      ? "idle"
      : "cooking";

  if (status !== indicator.status) {
    indicator.status = status;
    drawStationBackground(indicator.background, status);
    indicator.container.setVisible(status !== "idle");
  }
  if (status === "idle") {
    indicator.ring.clear();
    indicator.readyBadge.clear();
    return;
  }

  const durationMs = DEMO_SCENARIO.recipes[indicator.product].durationMs;
  const progress = status === "ready"
    ? 1
    : clampProgress((durationMs - (station.jobRemainingMs ?? durationMs)) / durationMs);
  drawProgressRing(
    indicator.ring,
    0,
    0,
    11,
    progress,
    0x806547,
    status === "ready" ? 0x82bd78 : 0xe4bb77,
  );
  indicator.readyBadge.clear();
  if (status === "ready") drawCheckBadge(indicator.readyBadge, 8, -8, 4.5, 0x4f794d, 0xf1ffe6);
}

function drawStationBackground(
  graphics: Phaser.GameObjects.Graphics,
  status: StationIndicator["status"],
): void {
  graphics.clear();
  if (status === "ready") {
    graphics.fillStyle(0x29412d, 0.98);
    graphics.lineStyle(1, 0x8db37e, 1);
  } else {
    graphics.fillStyle(0x38251b, 0.98);
    graphics.lineStyle(1, 0xa67a43, 1);
  }
  graphics.fillCircle(0, 0, 9);
  graphics.strokeCircle(0, 0, 9);
}
