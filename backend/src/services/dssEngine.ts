type Pathway = 'recycle' | 'donate' | 'upcycle' | 'buyback' | 'rejected';

export const DSS_ENGINE_VERSION = 'dssEngine-v2-textile-recovery';

interface RuleCheck {
  question: string;
  matched: boolean;
  expected: string;
  selected: string;
  score?: number;
  total?: number;
  skipped?: boolean;
}

interface EligibilityResult {
  eligible: boolean;
  category: string;
  reason?: string;
  message?: string;
}

const restrictedCategoryLabels: Record<string, string> = {
  hospital_medical_uniform: 'Hospital/medical uniform',
  ppe_contaminated_workwear: 'PPE or contaminated workwear',
  used_undergarments: 'Used undergarments',
  mold_chemical_contaminated: 'Mold- or chemical-contaminated textile',
};

const restrictedMessages: Record<string, string> = {
  hospital_medical_uniform:
    'This item is not eligible for DSS assessment because medical textiles may carry safety and contamination risks.',
  ppe_contaminated_workwear:
    'This item is rejected because PPE or contaminated workwear may contain hazardous residues or biological exposure risks.',
  used_undergarments:
    'This item is not eligible due to hygiene restrictions and will not be assessed for donation, upcycling, or recycling.',
  mold_chemical_contaminated:
    'This item is rejected because mold or chemical contamination can pose health and material safety risks.',
};

interface FabricRule {
  fiber: string;
  moment: string;
  flames: string;
  noFlame: string;
  smell: string;
  ashes: string;
}

const fabricRules: FabricRule[] = [
  {
    fiber: 'cotton',
    moment: 'burned fast',
    flames: 'Burns quickly',
    noFlame: 'Continues to burn quickly, Has an afterglow',
    smell: 'Like burning paper',
    ashes: 'Light and feathery gray ash OR Black ash',
  },
  {
    fiber: 'linen',
    moment: 'burned fast',
    flames: 'Burns quickly',
    noFlame: 'Continues to burn',
    smell: 'Like burning paper',
    ashes: 'Light and feathery gray ash',
  },
  {
    fiber: 'rayon, tencel',
    moment: 'burned fast',
    flames: 'Burns quickly',
    noFlame: 'Continues to burn quickly',
    smell: 'Like burning paper',
    ashes: 'Light and feathery gray ash',
  },
  {
    fiber: 'silk',
    moment: 'curled away, no flame',
    flames: 'Burns slowly, Sputters',
    noFlame: 'Burns with difficulty, Completely stops burning',
    smell: 'Like burning hair',
    ashes: 'Round, shiny black beads & Easy to crush',
  },
  {
    fiber: 'wool',
    moment: 'curled away, no flame, burned slowly',
    flames: 'Burns slowly, Sizzles, Flame was flickering',
    noFlame: 'Completely stops burning',
    smell: 'Like burning hair',
    ashes: 'Easy to crush, Irregular bead',
  },
  {
    fiber: 'nylon',
    moment: 'Melted and did not burn, Shrinked away from flame',
    flames: 'Melts, Burns slowly',
    noFlame: 'Completely stops burning',
    smell: 'Like celery',
    ashes: 'Round, hard, grayish bead & Won’t crush',
  },
  {
    fiber: 'polyester, poly fleece',
    moment: 'Shrinked away from flame',
    flames: 'Melts, Burns slowly',
    noFlame: 'Burns with difficulty',
    smell: 'Like chemicals',
    ashes: 'Round, hard, grayish bead & Won’t crush',
  },
  {
    fiber: 'acetate',
    moment: 'Shrinked away from flame, Turned black',
    flames: 'Sputters, Melts, Drips, Burns quickly',
    noFlame: 'Continues to melt and burn',
    smell: 'Like vinegar',
    ashes: 'Hard, black ash, Irregular bead, Difficult to crush',
  },
  {
    fiber: 'acrylic',
    moment: 'Shrinked away from flame',
    flames: 'Burns quickly, Sputters, Melts',
    noFlame: 'Continues to melt and burn',
    smell: 'Like chemicals',
    ashes: 'Irregular, hard, black bead & Won’t crush',
  },
  {
    fiber: 'spandex',
    moment: 'Shrinked away from flame',
    flames: 'Melts, Burns quickly',
    noFlame: 'Continues to melt and burn',
    smell: 'Sharp and bitter',
    ashes: 'Soft, sticky, gummy',
  },
];

