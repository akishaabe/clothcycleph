# ClothCycle PH DSS Matrix

Engine version: `dssEngine-v2-textile-recovery`

This matrix documents the current DSS behavior implemented in `backend/src/services/dssEngine.ts` and the current submission questions in `src/app/pages/SubmissionFormPage.jsx`.

## Intake Fields

| Area | Field | Question / Source | Choices / Input |
|---|---|---|---|
| Screening | `details.restricted_category` | Does the item belong to any restricted category? | Hospital/medical uniform; PPE or contaminated workwear; Used undergarments; Mold- or chemical-contaminated textile; None of the above |
| Screening | `details.uniform_branding` | Donation only: Is the item a uniform or does it have identifiable company, school, or institutional branding? | Yes; No. Yes blocks Donation and recommends Upcycle or Recycle |
| Submission label | `submission_name` | Name this submission | Free text |
| Item | `details.item_types`, `item_type` | What type of item/s are you submitting? | Donation: Top; Pants / Jeans; Dress; Jacket / Outerwear; Household textile; Other. Recycle/Upcycle: Top; Pants / Jeans; Dress; Jacket / Outerwear; Household textile; Fabric scraps; Other |
| Item | `details.other_item_type` | Other item type | Free text |
| Condition | `condition`, `details.condition` | What is the overall condition of the item? | Good condition; Minor damage; Heavily damaged |
| Cleanliness | `cleanliness`, `details.cleanliness` | Is/are the item/s clean? | Yes, clean and ready for use; Needs cleaning; Heavily soiled or contaminated |
| Quantity | `quantity` | Quantity | Number |
| Fabric | `details.knows_fabric_type` | Do you know the fabric type? | Yes; No |
| Fabric | `details.fabric_types` | What is the fabric type? | Cotton/Linen; Polyester/nylon/acrylic; Viscose/Rayon; Cotton-spandex/poly-spandex; Coated/PPE; Wool/Silk; Other/user-defined |
| Fabric | `details.custom_fabric_text` | User-defined fabric text | Free text, appears when Other/user-defined is selected |
| Fabric | `details.fabric_identification` | How did you identify the fabric? | Clothing label; Personal knowledge; Burn test |
| Fabric | `details.brand`, `details.no_brand_visible` | What is the brand? | Free text; no brand visible |
| Fabric | `details.fabric_description` | How would you describe the fabric? | Same descriptive fabric choices when type is unknown |
| Fabric | `details.fiber_composition` | What is the main material/fiber composition? | 100% cotton/natural; 100% polyester/synthetic; Cotton-poly/stretch blend; Wool/silk/delicate; Mixed/unknown |
| Recovery | `details.wearability` | Is the item still wearable or usable? | Wearable as-is; Wearable after minor repair; Not wearable but fabric usable; Not usable. Disabled/not required when Fabric scraps is the only selected item type |
| Recovery | `details.damage_classification` | What is the damage classification? | No damage; Minor cosmetic issue; Missing button/loose seam; Small hole/tear; Large tear/heavy damage; Fabric degradation |
| Recovery | `details.repairability` | Is the item repairable? | No repair needed; Minor repair; Moderate repair; Not practical to repair. Disabled/not required when Fabric scraps is the only selected item type |
| Recovery | `details.contamination_level` | What is the contamination level? | Appears only when condition is Minor damage or Heavily damaged. Choices: Clean; Washable dirt/odor; Permanent stain; Oil/paint/biological contamination; Chemical/mold contamination |
| Recovery | `details.repurposing_potential` | What is the repurposing potential? | High; Medium; Low |
| Recovery | `details.trim_removal` | Are trims/accessories easy to remove? | None; Easy to remove; Difficult to remove; Many mixed components |
| Pathway | `service_type`, `action` | Intended pathway | Donate; Recycle; Upcycle |
| Buyback | `buyback_interest` | Interested in buyback? | Yes; No |
| Buyback | `upcycle_request` | What would you like this item to become? | Free text |
| Media | `photos[]` | Uploaded images | URL plus optional user label |

## Burn Test Fabric Matrix

Scoring rule: each answer group is split by `OR`, then comma/`&`. The best group receives partial credit. Example: wool flame behavior has 3 expected tokens, so selecting all three scores 3/3.

