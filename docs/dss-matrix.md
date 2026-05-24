# ClothCycle PH DSS Matrix

Engine version: `dssEngine-v2-textile-recovery`

Last updated: 2026-05-23

This matrix documents the current DSS behavior implemented in `backend/src/services/dssEngine.ts` and the current submission questions in `src/app/pages/SubmissionFormPage.jsx`.

## Current DSS Pathways

| Output type | Values | Notes |
|---|---|---|
| Ranked DSS recommendations | `recycle`, `donate`, `upcycle` | These are the only selectable pathways that can be sent to partners from the DSS confirmation page. |
| Hard-stop result | `rejected` | Returned when restricted-category, unsafe contamination, or donation-specific blocking rules apply. It is not sent as a partner request. |
| Buyback | Yes/No preference only | Buyback is not scored and is not a DSS recommendation card. It is collected only when the final selected pathway is Upcycle. |
| Admin editable DSS rules | Includes `buyback` as a record option | These records are for documentation/audit/future rule publishing. The live engine still uses the coded rule matrix. |

## Intake Fields

| Area | Field | Question / Source | Choices / Input |
|---|---|---|---|
| Screening | `details.restricted_category` | Does the item belong to any restricted category? | Hospital/medical uniform; PPE or contaminated workwear; Used undergarments; Mold- or chemical-contaminated textile; None of the above |
| Screening | `details.uniform_branding` | Donation only: Is the item a uniform or does it have identifiable company, school, or institutional branding? | Yes; No. Yes blocks Donation and recommends Upcycle or Recycle |
| Submission label | `submission_name` | Name this submission | Free text |
| Item | `details.item_types`, `item_type` | What type of item/s are you submitting? | Donation: Top; Bottoms; Outerwear. Recycle/Upcycle/general textile flow: Scraps; Big fabric panels (curtains, bedsheets); Clothes (top, outerwear, bottoms) |
| Item | `details.other_item_type` | Legacy other item type | Free text from older submissions only |
| Condition | `condition`, `details.condition` | What is the overall condition of the item? | Good condition; Minor damage; Heavily damaged |
| Cleanliness | `cleanliness`, `details.cleanliness` | Is/are the item/s clean? | Yes, clean and ready for use; Needs cleaning; Heavily soiled or contaminated |
| Quantity | `quantity` | Quantity | Number |
| Weight | `details.weight_value`, `details.weight_unit` | Estimated textile weight | Number plus kg/g selector |
| Fabric | `details.knows_fabric_type` | Do you know the fabric type? | Yes; No |
| Fabric | `details.fabric_types` | What is the fabric type? | Cotton/Linen; Polyester/nylon/acrylic; Viscose/Rayon; Cotton-spandex/poly-spandex; Coated/PPE; Wool/Silk; Other/user-defined |
| Fabric | `details.custom_fabric_text` | User-defined fabric text | Free text, appears when Other/user-defined is selected |
| Fabric | `details.fabric_identification` | How did you identify the fabric? | Clothing label; Personal knowledge; Burn test |
| Fabric | `details.brand`, `details.no_brand_visible` | What is the brand? | Free text; no brand visible |
| Fabric | `details.fabric_description` | How would you describe the fabric? | Same descriptive fabric choices when type is unknown |
| Fabric | `details.fiber_composition` | What is the main material/fiber composition? | 100% cotton/natural; 100% polyester/synthetic; Cotton-poly/stretch blend; Wool/silk/delicate; Mixed/unknown |
| Recovery | `details.wearability` | Is the item still wearable or usable? | Wearable as-is; Wearable after minor repair; Not wearable but fabric usable; Not usable. Disabled/not required when Scraps is the only selected item type |
| Recovery | `details.damage_classification` | What is the damage classification? | No damage; Minor cosmetic issue; Missing button/loose seam; Small hole/tear; Large tear/heavy damage; Fabric degradation |
| Recovery | `details.repairability` | Is the item repairable? | No repair needed; Minor repair; Moderate repair; Not practical to repair. Disabled/not required when Scraps is the only selected item type |
| Recovery | `details.contamination_level` | What is the contamination level? | Appears only when condition is Minor damage or Heavily damaged. Choices: Clean; Washable dirt/odor; Permanent stain; Oil/paint/biological contamination; Chemical/mold contamination |
| Recovery | `details.repurposing_potential` | What is the repurposing potential? | High; Medium; Low |
| Recovery | `details.trim_removal` | Are trims/accessories easy to remove? | None; Easy to remove; Difficult to remove; Many mixed components |
| Pathway | `service_type`, `action` | Intended pathway | Donate; Recycle; Upcycle. The submission form receives the starting pathway from the selected service; DSS confirmation can later switch among the three scored pathways |
| Buyback | `buyback_interest` | Interested in buyback? | Yes; No. Only applies when the final pathway is Upcycle |
| Buyback | `upcycle_request` | What would you like this item to become? | Free text shown when the user says Yes to buyback during the submission form |
| Media | `photos[]` | Uploaded images | URL plus optional user label |

