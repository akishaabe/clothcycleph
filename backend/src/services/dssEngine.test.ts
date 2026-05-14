import { describe, expect, it } from 'vitest';
import { analyzeBurnTest, buildPathwayRecommendations, DSS_ENGINE_VERSION, evaluateEligibility } from './dssEngine.js';

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

    expect(DSS_ENGINE_VERSION).toBe('dssEngine-v2-textile-recovery');
    expect(recommendations[0].recommended_pathway).toBe('donate');
  });

  it('rejects restricted categories before normal DSS evaluation', () => {
    const recommendations = buildPathwayRecommendations({
      condition: 'Good condition (wearable, no major damage)',
      cleanliness: 'Yes, clean and ready for use',
      details: {
        restricted_category: 'used_undergarments',
      },
      burn_test: { performed: false },
    });

    expect(evaluateEligibility({ details: { restricted_category: 'used_undergarments' } }).eligible).toBe(false);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].recommended_pathway).toBe('rejected');
  });

  it('prioritizes upcycling for clean, non-wearable textiles with usable panels', () => {
    const recommendations = buildPathwayRecommendations({
      item_type: 'Household textile (curtains, bedsheets)',
      condition: 'Heavily damaged (large tears, unusable as clothing)',
      cleanliness: 'Yes, clean and ready for use',
      details: {
        restricted_category: 'none',
        fiber_composition: 'cotton_natural',
        wearability: 'not_wearable_fabric_usable',
        damage_classification: 'large_tear_heavy_damage',
        repairability: 'moderate_repair',
        contamination_level: 'clean',
        repurposing_potential: 'high',
        trim_removal: 'easy',
      },
      burn_test: { performed: false },
    });

    expect(recommendations[0].recommended_pathway).toBe('upcycle');
  });
});
