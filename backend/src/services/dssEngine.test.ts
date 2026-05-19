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

  it('does not show 100 confidence for partial wool burn-test matches', () => {
    const result = analyzeBurnTest({
      performed: true,
      moment: ['Curled away', 'No flame', 'Burned slowly'],
      flames: ['Burns slowly'],
      no_flame: ['Completely stops burning'],
      smell: 'Like burning hair',
      ashes: ['Easy to crush', 'Irregular bead'],
    });

    expect(result.top_fibers[0].fiber).toBe('wool');
    expect(result.top_fibers[0].confidence).toBeLessThan(1);
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

  it('keeps buyback as an upcycle preference instead of a DSS pathway', () => {
    const recommendations = buildPathwayRecommendations({
      item_type: 'Top',
      condition: 'Minor damage (small tears, loose seams, stains)',
      cleanliness: 'Yes, clean and ready for use',
      action: 'Upcycle',
      buyback_interest: true,
      upcycle_request: 'tote bag',
      details: {
        restricted_category: 'none',
        fiber_composition: 'cotton_natural',
        repairability: 'minor_repair',
        repurposing_potential: 'high',
        trim_removal: 'easy',
      },
      burn_test: { performed: false },
    });

    expect(recommendations.some((recommendation) => recommendation.recommended_pathway === 'buyback')).toBe(false);
    expect(recommendations.map((recommendation) => recommendation.recommended_pathway)).toContain('upcycle');
  });

  it('rejects donation when uniform branding is indicated', () => {
    const recommendations = buildPathwayRecommendations({
      item_type: 'Top',
      condition: 'Good condition (wearable, no major damage)',
      cleanliness: 'Yes, clean and ready for use',
      service_type: 'donate',
      details: {
        restricted_category: 'none',
        uniform_branding: 'Yes',
      },
      burn_test: { performed: false },
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].recommended_pathway).toBe('rejected');
    expect(recommendations[0].eligibility?.category).toBe('donation_uniform_branding');
  });

  it('skips wearability and repairability scoring for fabric scraps-only submissions', () => {
    const recommendations = buildPathwayRecommendations({
      item_type: 'Fabric scraps',
      condition: 'Minor damage (small tears, loose seams, stains)',
      cleanliness: 'Yes, clean and ready for use',
      action: 'Upcycle',
      details: {
        restricted_category: 'none',
        item_types: ['Fabric scraps'],
        fiber_composition: 'cotton_natural',
        damage_classification: 'small_hole_tear',
        contamination_level: 'clean',
        repurposing_potential: 'high',
        trim_removal: 'easy',
      },
      burn_test: { performed: false },
    });
    const upcycle = recommendations.find((recommendation) => recommendation.recommended_pathway === 'upcycle');

    expect(upcycle?.checks.find((check) => check.question === 'Wearability')?.skipped).toBe(true);
    expect(upcycle?.checks.find((check) => check.question === 'Repairability')?.skipped).toBe(true);
    expect(upcycle?.score).toBeGreaterThan(80);
  });
});