| Fiber | Moment flame touched textile | While in flames | After flame removed | Smell | Ash / residue |
|---|---|---|---|---|---|
| Cotton | Burned fast | Burns quickly | Continues to burn quickly, Has an afterglow | Like burning paper | Light and feathery gray ash OR Black ash |
| Linen | Burned fast | Burns quickly | Continues to burn | Like burning paper | Light and feathery gray ash |
| Rayon / Tencel | Burned fast | Burns quickly | Continues to burn quickly | Like burning paper | Light and feathery gray ash |
| Silk | Curled away, No flame | Burns slowly, Sputters | Burns with difficulty, Completely stops burning | Like burning hair | Round shiny black beads AND Easy to crush |
| Wool | Curled away, No flame, Burned slowly | Burns slowly, Sizzles, Flame was flickering | Completely stops burning | Like burning hair | Easy to crush, Irregular bead |
| Nylon | Melted and did not burn, Shrinked away from flame | Melts, Burns slowly | Completely stops burning | Like celery | Round hard grayish bead AND Will not crush |
| Polyester / Poly fleece | Shrinked away from flame | Melts, Burns slowly | Burns with difficulty | Like chemicals | Round hard grayish bead AND Will not crush |
| Acetate | Shrinked away from flame, Turned black | Sputters, Melts, Drips, Burns quickly | Continues to melt and burn | Like vinegar | Hard black ash, Irregular bead, Difficult to crush |
| Acrylic | Shrinked away from flame | Burns quickly, Sputters, Melts | Continues to melt and burn | Like chemicals | Irregular hard black bead AND Will not crush |
| Spandex | Shrinked away from flame | Melts, Burns quickly | Continues to melt and burn | Sharp and bitter | Soft, sticky, gummy |

## Eligibility Gate

| Rule | DSS Result |
|---|---|
| Restricted category is not `none` | Return `rejected` with 100% confidence and stop normal pathway ranking |
| Donation selected and `details.uniform_branding` is `Yes` | Return `rejected` for Donation with 100% confidence; message recommends Upcycle or Recycle |
| Donation selected and condition is Heavily damaged | Return `rejected` for Donation with 100% confidence; message recommends Upcycle or Recycle |
| Donation selected and cleanliness is Heavily soiled or contaminated | Return `rejected` for Donation with 100% confidence; message asks user to clean the item or choose another recovery option |
| Contamination includes chemical or mold | Return `rejected` with 100% confidence and stop normal pathway ranking |
| Otherwise | Continue to donation/recycle/upcycle scoring |

## Current User Form Flow

1. Safety screening: restricted textile categories. Donation also asks whether the item is a uniform or has identifiable company, school, or institutional branding; a Yes answer blocks progression/submission.
2. Burn test optional flow: result appears before item details.
3. Item details: submission name, item type, condition, cleanliness, quantity. Donation excludes Fabric scraps and blocks Heavily damaged or Heavily soiled/contaminated answers.
4. Fabric details: ask whether the user knows the fabric type, then ask fabric type or fabric description, identification method, brand, and finally fiber composition.
5. Recovery criteria: wearability, damage classification, repairability, conditional contamination level, repurposing potential, trim/accessory removal. Donation skips this section. Recycle/Upcycle disable wearability and repairability when Fabric scraps is the only selected item type; disabled answers are cleared, not required, and not scored.
6. Intended pathway, buyback request, description, image upload and labels.
7. Review and submit.

## DSS Output Surfaces

| Screen | Output | Notes |
|---|---|---|
| Burn-test confirmation | Top 3 possible fabric types with confidence and reasoning | Shown immediately after burn-test questions when burn test is performed |
| DSS confirmation | `DSS Recommendations` read-only list with all ranked pathways | Includes rank, confidence, score, explanation, matched checks, missed checks, and a why-this-was-recommended accordion |
| DSS pathway selector | Separate `Send this request as` control | User can keep the initial pathway or switch; the DSS score cards themselves are no longer the selector |
| DSS confirmation selected pathway | User-selected pathway remains visible with full DSS confidence details | If an initial intent exists, the page asks for confirmation before sending and states whether the selected pathway matches the top DSS recommendation |
| Partner request brief | Partner-facing summary of the chosen pathway and DSS result | Includes selected pathway, confidence, rank, score, all pathway scores, item details, DSS reasoning, matched checks, and review flags |
| Partner request modal | Detailed partner review panel | Shows brief, DSS engine result, score, matched/missed checks, item details, burn-test details, and uploaded images |
| Admin audit panel | DSS explanation audit | Uses `recommendation_runs` and `recommendation_results` with `engine_version`, `input_snapshot`, `rule_checks`, and selected partner context |

## Pathway Scoring

Each pathway receives a weighted score out of 100. If the user's selected service matches a pathway, the pathway receives an 8-point preference boost capped at 100.

