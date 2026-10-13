export type Product = "ale" | "meal";
export type Ingredient = "malt" | "meat";
export type StationId = "keg" | "grill";
export type PedidoStatus = "active" | "served" | "expired";

export const DEMO_SCENARIO = {
  startingStock: { malt: 1, meat: 1 },
  startingCoins: 0,
  pedidoDurationMs: 75_000,
  payout: 16,
  recipes: {
    ale: { station: "keg", ingredient: "malt", durationMs: 4_500 },
    meal: { station: "grill", ingredient: "meat", durationMs: 6_500 },
  },
} as const;

export interface StationState {
  jobRemainingMs: number | null;
  outputReady: boolean;
}

export interface ScenarioState {
  stock: Record<Ingredient, number>;
  coins: number;
  stations: Record<StationId, StationState>;
  carriedItem: Product | null;
  pedido: {
    requestedProducts: Product[];
    deliveredProducts: Product[];
    remainingMs: number;
    status: PedidoStatus;
  };
  feedback: string;
}

const PRODUCT_BY_STATION: Record<StationId, Product> = {
  keg: "ale",
  grill: "meal",
};

const STATION_NAME: Record<StationId, string> = {
  keg: "Keg",
  grill: "Grill",
};

const INGREDIENT_NAME: Record<Ingredient, string> = {
  malt: "malt",
  meat: "meat",
};

export function formatProduct(product: Product): string {
  return product === "ale" ? "Ale" : "Meal";
}

export function formatIngredient(ingredient: Ingredient): string {
  return INGREDIENT_NAME[ingredient];
}

export function createInitialScenario(): ScenarioState {
  return {
    stock: { ...DEMO_SCENARIO.startingStock },
    coins: DEMO_SCENARIO.startingCoins,
    stations: {
      keg: { jobRemainingMs: null, outputReady: false },
      grill: { jobRemainingMs: null, outputReady: false },
    },
    carriedItem: null,
    pedido: {
      requestedProducts: ["ale", "meal"],
      deliveredProducts: [],
      remainingMs: DEMO_SCENARIO.pedidoDurationMs,
      status: "active",
    },
    feedback: "The customer wants Ale and Meal. Start at either station.",
  };
}

export function remainingProducts(state: ScenarioState): Product[] {
  return state.pedido.requestedProducts.filter(
    (product) => !state.pedido.deliveredProducts.includes(product),
  );
}

export function tickScenario(state: ScenarioState, deltaMs: number): void {
  const elapsedMs = Math.max(0, deltaMs);

  for (const stationId of Object.keys(state.stations) as StationId[]) {
    const station = state.stations[stationId];
    if (station.jobRemainingMs === null) continue;

    station.jobRemainingMs = Math.max(0, station.jobRemainingMs - elapsedMs);
    if (station.jobRemainingMs === 0) {
      station.jobRemainingMs = null;
      station.outputReady = true;
      state.feedback = `${formatProduct(PRODUCT_BY_STATION[stationId])} is ready at the ${STATION_NAME[stationId].toLowerCase()}.`;
    }
  }

  if (state.pedido.status === "active") {
    state.pedido.remainingMs = Math.max(0, state.pedido.remainingMs - elapsedMs);
    if (state.pedido.remainingMs === 0) {
      state.pedido.status = "expired";
      state.feedback = "The pedido expired. No coins were paid.";
    }
  }
}

export function interactWithStation(state: ScenarioState, stationId: StationId): void {
  const station = state.stations[stationId];
  const product = PRODUCT_BY_STATION[stationId];
  const recipe = DEMO_SCENARIO.recipes[product];

  if (station.outputReady) {
    if (state.carriedItem !== null) {
      state.feedback = "Your hands are full. Serve or carry that item first.";
      return;
    }
    station.outputReady = false;
    state.carriedItem = product;
    state.feedback = `You picked up ${formatProduct(product)}.`;
    return;
  }

  if (station.jobRemainingMs !== null) {
    state.feedback = `${formatProduct(product)} is still cooking.`;
    return;
  }

  const stock = state.stock[recipe.ingredient];
  if (stock < 1) {
    state.feedback = `The ${stationId} needs ${formatIngredient(recipe.ingredient)}. Stock is empty.`;
    return;
  }

  state.stock[recipe.ingredient] -= 1;
  station.jobRemainingMs = recipe.durationMs;
  state.feedback = `${formatProduct(product)} started at the ${stationId}.`;
}

export function interactWithCustomer(state: ScenarioState): void {
  if (state.pedido.status === "served") {
    state.feedback = "This pedido has already been served.";
    return;
  }
  if (state.pedido.status === "expired") {
    state.feedback = "This pedido expired. It cannot be fulfilled.";
    return;
  }
  if (state.carriedItem === null) {
    state.feedback = "Carry Ale or Meal to serve the pedido.";
    return;
  }
  if (!remainingProducts(state).includes(state.carriedItem)) {
    state.feedback = `The pedido does not need ${formatProduct(state.carriedItem)}. It stays in your hands.`;
    return;
  }

  const deliveredItem = state.carriedItem;
  state.pedido.deliveredProducts.push(deliveredItem);
  state.carriedItem = null;

  if (remainingProducts(state).length === 0) {
    state.pedido.status = "served";
    state.coins += DEMO_SCENARIO.payout;
    state.feedback = `Pedido complete. Earned ${DEMO_SCENARIO.payout} coins.`;
    return;
  }

  state.feedback = `${formatProduct(deliveredItem)} served. The pedido timer keeps running.`;
}

export function stationProduct(stationId: StationId): Product {
  return PRODUCT_BY_STATION[stationId];
}
