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
  parametriImpliciti,
  simuleaza,
} from "@/lib/simulation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          "Instrument personal de explorare: orizont pana la 15 ani, contributii lunare si conturi pentru copii.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CULORI = ["#3f6f86", "#4f8f7a", "#8a7b45", "#6c6191", "#9a6a58", "#5b7a94"];
// Gri pentru scenariul "cont standard" (fara plan).
const GRI = "#9ca3af";
const SUFIX_STANDARD = " · cont standard";

const NUME_COPII = ["Oscar", "Luca"];

const PILON_SAFE = "Pilon SAFE";
const PILON_DEPOT = "Pilon DEPOT";
const PILON_GROW = "Pilon GROW";
const PILON_JUNIOR = "Pilon JUNIOR / copil";

const LEGENDA_PILONI: { nume: string; descriere: string }[] = [
  {
    nume: `${PILON_SAFE} (de neatins)`,
    descriere:
      "Fondul de urgenta, tinut intr-un cont curent (Tagesgeld). Nu se atinge si creste doar cu dobanda mica a contului standard.",
  },
  { nume: PILON_DEPOT, descriere: "Cont depozit bancar. Randament mic, dar stabil." },
  { nume: PILON_GROW, descriere: "Bani investiti in ETF. Randament mai mare, dar cu fluctuatii." },
  {
    nume: "Pilon JUNIOR Oscar / Pilon JUNIOR Luca",
    descriere: "Conturile junior ale copiilor. La 16 ani trec automat in depozit bancar.",
  },
];

