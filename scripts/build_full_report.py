#!/usr/bin/env python3
"""
build_full_report.py
Generates the comprehensive CTI_Sharing_Platform_FINAL_Exam_Report.docx covering all 16 phases.
"""

import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

BLACK = RGBColor(0x00, 0x00, 0x00)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def set_run_black(run, font_name="Calibri", font_size_pt=10.5, bold=False, italic=False):
    run.font.name = font_name
    run.font.size = Pt(font_size_pt)
    run.font.color.rgb = BLACK
    run.bold = bold
    run.italic = italic

def format_paragraph(p, space_before=2, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.LEFT):
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=18, space_after=6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_run_black(run, font_name="Calibri", font_size_pt=15, bold=True)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=13, space_after=4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_run_black(run, font_name="Calibri", font_size_pt=12.5, bold=True)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=9, space_after=3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_run_black(run, font_name="Calibri", font_size_pt=11, bold=True)
    return p

def add_body_p(doc, text, bold_prefix=None, space_after=4):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=0, space_after=space_after)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        set_run_black(r_pre, font_size_pt=10.5, bold=True)
    r_body = p.add_run(text)
    set_run_black(r_body, font_size_pt=10.5)
    return p

def add_bullet_p(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    format_paragraph(p, space_before=0, space_after=2)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        set_run_black(r_pre, font_size_pt=10.5, bold=True)
    r_body = p.add_run(text)
    set_run_black(r_body, font_size_pt=10.5)
    return p

def add_code_block(doc, code_text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=4, space_after=6, line_spacing=1.0)
    p.paragraph_format.left_indent = Inches(0.2)
    
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(r'<w:pBdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                     r'<w:left w:val="single" w:sz="18" w:space="8" w:color="000000"/>'
                     r'</w:pBdr>')
    pPr.append(pBdr)
    shd = parse_xml(r'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="F4F5F7"/>')
    pPr.append(shd)

    run = p.add_run(code_text)
    set_run_black(run, font_name="Consolas", font_size_pt=8.5)
    return p

def set_cell_border(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        r'<w:tcBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:top w:val="single" w:sz="4" w:space="0" w:color="D3D3D3"/>'
        r'<w:left w:val="single" w:sz="4" w:space="0" w:color="D3D3D3"/>'
        r'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D3D3D3"/>'
        r'<w:right w:val="single" w:sz="4" w:space="0" w:color="D3D3D3"/>'
        r'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

def create_styled_table(doc, headers, rows_data, col_widths=None):
    tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

    tblPr = tbl._tbl.tblPr
    tblBorders = parse_xml(
        r'<w:tblBorders xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        r'<w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>'
        r'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
        r'<w:left w:val="none"/>'
        r'<w:right w:val="none"/>'
        r'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E0E0E0"/>'
        r'<w:insideV w:val="none"/>'
        r'</w:tblBorders>'
    )
    tblPr.append(tblBorders)

    # Header Row
    hdr_row = tbl.rows[0]
    hdr_tr = hdr_row._tr.get_or_add_trPr()
    hdr_tr.append(parse_xml(r'<w:tblHeader xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))
    hdr_tr.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

    for col_idx, h_text in enumerate(headers):
        cell = hdr_row.cells[col_idx]
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        shd = parse_xml(r'<w:shd xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:fill="EEEEEE"/>')
        cell._tc.get_or_add_tcPr().append(shd)
        set_cell_border(cell)
        p = cell.paragraphs[0]
        format_paragraph(p, space_before=4, space_after=4)
        run = p.add_run(h_text)
        set_run_black(run, font_name="Calibri", font_size_pt=9.0, bold=True)
        if col_widths and col_idx < len(col_widths):
            cell.width = Inches(col_widths[col_idx])

    # Data Rows
    for r_idx, r_data in enumerate(rows_data):
        row = tbl.rows[r_idx + 1]
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(r'<w:cantSplit xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'))

        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_border(cell)
            p = cell.paragraphs[0]
            format_paragraph(p, space_before=3, space_after=3)
            run = p.add_run(str(val))
            set_run_black(run, font_name="Calibri", font_size_pt=8.5)
            if col_widths and c_idx < len(col_widths):
                cell.width = Inches(col_widths[c_idx])

    p_spacer = doc.add_paragraph()
    format_paragraph(p_spacer, space_before=0, space_after=3)

def add_figure(doc, img_rel_path, caption_text, width_inches=6.0):
    full_path = os.path.join(BASE_DIR, img_rel_path)
    if os.path.exists(full_path):
        p_img = doc.add_paragraph()
        format_paragraph(p_img, space_before=6, space_after=3, align=WD_ALIGN_PARAGRAPH.CENTER)
        p_img.paragraph_format.keep_with_next = True
        run_img = p_img.add_run()
        run_img.add_picture(full_path, width=Inches(width_inches))
        
        p_cap = doc.add_paragraph()
        format_paragraph(p_cap, space_before=2, space_after=8, align=WD_ALIGN_PARAGRAPH.CENTER)
        run_cap = p_cap.add_run(caption_text)
        set_run_black(run_cap, font_size_pt=8.5, italic=True)
    else:
        add_body_p(doc, f"[Figure Not Found: {img_rel_path}]", bold_prefix="[DIAGRAM] ")

def add_phase_tools_table(doc, phase_num, tools_list):
    add_heading_3(doc, f"Tools Used in Phase {phase_num}")
    headers = ["Tool / Technology", "Specific Purpose & Contribution in Phase " + str(phase_num)]
    create_styled_table(doc, headers, tools_list, [2.2, 4.3])

print("[*] build_full_report helper module ready.")
