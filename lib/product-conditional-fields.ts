/**
 * Product-aware conditional-field rules — Hayk redesign 2026-07-02 (Doc 01 Change #4).
 *
 * Given the currently selected Product on an order, decide which of the extra
 * print custom-fields ("Sides", "Roll Direction", "Die", "Perforation", etc.)
 * should show in the modal.
 *
 * The rules mirror what the live Bazaar website exposes per product. Anything
 * not listed here is treated as "always render" so we never accidentally hide
 * a field that already has data.
 *
 * Rules taken from doc 01:
 *   - Roll Direction  → only Roll Labels / roll-based products
 *   - Double Sided    → products that support 2-sided printing (boxes, marketing)
 *   - Die             → die-cut products (custom labels, boxes, diecut stickers)
 *   - Perforation     → products that support it (tickets, forms — none of the
 *                       current 21 named products explicitly do; kept for future)
 *   - Application     → combos only (Pouches Combo / Jar Combo / Tube Combo)
 *   - Sides           → multi-side products (boxes, postcards, business cards…)
 *   - Position        → treated same as Sides (which side goes where)
 *   - Color Mode      → universal
 *   - Finishing       → universal (still may be null-selected)
 *   - Product / Materials / Finished Size / Order QTY — always shown
 */

const ROLL_PRODUCTS = new Set([
  "Labels (Roll)",
  "Vinyl Labels / 54'' Rolls",
]);

const COMBO_PRODUCTS = new Set([
  "Pouches Combo",
  "Jar Combo",
  "Tube Combo",
]);

const MULTI_SIDE_PRODUCTS = new Set([
  "Folding Cartons / Boxes",
  "Business Cards",
  "Flyers / Postcards",
  "Booklets",
  "Sheet Products (Boyd)",
]);

const DIE_CUT_PRODUCTS = new Set([
  "Labels (Roll)",
  "Labels (Sheet)",
  "Diecut Stickers",
  "Folding Cartons / Boxes",
  "Pouches Only",
  "Pouches Combo",
  "Vinyl Labels / 54'' Rolls",
  "Window Decals",
]);

/**
 * Field names that are ALWAYS shown regardless of selected product.
 * Matched case-insensitively against the custom-field name.
 */
const ALWAYS_SHOWN = new Set([
  "product",
  "materials",
  "material",
  "finished size",
  "color",
  "color mode",
  "finishing",
]);

/**
 * Returns true if the given custom-field should be rendered on the modal for
 * the currently-selected product. `productName` may be "" (nothing selected)
 * — in that case we return true for everything (fallback shown to user).
 */
export function shouldShowConditionalField(
  fieldName: string,
  productName: string | undefined | null
): boolean {
  const name = fieldName.trim().toLowerCase();
  if (ALWAYS_SHOWN.has(name)) return true;

  // No product selected yet → show everything so user can complete order.
  if (!productName) return true;

  if (name === "roll direction" || name === "direction") {
    return ROLL_PRODUCTS.has(productName);
  }
  if (name === "application" || name === "application service") {
    return COMBO_PRODUCTS.has(productName);
  }
  if (name === "sides" || name === "position") {
    return MULTI_SIDE_PRODUCTS.has(productName);
  }
  if (name === "die" || name === "die cut") {
    return DIE_CUT_PRODUCTS.has(productName);
  }
  if (name === "double sided" || name === "double-sided") {
    return MULTI_SIDE_PRODUCTS.has(productName) || COMBO_PRODUCTS.has(productName);
  }
  if (name === "perforation") {
    // No current product in the catalog toggles perforation on by default; hide
    // unless someone flips this rule for a specific product later.
    return false;
  }
  // Unknown field — leave visible.
  return true;
}

/**
 * Does the given product have a known subcategory rule set at all? Used to
 * show a "subcategory unknown — showing all fields" caption when we can't
 * decide.
 */
export function hasKnownSubcategory(productName: string | undefined | null): boolean {
  if (!productName) return false;
  return (
    ROLL_PRODUCTS.has(productName) ||
    COMBO_PRODUCTS.has(productName) ||
    MULTI_SIDE_PRODUCTS.has(productName) ||
    DIE_CUT_PRODUCTS.has(productName) ||
    // "Only" and single-side products still have known rules (they just hide
    // the toggles), so treat them as known.
    productName === "Pouches Only" ||
    productName === "Tube Only" ||
    productName === "Jar Only" ||
    productName === "Apparel" ||
    productName === "Banners / Large Format" ||
    productName === "Vinyl Signage" ||
    productName === "Wallpaper" ||
    productName === "Window Decals" ||
    productName === "Labels (Sheet)"
  );
}
