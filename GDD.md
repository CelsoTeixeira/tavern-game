# Tavern Game — Game Design Document

**Status:** Initial small scene implemented; runtime verification pending

**Date:** 2026-10-13

**Canonical document:** This repository's GDD.md

## Vision

The player runs a small tavern by moving through it as its owner. They arrange a compact room, buy supplies, prepare familiar products at workstations, and serve customers before each pedido's timer runs out. The appeal comes from personally moving between the room's needs and making the tavern layout work.

A **pedido** is a customer's ticket: the set of requested items and its single countdown timer.

## Gameplay Pillars

1. **Hands-on ownership:** The player directly moves the owner and performs interactions. There is no staff automation in the first playable slice.
2. **A room that works:** Furniture and stations are placed on a grid, while the owner moves freely through the room. Layout affects access to seats and workstations.
3. **Readable service pressure:** Each customer has a visible pedido, remaining items, and one timer. Preparing ahead helps, but the owner still carries and serves each finished item.
4. **A growing craft:** Start with two simple products, then add recipes and preparation stages over time.

## Core Loop

1. **Arrange and restock:** Between shifts, place or move furniture and stations, then buy ingredients and any needed furniture.
2. **Open the tavern:** Validate the layout and begin service with a fixed room arrangement.
3. **Seat and take pedidos:** Customers occupy reachable free seats and request one or more items.
4. **Prepare, collect, and serve:** Start station jobs from pantry stock, collect finished servings, and carry them to matching pedidos.
5. **Earn and review:** At shift end, stop arrivals, resolve current pedidos, and review results.
6. **Prepare the next shift:** Use the remaining funds and stock to adjust the layout and restock.

## Modes and Shift Flow

### Preparation

- The owner can move and arrange the room before opening.
- Furniture and workstations snap to a placement grid.
- The player can buy furniture and ingredients with coins.
- A shift can open only when the layout has a usable seat and required seats, stations, and the door are accessible.

### Service

- The room layout is fixed for the shift.
- The owner moves freely and interacts with stations, servings, and customers.
- Customers take reachable free seats. At most three customers are active at once in the first playable slice.
- There is no separate waiting queue in this slice. Arrivals that cannot be seated do not become active customers.
- Each seated customer's pedido starts its timer when it appears.

### Shift Results

- When the shift ends, new arrivals stop.
- Current pedidos remain active until completed or expired; their timers continue to run.
- Once all current pedidos are resolved, show successful and failed pedidos, earnings, and spending.
- Return to preparation for the next shift.

## Player and Controls

- The game is a top-down browser game built with Phaser.
- The player directly controls the tavern owner.
- The owner moves freely through the room with WASD or arrow keys and interacts with E.
- The grid constrains furniture placement, not the owner's movement.
- Pointer and grid interactions support placing and moving objects during preparation. Detailed pointer bindings are not specified here.
- Collision prevents the owner from walking through room boundaries and solid furniture or stations.

## Room, Furniture, and Access

- The first playable room is a single tavern room with a door, tables, chairs, a keg, and a grill.
- Tables and chairs form customer seating groups. The layout must provide usable seats and access paths.
- Reject placements that overlap another object, leave the room, or block the door.
- Before opening, validate that at least one seat is usable and all seats and required stations can be reached from the door.
- During service, customers use reachable free seats. Opening is unavailable if the layout fails validation.
- Exact room and grid dimensions are tuning choices and are not set by this document.

## Recipes and Workstations

| Product | Station | First-slice preparation |
|---|---|---|
| Ale | Keg | One direct station job |
| Meal | Grill | One direct station job |

- These are the two initial predefined recipes. A pedido may request either product or both.
- Recipes specify required pantry ingredients and a preparation duration. Exact ingredients and durations remain tuning values.
- Pantry stock is tracked as counts. A recipe cannot start without all required stock.
- Starting a job consumes its ingredients once. Walking away or waiting for completion does not consume them again or refund them.
- Each station has one active job and one output slot. A station cannot start another job while occupied or holding a finished serving.
- Preparation continues while the owner walks away.
- When ready, the serving remains at the station until collected. The owner can carry one finished serving at a time.
- The owner collects and delivers finished servings directly. There is no raw-ingredient hauling.

## Pedidos and Customer Service