When Fabric scraps is the only selected item type, Wearability and Repairability are marked not applicable. They are not required in the form, are stored as null, and their weights are removed from scoring before the pathway score is normalized back to 100.

### Donation

Donation has a hard eligibility rule before normal scoring: the item must be clean, wearable, non-uniform clothing/textile suitable for dignified redistribution. Donation blocks heavily damaged items, heavily soiled/contaminated items, uniforms or identifiable company/school/institutional branding, and Fabric scraps.

| Criterion | Weight | Match Condition |
|---|---:|---|
| Donation uniform eligibility | 0 | Must not be a uniform or have identifiable institutional/company/school branding. A failed check blocks Donation rather than reducing score |
| Condition | 12 | Good condition |
| Cleanliness | 15 | Clean and ready for use |
| Item type | 8 | Top, Pants/Jeans, Dress, Jacket/Outerwear |
| Fabric signal | 5 | Cotton, linen, rayon, tencel |
| Material/fiber | 8 | Identifiable safe textile fiber |
| Wearability | 20 | Wearable as-is or after minor repair |
| Repairability | 10 | No repair needed or minor repair |
| Contamination | 15 | Clean or washable dirt/odor |
| Damage | 7 | No damage, minor cosmetic issue, missing button/loose seam |
| Repurposing potential | 0 | Must not be low |
| Trim/accessory removal | 0 | Not restrictive |
| Quantity/batch | 0 | Any quantity |

### Upcycle

| Criterion | Weight | Match Condition |
|---|---:|---|
| Donation uniform eligibility | 0 | Not applicable |
| Condition | 5 | Minor damage or heavily damaged |
| Cleanliness | 10 | Clean or needs cleaning |
| Item type | 10 | Fabric scraps, clothing, household textile |
| Fabric signal | 5 | Cotton, linen, denim, wool, silk |
| Material/fiber | 5 | Any clean textile with usable sections |
| Wearability | 5 | Not necessarily wearable, but usable fabric remains. Skipped and removed from scoring when Fabric scraps is the only selected item type |
| Repairability | 15 | Repair/redesign can preserve material value. Skipped and removed from scoring when Fabric scraps is the only selected item type |
| Contamination | 15 | Clean, washable dirt/odor, or permanent stain |
| Damage | 15 | Localized or structural damage with usable sections |
| Repurposing potential | 15 | High or medium |
| Trim/accessory removal | 5 | Not many mixed components |
| Quantity/batch | 5 | Any quantity |

### Recycle

| Criterion | Weight | Match Condition |
|---|---:|---|
| Donation uniform eligibility | 0 | Not applicable |
| Condition | 8 | Minor damage or heavily damaged |
| Cleanliness | 15 | Needs cleaning or heavily soiled/contaminated |
| Item type | 5 | Fabric scraps or household textile |
| Fabric signal | 20 | Polyester, poly fleece, nylon, acrylic, spandex, acetate |
| Material/fiber | 20 | Identifiable cotton/natural, polyester/synthetic, or accepted blend |
| Wearability | 0 | No longer suitable for direct reuse. Skipped when Fabric scraps is the only selected item type |
| Repairability | 5 | Moderate repair or not practical. Skipped and removed from scoring when Fabric scraps is the only selected item type |
| Contamination | 15 | No chemical, mold, oil, paint, or biological contamination |
| Damage | 15 | Damaged enough for material recovery |
| Repurposing potential | 5 | Low or medium |
| Trim/accessory removal | 10 | No trims or easy-to-remove trims |
| Quantity/batch | 7 | Similar identifiable batch preferred |

## Buyback Preference

Buyback is not scored as a DSS pathway and does not appear as a ranked recommendation card. It is a yes/no preference that appears whenever the final pathway being sent is Upcycle, even if the user originally chose Donate or Recycle and later switches to Upcycle on the DSS confirmation page.

| Situation | Buyback behavior |
|---|---|
| Final selected pathway is Recycle | No buyback confirmation; partner brief has no buyback preference |
| Final selected pathway is Donate | No buyback confirmation; partner brief has no buyback preference |
| Final selected pathway is Upcycle | User confirms Yes or No for buyback before sending |
| User confirms Yes | Partner brief says the user is open to buyback if the partner supports it |
| User confirms No | Partner brief says the request is Upcycle only |

The chosen buyback preference is saved with the sent request context and shown on the partner request detail view so partners can decide whether they are accepting upcycle only or upcycle with buyback interest.