## Burn Test Fabric Matrix

Backend scoring rule: each answer group is split by `OR`, then comma/`&`. The best group receives partial credit. Example: wool flame behavior has 3 expected tokens, so selecting all three scores 3/3.

Confidence rule: the backend only allows 100% burn-test confidence when every burn-test group is fully matched. Partial matches are capped at 92%, even when the highest fiber is clearly ranked first. The first fabric hint shown inside the form uses a lighter local preview based on five matched answer groups; the DSS confirmation uses the backend scoring below.

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

Note: donation-specific blocking rules only run when the user's preferred pathway is Donation. If the user chooses Upcycle or Recycle, the same item can still be scored against those recovery routes unless it fails the restricted-category or chemical/mold gate.

## Current User Form Flow

1. Safety screening: restricted textile categories. Donation also asks whether the item is a uniform or has identifiable company, school, or institutional branding; a Yes answer blocks progression/submission.
2. Burn test optional flow: result appears before item details.
3. Item details: submission name, item type, condition, cleanliness, quantity, and estimated weight in kg or g. Donation uses Top, Bottoms, and Outerwear only; Recycle/Upcycle/general textile flow keeps the broader textile categories. Donation blocks Heavily damaged or Heavily soiled/contaminated answers.
4. Fabric details: ask whether the user knows the fabric type, then ask fabric type or fabric description, identification method, brand, and finally fiber composition.
5. Recovery criteria: wearability, damage classification, repairability, conditional contamination level, repurposing potential, trim/accessory removal. Donation skips this section. Recycle/Upcycle disable wearability and repairability when Scraps is the only selected item type; disabled answers are cleared, not required, and not scored.
6. Intended pathway, buyback request, description, image upload and labels. The initial intended pathway is normally supplied by the service card the user clicked before opening the form.
7. Review and submit.

## DSS Output Surfaces

| Screen | Output | Notes |
|---|---|---|
| Burn-test confirmation | Top 3 possible fabric types with confidence and reasoning | Shown immediately after burn-test questions when burn test is performed |
| DSS confirmation | `DSS Recommendations` read-only list with all ranked pathways | Includes rank, confidence, score, explanation, matched checks, missed checks, and a why-this-was-recommended accordion |
| DSS pathway selector | Separate `Send this request as` control | User can keep the initial pathway or switch; the DSS score cards themselves are no longer the selector |
| DSS confirmation selected pathway | User-selected pathway remains visible with full DSS confidence details | If an initial intent exists, the page asks for confirmation before sending and states whether the selected pathway matches the top DSS recommendation |
| Partner request brief | Partner-facing summary of the chosen pathway and DSS result | Includes selected pathway, confidence, rank, score, all pathway scores, item details, textile weight, bag color guidance, DSS reasoning, matched checks, review flags, lightweight routing footprint estimate, and buyback preference when the sent pathway is Upcycle |
| Partner request modal | Detailed partner review panel | Shows brief, recommendation summary, score, matched/missed routing checks, item details, required bag color, burn-test details, uploaded images, and partner outcome reporting fields |
| User request tracking | Sent partner request list and dashboard detail modal | Shows bag guidance, weight, lightweight routing footprint estimate when distance is available, accepted-request courier/drop-off delivery form, delivery timeline, and partner outcome reports with photos such as bags, wallets, construction material, or other recovery results |
| Admin audit panel | DSS explanation audit | Uses `recommendation_runs` and `recommendation_results` with `engine_version`, `input_snapshot`, `rule_checks`, and selected partner context |
| Admin editable rules | Manual DSS rule records | Saved in `dss_rules` for documentation/audit/future tuning; these records do not currently override the coded engine |
| Admin deleted archive | Deleted Records panel | Reads `deleted_records` so admins can inspect management-deleted snapshots without showing them to users or partners |

