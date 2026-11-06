import { Currency } from './types';
export type { Currency } from './types';

export const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'ILS', 'GBP'];

export const DEFAULT_CURRENCY: Currency = 'USD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  ILS: '₪',
  GBP: '£',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD ($)',
  EUR: 'EUR (€)',
  ILS: 'ILS (₪)',
  GBP: 'GBP (£)',
};

// Fixed baseline exchange rates relative to 1 USD
export const EXCHANGE_RATES_TO_USD: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  ILS: 3.65,
  GBP: 0.79,
};

/**
 * Converts an amount from one currency to another using baseline USD rates.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = 'USD',
  toCurrency: string = 'USD'
): number {
  if (!amount || isNaN(amount)) return 0;
  const from = (fromCurrency?.toUpperCase() || 'USD') as Currency;
  const to = (toCurrency?.toUpperCase() || 'USD') as Currency;

  if (from === to) return amount;

  const fromRate = EXCHANGE_RATES_TO_USD[from] || 1.0;
  const toRate = EXCHANGE_RATES_TO_USD[to] || 1.0;

  // Convert to base USD, then convert to target
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

/**
 * Formats a currency amount with the proper symbol, converting if sourceCurrency != targetCurrency.
 */
export function formatCurrency(
  amount: number,
  targetCurrency: string = 'USD',
  sourceCurrency?: string
): string {
  const target = (targetCurrency?.toUpperCase() || 'USD') as Currency;
  const source = (sourceCurrency?.toUpperCase() || target) as Currency;

  let value = amount;
  if (source && source !== target) {
    value = convertCurrency(amount, source, target);
  }

  const symbol = CURRENCY_SYMBOLS[target] || '$';
  const formattedNumber = (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formattedNumber}`;
}

/**
 * Extracts the user's preferred currency from settings_json or fallback to USD.
 */
export function getPreferredCurrency(settingsJson?: any): Currency {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('workbench_currency') as Currency;
    if (local && SUPPORTED_CURRENCIES.includes(local)) {
      return local;
    }
  }

  const pref = settingsJson?.preferred_currency as Currency;
  if (pref && SUPPORTED_CURRENCIES.includes(pref)) {
    return pref;
  }

  return DEFAULT_CURRENCY;
}
