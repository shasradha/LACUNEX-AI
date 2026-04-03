"""
Ephemeral export service for LACUNEX AI.
Generates .pdf, .docx, and .xlsx files in-memory.
No data is stored or logged.
"""

import io
import re
from datetime import datetime

BRAND_FOOTER = "\u00a9 Generated from Lacunex AI by Shasradha Karmakar"


def _ts() -> str:
    return datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")


def _clean(text: str) -> str:
    """Normalize line endings and remove null bytes."""
    return text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n") if text else ""


def _pdf_safe(text: str) -> str:
    """
    Convert text to ASCII-safe string for FPDF Helvetica (Latin-1 font).
    Maps common Unicode chars to ASCII equivalents, drops the rest.
    """
    replacements = {
        "\u2018": "'", "\u2019": "'",          # smart single quotes
        "\u201c": '"', "\u201d": '"',          # smart double quotes
        "\u2013": "-", "\u2014": "--",         # en-dash, em-dash
        "\u2022": "*", "\u00b7": "*",          # bullet
        "\u2026": "...",                       # ellipsis
        "\u00a9": "(c)", "\u00ae": "(R)",      # copyright, registered
        "\u00b0": "deg", "\u00b1": "+/-",      # degree, plus-minus
        "\u00d7": "x", "\u00f7": "/",          # multiply, divide
        "\u2212": "-", "\u00ac": "not",        # minus sign, not
        "\u2260": "!=", "\u2264": "<=",        # not-equal, leq
        "\u2265": ">=", "\u221e": "inf",       # geq, infinity
        "\u03b1": "alpha", "\u03b2": "beta",   # Greek letters
        "\u03c0": "pi", "\u03bb": "lambda",
        "\u2192": "->", "\u2190": "<-",        # arrows
        "\u2713": "OK", "\u2717": "X",         # check, cross
    }
    out = []
    for ch in text:
        if ch in replacements:
            out.append(replacements[ch])
            continue
        try:
            ch.encode("latin-1")
            out.append(ch)
        except (UnicodeEncodeError, UnicodeDecodeError):
            out.append("?")
    return "".join(out)


_MD_BOLD = re.compile(r"\*{2,3}(.+?)\*{2,3}", re.DOTALL)
_MD_ITALIC = re.compile(r"\*(.+?)\*", re.DOTALL)
_MD_CODE_INLINE = re.compile(r"`([^`]+)`")
_MD_LINK = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MD_HEADING = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_MD_HR = re.compile(r"^[-*_]{3,}$")


def _strip_md(text: str) -> str:
    """
    Fully strip markdown to produce clean plain text.
    Processes line-by-line for accuracy.
    """
    lines = []
    for line in text.split("\n"):
        # Headings
        line = re.sub(r"^#{1,6}\s+", "", line)
        # Bold/italic markers
        line = _MD_BOLD.sub(r"\1", line)
        line = _MD_ITALIC.sub(r"\1", line)
        # Inline code
        line = _MD_CODE_INLINE.sub(r"\1", line)
        # Links
        line = _MD_LINK.sub(r"\1", line)
        # HR → blank
        if _MD_HR.match(line.strip()):
            line = ""
        # Numbered / unordered lists → keep text cleanly
        line = re.sub(r"^(\s*)[-*]\s+", r"\1", line)
        line = re.sub(r"^(\s*)\d+\.\s+", r"\1", line)
        lines.append(line)
    return "\n".join(lines)


def _parse_blocks(content: str):
    """
    Parse content into a list of block dicts:
      { type: heading|bullet|text|code|blank|hr, level: int, text: str, lines: [...] }
    """
    blocks = []
    lines = content.split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i]
        stripped = ln.strip()

        # Code fence
        if stripped.startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            blocks.append({"type": "code", "lines": code_lines})
            i += 1
            continue

        # Blank
        if not stripped:
            blocks.append({"type": "blank"})
            i += 1
            continue

        # HR
        if _MD_HR.match(stripped):
            blocks.append({"type": "hr"})
            i += 1
            continue

        # Heading
        m = re.match(r"^(#{1,4})\s+(.*)", stripped)
        if m:
            blocks.append({"type": "heading", "level": len(m.group(1)), "text": m.group(2).strip()})
            i += 1
            continue

        # Bullet (unordered)
        m = re.match(r"^[-*]\s+(.*)", stripped)
        if m:
            blocks.append({"type": "bullet", "text": m.group(1).strip()})
            i += 1
            continue

        # Numbered list
        m = re.match(r"^(\d+)\.\s+(.*)", stripped)
        if m:
            blocks.append({"type": "numbered", "number": int(m.group(1)), "text": m.group(2).strip()})
            i += 1
            continue

        # Regular text
        blocks.append({"type": "text", "text": stripped})
        i += 1

    return blocks


