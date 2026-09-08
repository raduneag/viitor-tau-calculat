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
};

export type Parametri = {
  orizontAni: number;
  randamentCrestere: number; // %
  randamentSiguranta: number; // %
  randamentStandard: number; // % - cont curent / Tagesgeld, folosit pentru comparatie
  fondUrgenta: number;
  capitalInitial: number;
  procentInitialCrestere: number; // 0-100
  faze: Faza[];
  copii: Copil[];
};

export type Dobanzi = {
  fondUrgenta: number;
  siguranta: number;
  crestere: number;
  copii: number[];
  total: number;
};

export type RandAn = {
  an: number;
  fondUrgenta: number;
  siguranta: number;
  crestere: number;
  copii: number[];
  totalParinti: number;
  totalFamilie: number;
  // Bani pusi deoparte din buzunar, cumulat pana la finalul acelui an.
  contribuitCumulat: number;
  // Dobanda (castigul din randamente) generata in cursul acelui an, pe fiecare pilon.
  dobanzi: Dobanzi;
};

export type ContribuitPiloni = {
  safe: number;
  depot: number;
  grow: number;
  copii: number[];
};

export type Rezultat = {
  ani: RandAn[];
  totalFinal: number;
  totalContribuit: number;
  castig: number;
  castigProcent: number;
  // Cat s-a pus din buzunar in fiecare pilon, pe tot orizontul.
  contribuitPiloni: ContribuitPiloni;
};

const VARSTA_MAJORAT = 18;
// Cu cati ani inainte de 18 se muta banii copilului integral in depozit bancar.
export const ANI_PROTECTIE = 2;
export const VARSTA_PROTECTIE = VARSTA_MAJORAT - ANI_PROTECTIE; // 16

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

function dobanziGoale(nrCopii: number): Dobanzi {
  return { fondUrgenta: 0, siguranta: 0, crestere: 0, copii: Array(nrCopii).fill(0), total: 0 };
}

export function simuleaza(p: Parametri): Rezultat {
  const totalLuni = p.orizontAni * 12;
  const rC = rataLunara(p.randamentCrestere);
  const rS = rataLunara(p.randamentSiguranta);
  // Pilon SAFE (fondul de urgenta) sta intr-un cont curent / Tagesgeld, deci creste
  // cu dobanda mica a contului standard, nu cu rata Pilonului DEPOT.
  const rSafe = rataLunara(p.randamentStandard);

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

  // Contributii cumulate pe fiecare pilon (bani pusi din buzunar, fara dobanda).
  const contribuitPiloni: ContribuitPiloni = {
    safe: p.fondUrgenta,
    grow: crestere,
    depot: siguranta,
    copii: p.copii.map((c) => c.sumaInitiala),
  };

  // Acumulatorul de dobanda pentru anul in curs.
  let dobAn = dobanziGoale(copii.length);

  const snapshot = (an: number, dob: Dobanzi): RandAn => {
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
      contribuitCumulat: totalContribuit,
      dobanzi: dob,
    };
  };

  const ani: RandAn[] = [snapshot(0, dobanziGoale(copii.length))];

  for (let luna = 1; luna <= totalLuni; luna++) {
    const faza = fazaPentruLuna(p.faze, luna, totalLuni);
    const contrib = faza ? faza.suma : 0;
    const spreCrestere = faza ? (contrib * faza.procentCrestere) / 100 : 0;
    const spreSiguranta = contrib - spreCrestere;

    const dobCrestere = crestere * rC;
    const dobSiguranta = siguranta * rS;
    const dobUrgenta = urgenta * rSafe;
    crestere = crestere + dobCrestere + spreCrestere;
    siguranta = siguranta + dobSiguranta + spreSiguranta;
    urgenta = urgenta + dobUrgenta;
    totalContribuit += contrib;
    contribuitPiloni.grow += spreCrestere;
    contribuitPiloni.depot += spreSiguranta;

    dobAn.crestere += dobCrestere;
    dobAn.siguranta += dobSiguranta;
    dobAn.fondUrgenta += dobUrgenta;

    copii.forEach((c, idx) => {
      if (luna > c.orizontLuni) return;
      const luniRamase = c.orizontLuni - luna + 1;
      if (!c.mutat && luniRamase <= ANI_PROTECTIE * 12) {
        c.siguranta += c.crestere;
        c.crestere = 0;
        c.mutat = true;
      }
      const pc = c.mutat ? 0 : c.cfg.procentCrestere;
      const cc = (c.cfg.contributieLunara * pc) / 100;
      const cs = c.cfg.contributieLunara - cc;
      const dc = c.crestere * rC;
      const ds = c.siguranta * rS;
      c.crestere = c.crestere + dc + cc;
      c.siguranta = c.siguranta + ds + cs;
      totalContribuit += c.cfg.contributieLunara;
      contribuitPiloni.copii[idx] = (contribuitPiloni.copii[idx] ?? 0) + c.cfg.contributieLunara;
      dobAn.copii[idx] = (dobAn.copii[idx] ?? 0) + dc + ds;
    });

    if (luna % 12 === 0) {
      dobAn.total =
        dobAn.fondUrgenta +
        dobAn.siguranta +
        dobAn.crestere +
        dobAn.copii.reduce((s, v) => s + v, 0);
      ani.push(snapshot(luna / 12, dobAn));
      dobAn = dobanziGoale(copii.length);
    }
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
    contribuitPiloni,
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
  randamentStandard: 0.7,
  fondUrgenta: 15000,
  capitalInitial: 25000,
  procentInitialCrestere: 50,
  faze: [{ id: "f1", luni: 999, suma: 500, procentCrestere: 70 }],
  copii: [
    {
      id: "c1",
      varsta: 4,
      sumaInitiala: 700,
      contributieLunara: 100,
      procentCrestere: 100,
    },
    {
      id: "c2",
      varsta: 1,
      sumaInitiala: 700,
      contributieLunara: 100,
      procentCrestere: 100,
    },
  ],
});
