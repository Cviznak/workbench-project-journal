// Electronics & Ohm's Law Calculation Utilities for Workbench Maker Tools

export interface ResistorBandInfo {
  digit1: number;
  digit2: number;
  multiplierPow: number;
  color1: string;
  color2: string;
  colorMult: string;
  colorTol: string;
  standardOhms: number;
  label: string;
}

export const BAND_COLORS: Record<number, { name: string; bg: string; text: string }> = {
  0: { name: 'Black', bg: '#18181b', text: '#ffffff' },
  1: { name: 'Brown', bg: '#854d0e', text: '#ffffff' },
  2: { name: 'Red', bg: '#dc2626', text: '#ffffff' },
  3: { name: 'Orange', bg: '#ea580c', text: '#ffffff' },
  4: { name: 'Yellow', bg: '#eab308', text: '#000000' },
  5: { name: 'Green', bg: '#16a34a', text: '#ffffff' },
  6: { name: 'Blue', bg: '#2563eb', text: '#ffffff' },
  7: { name: 'Violet', bg: '#9333ea', text: '#ffffff' },
  8: { name: 'Gray', bg: '#64748b', text: '#ffffff' },
  9: { name: 'White', bg: '#f8fafc', text: '#000000' },
};

export const MULTIPLIER_COLORS: Record<number, { name: string; bg: string; text: string }> = {
  [-2]: { name: 'Silver', bg: '#94a3b8', text: '#000000' },
  [-1]: { name: 'Gold', bg: '#d97706', text: '#ffffff' },
  0: { name: 'Black', bg: '#18181b', text: '#ffffff' },
  1: { name: 'Brown', bg: '#854d0e', text: '#ffffff' },
  2: { name: 'Red', bg: '#dc2626', text: '#ffffff' },
  3: { name: 'Orange', bg: '#ea580c', text: '#ffffff' },
  4: { name: 'Yellow', bg: '#eab308', text: '#000000' },
  5: { name: 'Green', bg: '#16a34a', text: '#ffffff' },
  6: { name: 'Blue', bg: '#2563eb', text: '#ffffff' },
};

// Standard E12 Series decade values
const E12_VALUES = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

export function findNearestE12(exactOhms: number): number {
  if (exactOhms <= 0) return 10;
  const decade = Math.pow(10, Math.floor(Math.log10(exactOhms)));
  const normalized = exactOhms / decade;

  let closest = E12_VALUES[0];
  let minDiff = Math.abs(normalized - closest);

  for (const val of E12_VALUES) {
    const diff = Math.abs(normalized - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = val;
    }
  }

  // Handle rounding near 10
  if (closest === 8.2 && normalized > 9.1) {
    return Math.round(10 * decade);
  }

  const result = Math.round(closest * decade * 10) / 10;
  return result;
}

export function formatOhms(ohms: number): string {
  if (ohms >= 1_000_000) {
    return `${(ohms / 1_000_000).toFixed(1).replace(/\.0$/, '')} MΩ`;
  }
  if (ohms >= 1_000) {
    return `${(ohms / 1_000).toFixed(1).replace(/\.0$/, '')} kΩ`;
  }
  return `${ohms.toFixed(1).replace(/\.0$/, '')} Ω`;
}

export function calculateResistorBands(ohms: number): ResistorBandInfo {
  const standardOhms = findNearestE12(ohms);
  const decadeExp = Math.floor(Math.log10(standardOhms));
  const normalized = Math.round((standardOhms / Math.pow(10, decadeExp)) * 10); // 2-digit integer e.g. 33

  const digit1 = Math.floor(normalized / 10);
  const digit2 = normalized % 10;
  const multiplierPow = decadeExp - 1;

  const color1 = BAND_COLORS[digit1]?.bg || '#854d0e';
  const color2 = BAND_COLORS[digit2]?.bg || '#18181b';
  const colorMult = MULTIPLIER_COLORS[multiplierPow]?.bg || '#dc2626';
  const colorTol = '#d97706'; // Gold 5% tolerance

  return {
    digit1,
    digit2,
    multiplierPow,
    color1,
    color2,
    colorMult,
    colorTol,
    standardOhms,
    label: formatOhms(standardOhms),
  };
}

export function recommendWattage(watts: number): string {
  if (watts <= 0.08) return '1/8 W (0.125W)';
  if (watts <= 0.18) return '1/4 W (0.25W)';
  if (watts <= 0.35) return '1/2 W (0.5W)';
  if (watts <= 0.75) return '1 W';
  if (watts <= 1.5) return '2 W';
  return '5 W High-Power Cement / Ceramic';
}
