import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = Document()

    # Configure A4 Page and 1-inch margins
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Professional Academic Cybersecurity Color Palette
    # Primary Headings & Main Title: Dark Navy #0B1F3A
    COLOR_NAVY = RGBColor(11, 31, 58)
    HEX_NAVY = "0B1F3A"
    
    # University, Department & Section Headings: Dark Blue #17365D
    COLOR_DARK_BLUE = RGBColor(23, 54, 93)
    HEX_DARK_BLUE = "17365D"
    
    # Body Text: Near-Black #222222 (high contrast against white)
    COLOR_BODY = RGBColor(34, 34, 34)
    
    # Accent Elements: Medium Blue #1976D2
    COLOR_ACCENT = RGBColor(25, 118, 210)
    HEX_ACCENT = "1976D2"
    
    # Header & Footer Text: Muted Dark Neutral #444444
    COLOR_MUTED_DARK = RGBColor(68, 68, 68)

    # Styles Setup
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = COLOR_BODY
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    # Helper XML functions
    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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

    def set_table_borders(table, color="B0BEC5", sz="4"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'''
            <w:tblBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
                <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
                <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
            </w:tblBorders>
        ''')
        tblPr.append(borders)

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(20)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(17)
        run.font.bold = True
        run.font.color.rgb = COLOR_NAVY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK_BLUE
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK_BLUE
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
            r_pre.font.color.rgb = COLOR_NAVY
        r_text = p.add_run(text)
        r_text.font.name = 'Calibri'
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_BODY
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
            r_pre.font.color.rgb = COLOR_NAVY
        r_text = p.add_run(text)
        r_text.font.name = 'Calibri'
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_BODY
        return p

    def add_code_block(text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "0B1F3A") # Dark Navy terminal box
        set_cell_margins(cell, top=110, bottom=110, left=150, right=150)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.05
        r = p.add_run(text)
        r.font.name = 'Consolas'
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255) # Crisp White
        doc.add_paragraph() # Spacing

    def add_table_data(col_widths, headers, rows_data):
        table = doc.add_table(rows=1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, color="B0BEC5", sz="4")
        
        # Header row
        hdr_cells = table.rows[0].cells
        for i, title in enumerate(headers):
            hdr_cells[i].text = title
            set_cell_background(hdr_cells[i], HEX_NAVY)
            set_cell_margins(hdr_cells[i], top=110, bottom=110, left=120, right=120)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = "Calibri"
                run.font.size = Pt(9)
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255) # Pure White
                
        # Data rows
        for r_idx, row_values in enumerate(rows_data):
            row_cells = table.add_row().cells
            bg_color = "F4F6F9" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row_values):
                row_cells[c_idx].text = str(val)
                set_cell_background(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], top=85, bottom=85, left=120, right=120)
                p = row_cells[c_idx].paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:
                    run.font.name = "Calibri"
                    run.font.size = Pt(8.5)
                    run.font.color.rgb = COLOR_BODY # Near-Black #222222
                    
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = width
        doc.add_paragraph() # Spacing

    def add_placeholder_box(title, subtitle, prompt_ref=None):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'''
            <w:tcBorders {nsdecls("w")}>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="B0BEC5"/>
                <w:left w:val="single" w:sz="24" w:space="0" w:color="{HEX_DARK_BLUE}"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="B0BEC5"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="B0BEC5"/>
            </w:tcBorders>
        ''')
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(f"[{title}]\n")
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.bold = True
        r1.font.color.rgb = COLOR_NAVY
        
        r2 = p.add_run(f"{subtitle}\n")
        r2.font.name = "Calibri"
        r2.font.size = Pt(8.5)
        r2.font.italic = True
        r2.font.color.rgb = COLOR_BODY
        
        if prompt_ref:
            r3 = p.add_run(f"Eraser AI Generation Prompt: See evidence/DIAGRAM_GENERATION_PROMPTS.md ({prompt_ref})")
            r3.font.name = "Calibri"
            r3.font.size = Pt(8)
            r3.font.bold = True
            r3.font.color.rgb = COLOR_DARK_BLUE
            
        doc.add_paragraph() # spacing

    # ==========================================
    # 1. COVER PAGE (HIGH CONTRAST ACADEMIC THEME)
    # ==========================================
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(60)
    title_p.paragraph_format.space_after = Pt(6)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = title_p.add_run("AMRITA VISHWA VIDYAPEETHAM\nDEPARTMENT OF CYBER SECURITY")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(13)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_DARK_BLUE

    # University decorative horizontal accent rule
    rule_table = doc.add_table(rows=1, cols=1)
    rule_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    rule_cell = rule_table.cell(0, 0)
    rule_cell.width = Inches(4.5)
    set_cell_background(rule_cell, HEX_DARK_BLUE)
    set_cell_margins(rule_cell, top=15, bottom=15, left=0, right=0)
    p_empty = rule_cell.paragraphs[0]
    p_empty.paragraph_format.space_before = Pt(0)
    p_empty.paragraph_format.space_after = Pt(0)
    r_sp = p_empty.add_run("")
    r_sp.font.size = Pt(1)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(28)
    sub_p.paragraph_format.space_after = Pt(12)
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_main = sub_p.add_run("CYBER THREAT INTELLIGENCE (CTI)\nSHARING PLATFORM")
    r_main.font.name = 'Calibri'
    r_main.font.size = Pt(25)
    r_main.font.bold = True
    r_main.font.color.rgb = COLOR_NAVY

    course_p = doc.add_paragraph()
    course_p.paragraph_format.space_after = Pt(36)
    course_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_course = course_p.add_run("24CYS401 – Secure Software Engineering\nEnd-Semester Laboratory Examination Project\nAssigned Topic: Topic 29\nInterim Academic Report (Phases 1 – 10)")
    r_course.font.name = 'Calibri'
    r_course.font.size = Pt(11.5)
    r_course.font.bold = True
    r_course.font.color.rgb = COLOR_DARK_BLUE

    student_p = doc.add_paragraph()
    student_p.paragraph_format.space_before = Pt(90)
    student_p.paragraph_format.space_after = Pt(4)
    student_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_name = student_p.add_run("Submitted by:\n")
    r_name.font.size = Pt(11)
    r_name.font.color.rgb = COLOR_BODY
    r_name2 = student_p.add_run("ABISHEK SINGH P\n")
    r_name2.font.size = Pt(16)
    r_name2.font.bold = True
    r_name2.font.color.rgb = COLOR_NAVY
    r_name3 = student_p.add_run("B.Tech Computer Science Engineering – Cyber Security\nAmrita School of Engineering, Chennai Campus\nDate of Submission: October 2026")
    r_name3.font.size = Pt(11)
    r_name3.font.color.rgb = COLOR_BODY

    doc.add_page_break()

    # Configure Header / Footer for subsequent sections (High contrast dark neutral #444444)
    header_footer_section = doc.sections[0]
    # Header
    hp = header_footer_section.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run("Secure Software Engineering – CTI Sharing Platform | Topic 29")
    hrun.font.name = "Calibri"
    hrun.font.size = Pt(8.5)
    hrun.font.bold = True
    hrun.font.color.rgb = COLOR_MUTED_DARK
    # Footer
    fp = header_footer_section.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    frun = fp.add_run("Abishek Singh P | 24CYS401\t\tInterim Report (Phases 1–10)")
    frun.font.name = "Calibri"
    frun.font.size = Pt(8.5)
    frun.font.bold = True
    frun.font.color.rgb = COLOR_MUTED_DARK

    # ==========================================
    # 2. TABLE OF CONTENTS
    # ==========================================
    add_h1("TABLE OF CONTENTS")
    toc_items = [
        ("1. Project Overview & System Scope", "3"),
        ("2. Phase 1 – Agile Development (Scrum + XP Methodology)", "4"),
        ("3. Phase 2 – Requirements Engineering & Software Requirements Specification", "7"),
        ("4. Phase 3 – UML and Use Case Analysis", "10"),
        ("5. Phase 4 – Relational Data Modeling and Data Flow Analysis", "13"),
        ("6. Phase 5 – Architecture, Components, and Design Patterns", "17"),
        ("7. Phase 6 – User Interface Design & Shneiderman's 8 Golden Rules", "20"),
        ("8. Phase 7 – Threat Modeling, STRIDE & Vulnerability Analysis", "24"),
        ("9. Phase 8 – Attack Tree Decomposition & Security Architecture Refinement", "28"),
        ("10. Phase 9 – Product Backlog & Jira Sprint Planning", "32"),
        ("11. Phase 10 – Scrum Execution, Burndown & Velocity Metrics", "35"),
        ("12. Unified End-to-End Traceability Matrix (Phases 1–10)", "38")
    ]
    for title, pg in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        r1 = p.add_run(title)
        r1.font.bold = True
        r1.font.size = Pt(10)
        r1.font.color.rgb = COLOR_NAVY
        # Dot leader
        dots = " ." * int((72 - len(title)) / 2)
        r_dots = p.add_run(f" {dots} ")
        r_dots.font.color.rgb = RGBColor(148, 163, 184)
        r2 = p.add_run(pg)
        r2.font.bold = True
        r2.font.color.rgb = COLOR_ACCENT

    doc.add_page_break()

    # ==========================================
    # SECTION 1: PROJECT OVERVIEW
    # ==========================================
    add_h1("1. Project Overview & System Scope")
    add_p("The Cyber Threat Intelligence (CTI) Sharing Platform is an enterprise-grade, decentralized intelligence-sharing solution designed to facilitate secure, peer-to-peer and community-wide exchange of Indicators of Compromise (IoCs) and structured incident narratives across vetted organizations. Operating in high-threat adversarial environments, the platform eliminates traditional barriers to collaboration by enforcing strict cryptographic access barriers, granular role segregation, and immutable forensic accountability.")
    
    add_h2("1.1 Core System Capabilities")
    add_bullet(" Multi-Factor Identity Verification: Primary authentication is reinforced with mandatory RFC 6238 Time-Based One-Time Password (TOTP) enforcement with ±30s drift tolerance.", bold_prefix="•")
    add_bullet(" Strategy-Pattern Observable Ingestion: Automated validation and canonical defanging of IPv4, IPv6, FQDN, MD5, SHA-1, and SHA-256 observables, disarming dangerous active indicators.", bold_prefix="•")
    add_bullet(" Structured Incident Markdown Reporting: Markdown threat reports sanitized server-side against Stored Cross-Site Scripting (XSS).", bold_prefix="•")
    add_bullet(" Analyst Vetting & Review Logs: Dedicated triage workbench enforcing mandatory justification notes, confidence scores (0–100), and MITRE ATT&CK technique tagging.", bold_prefix="•")
    add_bullet(" Strict Traffic Light Protocol (TLP) Enforcement: Server-side Attribute-Based Access Control (canAccessTLP) preventing unauthorized egress of confidential TLP:RED intelligence.", bold_prefix="•")
    add_bullet(" OASIS STIX 2.1 Threat Feed Egress: Real-time serialization of approved intelligence into standard STIX 2.1 JSON bundles for automated firewall and SIEM consumption.", bold_prefix="•")
    add_bullet(" Tamper-Evident SHA-256 Hash-Chained Audit Log: Every security event is cryptographically linked to the preceding record, providing tamper-evident integrity verification.", bold_prefix="•")

    add_h2("1.2 Participating Actors & Authorization Boundaries")
    add_bullet(" Organization Contributor (ROLE_CONTRIBUTOR): Ingests raw observables and submits incident reports. Strictly barred from triaging or approving intelligence.", bold_prefix="1.")
    add_bullet(" Security Analyst (ROLE_ANALYST): Reviews pending queues, evaluates false-positive risks, assigns final TLP classifications, and authorizes feed publication.", bold_prefix="2.")
    add_bullet(" Platform Administrator (ROLE_ADMIN): Manages organization profiles, inspects Prometheus health metrics, and executes audit-chain integrity verifications.", bold_prefix="3.")
    add_bullet(" Threat Consumer / SIEM Agent (ROLE_CONSUMER): Queries machine-readable STIX 2.1 feeds. Bound by server-side egress filters that strictly strip TLP:RED intelligence.", bold_prefix="4.")

    doc.add_page_break()

    # ==========================================
    # SECTION 2: PHASE 1 – AGILE DEVELOPMENT
    # ==========================================
    add_h1("2. Phase 1 – Agile Development (Scrum + XP)")
    add_p("To balance rigorous security engineering constraints with rapid feature delivery, the CTI Sharing Platform employs a tailored hybrid methodology blending Scrum project governance with Extreme Programming (XP) technical engineering practices.")

    add_h2("2.1 Hybrid Scrum + XP Methodology")
    add_p("Scrum provides the macro-management framework, organizing work into time-boxed 2-week sprints, structured daily standups, backlog refinement sessions, and iterative sprint reviews. XP provides the micro-engineering disciplines essential for security-critical development: Test-Driven Development (TDD), continuous refactoring, pair programming for security-sensitive modules (such as cryptographic hash-chaining and JWT signing), and continuous integration with automated security scanning.")

    add_h2("2.2 Alignment with Agile Manifesto Principles")
    p1_manifesto = [
        ["Manifesto Principle", "Implementation in CTI Sharing Platform", "Concrete Security & Engineering Rationale"],
        ["1. Customer Satisfaction via Early & Continuous Delivery", "Delivered working authentication and IoC ingestion APIs in Sprint 1, followed by automated STIX 2.1 feeds in Sprint 2.", "Allows partner CSIRTs and SOC analysts to validate threat schemas early without delaying defensive deployment."],
        ["3. Deliver Working Software Frequently", "Automated deployment pipeline running 53 unit and integration tests on every Git commit.", "Guarantees that regressions in authorization or defanging logic are intercepted before deployment."],
        ["5. Build Projects Around Motivated Individuals", "Segregated domain responsibilities between Core Cryptography, Ingestion, and Feed Distribution engineers.", "Enables focused peer review on security-critical barriers without context switching."],
        ["9. Continuous Attention to Technical Excellence", "Adopted Strategy Pattern for IoC validation, ReDoS-resistant regular expressions, and WAL-mode SQLite.", "Prevents technical debt from degrading platform latency or introducing injection vulnerabilities."],
        ["10. Simplicity — Maximizing Work Not Done", "Implemented vanilla modern web standards and zero external frontend dependencies over bloated UI frameworks.", "Minimizes third-party supply-chain attack surface and transitive dependency vulnerabilities."]
    ]
    add_table_data([Inches(1.8), Inches(2.4), Inches(2.1)], p1_manifesto[0], p1_manifesto[1:])

    add_h2("2.3 Refactoring Opportunities (Architectural vs. Security)")
    add_p("To maintain strict scientific delineation, refactoring in Phase 1 focuses on design and maintainability improvements, distinct from Phase 12 vulnerability remediation:")
    add_bullet(" Architectural Refactoring 1 (Strategy Pattern Validation): Replaced rigid if-else blocks in IoC parsing with an extensible Strategy Pattern (IPv4Strategy, IPv6Strategy, DomainStrategy, HashStrategy). Decoupled validation schemas from controller routing, allowing new observable formats (e.g., CVEs, URLs) to be plugged in without touching existing code.", bold_prefix="•")
    add_bullet(" Architectural Refactoring 2 (Centralized TLP Policy Engine): Refactored decentralized SQL WHERE clauses into a single, pure in-memory policy function canAccessTLP(user, indicator). Centralized the information barrier in src/middleware/tlpGuard.js for 100% unit test coverage.", bold_prefix="•")

    add_h2("2.4 Agile Risks and Proactive Mitigations")
    p1_risks = [
        ["Identified Agile Risk", "Operational Impact", "Proactive Engineering Mitigation"],
        ["Scope Creep via Unbounded IoC Formats", "Ingesting arbitrary formats degrades database indexing and parser performance.", "Enforced strict Strategy Pattern validation rejecting unclassified observable types at API gateway."],
        ["Insufficient Security Documentation", "Agile velocity deprioritizing compliance artifacts and audit trails.", "Enforced Security-as-Code: TRACEABILITY_MATRIX.md updated synchronously with every commit; SHA-256 audit log records all operations."],
        ["Cryptographic Concurrency Collisions", "Simultaneous async writes generating identical prev_record_hash values.", "Implemented in-process Promise serialization queue in AuditService ensuring sequential hash chaining."]
    ]
    add_table_data([Inches(1.8), Inches(2.2), Inches(2.3)], p1_risks[0], p1_risks[1:])

    doc.add_page_break()

    # ==========================================
    # SECTION 3: PHASE 2 – REQUIREMENTS ENGINEERING
    # ==========================================
    add_h1("3. Phase 2 – Requirements Engineering & SRS")
    add_p("Requirements engineering for the CTI Sharing Platform was conducted using threat-informed elicitation, translating the operational needs of national CERTs, commercial SOCs, and intelligence analysts into formal Software Requirements Specifications (SRS).")

    add_h2("3.1 Problem Statement")
    add_p("Modern cyber defense operations suffer from fragmented threat visibility. When an organization detects a novel advanced persistent threat (APT) campaign, sharing actionable intelligence with peers is hindered by fear of accidental data leakage, lack of standardized exchange formats, and inability to enforce handling restrictions (TLP). Existing platforms either lack mandatory multi-factor authentication, rely on client-side filtering that exposes classified indicators over the wire, or fail to provide tamper-evident proof of audit records. The CTI Sharing Platform solves these deficiencies through automated canonical defanging, server-side TLP information barriers, and continuous SHA-256 audit chaining.")

    add_h2("3.2 Stakeholder Analysis")
    add_bullet(" CSIRT Incident Responders: Require rapid, real-time ingestion of malicious network and file observables with immediate defanging to prevent accidental execution.", bold_prefix="•")
    add_bullet(" Senior Threat Analysts: Require specialized vetting interfaces to assign confidence scores, link MITRE ATT&CK techniques, and restrict dissemination via TLP ratings.", bold_prefix="•")
    add_bullet(" Automated Defense Systems (SIEM/SOAR/Firewalls): Require low-latency, machine-readable STIX 2.1 JSON feeds strictly sanitized according to organizational clearance.", bold_prefix="•")
    add_bullet(" Security Compliance Auditors: Require immutable, tamper-evident audit trails proving that data access policies were adhered to and no records were retroactively modified.", bold_prefix="•")

    add_h2("3.3 Functional & Security Requirements")
    p2_reqs = [
        ["Req ID", "Domain", "Specification", "MoSCoW", "Verification Method"],
        ["REQ-F-01", "Authentication", "System shall enforce primary credential authentication paired with RFC 6238 TOTP MFA.", "MUST", "Automated Supertest Auth Suite"],
        ["REQ-F-02", "Ingestion", "System shall ingest IPv4, IPv6, Domain, and Hash observables with automatic canonical defanging.", "MUST", "Strategy Pattern Unit Tests"],
        ["REQ-F-03", "Reports", "System shall accept Markdown incident dossiers and sanitize Stored XSS vectors.", "MUST", "Integration Test / Regex Audit"],
        ["REQ-F-04", "Triage", "System shall provide an analyst queue with mandatory justification text and immutable review logs.", "MUST", "Triage Integration Test Suite"],
        ["REQ-F-05", "Distribution", "System shall serialize approved intelligence into OASIS STIX 2.1 JSON bundles.", "MUST", "STIX Schema Validator Test"],
        ["REQ-S-01", "Audit Integrity", "System shall maintain an append-only audit trail with continuous SHA-256 hash chaining anchored to Genesis.", "MUST", "Offline Verification Script"],
        ["REQ-S-02", "TLP Barrier", "System shall enforce explicit server-side canAccessTLP filtering, strictly excluding TLP:RED from consumer feeds.", "MUST", "Role-Based Integration Tests"],
        ["REQ-S-03", "Rate Limiting", "System shall throttle authentication endpoints to 5 requests/minute to defeat brute-force guessing.", "MUST", "Rate Limiter Stress Tests"]
    ]
    add_table_data([Inches(0.9), Inches(1.2), Inches(2.6), Inches(0.8), Inches(1.8)], p2_reqs[0], p2_reqs[1:])

    doc.add_page_break()

    # ==========================================
    # SECTION 4: PHASE 3 – UML AND USE CASE ANALYSIS
    # ==========================================
    add_h1("4. Phase 3 – UML and Use Case Analysis")
    add_p("System interactions and architectural boundaries are formalized using Unified Modeling Language (UML) Use Case specifications, mapping human and automated actors to discrete operational capabilities.")

    add_h2("4.1 Platform Actors")
    add_bullet(" Organization Contributor: An external or internal authenticated security practitioner who discovers new indicators during incident response and submits them for community protection.", bold_prefix="1.")
    add_bullet(" Security Analyst: A vetted subject matter expert responsible for threat vetting, false-positive elimination, MITRE ATT&CK mapping, and TLP classification.", bold_prefix="2.")
    add_bullet(" Platform Administrator: An infrastructure operator managing cryptographic secrets, tenant trust levels, and audit trail integrity verifications.", bold_prefix="3.")
    add_bullet(" Threat Consumer / SIEM Agent: An automated subscriber client consuming machine-readable STIX 2.1 intelligence bundles to dynamically update network defenses.", bold_prefix="4.")

    add_h2("4.2 UML Use Case Diagram")
    add_placeholder_box(
        "DIAGRAM: UML USE CASE DIAGRAM",
        "Depicts actors (Contributor, Analyst, Admin, Consumer) interacting with core CTI capabilities, authentication includes, and review log extensions.",
        "Section 1"
    )

    add_h2("4.3 Critical Use Case 1: Ingest & Defang Threat Observable (UC-01)")
    p3_uc1 = [
        ["Element", "Detailed Specification"],
        ["Use Case Name", "UC-01: Ingest & Defang Threat Observable (IoC)"],
        ["Primary Actor", "Organization Contributor (ROLE_CONTRIBUTOR)"],
        ["Preconditions", "Contributor holds active session token authenticated via salted Bcrypt and RFC 6238 TOTP."],
        ["Trigger", "Contributor submits observable payload (type, raw value, description, initial TLP) via POST /api/iocs."],
        ["Main Success Scenario", "1. System authenticates JWT and verifies ROLE_CONTRIBUTOR.\n2. Strategy Pattern executes schema validation for observable type.\n3. Canonical defanging transforms active characters (e.g. 1.1.1.1 -> 1[.]1[.]1[.]1).\n4. System queries database for active duplicate observables.\n5. Observable stored in threat_indicators with status = 'PENDING'.\n6. System appends IOC_SUBMIT event to Tamper-Evident SHA-256 Audit Log.\n7. System returns HTTP 201 Created with indicator UUID and defanged preview."],
        ["Postconditions", "Indicator safely stored in vetting queue; cannot execute in browser; audit record chained."]
    ]
    add_table_data([Inches(2.0), Inches(4.3)], p3_uc1[0], p3_uc1[1:])

    add_h2("4.4 Critical Use Case 2: Triage & Classify Threat Intelligence with TLP (UC-02)")
    p3_uc2 = [
        ["Element", "Detailed Specification"],
        ["Use Case Name", "UC-02: Triage & Classify Threat Intelligence with TLP"],
        ["Primary Actor", "Security Analyst (ROLE_ANALYST)"],
        ["Preconditions", "Analyst authenticated with ROLE_ANALYST or ROLE_ADMIN; unreviewed items exist in queue."],
        ["Trigger", "Analyst requests pending queue (GET /api/triage/pending) and opens decision drawer."],
        ["Main Success Scenario", "1. Analyst reviews raw indicator, canonical defanged value, and submitter organization.\n2. Analyst sets Confidence Score (0–100) and maps MITRE ATT&CK technique (e.g. T1566.001).\n3. Analyst assigns final TLP rating (CLEAR, GREEN, AMBER, RED).\n4. Analyst enters mandatory justification text (>= 5 characters).\n5. System records immutable review decision in review_logs table.\n6. System updates indicator status to 'APPROVED' (or 'REJECTED').\n7. System appends IOC_TRIAGE_APPROVED to Tamper-Evident SHA-256 Audit Log.\n8. System returns HTTP 200 OK with updated indicator object."],
        ["Postconditions", "Indicator marked approved; immutable review audit stored; eligible for feed distribution."]
    ]
    add_table_data([Inches(2.0), Inches(4.3)], p3_uc2[0], p3_uc2[1:])

    doc.add_page_break()

    # ==========================================
    # SECTION 5: PHASE 4 – DATA MODELING AND DATA FLOW
    # ==========================================
    add_h1("5. Phase 4 – Relational Data Modeling and Data Flow Analysis")
    add_p("The CTI Sharing Platform utilizes an embedded SQLite relational database operating with Write-Ahead Logging (WAL) enabled and foreign keys strictly enforced (PRAGMA foreign_keys = ON) to guarantee ACID compliance without network latency.")

    add_h2("5.1 Relational Entity-Relationship (ER) Schema")
    add_placeholder_box(
        "DIAGRAM: RELATIONAL ENTITY-RELATIONSHIP (ER) DIAGRAM",
        "Documents 6 relational tables (organizations, users, threat_reports, threat_indicators, review_logs, audit_logs) with primary keys, foreign keys, and constraints.",
        "Section 2"
    )

    add_p("The relational architecture comprises six normalized tables:")
    add_bullet(" organizations: Manages tenant identity, domain registration, and organizational trust level (STANDARD, VERIFIED, PROBATIONARY).", bold_prefix="1.")
    add_bullet(" users: Manages actor credentials, Bcrypt password hashes, Base32 TOTP MFA secrets, and role claims (ROLE_CONTRIBUTOR, ROLE_ANALYST, ROLE_ADMIN, ROLE_CONSUMER).", bold_prefix="2.")
    add_bullet(" threat_reports: Stores qualitative incident dossiers, sanitized Markdown content, author ownership, and overall report TLP rating.", bold_prefix="3.")
    add_bullet(" threat_indicators: Stores validated observables, canonical defanged values, confidence scores, MITRE ATT&CK IDs, and triage state (PENDING, APPROVED, REJECTED).", bold_prefix="4.")
    add_bullet(" review_logs: Immutable decision log storing analyst UUID, indicator ID, decision, assigned TLP, justification text, and timestamp.", bold_prefix="5.")
    add_bullet(" audit_logs: Append-only cryptographic audit trail storing user UUID, event type, action details, prev_record_hash, and current_record_hash.", bold_prefix="6.")

    add_h2("5.2 Level 0 Context Data Flow Diagram (DFD)")
    add_placeholder_box(
        "DIAGRAM: LEVEL 0 CONTEXT DATA FLOW DIAGRAM",
        "Illustrates external entities (Contributor, Analyst, Consumer, Admin) interacting with the core CTI Sharing Platform boundary.",
        "Section 3"
    )

    add_h2("5.3 Level 1 Data Flow Diagram (DFD) with Trust Boundaries")
    add_placeholder_box(
        "DIAGRAM: LEVEL 1 DATA FLOW DIAGRAM WITH TRUST BOUNDARIES",
        "Depicts sub-processes (P1.0 Auth, P2.0 Validation/Defanging, P3.0 Reports, P4.0 Triage, P5.0 STIX Feed, P6.0 Audit Chaining), data stores (D1-D5), and Trust Boundaries (TB1, TB2, TB3).",
        "Section 4"
    )

    add_p("Three distinct trust boundaries protect the system:")
    add_bullet(" TB-1 (External / API Gateway Boundary): Separates untrusted public networks from Express API endpoints. Enforces TLS 1.3, Helmet HTTP headers, and rate limiting.", bold_prefix="•")
    add_bullet(" TB-2 (Role & Information Clearance Boundary): Enforces canAccessTLP Attribute-Based Access Control, separating standard consumer sessions from confidential TLP:RED intelligence.", bold_prefix="•")
    add_bullet(" TB-3 (Persistence & Cryptographic Chaining Boundary): Isolates database read/write routines from external callers. SHA-256 continuous hash chaining protects historical records.", bold_prefix="•")

    doc.add_page_break()

    # ==========================================
    # SECTION 6: PHASE 5 – ARCHITECTURE AND DESIGN
    # ==========================================
    add_h1("6. Phase 5 – Architecture, Components, and Design Patterns")
    add_p("The platform is engineered using a Layered Hexagonal (Ports & Adapters) architectural style, decoupling network protocols and presentation layers from core threat validation logic, access control policies, and cryptographic services.")

    add_h2("6.1 Architectural Decomposition")
    add_placeholder_box(
        "DIAGRAM: LAYERED HEXAGONAL SOFTWARE & SECURITY ARCHITECTURE",
        "Illustrates Presentation Layer, Middleware Guard Layer, Application Domain Service Layer, and Infrastructure / Persistence Layer.",
        "Section 5"
    )

    add_h2("6.2 Component Responsibility Mapping")
    p5_comp = [
        ["Layer / Subsystem", "Primary Modules", "Core Responsibilities & Security Controls"],
        ["Presentation & Ingress", "Express.js, Helmet, RateLimiter", "Enforces CSP, frame blocking, CORS, and IP rate limits (authLimiter: 5 req/min, apiLimiter: 100 req/min)."],
        ["Security Middleware", "authGuard, rbacGuard, tlpGuard", "Verifies JWT HMAC signatures, checks role hierarchies, and executes explicit canAccessTLP policy checks."],
        ["IoC Validation Engine", "iocValidator (Strategy Pattern)", "Dispatches observables to specific validation algorithms; executes canonical defanging (e.g. [.] and hxxp://)."],
        ["Analyst Triage Subsystem", "triageController, reportController", "Coordinates vetting workflow, enforces mandatory justification text, and creates immutable review logs."],
        ["Threat Feed Subsystem", "feedController, stixFactory", "Filters approved observables server-side against requesting user clearance and serializes to OASIS STIX 2.1 bundles."],
        ["Cryptographic Audit", "auditService, auditController", "Manages the Tamper-Evident SHA-256 Hash-Chained Audit Log and provides runtime verification APIs."]
    ]
    add_table_data([Inches(1.5), Inches(2.2), Inches(2.6)], p5_comp[0], p5_comp[1:])

    add_h2("6.3 Design Patterns: Strategy Pattern for IoC Validation")
    add_p("To eliminate brittle monolithic regex routines and prevent catastrophic backtracking (ReDoS), IoC validation is implemented using the Gang of Four Strategy Pattern. An IoCValidatorService delegates incoming observable strings to concrete strategy implementations (IPv4Strategy, IPv6Strategy, DomainStrategy, HashStrategy) based on observable type. Each strategy encapsulates anchored, bounded regular expressions and performs type-specific canonical defanging, ensuring predictable execution latency (<10ms).")

    doc.add_page_break()

    # ==========================================
    # SECTION 7: PHASE 6 – USER INTERFACE DESIGN
    # ==========================================
    add_h1("7. Phase 6 – User Interface Design & Shneiderman's 8 Golden Rules")
    add_p("The CTI Sharing Platform user interface is implemented as a single-page cybersecurity operations console (src/public/index.html, styles.css, app.js) built using modern vanilla web standards (HTML5, CSS3 Grid/Flexbox, ES2022). It employs high-contrast dark-mode glassmorphism (backdrop-filter: blur(12px)) to reduce eye fatigue during extended SOC shifts while making security boundaries immediately visible.")

    add_h2("7.1 Screen 1: Secure Login + TOTP MFA Screen")
    add_p("Target User: All platform actors. User Goal: Authenticate credentials and verify second-factor device. Features a two-step dialog separating credential submission from TOTP entry, active 30s countdown timer, and one-click evaluator persona selectors.")
    add_placeholder_box(
        "INSERT ACTUAL APPLICATION SCREENSHOT: SCREEN 1 (SECURE LOGIN & TOTP MFA)",
        "Captures the high-contrast authentication gate, two-step dialog, TOTP countdown badge, and pre-seeded evaluator personas."
    )

    add_h2("7.2 Screen 2: IoC & Threat Report Ingestion Screen")
    add_p("Target User: Organization Contributor. User Goal: Ingest raw observables and qualitative reports. Features dynamic live canonical defanging preview updating on every keystroke, Strategy-pattern schema validation hints, and Stored-XSS sanitized Markdown incident form.")
    add_placeholder_box(
        "INSERT ACTUAL APPLICATION SCREENSHOT: SCREEN 2 (IOC & REPORT INGESTION)",
        "Captures observable input, live canonical defanging preview box (198[.]51[.]100[.]24), TLP selector, and markdown threat report form."
    )

    add_h2("7.3 Screen 3: Analyst Triage & TLP Classification Station")
    add_p("Target User: Security Analyst. User Goal: Review unclassified submissions and assign definitive TLP ratings. Features a real-time pending queue table, triage modal with 0–100 confidence slider, MITRE ATT&CK input, and mandatory justification validation.")
    add_placeholder_box(
        "INSERT ACTUAL APPLICATION SCREENSHOT: SCREEN 3 (ANALYST TRIAGE STATION)",
        "Captures pending queue table, confidence score slider, MITRE ATT&CK technique input, and mandatory justification review drawer."
    )

    add_h2("7.4 Screen 4: STIX 2.1 Threat Feed & Security Metrics Dashboard")
    add_p("Target User: Threat Consumer & Administrator. User Goal: Inspect machine-readable STIX bundles and monitor operational security. Features live STIX 2.1 JSON viewer with role-aware TLP filtering banner, live Prometheus metrics cards, and cryptographic audit-chain verification card.")
    add_placeholder_box(
        "INSERT ACTUAL APPLICATION SCREENSHOT: SCREEN 4 (STIX FEED & METRICS DASHBOARD)",
        "Captures live STIX 2.1 JSON bundle viewer, server-side TLP barrier banner, Prometheus operational metrics, and SHA-256 audit-chain verification card."
    )

    add_h2("7.5 Application of Shneiderman's 8 Golden Rules")
    p6_rules = [
        ["Rule #", "Golden Rule", "Concrete Implementation in CTI Sharing Platform UI"],
        ["1", "Strive for Consistency", "Uniform color semantics (Cyan = primary, Emerald = TLP:GREEN, Amber = TLP:AMBER, Ruby = TLP:RED). Consistent typography pairing Plus Jakarta Sans with JetBrains Mono."],
        ["2", "Enable Shortcuts", "One-click Pre-Seeded Personas (analyst_riya, contributor_alex, etc.) with automated in-browser WebCrypto RFC 6238 TOTP computation."],
        ["3", "Offer Informative Feedback", "Live synchronous canonical defanging preview on keystroke. Contextual banners explaining server-side TLP egress filtering on STIX feeds."],
        ["4", "Design Dialogs to Yield Closure", "Two-step authentication dialog terminating in signed JWT session chip. Triage drawer terminating in definitive approve/reject decision."],
        ["5", "Offer Simple Error Handling", "Client-side input constraints (6-digit TOTP pattern, >=5 char justification). Human-readable alert banners on 403 Forbidden or 429 Rate Limit."],
        ["6", "Permit Easy Reversal", "Back button on MFA prompt to re-enter master credentials. Analyst can dismiss triage drawer without modifying indicator state."],
        ["7", "Support Internal Locus of Control", "Analysts actively manipulate confidence sliders and select TLP ratings rather than relying on automated black-box scoring."],
        ["8", "Reduce Short-Term Memory Load", "Triage modal echoes target observable, type, and submitter org at top of dialog. STIX viewer formats JSON directly in-page."]
    ]
    add_table_data([Inches(0.6), Inches(1.8), Inches(3.9)], p6_rules[0], p6_rules[1:])

    doc.add_page_break()

    # ==========================================
    # SECTION 8: PHASE 7 – THREAT MODELING & STRIDE
    # ==========================================
    add_h1("8. Phase 7 – Threat Modeling, STRIDE & Vulnerability Analysis")
    add_p("Phase 7 establishes the authoritative baseline threat model for the CTI Sharing Platform, analyzing 9 primary assets, evaluating 10 STRIDE threats across critical information flows, and classifying concrete vulnerabilities with associated CWE identifiers and defensive controls.")

    add_h2("8.1 Authoritative Asset Inventory and CIA Classification (9 Assets)")
    p7_assets = [
        ["ID", "Asset Description", "Confidentiality", "Integrity", "Availability", "CIA Justification"],
        ["A01", "User Credentials", "High", "High", "Medium", "Master passwords; compromise enables unauthorized account takeover."],
        ["A02", "TOTP MFA Secrets", "High", "High", "Medium", "RFC 6238 Base32 seeds; compromise permits MFA bypass."],
        ["A03", "JWT Access Tokens", "High", "High", "Medium", "Signed bearer tokens; theft permits session hijacking without credentials."],
        ["A04", "Threat Indicators / IoCs", "Medium", "High", "High", "Network observables; tampering injects false indicators, blinding defenses."],
        ["A05", "Threat Reports", "High", "High", "High", "Incident dossiers; tampering injects malicious scripts or misleads response."],
        ["A06", "TLP Classification Metadata", "High", "High", "High", "Handling rating; tampering leaks confidential TLP:RED intelligence."],
        ["A07", "Audit Logs", "High", "High", "Medium", "Forensic records; tampering conceals rogue activity or destroys evidence."],
        ["A08", "STIX 2.1 Threat Feed", "High", "High", "High", "Automated egress feed; corruption disrupts automated firewall blocking."],
        ["A09", "Organization & User Data", "High", "High", "Medium", "Tenant profiles; tampering allows rogue orgs access to restricted pools."]
    ]
    add_table_data([Inches(0.6), Inches(1.8), Inches(1.0), Inches(0.9), Inches(0.9), Inches(1.1)], p7_assets[0], p7_assets[1:])

    add_h2("8.2 STRIDE Threat Analysis Matrix (10 Implemented Threats)")
    p7_threats = [
        ["ID", "STRIDE", "Threat Description", "Asset", "Impact", "Mitigation Control", "Vulnerability"],
        ["T01", "Spoofing", "Attacker uses stolen credentials to impersonate contributor/analyst", "A01", "High", "Bcrypt + TOTP MFA + 5 req/min rate limit", "Credential compromise"],
        ["T02", "Tampering", "Attacker modifies an IoC during submission", "A04", "High", "Strategy validation + canonical defanging + audit log", "Input integrity failure"],
        ["T03", "Repudiation", "User denies performing a sensitive action", "A07", "Medium", "Tamper-Evident SHA-256 Hash-Chained Audit Log", "Insufficient audit evidence"],
        ["T04", "Information Disclosure", "Unauthorized user accesses TLP:RED intelligence", "A06/A04", "Critical", "canAccessTLP() policy + server-side feed filtering", "Broken access control / IDOR"],
        ["T05", "Denial of Service", "Excessive authentication/API requests exhaust resources", "A08", "High", "Tiered rate limiting + 100kb request body limit", "Resource exhaustion"],
        ["T06", "Elevation of Privilege", "Contributor attempts analyst/admin-only triage operations", "A09", "Critical", "RBAC middleware (rbacGuard) + HTTP 403 enforcement", "Broken role authorization"],
        ["T07", "Tampering", "Malicious Markdown/script content in threat report", "A05", "High", "Server-side HTML sanitization stripping raw scripts", "Stored XSS"],
        ["T08", "Information Disclosure", "STIX feed exposes intelligence beyond user clearance", "A08/A06", "Critical", "Server-side TLP filtering before STIX serialization", "TLP filtering failure"],
        ["T09", "Denial of Service", "Adversarial input causes excessive regex processing", "A04", "High", "Anchored non-backtracking validation regex (<253 chars)", "ReDoS"],
        ["T10", "Tampering", "Analyst changes classification without justification", "A06", "High", "Mandatory justification (>=5 chars) + review log", "Audit validation failure"]
    ]
    add_table_data([Inches(0.5), Inches(1.1), Inches(1.7), Inches(0.5), Inches(0.7), Inches(1.1), Inches(0.7)], p7_threats[0], p7_threats[1:])

    add_h2("8.3 Critical Information Flows and Trust Boundaries")
    add_p("The platform isolates threat processing into three sensitive information flows crossing Trust Boundary 1 (TB1):")
    add_bullet(" IF-01 (IoC Submission): Organization Contributor -> HTTPS (TLS 1.3) -> [TB1: API Boundary] -> Authentication + RBAC -> IoC Validation / Defanging -> SQLite Database -> Audit Hash Chain.", bold_prefix="•")
    add_bullet(" IF-02 (Analyst Triage): Security Analyst -> HTTPS + Signed JWT -> [TB1: API Boundary] -> RBAC -> Triage Service -> Review Log / TLP Classification / Audit Log.", bold_prefix="•")
    add_bullet(" IF-03 (Threat Feed Egress): Threat Consumer / SIEM -> HTTPS + JWT -> [TB1: API Boundary] -> TLP Authorization (canAccessTLP) -> Approved Intelligence -> Server-Side TLP Filtering -> OASIS STIX 2.1 Serialization -> Consumer.", bold_prefix="•")

    add_h2("8.4 Concrete Vulnerability Analysis")
    p7_vulns = [
        ["ID", "Vulnerability", "CWE", "Related Threat", "Implemented Mitigation Control"],
        ["V01", "Credential compromise", "CWE-798", "T01", "Salted Bcrypt (10 rounds) + RFC 6238 TOTP MFA + 5 req/min rate limiter."],
        ["V02", "Broken access control / IDOR", "CWE-639", "T04, T08", "Object-level authorization (user.org_id === report.org_id) and centralized canAccessTLP()."],
        ["V03", "Broken role authorization", "CWE-862", "T06", "Express RBAC middleware (rbacGuard) returning HTTP 403 Forbidden."],
        ["V04", "Stored Cross-Site Scripting (XSS)", "CWE-79", "T07", "Server-side regex sanitization stripping raw <script> tags and event attributes."],
        ["V05", "Resource exhaustion / ReDoS", "CWE-1333", "T05, T09", "Anchored, bounded regular expressions (<253 chars) + 100kb payload ceiling."],
        ["V06", "Insufficient audit protection", "CWE-778", "T03, T10", "Cryptographic SHA-256 continuous hash-chained audit logging with offline verification routine."]
    ]
    add_table_data([Inches(0.6), Inches(1.8), Inches(0.9), Inches(1.0), Inches(2.0)], p7_vulns[0], p7_vulns[1:])

    add_h2("8.5 Threat Model and Security Data-Flow Diagram")
    add_placeholder_box(
        "DIAGRAM: PHASE 7 STRIDE THREAT MODEL & SECURITY DFD",
        "Depicts system processes overlayed with red STRIDE threat callouts and corresponding green security controls.",
        "Section 6"
    )

    doc.add_page_break()

    # ==========================================
    # SECTION 9: PHASE 8 – ATTACK TREE
    # ==========================================
    add_h1("9. Phase 8 – Attack Tree Decomposition & Security Architecture Refinement")
    add_p("Phase 8 models adversary behavior against the primary critical asset using a formal hierarchical Attack Tree with strict AND/OR decomposition logic, derived directly from the authoritative Phase 7 threat model.")

    add_h2("9.1 Critical Attacker Goal")
    add_p("Primary Critical Attacker Goal: Exfiltrate Confidential TLP:RED Threat Intelligence", bold_prefix="ROOT GOAL: ")
    add_p("TLP:RED intelligence contains proprietary victim attribution, unredacted corporate infrastructure telemetry, and active zero-day exploit details. An adversary seeking this intelligence must either compromise a privileged analyst identity or exploit API access control flaws.")

    add_h2("9.2 Attack Tree Decomposition (AND / OR Logic)")
    add_code_block("""ROOT: Exfiltrate Confidential TLP:RED Threat Intelligence
│
├── [OR] Branch A: Compromise Analyst Account
│   │
│   └── [AND] Credential Hijack & MFA/Session Bypass
│       ├── [Leaf A1] Credential Compromise (Brute-Force / Credential Stuffing)
│       └── [Leaf A2] Session / MFA Weakness (TOTP Bypass / Session Hijacking)
│
└── [OR] Branch B: Exploit CTI API Access
    │
    ├── [Leaf B1] Broken Object-Level Authorization / IDOR (Direct report UUID query)
    ├── [Leaf B2] Broken TLP Authorization (Bypassing TLP rating check on indicators)
    └── [Leaf B3] Unauthorized STIX Feed Access (Egress scraping of classified feeds)""")

    add_h2("9.3 Attack Path, STRIDE Threat, Vulnerability, and Control Mapping")
    p8_mapping = [
        ["Attack Path & Leaf", "Target Asset", "STRIDE", "Vulnerability", "Preventive Control", "Detective Control"],
        ["Branch A -> Leaf A1: Credential Compromise", "A01", "T01 (Spoofing)", "V01 (CWE-798)", "Salted Bcrypt (10 rounds) + 5 req/min rate limit", "Audit log AUTH_LOGIN_FAILED; cti_failed_logins_total counter"],
        ["Branch A -> Leaf A2: Session / MFA Weakness", "A02, A03", "T01 (Spoofing)", "V01 (CWE-798)", "RFC 6238 TOTP single-use code + 5m temp token", "Audit log AUTH_MFA_FAILED; account lockout threshold"],
        ["Branch B -> Leaf B1: Broken Object Auth (IDOR)", "A05", "T04 (Disclosure)", "V02 (CWE-639)", "Strict ownership check: user.org_id === report.org_id", "Audit log 403 Forbidden on report access denial; SIEM alert"],
        ["Branch B -> Leaf B2: Broken TLP Authorization", "A06", "T04 (Disclosure)", "V02 (CWE-639)", "Centralized canAccessTLP() policy function in tlpGuard.js", "Audit log records user UUID and target indicator ID on 403"],
        ["Branch B -> Leaf B3: Unauthorized STIX Feed Access", "A08", "T08 (Disclosure)", "V02 (CWE-639)", "Server-side TLP egress filtering before STIX serialization", "Prometheus feed count metric; audit records filtered count"]
    ]
    add_table_data([Inches(1.5), Inches(0.6), Inches(0.9), Inches(0.9), Inches(1.2), Inches(1.2)], p8_mapping[0], p8_mapping[1:])

    add_h2("9.4 Security Architecture Refinement")
    add_p("Based on the attack tree analysis, the platform architecture incorporates nine synchronized defensive controls:")
    add_bullet(" Mandatory RFC 6238 TOTP MFA: Two-step authentication dialog; full tokens require valid HMAC-SHA1 TOTP verification.", bold_prefix="1.")
    add_bullet(" Work-Factor 10 Bcrypt Hashing: Master credentials salted with 10 rounds, defeating offline dictionary attacks.", bold_prefix="2.")
    add_bullet(" Cryptographically Signed JWTs: HMAC-SHA256 signatures with 1-hour expiration validated by authGuard.js.", bold_prefix="3.")
    add_bullet(" Role-Based Access Control: rbacGuard.js enforces role boundaries, returning HTTP 403 on violations.", bold_prefix="4.")
    add_bullet(" Object-Level Authorization: Report endpoints verify tenant ownership (user.org_id === report.org_id), eliminating IDOR.", bold_prefix="5.")
    add_bullet(" Centralized canAccessTLP Policy: In-memory Attribute-Based Access Control strictly denying consumers TLP:RED intelligence.", bold_prefix="6.")
    add_bullet(" Server-Side TLP Egress Filtering: Strips TLP:RED objects prior to STIX 2.1 serialization.", bold_prefix="7.")
    add_bullet(" Tiered Rate Limiting & Body Caps: authLimiter (5 req/min), apiLimiter (100 req/min), and 100kb payload ceiling prevent DoS.", bold_prefix="8.")
    add_bullet(" Tamper-Evident SHA-256 Audit Log: Continuous cryptographic hash chaining provides tamper-evident integrity verification.", bold_prefix="9.")

    add_h2("9.5 Attack Tree Diagram Reference")
    add_placeholder_box(
        "DIAGRAM: PHASE 8 ATTACK TREE – EXFILTRATE CONFIDENTIAL TLP:RED INTELLIGENCE",
        "Hierarchical attack tree with formal AND/OR gates and leaf annotations mapping to Phase 7 STRIDE threats, vulnerabilities, and security controls.",
        "Section 7"
    )

    doc.add_page_break()

    # ==========================================
    # SECTION 10: PHASE 9 – PRODUCT BACKLOG AND JIRA
    # ==========================================
    add_h1("10. Phase 9 – Product Backlog and Jira")
    add_p("The project backlog was organized in Jira using standard Scrum principles. Work was structured across five Epics into 10 user stories totaling 44 Story Points (SP), planned across two 2-week sprints.")

    add_h2("10.1 Product Backlog & Actual Jira Issue Keys")
    p9_stories = [
        ["Logical ID", "Actual Jira Key", "Epic", "User Story Summary", "Priority", "SP", "Sprint", "Acceptance Criteria Summary"],
        ["CTI-101", "CTI-1", "EP01: Identity", "User Authentication & TOTP MFA", "Highest", "5 SP", "Sprint 1", "Bcrypt 10 rounds; RFC 6238 TOTP; signed 1h JWT access token."],
        ["CTI-102", "CTI-2", "EP01: Identity", "RBAC Authorization Enforcement", "Highest", "3 SP", "Sprint 1", "Role hierarchy enforced; unauthorized queries return 403 Forbidden."],
        ["CTI-103", "CTI-5", "EP02: Ingestion", "IoC Ingestion API & Deduplication", "Highest", "5 SP", "Sprint 1", "Accepts IPv4/6, FQDN, Hashes; executes deduplication; stores as PENDING."],
        ["CTI-104", "CTI-6", "EP02: Ingestion", "IoC Validation & Canonical Defanging", "Highest", "5 SP", "Sprint 1", "Strategy Pattern validation; ReDoS-resistant regex; auto-defangs [.] and hxxp://."],
        ["CTI-105", "CTI-7", "EP02: Ingestion", "Structured Threat Report Submission", "High", "5 SP", "Sprint 1", "Accepts Markdown; sanitizes Stored XSS vectors; relational IoC linking."],
        ["CTI-106", "CTI-8", "EP03: Triage", "Analyst Triage Station & Review Logs", "Highest", "5 SP", "Sprint 2", "Vetting queue lists PENDING; mandatory justification; immutable review_logs."],
        ["CTI-107", "CTI-9", "EP03: Triage", "TLP Classification & canAccessTLP Policy", "Highest", "5 SP", "Sprint 2", "Explicit canAccessTLP policy; TLP:RED restricted to org and analysts; 403 on breach."],
        ["CTI-108", "CTI-10", "EP04: Feeds", "OASIS STIX 2.1 Feed Distribution", "High", "3 SP", "Sprint 2", "Valid STIX 2.1 JSON bundle; server-side TLP filtering; MITRE ATT&CK tags."],
        ["CTI-109", "CTI-11", "EP05: Audit", "Tamper-Evident SHA-256 Audit Trail", "High", "5 SP", "Sprint 2", "Continuous SHA-256 chaining to Genesis; verification routine flags tampered rows."],
        ["CTI-110", "CTI-12", "EP05: Audit", "Prometheus Security Metrics & Monitoring", "Medium", "3 SP", "Sprint 2", "Exposes Prometheus /metrics; tracks HTTP requests, failed logins, queue depth."]
    ]
    add_table_data([Inches(0.6), Inches(0.6), Inches(0.9), Inches(1.5), Inches(0.6), Inches(0.4), Inches(0.5), Inches(1.2)], p9_stories[0], p9_stories[1:])

    add_h2("10.2 Sprint Planning & Execution Breakdown")
    add_bullet(" Sprint 1 (23 Story Points): Focused on core identity, relational persistence, and ingestion. Delivered CTI-101, CTI-102, CTI-103, CTI-104, CTI-105 with 30 passing automated tests.", bold_prefix="•")
    add_bullet(" Sprint 2 (21 Story Points): Focused on analyst workflows, information barriers, feed egress, and audit integrity. Delivered CTI-106, CTI-107, CTI-108, CTI-109, CTI-110 with 23 passing automated tests.", bold_prefix="•")

    add_h2("10.3 Jira Backlog & Board Evidence")
    add_placeholder_box(
        "INSERT ACTUAL JIRA SCREENSHOT: PRODUCT BACKLOG & SPRINT PLANNING",
        "Captures the active Jira Scrum backlog showing Epics EP01–EP05, user stories CTI-1 through CTI-12, story points, and sprint allocations."
    )

    doc.add_page_break()

    # ==========================================
    # SECTION 11: PHASE 10 – SCRUM EXECUTION & METRICS
    # ==========================================
    add_h1("11. Phase 10 – Scrum Execution, Burndown & Velocity Metrics")
    add_p("Scrum execution was measured using empirical agile metrics. All 10 user stories progressed through the four-state workflow: TODO -> IN PROGRESS -> TESTING -> DONE.")

    add_h2("11.1 Daily Scrum Records (Sample Operational Standups)")
    add_bullet(" Sprint 1, Day 3: Completed Bcrypt password salting and RFC 6238 TOTP generation. Identified need for clock drift tolerance (+/-30s) to accommodate mobile authenticators. Next: Build authGuard JWT verification middleware.", bold_prefix="Standup 1: ")
    add_bullet(" Sprint 1, Day 7: Implemented Strategy Pattern IoC validator. Overcame ReDoS risk by replacing unanchored regex with bounded, non-backtracking patterns (<253 chars). Next: Threat report Markdown Stored-XSS sanitizer.", bold_prefix="Standup 2: ")
    add_bullet(" Sprint 2, Day 4: Implemented canAccessTLP authorization policy function. Resolved edge case where consumers from the submitting org were mistakenly denied TLP:AMBER. Next: Server-side STIX 2.1 egress filtering.", bold_prefix="Standup 3: ")
    add_bullet(" Sprint 2, Day 8: Integrated Tamper-Evident SHA-256 Hash-Chained Audit Log. Resolved async concurrency issue using in-process Promise serialization queue. Next: Prometheus metrics and verification API.", bold_prefix="Standup 4: ")

    add_h2("11.2 Sprint Burndown Data & Chart Table")
    p10_burndown = [
        ["Sprint Day", "Ideal Remaining (SP)", "Sprint 1 Actual (SP)", "Sprint 2 Actual (SP)", "Operational Milestone Completed"],
        ["Day 1", "23.0 SP / 21.0 SP", "23 SP Remaining", "21 SP Remaining", "Sprint Planning & Task Breakdown finalized."],
        ["Day 3", "18.4 SP / 16.8 SP", "18 SP Remaining", "16 SP Remaining", "Auth & RBAC (CTI-1, CTI-2) completed; Triage Queue (CTI-8) in progress."],
        ["Day 5", "13.8 SP / 12.6 SP", "13 SP Remaining", "11 SP Remaining", "IoC Ingestion API (CTI-5) completed; canAccessTLP policy (CTI-9) done."],
        ["Day 7", "9.2 SP / 8.4 SP", "8 SP Remaining", "8 SP Remaining", "Validation Strategy (CTI-6) completed; STIX 2.1 Factory (CTI-10) done."],
        ["Day 9", "4.6 SP / 4.2 SP", "5 SP Remaining", "3 SP Remaining", "Threat Reports (CTI-7) completed; Audit Hash Chain (CTI-11) verified."],
        ["Day 10", "0.0 SP / 0.0 SP", "0 SP (100% DONE)", "0 SP (100% DONE)", "Sprint Review & Demo: 53 automated tests passing; 0 defects."]
    ]
    add_table_data([Inches(0.9), Inches(1.3), Inches(1.2), Inches(1.2), Inches(1.7)], p10_burndown[0], p10_burndown[1:])

    add_h2("11.3 Velocity and Defect Metrics")
    add_bullet(" Total Committed Velocity: 44 Story Points (Sprint 1: 23 SP, Sprint 2: 21 SP).", bold_prefix="•")
    add_bullet(" Total Completed Velocity: 44 Story Points (100% completion rate across both sprints).", bold_prefix="•")
    add_bullet(" Average Velocity: 22.0 Story Points per sprint.", bold_prefix="•")
    add_bullet(" Carried-Over Defects: Zero (0) defects carried over between sprints.", bold_prefix="•")
    add_bullet(" Production Critical Defects: Zero (0) critical security defects.", bold_prefix="•")

    add_h2("11.4 Sprint Retrospective Summary")
    add_bullet(" What Went Well: Early adoption of TDD resulted in 53 automated tests passing cleanly; Strategy Pattern made IoC validation modular; explicit canAccessTLP policy prevented access control ambiguities.", bold_prefix="•")
    add_bullet(" What Could Be Improved: Initial regex patterns required benchmarking to guarantee ReDoS resilience; async hash-chaining needed serialization to handle concurrent traffic.", bold_prefix="•")
    add_bullet(" Action Items: Maintain Promise serialization for audit logs; enforce automated linting and fuzz testing in CI/CD pipeline.", bold_prefix="•")

    add_h2("11.5 Jira Scrum Board & Burndown Evidence")
    add_placeholder_box(
        "INSERT ACTUAL JIRA METRIC SCREENSHOT: SPRINT BURNDOWN & VELOCITY CHART",
        "Captures the completed Jira Scrum board (all stories in DONE column) and the actual Sprint Burndown showing 0 remaining SP."
    )

    doc.add_page_break()

    # ==========================================
    # SECTION 12: TRACEABILITY MATRIX
    # ==========================================
    add_h1("12. Unified End-to-End Traceability Matrix")
    add_p("The Traceability Matrix establishes an unbroken, bidirectional verification chain across all ten phases, proving that every high-level security requirement maps through design, threat modeling, sprint planning, source code implementation, automated testing, and runtime hardening.")

    add_h2("12.1 Unified 11-Stage Traceability Thread (TLP Information Barrier)")
    p12_thread = [
        ["Stage", "Artifact Level", "Traceable Element ID", "Concrete Specification in CTI Sharing Platform"],
        ["1", "Requirement", "REQ-SEC-04", "Traffic Light Protocol (TLP) Enforcement: Restricts intelligence egress by TLP rating and org provenance."],
        ["2", "Use Case", "UC-02", "Review & Classify Threat Intelligence: Analyst reviews raw indicators and applies TLP classification."],
        ["3", "Asset", "A06 / A05", "TLP Classification Metadata & Threat Reports: Confidentiality: High; strictly protected against unauthorized disclosure."],
        ["4", "DFD Flow", "IF-03 / Process 3.0", "Threat Feed Egress Flow: Data flow barrier intercepting between database and threat consumers."],
        ["5", "STRIDE Threat", "T04 / T08", "Information Disclosure: External adversary or unvetted consumer queries API to harvest TLP:RED intelligence."],
        ["6", "Vulnerability", "V02 (CWE-639)", "Broken Access Control / TLP Failure: Feed endpoints omitting server-side clearance validation."],
        ["7", "Attack Tree", "Branch B -> Leaf B2", "Exfiltrate TLP:RED -> Exploit API Access -> Broken TLP Authorization."],
        ["8", "Jira Story", "CTI-107 (CTI-9)", "TLP Classification & Access Control: Story in Sprint 2 (5 SP, Highest Priority, Status: DONE)."],
        ["9", "Implementation", "src/middleware/tlpGuard.js", "Centralized explicit canAccessTLP(user, tlpLevel, resourceOrgId) policy function."],
        ["10", "Automated Test", "tests/integration/tlpAccess.test.js", "Integration test asserting HTTP 403 Forbidden and omission of TLP:RED records from consumer feed."],
        ["11", "Deployment Control", "k8s/deployment.yaml", "Hardened container: readOnlyRootFilesystem: true, runAsNonRoot UID 10001, drop ALL Linux capabilities."]
    ]
    add_table_data([Inches(0.6), Inches(1.3), Inches(1.8), Inches(2.6)], p12_thread[0], p12_thread[1:])

    add_h2("12.2 Multi-Requirement Traceability Summary Table (All 9 Authoritative Assets)")
    p12_matrix = [
        ["Req ID", "Domain", "Use Case", "Asset ID", "DFD Flow", "STRIDE ID", "Vuln ID", "Jira Story", "Code Module", "Test Suite"],
        ["REQ-SEC-01", "Auth & MFA", "UC-05", "A01, A02", "IF-01", "T01", "V01 (CWE-798)", "CTI-101 (CTI-1)", "src/controllers/authController.js", "tests/unit/auth.test.js"],
        ["REQ-SEC-02", "RBAC Access", "UC-02", "A09", "IF-02", "T06", "V03 (CWE-862)", "CTI-102 (CTI-2)", "src/middleware/rbacGuard.js", "tests/integration/rbac.test.js"],
        ["REQ-SEC-03", "Defanging", "UC-01", "A04", "IF-01", "T02", "V05 (CWE-1333)", "CTI-104 (CTI-6)", "src/services/iocValidator.js", "tests/unit/validator.test.js"],
        ["REQ-SEC-04", "TLP Barrier", "UC-02", "A06", "IF-03", "T04", "V02 (CWE-639)", "CTI-107 (CTI-9)", "src/middleware/tlpGuard.js", "tests/integration/tlpAccess.test.js"],
        ["REQ-SEC-05", "STIX Feed", "UC-03", "A08", "IF-03", "T08", "V02 (CWE-639)", "CTI-108 (CTI-10)", "src/services/stixFactory.js", "tests/integration/feed.test.js"],
        ["REQ-SEC-06", "JWT Integrity", "UC-05", "A03", "IF-01", "T01", "V01 (CWE-798)", "CTI-101 (CTI-1)", "src/middleware/authGuard.js", "tests/unit/auth.test.js"],
        ["REQ-SEC-07", "Audit Trail", "UC-04", "A07", "IF-01,02", "T03", "V06 (CWE-778)", "CTI-109 (CTI-11)", "src/services/auditService.js", "tests/unit/auditChain.test.js"],
        ["REQ-SEC-08", "Incident XSS", "UC-02", "A05", "IF-01", "T07", "V04 (CWE-79)", "CTI-105 (CTI-7)", "src/controllers/reportController.js", "tests/integration/iocReportApi.test.js"],
        ["REQ-SEC-09", "Analyst Triage", "UC-02", "A06", "IF-02", "T10", "V06 (CWE-778)", "CTI-106 (CTI-8)", "src/controllers/triageController.js", "tests/integration/triageFeedApi.test.js"]
    ]
    add_table_data([Inches(0.6), Inches(0.7), Inches(0.5), Inches(0.6), Inches(0.5), Inches(0.4), Inches(0.7), Inches(0.7), Inches(1.1), Inches(0.8)], p12_matrix[0], p12_matrix[1:])

    # Save Document
    primary_filename = "CTI_Sharing_Platform_Phase_01_to_10.docx"
    updated_filename = "CTI_Sharing_Platform_Phase_01_to_10_Updated.docx"
    
    # Save the updated high-contrast version
    doc.save(updated_filename)
    print(f"Successfully generated updated high-contrast document: {updated_filename} ({os.path.getsize(updated_filename)} bytes)")

    try:
        doc.save(primary_filename)
        print(f"Successfully updated primary document: {primary_filename} ({os.path.getsize(primary_filename)} bytes)")
    except PermissionError:
        print(f"Notice: '{primary_filename}' is currently held open in Microsoft Word by the user.")
        print(f"The new high-contrast document with Dark Navy (#0B1F3A) and Dark Blue (#17365D) theme is saved and ready at:")
        print(f"  -> {os.path.abspath(updated_filename)}")

if __name__ == '__main__':
    create_document()
