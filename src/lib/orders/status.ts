// Order statuses that mean "this buyer already has skin in the game on this
// listing" — used to block a duplicate order. Must include every status an
// order sits in between creation and completion, including 'paid' (funded
// escrow, real money already moved) — a gap here previously let a buyer
// fund escrow twice on the same listing.
export const ACTIVE_ORDER_STATUSES = [
  'pending', 'confirmed', 'paid', 'dispatched', 'in_transit', 'delivered',
] as const;
