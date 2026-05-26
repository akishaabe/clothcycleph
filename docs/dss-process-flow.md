# ClothCycle PH DSS Process Flow

```mermaid
flowchart TD
  Start([DSS starts]) --> CollectInput[Collect textile submission input]
  CollectInput --> BasicFields[Read item type, condition, cleanliness, quantity, selected action, and description]
  CollectInput --> DetailFields[Read detailed textile fields]
  DetailFields --> DetailList[Fabric/material, restricted category, uniform branding, wearability, repairability, contamination, damage, repurposing potential, trim removal, weight]
  CollectInput --> BurnTestChoice{Burn test provided?}

  BurnTestChoice -- Yes --> AnalyzeBurn[Analyze burn-test observations]
  AnalyzeBurn --> FiberSignals[Rank likely fibers by flame behavior, smell, ash, and after-flame behavior]
  BurnTestChoice -- No --> UseFormSignals[Use submitted fabric and material details only]

  BasicFields --> EligibilityScreen[Run eligibility screening]
  DetailList --> EligibilityScreen
  FiberSignals --> EligibilityScreen
  UseFormSignals --> EligibilityScreen

  EligibilityScreen --> RestrictedDecision{Restricted category or unsafe contamination?}
  RestrictedDecision -- Yes --> RejectNormalFlow[Return rejected pathway with reason]
  RejectNormalFlow --> RejectionOutput[Show safety or eligibility guidance]

  RestrictedDecision -- No --> DonationBlock{Donation selected but blocked?}
  DonationBlock -- Yes --> DonationReject[Return rejected pathway for donation-only block]
  DonationReject --> RejectionOutput

  DonationBlock -- No --> ScorePathways[Score Donate, Recycle, and Upcycle]
  ScorePathways --> DonationRules[Donation checks: wearable condition, clean or washable, safe material, donation eligibility, low damage]
  ScorePathways --> RecycleRules[Recycle checks: synthetic/natural material signal, damage, contamination safety, batch suitability, trim removal]
  ScorePathways --> UpcycleRules[Upcycle checks: usable fabric sections, repurposing potential, damage, repairability, trims, user upcycle request]

  DonationRules --> CriteriaResults[Create matched, not matched, and skipped criteria]
  RecycleRules --> CriteriaResults
  UpcycleRules --> CriteriaResults

  CriteriaResults --> PreferenceBoost[Apply small boost when user selected the same pathway]
  PreferenceBoost --> ComputeScore[Compute score and confidence]
  ComputeScore --> RankPathways[Rank pathways by raw score, then confidence]
  RankPathways --> Explanation[Generate pathway explanation with criteria context]
  Explanation --> BagAndImpact[Attach bag-color reminder and route context]
  BagAndImpact --> PartnerHandoff[Build partner brief and suggested partner context]

  PartnerHandoff --> UserReview[User reviews recommendations and may choose another pathway]
  UserReview --> SelectedResult[Selected pathway and partner are submitted]
  SelectedResult --> SaveAudit[Save recommendation run and selected recommendation result]
  SaveAudit --> CreateRequest[Create pending partner request]
  CreateRequest --> NotifyPartner[Notify partner and send request message]
  NotifyPartner --> End([DSS handoff complete])
```

## DSS Outputs

- Ranked pathway recommendations for `donate`, `recycle`, and `upcycle`
- Possible `rejected` output for restricted or route-blocked submissions
- Confidence and score per pathway
- Matched, not matched, and skipped criteria
- Partner-facing brief with item, weight, bag color, burn-test context, and user notes
- Saved DSS audit records in `recommendation_runs` and `recommendation_results`
