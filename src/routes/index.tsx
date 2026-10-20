import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HelpCircle, ChevronDown } from "lucide-react";

import {
  Parametri,
  formatEUR,
  formatProcent,
  luniPanaLaMajorat,
  parametriImpliciti,
  simuleaza,
  valoareFinalaSimpla,
} from "@/lib/simulation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planul de economisire si investitii al familiei Neag" },
      {
        name: "description",
        content:
          "Simuleaza in timp real cum creste capitalul familiei Neag pe piloane: SAFE, DEPOT, GROW si conturile junior ale copiilor.",
      },
      { property: "og:title", content: "Planul de economisire si investitii al familiei Neag" },
      {
        property: "og:description",
        content:
          "Instrument personal de explorare: orizont pana la 20 de ani, contributii lunare si conturi pentru copii.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// Culoare distincta pentru fiecare pilon: SAFE albastru, DEPOT auriu, GROW verde,
// JUNIOR violet; ultimele doua sunt pentru liniile de scenarii salvate.
const CULORI = ["#2563eb", "#d97706", "#16a34a", "#9333ea", "#0d9488", "#db2777"];

const NUME_COPII = ["Oscar", "Luca"];

const PILON_SAFE = "Pilon SAFE";
const PILON_DEPOT = "Pilon DEPOT";
const PILON_GROW = "Pilon GROW";
const PILON_JUNIOR = "Pilon JUNIOR / copil";

const LEGENDA_PILONI: { nume: string; descriere: string; culoare: string }[] = [
  {
    nume: `${PILON_SAFE} (de neatins)`,
    descriere:
      "Fondul de urgenta, tinut intr-un cont curent (Tagesgeld). Nu se atinge si creste doar cu dobanda mica a contului standard.",
    culoare: CULORI[0]!,
  },
  {
    nume: PILON_DEPOT,
    descriere: "Cont depozit bancar. Randament mic, dar stabil.",
    culoare: CULORI[1]!,
  },
  {
    nume: PILON_GROW,
    descriere: "Bani investiti in ETF. Randament mai mare, dar cu fluctuatii.",
    culoare: CULORI[2]!,
  },
  {
    nume: "Pilon JUNIOR Oscar / Pilon JUNIOR Luca",
    descriere: "Conturile junior ale copiilor. La 16 ani trec automat in depozit bancar.",
    culoare: CULORI[3]!,
  },
];

function Ajutor({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Explicatie"
          className="text-muted-foreground/70 hover:text-primary"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  );
}

function CampNumar({
  eticheta,
  ajutor,
  valoare,
  onChange,
  sufix,
  pas = 1,
  disabled = false,
}: {
  eticheta: string;
  ajutor?: string;
  valoare: number;
  onChange: (v: number) => void;
  sufix?: string;
  pas?: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {eticheta} {ajutor ? <Ajutor text={ajutor} /> : null}
      </Label>
      <div className="relative">
        <Input
          type="number"
          step={pas}
          value={Number.isFinite(valoare) ? valoare : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="pr-12 disabled:opacity-50"
        />
        {sufix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {sufix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CampSlider({
  eticheta,
  ajutor,
  valoare,
  min,
  max,
  pas = 1,
  unitate = "%",
  onChange,
  disabled = false,
}: {
  eticheta: string;
  ajutor?: string;
  valoare: number;
  min: number;
  max: number;
  pas?: number;
  unitate?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {eticheta} {ajutor ? <Ajutor text={ajutor} /> : null}
        </Label>
        <span className="text-sm font-medium tabular-nums">
          {valoare.toLocaleString("ro-RO")}
          {unitate ? ` ${unitate}` : ""}
        </span>
      </div>
      <Slider
        value={[valoare]}
        min={min}
        max={max}
        step={pas}
        onValueChange={(v) => onChange(v[0] ?? min)}
        disabled={disabled}
        className={disabled ? "opacity-50" : undefined}
      />
    </div>
  );
}

type TooltipGrafic = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number;
    color?: string;
    payload?: Record<string, number>;
  }>;
};

function TooltipCapital({ active, label, payload }: TooltipGrafic) {
  if (!active || !payload?.length) return null;
  const rand = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-card p-2.5 text-xs shadow-sm">
      <p className="mb-1 font-medium">Anul {label}</p>
      <ul className="space-y-0.5">
        {payload.map((e) => (
          <li key={String(e.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: e.color }}
              />
              {e.name}
            </span>
            <span className="tabular-nums">{formatEUR(Number(e.value ?? 0))}</span>
          </li>
        ))}
      </ul>
      {rand ? (
        <div className="mt-1.5 space-y-0.5 border-t pt-1.5 text-muted-foreground">
          <div className="flex items-center justify-between gap-4">
            <span>Total SAFE + DEPOT + GROW</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatEUR(rand["totalParinti"] ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Total JUNIOR ({NUME_COPII.join(" + ")})</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatEUR(rand["totalJunior"] ?? 0)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Scenariu = { nume: string; parametri: Parametri };

function Index() {
  const [p, setP] = useState<Parametri>(parametriImpliciti);
  const [scenarii, setScenarii] = useState<Scenariu[]>([]);
  const [tabelDeschis, setTabelDeschis] = useState(false);
  const [dobanziDeschis, setDobanziDeschis] = useState(false);

  const set = <K extends keyof Parametri>(k: K, v: Parametri[K]) => setP((s) => ({ ...s, [k]: v }));

  const rez = useMemo(() => simuleaza(p), [p]);
  const rezScenarii = useMemo(
    () => scenarii.map((s) => ({ nume: s.nume, rez: simuleaza(s.parametri) })),
    [scenarii],
  );

  const dateGrafic = useMemo(() => {
    return rez.ani.map((a) => {
      const rand: Record<string, number> = {
        an: a.an,
        urgenta: +a.fondUrgenta.toFixed(2),
        siguranta: +a.siguranta.toFixed(2),
        crestere: +a.crestere.toFixed(2),
        // O singura linie pentru copii - planul e identic, valoarea e per copil.
        copil: +(a.copii[0] ?? 0).toFixed(2),
        // Doar pentru tooltip (nu sunt linii pe grafic).
        totalParinti: +(a.fondUrgenta + a.siguranta + a.crestere).toFixed(2),
        totalJunior: +a.copii.reduce((s, v) => s + v, 0).toFixed(2),
      };
      rezScenarii.forEach((s, si) => {
        const val = s.rez.ani[a.an]?.totalFamilie;
        if (val !== undefined) rand[`scenariu${si}`] = +val.toFixed(2);
      });
      return rand;
    });
  }, [rez, rezScenarii]);

  const piloniRezumat = useMemo(() => {
    const a = rez.ani[rez.ani.length - 1];
    const cb = rez.contribuitPiloni;
    const mk = (nume: string, culoare: string, valoare: number, contribuit: number) => {
      const dobanda = valoare - contribuit;
      return {
        nume,
        culoare,
        valoare,
        contribuit,
        dobanda,
        crestereProcent: contribuit > 0 ? (dobanda / contribuit) * 100 : 0,
      };
    };
    if (!a) return [];
    return [
      mk(PILON_SAFE, CULORI[0]!, a.fondUrgenta, cb.safe),
      mk(PILON_DEPOT, CULORI[1]!, a.siguranta, cb.depot),
      mk(PILON_GROW, CULORI[2]!, a.crestere, cb.grow),
      mk(PILON_JUNIOR, CULORI[3]!, a.copii[0] ?? 0, cb.copii[0] ?? 0),
    ];
  }, [rez]);

  // Acelasi plan (aceleasi depuneri, pentru toata familia), dar capitalizat la rata
  // contului standard in loc de randamentele reale - pentru linia 2 a comparatiei.
  const rezStandard = useMemo(
    () =>
      simuleaza({
        ...p,
        randamentCrestere: p.randamentStandard,
        randamentSiguranta: p.randamentStandard,
        corectieActiva: false,
      }),
    [p],
  );

  // Comparatie, la nivel de intreaga familie: cu planul, fata de aceleasi depuneri
  // lasate intr-un cont standard, fata de suma bruta fara nicio dobanda (doar reper).
  const comparatie = useMemo(() => {
    const a = rez.ani[rez.ani.length - 1];
    const aStd = rezStandard.ani[rezStandard.ani.length - 1];
    const cuPlanul = a ? a.totalFamilie : 0;
    const contStandard = aStd ? aStd.totalFamilie : 0;
    const faraDobanda = rez.totalContribuit;
    const castig = cuPlanul - contStandard;
    const pragInflatie =
      (p.capitalInitial + p.fondUrgenta) * Math.pow(1 + p.randamentInflatie / 100, p.orizontAni);
    return {
      cuPlanul,
      contStandard,
      faraDobanda,
      castig,
      castigProcent: contStandard > 0 ? (castig / contStandard) * 100 : 0,
      pragInflatie,
    };
  }, [rez, rezStandard, p.capitalInitial, p.fondUrgenta, p.randamentInflatie, p.orizontAni]);

  // Comparatie pentru copii: cat ar fi ajuns aceiasi bani (suma stransa + contributia
  // lunara) pana la 18 ani, intr-un cont standard sau intr-un ETF, fata de cat s-a depus
  // efectiv. Independenta de orizontul de simulare ales mai sus.
  const comparatieCopii = useMemo(() => {
    return p.copii.map((c, i) => {
      const nrLuni = luniPanaLaMajorat(c.varsta);
      return {
        nume: NUME_COPII[i] ?? `Copilul ${i + 1}`,
        ani: nrLuni / 12,
        depus: c.sumaInitiala + c.contributieLunara * nrLuni,
        tagesgeld: valoareFinalaSimpla(
          c.sumaInitiala,
          c.contributieLunara,
          nrLuni,
          p.randamentStandard,
        ),
        etf4: valoareFinalaSimpla(c.sumaInitiala, c.contributieLunara, nrLuni, 4),
        etf6: valoareFinalaSimpla(c.sumaInitiala, c.contributieLunara, nrLuni, 6),
      };
    });
  }, [p.copii, p.randamentStandard]);

  const comparatieCopiiTotal = useMemo(
    () =>
      comparatieCopii.reduce(
        (acc, c) => ({
          depus: acc.depus + c.depus,
          tagesgeld: acc.tagesgeld + c.tagesgeld,
          etf4: acc.etf4 + c.etf4,
          etf6: acc.etf6 + c.etf6,
        }),
        { depus: 0, tagesgeld: 0, etf4: 0, etf6: 0 },
      ),
    [comparatieCopii],
  );

  const dobanziGrafic = useMemo(
    () =>
      rez.ani
        .filter((a) => a.an > 0)
        .map((a) => ({
          an: a.an,
          safe: +a.dobanzi.fondUrgenta.toFixed(2),
          depot: +a.dobanzi.siguranta.toFixed(2),
          grow: +a.dobanzi.crestere.toFixed(2),
          junior: +(a.dobanzi.copii[0] ?? 0).toFixed(2),
        })),
    [rez],
  );

  const salveazaScenariu = () => {
    if (scenarii.length >= 3) return;
    const nume = `Scenariul ${String.fromCharCode(65 + scenarii.length)}`;
    setScenarii((s) => [...s, { nume, parametri: structuredClone(p) }]);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Instrument personal de explorare
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Planul de economisire si investitii al familiei Neag
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Modifica parametrii si vezi imediat cum evolueaza fiecare parte a capitalului familiei.
            Totul se calculeaza direct in acest dispozitiv, nimic nu se salveaza.
          </p>
        </header>

        {/* Legenda pilonilor */}
        <section className="mb-8 rounded-xl border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cei patru piloni
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {LEGENDA_PILONI.map((pilon) => (
              <div key={pilon.nume} className="flex flex-col gap-0.5">
                <dt className="flex items-center gap-1.5 text-sm font-semibold">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: pilon.culoare }}
                  />
                  {pilon.nume}
                </dt>
                <dd className="text-xs text-muted-foreground">{pilon.descriere}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Panou sumar */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                Capital total la finalul celor {p.orizontAni} ani
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                {formatEUR(rez.totalFinal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Bani pusi deoparte din buzunar</p>
              <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
                {formatEUR(rez.totalContribuit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Adaugat de randamente</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-profit sm:text-2xl">
                {formatEUR(rez.castig)}
              </p>
              <p className="text-xs text-muted-foreground">{formatProcent(rez.castigProcent)}</p>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Parametri */}
          <div className="space-y-4">
            <Accordion
              type="multiple"
              defaultValue={["general", "contributii"]}
              className="space-y-3"
            >
              <AccordionItem value="general" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Setari generale
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <CampSlider
                    eticheta="Cati ani simulam"
                    ajutor="Perioada pe care vrei sa vezi evolutia banilor, intre 1 si 20 de ani."
                    valoare={p.orizontAni}
                    min={1}
                    max={20}
                    unitate="ani"
                    onChange={(v) => set("orizontAni", v)}
                  />
                  <div className="space-y-2">
                    <CampSlider
                      eticheta="Randament anual Pilon GROW"
                      ajutor="Cat presupunem ca aduce, in medie pe an, partea investita in ETF de actiuni la nivel global. Randamentul GROW e singura necunoscuta reala a planului."
                      valoare={p.randamentCrestere}
                      min={0}
                      max={12}
                      pas={0.1}
                      onChange={(v) => set("randamentCrestere", v)}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 2, 4, 6, 8].map((v) => (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={p.randamentCrestere === v ? "default" : "outline"}
                          className="h-7 px-2.5 text-xs"
                          onClick={() => set("randamentCrestere", v)}
                        >
                          {v}%
                        </Button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      4% este scenariul prudent folosit ca referinta in document.
                    </p>
                  </div>
                  <CampSlider
                    eticheta="Randament anual Pilon DEPOT"
                    ajutor="Pilon DEPOT sunt banii tinuti in depozit bancar sau fonduri de piata monetara: castig mic, dar stabil."
                    valoare={p.randamentSiguranta}
                    min={0}
                    max={6}
                    pas={0.1}
                    onChange={(v) => set("randamentSiguranta", v)}
                  />
                  <CampSlider
                    eticheta="Randament cont standard (Tagesgeld)"
                    ajutor="Dobanda unui cont curent obisnuit. Se aplica direct la Pilon SAFE (fondul de urgenta sta acolo, si creste doar cu aceasta rata)."
                    valoare={p.randamentStandard}
                    min={0}
                    max={6}
                    pas={0.05}
                    onChange={(v) => set("randamentStandard", v)}
                  />
                  <CampSlider
                    eticheta="Rata inflatiei (prag de referinta)"
                    ajutor="Cat trebuie sa creasca capitalul initial al parintilor doar ca sa isi pastreze puterea de cumparare. Nu afecteaza simularea, e doar un reper in cardul de comparatie."
                    valoare={p.randamentInflatie}
                    min={0}
                    max={6}
                    pas={0.1}
                    onChange={(v) => set("randamentInflatie", v)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="urgenta" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Pilon SAFE si capital initial
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <CampNumar
                    eticheta="Pilon SAFE (de neatins)"
                    ajutor="Fondul de urgenta. Bani de siguranta pentru situatii neprevazute, nu se ating, cresc doar din dobanda."
                    valoare={p.fondUrgenta}
                    sufix="EUR"
                    pas={100}
                    onChange={(v) => set("fondUrgenta", v)}
                  />
                  <CampNumar
                    eticheta="Bani disponibili acum pentru investit"
                    valoare={p.capitalInitial}
                    sufix="EUR"
                    pas={100}
                    onChange={(v) => set("capitalInitial", v)}
                  />
                  <CampSlider
                    eticheta="Din acesti bani, cat merge spre Pilon GROW"
                    ajutor="Restul procentului merge automat spre Pilon DEPOT."
                    valoare={p.procentInitialCrestere}
                    min={0}
                    max={100}
                    onChange={(v) => set("procentInitialCrestere", v)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contributii" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Cat economisiti lunar
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <p className="text-xs text-muted-foreground">
                    Suma lunara pe care o pui deoparte pe toata perioada simulata. Durata este data
                    de numarul de ani ales la „Setari generale". Pune 0 daca parintii nu mai
                    contribuie lunar.
                  </p>
                  <CampNumar
                    eticheta="Suma lunara"
                    valoare={p.faze[0]?.suma ?? 0}
                    sufix="EUR"
                    pas={10}
                    onChange={(v) =>
                      set(
                        "faze",
                        p.faze.map((x, i) => (i === 0 ? { ...x, suma: v } : x)),
                      )
                    }
                  />
                  <CampSlider
                    eticheta="Cat din suma merge spre Pilon GROW"
                    valoare={p.faze[0]?.procentCrestere ?? 0}
                    min={0}
                    max={100}
                    onChange={(v) =>
                      set(
                        "faze",
                        p.faze.map((x, i) => (i === 0 ? { ...x, procentCrestere: v } : x)),
                      )
                    }
                  />

                  {p.bonusuri[0] ? (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-xs font-semibold">Suma aditionala</p>
                      <p className="text-xs text-muted-foreground">
                        O suma single care se pune deoparte si se investeste in Pilon GROW; de
                        exemplu un bonus sau un castig extra. Se adauga o data pe an, in luna aleasa
                        mai jos. Suma 0 inseamna ca nu e folosita.
                      </p>
                      <CampNumar
                        eticheta="Suma"
                        valoare={p.bonusuri[0].suma}
                        sufix="EUR"
                        pas={50}
                        onChange={(v) =>
                          set(
                            "bonusuri",
                            p.bonusuri.map((x, i) => (i === 0 ? { ...x, suma: v } : x)),
                          )
                        }
                      />
                      <CampSlider
                        eticheta="In ce luna a planului vine, apoi se repeta anual"
                        ajutor="Luna 1 e prima luna a planului, nu neaparat ianuarie. De exemplu, daca planul incepe in octombrie si suma vine in martie, alege luna 6."
                        valoare={p.bonusuri[0].lunaInCicluAnual}
                        min={1}
                        max={12}
                        unitate="din ciclul anual"
                        onChange={(v) =>
                          set(
                            "bonusuri",
                            p.bonusuri.map((x, i) => (i === 0 ? { ...x, lunaInCicluAnual: v } : x)),
                          )
                        }
                      />
                    </div>
                  ) : null}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="copii" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">Copii</AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  {p.copii.map((c, i) => (
                    <div key={c.id} className="space-y-4 rounded-lg border border-dashed p-3">
                      <p className="text-xs font-semibold">
                        Pilon JUNIOR {NUME_COPII[i] ?? `Copil ${i + 1}`}
                      </p>
                      <CampNumar
                        eticheta="Varsta acum"
                        ajutor="Perioada de economisire se calculeaza pana la 18 ani."
                        valoare={c.varsta}
                        sufix="ani"
                        onChange={(v) =>
                          set(
                            "copii",
                            p.copii.map((x) => (x.id === c.id ? { ...x, varsta: v } : x)),
                          )
                        }
                      />
                      <CampNumar
                        eticheta="Suma deja stransa"
                        valoare={c.sumaInitiala}
                        sufix="EUR"
                        pas={50}
                        onChange={(v) =>
                          set(
                            "copii",
                            p.copii.map((x) => (x.id === c.id ? { ...x, sumaInitiala: v } : x)),
                          )
                        }
                      />
                      <CampNumar
                        eticheta="Suma lunara"
                        valoare={c.contributieLunara}
                        sufix="EUR"
                        pas={10}
                        onChange={(v) =>
                          set(
                            "copii",
                            p.copii.map((x) =>
                              x.id === c.id ? { ...x, contributieLunara: v } : x,
                            ),
                          )
                        }
                      />
                      <CampSlider
                        eticheta="Cat merge spre Pilon GROW"
                        valoare={c.procentCrestere}
                        min={0}
                        max={100}
                        onChange={(v) =>
                          set(
                            "copii",
                            p.copii.map((x) => (x.id === c.id ? { ...x, procentCrestere: v } : x)),
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Nota: la 16 ani, toti banii copilului trec automat in Pilon DEPOT (depozit
                        bancar), ca sa nu depinda de bursa in ultimii ani inainte de 18.
                      </p>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="scadere" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Ce se intampla la o scadere
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      Aplica o scadere de piata{" "}
                      <Ajutor text="Simuleaza o scadere brusca a bursei, o singura data, intr-un anumit an. Afecteaza doar Pilonul GROW: al parintilor si al copiilor care nu au trecut inca la partea sigura (dupa 16 ani)." />
                    </Label>
                    <Switch
                      checked={p.corectieActiva}
                      onCheckedChange={(v) => set("corectieActiva", v)}
                    />
                  </div>
                  {p.corectieActiva ? (
                    <>
                      <CampSlider
                        eticheta="In ce an are loc scaderea"
                        valoare={Math.min(p.corectieAn, p.orizontAni)}
                        min={1}
                        max={p.orizontAni}
                        unitate="an"
                        onChange={(v) => set("corectieAn", v)}
                      />
                      <CampSlider
                        eticheta="Cat de mare e scaderea"
                        valoare={p.corectieProcent}
                        min={0}
                        max={50}
                        onChange={(v) => set("corectieProcent", v)}
                      />
                      <p className="text-xs text-muted-foreground">
                        La inceputul anului ales, Pilon GROW scade instantaneu cu procentul de mai
                        sus, apoi continua sa creasca normal, cu randamentul setat.
                      </p>
                    </>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-wrap gap-2">
              <Button onClick={salveazaScenariu} disabled={scenarii.length >= 3}>
                Salveaza acest scenariu
              </Button>
              {scenarii.length > 0 ? (
                <Button variant="ghost" onClick={() => setScenarii([])}>
                  Sterge scenariile
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setP(parametriImpliciti())}>
                Reseteaza
              </Button>
            </div>
          </div>

          {/* Rezultate */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolutia capitalului</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dateGrafic} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.07)" />
                      <XAxis
                        dataKey="an"
                        tickFormatter={(v) => `An ${v}`}
                        fontSize={11}
                        stroke="currentColor"
                        className="text-muted-foreground"
                      />
                      <YAxis
                        fontSize={11}
                        width={70}
                        tickFormatter={(v) =>
                          new Intl.NumberFormat("ro-RO", { notation: "compact" }).format(Number(v))
                        }
                        stroke="currentColor"
                        className="text-muted-foreground"
                      />
                      <ChartTooltip content={<TooltipCapital />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="urgenta"
                        name={PILON_SAFE}
                        stroke={CULORI[0]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="siguranta"
                        name={PILON_DEPOT}
                        stroke={CULORI[1]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="crestere"
                        name={PILON_GROW}
                        stroke={CULORI[2]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="copil"
                        name={PILON_JUNIOR}
                        stroke={CULORI[3]}
                        strokeWidth={2}
                        dot={false}
                      />
                      {rezScenarii.map((s, i) => (
                        <Line
                          key={s.nume}
                          type="monotone"
                          dataKey={`scenariu${i}`}
                          name={`${s.nume} (total)`}
                          stroke={CULORI[(i + 4) % CULORI.length]}
                          strokeDasharray="5 4"
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fiecare linie = un pilon, cu planul de investitii. Linia „Pilon JUNIOR / copil"
                  arata valoarea unui singur cont ({NUME_COPII.join(" si ")} au acelasi plan); in
                  „Total familie" sunt numarati ambii copii.
                </p>
              </CardContent>
            </Card>

            {/* Cu planul vs. aceleasi depuneri intr-un cont standard */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Cu planul vs. fara investitii, la finalul celor {p.orizontAni} ani
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Intreaga familie (toti cei patru piloni). Contul ING plateste{" "}
                  {formatProcent(p.randamentStandard)} oricum &mdash; comparatia corecta nu e cu
                  banii sub saltea, ci cu aceleasi depuneri lasate intr-un cont standard.
                </p>
                {[
                  { nume: "Cu planul", val: comparatie.cuPlanul, cls: "bg-profit" },
                  {
                    nume: `Aceleasi depuneri, intr-un cont la ${formatProcent(p.randamentStandard)}`,
                    val: comparatie.contStandard,
                    cls: "bg-muted-foreground/40",
                  },
                ].map((r) => {
                  const maxv = Math.max(comparatie.cuPlanul, comparatie.contStandard, 1);
                  return (
                    <div key={r.nume} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{r.nume}</span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatEUR(r.val)}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${r.cls}`}
                          style={{ width: `${(r.val / maxv) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-lg bg-profit/10 p-3">
                  <p className="text-sm font-semibold tabular-nums text-profit">
                    + {formatEUR(comparatie.castig)} ({formatProcent(comparatie.castigProcent)})
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    In plus fata de un cont standard, cu exact aceleasi depuneri.
                  </p>
                </div>
                <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <span>Fara nicio dobanda (doar ca reper, suma bruta pusa deoparte)</span>
                    <span className="tabular-nums font-medium text-destructive">
                      {formatEUR(comparatie.faraDobanda)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>
                      Prag inflatie, {formatProcent(p.randamentInflatie)} pe an (capitalul initial
                      al parintilor, ca sa isi pastreze puterea de cumparare)
                    </span>
                    <span className="tabular-nums">{formatEUR(comparatie.pragInflatie)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ce aduce fiecare pilon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Ce aduce fiecare pilon, la finalul celor {p.orizontAni} ani
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-xs text-muted-foreground">
                  Bara arata cat ai pus din buzunar (culoarea pilonului) si cat s-a adaugat din
                  dobanzi (verde).
                </p>
                {piloniRezumat.map((pil) => {
                  const total = pil.valoare > 0 ? pil.valoare : 1;
                  const pctContribuit = Math.max(0, Math.min(100, (pil.contribuit / total) * 100));
                  return (
                    <div key={pil.nume} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: pil.culoare }}
                          />
                          {pil.nume}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatEUR(pil.valoare)}
                        </span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          style={{
                            width: `${pctContribuit}%`,
                            background: pil.culoare,
                            opacity: 0.55,
                          }}
                        />
                        <div className="bg-profit" style={{ width: `${100 - pctContribuit}%` }} />
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Pus deoparte: {formatEUR(pil.contribuit)}</span>
                        <span className="font-medium text-profit">
                          + {formatEUR(pil.dobanda)} din dobanzi (
                          {formatProcent(pil.crestereProcent)})
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Randamentul „Pilon JUNIOR / copil" e per copil; suma se aplica si lui Oscar, si
                  lui Luca.
                </p>
              </CardContent>
            </Card>

            {/* Comparatie pentru copii, la 18 ani */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparatie pentru copii, la 18 ani</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <p className="mb-3 text-xs text-muted-foreground">
                  Cat ar ajunge aceeasi suma stransa plus contributia lunara, pana la 18 ani, in
                  diverse scenarii. Independent de orizontul de simulare ales mai sus.{" "}
                  <span className="text-destructive">Rosu</span> = banii stau nemiscati, fara nicio
                  dobanda. <span className="text-profit">Verde</span> = banii sunt investiti undeva.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-right">Depus efectiv</TableHead>
                      <TableHead className="text-right">
                        Tagesgeld {formatProcent(p.randamentStandard)}
                      </TableHead>
                      <TableHead className="text-right">ETF la 4%</TableHead>
                      <TableHead className="text-right">ETF la 6%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparatieCopii.map((c) => (
                      <TableRow key={c.nume}>
                        <TableCell className="font-medium">
                          {c.nume}
                          <span className="ml-1 font-normal text-muted-foreground">
                            ({c.ani.toLocaleString("ro-RO")} ani pana la 18)
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {formatEUR(c.depus)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-profit">
                          {formatEUR(c.tagesgeld)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-profit">
                          {formatEUR(c.etf4)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-profit">
                          {formatEUR(c.etf6)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">Impreuna</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-destructive">
                        {formatEUR(comparatieCopiiTotal.depus)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-profit">
                        {formatEUR(comparatieCopiiTotal.tagesgeld)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-profit">
                        {formatEUR(comparatieCopiiTotal.etf4)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-profit">
                        {formatEUR(comparatieCopiiTotal.etf6)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {rezScenarii.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comparatie de scenarii</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenariu</TableHead>
                        <TableHead className="text-right">Total final</TableHead>
                        <TableHead className="text-right">Contribuit</TableHead>
                        <TableHead className="text-right">Castig</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[{ nume: "Scenariul actual", rez }, ...rezScenarii].map((s) => (
                        <TableRow key={s.nume}>
                          <TableCell className="font-medium">{s.nume}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEUR(s.rez.totalFinal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEUR(s.rez.totalContribuit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEUR(s.rez.castig)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setTabelDeschis((v) => !v)}
                >
                  <CardTitle className="text-base">Detalii an cu an</CardTitle>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${tabelDeschis ? "rotate-180" : ""}`}
                  />
                </button>
              </CardHeader>
              {tabelDeschis ? (
                <CardContent className="overflow-x-auto">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Valoarea fiecarui pilon la finalul fiecarui an. „Din dobanzi" = cat din „Total
                    familie" e castig din randamente, restul fiind bani pusi din buzunar. Coloana
                    JUNIOR e per copil; „Total familie" include ambii copii.
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>An</TableHead>
                        <TableHead className="text-right">{PILON_SAFE}</TableHead>
                        <TableHead className="text-right">{PILON_DEPOT}</TableHead>
                        <TableHead className="text-right">{PILON_GROW}</TableHead>
                        <TableHead className="text-right">JUNIOR / copil</TableHead>
                        <TableHead className="text-right">Total familie</TableHead>
                        <TableHead className="text-right">Din dobanzi</TableHead>
                        <TableHead className="text-right">Randament</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rez.ani.map((a) => {
                        const dinDobanzi = a.totalFamilie - a.contribuitCumulat;
                        const randament =
                          a.contribuitCumulat > 0 ? (dinDobanzi / a.contribuitCumulat) * 100 : 0;
                        return (
                          <TableRow key={a.an}>
                            <TableCell className="font-medium">{a.an}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatEUR(a.fondUrgenta)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatEUR(a.siguranta)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatEUR(a.crestere)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatEUR(a.copii[0] ?? 0)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatEUR(a.totalFamilie)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-profit">
                              + {formatEUR(dinDobanzi)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-profit">
                              + {formatProcent(randament)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader>
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setDobanziDeschis((v) => !v)}
                >
                  <CardTitle className="text-base">Profit din dobanzi, an cu an</CardTitle>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${dobanziDeschis ? "rotate-180" : ""}`}
                  />
                </button>
              </CardHeader>
              {dobanziDeschis ? (
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Cati bani a produs fiecare pilon din randamente, an de an (fara banii pusi din
                    buzunar). Bara mai inalta la GROW = investitia lucreaza mai mult. JUNIOR e per
                    copil.
                  </p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dobanziGrafic}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(0 0% 0% / 0.07)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="an"
                          tickFormatter={(v) => `An ${v}`}
                          fontSize={11}
                          stroke="currentColor"
                          className="text-muted-foreground"
                        />
                        <YAxis
                          fontSize={11}
                          width={70}
                          tickFormatter={(v) =>
                            new Intl.NumberFormat("ro-RO", { notation: "compact" }).format(
                              Number(v),
                            )
                          }
                          stroke="currentColor"
                          className="text-muted-foreground"
                        />
                        <ChartTooltip
                          formatter={(v: number) => formatEUR(Number(v))}
                          labelFormatter={(l) => `Anul ${l}`}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="safe" stackId="d" name={PILON_SAFE} fill={CULORI[0]} />
                        <Bar dataKey="depot" stackId="d" name={PILON_DEPOT} fill={CULORI[1]} />
                        <Bar dataKey="grow" stackId="d" name={PILON_GROW} fill={CULORI[2]} />
                        <Bar
                          dataKey="junior"
                          stackId="d"
                          name={PILON_JUNIOR}
                          fill={CULORI[3]}
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </div>
        </div>

        <Separator className="my-8" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Toate sumele sunt estimari brute, inainte de impozitare. Randamentele folosite sunt
          ipoteze de lucru, nu garantii. Aplicatia este un instrument personal de explorare si nu
          reprezinta o recomandare de investitie.
        </p>
      </main>
    </TooltipProvider>
  );
}