const pathwayRules: Record<
  Exclude<Pathway, 'buyback' | 'rejected'>,
  {
    conditions: string[];
    cleanliness: string[];
    itemHints: string[];
    fabricHints: string[];
  }
> = {
  recycle: {
    conditions: [
      'Minor damage (small tears, loose seams, stains)',
      'Heavily damaged (large tears, unusable as clothing)',
    ],
    cleanliness: ['Needs cleaning', 'Heavily soiled or contaminated'],
    itemHints: ['Fabric scraps', 'Household textile (curtains, bedsheets)'],
    fabricHints: ['polyester', 'poly fleece', 'nylon', 'acrylic', 'spandex', 'acetate'],
  },
  donate: {
    conditions: ['Good condition (wearable, no major damage)'],
    cleanliness: ['Yes, clean and ready for use'],
    itemHints: ['Top', 'Pants / Jeans', 'Dress', 'Jacket / Outerwear'],
    fabricHints: ['cotton', 'linen', 'rayon', 'tencel'],
  },
  upcycle: {
    conditions: [
      'Minor damage (small tears, loose seams, stains)',
      'Heavily damaged (large tears, unusable as clothing)',
    ],
    cleanliness: [
      'Yes, clean and ready for use',
      'Needs cleaning',
    ],
    itemHints: ['Fabric scraps', 'Top', 'Pants / Jeans', 'Dress', 'Jacket / Outerwear', 'Household textile (curtains, bedsheets)'],
    fabricHints: ['cotton', 'linen', 'denim', 'wool', 'silk'],
  },
};

function normalize(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .trim();
}

function normalizeList(values?: string[] | string | null) {
  if (Array.isArray(values)) {
    return values.map(normalize).filter(Boolean);
  }

  if (typeof values === 'string') {
    return values.split(',').map(normalize).filter(Boolean);
  }

  return [];
}

function parseExpected(expression: string) {
  return expression
    .split(/\s+OR\s+/i)
    .map((group) => group.split(/[,&]/).map(normalize).filter(Boolean))
    .filter((group) => group.length > 0);
}

function checkExpected(question: string, expression: string, selectedValues: string[] | string | null | undefined): RuleCheck {
  const expectedGroups = parseExpected(expression);
  const selected = normalizeList(selectedValues);
  const scoredGroups = expectedGroups.map((group) => ({
    score: group.filter((value) => selected.includes(value)).length,
    total: group.length,
  }));
  const bestGroup = scoredGroups.sort((a, b) => b.score / b.total - a.score / a.total)[0] || {
    score: 0,
    total: 1,
  };

  return {
    question,
    matched: bestGroup.score === bestGroup.total,
    expected: expression,
    selected: selectedValues
      ? Array.isArray(selectedValues)
        ? selectedValues.join(', ')
        : selectedValues
      : 'None',
    score: bestGroup.score,
    total: bestGroup.total,
  };
}

function includesAnyText(value: unknown, hints: string[]) {
  const haystack = Array.isArray(value)
    ? value.join(' ')
    : typeof value === 'string'
      ? value
      : '';

  return hints.some((hint) => normalize(haystack).includes(normalize(hint)));
}

function isFabricScrapsOnly(submission: any) {
  const itemTypes = normalizeList(submission.details?.item_types);
  if (itemTypes.length > 0) {
    return itemTypes.length === 1 && itemTypes[0] === 'fabric scraps';
  }

  const itemType = normalize(submission.item_type);
  return itemType === 'fabric scraps';
}