function Ajutor({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="Explicatie" className="text-muted-foreground/70 hover:text-primary">
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
}: {
  eticheta: string;
  ajutor?: string;
  valoare: number;
  onChange: (v: number) => void;
  sufix?: string;
  pas?: number;
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
          className="pr-12"
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
}: {
  eticheta: string;
  ajutor?: string;
  valoare: number;
  min: number;
  max: number;
  pas?: number;
  unitate?: string;
  onChange: (v: number) => void;
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
      />
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
  // Acelasi plan, dar cu toti banii intr-un cont standard (Tagesgeld) - pentru comparatie.
  const rezStandard = useMemo(
    () =>
      simuleaza({
        ...p,
        randamentCrestere: p.randamentStandard,
        randamentSiguranta: p.randamentStandard,
      }),
    [p],
  );
  const rezScenarii = useMemo(
    () => scenarii.map((s) => ({ nume: s.nume, rez: simuleaza(s.parametri) })),
    [scenarii],
  );

  const dateGrafic = useMemo(() => {
    return rez.ani.map((a, i) => {
      const std = rezStandard.ani[i];
      const rand: Record<string, number> = {
        an: a.an,
        urgenta: +a.fondUrgenta.toFixed(2),
        siguranta: +a.siguranta.toFixed(2),
        crestere: +a.crestere.toFixed(2),
        // O singura linie pentru copii - planul e identic, valoarea e per copil.
        copil: +(a.copii[0] ?? 0).toFixed(2),
      };
      if (std) {
        rand["urgentaStd"] = +std.fondUrgenta.toFixed(2);
        rand["sigurantaStd"] = +std.siguranta.toFixed(2);
        rand["crestereStd"] = +std.crestere.toFixed(2);
        rand["copilStd"] = +(std.copii[0] ?? 0).toFixed(2);
      }
      rezScenarii.forEach((s, si) => {
        const val = s.rez.ani[i]?.totalFamilie;
        if (val !== undefined) rand[`scenariu${si}`] = +val.toFixed(2);
      });
      return rand;
    });
  }, [rez, rezStandard, rezScenarii]);

  const piloniRezumat = useMemo(() => {
    const a = rez.ani[rez.ani.length - 1];
    const s = rezStandard.ani[rezStandard.ani.length - 1];
    const cb = rez.contribuitPiloni;
    const mk = (nume: string, valoare: number, contribuit: number, valoareStandard: number) => {
      const dobanda = valoare - contribuit;
      return {
        nume,
        valoare,
        contribuit,
        dobanda,
        valoareStandard,
        fataDeStandard: valoare - valoareStandard,
        crestereProcent: contribuit > 0 ? (dobanda / contribuit) * 100 : 0,
      };
    };
    if (!a || !s) return [];
    return [
      mk(PILON_SAFE, a.fondUrgenta, cb.safe, s.fondUrgenta),
      mk(PILON_DEPOT, a.siguranta, cb.depot, s.siguranta),
      mk(PILON_GROW, a.crestere, cb.grow, s.crestere),
      mk(PILON_JUNIOR, a.copii[0] ?? 0, cb.copii[0] ?? 0, s.copii[0] ?? 0),
    ];
  }, [rez, rezStandard]);

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
                <dt className="text-sm font-semibold">{pilon.nume}</dt>
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
              <p className="mt-1 text-xl font-bold tabular-nums text-primary sm:text-2xl">
                {formatEUR(rez.castig)}
              </p>
              <p className="text-xs text-muted-foreground">{formatProcent(rez.castigProcent)}</p>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Parametri */}
          <div className="space-y-4">
            <Accordion type="multiple" defaultValue={["general", "contributii"]} className="space-y-3">
              <AccordionItem value="general" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">Setari generale</AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <CampSlider
                    eticheta="Cati ani simulam"
                    ajutor="Perioada pe care vrei sa vezi evolutia banilor, intre 1 si 15 ani."
                    valoare={p.orizontAni}
                    min={1}
                    max={15}
                    unitate="ani"
                    onChange={(v) => set("orizontAni", v)}
                  />
                  <CampSlider
                    eticheta="Randament anual Pilon GROW"
                    ajutor="Cat presupunem ca aduce, in medie pe an, partea investita in ETF de actiuni la nivel global."
                    valoare={p.randamentCrestere}
                    min={0}
                    max={12}
                    pas={0.1}
                    onChange={(v) => set("randamentCrestere", v)}
                  />
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
                    ajutor="Dobanda unui cont curent obisnuit. Se aplica direct la Pilon SAFE (fondul de urgenta sta acolo) si e folosita pentru comparatie: liniile punctate arata unde ai fi daca lasai toti banii asa, fara plan."
                    valoare={p.randamentStandard}
                    min={0}
                    max={6}
                    pas={0.05}
                    onChange={(v) => set("randamentStandard", v)}
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
                    de numarul de ani ales la „Setari generale".
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

                  <div className="space-y-4 border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Sume suplimentare, in afara sumei lunare de mai sus, de exemplu un bonus anual
                      de la angajator. Se aduna integral la Pilon GROW, o singura data pe an. Suma 0
                      inseamna ca acel bonus nu e folosit. Poti configura pana la doua, daca primesti
                      bonus de doua ori pe an.
                    </p>
                    {p.bonusuri.map((b, i) => (
                      <div key={b.id} className="space-y-3 rounded-lg border border-dashed p-3">
                        <p className="text-xs font-semibold">Bonus anual {i + 1}</p>
                        <CampNumar
                          eticheta="Suma"
                          valoare={b.suma}
                          sufix="EUR"
                          pas={50}
                          onChange={(v) =>
                            set(
                              "bonusuri",
                              p.bonusuri.map((x) => (x.id === b.id ? { ...x, suma: v } : x)),
                            )
                          }
                        />
                        <CampSlider
                          eticheta="In ce luna a planului vine, apoi se repeta anual"
                          ajutor="Luna 1 e prima luna a planului, nu neaparat ianuarie. De exemplu, daca planul incepe in octombrie si bonusul vine in martie, alege luna 6."
                          valoare={b.lunaInCicluAnual}
                          min={1}
                          max={12}
                          unitate="din ciclul anual"
                          onChange={(v) =>
                            set(
                              "bonusuri",
                              p.bonusuri.map((x) =>
                                x.id === b.id ? { ...x, lunaInCicluAnual: v } : x,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
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
                            p.copii.map((x) => (x.id === c.id ? { ...x, contributieLunara: v } : x)),
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
                      <ChartTooltip
                        formatter={(v: number) => formatEUR(Number(v))}
                        labelFormatter={(l) => `Anul ${l}`}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(value: string) => (
                          <span style={{ color: value.includes(SUFIX_STANDARD) ? GRI : undefined }}>
                            {value}
                          </span>
                        )}
                      />
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
                      {/* Linii punctate gri: acelasi plan, dar cu banii intr-un cont standard */}
                      <Line
                        type="monotone"
                        dataKey="urgentaStd"
                        name={`${PILON_SAFE}${SUFIX_STANDARD}`}
                        stroke={GRI}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="sigurantaStd"
                        name={`${PILON_DEPOT}${SUFIX_STANDARD}`}
                        stroke={GRI}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="crestereStd"
                        name={`${PILON_GROW}${SUFIX_STANDARD}`}
                        stroke={GRI}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="copilStd"
                        name={`${PILON_JUNIOR}${SUFIX_STANDARD}`}
                        stroke={GRI}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
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
                  Liniile pline = planul cu investitii. Liniile punctate = aceiasi bani lasati
                  intr-un cont standard ({formatProcent(p.randamentStandard)}), adica ce se intampla
                  daca nu faci nimic. Linia „Pilon JUNIOR / copil" arata valoarea unui singur cont
                  ({NUME_COPII.join(" si ")} au acelasi plan); in „Total familie" sunt numarati ambii
                  copii.
                </p>
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
                  Bara arata cat ai pus din buzunar (gri) si cat s-a adaugat din dobanzi (colorat).
                </p>
                {piloniRezumat.map((pil) => {
                  const total = pil.valoare > 0 ? pil.valoare : 1;
                  const pctContribuit = Math.max(0, Math.min(100, (pil.contribuit / total) * 100));
                  return (
                    <div key={pil.nume} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{pil.nume}</span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatEUR(pil.valoare)}
                        </span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="bg-muted-foreground/40"
                          style={{ width: `${pctContribuit}%` }}
                        />
                        <div className="bg-primary" style={{ width: `${100 - pctContribuit}%` }} />
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Pus deoparte: {formatEUR(pil.contribuit)}</span>
                        <span className="font-medium text-primary">
                          + {formatEUR(pil.dobanda)} din dobanzi ({formatProcent(pil.crestereProcent)})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pil.fataDeStandard >= 1 ? (
                          <>
                            Cu <span className="font-medium">{formatEUR(pil.fataDeStandard)}</span>{" "}
                            mai mult decat intr-un cont standard.
                          </>
                        ) : (
                          <>La fel ca un cont standard &mdash; banii chiar stau acolo.</>
                        )}
                      </p>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Randamentul „Pilon JUNIOR / copil" e per copil; suma se aplica si lui Oscar, si lui
                  Luca.
                </p>
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
                            <TableCell className="text-right tabular-nums text-primary">
                              + {formatEUR(dinDobanzi)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-primary">
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
                      <BarChart data={dobanziGrafic} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 0% / 0.07)" vertical={false} />
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
