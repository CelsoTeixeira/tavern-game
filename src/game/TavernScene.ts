import Phaser from "phaser";
import {
  createInitialScenario,
  DEMO_SCENARIO,
  formatIngredient,
  formatProduct,
  interactWithCustomer,
  interactWithStation,
  remainingProducts,
  stationProduct,
  tickScenario,
  type ScenarioState,
  type StationId,
} from "./scenario";
import {
  CUSTOMER_SEAT,
  drawRoom,
  OWNER_START,
  ROOM_FURNISHINGS,
  ROOM_INTERIOR_BOUNDS,
  ROOM_WALLS,
  type RoomRectangle,
} from "./room";
import { registerResetHandler, setHudState } from "./hudStore";
import { createSceneHud, type SceneHud } from "./sceneHud";

const OWNER_SPEED_PX_PER_SECOND = 178;
const INTERACTION_RADIUS_PX = 78;
const HUD_PUBLISH_INTERVAL_MS = 100;

type MovementKey = "w" | "a" | "s" | "d" | "arrowup" | "arrowleft" | "arrowdown" | "arrowright";
type TargetId = StationId | "customer";

interface TargetView {
  id: TargetId;
  x: number;
  y: number;
  highlight: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  prompt: Phaser.GameObjects.Text;
}

export class TavernScene extends Phaser.Scene {
  private scenario: ScenarioState = createInitialScenario();
  private owner!: Phaser.GameObjects.Container;
  private ownerBody!: Phaser.Physics.Arcade.Body;
  private aleServingMarker!: Phaser.GameObjects.Container;
  private mealServingMarker!: Phaser.GameObjects.Container;
  private readonly movementKeys = new Set<MovementKey>();
  private readonly targets: TargetView[] = [];
  private activeTarget: TargetId | null = null;
  private nearbyHint: string | null = null;
  private customer: Phaser.GameObjects.Container | null = null;
  private customerStatusApplied: ScenarioState["pedido"]["status"] = "active";
  private sceneHud!: SceneHud;
  private hudPublishElapsedMs = 0;
  private canvas!: HTMLCanvasElement;
  private unregisterReset: (() => void) | null = null;

