import os
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import cm


def build_revised_syllabus_pdf(
    output_path: str,
    course_code: str,
    course_name: str,
    revised_structure: dict,
    accepted_changes: list[dict],
    admin_name: str,
    analytics_run_date: str,
    alumni_count: int,
) -> str:
    """Build a revised syllabus PDF. Returns the output_path."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    new_style = ParagraphStyle(
        "NewTopic", parent=styles["Normal"],
        textColor=colors.HexColor("#15803D"),
        leftIndent=20, spaceAfter=2,
    )
    revised_style = ParagraphStyle(
        "RevisedTopic", parent=styles["Normal"],
        textColor=colors.HexColor("#C2410C"),
        leftIndent=20, spaceAfter=2,
    )
    normal_topic_style = ParagraphStyle(
        "Topic", parent=styles["Normal"],
        leftIndent=20, spaceAfter=2,
    )

    story = []

    # ── Cover / Revision Summary ──────────────────────────────────────────
    story.append(Paragraph(f"Revised Syllabus", styles["Title"]))
    story.append(Paragraph(f"{course_code} — {course_name}", styles["Heading2"]))
    story.append(Spacer(1, 0.5*cm))

    meta = [
        ["Finalized by:", admin_name],
        ["Analytics run date:", analytics_run_date],
        ["Alumni data snapshot:", f"{alumni_count} responses"],
        ["Applied changes:", str(len(accepted_changes))],
        ["Generated on:", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")],
    ]
    meta_tbl = Table(meta, colWidths=[5*cm, 12*cm])
    meta_tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 0.5*cm))

    if accepted_changes:
        story.append(Paragraph("Applied Changes Summary", styles["Heading3"]))
        hdr = [["#", "Type", "Topic / Change", "Evidence"]]
        rows = []
        for i, ch in enumerate(accepted_changes, 1):
            rows.append([
                str(i),
                ch.get("type", ""),
                (ch.get("proposed_text") or "")[:60],
                (ch.get("evidence") or "")[:80],
            ])
        tbl = Table(hdr + rows, colWidths=[0.8*cm, 2.2*cm, 6*cm, 8*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D4ED8")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF6FF")]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.lightgrey),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(tbl)

    story.append(PageBreak())

    # ── Syllabus Content ──────────────────────────────────────────────────
    story.append(Paragraph("Revised Syllabus Content", styles["Heading1"]))
    story.append(Spacer(1, 0.3*cm))

    for unit in revised_structure.get("units", []):
        title = unit.get("title", "")
        if title.startswith("[NEW UNIT]"):
            unit_style = ParagraphStyle("NewUnit", parent=styles["Heading2"],
                                        textColor=colors.HexColor("#15803D"))
            story.append(Paragraph(title, unit_style))
        else:
            story.append(Paragraph(title, styles["Heading2"]))

        for topic in unit.get("topics", []):
            if topic.startswith("[NEW]"):
                story.append(Paragraph(f"★ {topic}", new_style))
            elif topic.startswith("[REVISED"):
                story.append(Paragraph(f"△ {topic}", revised_style))
            else:
                story.append(Paragraph(f"• {topic}", normal_topic_style))

        for obj in unit.get("objectives", []):
            story.append(Paragraph(f"  ◦ {obj}", styles["Normal"]))

        story.append(Spacer(1, 0.3*cm))

    doc.build(story)
    return output_path