def _inline_runs(text: str):
    """Split text into runs with bold/italic/code markers parsed."""
    runs = []
    pattern = re.compile(r"(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`[^`]+`)")
    last = 0
    for m in pattern.finditer(text):
        if m.start() > last:
            runs.append({"text": text[last:m.start()], "bold": False, "italic": False, "code": False})
        token = m.group(0)
        if token.startswith("***"):
            runs.append({"text": token[3:-3], "bold": True, "italic": True, "code": False})
        elif token.startswith("**"):
            runs.append({"text": token[2:-2], "bold": True, "italic": False, "code": False})
        elif token.startswith("*"):
            runs.append({"text": token[1:-1], "bold": False, "italic": True, "code": False})
        else:
            runs.append({"text": token[1:-1], "bold": False, "italic": False, "code": True})
        last = m.end()
    if last < len(text):
        runs.append({"text": text[last:], "bold": False, "italic": False, "code": False})
    return runs or [{"text": text, "bold": False, "italic": False, "code": False}]


# ─────────────────────────────────────────────────────────────────────────────
#  PDF  — fpdf2, proper Unicode handling
# ─────────────────────────────────────────────────────────────────────────────

def generate_pdf(title: str, messages: list[dict], model_name: str | None = None) -> bytes:
    from fpdf import FPDF

    class LacunexPDF(FPDF):
        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 130)
            self.cell(0, 5, _pdf_safe(BRAND_FOOTER), align="C")

    pdf = LacunexPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    L = 20
    R = 20
    PW = 210 - L - R

    pdf.set_left_margin(L)
    pdf.set_right_margin(R)
    pdf.set_top_margin(20)

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(20, 20, 40)
    pdf.multi_cell(PW, 8, _pdf_safe(_clean(title)), align="L")
    pdf.ln(2)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(140, 140, 150)
    pdf.cell(PW, 5, _pdf_safe(f"Exported on {_ts()}"), ln=True)

    pdf.set_draw_color(200, 200, 220)
    pdf.ln(4)
    pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
    pdf.ln(6)

    for msg in messages:
        role = msg.get("role", "")
        raw = _clean(msg.get("content", ""))
        if not raw:
            continue

        is_user = role == "user"
        ai_label = f"Lacunex AI ({model_name})" if model_name else "Lacunex AI"

        pdf.set_font("Helvetica", "B", 9)
        if is_user:
            pdf.set_text_color(40, 110, 210)
        else:
            pdf.set_text_color(110, 60, 210)
            
        pdf.cell(PW, 6, "You" if is_user else _pdf_safe(ai_label), ln=True)
        pdf.ln(1)

        blocks = _parse_blocks(raw)
        for block in blocks:
            btype = block.get("type")

            if btype == "blank":
                pdf.ln(2)

            elif btype == "hr":
                pdf.set_draw_color(220, 220, 230)
                pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
                pdf.ln(3)

            elif btype == "heading":
                lvl = block["level"]
                sizes = {1: 14, 2: 12, 3: 11, 4: 10}
                pdf.set_font("Helvetica", "B", sizes.get(lvl, 10))
                pdf.set_text_color(30, 30, 50)
                pdf.ln(2)
                pdf.multi_cell(PW, 6, _pdf_safe(block["text"]), align="L")
                pdf.ln(1)

            elif btype == "bullet":
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                clean_text = _strip_md(block["text"])
                
                # Indent bullets by changing margin
                pdf.set_left_margin(L + 6)
                # Render bullet point manually at X = L + 2
                old_x = pdf.get_x()
                pdf.set_x(L + 2)
                pdf.cell(4, 5.5, _pdf_safe("\u2022"))
                pdf.set_x(L + 6)
                pdf.multi_cell(PW - 6, 5.5, _pdf_safe(clean_text), align="L")
                pdf.set_left_margin(L)

            elif btype == "numbered":
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                clean_text = _strip_md(block["text"])
                num_str = f"{block['number']}."
                
                pdf.set_left_margin(L + 8)
                pdf.set_x(L + 2)
                pdf.cell(6, 5.5, _pdf_safe(num_str))
                pdf.set_x(L + 8)
                pdf.multi_cell(PW - 8, 5.5, _pdf_safe(clean_text), align="L")
                pdf.set_left_margin(L)

            elif btype == "code":
                pdf.set_fill_color(248, 248, 252)
                pdf.set_draw_color(220, 220, 240)
                pdf.set_font("Courier", "", 9)
                pdf.set_text_color(60, 50, 140)
                pdf.ln(2)
                for code_line in block.get("lines", []):
                    safe = _pdf_safe(code_line if code_line else " ")
                    # small indent for code block
                    pdf.set_x(L + 2)
                    pdf.multi_cell(PW - 4, 5, " " + safe, fill=True, border=0, align="L")
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                pdf.ln(3)

            elif btype == "text":
                clean_text = _strip_md(block["text"])
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(40, 40, 60)
                pdf.multi_cell(PW, 5.5, _pdf_safe(clean_text), align="L")

        pdf.ln(6)
        pdf.set_draw_color(230, 230, 240)
        pdf.line(L, pdf.get_y(), 210 - R, pdf.get_y())
        pdf.ln(6)

    return bytes(pdf.output())


