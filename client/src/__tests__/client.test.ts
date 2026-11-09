import { describe, it, expect } from 'vitest';

describe('Client Utility & Engine Tests', () => {
  it('computes normalized scores correctly according to formula', () => {
    // Formula: 100 * min(actual / upperLimit, 1)
    const computeNormalized = (actual: number, limit: number) =>
      Math.round(100 * Math.min(actual / limit, 1.0) * 100) / 100;

    expect(computeNormalized(50, 100)).toBe(50);
    expect(computeNormalized(120, 100)).toBe(100);
    expect(computeNormalized(0, 100)).toBe(0);
    expect(computeNormalized(24, 48)).toBe(50);
  });

  it('computes overall contribution index matching policy weights', () => {
    const categories = [
      { normalized: 80, weight: 0.35 },
      { normalized: 100, weight: 0.15 },
      { normalized: 60, weight: 0.10 },
      { normalized: 50, weight: 0.10 },
      { normalized: 70, weight: 0.10 },
      { normalized: 40, weight: 0.10 },
      { normalized: 80, weight: 0.10 },
    ];

    const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 3);

    const oci = categories.reduce((sum, c) => sum + c.normalized * c.weight, 0);
    expect(oci).toBeCloseTo(73.0, 1);
  });

  it('correctly maps OCI to institutional performance tiers', () => {
    const getTier = (oci: number) => {
      if (oci >= 85) return 'EXEMPLARY';
      if (oci >= 70) return 'COMMENDABLE';
      if (oci >= 55) return 'SATISFACTORY';
      if (oci >= 40) return 'DEVELOPING';
      return 'NEEDS_IMPROVEMENT';
    };

    expect(getTier(92.5)).toBe('EXEMPLARY');
    expect(getTier(75.0)).toBe('COMMENDABLE');
    expect(getTier(62.0)).toBe('SATISFACTORY');
    expect(getTier(45.0)).toBe('DEVELOPING');
    expect(getTier(32.0)).toBe('NEEDS_IMPROVEMENT');
  });
});