function hasUniformBranding(submission: any) {
  const explicit = normalize(firstDetail(submission, 'uniform_branding'));
  if (['yes', 'true', 'uniform', 'branded'].includes(explicit)) {
    return true;
  }

  const textSignal = normalizeList([
    submission.item_type,
    submission.details?.item_types,
    submission.details?.other_item_type,
    submission.description,
  ].filter(Boolean).flat() as any).join(' ');

  return /uniform|company branding|school branding|institutional branding|branded work/.test(textSignal);
}

function getDonationBlock(submission: any): EligibilityResult | null {
  const condition = normalize(firstDetail(submission, 'condition'));
  const cleanliness = normalize(firstDetail(submission, 'cleanliness'));

  if (hasUniformBranding(submission)) {
    return {
      eligible: false,
      category: 'donation_uniform_branding',
      reason: 'Uniform or identifiable institutional/company branding',
      message:
        'Uniforms or clothing with identifiable company, school, or institutional branding are not suitable for donation. Please choose Upcycle or Recycle instead.',
    };
  }

  if (condition.includes('heavily damaged')) {
    return {
      eligible: false,
      category: 'donation_heavily_damaged',
      reason: 'Heavily damaged item',
      message:
        'Heavily damaged items are not suitable for donation. Please choose Upcycle or Recycle instead, since donated clothing must still be wearable and usable.',
    };
  }

  if (cleanliness.includes('heavily soiled') || cleanliness.includes('contaminated')) {
    return {
      eligible: false,
      category: 'donation_heavily_soiled',
      reason: 'Heavily soiled or contaminated item',
      message:
        'Heavily soiled or contaminated items cannot be accepted for donation. Please clean the item first or choose another recovery option.',
    };
  }

  return null;
}

function firstDetail(submission: any, key: string, fallback?: string) {
  return submission.details?.[key] || submission[key] || fallback || '';
}

function materialCategory(submission: any, burnAnalysis: any) {
  const details = submission.details || {};
  const signal = normalizeList([
    details.fiber_composition,
    details.fabric_types,
    details.custom_fabric_text,
    details.fabric_description,
    submission.fabric,
    burnAnalysis.top_fibers?.[0]?.fiber,
  ].filter(Boolean).flat() as any);
  const joined = signal.join(' ');

  if (/cotton|linen|rayon|tencel|viscose|natural/.test(joined)) {
    return 'cotton_natural';
  }
  if (/polyester|nylon|acrylic|spandex|synthetic|acetate|fleece/.test(joined)) {
    return 'polyester_synthetic';
  }
  if (/blend|cotton-spandex|poly-spandex|cotton.*poly|poly.*cotton/.test(joined)) {
    return 'cotton_poly_blend';
  }
  if (/wool|silk/.test(joined)) {
    return 'wool_silk_delicate';
  }

  return details.fiber_composition || 'mixed_unknown';
}

function inferWearability(submission: any) {
  const explicit = firstDetail(submission, 'wearability');
  if (explicit) {
    return explicit;
  }

  const condition = normalize(firstDetail(submission, 'condition'));
  if (condition.includes('good')) {
    return 'wearable_as_is';
  }
  if (condition.includes('minor')) {
    return 'wearable_after_minor_repair';
  }
  if (condition.includes('heavily')) {
    return 'not_wearable_fabric_usable';
  }

  return 'not_usable';
}

function inferDamage(submission: any) {
  const explicit = firstDetail(submission, 'damage_classification');
  if (explicit) {
    return explicit;
  }

  const condition = normalize(firstDetail(submission, 'condition'));
  if (condition.includes('good')) {
    return 'none';
  }
  if (condition.includes('minor')) {
    return 'small_hole_tear';
  }
  if (condition.includes('heavily')) {
    return 'large_tear_heavy_damage';
  }

  return 'fabric_degradation';
}

function inferRepairability(submission: any) {
  const explicit = firstDetail(submission, 'repairability');
  if (explicit) {
    return explicit;
  }

  const damage = normalize(inferDamage(submission));
  if (damage === 'none') {
    return 'no_repair_needed';
  }
  if (/minor|missing|loose|small/.test(damage)) {
    return 'minor_repair';
  }
  if (/large|heavy/.test(damage)) {
    return 'moderate_repair';
  }

  return 'not_practical';
}