## DSS API Behavior

| API behavior | Current implementation |
|---|---|
| Preview DSS recommendations | Backend evaluates the submission and returns burn-test analysis plus ranked `recycle`, `donate`, and `upcycle` recommendations unless a `rejected` hard-stop applies |
| Send DSS request to partner | `recommended_pathway` must be `recycle`, `donate`, or `upcycle`; `buyback_interest`, `estimated_distance_km`, and `estimated_carbon_kg` are accepted as optional metadata |
| Sent Upcycle request | Saves `buyback_interest` as true only when `recommended_pathway` is `upcycle` and the user confirms Yes |
| Sent Recycle/Donate request | Forces buyback interest to false for the request context |
| Bag color guidance | Saved on the transaction and repeated in the brief | White = Recycle, Black = Upcycle, Green = Donation |
| Partner outcome report | Partners can add `outcome_title`, `outcome_description`, and `outcome_photos` when marking an accepted request completed | The story is returned to the user through notification, message, request tracking, and dashboard detail views |
| Delivery tracking update | Users can add `request_tracking_updates` only after the partner accepts a request | Courier fields are optional for shipping; direct drop-off stores optional date/time, location, and notes. Updates create partner notifications and automatic messages |
| Audit trail | Creates a `recommendation_runs` row and selected `recommendation_results` row with `engine_version`, selected pathway, selected partner, score, confidence, checks, and output payload |

## Pathway Scoring

Each pathway receives a weighted score out of 100. If the user's selected service matches a pathway, the pathway receives an 8-point preference boost capped at 100.

When Scraps is the only selected item type, Wearability and Repairability are marked not applicable. They are not required in the form, are stored as null, and their weights are removed from scoring before the pathway score is normalized back to 100.

### Donation

Donation has a hard eligibility rule before normal scoring: the item must be clean, wearable, non-uniform clothing/textile suitable for dignified redistribution. Donation blocks heavily damaged items, heavily soiled/contaminated items, uniforms or identifiable company/school/institutional branding, and Scraps.

| Criterion | Weight | Match Condition |
|---|---:|---|
| Donation uniform eligibility | 0 | Must not be a uniform or have identifiable institutional/company/school branding. A failed check blocks Donation rather than reducing score |
| Condition | 12 | Good condition |
| Cleanliness | 15 | Clean and ready for use |
| Item type | 8 | Top, Bottoms, Outerwear |
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
| Item type | 10 | Scraps, Big fabric panels (curtains, bedsheets), Clothes (top, outerwear, bottoms) |
| Fabric signal | 5 | Cotton, linen, denim, wool, silk |
| Material/fiber | 5 | Any clean textile with usable sections |
| Wearability | 5 | Not necessarily wearable, but usable fabric remains. Skipped and removed from scoring when Scraps is the only selected item type |
| Repairability | 15 | Repair/redesign can preserve material value. Skipped and removed from scoring when Scraps is the only selected item type |
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
| Item type | 5 | Scraps or Big fabric panels (curtains, bedsheets) |
| Fabric signal | 20 | Polyester, poly fleece, nylon, acrylic, spandex, acetate |
| Material/fiber | 20 | Identifiable cotton/natural, polyester/synthetic, or accepted blend |
| Wearability | 0 | No longer suitable for direct reuse. Skipped when Scraps is the only selected item type |
| Repairability | 5 | Moderate repair or not practical. Skipped and removed from scoring when Scraps is the only selected item type |
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
