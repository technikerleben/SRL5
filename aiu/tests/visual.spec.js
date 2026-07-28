import { test, expect } from '@playwright/test';

/* Fester Spielstand, damit die Bilder vergleichbar bleiben.
   Woche 6 ist gewaehlt, weil dort alle Bereiche freigeschaltet sind. */
const RUNTIME = {
  week: 6,
  resources: { antrieb: 12, wissen: 9, zusammenhalt: 15 },
  studentUntil: 0,
  councilOpen: false,
  votes: {},
  upgrades: { kartenraum: true, beiboot: true, ausguck: false, werkstatt: false, lager: false, versammlung: false },
  localLogbook: []
};

const ANSICHTEN = [
  ['deck', 'Deck'],
  ['missionen', 'Auftraege'],
  ['karte', 'Karte'],
  ['logbuch', 'Logbuch'],
  ['rat', 'Besatzungsrat'],
  ['ausbau', 'Schiffsausbau'],
  ['lehrer', 'Kapitaenskajuete']
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(([runtime]) => {
    localStorage.setItem('kiu-v2-runtime', JSON.stringify(runtime));
    sessionStorage.setItem('kiu-v2-teacher-auth', '1');
  }, [RUNTIME]);
});

for (const [view, name] of ANSICHTEN) {
  test(`Ansicht ${name}`, async ({ page }) => {
    await page.goto(`#/${view}`);
    await page.waitForFunction(() => !!document.querySelector('.view.active'));
    await expect(page.locator(`#view-${view}`)).toHaveClass(/active/);
    await page.waitForTimeout(600);

    /* Bewegte und geraeteabhaengige Bereiche ausblenden:
       das animierte Schiff, die 3D-Schatzkammer und die eingebettete Karte. */
    const masken = [
      page.locator('.ship-scene-frame'),
      page.locator('#gems-canvas-wrap'),
      page.locator('#mapIframe')
    ];

    await expect(page).toHaveScreenshot(`${view}.png`, { fullPage: true, mask: masken });
  });
}

test('Router: gesperrte Ansicht wird nicht geoeffnet', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kiu-v2-runtime', JSON.stringify({ week: 1, resources: {}, studentUntil: 0, councilOpen: false, votes: {}, upgrades: {}, localLogbook: [] }));
  });
  await page.goto('#/karte');
  await page.waitForTimeout(500);
  await expect(page.locator('#view-deck')).toHaveClass(/active/);
});

test('Router: Zurueck-Geste funktioniert', async ({ page }) => {
  await page.goto('#/deck');
  await page.waitForTimeout(400);
  await page.locator('.nav-btn[data-view="missionen"]').click();
  await expect(page.locator('#view-missionen')).toHaveClass(/active/);
  await page.goBack();
  await expect(page.locator('#view-deck')).toHaveClass(/active/);
});

/* Phase 2 mit eingeschalteten Feature-Schaltern. Die Übersteuerung über
   die Adresszeile lässt den ausgelieferten Zustand unberührt. */
for (const [view, name] of [['deck', 'Deck'], ['missionen', 'Auftraege'], ['karte', 'Karte']]) {
  test(`Phase 2 aktiv – ${name}`, async ({ page }) => {
    await page.goto(`?ui=all#/${view}`);
    await page.waitForFunction(() => document.body.classList.contains('schriften'));
    await page.waitForTimeout(700);
    await expect(page).toHaveScreenshot(`${view}-ui-an.png`, {
      fullPage: true,
      mask: [page.locator('.ship-scene-frame'), page.locator('#gems-canvas-wrap'), page.locator('#mapIframe')]
    });
  });
}

test('Schiff zeigt freigeschaltete Ausbauten', async ({ page }) => {
  await page.addInitScript(() => {
    const stand = JSON.parse(localStorage.getItem('kiu-v2-runtime') || '{}');
    stand.upgrades = { kartenraum: true, beiboot: true, ausguck: false, werkstatt: false, lager: false, versammlung: false };
    localStorage.setItem('kiu-v2-runtime', JSON.stringify(stand));
  });
  await page.goto('?ui=all#/deck');
  const szene = await page.waitForSelector('.ship-scene-frame');
  const rahmen = await szene.contentFrame();
  await rahmen.waitForFunction(() => typeof window.aiuAusbauStatus === 'function');
  await page.waitForTimeout(1200);
  const status = await rahmen.evaluate(() => window.aiuAusbauStatus());
  expect(status.kartenraum).toBe(true);
  expect(status.beiboot).toBe(true);
  expect(status.ausguck).toBe(false);
});

test('Ohne Schalter bleibt das Schiff unveraendert', async ({ page }) => {
  await page.addInitScript(() => {
    const stand = JSON.parse(localStorage.getItem('kiu-v2-runtime') || '{}');
    stand.upgrades = { kartenraum: true, beiboot: true };
    localStorage.setItem('kiu-v2-runtime', JSON.stringify(stand));
  });
  await page.goto('#/deck');
  const szene = await page.waitForSelector('.ship-scene-frame');
  const rahmen = await szene.contentFrame();
  await rahmen.waitForFunction(() => typeof window.aiuAusbauStatus === 'function');
  await page.waitForTimeout(1200);
  const status = await rahmen.evaluate(() => window.aiuAusbauStatus());
  expect(Object.values(status).some(Boolean)).toBe(false);
});

/* Phase 3 – Spielgefühl */
test('Tonschalter ist gross genug und merkt sich den Zustand', async ({ page }) => {
  await page.goto('?ui=all#/deck');
  const knopf = page.locator('#soundToggle');
  await expect(knopf).toBeVisible();
  const feld = await knopf.boundingBox();
  expect(feld.height).toBeGreaterThanOrEqual(44);
  expect(feld.width).toBeGreaterThanOrEqual(44);
  await knopf.click();
  await expect(knopf).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.locator('#soundToggle')).toHaveAttribute('aria-pressed', 'false');
});

test('Ruhige Variante zeigt keine Partikel, aber die Meldung', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?ui=all#/deck');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.AIU_JUICE.funken(document.querySelector('.resource'), '#d0a642', 10);
    window.AIU_JUICE.meldung('Ruhige Rückmeldung', '✨');
  });
  await expect(page.locator('#toast')).toContainText('Ruhige Rückmeldung');
  const sichtbar = await page.evaluate(() => [...document.querySelectorAll('.juice-funke')]
    .filter(e => getComputedStyle(e).display !== 'none').length);
  expect(sichtbar).toBe(0);
});
