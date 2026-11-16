# Baut ../SRL-Video-Sprechertext.pdf aus text.py (Python 3 + playwright): python3 build.py
import sys,re,html,asyncio,os,shutil
sys.path.insert(0,os.path.dirname(__file__)); from text import CHAPTERS,K
D=os.path.dirname(os.path.abspath(__file__))
for f in ('anton.woff2','jost.woff2'): shutil.copy(os.path.join(D,'..','assets','fonts',f),D)
def para(p):
    p=html.escape(p)
    p=p.replace('[KLICK]','<span class="pill">Klick</span>')
    p=re.sub(r'\*(.+?)\*',r'<span class="regie">\1</span>',p)
    if p.startswith('<span class="regie">') and p.endswith('</span>'): return f'<p class="ronly">{p}</p>'
    return f'<p>{p}</p>'
NSL=sum(len(c[3]) for c in CHAPTERS); NMIN=sum(int(re.search(r'\d+',c[2]).group()) for c in CHAPTERS)
rows=''.join(f'<tr><td>{html.escape(c[0])}</td><td>{c[1]}</td><td>{c[2]}</td></tr>' for c in CHAPTERS)
body=[]
for name,rng,dur,slides in CHAPTERS:
    body.append(f'<section class="chap"><div class="chead"><span>{html.escape(name)}</span><span>Folien {rng} · {dur}</span></div>')
    for n,t,ps in slides:
        body.append(f'<div class="s"><div class="n">{n}</div><div><h3>{html.escape(t)}</h3>{"".join(para(p) for p in ps)}</div></div>')
    body.append('</section>')
doc=f'''<!doctype html><html lang="de"><meta charset="utf-8"><style>
@font-face{{font-family:Anton;src:url(anton.woff2)}}@font-face{{font-family:Jost;src:url(jost.woff2);font-weight:100 900}}
:root{{--navy:#2C3D4C;--red:#9E4E22;--sage:#4D8B3F;--muted:#5A6A78;--line:#D0DCE6}}
body{{font:400 14.5pt/1.55 Jost,sans-serif;color:#1E2A35;margin:0}}
.cover{{page-break-after:always;padding-top:6mm}}
.mark{{display:inline-block;font:400 15pt Anton;color:var(--navy);border:2pt solid var(--line);border-radius:10px;padding:8px 14px;margin-bottom:8mm}}
.kicker{{font:700 10pt Jost;letter-spacing:.18em;text-transform:uppercase;color:var(--red);margin:0 0 3mm}}
h1{{font:400 42pt/1.02 Anton;color:var(--navy);margin:0 0 4mm}}
.sub{{font-size:15pt;color:var(--muted);margin:0 0 8mm}}
.leg{{display:grid;gap:3mm;margin:0 0 8mm;font-size:12pt}}
.pill{{display:inline-block;font:700 9pt Jost;letter-spacing:.06em;text-transform:uppercase;background:var(--red);color:#fff;border-radius:5px;padding:1px 7px;margin-right:6px;vertical-align:1px}}
.regie{{color:var(--muted);font-style:italic;font-size:12.5pt}}
table{{border-collapse:collapse;width:100%;font-size:12.5pt}}td{{padding:2.2mm 0;border-bottom:.6pt solid var(--line)}}td:nth-child(2),td:nth-child(3){{text-align:right;color:var(--muted);white-space:nowrap;padding-left:6mm}}
tr.sum td{{font-weight:700;color:var(--navy);border-bottom:0}}
.tips{{margin-top:8mm;font-size:11.5pt;color:var(--muted)}}.tips b{{color:var(--navy)}}
.chap{{page-break-before:always}}.chap:first-of-type{{page-break-before:auto}}
.chead{{display:flex;justify-content:space-between;font:700 10pt Jost;letter-spacing:.14em;text-transform:uppercase;color:var(--red);border-bottom:1.5pt solid var(--red);padding-bottom:2mm;margin-bottom:5mm}}
.chead span:last-child{{color:var(--muted);letter-spacing:.04em;text-transform:none;font-weight:500}}
.s{{display:grid;grid-template-columns:13mm 1fr;gap:4mm;margin:0 0 7mm;break-inside:avoid-page}}
.n{{font:400 22pt/1 Anton;color:var(--navy)}}
h3{{font:700 14pt/1.3 Jost;color:var(--navy);margin:0 0 2mm}}
p{{margin:0 0 2.5mm}}
</style>
<div class="cover"><div class="mark">SRL</div><p class="kicker">Sprechertext · Erklärvideo</p><h1>SRL ist keine Methode!</h1><p class="sub">Was selbstreguliertes Lernen (nicht) ist · Online-Fortbildung in fünf kurzen Videos</p>
<div class="leg"><div><span class="pill">Klick</span> Inhalt aufdecken oder Bild zoomen, genau an dieser Stelle klicken</div><div><span class="regie">kursiv grau</span> – Regieanweisung, nicht sprechen</div></div>
<table>{rows}<tr class="sum"><td>Gesamt</td><td>{NSL} Folien</td><td>ca. {NMIN} min</td></tr></table>
<p class="tips"><b>Aufnahme:</b> Jeden Teil als eigenes Video aufnehmen – die Seite mit <b>?teil=1</b> bis <b>?teil=5</b> am Ende der Adresse öffnen (oder im Menü mit M wählen), dann stimmen die Foliennummern mit diesem Text überein. <b>F</b> Vollbild, <b>R</b> Aufnahmemodus ohne Fortschrittsbalken und Mauszeiger, <b>C</b> Webcam an – das Kamerabild läuft direkt in der Seite und wechselt je Folie zwischen groß, klein und aus (<b>V</b> stellt es von Hand um). Zwischen den Klicks kurz Luft lassen; Animationen brauchen etwa eine Sekunde.</p><p class="tips"><b>Beispiele:</b> Das Beispiel zum lauten Denken in Teil 4 ist ein Platzhalter – ein echtes aus dem eigenen Unterricht wirkt stärker.</p></div>
{"".join(body)}</html>'''
open(D+'/sprechertext.html','w').write(doc)
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page()
        await pg.goto('file://'+D+'/sprechertext.html'); await pg.wait_for_timeout(500)
        await pg.pdf(path=os.path.join(D,'..','SRL-Video-Sprechertext.pdf'),format='A4',print_background=True,display_header_footer=True,header_template='<span></span>',footer_template='<div style="font-size:8pt;color:#888;width:100%;text-align:center;font-family:sans-serif">SRL ist keine Methode! · Sprechertext · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',margin={'top':'16mm','bottom':'18mm','left':'20mm','right':'20mm'})
        await b.close()
asyncio.run(main())
