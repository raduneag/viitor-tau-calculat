// Logica financiara pura, independenta de interfata.

export type Faza = {
  id: string;
  luni: number;
  suma: number;
  procentCrestere: number; // 0-100
};

export type Copil = {
  id: string;
  varsta: number;
  sumaInitiala: number;
  contributieLunara: number;
  procentCrestere: number; // 0-100
  aniProtectie: number;
};

export type Parametri = {
  orizontAni: number;
  randamentCrestere: number; // %
  randamentSiguranta: number; // %
  fondUrgenta: number;
  capitalInitial: number;
  procentInitialCrestere: number; // 0-100
  faze: Faza[];
  copii: Copil[];
  stressActiv: boolean;
  stressAn: number;
  stressProcent: number; // 0-50
  imobilActiv: boolean;
  pretImobil: number;
  procentAvans: number;
  procentCosturi: number;
};

export type RandAn = {
  an: number;
  fondUrgenta: number;
  siguranta: number;
  crestere: number;
  copii: number[];
  totalParinti: number;
  totalFamilie: number;
  acoperireImobil: number | null;
};

export type Rezultat = {
  ani: RandAn[];
  totalFinal: number;
  totalContribuit: number;
  castig: number;
  castigProcent: number;
  capitalNecesarImobil: number;
};

const VARSTA_MAJORAT = 18;

export const rataLunara = (randamentAnualProcent: number) =>
  Math.pow(1 + randamentAnualProcent / 100, 1 / 12) - 1;

function fazaPentruLuna(faze: Faza[], luna: number, totalLuni: number) {
  // luna: 1-based
  let start = 1;
  for (let i = 0; i < faze.length; i++) {
    const f = faze[i]!;
    const durata = i === faze.length - 1 ? Math.max(totalLuni - start + 1, 0) : f.luni;
    if (luna >= start && luna < start + durata) return f;
    start += durata;
  }
  return null;
}

export function simuleaza(p: Parametri): Rezultat {
  const totalLuni = p.orizontAni * 12;
  const rC = rataLunara(p.randamentCrestere);
  const rS = rataLunara(p.randamentSiguranta);

  let crestere = (p.capitalInitial * p.procentInitialCrestere) / 100;
  let siguranta = p.capitalInitial - crestere;
  let urgenta = p.fondUrgenta;

  const copii = p.copii.map((c) => ({
    cfg: c,
    crestere: (c.sumaInitiala * c.procentCrestere) / 100,
    siguranta: c.sumaInitiala - (c.sumaInitiala * c.procentCrestere) / 100,
    orizontLuni: Math.max(0, (VARSTA_MAJORAT - c.varsta) * 12),
    mutat: false,
  }));

  let totalContribuit =
    p.capitalInitial + p.fondUrgenta + p.copii.reduce((s, c) => s + c.sumaInitiala, 0);

  const capitalNecesarImobil =
    (p.pretImobil * p.procentAvans) / 100 + (p.pretImobil * p.procentCosturi) / 100;

  const snapshot = (an: number): RandAn => {
    const listaCopii = copii.map((c) => c.crestere + c.siguranta);
    const totalParinti = crestere + siguranta;
    return {
      an,
      fondUrgenta: urgenta,
      siguranta,
      crestere,
      copii: listaCopii,
      totalParinti,
      totalFamilie: totalParinti + urgenta + listaCopii.reduce((s, v) => s + v, 0),
      acoperireImobil:
        p.imobilActiv && capitalNecesarImobil > 0
          ? (totalParinti / capitalNecesarImobil) * 100
          : null,
    };
  };

  const ani: RandAn[] = [snapshot(0)];

  for (let luna = 1; luna <= totalLuni; luna++) {
    // Corectie de piata la inceputul anului selectat
    if (p.stressActiv && luna === (p.stressAn - 1) * 12 + 1) {
      const f = 1 - p.stressProcent / 100;
      crestere *= f;
      copii.forEach((c) => {
        c.crestere *= f;
      });
    }

    const faza = fazaPentruLuna(p.faze, luna, totalLuni);
    const contrib = faza ? faza.suma : 0;
    const spreCrestere = faza ? (contrib * faza.procentCrestere) / 100 : 0;
    const spreSiguranta = contrib - spreCrestere;

    crestere = crestere * (1 + rC) + spreCrestere;
    siguranta = siguranta * (1 + rS) + spreSiguranta;
    urgenta = urgenta * (1 + rS);
    totalContribuit += contrib;

    for (const c of copii) {
      if (luna > c.orizontLuni) continue;
      const luniRamase = c.orizontLuni - luna + 1;
      if (!c.mutat && luniRamase <= c.cfg.aniProtectie * 12) {
        c.siguranta += c.crestere;
        c.crestere = 0;
        c.mutat = true;
      }
      const pc = c.mutat ? 0 : c.cfg.procentCrestere;
      const cc = (c.cfg.contributieLunara * pc) / 100;
      const cs = c.cfg.contributieLunara - cc;
      c.crestere = c.crestere * (1 + rC) + cc;
      c.siguranta = c.siguranta * (1 + rS) + cs;
      totalContribuit += c.cfg.contributieLunara;
    }

    if (luna % 12 === 0) ani.push(snapshot(luna / 12));
  }

  const ultim = ani[ani.length - 1]!;
  const totalFinal = ultim.totalFamilie;
  const castig = totalFinal - totalContribuit;

  return {
    ani,
    totalFinal,
    totalContribuit,
    castig,
    castigProcent: totalContribuit > 0 ? (castig / totalContribuit) * 100 : 0,
    capitalNecesarImobil,
  };
}

export const formatEUR = (v: number) =>
  new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + " EUR";

export const formatProcent = (v: number) =>
  new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v) +
  " %";

export const parametriImpliciti = (): Parametri => ({
  orizontAni: 7,
  randamentCrestere: 6,
  randamentSiguranta: 2.7,
  fondUrgenta: 15000,
  capitalInitial: 25000,
  procentInitialCrestere: 50,
  faze: [
    { id: "f1", luni: 12, suma: 500, procentCrestere: 50 },
    { id: "f2", luni: 27, suma: 500, procentCrestere: 70 },
    { id: "f3", luni: 999, suma: 884.4, procentCrestere: 70 },
  ],
  copii: [
    {
      id: "c1",
      varsta: 4,
      sumaInitiala: 700,
      contributieLunara: 100,
      procentCrestere: 100,
      aniProtectie: 2,
    },
    {
      id: "c2",
      varsta: 1,
      sumaInitiala: 700,
      contributieLunara: 100,
      procentCrestere: 100,
      aniProtectie: 2,
    },
  ],
  stressActiv: false,
  stressAn: 3,
  stressProcent: 25,
  imobilActiv: false,
  pretImobil: 600000,
  procentAvans: 20,
  procentCosturi: 6.5,
});