function inferContamination(submission: any) {
  const explicit = firstDetail(submission, 'contamination_level');
  if (explicit) {
    return explicit;
  }

  const cleanliness = normalize(firstDetail(submission, 'cleanliness'));
  if (cleanliness.includes('clean and ready')) {
    return 'clean';
  }
  if (cleanliness.includes('needs cleaning')) {
    return 'washable_dirt_odor';
  }
  if (cleanliness.includes('contaminated')) {
    return 'oil_paint_biological';
  }

  return cleanliness || 'washable_dirt_odor';
}

function inferRepurposingPotential(submission: any) {
  const explicit = firstDetail(submission, 'repurposing_potential');
  if (explicit) {
    return explicit;
  }

  const itemSignal = normalizeList([submission.item_type, submission.details?.item_types, submission.details?.other_item_type].filter(Boolean).flat() as any).join(' ');
  const damage = normalize(inferDamage(submission));
  if (/curtains|bedsheets|denim|pants|jeans|dress|fabric scraps|household textile/.test(itemSignal)) {
    return damage.includes('fabric_degradation') ? 'medium' : 'high';
  }
  if (/small|minor|large/.test(damage)) {
    return 'medium';
  }

  return 'low';
}

function inferTrimRemoval(submission: any) {
  return firstDetail(submission, 'trim_removal', 'easy');
}

export function evaluateEligibility(submission: any): EligibilityResult {
  const restrictedCategory = normalize(firstDetail(submission, 'restricted_category', 'none')).replace(/\s+/g, '_');
  if (restrictedCategory && restrictedCategory !== 'none' && restrictedCategory !== 'none_of_the_above') {
    return {
      eligible: false,
      category: restrictedCategory,
      reason: restrictedCategoryLabels[restrictedCategory] || 'Restricted textile category',
      message:
        restrictedMessages[restrictedCategory] ||
        'This item is not eligible for the normal textile recovery DSS stream.',
    };
  }

  const contamination = normalize(inferContamination(submission));
  if (contamination.includes('chemical') || contamination.includes('mold')) {
    return {
      eligible: false,
      category: 'mold_chemical_contaminated',
      reason: restrictedCategoryLabels.mold_chemical_contaminated,
      message: restrictedMessages.mold_chemical_contaminated,
    };
  }

  return {
    eligible: true,
    category: 'none',
  };
}

