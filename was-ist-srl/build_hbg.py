"""Erzeugt cd-hbg.html – die Fassung im Corporate Design der HBG – aus index.html.
Inhalt, Klicks und Sprechertext bleiben identisch; nur Schriften, Farben,
Titelfolien sowie Kopfzeile und Logo werden ersetzt.
Nach jeder Änderung an index.html neu ausführen:  python3 build_hbg.py"""
import re, pathlib
HERE = pathlib.Path(__file__).parent
s = (HERE/'index.html').read_text()
logo = (HERE/'assets/hbg-logo-wordmark.symbol.svg').read_text()

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)

# --- Schriften: Gagalin für Titel, Glacial Indifference für Text ------------
rep('@font-face{font-family:Anton;src:url(assets/fonts/anton.woff2) format("woff2");font-display:block}\n'
    '@font-face{font-family:Jost;src:url(assets/fonts/jost.woff2) format("woff2");font-weight:100 900;font-display:block}',
    '@font-face{font-family:Gagalin;src:url(assets/fonts/gagalin.woff2) format("woff2");font-display:block;size-adjust:86%}\n'
    '@font-face{font-family:"Glacial Indifference";src:url(assets/fonts/glacial-400.woff2) format("woff2");font-weight:100 550;font-display:block}\n'
    '@font-face{font-family:"Glacial Indifference";src:url(assets/fonts/glacial-700.woff2) format("woff2");font-weight:551 900;font-display:block}')
s = re.sub(r'\bAnton\b(?!\.txt)', 'Gagalin', s)
s = re.sub(r'\bJost\b(?!\.txt)', '"Glacial Indifference"', s)
s = s.replace('"Glacial Indifference",system-ui', '"Glacial Indifference",system-ui')

# --- Farben: SRL-Palette -> HBG-Hausfarben (Rot, Blau, Grün) ---------------
rep('--slate-dark:#2C3D4C;--slate-base:#3E5668;--slate-mid:#6A8599;--slate-pale:#D0DCE6;--slate-ghost:#EEF3F7;'
    '--rust-dark:#9E4E22;--rust-base:#D97A4A;--rust-mid:#EBA882;--rust-pale:#F5DDD1;--sage-dark:#4D8B3F;--sage-base:#7DBB6F;',
    '--slate-dark:#163A5C;--slate-base:#245688;--slate-mid:#6C93B8;--slate-pale:#CBDBE9;--slate-ghost:#EFF4F9;'
    '--rust-dark:#791D22;--rust-base:#791D22;--rust-mid:#E8C9CB;--rust-pale:#F8EEEE;--sage-dark:#3F6B4D;--sage-base:#7C9C82;')
rep('--paper:#F5F4F1;--ink:#1E2A35;--muted:#5A6A78;--line:rgba(44,61,76,.18);',
    '--paper:#FFFFFF;--ink:#1F2020;--muted:#5A5A5A;--line:rgba(36,86,136,.20);')
for a, b in {'#3E5668': '#245688', '#2C3D4C': '#163A5C', '#1F2C38': '#0F2A44', '#101C29': '#0F2A44',
             '#22374C': '#1D4670', '#33506B': '#2E5E8C', '#33475B': '#2E5E8C', '#2A3D50': '#2E5E8C',
             '#FFB98A': '#E8C9CB', '#FFD7B8': '#F8EEEE', '#9FB6CC': '#CBDBE9', '#E6EEF5': '#EFF4F9',
             '#CFE0EE': '#EFF4F9', '#A9BAC7': '#CBDBE9'}.items():
    s = s.replace(a, b).replace(a.lower(), b)

# --- Titel- und Kapitelfolien hell, mit weinrotem Balken -------------------
s = re.sub(r'(<section class="slide cover[^"]*"[^>]*?) data-dark>', r'\1>', s)
css = '''
/* ================= HBG Corporate Design (erzeugt von build_hbg.py) ================= */
.h,.statement,.stackv .big,.hero-n{letter-spacing:0}
.h em,.statement em{color:var(--rust-dark)}
.slide.cover{background:
  radial-gradient(ellipse 55% 60% at 88% 18%,rgba(36,86,136,.16),transparent 70%),
  radial-gradient(ellipse 40% 45% at 70% 82%,rgba(121,29,34,.12),transparent 70%),
  radial-gradient(ellipse 35% 40% at 96% 60%,rgba(108,147,184,.18),transparent 70%),#fff;color:var(--ink);padding-bottom:170px}
.slide.cover::after{content:"";position:absolute;left:0;right:0;bottom:0;height:118px;background:var(--rust-dark)}
.cover .h{color:var(--ink)}
.cover .h em{color:var(--rust-dark)}
.cover .kw,.cover .sm{color:var(--ink)}
.cover .sm.event{color:#fff;position:absolute;left:120px;bottom:42px;margin:0;font-weight:700;z-index:2}
.cover .label{color:var(--rust-dark)}
.cover .mark{border-color:var(--rust-dark);color:var(--rust-dark)}
.cover .line{background:var(--rust-dark)}
.orbit{background:repeating-conic-gradient(rgba(36,86,136,.10) 0 55deg,transparent 55deg 60deg)}
.chapter .chap-no{color:rgba(121,29,34,.08)}
.thanks .h{color:var(--ink)}
.chapters .cn{background:var(--rust-dark)}
.chapters li.on .cn{background:var(--slate-base)}
body.cam-on #cam{box-shadow:0 0 0 6px #fff,0 0 0 12px var(--slate-base),0 20px 44px -10px rgba(22,58,92,.45)}
/* Kopfzeile und Logo auf jeder Folie */
#cd-head{position:absolute;z-index:25;left:120px;top:18px;font:700 14px/1 "Glacial Indifference",sans-serif;letter-spacing:.06em;color:#1F2020;pointer-events:none;transition:opacity .3s ease}
#cd-logo{position:absolute;z-index:25;right:56px;top:12px;width:156px;height:44px;color:#791D22;pointer-events:none;transition:opacity .3s ease}
body:has(.slide.active.kipper) #cd-head,body:has(.slide.active.kipper) #cd-logo,
body:has(.slide.active .pic.cur) #cd-head,body:has(.slide.active .pic.cur) #cd-logo{opacity:0}
.pr-meter{top:84px}
.slide.praxis{padding-top:64px}
.read #cd-head,.read #cd-logo{display:none}
@media print{#cd-head,#cd-logo{display:none}}
'''
i = s.index('</style>'); s = s[:i] + css + s[i:]
rep('<div id="cam" aria-hidden="true">',
    '<div id="cd-head">HEINRICH-BÖLL-GESAMTSCHULE DORTMUND</div>'
    '<svg id="cd-logo" viewBox="0 0 1536 434" role="img" aria-label="Heinrich-Böll-Gesamtschule Dortmund"><use href="#hbg-logo-wordmark"></use></svg>\n'
    '<div id="cam" aria-hidden="true">')
rep('<body', '<body', 1)
s = re.sub(r'(<body[^>]*>)', r'\1\n<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + logo.replace('\\', '\\\\') + '</svg>', s, count=1)
s = re.sub(r'<title>(.*?)</title>', r'<title>\1 · HBG</title>', s, count=1)

rep('<a href="cd-hbg.html" class="m-alt" data-alt>HBG-Design</a>','<a href="./" class="m-alt" data-alt>SRL-Design</a>')
(HERE/'cd-hbg.html').write_text(s)
print('cd-hbg.html geschrieben,', len(s), 'Zeichen')
