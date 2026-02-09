/**
 * taxes.ts
 * 
 * Configuration centralisée des taux de taxes pour le Québec
 */

export const TAX_RATES = {
  TPS: 0.05,      // Taxe fédérale (GST) 5%
  TVQ: 0.09975,   // Taxe provinciale Québec 9.975%
  get COMBINED() {
    return 1 + this.TPS + this.TVQ; // 1.14975
  }
} as const;

/**
 * Calculer les taxes à partir d'un montant HT
 */
export function calculateTaxes(amountExclTax: number) {
  const tps = amountExclTax * TAX_RATES.TPS;
  const tvq = amountExclTax * TAX_RATES.TVQ;
  const total = amountExclTax + tps + tvq;
  
  return {
    amountExclTax: parseFloat(amountExclTax.toFixed(2)),
    tps: parseFloat(tps.toFixed(2)),
    tvq: parseFloat(tvq.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

/**
 * Calculer le montant HT à partir d'un montant TTC
 */
export function calculateAmountExclTax(totalAmount: number) {
  const amountExclTax = totalAmount / TAX_RATES.COMBINED;
  return calculateTaxes(amountExclTax);
}

/**
 * Formatter un montant en devise CAD
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
}
