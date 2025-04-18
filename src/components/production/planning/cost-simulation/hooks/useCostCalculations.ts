import { useMemo } from 'react';
import { CostFactor, CostScenario } from '../types';

interface UseCostCalculationsProps {
  factors: CostFactor[];
  factorChanges: { [factorId: string]: number };
}

export function useCostCalculations({ factors, factorChanges }: UseCostCalculationsProps) {
  /**
   * حساب التأثيرات على الإنتاج والتعبئة والعمليات والإجمالي
   */
  const impact = useMemo(() => {
    let production = 0;
    let packaging = 0;
    let operations = 0;
    let total = 0;

    factors.forEach(factor => {
      const change = factorChanges[factor.id] || 0;
      if (!change) return;
      let effect = (change / 100) * factor.currentValue;
      if (factor.category === 'raw-materials') {
        production += effect;
      } else if (factor.category === 'packaging') {
        packaging += effect;
      } else if (factor.category === 'operations') {
        operations += effect;
      }
      total += effect;
    });

    return {
      production: Number(production.toFixed(2)),
      packaging: Number(packaging.toFixed(2)),
      operations: Number(operations.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [factors, factorChanges]);

  return { impact };
}
