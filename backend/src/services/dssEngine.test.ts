import { describe, expect, it } from 'vitest';
import { analyzeBurnTest, buildPathwayRecommendations, DSS_ENGINE_VERSION } from './dssEngine.js';

describe('dssEngine', () => {
  it('labels cotton-like burn test answers with high confidence', () => {
    const result = analyzeBurnTest({
      performed: true,
      moment: ['Burned fast'],
      flames: ['Burns quickly'],
      no_flame: ['Continues to burn quickly', 'Has an afterglow'],
      smell: 'Like burning paper',
      ashes: ['Light and feathery gray ash'],
    });

    expect(result.top_fibers[0].fiber).toBe('cotton');
    expect(result.top_fibers[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('labels polyester-like burn test answers', () => {
    const result = analyzeBurnTest({
      performed: true,
      moment: ['Shrinked away from flame'],
      flames: ['Melts', 'Burns slowly'],
      no_flame: ['Burns with difficulty'],
      smell: 'Like chemicals',
      ashes: ['Round, hard, grayish bead', "Won't crush"],
    });

    expect(result.top_fibers[0].fiber).toBe('polyester, poly fleece');
  });

  it('labels wool-like burn test answers', () => {
    const result = analyzeBurnTest({
      performed: true,
      moment: ['Curled away', 'No flame', 'Burned slowly'],
      flames: ['Burns slowly', 'Sizzles', 'Flame was flickering'],
      no_flame: ['Completely stops burning'],
      smell: 'Like burning hair',
      ashes: ['Easy to crush', 'Irregular bead'],
    });

    expect(result.top_fibers[0].fiber).toBe('wool');
  });

  it('uses DSS engine version and item-detail rules for donation', () => {
    const recommendations = buildPathwayRecommendations({
      condition: 'Good condition (wearable, no major damage)',
      cleanliness: 'Yes, clean and ready for use',
      action: 'Donate',
      burn_test: { performed: false },
    });

    expect(DSS_ENGINE_VERSION).toBe('dssEngine-v1');
    expect(recommendations[0].recommended_pathway).toBe('donate');
  });
});
