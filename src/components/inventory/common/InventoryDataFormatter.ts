
/**
 * Formats inventory data to ensure proper numeric value display and calculation
 */
export const formatInventoryData = <T extends { quantity: number; unit_cost: number }>(items: T[]): (T & { totalValue: number })[] => {
  return items.map(item => {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unit_cost);
    const totalValue = quantity * unitCost;
    
    return {
      ...item,
      quantity,
      unit_cost: unitCost,
      totalValue
    };
  });
};
