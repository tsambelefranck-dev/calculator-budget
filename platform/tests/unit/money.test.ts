import { describe, expect, it } from 'vitest';
import {
  canConvert,
  convertMinor,
  formatMoney,
  formatPercent,
  minorToInputValue,
  parseAmount,
  roundDownTo,
  roundUpTo,
  toMinor,
} from '@/lib/finance/money';

const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('parseAmount', () => {
  it.each([
    ['300000', 300000],
    ['300 000', 300000],
    ['300 000', 300000],
    ['300.000', 300000],
    ['1.500.000', 1500000],
    ['300,000', 300000],
    ['85 000 FCFA', 85000],
    ['0', 0],
  ])('XAF : « %s » → %d', (input, expected) => {
    expect(parseAmount(input, 'XAF')).toBe(expected);
  });

  it('arrondit une saisie décimale en FCFA à l’unité', () => {
    expect(parseAmount('1500,6', 'XOF')).toBe(1501);
  });

  it.each([
    ['12,50', 1250],
    ['12.5', 1250],
    ['1 234,56', 123456],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['99', 9900],
    ['4,99 €', 499],
  ])('EUR : « %s » → %d centimes', (input, expected) => {
    expect(parseAmount(input, 'EUR')).toBe(expected);
  });

  it.each(['', 'abc', '-500', '12..5,3', '1e5', '12,5,3'])('refuse « %s »', (input) => {
    expect(parseAmount(input, 'XAF')).toBeNull();
  });

  it('accepte les nombres et refuse les nombres négatifs ou infinis', () => {
    expect(parseAmount(2500, 'XAF')).toBe(2500);
    expect(parseAmount(19.99, 'USD')).toBe(1999);
    expect(parseAmount(-1, 'XAF')).toBeNull();
    expect(parseAmount(Number.POSITIVE_INFINITY, 'XAF')).toBeNull();
  });

  it('refuse les montants absurdes', () => {
    expect(parseAmount('9'.repeat(20), 'XAF')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formate le FCFA sans décimales', () => {
    expect(plain(formatMoney(300000, 'XAF'))).toBe('300 000 FCFA');
    expect(plain(formatMoney(85000, 'XOF'))).toBe('85 000 FCFA');
  });

  it('formate l’euro et le dollar avec centimes', () => {
    expect(plain(formatMoney(123456, 'EUR'))).toBe('1 234,56 €');
    expect(plain(formatMoney(500, 'USD'))).toBe('5,00 $');
    expect(formatMoney(500, 'USD', { locale: 'en-US' })).toBe('$5.00');
  });

  it('affiche le signe à la demande', () => {
    expect(plain(formatMoney(-5000, 'XAF'))).toBe('-5 000 FCFA');
    expect(plain(formatMoney(5000, 'XAF', { signed: true }))).toBe('+5 000 FCFA');
  });

  it('formate les pourcentages', () => {
    expect(plain(formatPercent(0.153, 'fr-FR', 1))).toBe('15,3 %');
  });

  it('prépare la valeur d’un champ', () => {
    expect(minorToInputValue(123456, 'EUR')).toBe('1234.56');
    expect(minorToInputValue(300000, 'XAF')).toBe('300000');
    expect(minorToInputValue(null, 'XAF')).toBe('');
  });
});

describe('conversion de devises', () => {
  it('convertit exactement EUR ↔ FCFA à la parité fixe', () => {
    expect(convertMinor(toMinor(1000, 'EUR'), 'EUR', 'XAF')).toBe(655957);
    expect(convertMinor(655957, 'XOF', 'EUR')).toBe(100000);
    expect(convertMinor(10000, 'EUR', 'XOF')).toBe(65596);
  });

  it('XAF et XOF ont la même valeur', () => {
    expect(convertMinor(300000, 'XAF', 'XOF')).toBe(300000);
  });

  it('n’invente jamais de taux pour le dollar', () => {
    expect(convertMinor(1000, 'USD', 'XAF')).toBeNull();
    expect(convertMinor(1000, 'EUR', 'USD')).toBeNull();
    expect(canConvert('USD', 'USD')).toBe(true);
    expect(canConvert('XAF', 'USD')).toBe(false);
  });
});

describe('arrondis', () => {
  it('arrondit au pas', () => {
    expect(roundUpTo(87300, 500)).toBe(87500);
    expect(roundUpTo(87500, 500)).toBe(87500);
    expect(roundDownTo(87300, 500)).toBe(87000);
    expect(roundUpTo(12.2, 1)).toBe(13);
  });
});