- A pedido lists the requested product or products, which have been delivered, and the time remaining.
- Its single countdown begins when the request appears and continues through preparation and partial delivery.
- Delivering one matching item to a pedido that needs multiple items records that item without resetting or restarting the timer.
- A pedido accepts only items it still requires. A wrong or unneeded serving is rejected and stays in the owner's hand.
- Full completion pays that pedido once and frees the customer's seat.
- If the timer expires first, the customer leaves unpaid and frees the seat. Prepared items remain usable elsewhere.
- If a partly fulfilled pedido expires, it earns no payout. Ingredients already used for its preparation are not refunded.
- An undelivered prepared serving remains available after a pedido expires; it may be used for another matching pedido.

## Inventory and Economy

- Pantry supplies are counted by ingredient. Furniture and ingredients are bought during preparation.
- Starting furniture, supplies, and coins are sufficient to make the first shift playable.
- A purchase deducts its listed coin cost once and adds the purchased object or stock once.
- Purchases are refused when the player cannot afford the full cost; coins cannot go below zero.
- Recipes cannot start unless the pantry contains all required ingredients.
- Shift results report earnings from completed pedidos and spending on ingredients and furniture.
- Starting amounts, item prices, recipe costs, stock limits, preparation times, shift length, and arrival cadence remain tuning values.

## Progression

The initial playable slice uses the two recipes and stations above. Later progression may expand the crafting system through:

- More predefined recipes.
- Intermediate preparations that become ingredients for later steps.
- Recipes with multiple production stages.
- Additional stations unlocked over time.

Progression pacing, unlock conditions, and the full recipe list are not defined yet. These later systems are outside the first playable slice.

## Interface and Feedback

The baseline is a Phaser game scene with React/HTML panels around it, following the broad presentation approach of the raid-game-concept reference. This describes the intended design direction, not existing code or a settled component implementation.

The interface should make these facts easy to read:

- The current phase and whether the tavern can open.
- Customer identity or seat association, each pedido's requested and remaining items, and its remaining time.
- The serving currently carried by the owner.
- Pantry counts and available coins, including purchase cost and affordability.
- Each station's active preparation progress, availability, and ready output.
- Placement validity and the reason a placement is rejected.
- Shift outcomes, earnings, and spending after all current pedidos resolve.

## First Playable Scope

The first playable slice covers one owner, one room, preparation and service phases, grid-based furnishing, purchasing and pantry counts, two recipes, one job/output slot per station, up to three active customers, individual pedido timers, direct carrying and serving, and shift results.

### Non-goals

- Staff automation or fully automated production chains.
- Multiplayer.
- A town, visitors outside the tavern, or a large campaign.
- Ingredient or serving spoilage.
- Furniture or station durability.
- Raw-material hauling.
- A complicated queue or queue-management system.
- A large recipe catalogue or multi-stage crafting before the first slice is established.

## Acceptance Criteria for the First Playable Slice

These are observable design targets. They do not claim that the game has been implemented or tested.

1. Between shifts, the owner can place and move grid-snapped furniture and stations while keeping the door reachable.
2. Buying ingredients or furniture deducts the displayed cost once, adds the purchased stock or object once, and refuses an unaffordable purchase.
3. Overlapping, out-of-room, and door-blocking placements are rejected; opening is unavailable until at least one usable seat and all required seats and stations are reachable.
4. During service, customers use reachable free seats and the number of active customers never exceeds three.
5. Starting a stocked recipe consumes its ingredients once; its station job continues while the owner walks away and produces one collectable serving.
6. The owner directly collects one serving at a time and can deliver it only to a matching remaining item on a seated customer's pedido.
7. Partial matching delivery on a multi-item pedido leaves its original countdown unchanged; a wrong item stays in the owner's hand; completing the pedido pays once.
8. An expired pedido leaves without payment, frees its seat, and does not refund ingredients; undelivered prepared servings remain usable.
9. At shift end, arrivals stop, existing pedidos resolve by completion or expiry, and only then do shift results appear before returning to preparation.

## Open Design and Tuning Questions

- What are the exact prices, starting coins and stock, recipe ingredient counts, preparation durations, shift lengths, and arrival cadence?
- How quickly should recipes, stages, and stations unlock over the long term?
- What art and audio direction should the game use?
- Whether and how should progress persist across a browser refresh?
