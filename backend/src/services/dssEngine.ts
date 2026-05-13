type Pathway = 'recycle' | 'donate' | 'upcycle' | 'buyback';

export const DSS_ENGINE_VERSION = 'dssEngine-v1';

interface RuleCheck {
  question: string;
  matched: boolean;
  expected: string;
  selected: string;
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

const pathwayRules: Record<Exclude<Pathway, 'buyback'>, { conditions: string[]; cleanliness: string[] }> = {
  recycle: {
    conditions: [
      'Good condition (wearable, no major damage)',
      'Minor damage (small tears, loose seams, stains)',
      'Heavily damaged (large tears, unusable as clothing)',
    ],
    cleanliness: ['Yes, clean and ready for use', 'Needs cleaning'],
  },
  donate: {
    conditions: ['Good condition (wearable, no major damage)'],
    cleanliness: ['Yes, clean and ready for use', 'Needs cleaning'],
  },
  upcycle: {
    conditions: [
      'Good condition (wearable, no major damage)',
      'Minor damage (small tears, loose seams, stains)',
      'Heavily damaged (large tears, unusable as clothing)',
    ],
    cleanliness: [
      'Yes, clean and ready for use',
      'Needs cleaning',
      'Heavily soiled or contaminated',
    ],
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
  if (expression.includes('&')) {
    return {
      mode: 'all' as const,
      values: expression.split('&').map(normalize).filter(Boolean),
    };
  }

  return {
    mode: 'any' as const,
    values: expression.split(/\s+OR\s+|,/i).map(normalize).filter(Boolean),
  };
}

function checkExpected(question: string, expression: string, selectedValues: string[] | string | null | undefined): RuleCheck {
  const expected = parseExpected(expression);
  const selected = normalizeList(selectedValues);
  const matched =
    expected.mode === 'all'
      ? expected.values.every((value) => selected.includes(value))
      : expected.values.some((value) => selected.includes(value));

  return {
    question,
    matched,
    expected: expression,
    selected: selectedValues
      ? Array.isArray(selectedValues)
        ? selectedValues.join(', ')
        : selectedValues
      : 'None',
  };
}

function pathwayRuleScore(pathway: Exclude<Pathway, 'buyback'>, condition: string, cleanliness: string) {
  const rule = pathwayRules[pathway];
  const conditionMatched = rule.conditions.map(normalize).includes(normalize(condition));
  const cleanlinessMatched = rule.cleanliness.map(normalize).includes(normalize(cleanliness));
  const matched = [conditionMatched, cleanlinessMatched].filter(Boolean).length;

  return {
    matched,
    score: (matched / 2) * 100,
    checks: [
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
    ],
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
      const matched = checks.filter((check) => check.matched).length;
      const confidence = matched / checks.length;

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
  const condition = submission.condition || submission.details?.condition || '';
  const cleanliness = submission.cleanliness || submission.details?.cleanliness || '';
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
    const ruleResult = pathwayRuleScore(pathway, condition, cleanliness);
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
