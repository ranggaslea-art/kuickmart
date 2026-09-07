import { Product, ProductUnitConversion } from '../types';
import { formatRupiah } from './formatters';

/**
 * Computes cumulative multipliers and conversion formula texts for hierarchical / multi-tier units.
 * Example:
 * Base: Pcs
 * 1 Pak = 20 Pcs (multiplier: 20)
 * 1 Bal = 5 Pak (multiplier: 5 * 20 = 100, formula: "1 Bal = 5 Pak × 20 Pcs = 100 Pcs")
 * 1 Karung = 10 Bal (multiplier: 10 * 100 = 1000, formula: "1 Karung = 10 Bal × 5 Pak × 20 Pcs = 1.000 Pcs")
 */
export function computeConversionChains(
  baseUnit: string,
  conversions: ProductUnitConversion[]
): ProductUnitConversion[] {
  if (!conversions || conversions.length === 0) return [];

  const cleanBase = (baseUnit || 'pcs').trim();
  const result: ProductUnitConversion[] = [];

  // Helper to trace and get multiplier and chain steps
  const visited = new Set<string>();

  function resolveMultiplier(
    item: { containsQty: number | string; containsUnit: string; unitName: string },
    currentChain: string[] = []
  ): { multiplier: number; steps: string[] } {
    const parentUnit = item.containsUnit.trim();
    const rawQty = Number(item.containsQty);
    const qty = !isNaN(rawQty) && rawQty > 0 ? rawQty : 1;

    // Direct conversion to base unit
    if (parentUnit.toLowerCase() === cleanBase.toLowerCase()) {
      return {
        multiplier: qty,
        steps: [`${qty} ${cleanBase}`],
      };
    }

    // Find if parentUnit matches another conversion in the list
    const parentConversion = conversions.find(
      (c) => c.unitName.trim().toLowerCase() === parentUnit.toLowerCase()
    );

    if (parentConversion && !visited.has(parentConversion.unitName.toLowerCase())) {
      visited.add(parentConversion.unitName.toLowerCase());
      const parentResolved = resolveMultiplier(parentConversion, [...currentChain, `${qty} ${parentUnit}`]);
      visited.delete(parentConversion.unitName.toLowerCase());

      return {
        multiplier: qty * parentResolved.multiplier,
        steps: [`${qty} ${parentUnit}`, ...parentResolved.steps],
      };
    }

    // Fallback: parent not found in chain, treat as direct multiplier
    return {
      multiplier: qty,
      steps: [`${qty} ${parentUnit}`],
    };
  }

  for (const conv of conversions) {
    visited.clear();
    visited.add(conv.unitName.toLowerCase());
    const resolved = resolveMultiplier(conv);

    let formula = `1 ${conv.unitName} = `;
    if (resolved.steps.length === 1) {
      formula += resolved.steps[0];
    } else {
      formula += `${resolved.steps.join(' × ')} = ${resolved.multiplier.toLocaleString('id-ID')} ${cleanBase}`;
    }

    result.push({
      ...conv,
      totalMultiplier: resolved.multiplier,
      description: formula,
    });
  }

  return result;
}

/**
 * Returns all selectable unit options for a product (Base unit + each conversion tier).
 */
export function getProductUnitOptions(product: Product): {
  unitName: string;
  price: number;
  originalPrice?: number;
  multiplier: number;
  breakdownText: string;
  isBase: boolean;
  barcode?: string;
  savingsPercent?: number;
}[] {
  const baseUnit = product.unit || 'Pcs';
  const baseOption = {
    unitName: baseUnit,
    price: product.price,
    originalPrice: product.originalPrice,
    multiplier: 1,
    breakdownText: `Satuan Terkecil / Eceran (1 ${baseUnit})`,
    isBase: true,
    barcode: product.barcode,
  };

  if (!product.unitConversions || product.unitConversions.length === 0) {
    return [baseOption];
  }

  // Ensure conversions have updated descriptions and multipliers
  const computed = computeConversionChains(baseUnit, product.unitConversions);

  const conversionOptions = computed.map((conv) => {
    // If custom price specified, use it; otherwise price = basePrice * multiplier
    const calculatedPrice = conv.price && conv.price > 0 ? conv.price : product.price * conv.totalMultiplier;
    const normalPrice = product.price * conv.totalMultiplier;

    let savingsPercent: number | undefined;
    if (calculatedPrice < normalPrice) {
      savingsPercent = Math.round(((normalPrice - calculatedPrice) / normalPrice) * 100);
    }

    return {
      unitName: conv.unitName,
      price: calculatedPrice,
      originalPrice: normalPrice > calculatedPrice ? normalPrice : undefined,
      multiplier: conv.totalMultiplier,
      breakdownText: conv.description || `1 ${conv.unitName} = ${conv.totalMultiplier.toLocaleString('id-ID')} ${baseUnit}`,
      isBase: false,
      barcode: conv.barcode || product.barcode,
      savingsPercent,
    };
  });

  return [baseOption, ...conversionOptions];
}

/**
 * Formats inventory stock into human-readable warehouse breakdown.
 * Example: 2450 Pcs -> "2.450 Pcs (~ 2 Karung, 4 Bal, 2 Pak, 10 Pcs)"
 */
export function formatStockBreakdown(
  totalBaseStock: number,
  baseUnit: string,
  conversions?: ProductUnitConversion[]
): {
  text: string;
  compact: string;
  breakdown: { unitName: string; count: number }[];
} {
  const cleanBase = baseUnit || 'Pcs';
  if (!conversions || conversions.length === 0 || totalBaseStock <= 0) {
    return {
      text: `${totalBaseStock.toLocaleString('id-ID')} ${cleanBase}`,
      compact: `${totalBaseStock} ${cleanBase}`,
      breakdown: [{ unitName: cleanBase, count: totalBaseStock }],
    };
  }

  // Sort conversions by multiplier descending (largest packaging first)
  const computed = computeConversionChains(cleanBase, conversions);
  const sorted = [...computed].sort((a, b) => b.totalMultiplier - a.totalMultiplier);

  let remaining = totalBaseStock;
  const breakdown: { unitName: string; count: number }[] = [];

  for (const tier of sorted) {
    if (tier.totalMultiplier > 1 && remaining >= tier.totalMultiplier) {
      const count = Math.floor(remaining / tier.totalMultiplier);
      if (count > 0) {
        breakdown.push({ unitName: tier.unitName, count });
        remaining %= tier.totalMultiplier;
      }
    }
  }

  if (remaining > 0 || breakdown.length === 0) {
    breakdown.push({ unitName: cleanBase, count: remaining });
  }

  const breakdownString = breakdown.map((b) => `${b.count.toLocaleString('id-ID')} ${b.unitName}`).join(', ');
  const compactString = breakdown.map((b) => `${b.count} ${b.unitName}`).join(' + ');

  return {
    text: `${totalBaseStock.toLocaleString('id-ID')} ${cleanBase} (~ ${breakdownString})`,
    compact: compactString,
    breakdown,
  };
}
