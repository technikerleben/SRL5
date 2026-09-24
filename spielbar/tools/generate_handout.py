from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Handout_Spiel-Bar_Klassen-AG.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

BLUE = HexColor("#245688")
BLUE_DARK = HexColor("#18324A")
BLUE_LIGHT = HexColor("#EFF5FA")
MINT = HexColor("#48DCCB")
MINT_LIGHT = HexColor("#EFFCFA")
ORANGE = HexColor("#F0A66F")
ORANGE_LIGHT = HexColor("#FFF8F2")
LINE = HexColor("#718394")
PALE_LINE = HexColor("#C5D0D9")

pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))

PAGE_W, PAGE_H = A4
MARGIN = 12 * mm
CONTENT_W = PAGE_W - 2 * MARGIN


def style(name, size, leading=None, color=BLUE_DARK, bold=False, space_after=0):
    return ParagraphStyle(
        name,
        fontName="DejaVu-Bold" if bold else "DejaVu",
        fontSize=size,
        leading=leading or size * 1.22,
        textColor=color,
        alignment=TA_LEFT,
        spaceAfter=space_after,
    )


BODY = style("body", 9.4, 11.6)
SMALL = style("small", 8, 9.8)
SMALL_BOLD = style("small-bold", 8, 9.8, bold=True)
H2 = style("h2", 14, 16, BLUE, True)
H3 = style("h3", 10.5, 12, BLUE, True)


def paragraph(c, text, x, y_top, width, paragraph_style=BODY, height=40 * mm):
    item = Paragraph(text, paragraph_style)
    _, used = item.wrap(width, height)
    item.drawOn(c, x, y_top - used)
    return used


def page_header(c, title, subtitle):
    c.setFillColor(BLUE)
    c.rect(0, PAGE_H - 4 * mm, PAGE_W * .7, 4 * mm, fill=1, stroke=0)
    c.setFillColor(MINT)
    c.rect(PAGE_W * .7, PAGE_H - 4 * mm, PAGE_W * .17, 4 * mm, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(PAGE_W * .87, PAGE_H - 4 * mm, PAGE_W * .13, 4 * mm, fill=1, stroke=0)

    top = PAGE_H - 13 * mm
    c.setFillColor(BLUE)
    c.setFont("DejaVu-Bold", 24)
    c.drawString(MARGIN, top, title)
    c.setFillColor(BLUE_DARK)
    c.setFont("DejaVu", 9.8)
    c.drawString(MARGIN, top - 6 * mm, subtitle)

    mark_w, mark_h = 31 * mm, 13 * mm
    mark_x, mark_y = PAGE_W - MARGIN - mark_w, top - 7 * mm
    c.setFillColor(BLUE_LIGHT)
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.4)
    c.roundRect(mark_x, mark_y, mark_w, mark_h, 3 * mm, fill=1, stroke=1)
    c.setFillColor(BLUE_DARK)
    c.setFont("DejaVu-Bold", 10.5)
    c.drawCentredString(mark_x + mark_w / 2, mark_y + 4.4 * mm, "Klasse 5.3")

    line_y = top - 10.5 * mm
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.1)
    c.line(MARGIN, line_y, PAGE_W - MARGIN, line_y)
    return line_y - 5 * mm


def footer(c, page_number):
    c.setFillColor(HexColor("#3D5061"))
    c.setFont("DejaVu", 7.5)
    c.drawString(MARGIN, 6 * mm, "Spiel-Bar - Klassen-AG")
    c.drawRightString(PAGE_W - MARGIN, 6 * mm, f"{page_number} / 2")


def info_box(c, x, y_top, width, height, text, fill=BLUE_LIGHT, line=BLUE):
    c.setFillColor(fill)
    c.setStrokeColor(line)
    c.setLineWidth(1.1)
    c.roundRect(x, y_top - height, width, height, 3 * mm, fill=1, stroke=1)
    c.setFillColor(line)
    c.rect(x, y_top - height, 3 * mm, height, fill=1, stroke=0)
    paragraph(c, text, x + 6 * mm, y_top - 3.2 * mm, width - 9 * mm, BODY, height - 5 * mm)


