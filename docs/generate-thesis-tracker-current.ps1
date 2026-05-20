$ErrorActionPreference = "Stop"

$output = Join-Path (Split-Path $PSScriptRoot -Parent) "ClothCycle_Thesis_Current_Project_Tracker.xlsx"
$root = Join-Path $PSScriptRoot "thesis-current-tracker-xlsx"

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
    $width = if ($widths.Count -ge $i) { $widths[$i - 1] } else { 24 }
    $xml += "<col min=`"$i`" max=`"$i`" width=`"$width`" customWidth=`"1`"/>"
  }
  $xml += '</cols><sheetData>'

  for ($i = 0; $i -lt $rows.Count; $i++) {
    $rowNumber = $i + 1
    $xml += "<row r=`"$rowNumber`">"
    for ($j = 0; $j -lt $colCount; $j++) {
      $cellRef = "$(Get-ColumnName ($j + 1))$rowNumber"
      $cellText = if ($j -lt $rows[$i].Count) { Escape-Xml $rows[$i][$j] } else { "" }
      $style = if ($i -eq 0) { 1 } elseif ($j -eq 0) { 3 } else { 2 }
      $xml += "<c r=`"$cellRef`" s=`"$style`" t=`"inlineStr`"><is><t xml:space=`"preserve`">$cellText</t></is></c>"
    }
    $xml += "</row>"
  }

  $xml += "</sheetData><autoFilter ref=`"A1:$lastCell`"/></worksheet>"
  Write-TextFile $path $xml
}

