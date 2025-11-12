const GRAMS_PER_POUND = 453.592;
const COST_PER_POUND_USD = 3.5;

export const COST_PER_GRAM_USD = COST_PER_POUND_USD / GRAMS_PER_POUND;

export const calculateShippingCost = (weightInGrams?: number | null): number => {
  if (!weightInGrams || weightInGrams <= 0) {
    return 0;
  }
  return weightInGrams * COST_PER_GRAM_USD;
};

export const calculateCostPlusShipping = (
  baseCost?: number | null,
  weightInGrams?: number | null
): number => {
  const sanitizedCost =
    typeof baseCost === 'number' && !Number.isNaN(baseCost) ? baseCost : 0;
  return sanitizedCost + calculateShippingCost(weightInGrams ?? undefined);
};