def draw_step(c, x, y_top, width, height, number, heading, text, fill=white):
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(.9)
    c.roundRect(x, y_top - height, width, height, 3 * mm, fill=1, stroke=1)
    c.setStrokeColor(BLUE)
    c.setFillColor(white)
    c.roundRect(x + 3 * mm, y_top - 10 * mm, 7 * mm, 7 * mm, 1.8 * mm, fill=1, stroke=1)
    c.setFillColor(BLUE)
    c.setFont("DejaVu-Bold", 10)
    c.drawCentredString(x + 6.5 * mm, y_top - 7.7 * mm, str(number))
    paragraph(c, heading, x + 12 * mm, y_top - 3.2 * mm, width - 15 * mm, H3, 9 * mm)
    paragraph(c, text, x + 3 * mm, y_top - 13 * mm, width - 6 * mm, SMALL, height - 15 * mm)


def write_line(c, x, y, width):
    c.setStrokeColor(LINE)
    c.setLineWidth(.7)
    c.line(x, y, x + width, y)


def draw_page_one(c):
    y = page_header(c, "Unsere Spiel-Bar", "Wir prüfen die vorhandenen Spiele.")

    c.setFont("DejaVu-Bold", 9)
    c.setFillColor(BLUE_DARK)
    c.drawString(MARGIN, y, "Team:")
    write_line(c, MARGIN + 12 * mm, y - .5 * mm, 83 * mm)
    c.drawString(MARGIN + 102 * mm, y, "Datum:")
    write_line(c, MARGIN + 117 * mm, y - .5 * mm, CONTENT_W - 117 * mm)
    y -= 6 * mm

    info_box(
        c, MARGIN, y, CONTENT_W, 18 * mm,
        "<b>Euer Auftrag:</b> Prüft die Spiele sorgfältig. Am Ende soll klar sein, welche Spiele direkt in die Spiel-Bar dürfen und bei welchen Spielen noch etwas fehlt."
    )
    y -= 22 * mm

    gap = 3 * mm
    box_w = (CONTENT_W - 2 * gap) / 3
    draw_step(c, MARGIN, y, box_w, 30 * mm, 1, "Anleitung", "Findet die Spielanleitung. Lest nach, welches Material zum Spiel gehört.")
    draw_step(c, MARGIN + box_w + gap, y, box_w, 30 * mm, 2, "Material", "Zählt und sortiert alle Teile. Notiert genau, wenn etwas fehlt.", ORANGE_LIGHT)
    draw_step(c, MARGIN + 2 * (box_w + gap), y, box_w, 30 * mm, 3, "Urteil", "Prüft, ob das Spiel einfach, kurz und für den Klassenraum geeignet ist.", MINT_LIGHT)
    y -= 35 * mm

    paragraph(c, "Das passt zu unserer Spiel-Bar", MARGIN, y, CONTENT_W, H2, 10 * mm)
    y -= 7 * mm
    checks = [
        "Die Regeln sind überschaubar.",
        "Eine Runde dauert höchstens etwa 20 Minuten.",
        "Das Spiel ist schnell aufgebaut.",
        "Das Material lässt sich leicht kontrollieren.",
        "Das Spiel kann selbstständig gespielt werden.",
        "Das Spiel passt in den Klassenraum.",
    ]
    col_w = CONTENT_W / 2
    for i, text in enumerate(checks):
        col = i % 2
        row = i // 2
        x = MARGIN + col * col_w
        yy = y - row * 6 * mm
        c.setStrokeColor(BLUE_DARK)
        c.rect(x, yy - 3.2 * mm, 3.3 * mm, 3.3 * mm, fill=0, stroke=1)
        paragraph(c, text, x + 5.2 * mm, yy, col_w - 7 * mm, SMALL, 6 * mm)
    y -= 21 * mm

    paragraph(c, "Unser Spiele-Check", MARGIN, y, CONTENT_W, H2, 10 * mm)
    y -= 8 * mm
    header = ["Spiel", "Anleitung?", "Vollständig?", "Personen / Dauer", "Was fehlt? Was fällt auf?", "Geeignet?"]
    body = [["", "□ ja\n□ nein", "□ ja\n□ nein", "", "", "□ ja\n□ nein"] for _ in range(3)]
    table = Table([header] + body, colWidths=[31 * mm, 20 * mm, 22 * mm, 25 * mm, 54 * mm, 22 * mm], rowHeights=[10 * mm] + [16 * mm] * 3)
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "DejaVu"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.2),
        ("LEADING", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLUE_DARK),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE_LIGHT),
        ("GRID", (0, 0), (-1, -1), .75, BLUE_DARK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    _, table_h = table.wrap(CONTENT_W, 80 * mm)
    table.drawOn(c, MARGIN, y - table_h)
    y -= table_h + 6 * mm

    paragraph(c, "So sortieren wir die Spiele", MARGIN, y, CONTENT_W, H2, 10 * mm)
    y -= 8 * mm
    labels = [
        ("Bereit", "Vollständig, Anleitung vorhanden und gut geeignet.", MINT),
        ("Prüfen", "Eine Anleitung oder einzelne Teile fehlen.", ORANGE),
        ("Nicht passend", "Zu lang, zu kompliziert oder ungeeignet.", BLUE),
    ]
    for i, (title, text, accent) in enumerate(labels):
        x = MARGIN + i * (box_w + gap)
        c.setFillColor(white)
        c.setStrokeColor(BLUE_DARK)
        c.roundRect(x, y - 24 * mm, box_w, 24 * mm, 3 * mm, fill=1, stroke=1)
        c.setFillColor(accent)
        c.roundRect(x, y - 4 * mm, box_w, 4 * mm, 2 * mm, fill=1, stroke=0)
        paragraph(c, title, x + 3 * mm, y - 6 * mm, box_w - 6 * mm, H3, 7 * mm)
        paragraph(c, text, x + 3 * mm, y - 13 * mm, box_w - 6 * mm, SMALL, 10 * mm)
    footer(c, 1)


def draw_idea_box(c, x, y_top, width, height, heading, text, accent):
    c.setFillColor(white)
    c.setStrokeColor(BLUE_DARK)
    c.setLineWidth(.9)
    c.roundRect(x, y_top - height, width, height, 3 * mm, fill=1, stroke=1)
    c.setFillColor(accent)
    c.roundRect(x, y_top - 4 * mm, width, 4 * mm, 2 * mm, fill=1, stroke=0)
    paragraph(c, heading, x + 4 * mm, y_top - 7 * mm, width - 8 * mm, H2, 8 * mm)
    paragraph(c, text, x + 4 * mm, y_top - 16 * mm, width - 8 * mm, SMALL, 12 * mm)
    for row in range(5):
        write_line(c, x + 4 * mm, y_top - 32 * mm - row * 8 * mm, width - 8 * mm)


def draw_page_two(c):
    y = page_header(c, "Neue Spiele gesucht", "Wir sammeln Ideen für Spiele und Spielanleitungen.")
    info_box(
        c, MARGIN, y, CONTENT_W, 18 * mm,
        "<b>Denkt gemeinsam nach:</b> Welche Spiele kennt ihr? Schreibt nur Spiele auf, die leicht erklärt werden können und nicht zu lange dauern."
    )
    y -= 23 * mm

    gap = 5 * mm
    box_w = (CONTENT_W - gap) / 2
    draw_idea_box(c, MARGIN, y, box_w, 72 * mm, "Mit Schulmaterial", "Zum Beispiel mit Papier, Stiften, kariertem Papier oder Würfeln.", ORANGE)
    draw_idea_box(c, MARGIN + box_w + gap, y, box_w, 72 * mm, "Ganz ohne Material", "Zum Beispiel Wortspiele, Ratespiele oder Spiele im Sitzkreis.", MINT)
    y -= 80 * mm

    paragraph(c, "Unsere Kartei mit Spielanleitungen", MARGIN, y, CONTENT_W, H2, 10 * mm)
    y -= 7 * mm
    paragraph(c, "Jedes ausgewählte Spiel bekommt eine kurze, laminierte Anleitung. So könnt ihr selbstständig nachlesen und direkt beginnen.", MARGIN, y, CONTENT_W, BODY, 12 * mm)
    y -= 13 * mm

    left_w = 65 * mm
    right_x = MARGIN + left_w + 5 * mm
    right_w = CONTENT_W - left_w - 5 * mm
    block_h = 105 * mm

    c.setFillColor(BLUE_LIGHT)
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.roundRect(MARGIN, y - block_h, left_w, block_h, 3 * mm, fill=1, stroke=1)
    paragraph(c, "Auf jede Karte gehören", MARGIN + 4 * mm, y - 4 * mm, left_w - 8 * mm, H3, 10 * mm)
    card_items = [
        "Name des Spiels", "Anzahl der Personen", "benötigtes Material", "ungefähre Spieldauer",
        "Ziel des Spiels", "wenige klare Spielschritte", "Ende und Gewinnregel"
    ]
    yy = y - 16 * mm
    for item in card_items:
        c.setFillColor(BLUE_DARK)
        c.circle(MARGIN + 6 * mm, yy - 1.1 * mm, .8 * mm, fill=1, stroke=0)
        paragraph(c, item, MARGIN + 10 * mm, yy + 1 * mm, left_w - 15 * mm, SMALL, 7 * mm)
        yy -= 8 * mm
    paragraph(c, "<b>Wichtig:</b> Die Karte muss auch für Kinder verständlich sein, die das Spiel noch nicht kennen.", MARGIN + 4 * mm, yy - 2 * mm, left_w - 8 * mm, SMALL, 28 * mm)

    c.setFillColor(white)
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.7)
    c.roundRect(right_x, y - block_h, right_w, block_h, 4 * mm, fill=1, stroke=1)
    paragraph(c, "Name des Spiels", right_x + 5 * mm, y - 6 * mm, right_w - 10 * mm, style("card-title", 16, 18, BLUE, True), 10 * mm)
    c.setFont("DejaVu-Bold", 6.5)
    c.setFillColor(BLUE)
    c.drawRightString(right_x + right_w - 5 * mm, y - 5 * mm, "MUSTER FÜR DIE KARTEI")

    meta_y = y - 22 * mm
    meta_gap = 2 * mm
    meta_w = (right_w - 10 * mm - 2 * meta_gap) / 3
    for i, (label, value) in enumerate([("Personen", "___ bis ___"), ("Dauer", "etwa ___ min"), ("Material", "________")]):
        x = right_x + 5 * mm + i * (meta_w + meta_gap)
        c.setStrokeColor(PALE_LINE)
        c.roundRect(x, meta_y - 14 * mm, meta_w, 14 * mm, 2 * mm, fill=0, stroke=1)
        paragraph(c, f"<b>{label}</b><br/>{value}", x + 2 * mm, meta_y - 2 * mm, meta_w - 4 * mm, SMALL, 11 * mm)

    yy = meta_y - 20 * mm
    paragraph(c, "<b>Ziel:</b> ______________________________________________", right_x + 5 * mm, yy, right_w - 10 * mm, SMALL, 8 * mm)
    yy -= 10 * mm
    for number in range(1, 4):
        paragraph(c, f"<b>{number}.</b>", right_x + 5 * mm, yy, 7 * mm, SMALL_BOLD, 6 * mm)
        write_line(c, right_x + 13 * mm, yy - 2 * mm, right_w - 18 * mm)
        yy -= 12 * mm
    paragraph(c, "<b>Das Spiel endet, wenn:</b>", right_x + 5 * mm, yy, right_w - 10 * mm, SMALL, 7 * mm)
    write_line(c, right_x + 5 * mm, yy - 7 * mm, right_w - 10 * mm)
    footer(c, 2)


def build():
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("Spiel-Bar - Handout für die Klassen-AG")
    c.setAuthor("Klasse 5.3")
    draw_page_one(c)
    c.showPage()
    draw_page_two(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
