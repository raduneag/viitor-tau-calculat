// Rulare: node --experimental-strip-types --test tests/*.test.mjs
// Cifrele de control vin din referinta_cifre.mjs (planul v5). Toleranta 1 EUR,
// iar pentru scenariul A (884,40 in loc de 884 EUR) 25 EUR la anul 7.
import test from "node:test";
import assert from "node:assert/strict";
import { simuleaza, simuleazaLaRata, parametriImpliciti } from "../src/lib/simulation.ts";

const aproape = (real, asteptat, tol = 1, nume = "") =>
  assert.ok(Math.abs(real - asteptat) <= tol, `${nume} real ${real.toFixed(2)} vs asteptat ${asteptat} (tol ${tol})`);

const parinti = (a) => a.fondUrgenta + a.siguranta + a.crestere;
const scenariuB = () => ({ ...parametriImpliciti(), parintiContribuie: false });

test("scenariul A, anul 7", () => {
  const r = simuleaza(parametriImpliciti());
  const a = r.ani.at(-1);
  aproape(a.fondUrgenta, 15751, 1, "SAFE");
  aproape(a.siguranta, 37927, 25, "DEPOT");
  aproape(a.crestere, 70516, 25, "GROW");
  aproape(a.copii[0], 11399, 1, "JUNIOR");
  aproape(r.totalFinal, 146992, 25, "familie");
  aproape(r.totalContribuit, 122480, 25, "depus");
});

test("comparatia: cont la 0,7% si fara dobanda, scenariul A", () => {
  const p = parametriImpliciti();
  const r = simuleaza(p);
  const c = simuleazaLaRata(p, p.randamentStandard);
  aproape(c.totalFinal, 126467, 25, "familie la 0,7%");
  aproape(parinti(c.ani.at(-1)), 107785, 25, "parinti la 0,7%");
  aproape(parinti(r.ani.at(-1)) - parinti(c.ani.at(-1)), 16409, 25, "beneficiu parinti");
  aproape(r.totalFinal - c.totalFinal, 20526, 25, "beneficiu familie");
});

test("scenariul B (parintii nu contribuie), anul 7", () => {
  const r = simuleaza(scenariuB());
  const a = r.ani.at(-1);
  aproape(a.fondUrgenta, 15751, 1, "SAFE");
  aproape(a.siguranta, 17528, 1, "DEPOT");
  aproape(a.crestere, 22554, 1, "GROW");
  aproape(parinti(a), 55833, 1, "parinti");
  aproape(a.copii[0] + a.copii[1], 22798, 1, "JUNIOR ambii");
  aproape(r.totalFinal, 78632, 1, "familie");
});

test("pragul inflatiei, scenariul B, anul 7", () => {
  const p = scenariuB();
  const a = simuleazaLaRata(p, p.inflatie).ani.at(-1);
  aproape(parinti(a), 54596, 1, "prag");
});

test("randamente GROW 0/2/4/6/8, scenariul B", () => {
  const asteptat = { 0: 48279, 2: 50509, 4: 53018, 6: 55833, 8: 58986 };
  for (const [g, v] of Object.entries(asteptat)) {
    const r = simuleaza({ ...scenariuB(), randamentCrestere: Number(g) });
    aproape(parinti(r.ani.at(-1)), v, 1, `GROW ${g}%`);
  }
});

test("scadere de 25% in anul 5", () => {
  const soc = { activ: true, procent: 25, an: 5 };
  const b = simuleaza({ ...scenariuB(), soc });
  aproape(b.soc.growInainte, 20073, 1, "B inainte");
  aproape(b.soc.growDupa, 15055, 1, "B dupa");
  aproape(parinti(b.ani.at(-1)), 50195, 1, "B total");
  const a = simuleaza({ ...parametriImpliciti(), soc });
  aproape(a.soc.growInainte, 48770, 25, "A inainte");
  aproape(a.soc.growDupa, 36577, 25, "A dupa");
  aproape(parinti(a.ani.at(-1)), 110494, 25, "A total");
});

test("scaderea nu afecteaza SAFE, DEPOT si copiii, iar referintele ignora scaderea", () => {
  const fara = simuleaza(scenariuB());
  const p = { ...scenariuB(), soc: { activ: true, procent: 25, an: 5 } };
  const cu = simuleaza(p);
  const x = fara.ani.at(-1), y = cu.ani.at(-1);
  assert.equal(x.fondUrgenta, y.fondUrgenta);
  assert.equal(x.siguranta, y.siguranta);
  assert.deepEqual(x.copii, y.copii);
  assert.equal(simuleazaLaRata(p, 0.7).soc, null);
});