# ─────────────────────────────────────────────────────────────────────────────
#  DOCX  — proper Word styles, no raw markdown
# ─────────────────────────────────────────────────────────────────────────────

def generate_docx(title: str, messages: list[dict], model_name: str | None = None) -> bytes:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.25)
        section.right_margin = Inches(1.25)

    # ── Helpers ────────────────────────────────────────────────────────────
    def add_hr():
        p = doc.add_paragraph()
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "4")
        bottom.set(qn("w:space"), "1")
        bottom.set(qn("w:color"), "CCCCDD")
        pBdr.append(bottom)
        pPr.append(pBdr)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)

    def shade_para(p, color_hex: str):
        pPr = p._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), color_hex)
        pPr.append(shd)

    def add_runs(para, text: str, base_size: float = 10.5, base_color=None):
        """Add inline-parsed runs to a paragraph."""
        if base_color is None:
            base_color = RGBColor(22, 22, 45)
        for r in _inline_runs(text):
            run = para.add_run(r["text"])
            run.bold = r["bold"]
            run.italic = r["italic"]
            run.font.size = Pt(base_size)
            if r["code"]:
                run.font.name = "Courier New"
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(80, 55, 180)
            else:
                run.font.color.rgb = base_color

    # ── Title ────────────────────────────────────────────────────────────────
    tp = doc.add_paragraph()
    tr = tp.add_run(_clean(title))
    tr.bold = True
    tr.font.size = Pt(22)
    tr.font.color.rgb = RGBColor(12, 12, 38)
    tp.paragraph_format.space_after = Pt(4)

    dp = doc.add_paragraph()
    dr = dp.add_run(f"Exported on {_ts()}")
    dr.font.size = Pt(8.5)
    dr.font.color.rgb = RGBColor(145, 145, 168)
    dr.italic = True
    dp.paragraph_format.space_after = Pt(12)

    add_hr()

    # ── Messages ─────────────────────────────────────────────────────────────
    for msg in messages:
        role = msg.get("role", "")
        raw = _clean(msg.get("content", ""))
        if not raw:
            continue

        is_user = role == "user"

        # Sender label
        ai_label = f"Lacunex AI ({model_name})" if model_name else "Lacunex AI"
        lp = doc.add_paragraph()
        lr = lp.add_run("You" if is_user else ai_label)
        lr.bold = True
        lr.font.size = Pt(8.5)
        lr.font.color.rgb = RGBColor(40, 120, 215) if is_user else RGBColor(100, 65, 215)
        lp.paragraph_format.space_before = Pt(10)
        lp.paragraph_format.space_after = Pt(4)

        # Render blocks
        blocks = _parse_blocks(raw)
        for block in blocks:
            btype = block.get("type")

            if btype == "blank":
                sp = doc.add_paragraph()
                sp.paragraph_format.space_before = Pt(0)
                sp.paragraph_format.space_after = Pt(1)

            elif btype == "hr":
                add_hr()

            elif btype == "heading":
                lvl = block["level"]
                sizes = {1: 15, 2: 13, 3: 12, 4: 11}
                hp = doc.add_paragraph()
                hr_ = hp.add_run(block["text"])
                hr_.bold = True
                hr_.font.size = Pt(sizes.get(lvl, 11))
                hr_.font.color.rgb = RGBColor(14, 14, 40)
                hp.paragraph_format.space_before = Pt(8)
                hp.paragraph_format.space_after = Pt(3)

            elif btype == "bullet":
                bp = doc.add_paragraph(style="List Bullet")
                add_runs(bp, block["text"])
                bp.paragraph_format.space_after = Pt(1)

            elif btype == "numbered":
                np_ = doc.add_paragraph(style="List Number")
                add_runs(np_, block["text"])
                np_.paragraph_format.space_after = Pt(1)

            elif btype == "code":
                for cl in block.get("lines", []):
                    cp = doc.add_paragraph()
                    cr = cp.add_run(cl if cl else " ")
                    cr.font.name = "Courier New"
                    cr.font.size = Pt(9)
                    cr.font.color.rgb = RGBColor(65, 50, 160)
                    cp.paragraph_format.left_indent = Cm(0.5)
                    cp.paragraph_format.right_indent = Cm(0.5)
                    cp.paragraph_format.space_after = Pt(0)
                    shade_para(cp, "F0F0FA")

                gap = doc.add_paragraph()
                gap.paragraph_format.space_after = Pt(4)

            elif btype == "text":
                p = doc.add_paragraph()
                add_runs(p, block["text"])
                p.paragraph_format.space_after = Pt(3)

        add_hr()

    # ── Footer ────────────────────────────────────────────────────────────────
    fp = doc.add_paragraph()
    fr = fp.add_run(BRAND_FOOTER)
    fr.font.size = Pt(7.5)
    fr.font.color.rgb = RGBColor(155, 155, 175)
    fr.italic = True
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fp.paragraph_format.space_before = Pt(16)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
#  XLSX  — markdown-free, structured
# ─────────────────────────────────────────────────────────────────────────────