function pathwayRuleScore(pathway: Exclude<Pathway, 'buyback' | 'rejected'>, submission: any, burnAnalysis: any) {
  const rule = pathwayRules[pathway];
  const condition = submission.condition || submission.details?.condition || '';
  const cleanliness = submission.cleanliness || submission.details?.cleanliness || '';
  const itemSignal = [submission.item_type, submission.details?.item_types, submission.details?.other_item_type].filter(Boolean).flat();
  const fabricSignal = [
    submission.fabric,
    submission.details?.fabric_types,
    submission.details?.custom_fabric_text,
    submission.details?.fabric_description,
    burnAnalysis.top_fibers?.[0]?.fiber,
  ].filter(Boolean).flat();
  const material = materialCategory(submission, burnAnalysis);
  const wearability = inferWearability(submission);
  const damage = inferDamage(submission);
  const repairability = inferRepairability(submission);
  const contamination = inferContamination(submission);
  const repurposing = inferRepurposingPotential(submission);
  const trimRemoval = inferTrimRemoval(submission);
  const quantity = Number(submission.quantity || 1);
  const scrapsOnly = isFabricScrapsOnly(submission);
  const uniformBranding = hasUniformBranding(submission);
  const conditionMatched = rule.conditions.map(normalize).includes(normalize(condition));
  const cleanlinessMatched = rule.cleanliness.map(normalize).includes(normalize(cleanliness));
  const itemMatched = includesAnyText(itemSignal, rule.itemHints);
  const fabricMatched = includesAnyText(fabricSignal, rule.fabricHints);
  const scoringChecks = [
    {
      question: 'Donation uniform eligibility',
      matched: pathway !== 'donate' || !uniformBranding,
      expected: pathway === 'donate' ? 'No uniforms or identifiable institutional/company branding' : 'Not applicable',
      selected: uniformBranding ? 'Uniform or identifiable branding indicated' : 'No uniform branding indicated',
    },
    {
      question: 'Condition',
      matched: conditionMatched,
      expected: rule.conditions.join(' OR '),
      selected: condition || 'None',
    },
    {
      question: 'Cleanliness',
      matched: cleanlinessMatched,
      expected: rule.cleanliness.join(' OR '),
      selected: cleanliness || 'None',
    },
    {
      question: 'Item type',
      matched: itemMatched,
      expected: rule.itemHints.join(' OR '),
      selected: Array.isArray(itemSignal) ? itemSignal.join(', ') : String(itemSignal || 'None'),
    },
    {
      question: 'Fabric signal',
      matched: fabricMatched,
      expected: rule.fabricHints.join(' OR '),
      selected: Array.isArray(fabricSignal) ? fabricSignal.join(', ') : String(fabricSignal || 'None'),
    },
    {
      question: 'Material/fiber composition',
      matched:
        pathway === 'recycle'
          ? ['cotton_natural', 'polyester_synthetic', 'cotton_poly_blend'].includes(material)
          : pathway === 'donate'
            ? material !== 'mixed_unknown'
            : true,
      expected:
        pathway === 'donate'
          ? 'Identifiable safe textile fiber'
          : pathway === 'recycle'
            ? 'Identifiable cotton/natural, polyester/synthetic, or accepted blend'
            : 'Any clean textile with usable fabric sections',
      selected: material,
    },
    {
      question: 'Wearability',
      matched: scrapsOnly
        ? true
        : pathway === 'donate'
          ? ['wearable_as_is', 'wearable_after_minor_repair'].includes(wearability)
          : pathway === 'upcycle'
            ? wearability !== 'not_usable'
            : wearability !== 'wearable_as_is',
      expected: scrapsOnly
        ? 'Not applicable for fabric scraps-only submissions'
        : pathway === 'donate'
          ? 'Wearable as-is or after minor repair'
          : pathway === 'upcycle'
            ? 'Not necessarily wearable, but fabric remains usable'
            : 'No longer suitable for direct reuse',
      selected: scrapsOnly ? 'Skipped' : wearability,
      skipped: scrapsOnly,
    },
    {
      question: 'Repairability',
      matched: scrapsOnly
        ? true
        : pathway === 'donate'
          ? ['no_repair_needed', 'minor_repair'].includes(repairability)
          : pathway === 'upcycle'
            ? ['minor_repair', 'moderate_repair', 'not_practical'].includes(repairability)
            : ['moderate_repair', 'not_practical'].includes(repairability),
      expected: scrapsOnly
        ? 'Not applicable for fabric scraps-only submissions'
        : pathway === 'donate'
          ? 'No repair or minor repair'
          : pathway === 'upcycle'
            ? 'Repair or redesign can preserve material value'
            : 'Repair is not the main route',
      selected: scrapsOnly ? 'Skipped' : repairability,
      skipped: scrapsOnly,
    },
    {
      question: 'Contamination level',
      matched:
        pathway === 'donate'
          ? ['clean', 'washable_dirt_odor'].includes(contamination)
          : pathway === 'upcycle'
            ? ['clean', 'washable_dirt_odor', 'permanent_stain'].includes(contamination)
            : ['clean', 'washable_dirt_odor', 'permanent_stain'].includes(contamination),
      expected:
        pathway === 'donate'
          ? 'Clean or washable only'
          : 'No chemical, mold, oil, paint, or biological contamination',
      selected: contamination,
    },
    {
      question: 'Damage classification',
      matched:
        pathway === 'donate'
          ? ['none', 'minor_cosmetic', 'missing_button_loose_seam'].includes(damage)
          : pathway === 'upcycle'
            ? ['minor_cosmetic', 'missing_button_loose_seam', 'small_hole_tear', 'large_tear_heavy_damage'].includes(damage)
            : ['large_tear_heavy_damage', 'fabric_degradation', 'small_hole_tear'].includes(damage),
      expected:
        pathway === 'donate'
          ? 'No damage or minor repairable damage'
          : pathway === 'upcycle'
            ? 'Localized or structural damage with usable sections'
            : 'Damaged enough for material recovery',
      selected: damage,
    },
    {
      question: 'Repurposing potential',
      matched:
        pathway === 'upcycle'
          ? ['high', 'medium'].includes(repurposing)
          : pathway === 'recycle'
            ? ['low', 'medium'].includes(repurposing)
            : repurposing !== 'low',
      expected:
        pathway === 'upcycle'
          ? 'High or medium usable fabric sections'
          : pathway === 'recycle'
            ? 'Low or medium repurposing value'
            : 'Item retains original-use value',
      selected: repurposing,
    },
    {
      question: 'Trim/accessory removal',
      matched:
        pathway === 'recycle'
          ? ['none', 'easy'].includes(trimRemoval)
          : pathway === 'upcycle'
            ? trimRemoval !== 'many_mixed_components'
            : true,
      expected:
        pathway === 'recycle'
          ? 'No trims or easy-to-remove trims'
          : pathway === 'upcycle'
            ? 'Components manageable for redesign'
            : 'Not restrictive for direct reuse',
      selected: trimRemoval,
    },
    {
      question: 'Quantity/batch suitability',
      matched: pathway === 'recycle' ? quantity >= 2 || material !== 'mixed_unknown' : true,
      expected: pathway === 'recycle' ? 'Similar identifiable batch preferred' : 'Any quantity accepted',
      selected: String(quantity),
    },
  ];
  const weights =
    pathway === 'donate'
      ? [0, 12, 15, 8, 5, 8, 20, 10, 15, 7, 0, 0, 0]
      : pathway === 'upcycle'
        ? [0, 5, 10, 10, 5, 5, 5, 15, 15, 15, 15, 5, 5]
        : [0, 8, 15, 5, 20, 20, 0, 5, 15, 15, 5, 10, 7];
  const applicableWeights = weights.map((weight, index) =>
    scoringChecks[index]?.skipped ? 0 : weight,
  );
  const earned = scoringChecks.reduce(
    (total, check, index) => total + (check.matched ? applicableWeights[index] : 0),
    0,
  );
  const possible = applicableWeights.reduce((total, weight) => total + weight, 0);
  const score =
    pathway === 'donate' && uniformBranding
      ? 0
      : possible > 0
        ? (earned / possible) * 100
        : 0;
  const matched = scoringChecks.filter((check) => check.matched).length;

  return {
    matched,
    score,
    checks: scoringChecks,
  };
}