  private readonly handlePointerDown = (): void => {
    this.canvas.focus({ preventScroll: true });
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (document.activeElement !== this.canvas) return;
    const key = event.key.toLowerCase();
    if (this.isMovementKey(key)) {
      this.movementKeys.add(key);
      event.preventDefault();
      return;
    }
    if (key === "e" && !event.repeat) {
      event.preventDefault();
      this.interact();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (this.isMovementKey(key)) this.movementKeys.delete(key);
  };

  private readonly handleFocusLoss = (): void => {
    this.stopMovement();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") this.stopMovement();
  };

  constructor() {
    super("TavernScene");
  }

  create(): void {
    this.scenario = createInitialScenario();
    drawRoom(this);
    this.createPhysicsAndOwner();
    this.createCustomer();
    this.createTargets();
    this.sceneHud = createSceneHud(this);
    this.sceneHud.update(this.scenario);
    this.bindCanvasInput();
    this.unregisterReset = registerResetHandler(this.resetRoom);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.publishHud();
  }

  update(_time: number, delta: number): void {
    this.updateMovement();
    tickScenario(this.scenario, delta);
    this.updateCustomerStatus();
    this.sceneHud.update(this.scenario);
    this.updateStationLabels();
    this.updateNearbyTarget();

    this.hudPublishElapsedMs += delta;
    if (this.hudPublishElapsedMs >= HUD_PUBLISH_INTERVAL_MS) {
      this.hudPublishElapsedMs %= HUD_PUBLISH_INTERVAL_MS;
      this.publishHud();
    }
  }

  private createPhysicsAndOwner(): void {
    this.physics.world.setBounds(
      ROOM_INTERIOR_BOUNDS.x,
      ROOM_INTERIOR_BOUNDS.y,
      ROOM_INTERIOR_BOUNDS.width,
      ROOM_INTERIOR_BOUNDS.height,
    );

    for (const wall of ROOM_WALLS) this.addStaticCollider(wall);
    for (const furnishing of ROOM_FURNISHINGS) this.addStaticCollider(furnishing);

    this.aleServingMarker = this.add.container(0, 0, [
      this.add.rectangle(18, 0, 10, 12, 0xc58b36),
      this.add.ellipse(18, -6, 12, 5, 0xffe7b0),
      this.add.rectangle(25, 0, 4, 7, 0xc58b36),
    ]).setVisible(false);
    this.mealServingMarker = this.add.container(0, 0, [
      this.add.ellipse(18, 0, 18, 13, 0xf2dfb6),
      this.add.ellipse(18, 0, 11, 7, 0x8f4b2d),
      this.add.ellipse(15, -1, 4, 3, 0x71904f),
    ]).setVisible(false);
    this.owner = this.add.container(OWNER_START.x, OWNER_START.y, [
      this.add.ellipse(0, 12, 24, 8, 0x211711, 0.5),
      this.add.rectangle(0, 5, 20, 18, 0x77402d),
      this.add.rectangle(0, 9, 12, 12, 0xd9b981),
      this.add.circle(0, -7, 7, 0xe3b783),
      this.add.rectangle(0, -13, 14, 5, 0x4c2d20),
      this.aleServingMarker,
      this.mealServingMarker,
    ]).setDepth(8);
    this.physics.add.existing(this.owner);
    this.ownerBody = this.owner.body as Phaser.Physics.Arcade.Body;
    this.ownerBody.setSize(20, 32, false).setOffset(-10, -16);
    this.ownerBody.setCollideWorldBounds(true);

    for (const wall of ROOM_WALLS) this.physics.add.collider(this.owner, this.staticColliderFor(wall.id));
    for (const furnishing of ROOM_FURNISHINGS) this.physics.add.collider(this.owner, this.staticColliderFor(furnishing.id));
  }

  private readonly staticColliders = new Map<string, Phaser.GameObjects.Rectangle>();

  private addStaticCollider(rectangle: RoomRectangle): void {
    const collider = this.add.rectangle(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height,
      0xffffff,
      0,
    ).setVisible(false);
    this.physics.add.existing(collider, true);
    this.staticColliders.set(rectangle.id, collider);
  }

  private staticColliderFor(id: string): Phaser.GameObjects.Rectangle {
    const collider = this.staticColliders.get(id);
    if (!collider) throw new Error(`Missing room collider: ${id}`);
    return collider;
  }

  private createCustomer(): void {
    const x = CUSTOMER_SEAT.x;
    const y = CUSTOMER_SEAT.y;
    this.customer = this.add.container(x, y, [
      this.add.ellipse(0, 13, 27, 8, 0x211711, 0.45),
      this.add.rectangle(0, 7, 22, 18, 0x58715a),
      this.add.circle(0, -8, 8, 0xe6bd8e),
      this.add.rectangle(0, -15, 16, 5, 0x6b3b28),
    ]).setDepth(7);
  }

  private createTargets(): void {
    const promptStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#fff3d7",
      backgroundColor: "#38251b",
      fontFamily: "sans-serif",
      fontSize: "12px",
      fontStyle: "bold",
      padding: { x: 6, y: 4 },
      align: "center",
      wordWrap: { width: 140 },
    };

    const makeStationTarget = (id: StationId, furnishing: RoomRectangle): TargetView => {
      const highlight = this.add.rectangle(
        furnishing.x,
        furnishing.y,
        furnishing.width + 12,
        furnishing.height + 12,
        0xffffff,
        0,
      ).setStrokeStyle(3, 0xf2d18e, 1).setVisible(false).setDepth(6);
      const promptX = id === "keg" ? furnishing.x - 6 : furnishing.x + 22;
      const promptY = furnishing.y + furnishing.height / 2 + 19;
      const prompt = this.add.text(promptX, promptY, "", promptStyle)
        .setOrigin(0.5).setVisible(false).setDepth(12);
      return { id, x: furnishing.x, y: furnishing.y, highlight, prompt };
    };

    const keg = ROOM_FURNISHINGS.find((furnishing) => furnishing.id === "keg");
    const grill = ROOM_FURNISHINGS.find((furnishing) => furnishing.id === "grill");
    if (!keg || !grill) throw new Error("Scene stations are missing from the fixed room layout.");

    this.targets.push(makeStationTarget("keg", keg), makeStationTarget("grill", grill));
    const customerHighlight = this.add.rectangle(CUSTOMER_SEAT.x, CUSTOMER_SEAT.y + 1, 52, 34, 0xffffff, 0)
      .setStrokeStyle(3, 0xf2d18e, 1).setVisible(false).setDepth(9);
    const customerPrompt = this.add.text(CUSTOMER_SEAT.x, CUSTOMER_SEAT.y + 50, "", promptStyle)
      .setOrigin(0.5).setVisible(false).setDepth(12);
    this.targets.push({
      id: "customer",
      x: CUSTOMER_SEAT.x,
      y: CUSTOMER_SEAT.y,
      highlight: customerHighlight,
      prompt: customerPrompt,
    });
  }

