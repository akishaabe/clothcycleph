type Pathway = 'recycle' | 'donate' | 'upcycle' | 'buyback';

export const DSS_ENGINE_VERSION = 'dssEngine-v1';

interface RuleCheck {
  question: string;
  matched: boolean;
  expected: string;
  selected: string;
  score?: number;
  total?: number;
}

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
  Exclude<Pathway, 'buyback'>,
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

function pathwayRuleScore(pathway: Exclude<Pathway, 'buyback'>, submission: any, burnAnalysis: any) {
  const rule = pathwayRules[pathway];
  const condition = submission.condition || submission.details?.condition || '';
  const cleanliness = submission.cleanliness || submission.details?.cleanliness || '';
  const itemSignal = [submission.item_type, submission.details?.item_types, submission.details?.other_item_type].filter(Boolean).flat();
  const fabricSignal = [
    submission.fabric,
    submission.details?.fabric_types,
    submission.details?.fabric_description,
    burnAnalysis.top_fibers?.[0]?.fiber,
  ].filter(Boolean).flat();
  const conditionMatched = rule.conditions.map(normalize).includes(normalize(condition));
  const cleanlinessMatched = rule.cleanliness.map(normalize).includes(normalize(cleanliness));
  const itemMatched = includesAnyText(itemSignal, rule.itemHints);
  const fabricMatched = includesAnyText(fabricSignal, rule.fabricHints);
  const brandMatched =
    pathway === 'donate'
      ? !submission.details?.no_brand_visible
      : pathway === 'upcycle'
        ? true
        : Boolean(submission.details?.no_brand_visible || !submission.details?.brand);
  const checks = [
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
      question: 'Brand handling',
      matched: brandMatched,
      expected:
        pathway === 'donate'
          ? 'Brand/identity visible preferred'
          : pathway === 'recycle'
            ? 'Unbranded or unknown brand acceptable'
            : 'Brand not restrictive',
      selected: submission.details?.no_brand_visible ? 'No brand visible' : submission.details?.brand || 'Not specified',
    },
  ];
  const weights = [30, 25, 20, 15, 10];
  const score = checks.reduce((total, check, index) => total + (check.matched ? weights[index] : 0), 0);
  const matched = checks.filter((check) => check.matched).length;

  return {
    matched,
    score,
    checks,
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

  const recommendations: Array<{
    recommended_pathway: Pathway;
    score: number;
    rawScore: number;
    confidence: number;
    explanation: string;
    checks: RuleCheck[];
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
      explanation: buildPathwayExplanation(pathway, ruleResult.checks, preferenceBoost),
      checks: ruleResult.checks,
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

function buildPathwayExplanation(pathway: Pathway, checks: RuleCheck[], preferenceBoost: number) {
  const matched = checks.filter((check) => check.matched).map((check) => check.question);
  const missing = checks.filter((check) => !check.matched).map((check) => check.question);
  const pathwayLabel = pathway === 'donate' ? 'donation' : pathway;
  const parts = [
    `${pathwayLabel} is based on DSS item-detail rules for condition and cleanliness.`,
  ];

  if (matched.length > 0) {
    parts.push(`Matched: ${matched.join(', ')}.`);
  }

  if (missing.length > 0) {
    parts.push(`Not matched: ${missing.join(', ')}.`);
  }

  if (preferenceBoost > 0) {
    parts.push('The user preferred this pathway, so it received a small preference boost.');
  }

  return parts.join(' ');
}