export function analyzeBurnTest(burnTest: any) {
  if (!burnTest?.performed) {
    return {
      performed: false,
      top_fibers: [],
      summary: 'Burn test was not performed, so fabric confidence comes from the item details only.',
    };
  }

  const results = fabricRules
    .map((rule) => {
      const checks = [
        checkExpected('Moment flame touched textile', rule.moment, burnTest.moment),
        checkExpected('While in flames', rule.flames, burnTest.flames),
        checkExpected('No flame observation', rule.noFlame, burnTest.no_flame),
        checkExpected('Smell', rule.smell, burnTest.smell),
        checkExpected('Ashes', rule.ashes, burnTest.ashes),
      ];
      const matched = checks.reduce((total, check) => total + (check.score || 0), 0);
      const possible = checks.reduce((total, check) => total + (check.total || 1), 0);
      const confidence = possible > 0 ? matched / possible : 0;

      return {
        fiber: rule.fiber,
        score: matched,
        confidence,
        reasoning: checks
          .filter((check) => check.matched)
          .map((check) => `${check.question} matched ${check.expected}`),
        checks,
      };
    })
    .sort((a, b) => b.confidence - a.confidence || b.score - a.score)
    .slice(0, 3);

  return {
    performed: true,
    top_fibers: results,
    summary:
      results.length > 0
        ? `Your fabric might be ${results.map((result) => result.fiber).join(', ')} based on burn-test behavior.`
        : 'No close burn-test fabric match was found.',
  };
}