  private bindCanvasInput(): void {
    this.canvas = this.game.canvas;
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute("aria-label", "Tavern room. Click here, then use WASD or arrow keys to move and E to interact.");
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("keydown", this.handleKeyDown);
    this.canvas.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("blur", this.handleFocusLoss);
    window.addEventListener("blur", this.handleFocusLoss);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private isMovementKey(key: string): key is MovementKey {
    return key === "w" || key === "a" || key === "s" || key === "d" ||
      key === "arrowup" || key === "arrowleft" || key === "arrowdown" || key === "arrowright";
  }

  private updateMovement(): void {
    let x = Number(this.movementKeys.has("d") || this.movementKeys.has("arrowright")) -
      Number(this.movementKeys.has("a") || this.movementKeys.has("arrowleft"));
    let y = Number(this.movementKeys.has("s") || this.movementKeys.has("arrowdown")) -
      Number(this.movementKeys.has("w") || this.movementKeys.has("arrowup"));
    const length = Math.hypot(x, y);
    if (length > 0) {
      x /= length;
      y /= length;
    }
    this.ownerBody.setVelocity(x * OWNER_SPEED_PX_PER_SECOND, y * OWNER_SPEED_PX_PER_SECOND);
  }

  private updateNearbyTarget(): void {
    let nearest: TargetView | null = null;
    let nearestDistance = INTERACTION_RADIUS_PX;
    for (const target of this.targets) {
      const distance = Phaser.Math.Distance.Between(this.owner.x, this.owner.y, target.x, target.y);
      if (distance <= nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }

    const nextTarget = nearest?.id ?? null;
    const nextHint = nearest ? this.getInteractionHint(nearest.id) : null;
    if (nextTarget === this.activeTarget && nextHint === this.nearbyHint) return;

    this.activeTarget = nextTarget;
    this.nearbyHint = nextHint;
    for (const target of this.targets) {
      const active = target.id === nextTarget;
      target.highlight.setVisible(active);
      if (active && nearest) {
        target.prompt.setText(this.getShortPrompt(nearest.id));
        target.prompt.setVisible(true);
      } else {
        target.prompt.setVisible(false);
      }
    }
    this.publishHud();
  }

  private getInteractionHint(targetId: TargetId): string {
    if (targetId === "customer") {
      if (this.scenario.pedido.status === "served") return "Customer: pedido already served.";
      if (this.scenario.pedido.status === "expired") return "Customer: pedido expired; it cannot be fulfilled.";
      if (this.scenario.carriedItem === null) return "Customer: carry Ale or Meal, then press E to serve.";
      if (this.scenario.pedido.requestedProducts.some((product) =>
        product === this.scenario.carriedItem && !this.scenario.pedido.deliveredProducts.includes(product))) {
        return `E — Serve ${formatProduct(this.scenario.carriedItem)} to the customer.`;
      }
      return `Pedido does not need ${formatProduct(this.scenario.carriedItem)}; it stays in your hands.`;
    }

    const product = stationProduct(targetId);
    const station = this.scenario.stations[targetId];
    if (station.outputReady) {
      return this.scenario.carriedItem === null
        ? `E — Collect ${formatProduct(product)} from the ${targetId}.`
        : `Ready ${formatProduct(product)} at the ${targetId}; your hands are full.`;
    }
    if (station.jobRemainingMs !== null) {
      return `${formatProduct(product)} cooking at the ${targetId}. Press E to check.`;
    }

    const ingredient = DEMO_SCENARIO.recipes[product].ingredient;
    if (this.scenario.stock[ingredient] < 1) {
      return `${targetId} is out of ${formatIngredient(ingredient)}.`;
    }
    return `E — Start ${formatProduct(product)} at the ${targetId}.`;
  }

  private getShortPrompt(targetId: TargetId): string {
    if (targetId === "customer") {
      if (this.scenario.pedido.status === "served") return "Pedido served";
      if (this.scenario.pedido.status === "expired") return "Pedido expired";
      if (this.scenario.carriedItem === null) {
        const neededProducts = remainingProducts(this.scenario).map(formatProduct);
        return neededProducts.length > 0 ? `Needs ${neededProducts.join(" + ")}` : "Pedido complete";
      }
      if (!this.scenario.pedido.requestedProducts.some((product) =>
        product === this.scenario.carriedItem && !this.scenario.pedido.deliveredProducts.includes(product))) {
        return `Does not need ${formatProduct(this.scenario.carriedItem)}`;
      }
      return `E  Serve ${formatProduct(this.scenario.carriedItem)}`;
    }

    const station = this.scenario.stations[targetId];
    const product = formatProduct(stationProduct(targetId));
    if (station.outputReady) {
      return this.scenario.carriedItem === null ? `E  Collect ${product}` : "Hands full";
    }
    if (station.jobRemainingMs !== null) return `Cooking ${product}`;
    const ingredient = DEMO_SCENARIO.recipes[stationProduct(targetId)].ingredient;
    if (this.scenario.stock[ingredient] < 1) return `Out of ${formatIngredient(ingredient)}`;
    return `E  Start ${product}`;
  }

  private interact(): void {
    if (this.activeTarget === "keg" || this.activeTarget === "grill") {
      interactWithStation(this.scenario, this.activeTarget);
    } else if (this.activeTarget === "customer") {
      interactWithCustomer(this.scenario);
    } else {
      return;
    }
    this.updateServingMarker();
    this.nearbyHint = this.getInteractionHint(this.activeTarget);
    const target = this.targets.find((candidate) => candidate.id === this.activeTarget);
    target?.prompt.setText(this.getShortPrompt(this.activeTarget));
    this.publishHud();
  }

  private updateStationLabels(): void {
    for (const targetId of ["keg", "grill"] as const) {
      const target = this.targets.find((candidate) => candidate.id === targetId);
      if (!target) continue;
      const promptText = this.getShortPrompt(targetId);
      if (target.prompt.text !== promptText) target.prompt.setText(promptText);
      if (target.id === this.activeTarget) this.nearbyHint = this.getInteractionHint(targetId);
    }
  }

  private updateCustomerStatus(): void {
    const status = this.scenario.pedido.status;
    if (status === this.customerStatusApplied) return;
    this.customerStatusApplied = status;

    if (status === "expired") this.customer?.setVisible(false);
  }

  private publishHud(): void {
    setHudState(this.scenario, this.nearbyHint);
  }

  private readonly resetRoom = (): void => {
    this.scenario = createInitialScenario();
    this.movementKeys.clear();
    this.ownerBody.reset(OWNER_START.x, OWNER_START.y);
    this.ownerBody.setVelocity(0, 0);
    this.updateServingMarker();
    this.sceneHud.update(this.scenario);
    this.customerStatusApplied = "active";
    this.customer?.setVisible(true);
    this.activeTarget = null;
    this.nearbyHint = null;
    this.hudPublishElapsedMs = 0;
    for (const target of this.targets) {
      target.highlight.setVisible(false);
      target.prompt.setVisible(false);
    }
    this.publishHud();
  };

  private updateServingMarker(): void {
    this.aleServingMarker.setVisible(this.scenario.carriedItem === "ale");
    this.mealServingMarker.setVisible(this.scenario.carriedItem === "meal");
  }

  private stopMovement(): void {
    this.movementKeys.clear();
    if (this.ownerBody) this.ownerBody.setVelocity(0, 0);
  }

  private cleanup(): void {
    this.stopMovement();
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("keydown", this.handleKeyDown);
      this.canvas.removeEventListener("keyup", this.handleKeyUp);
      this.canvas.removeEventListener("blur", this.handleFocusLoss);
    }
    window.removeEventListener("blur", this.handleFocusLoss);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.unregisterReset?.();
    this.unregisterReset = null;
  }
}