$sheetNames = @(
  "OVERVIEW",
  "Chapter 3 Changes",
  "Feature Gap Tracker",
  "DSS Evidence Citations",
  "ERD Database Tracker",
  "QA UAT Tracker",
  "Cloudflare Hono",
  "General Reminders"
)

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
for ($i = 1; $i -le $sheetNames.Count; $i++) {
  $contentTypes += "<Override PartName=`"/xl/worksheets/sheet$i.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml`"/>"
}
$contentTypes += '</Types>'

$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
$workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
for ($i = 1; $i -le $sheetNames.Count; $i++) {
  $workbookRels += "<Relationship Id=`"rId$i`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`" Target=`"worksheets/sheet$i.xml`"/>"
}
$workbookRels += "<Relationship Id=`"rId$($sheetNames.Count + 1)`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles`" Target=`"styles.xml`"/></Relationships>"

$workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
for ($i = 0; $i -lt $sheetNames.Count; $i++) {
  $sheetId = $i + 1
  $workbook += "<sheet name=`"$($sheetNames[$i])`" sheetId=`"$sheetId`" r:id=`"rId$sheetId`"/>"
}
$workbook += '</sheets></workbook>'

$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><color rgb="FF1F2937"/><name val="Poppins"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Poppins"/></font><font><b/><sz val="10"/><color rgb="FF4B2E1F"/><name val="Poppins"/></font><font><sz val="10"/><color rgb="FF4B5563"/><name val="Poppins"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFA0522D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0C2A3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7C6B5"/></left><right style="thin"><color rgb="FFD7C6B5"/></right><top style="thin"><color rgb="FFD7C6B5"/></top><bottom style="thin"><color rgb="FFD7C6B5"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

Write-TextFile "$root\[Content_Types].xml" $contentTypes
Write-TextFile "$root\_rels\.rels" $rootRels
Write-TextFile "$root\xl\_rels\workbook.xml.rels" $workbookRels
Write-TextFile "$root\xl\workbook.xml" $workbook
Write-TextFile "$root\xl\styles.xml" $styles

$overview = @(
  @("Tracker Item", "Current Status", "What This Means", "Next Action", "Evidence"),
  @("Purpose", "New tracker based on current implementation", "Use this for thesis rewrite, QA defense prep, and feature gap tracking.", "Update status/owner columns weekly.", "Generated 2026-05-19"),
  @("Main Chapter 3 correction", "Old thesis text still says Express/MySQL/Python/AWS", "Current project is React + Vite, Hono API, Neon Postgres, Cloudflare-targeted Worker path, TypeScript DSS engine.", "Rewrite architecture and methodology sections.", "backend/src/honoLocalApp.ts; backend/src/services/dssEngine.ts; docs/clothcycle-current-erd.dbml"),
  @("DSS strength", "Implemented beyond simple IF-THEN", "Current DSS has eligibility gates, weighted scoring, burn-test confidence, preference boost, buyback preference handoff, audit trail.", "Reflect this in Chapter 3 and appendices.", "docs/dss-matrix.md; ClothCycle_DSS_QA_Test_Cases.xlsx"),
  @("ERD", "Updated from live Neon schema", "DBML now includes recovery codes, schema migrations, auth/audit fields, simplified transaction statuses.", "Generate fresh ERD online from docs/clothcycle-current-erd.dbml.", "docs/clothcycle-current-erd.dbml"),
  @("Feature risk", "Some thesis claims need softening", "Separate Super Admin, live DB-driven DSS rules, full map API, and audited impact estimates are not fully implemented.", "Either implement later or revise claims.", "Feature Gap Tracker sheet"),
  @("Citation risk", "Needs exact bibliography cross-check", "The tracker maps citation needs to current DSS claims, but final references should match the thesis bibliography.", "Verify reference numbers in final manuscript.", "DSS Evidence Citations sheet"),
  @("Suggested commit message", "docs: align thesis tracker and ERD with current DSS implementation", "Short enough for git and clear for groupmates.", "Use after reviewing generated files.", "N/A")
)

$chapterHeaders = @("ID", "Chapter/Section", "Current Thesis Text / Claim", "Current Project Reality", "Required Change", "Priority", "Status", "Evidence / File", "Citation Need", "Owner", "Notes")
$chapter = @(
  $chapterHeaders,
  @("CH3-001", "System Architecture", "AWS-hosted setup with React, Node.js/Express, MySQL, Python DSS module.", "React + Vite frontend, Hono backend, Neon Postgres for QA, Cloudflare Worker target, TypeScript DSS module.", "Rewrite full architecture paragraph and Figure 8 labels.", "Critical", "To Do", "backend/src/honoLocalApp.ts; backend/src/worker.ts; docs/cloudflare-hono-d1-deploy.md", "Cloudflare/Hono and Neon architecture citations if external claims are used.", "", ""),
  @("CH3-002", "Use Case Actors", "Donor, Partner Organization (Admin), Super Admin.", "Actual roles are user, partner, admin. No separate super_admin role currently exists.", "Rename actors or implement separate super_admin before claiming it.", "High", "To Do", "src/routes.jsx; src/app/components/ProtectedRoute.jsx", "Role-based access control citation optional.", "", ""),
  @("CH3-003", "DSS Engine Design", "Python DSS module integrated through RESTful API.", "DSS is TypeScript service inside backend: buildPathwayRecommendations and analyzeBurnTest.", "Replace Python module references with TypeScript backend service.", "Critical", "To Do", "backend/src/services/dssEngine.ts", "Knowledge-driven DSS; rule-based DSS; explainable recommendation citations.", "", ""),
  @("CH3-004", "Database", "MySQL tables: users, submissions, partners, tracking, buyback_requests.", "Live Neon Postgres has 25+ tables including recommendation_runs/results, messages, notifications, auth_events, transactions.", "Replace MySQL table list with current ERD summary.", "Critical", "Done in docs DBML", "docs/clothcycle-current-erd.dbml", "PostgreSQL/Neon only if explaining deployment tech.", "", ""),
  @("CH3-005", "Partner Coordination", "Users submit request summaries externally through existing channels.", "Current system sends briefs in-app to partners, creates transactions, messages, and notifications.", "Revise to in-platform partner handoff with partner decision workflow.", "High", "To Do", "backend/src/controllers/dssController.ts; src/app/pages/PartnerDashboard.jsx", "Platform coordination / traceability citations.", "", ""),
  @("CH3-006", "Tracking", "Primarily user-reported status tracking.", "Current flow includes partner/admin status updates; user sees request history and status.", "Clarify status authority: user sees history; partner/admin update request statuses.", "High", "To Do", "src/app/pages/SubmittedRequestsPage.jsx; backend/src/controllers/dssController.ts", "Traceability/accountability citation.", "", ""),
  @("CH3-007", "DSS Output", "Recommendation, concise justification, guidance.", "Outputs include all ranked pathways, confidence, score, matched/missed checks, burn-test result, and audit payload.", "Expand DSS output description.", "High", "To Do", "docs/dss-matrix.md", "Explainable DSS / transparency citation.", "", ""),
  @("CH3-008", "Burn Test", "Maps to Natural, Synthetic, Mixed Blend, Unknown.", "Actual burn test ranks top 3 fibers: cotton, linen, rayon/tencel, silk, wool, nylon, polyester/poly fleece, acetate, acrylic, spandex.", "Replace broad mapping with current top-3 confidence approach.", "High", "To Do", "backend/src/services/dssEngine.ts", "Textile burn-test/fiber identification source needed.", "", ""),
  @("CH3-009", "Business Rules", "R001-R011 IF-THEN rules and highest-priority fully satisfied pathway.", "Actual DSS uses hard gates plus weighted scoring and +8 preference boost.", "Update BRS appendix and methodology explanation.", "Critical", "To Do", "docs/dss-matrix.md", "Circular economy prioritization and multi-criteria decision support citations.", "", ""),
  @("CH3-010", "Buyback", "Upcycling with buyback when item meets encoded criteria.", "Current code stores buyback_interest as a yes/no upcycle preference; it is not a scored DSS pathway and does not guarantee pricing or acceptance.", "Describe buyback as partner handoff context, not guaranteed eligibility/pricing.", "High", "To Do", "backend/src/services/dssEngine.ts; src/app/pages/DssConfirmationPage.jsx", "Upcycling/buyback/circular business model citation.", "", ""),
  @("CH3-011", "GIS/Maps", "GIS/Maps API and mapped nearby facilities.", "Current system has coordinate-based partner ranking and visual plotted map; full external map API may not be production-grade.", "Phrase as partner discovery with location ranking unless full Maps API is finalized.", "Medium", "To Do", "backend/src/services/gisService.ts; src/app/pages/DssConfirmationPage.jsx", "GIS/location-based service citation.", "", ""),
  @("CH3-012", "Operations", "Hosted on university server/academic cloud.", "Current target is Cloudflare-compatible Hono deployment with Neon Postgres; local testing on localhost:5000.", "Update staging/deployment wording.", "High", "To Do", "backend/wrangler.toml; docs/wrangler-docker-wrapper.md", "Cloud deployment citation optional.", "", ""),
  @("CH3-013", "Privacy", "No PII beyond user contact for buyback notifications.", "System stores account profile data, phone/address, profile photos, messages, notifications, auth events.", "Revise privacy and delimitations to match actual data collection.", "Critical", "To Do", "docs/clothcycle-current-erd.dbml; src/app/pages/LegalDocumentPage.jsx", "RA 10173/Data Privacy Act citation.", "", ""),
  @("CH3-014", "Testing Instruments", "SUS, PSSUQ, UEQ-S, TAM, AttrakDiff.", "App has technical QA workbook and test file; usability instruments are thesis execution tasks, not code features.", "Keep as research method, add DSS QA test cases as technical validation artifact.", "Medium", "To Do", "ClothCycle_DSS_QA_Test_Cases.xlsx; backend/src/services/dssEngine.test.ts", "SUS/PSSUQ/UEQ/TAM source citations.", "", "")
)

$gapHeaders = @("ID", "Feature / Claim", "Implemented Now?", "Current Implementation", "Gap / Risk", "Recommended Action", "Priority", "Status", "Evidence / File", "Notes")
$gaps = @(
  $gapHeaders,
  @("GAP-001", "User register/login/logout", "Yes", "Email/password, Google login, 2FA, reset password.", "Need continue smoke testing after route guard/session changes.", "Keep in scope.", "High", "Implemented / Test", "src/context/AuthContext.tsx; backend/src/controllers/authController.ts", ""),
  @("GAP-002", "Role guards", "Mostly yes", "ProtectedRoute blocks user/partner/admin paths on frontend; backend endpoints check auth/admin in many controllers.", "Some generic submission status endpoints may need stricter ownership/role checks.", "Audit status update endpoints before QA.", "High", "Review", "src/app/components/ProtectedRoute.jsx; backend/src/controllers/submissionController.ts", ""),
  @("GAP-003", "Textile item submission", "Yes", "Multi-step form saves submission, details, burn test, images.", "Image upload depends on local uploads or R2 config.", "Document upload limitations and QA test image upload.", "High", "Implemented / Test", "src/app/pages/SubmissionFormPage.jsx; backend/src/controllers/submissionController.ts", ""),
  @("GAP-004", "DSS Recycle/Donate/Upcycle/Rejected plus Buyback Preference", "Yes", "Weighted scoring and eligibility gates; buyback is handoff context only.", "Thesis still describes simpler flow.", "Update thesis and appendices.", "Critical", "Implemented", "backend/src/services/dssEngine.ts; docs/dss-matrix.md", ""),
  @("GAP-005", "User view submission history/status", "Yes", "User dashboard and Submitted Requests page.", "Charts/impact should be described as operational metrics, not audited sustainability impact.", "Revise impact wording.", "Medium", "Implemented / Test", "src/app/pages/UserDashboard.jsx; src/app/pages/SubmittedRequestsPage.jsx", ""),
  @("GAP-006", "Partner view/manage assigned requests", "Yes", "Partner dashboard lists requests, modal, status decision.", "Need QA for own-message view routing and modal image behavior.", "Test before defense.", "High", "Implemented / Test", "src/app/pages/PartnerDashboard.jsx", ""),
  @("GAP-007", "Partner preferences require admin approval", "Partial yes", "Partner rule change request workflow exists.", "Does not automatically rewrite live DSS rules or partner matching logic yet.", "Phrase as admin-reviewed partner rule/preference requests.", "High", "Implemented / Clarify", "backend/src/controllers/dssController.ts", ""),
  @("GAP-008", "Admin approve/decline partner preferences", "Yes", "Admin can update partner rule request status and notify partner.", "UI quality and exact statuses should be tested.", "Keep and test.", "High", "Implemented / Test", "src/app/pages/AdminDashboard.jsx; backend/src/controllers/dssController.ts", ""),
  @("GAP-009", "Admin manage users", "Yes", "Admin user CRUD endpoints and UI.", "Need smoke test delete/suspend/edit roles.", "Test before QA.", "High", "Implemented / Test", "backend/src/controllers/adminController.ts", ""),
  @("GAP-010", "Admin manage submissions", "Partial", "Admin can list and update submission statuses.", "Not a full rich submission management module.", "Either implement more or word as status oversight.", "Medium", "Partial", "backend/src/controllers/adminController.ts", ""),
  @("GAP-011", "Admin manage DSS rules", "Partial", "CRUD table exists for dss_rules.", "Actual engine still reads hardcoded TypeScript rules, not DB rules.", "Do not claim live rule editing unless implemented.", "Critical", "Partial", "backend/src/controllers/adminController.ts; backend/src/services/dssEngine.ts", ""),
  @("GAP-012", "Audit logs for admin actions", "Partial", "activity_logs used for admin submission status; recommendation audit exists.", "Not every admin action has an activity_log row.", "Add logs or soften claim.", "Medium", "Partial", "backend/src/controllers/adminController.ts; docs/clothcycle-current-erd.dbml", ""),
  @("GAP-013", "GIS partner map", "Partial", "Coordinate ranking and custom plotted map.", "No full map provider confirmed.", "Describe accurately or integrate full map API.", "Medium", "Partial", "backend/src/services/gisService.ts", ""),
  @("GAP-014", "Download/copy request summary", "Partial", "Partner brief is sent in-app; admin DSS CSV export exists.", "User download/copy of partner brief may be missing.", "Add UI or revise thesis.", "Low", "Backlog", "src/app/pages/DssConfirmationPage.jsx", ""),
  @("GAP-015", "Separate Super Admin", "No", "Only admin role.", "Thesis says Super Admin.", "Remove Super Admin wording or add role.", "High", "To Decide", "src/routes.jsx", ""),
  @("GAP-016", "Impact dashboard", "Partial", "Charts from submissions/request data.", "Not validated textile diversion estimates.", "Use as engagement/status metrics.", "Medium", "Clarify", "src/app/pages/UserDashboard.jsx; src/app/pages/AdminDashboard.jsx", "")
)

$dssHeaders = @("ID", "DSS Claim / Evidence Need", "Current Implementation", "Where Used in Thesis", "Recommended Citation Topic", "Current File Evidence", "Citation Status", "Notes")
$dss = @(
  $dssHeaders,
  @("DSS-CIT-001", "Knowledge-driven DSS is appropriate for consumer textile routing.", "Rule-based backend DSS evaluates user-submitted textile criteria.", "Chapter 1/2 rationale; Chapter 3 methodology.", "Knowledge-driven DSS; explainable rule-based DSS.", "backend/src/services/dssEngine.ts", "Needs exact bibliography number", "Use your existing DSS literature refs, likely Chapter 1/2 DSS sources."),
  @("DSS-CIT-002", "Circular economy pathways include donation/reuse, recycling, and upcycling.", "Pathways are recycle, donate, upcycle, rejected gate; buyback is an upcycle preference.", "Scope and DSS process flow.", "Circular economy textile lifecycle and end-of-life pathways.", "docs/dss-matrix.md", "Needs exact bibliography number", ""),
  @("DSS-CIT-003", "Fiber composition affects textile recovery feasibility.", "Material/fiber scoring distinguishes cotton/natural, polyester/synthetic, blends, wool/silk.", "Rule base rationale.", "Textile recycling feasibility by fiber composition.", "backend/src/services/dssEngine.ts", "Needs exact bibliography number", ""),
  @("DSS-CIT-004", "Condition and cleanliness affect donation eligibility.", "Donation gates block heavily damaged, heavily soiled, restricted/uniform items.", "Donation rule section.", "Donation hygiene/redistribution suitability; circular reuse quality criteria.", "backend/src/services/dssEngine.ts", "Needs source", ""),
  @("DSS-CIT-005", "Burn test helps identify fabric behavior.", "Burn test ranks top 3 possible fibers with partial scoring.", "Burn test guidance/design.", "Textile burn test/fiber identification reference.", "backend/src/services/dssEngine.ts; backend/src/services/dssEngine.test.ts", "Needs source", "Important for defense because burn test is a visible DSS feature."),
  @("DSS-CIT-006", "Explainability improves trust in DSS recommendations.", "UI shows confidence, matched/missed checks, why-this-was-recommended accordion.", "DSS output surface and transparency requirement.", "Explainable DSS / transparent recommender systems.", "src/app/pages/DssConfirmationPage.jsx; docs/dss-matrix.md", "Needs exact bibliography number", ""),
  @("DSS-CIT-007", "GIS/location supports actionable disposal decisions.", "Partner discovery ranks/filters by pathway, coordinates, distance.", "GIS component and partner directory.", "GIS/location-based sustainability services.", "backend/src/services/gisService.ts", "Needs exact bibliography number", ""),
  @("DSS-CIT-008", "Buyback/upcycling supports circular value recovery but acceptance is external.", "Buyback is a yes/no preference attached to upcycle handoff, not a DSS score.", "Buyback scope/delimitation.", "Upcycling, circular business models, buyback/take-back programs.", "backend/src/services/dssEngine.ts", "Needs source", "Do not claim guaranteed pricing."),
  @("DSS-CIT-009", "Audit trail supports DSS validation and thesis defense.", "recommendation_runs and recommendation_results store engine_version, input_snapshot, output_payload.", "Testing/audit/admin methodology.", "DSS validation, traceability, auditability.", "backend/src/controllers/dssController.ts; docs/clothcycle-current-erd.dbml", "Project evidence enough; external source optional", ""),
  @("DSS-CIT-010", "User-selected pathway may differ from DSS top recommendation.", "UI separates DSS cards from pathway selector and requires confirmation on mismatch.", "DSS user control and transparency.", "Human-in-the-loop decision support / user autonomy.", "src/app/pages/DssConfirmationPage.jsx", "Needs source if emphasized", "")
)

$dbHeaders = @("ID", "ERD / DB Area", "Current Live Schema", "Thesis/Docs Update Needed", "Status", "Priority", "Evidence", "Notes")
$db = @(
  $dbHeaders,
  @("DB-001", "Database platform", "Neon PostgreSQL current QA schema.", "Replace MySQL references.", "Done in DBML", "Critical", "docs/clothcycle-current-erd.dbml", ""),
  @("DB-002", "Authentication", "users, password_reset_tokens, user_recovery_codes, auth_events, rate_limits.", "Show auth/security tables in ERD if space allows.", "Done in DBML", "High", "Live Neon schema", ""),
  @("DB-003", "Submission intake", "submissions, submission_details, burn_tests, submission_images.", "Replace generic textile table with detailed intake entities.", "Done in DBML", "Critical", "docs/clothcycle-current-erd.dbml", ""),
  @("DB-004", "DSS audit", "recommendation_runs, recommendation_results, recommendation_feedback, dss_rules.", "Add DSS audit trail to methodology and ERD.", "Done in DBML", "Critical", "backend/src/controllers/dssController.ts", ""),
  @("DB-005", "Partner handoff", "transactions with statuses pending, accepted, completed, rejected.", "Update status list and request lifecycle.", "Done in DBML", "High", "backend/src/db/migrations/021_simplify_dss_request_statuses.sql", ""),
  @("DB-006", "Messages/notifications", "messages, conversations, message_attachments, notifications.", "Add communication module to ERD/system architecture.", "Done in DBML", "High", "docs/clothcycle-current-erd.dbml", ""),
  @("DB-007", "Partner preferences", "partner_rule_change_requests plus partner capacity/preference columns.", "Add admin-reviewed partner preference workflow.", "Done in DBML", "Medium", "backend/src/controllers/dssController.ts", ""),
  @("DB-008", "Operational logs", "activity_logs and schema_migrations.", "Mention system logs and migration tracking.", "Done in DBML", "Medium", "Live Neon schema", ""),
  @("DB-009", "D1 schema", "Still exists as Cloudflare reference, but current QA DB is Neon.", "Avoid presenting D1 as current primary DB unless deployed that way.", "Done in DBML note", "High", "backend/src/db/d1-schema.sql; docs/cloudflare-hono-d1-deploy.md", "")
)

$qaHeaders = @("ID", "QA / UAT Task", "Module", "Precondition", "Expected Evidence", "Priority", "Status", "Artifact / File", "Notes")
$qa = @(
  $qaHeaders,
  @("QA-001", "Run existing backend DSS unit tests.", "DSS", "backend deps installed", "Cotton/polyester/wool, donation, restricted category, upcycle, scraps tests pass.", "Critical", "To Run", "backend/src/services/dssEngine.test.ts", ""),
  @("QA-002", "Execute generated DSS QA workbook.", "DSS", "App running with test accounts", "Actual Result and Pass/Fail columns completed.", "Critical", "To Do", "ClothCycle_DSS_QA_Test_Cases.xlsx", ""),
  @("QA-003", "Submit textile with images.", "Submission", "Backend local uploads/R2 path configured", "Images upload, labels persist, partner/user view carousel works.", "High", "To Test", "src/app/components/ImageCarousel.jsx", ""),
  @("QA-004", "Route guard direct URL test after logout.", "Auth/RBAC", "Logged out state", "/dashboard, /partner, /admin redirect to login.", "Critical", "To Test", "src/app/components/ProtectedRoute.jsx", ""),
  @("QA-005", "Partner request accept/reject/completed.", "Partner", "Pending transaction exists", "User receives message and notification; status updates.", "High", "To Test", "src/app/pages/PartnerDashboard.jsx", ""),
  @("QA-006", "Admin partner rule request review.", "Admin", "Partner submitted request", "Admin note/status sends partner message/notification.", "High", "To Test", "src/app/pages/AdminDashboard.jsx", ""),
  @("QA-007", "DSS audit export.", "Admin", "Recommendation runs exist", "CSV downloads with engine_version and matched/missed rules.", "Medium", "To Test", "backend/src/controllers/dssController.ts", ""),
  @("QA-008", "Settings profile/photo/password/account delete.", "Settings", "Role-specific account logged in", "Profile saves to DB; photo respects upload limits; password validation shown on focus; delete account works.", "High", "To Test", "src/app/pages/SettingsPage.jsx", ""),
  @("QA-009", "User dashboard charts and status cards.", "Dashboard", "Submissions and requests exist", "Counts/charts match actual records.", "Medium", "To Test", "src/app/pages/UserDashboard.jsx", ""),
  @("QA-010", "Forgot password code-first flow.", "Auth", "Email provider/dev code available", "Code verification precedes new password fields.", "High", "To Test", "src/app/pages/LoginPage.jsx", "")
)

$deployHeaders = @("ID", "Deployment Concern", "Current Project Reality", "Risk", "Required Action", "Priority", "Status", "Evidence / File")
$deploy = @(
  $deployHeaders,
  @("DEP-001", "Cloudflare target", "Hono Worker exists in backend/src/worker.ts; local Hono app uses Neon/Node.", "Two backend paths can drift.", "Keep Worker and local API route behavior aligned.", "High", "Monitor", "backend/src/worker.ts; backend/src/honoLocalApp.ts"),
  @("DEP-002", "Database choice", "Current QA uses Neon Postgres; Worker D1 services still exist.", "Thesis/deployment docs can confuse Neon vs D1.", "State Neon current QA clearly; D1 as reference unless final deployment uses it.", "High", "Updated in DBML", "docs/clothcycle-current-erd.dbml"),
  @("DEP-003", "Uploads", "Local Hono can write uploads folder in development; Worker path should use R2.", "Local disk won't work on Cloudflare Workers.", "Use R2 for production uploads.", "Critical", "Backlog", "backend/src/controllers/uploadController.ts; backend/src/services/r2Service.ts"),
  @("DEP-004", "Node-only modules", "Local Hono app imports node:fs/path for local uploads.", "Not Worker-compatible, but okay for local Node app.", "Do not deploy honoLocalApp.ts as Worker entry.", "High", "Document", "backend/src/honoLocalApp.ts"),
  @("DEP-005", "Env/secrets", "DATABASE_URL, JWT_SECRET, TWO_FACTOR_ENCRYPTION_KEY, CORS origins, R2/email/Google vars.", "Missing secrets break auth/uploads/email.", "Finalize .env.example and Wrangler secrets before deploy.", "High", "To Do", "backend/.env.example; backend/wrangler.toml"),
  @("DEP-006", "Connection pooling", "Node local uses pg Pool against Neon.", "Serverless Worker should use Worker-compatible DB approach or D1 path.", "Decide final production data path before deployment freeze.", "Critical", "Decision Needed", "backend/src/config/database.ts; backend/src/config/d1.ts"),
  @("DEP-007", "Frontend API URL", "Frontend uses VITE_API_URL.", "Wrong URL breaks all API calls after deployment.", "Set VITE_API_URL to deployed API.", "High", "To Do", "src/services/api.ts; .env.example"),
  @("DEP-008", "Bundle size", "Vite build may warn due dashboard/page imports.", "Slow loading but not thesis blocker.", "Keep lazy routes; code split if warning becomes severe.", "Low", "Backlog", "src/routes.jsx")
)

$remindersHeaders = @("Reminder", "Why It Matters", "Action", "Priority", "Status")
$reminders = @(
  $remindersHeaders,
  @("Do not claim Python DSS anymore.", "It is factually wrong for current code.", "Replace with TypeScript/Hono backend DSS engine.", "Critical", "To Do"),
  @("Do not claim MySQL anymore.", "ERD and live DB are Neon PostgreSQL.", "Use updated DBML.", "Critical", "Done in docs"),
  @("Be careful with Super Admin wording.", "No separate role exists.", "Use Admin or implement super_admin.", "High", "To Decide"),
  @("Do not overclaim impact reduction.", "Current charts are operational/engagement metrics.", "Say preliminary indicators, not audited waste diversion.", "High", "To Do"),
  @("DSS is the star.", "Defense will likely inspect rule logic.", "Bring dss-matrix.md, DSS QA workbook, and audit export.", "Critical", "To Prepare"),
  @("Validate citations before final print.", "Tracker maps citation needs but not exact bibliography numbering.", "Cross-check Word references.", "High", "To Do"),
  @("Keep partner acceptance external-limited.", "Partners decide capacity/pricing/logistics.", "Phrase platform as coordination and decision support.", "High", "To Do"),
  @("Generate ERD from DBML after every schema change.", "Docs and defense diagrams must match DB.", "Use docs/clothcycle-current-erd.dbml.", "Medium", "Ongoing")
)

$wide = @(14, 28, 42, 42, 48, 14, 18, 42, 34, 18, 28)
$overviewWidths = @(28, 32, 58, 42, 44)
$featureWidths = @(14, 32, 18, 45, 42, 40, 14, 20, 42, 28)
$dssWidths = @(14, 42, 42, 34, 44, 42, 24, 32)
$dbWidths = @(14, 30, 42, 42, 18, 14, 42, 30)
$qaWidths = @(14, 38, 20, 32, 44, 14, 18, 42, 30)
$deployWidths = @(14, 30, 42, 34, 42, 14, 18, 42)
$reminderWidths = @(42, 44, 44, 14, 18)

Write-Sheet "$root\xl\worksheets\sheet1.xml" $overview $overviewWidths
Write-Sheet "$root\xl\worksheets\sheet2.xml" $chapter $wide
Write-Sheet "$root\xl\worksheets\sheet3.xml" $gaps $featureWidths
Write-Sheet "$root\xl\worksheets\sheet4.xml" $dss $dssWidths
Write-Sheet "$root\xl\worksheets\sheet5.xml" $db $dbWidths
Write-Sheet "$root\xl\worksheets\sheet6.xml" $qa $qaWidths
Write-Sheet "$root\xl\worksheets\sheet7.xml" $deploy $deployWidths
Write-Sheet "$root\xl\worksheets\sheet8.xml" $reminders $reminderWidths

if (Test-Path $output) {
  Remove-Item -LiteralPath $output -Force
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