def generate_xlsx(title: str, messages: list[dict], model_name: str | None = None) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Conversation"

    # Title row
    ws.merge_cells("A1:D1")
    ws["A1"] = _clean(title)
    ws["A1"].font = Font(bold=True, size=14, color="0A0A22")
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")

    # Subtitle row
    ws.merge_cells("A2:D2")
    ws["A2"] = f"Exported on {_ts()}"
    ws["A2"].font = Font(size=9, color="8282A0", italic=True)
    ws["A2"].alignment = Alignment(horizontal="left")

    ws.append([])  # spacer

    # Headers
    ws.append(["#", "Sender", "Message", "Timestamp"])
    hdr_row = ws.max_row
    hdr_fill = PatternFill("solid", fgColor="4A3FBF")
    for col in range(1, 5):
        cell = ws.cell(row=hdr_row, column=col)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Data
    thin = Side(style="thin", color="E0E0EE")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    user_fill = PatternFill("solid", fgColor="EEF3FF")
    ai_fill = PatternFill("solid", fgColor="F2EEFF")
    now = datetime.utcnow().isoformat()

    for idx, msg in enumerate(messages, start=1):
        role = msg.get("role", "user")
        # IMPORTANT: Strip all markdown to clean plain text for Excel
        raw_content = _clean(msg.get("content", ""))
        content = _strip_md(raw_content)
        if not content.strip():
            continue

        ai_label = f"Lacunex AI ({model_name})" if model_name else "Lacunex AI"
        sender = "You" if role == "user" else ai_label
        fill = user_fill if role == "user" else ai_fill
        ts = msg.get("created_at") or now

        ws.append([idx, sender, content, ts])
        data_row = ws.max_row
        for col in range(1, 5):
            cell = ws.cell(row=data_row, column=col)
            cell.fill = fill
            cell.border = border
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.font = Font(
                bold=(col == 2),
                size=9 if col == 2 else (8 if col == 4 else 10),
                color="828296" if col == 4 else "0A0A22",
            )

    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 13
    ws.column_dimensions["C"].width = 85
    ws.column_dimensions["D"].width = 24
    ws.freeze_panes = "A5"

    ws.append([])
    ws.append(["", "", BRAND_FOOTER])
    footer_cell = ws.cell(row=ws.max_row, column=3)
    footer_cell.font = Font(size=8, color="9090B0", italic=True)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
