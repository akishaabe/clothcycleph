$ErrorActionPreference = "Stop"

$output = Join-Path (Split-Path $PSScriptRoot -Parent) "ClothCycle_DSS_QA_Test_Cases.xlsx"
$root = Join-Path $PSScriptRoot "dss-qa-xlsx"
$zipDest = Join-Path $PSScriptRoot "dss-qa-xlsx.zip"

if (Test-Path $root) {
  Remove-Item -LiteralPath $root -Recurse -Force
}

New-Item -ItemType Directory -Path $root, "$root\_rels", "$root\xl", "$root\xl\_rels", "$root\xl\worksheets" | Out-Null

function Escape-Xml($value) {
  return [System.Security.SecurityElement]::Escape([string]$value)
}

function Get-ColumnName($number) {
  $result = ""
  while ($number -gt 0) {
    $number--
    $result = [char]([int](65 + ($number % 26))) + $result
    $number = [math]::Floor($number / 26)
  }
  return $result
}

function Write-TextFile($path, $value) {
  Set-Content -LiteralPath $path -Value $value -Encoding UTF8
}

function Write-Sheet($path, $rows, $widths) {
  $rowCount = $rows.Count
  $colCount = ($rows | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum
  $lastCell = "$(Get-ColumnName $colCount)$rowCount"

  $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  $xml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  $xml += "<dimension ref=`"A1:$lastCell`"/>"
  $xml += '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
  $xml += '<cols>'
  for ($i = 1; $i -le $colCount; $i++) {
    $width = if ($widths.Count -ge $i) { $widths[$i - 1] } else { 22 }
    $xml += "<col min=`"$i`" max=`"$i`" width=`"$width`" customWidth=`"1`"/>"
  }
  $xml += '</cols><sheetData>'

  for ($i = 0; $i -lt $rows.Count; $i++) {
    $rowNumber = $i + 1
    $xml += "<row r=`"$rowNumber`">"
    for ($j = 0; $j -lt $colCount; $j++) {
      $cellRef = "$(Get-ColumnName ($j + 1))$rowNumber"
      $cellText = if ($j -lt $rows[$i].Count) { Escape-Xml $rows[$i][$j] } else { "" }
      $style = if ($i -eq 0) { 1 } else { 2 }
      $xml += "<c r=`"$cellRef`" s=`"$style`" t=`"inlineStr`"><is><t xml:space=`"preserve`">$cellText</t></is></c>"
    }
    $xml += "</row>"
  }

  $xml += "</sheetData><autoFilter ref=`"A1:$lastCell`"/></worksheet>"
  Write-TextFile $path $xml
}

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
$workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
$workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="DSS Test Cases" sheetId="1" r:id="rId1"/><sheet name="DSS Rule Matrix" sheetId="2" r:id="rId2"/><sheet name="Negative - Edge Cases" sheetId="3" r:id="rId3"/><sheet name="QA Summary" sheetId="4" r:id="rId4"/></sheets></workbook>'
$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F6F54"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

Write-TextFile "$root\[Content_Types].xml" $contentTypes
Write-TextFile "$root\_rels\.rels" $rootRels
Write-TextFile "$root\xl\_rels\workbook.xml.rels" $workbookRels
Write-TextFile "$root\xl\workbook.xml" $workbook
Write-TextFile "$root\xl\styles.xml" $styles

$testHeaders = @(
  "Test Case ID", "Module", "Scenario", "Preconditions", "Test Data / Input",
  "Test Steps", "Expected Result", "Expected DSS Recommendation",
  "Expected Rule Triggered", "Priority", "Test Type", "Actual Result", "Pass/Fail", "Remarks"
)

$dssCases = @(
  $testHeaders,
  @("DSS-TC-001", "Burn Test DSS", "Cotton-like burn test produces cotton top fabric match", "User is logged in and starts a submission with burn test performed.", "moment=Burned fast; flames=Burns quickly; no_flame=Continues to burn quickly + Has an afterglow; smell=Like burning paper; ashes=Light and feathery gray ash", "Complete burn-test questions using the listed answers, continue to item details, open burn-test confirmation.", "Burn-test confirmation shows cotton as top result with high confidence and reasoning.", "Fabric result: cotton", "Cotton fabricRules full or high partial match", "High", "Functional", "", "", ""),
  @("DSS-TC-002", "Burn Test DSS", "Polyester-like burn test produces polyester/poly fleece", "User is logged in and burn test is performed.", "moment=Shrinked away from flame; flames=Melts + Burns slowly; no_flame=Burns with difficulty; smell=Like chemicals; ashes=Round hard grayish bead + Won't crush", "Answer burn test, submit details, review fabric confirmation.", "Polyester/poly fleece appears as top fabric result.", "Fabric result: polyester, poly fleece", "Polyester/poly fleece fabricRules match", "High", "Functional", "", "", ""),
  @("DSS-TC-003", "Burn Test DSS", "Wool burn test gives 3/3 flame partial-token credit when all comma answers are selected", "User is logged in and burn test is performed.", "moment=Curled away + No flame + Burned slowly; flames=Burns slowly + Sizzles + Flame was flickering; no_flame=Completely stops burning; smell=Like burning hair; ashes=Easy to crush + Irregular bead", "Select all wool burn-test tokens and inspect top three fabric results.", "Wool is ranked first; flame check scores full credit for the three expected comma-separated tokens.", "Fabric result: wool", "Wool fabricRules partial scoring/full selected tokens", "High", "Functional", "", "", ""),
  @("DSS-TC-004", "Burn Test DSS", "Wool burn test receives partial credit when only one flame token is selected", "User is logged in and burn test is performed.", "moment=Curled away; flames=Burns slowly only; no_flame=Completely stops burning; smell=Like burning hair; ashes=Easy to crush", "Select partial wool answers and open burn-test confirmation.", "Wool remains a possible top-three result but confidence is lower than a full wool match.", "Fabric result: wool possible, not full confidence", "checkExpected best-group partial score", "Medium", "Boundary", "", "", ""),
  @("DSS-TC-005", "Burn Test DSS", "No burn test uses item details only", "User chooses not to perform burn test.", "burn_test.performed=false; fabric/fiber fields completed manually", "Skip burn test, complete item details, open DSS confirmation.", "Burn-test analysis says no burn test was performed and recommendations still generate from item details.", "Pathway based on item details", "analyzeBurnTest performed=false branch", "High", "Functional", "", "", ""),
  @("DSS-TC-006", "Eligibility Gate", "Restricted used undergarments are rejected before scoring", "User is logged in.", "details.restricted_category=used_undergarments; otherwise clean/wearable item", "Select restricted category and attempt to continue/submit.", "DSS returns one rejected recommendation with 100% confidence and stops normal ranking.", "rejected", "evaluateEligibility restricted category gate", "Critical", "Functional", "", "", ""),
  @("DSS-TC-007", "Eligibility Gate", "Hospital/medical uniform is rejected before normal DSS", "User is logged in.", "details.restricted_category=hospital_medical_uniform", "Select hospital/medical uniform in screening and continue to DSS.", "Item is blocked/rejected with medical textile safety message.", "rejected", "Restricted category: hospital_medical_uniform", "Critical", "Functional", "", "", ""),
  @("DSS-TC-008", "Eligibility Gate", "Chemical or mold contamination is rejected even if item is otherwise recyclable", "User is logged in.", "condition=Heavily damaged; cleanliness=Heavily soiled or contaminated; contamination_level=chemical/mold contamination", "Complete submission with chemical or mold contamination and open DSS.", "DSS returns rejected with 100% confidence.", "rejected", "evaluateEligibility contamination includes chemical or mold", "Critical", "Functional", "", "", ""),
  @("DSS-TC-009", "Donation Gate", "Donation selected with uniform branding is rejected", "User is logged in and chooses Donate.", "service_type=donate; item_type=Top; condition=Good; cleanliness=Clean; details.uniform_branding=Yes", "Complete donation submission with uniform branding and open DSS confirmation.", "Donation is blocked and DSS returns rejected with message recommending Upcycle or Recycle.", "rejected", "getDonationBlock donation_uniform_branding", "Critical", "Functional", "", "", ""),
  @("DSS-TC-010", "Donation Gate", "Donation selected with heavily damaged item is rejected", "User is logged in and chooses Donate.", "service_type=donate; condition=Heavily damaged; cleanliness=Clean", "Complete donation submission and open DSS confirmation.", "DSS rejects Donation because donated clothing must be wearable/useful.", "rejected", "getDonationBlock donation_heavily_damaged", "Critical", "Functional", "", "", ""),
  @("DSS-TC-011", "Donation Gate", "Donation selected with heavily soiled/contaminated item is rejected", "User is logged in and chooses Donate.", "service_type=donate; condition=Good; cleanliness=Heavily soiled or contaminated", "Complete donation submission and view DSS confirmation.", "DSS rejects Donation and asks user to clean item or choose another option.", "rejected", "getDonationBlock donation_heavily_soiled", "Critical", "Functional", "", "", ""),
  @("DSS-TC-012", "Donation Scoring", "Clean wearable top with natural fiber recommends Donate", "User is logged in.", "service_type=donate; item_type=Top; condition=Good; cleanliness=Clean; fiber_composition=cotton_natural; wearability=wearable_as_is; repairability=no_repair_needed; contamination=clean; damage=none", "Submit item and open DSS confirmation.", "Donate is ranked first with high confidence and matched checks for condition, cleanliness, wearability, repairability, contamination and damage.", "donate", "Donation weighted scoring", "High", "Functional", "", "", ""),
  @("DSS-TC-013", "Donation Scoring", "Donation allows wearable after minor repair", "User is logged in.", "condition=Good; cleanliness=Clean; wearability=wearable_after_minor_repair; repairability=minor_repair; damage=missing_button_loose_seam", "Submit donation-style item and review DSS.", "Donation remains a strong recommendation because minor repair is allowed.", "donate", "Donation Wearability + Repairability + Damage checks", "Medium", "Boundary", "", "", ""),
  @("DSS-TC-014", "Recycle Scoring", "Synthetic heavily damaged textile recommends Recycle", "User is logged in.", "service_type=recycle; item_type=Fabric scraps; condition=Heavily damaged; cleanliness=Needs cleaning; fiber=polyester; fiber_composition=polyester_synthetic; damage=large_tear_heavy_damage; repurposing=low; trim_removal=easy; quantity=3", "Submit and open DSS confirmation.", "Recycle ranks first with high confidence.", "recycle", "Recycle weighted scoring for synthetic material and material recovery", "High", "Functional", "", "", ""),
  @("DSS-TC-015", "Recycle Scoring", "Heavily damaged household textile with low repurposing ranks Recycle", "User is logged in.", "item_type=Household textile; condition=Heavily damaged; cleanliness=Needs cleaning; fiber_composition=polyester_synthetic; repairability=not_practical; repurposing=low; trim_removal=none", "Complete form and review recommendations.", "Recycle appears as top recommendation.", "recycle", "Recycle condition/cleanliness/material/damage checks", "High", "Functional", "", "", ""),
  @("DSS-TC-016", "Recycle Scoring", "Quantity one recyclable item still scores if material is identifiable", "User is logged in.", "quantity=1; material=polyester_synthetic; condition=Minor damage; cleanliness=Needs cleaning", "Submit one item and check Recycle score.", "Recycle can still match because material is identifiable even if quantity is one.", "recycle", "Recycle Quantity/batch suitability conditional check", "Medium", "Boundary", "", "", ""),
  @("DSS-TC-017", "Upcycle Scoring", "Clean heavily damaged curtains with high repurposing recommend Upcycle", "User is logged in.", "service_type=upcycle; item_type=Household textile; condition=Heavily damaged; cleanliness=Clean; fiber_composition=cotton_natural; wearability=not_wearable_fabric_usable; repairability=moderate_repair; repurposing=high; trim_removal=easy", "Submit and open DSS confirmation.", "Upcycle ranks first with high confidence.", "upcycle", "Upcycle weighted scoring for high repurposing potential", "High", "Functional", "", "", ""),
  @("DSS-TC-018", "Upcycle Scoring", "Fabric scraps-only skips wearability and repairability", "User is logged in.", "item_types=Fabric scraps only; condition=Minor damage; cleanliness=Clean; fiber_composition=cotton_natural; damage=small_hole_tear; contamination=clean; repurposing=high; trim_removal=easy", "Complete fabric scraps submission and inspect DSS explanation checks.", "Wearability and Repairability show skipped/not applicable and are not required or scored.", "upcycle", "isFabricScrapsOnly skip scoring normalization", "High", "Boundary", "", "", ""),
  @("DSS-TC-019", "Upcycle Scoring", "Minor damage clean clothing with high repurposing recommends Upcycle", "User is logged in.", "item_type=Pants / Jeans; condition=Minor damage; cleanliness=Clean; fabric=denim/cotton; repairability=minor_repair; repurposing=high", "Submit and review DSS options.", "Upcycle should rank above Recycle and Donate when fabric value remains high.", "upcycle", "Upcycle condition + repair/redesign checks", "High", "Functional", "", "", ""),
  @("DSS-TC-020", "Buyback Add-on", "Buyback interest adds buyback recommendation", "User selects Upcycle and says interested in selling upcycled item.", "buyback_interest=true; upcycle_request='tote bag'; otherwise valid upcycle inputs", "Submit and view DSS recommendations.", "Buyback appears as an additional recommendation with fixed score 78 and explanation.", "buyback included", "Buyback Add-On fixed score branch", "Medium", "Functional", "", "", ""),
  @("DSS-TC-021", "Buyback Add-on", "No buyback interest does not add buyback recommendation", "User selects Upcycle but buyback interest is No.", "buyback_interest=false", "Submit and inspect recommendation list.", "Buyback is not listed among DSS recommendations.", "No buyback", "Buyback interest false branch", "Medium", "Functional", "", "", ""),
  @("DSS-TC-022", "Preference Boost", "User selected Donate receives +8 boost when donation is eligible", "User is logged in.", "service_type=donate; donation-eligible clean wearable item", "Submit and compare recommendations.", "Donate score includes selected-pathway boost capped at 100.", "donate", "preferenceBoost preferred === pathway", "Medium", "Boundary", "", "", ""),
  @("DSS-TC-023", "Preference Boost", "User selected Recycle but DSS top recommendation is Upcycle", "User intent differs from highest score.", "service_type=recycle; clean damaged cotton textile with high repurposing potential", "Submit, open DSS confirmation, inspect pathway selector.", "System shows Upcycle as top DSS recommendation while Recycle remains selectable as user intent.", "upcycle top; recycle selectable", "Weighted scoring + separate selected pathway control", "High", "Functional/UI", "", "", ""),
  @("DSS-TC-024", "DSS UI", "Recommendation options label appears as DSS Recommendations", "Submission has generated DSS results.", "Any valid submission", "Open DSS confirmation page.", "Section label says DSS Recommendations and displays ranked pathway cards.", "All ranked pathways", "DSS confirmation UI", "Medium", "UI", "", "", ""),
  @("DSS-TC-025", "DSS UI", "Selected service card shows confidence and reasoning", "DSS confirmation page loaded.", "Select Recycle from pathway selector.", "Change selected pathway using Send this request as control.", "Selected service section updates and shows confidence, rank/score, and reasoning for selected pathway.", "Selected pathway details shown", "DSS selected pathway detail UI", "High", "UI", "", "", ""),
  @("DSS-TC-026", "DSS UI", "Mismatch confirmation appears before sending non-top pathway", "DSS top result differs from selected pathway.", "Top=Upcycle; selected=Recycle", "Select non-top pathway and click Send to partner.", "User is asked to confirm that they still want to send as the selected pathway.", "Selected non-top pathway retained after confirmation", "User-selected pathway vs DSS top mismatch behavior", "High", "UI", "", "", ""),
  @("DSS-TC-027", "DSS UI", "Selected partner remains visible in dark mode", "Dark mode enabled and partners loaded.", "Select any partner in DSS confirmation page.", "Click partner option and inspect selected state.", "Selected partner has visible contrast and clear selected styling in dark mode.", "N/A", "Frontend selected partner UI state", "Medium", "UI", "", "", ""),
  @("DSS-TC-028", "DSS UI", "Why this was recommended accordion expands matched and missed checks", "DSS confirmation page loaded.", "Any valid submission with at least one recommendation.", "Open a recommendation accordion.", "Accordion shows matched checks, missed checks, and skipped checks where applicable.", "N/A", "Recommendation checks rendered from output_payload/checks", "Medium", "UI", "", "", ""),
  @("DSS-TC-029", "DSS API", "Fetch DSS preview for own submission", "Authenticated user owns submission.", "GET /api/dss/submissions/:submissionId", "Call endpoint with valid JWT and owned submission ID.", "Response contains submission, recommendations, burn_test_analysis, and brief.", "Ranked pathway list", "getSubmissionDss", "High", "API", "", "", ""),
  @("DSS-TC-030", "DSS API", "User cannot fetch another user's DSS submission", "Authenticated user does not own target submission.", "GET /api/dss/submissions/:otherSubmissionId", "Call endpoint with valid JWT for a different user.", "API returns 404 Submission not found or appropriate denial.", "N/A", "getSubmissionForUser ownership filter", "Critical", "Security/API", "", "", ""),
  @("DSS-TC-031", "Partner Handoff", "Send selected recommendation to active partner", "User owns submission; partner is active or pending.", "POST /api/dss/send with submission_id, partner_id, recommended_pathway, brief", "Send valid request after DSS confirmation.", "Creates recommendation run/result, pending transaction, updates submission assigned partner/service type, sends message and notifications.", "Selected pathway", "sendRecommendationToPartner transaction flow", "Critical", "Integration/API", "", "", ""),
  @("DSS-TC-032", "Partner Handoff", "Partner receives concise message after DSS send", "Valid send to partner completed.", "Message content: New submission request from me! I want to {pathway} this item.", "Open partner messages.", "Partner sees short request message with View action leading to partner request context.", "Selected pathway", "messages insert with kind=dss_request", "High", "Integration/UI", "", "", ""),
  @("DSS-TC-033", "Partner Handoff", "Partner request brief includes all pathway scores", "DSS send has output_payload.", "selected pathway plus recommendations array in output_payload", "Open partner request modal.", "Partner can see selected pathway, confidence, rank, score, all pathway scores, matched/missed checks, and item details.", "Selected pathway plus all scores", "recommendation_results.output_payload", "High", "Functional/UI", "", "", ""),
  @("DSS-TC-034", "Partner Handoff", "Partner accepts request and user receives status message", "Partner account is linked to partner record.", "PUT /api/dss/requests/:id/status status=accepted notes='Can process this item.'", "Open partner request and accept with note.", "Transaction status updates, user message is created, user notification is enqueued.", "N/A", "updateDssRequestStatus accepted", "Critical", "Integration/API", "", "", ""),
  @("DSS-TC-035", "Partner Handoff", "Partner declines request with reason", "Pending transaction exists.", "status=declined; notes='Outside pickup area.'", "Decline request from partner dashboard.", "User receives declined notification and message with partner note.", "N/A", "updateDssRequestStatus declined", "High", "Integration/API", "", "", ""),
  @("DSS-TC-036", "Partner Handoff", "User can remind partner only while pending", "User has a pending sent request.", "POST /api/dss/requests/:id/remind", "Click reminder on pending request.", "Transaction updated_at changes and partner notification is sent.", "N/A", "remindDssRequest pending-only branch", "Medium", "Integration/API", "", "", ""),
  @("DSS-TC-037", "Admin Audit", "DSS run is saved with engine version", "Recommendation sent to partner.", "recommendation_runs.engine_version", "Open admin DSS explanation audit panel or query audit endpoint.", "Run is listed with engine_version=dssEngine-v2-textile-recovery and input snapshot.", "Selected pathway", "recommendation_runs insert", "High", "Audit", "", "", ""),
  @("DSS-TC-038", "Admin Audit", "Admin can export DSS audit CSV", "Admin is authenticated and DSS runs exist.", "GET /api/dss/audit/export", "Click export DSS audit report.", "CSV downloads with engine version, pathway, confidence, explanation, matched_rules, missed_rules.", "N/A", "exportDssAuditReport", "Medium", "Audit/API", "", "", ""),
  @("DSS-TC-039", "Partner Rule Requests", "Partner submits DSS/rule preference change for admin review", "Partner user is authenticated.", "POST /api/dss/rule-change-requests; rule_area='Accepted pathways'; requested_change='Donation only'; reason provided", "Submit request from partner dashboard.", "Request is stored, admins receive message and notification.", "N/A", "createPartnerRuleChangeRequest", "Medium", "Integration/API", "", "", ""),
  @("DSS-TC-040", "Partner Rule Requests", "Admin updates partner rule request status", "Admin is authenticated and request exists.", "PUT /api/dss/rule-change-requests/:id/status status=needs_more_information admin_note='Clarify pickup area.'", "Update request from admin dashboard.", "Status, admin note, reviewer and reviewed_at update; partner receives message and notification.", "N/A", "updatePartnerRuleChangeRequestStatus", "Medium", "Audit/API", "", "", ""),
  @("DSS-TC-041", "Submission Form Flow", "Contamination level appears only for minor or heavily damaged condition", "User is filling submission form.", "condition=Good, then condition=Minor damage", "Select Good condition and observe form; change to Minor damage.", "Contamination level is hidden for Good and appears for Minor/Heavily damaged.", "N/A", "Frontend conditional contamination field; DSS inferContamination", "Medium", "UI/Boundary", "", "", ""),
  @("DSS-TC-042", "Submission Form Flow", "Fabric type known flow asks fabric type before fiber composition", "User is filling fabric details.", "knows_fabric_type=Yes; fabric_types=Cotton/Linen; fiber_composition=cotton_natural", "Proceed through fabric details.", "Flow asks known fabric type and then asks material/fiber composition.", "N/A", "Current submission field flow documented in DSS matrix", "Medium", "UI", "", "", "")
)

$negativeCases = @(
  $testHeaders,
  @("DSS-NEG-001", "DSS API Validation", "Send DSS request without submission_id", "User is authenticated.", "POST /api/dss/send missing submission_id", "Call API with partner_id, recommended_pathway, brief only.", "API validation fails and request is not created.", "N/A", "sendDssRecommendationSchema submission_id uuid required", "Critical", "Negative/API", "", "", ""),
  @("DSS-NEG-002", "DSS API Validation", "Send DSS request with invalid pathway", "User is authenticated.", "recommended_pathway='compost'", "Call POST /api/dss/send.", "API rejects request because pathway is not recycle/donate/upcycle/buyback.", "N/A", "sendDssRecommendationSchema enum", "Critical", "Negative/API", "", "", ""),
  @("DSS-NEG-003", "DSS API Validation", "Send DSS request with empty brief", "User is authenticated.", "brief=''", "Call POST /api/dss/send.", "API rejects request because brief is required.", "N/A", "sendDssRecommendationSchema brief min(1)", "High", "Negative/API", "", "", ""),
  @("DSS-NEG-004", "DSS API Validation", "Send DSS request with brief over max length", "User is authenticated.", "brief length > 5000", "Call POST /api/dss/send.", "API rejects request due to brief length.", "N/A", "sendDssRecommendationSchema brief max(5000)", "Medium", "Negative/API", "", "", ""),
  @("DSS-NEG-005", "Authorization", "Partner cannot update another partner's request", "Two partner accounts exist.", "Request belongs to Partner A; Partner B token attempts update.", "Call PUT /api/dss/requests/:id/status as Partner B.", "API returns 403 permission error and transaction remains unchanged.", "N/A", "updateDssRequestStatus partner ownership check", "Critical", "Security/API", "", "", ""),
  @("DSS-NEG-006", "Authorization", "Non-admin cannot view DSS audit", "User or partner authenticated.", "GET /api/dss/audit", "Call audit endpoint as non-admin.", "API returns 403 Only admins can view DSS audit runs.", "N/A", "getDssAuditRuns admin role check", "Critical", "Security/API", "", "", ""),
  @("DSS-NEG-007", "Authorization", "Non-admin cannot export audit report", "User or partner authenticated.", "GET /api/dss/audit/export", "Call export endpoint as non-admin.", "API returns 403 and no CSV is downloaded.", "N/A", "exportDssAuditReport admin role check", "Critical", "Security/API", "", "", ""),
  @("DSS-NEG-008", "Partner Reminder", "Reminder is blocked after partner already responded", "Request status is accepted or declined.", "POST /api/dss/requests/:id/remind", "Click reminder for non-pending request.", "API returns error: Only pending requests can receive reminders.", "N/A", "remindDssRequest pending-only guard", "Medium", "Negative/API", "", "", ""),
  @("DSS-NEG-009", "Partner Rule Requests", "Partner rule request missing requested_change", "Partner authenticated.", "rule_area='Accepted pathways'; requested_change=''", "Submit partner rule change request.", "Validation rejects request; no admin notification is created.", "N/A", "partnerRuleChangeRequestSchema requested_change min(1)", "Medium", "Negative/API", "", "", ""),
  @("DSS-NEG-010", "Partner Rule Requests", "Admin status update rejects invalid status", "Admin authenticated.", "status='maybe'", "Call PUT /api/dss/rule-change-requests/:id/status.", "API returns Invalid rule request status and does not update row.", "N/A", "allowedStatuses check", "High", "Negative/API", "", "", ""),
  @("DSS-NEG-011", "Submission Input", "Mixed unknown material with low details produces lower confidence", "User submits sparse details but passes eligibility.", "condition=Minor damage; cleanliness=Needs cleaning; fiber_composition=mixed_unknown; no burn test; quantity=1", "Submit and inspect recommendations.", "DSS still returns ranked pathways but confidence is lower; explanation lists missed checks.", "Likely recycle/upcycle with lower score", "Weighted scoring with missed fabric/material/quantity checks", "Medium", "Edge", "", "", ""),
  @("DSS-NEG-012", "Burn Test Edge", "Conflicting burn-test answers produce lower confidence top-three", "Burn test performed with mixed synthetic/natural signals.", "moment=Burned fast; flames=Melts; smell=Like burning paper; ashes=Hard gray bead", "Complete burn test and inspect top three.", "Top fiber confidence is not high and reasoning only lists matched checks.", "Ambiguous fabric result", "analyzeBurnTest partial scoring across fabricRules", "Low", "Edge", "", "", "")
)

$ruleMatrix = @(
  @("Rule ID", "Area", "Field(s)", "Trigger / Expected Input", "DSS Behavior", "Pathway Impact", "Source"),
  @("RULE-001", "Engine Version", "DSS_ENGINE_VERSION", "dssEngine-v2-textile-recovery", "Stored in recommendation_runs and output payload", "Audit traceability", "backend/src/services/dssEngine.ts; dssController.ts"),
  @("RULE-002", "Restricted Category", "details.restricted_category", "Any value other than none/none_of_the_above", "Return rejected only, 100% confidence, stop ranking", "rejected", "evaluateEligibility"),
  @("RULE-003", "Chemical/Mold", "details.contamination_level", "Contains chemical or mold", "Return rejected only, 100% confidence", "rejected", "evaluateEligibility"),
  @("RULE-004", "Donation Uniform", "details.uniform_branding and text signals", "Uniform, company/school/institution branding", "Block donation and return rejected when selected pathway is donation", "rejected for donation intent", "getDonationBlock; hasUniformBranding"),
  @("RULE-005", "Donation Damage Gate", "condition/details.condition", "Heavily damaged", "Block donation before normal scoring", "rejected for donation intent", "getDonationBlock"),
  @("RULE-006", "Donation Cleanliness Gate", "cleanliness/details.cleanliness", "Heavily soiled or contaminated", "Block donation before normal scoring", "rejected for donation intent", "getDonationBlock"),
  @("RULE-007", "Burn Test Scoring", "burn_test.moment/flames/no_flame/smell/ashes", "Expected expressions split by OR, comma, and ampersand", "Best expected group receives full or partial token credit", "Fabric confidence", "checkExpected; parseExpected"),
  @("RULE-008", "Cotton Burn Rule", "burn_test", "Burned fast; Burns quickly; Continues quickly/afterglow; burning paper; light gray or black ash", "Ranks cotton high", "Fabric signal for natural fibers", "fabricRules"),
  @("RULE-009", "Wool Burn Rule", "burn_test", "Curled away/no flame/burned slowly; Burns slowly/Sizzles/Flickering; stops; burning hair; crushable irregular bead", "Ranks wool high when all token groups match", "Fabric signal for delicate/natural upcycle", "fabricRules"),
  @("RULE-010", "Polyester Burn Rule", "burn_test", "Shrinked away; melts and burns slowly; burns with difficulty; chemicals; hard gray bead won't crush", "Ranks polyester/poly fleece high", "Recycle synthetic signal", "fabricRules"),
  @("RULE-011", "Preference Boost", "service_type/action", "Selected pathway equals scored pathway", "Adds 8 points to raw score, capped display score at 100", "Recycle/Donate/Upcycle ranking", "buildPathwayRecommendations"),
  @("RULE-012", "Buyback Add-On", "buyback_interest", "true", "Adds buyback recommendation with score 78 and confidence 0.78", "buyback", "buildPathwayRecommendations"),
  @("RULE-013", "Fabric Scraps Skip", "details.item_types or item_type", "Fabric scraps is the only selected item type", "Wearability and repairability are skipped and weights removed from scoring", "Recycle/Upcycle normalized score", "isFabricScrapsOnly; pathwayRuleScore"),
  @("RULE-014", "Donation Condition", "condition", "Good condition", "Adds weighted donation points", "donate", "pathwayRules.donate"),
  @("RULE-015", "Donation Cleanliness", "cleanliness", "Yes, clean and ready for use", "Adds weighted donation points", "donate", "pathwayRules.donate"),
  @("RULE-016", "Donation Wearability", "wearability", "wearable_as_is or wearable_after_minor_repair", "Adds 20 donation points", "donate", "pathwayRuleScore"),
  @("RULE-017", "Donation Repairability", "repairability", "no_repair_needed or minor_repair", "Adds 10 donation points", "donate", "pathwayRuleScore"),
  @("RULE-018", "Recycle Material", "fiber/material/burn result", "cotton_natural, polyester_synthetic, accepted blend", "Adds recycle material score", "recycle", "materialCategory; pathwayRuleScore"),
  @("RULE-019", "Recycle Fabric Signal", "fabric signal", "polyester, poly fleece, nylon, acrylic, spandex, acetate", "Adds 20 recycle points", "recycle", "pathwayRules.recycle"),
  @("RULE-020", "Recycle Damage", "damage_classification", "large tear/heavy damage, fabric degradation, small hole/tear", "Adds recycle damage score", "recycle", "pathwayRuleScore"),
  @("RULE-021", "Recycle Trim", "trim_removal", "none or easy", "Adds trim/accessory score", "recycle", "pathwayRuleScore"),
  @("RULE-022", "Upcycle Repurposing", "repurposing_potential", "high or medium", "Adds 15 upcycle points", "upcycle", "pathwayRuleScore"),
  @("RULE-023", "Upcycle Repair/Redesign", "repairability", "minor, moderate, or not practical repair where material can be redesigned", "Adds upcycle repair score", "upcycle", "pathwayRuleScore"),
  @("RULE-024", "Upcycle Cleanliness", "cleanliness", "Clean or needs cleaning", "Adds upcycle cleanliness score", "upcycle", "pathwayRules.upcycle"),
  @("RULE-025", "Partner Handoff Audit", "recommendation_runs/results/transactions/messages", "POST /api/dss/send succeeds", "Stores run/result/output_payload, creates pending transaction, messages partner, notifies both sides", "Selected pathway operationalized", "sendRecommendationToPartner"),
  @("RULE-026", "Partner Decision", "transactions.status", "pending/accepted/declined/completed/in_progress/rejected", "Partner/admin status update creates user message and notification", "Request lifecycle", "updateDssRequestStatus"),
  @("RULE-027", "Admin Audit", "recommendation_runs/recommendation_results", "Admin requests audit list/export", "Returns recent runs or CSV export with matched/missed rules", "DSS governance", "getDssAuditRuns; exportDssAuditReport")
)

$summary = @(
  @("Summary Item", "Value", "Notes", "Source"),
  @("Workbook", "ClothCycle_DSS_QA_Test_Cases.xlsx", "QA-ready DSS test workbook", "Generated from existing codebase"),
  @("Engine Version", "dssEngine-v2-textile-recovery", "Must appear in recommendation_runs and audit export", "backend/src/services/dssEngine.ts"),
  @("Total Test Cases", "54", "42 normal/functional/boundary + 12 negative/edge", "DSS Test Cases + Negative / Edge Cases"),
  @("Pathways Covered", "recycle, donate, upcycle, buyback, rejected", "Includes eligibility gates and buyback add-on", "buildPathwayRecommendations"),
  @("Burn Test Fibers Covered", "cotton, wool, polyester/poly fleece plus edge ambiguity", "Full and partial matching included", "analyzeBurnTest"),
  @("API Routes Covered", "GET /api/dss/submissions/:id; POST /api/dss/send; GET /api/dss/requests/user; GET /api/dss/requests/partner; PUT /api/dss/requests/:id/status; POST /api/dss/requests/:id/remind; GET /api/dss/audit; GET /api/dss/audit/export; partner rule request routes", "Routes are Hono-mounted through local app/controller behavior", "backend/src/controllers/dssController.ts"),
  @("High/Critical Focus", "Authorization, restricted categories, partner handoff, audit traceability, validation", "Prioritized for thesis QA and defense demo", "Schemas and controller guards"),
  @("Blank Tester Fields", "Actual Result, Pass/Fail, Remarks", "Left blank for manual QA execution", "Workbook requirement"),
  @("Recommended Manual Order", "1) Burn test; 2) Eligibility gates; 3) pathway scoring; 4) UI mismatch selection; 5) partner handoff; 6) admin audit/export; 7) negative auth/validation", "This order catches blockers early", "QA strategy")
)

$testWidths = @(16, 20, 36, 36, 55, 48, 55, 28, 40, 12, 16, 24, 12, 24)
$ruleWidths = @(14, 22, 32, 48, 52, 26, 38)
$summaryWidths = @(28, 42, 62, 36)

Write-Sheet "$root\xl\worksheets\sheet1.xml" $dssCases $testWidths
Write-Sheet "$root\xl\worksheets\sheet2.xml" $ruleMatrix $ruleWidths
Write-Sheet "$root\xl\worksheets\sheet3.xml" $negativeCases $testWidths
Write-Sheet "$root\xl\worksheets\sheet4.xml" $summary $summaryWidths

if (Test-Path $output) {
  Remove-Item -LiteralPath $output -Force
}
if (Test-Path $zipDest) {
  Remove-Item -LiteralPath $zipDest -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($output, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $root -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $relativePath) | Out-Null
  }
}
finally {
  $archive.Dispose()
}

Remove-Item -LiteralPath $root -Recurse -Force

Write-Host "Created $output"