export function buildPathwayRecommendations(submission: any) {
  const preferred = normalize(submission.service_type || submission.action);
  const burnAnalysis = analyzeBurnTest(submission.burn_test);
  const eligibility = evaluateEligibility(submission);
  const donationBlock = preferred === 'donate' ? getDonationBlock(submission) : null;

  if (donationBlock) {
    return [
      {
        recommended_pathway: 'rejected' as const,
        score: 100,
        rawScore: 100,
        confidence: 1,
        explanation:
          donationBlock.message || 'This item is not suitable for donation.',
        checks: [
          {
            question: 'Donation eligibility',
            matched: true,
            expected: 'Clean, wearable, non-uniform clothing suitable for redistribution',
            selected: donationBlock.reason || donationBlock.category,
          },
        ],
        rank: 1,
        burn_test_result: burnAnalysis.top_fibers[0]?.fiber || null,
        eligibility: donationBlock,
      },
    ];
  }

  if (!eligibility.eligible) {
    return [
      {
        recommended_pathway: 'rejected' as const,
        score: 100,
        rawScore: 100,
        confidence: 1,
        explanation: eligibility.message || 'This item is not eligible for the normal textile recovery DSS stream.',
        checks: [
          {
            question: 'Q0 Restricted category screening',
            matched: true,
            expected: 'None of the above',
            selected: eligibility.reason || eligibility.category,
          },
        ],
        rank: 1,
        burn_test_result: burnAnalysis.top_fibers[0]?.fiber || null,
        eligibility,
      },
    ];
  }

  const recommendations: Array<{
    recommended_pathway: Pathway;
    score: number;
    rawScore: number;
    confidence: number;
    explanation: string;
    checks: RuleCheck[];
    eligibility?: EligibilityResult;
  }> = (['recycle', 'donate', 'upcycle'] as const).map((pathway) => {
    const ruleResult = pathwayRuleScore(pathway, submission, burnAnalysis);
    const preferenceBoost = preferred === pathway ? 8 : 0;
    const rawScore = ruleResult.score + preferenceBoost;
    const score = Math.min(100, rawScore);
    const confidence = score / 100;

    return {
      recommended_pathway: pathway,
      score,
      rawScore,
      confidence,
      explanation: buildPathwayExplanation(pathway, ruleResult.checks),
      checks: ruleResult.checks,
      eligibility,
    };
  });

  if (submission.buyback_interest) {
    recommendations.push({
      recommended_pathway: 'buyback',
      score: 78,
      rawScore: 78,
      confidence: 0.78,
      explanation:
        'Buyback is included because the user selected Upcycle and said they are interested in selling the upcycled item.',
      checks: [
        {
          question: 'Buyback interest',
          matched: true,
          expected: 'User selected buyback interest',
          selected: 'Yes',
        },
      ],
      eligibility,
    });
  }

  return recommendations
    .sort((a, b) => b.rawScore - a.rawScore)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
      burn_test_result: burnAnalysis.top_fibers[0]?.fiber || null,
    }));
}

function buildPathwayExplanation(pathway: Pathway, checks: RuleCheck[]) {
  const matched = checks.filter((check) => check.matched && !check.skipped).map((check) => check.question);
  const skipped = checks.filter((check) => check.skipped).map((check) => check.question);
  const missing = checks.filter((check) => !check.matched && !check.skipped).map((check) => check.question);
  const pathwayLabel = pathway === 'donate' ? 'donation' : pathway;
  const parts = [
    `${pathwayLabel} is based on textile recovery DSS rules for condition, cleanliness, fiber composition, wearability, repairability, contamination, damage, and repurposing potential.`,
  ];

  if (matched.length > 0) {
    parts.push(`Matched: ${matched.join(', ')}.`);
  }

  if (missing.length > 0) {
    parts.push(`Not matched: ${missing.join(', ')}.`);
  }

  if (skipped.length > 0) {
    parts.push(`Skipped as not applicable: ${skipped.join(', ')}.`);
  }

  return parts.join(' ');
}
