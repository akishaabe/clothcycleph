$ErrorActionPreference = "Stop"

$root = Join-Path $PSScriptRoot "dss-matrix-xlsx"
$dest = Join-Path $PSScriptRoot "dss-matrix.xlsx"
$zipDest = Join-Path $PSScriptRoot "dss-matrix.zip"

if (Test-Path $root) {
  Remove-Item -LiteralPath $root -Recurse -Force
}

New-Item -ItemType Directory -Path $root, "$root\_rels", "$root\xl", "$root\xl\_rels", "$root\xl\worksheets" | Out-Null

Set-Content -LiteralPath "$root\[Content_Types].xml" -Value '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
Set-Content -LiteralPath "$root\_rels\.rels" -Value '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
Set-Content -LiteralPath "$root\xl\_rels\workbook.xml.rels" -Value '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/></Relationships>'
Set-Content -LiteralPath "$root\xl\workbook.xml" -Value '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Intake Flow" sheetId="1" r:id="rId1"/><sheet name="Burn Test Logic" sheetId="2" r:id="rId2"/><sheet name="Pathway Scoring" sheetId="3" r:id="rId3"/><sheet name="Cleanup Notes" sheetId="4" r:id="rId4"/></sheets></workbook>'

function Escape-Xml($value) {
  return [System.Security.SecurityElement]::Escape([string]$value)
}

function Get-ColumnName($number) {
  $result = ""
  while ($number -gt 0) {
    $number--
    $result = [char](65 + ($number % 26)) + $result
    $number = [math]::Floor($number / 26)
  }
  return $result
}

function Write-Sheet($path, $rows) {
  $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
  for ($i = 0; $i -lt $rows.Count; $i++) {
    $rowNumber = $i + 1
    $xml += "<row r=`"$rowNumber`">"
    for ($j = 0; $j -lt $rows[$i].Count; $j++) {
      $cellRef = "$(Get-ColumnName ($j + 1))$rowNumber"
      $cellText = Escape-Xml $rows[$i][$j]
      $xml += "<c r=`"$cellRef`" t=`"inlineStr`"><is><t>$cellText</t></is></c>"
    }
    $xml += "</row>"
  }
  $xml += '</sheetData></worksheet>'
  Set-Content -LiteralPath $path -Value $xml
}

$intake = @(
  @("Area", "Field", "Question / Source", "Choices / Input"),
  @("Screening", "details.restricted_category", "Does the item belong to any restricted category?", "Hospital/medical uniform; PPE or contaminated workwear; Used undergarments; Mold/chemical contaminated; None"),
  @("Item", "item_type/details.item_types", "What type of item/s are you submitting?", "Top; Pants/Jeans; Dress; Jacket; Household textile; Fabric scraps; Other"),
  @("Condition", "condition", "Overall condition", "Good; Minor damage; Heavily damaged"),
  @("Cleanliness", "cleanliness", "Is/are the item/s clean?", "Clean; Needs cleaning; Heavily soiled/contaminated"),
  @("Fabric", "details.knows_fabric_type", "Do you know the fabric type?", "Yes; No"),
  @("Fabric", "details.fabric_types", "What is the fabric type?", "Cotton/Linen; Polyester/nylon/acrylic; Viscose/Rayon; Blends; Coated/PPE; Wool/Silk; Other/user-defined"),
  @("Fabric", "details.custom_fabric_text", "User-defined fabric text", "Free text"),
  @("Fabric", "details.fiber_composition", "Main material/fiber composition", "Cotton/natural; Polyester/synthetic; Blend; Wool/silk/delicate; Mixed/unknown"),
  @("Recovery", "details.contamination_level", "Contamination level", "Only if condition is minor/heavy damage")
)

$burn = @(
  @("Fiber", "Moment", "Flames", "No flame", "Smell", "Ashes"),
  @("cotton", "Burned fast", "Burns quickly", "Continues quickly, afterglow", "Burning paper", "Light gray ash OR black ash"),
  @("linen", "Burned fast", "Burns quickly", "Continues to burn", "Burning paper", "Light gray ash"),
  @("rayon/tencel", "Burned fast", "Burns quickly", "Continues quickly", "Burning paper", "Light gray ash"),
  @("silk", "Curled away, no flame", "Burns slowly, sputters", "Burns with difficulty, stops", "Burning hair", "Shiny black beads and easy crush"),
  @("wool", "Curled away, no flame, burned slowly", "Burns slowly, sizzles, flickering", "Stops burning", "Burning hair", "Easy to crush, irregular bead"),
  @("nylon", "Melted and did not burn, shrinked away", "Melts, burns slowly", "Stops burning", "Celery", "Hard gray bead and will not crush"),
  @("polyester/poly fleece", "Shrinked away", "Melts, burns slowly", "Burns with difficulty", "Chemicals", "Hard gray bead and will not crush"),
  @("acetate", "Shrinked away, turned black", "Sputters, melts, drips, burns quickly", "Continues to melt and burn", "Vinegar", "Hard black ash, irregular bead, difficult crush"),
  @("acrylic", "Shrinked away", "Burns quickly, sputters, melts", "Continues to melt and burn", "Chemicals", "Hard irregular black bead and will not crush"),
  @("spandex", "Shrinked away", "Melts, burns quickly", "Continues to melt and burn", "Sharp and bitter", "Soft sticky gummy")
)

$score = @(
  @("Pathway", "Criterion", "Weight", "Match"),
  @("Donation", "Wearability", "20", "Wearable as-is or minor repair"),
  @("Donation", "Cleanliness/contamination", "30", "Clean or washable only"),
  @("Donation", "Damage/repair", "17", "No damage or minor repairable damage"),
  @("Upcycle", "Repurposing potential", "15", "High or medium"),
  @("Upcycle", "Repairability/damage", "30", "Repair/redesign can preserve material value"),
  @("Recycle", "Fabric/material signal", "40", "Identifiable recyclable fiber/material"),
  @("Recycle", "Damage/contamination/trim", "45", "Material recovery fit without hazardous contamination")
)

$cleanup = @(
  @("Candidate", "Decision"),
  @("condition + wearability + damage + repairability", "Keep all, arranged as condition first then recovery detail"),
  @("cleanliness + contamination_level", "Keep both; contamination only appears for minor/heavy damage"),
  @("fabric type + fiber composition + burn test", "Keep all as separate evidence sources")
)

Write-Sheet "$root\xl\worksheets\sheet1.xml" $intake
Write-Sheet "$root\xl\worksheets\sheet2.xml" $burn
Write-Sheet "$root\xl\worksheets\sheet3.xml" $score
Write-Sheet "$root\xl\worksheets\sheet4.xml" $cleanup

if (Test-Path $dest) {
  Remove-Item -LiteralPath $dest -Force
}
if (Test-Path $zipDest) {
  Remove-Item -LiteralPath $zipDest -Force
}

Compress-Archive -Path "$root\*" -DestinationPath $zipDest
Move-Item -LiteralPath $zipDest -Destination $dest
Remove-Item -LiteralPath $root -Recurse -Force
