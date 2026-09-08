import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
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
      { title: "Simulator de economisire si investitii pentru familie" },
      {
        name: "description",
        content:
          "Simuleaza in timp real cum creste capitalul familiei pe piloane: fond de urgenta, depozit bancar, investitie si conturi pentru copii.",
      },
      { property: "og:title", content: "Simulator de economisire si investitii pentru familie" },
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

const NUME_COPII = ["Oscar", "Luca"];

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

  const set = <K extends keyof Parametri>(k: K, v: Parametri[K]) => setP((s) => ({ ...s, [k]: v }));

  const rez = useMemo(() => simuleaza(p), [p]);
  const rezScenarii = useMemo(
    () => scenarii.map((s) => ({ nume: s.nume, rez: simuleaza(s.parametri) })),
    [scenarii],
  );

  const dateGrafic = useMemo(() => {
    return rez.ani.map((a, i) => {
      const rand: Record<string, number> = {
        an: a.an,
        urgenta: +a.fondUrgenta.toFixed(2),
        siguranta: +a.siguranta.toFixed(2),
        crestere: +a.crestere.toFixed(2),
      };
      a.copii.forEach((v, idx) => {
        rand[`copil${idx}`] = +v.toFixed(2);
      });
      rezScenarii.forEach((s, si) => {
        const val = s.rez.ani[i]?.totalFamilie;
        if (val !== undefined) rand[`scenariu${si}`] = +val.toFixed(2);
      });
      return rand;
    });
  }, [rez, rezScenarii]);

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
            Planul de economisire si investitii al familiei
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Modifica parametrii si vezi imediat cum evolueaza fiecare parte a capitalului familiei.
            Totul se calculeaza direct in acest dispozitiv, nimic nu se salveaza.
          </p>
        </header>

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
                    eticheta="Randament anual pentru partea de investitie"
                    ajutor="Cat presupunem ca aduce, in medie pe an, partea investita in fonduri de actiuni la nivel global."
                    valoare={p.randamentCrestere}
                    min={0}
                    max={12}
                    pas={0.1}
                    onChange={(v) => set("randamentCrestere", v)}
                  />
                  <CampSlider
                    eticheta="Randament anual pentru partea in depozit bancar"
                    ajutor="Partea in depozit bancar este banii tinuti in depozite sau fonduri de piata monetara: castig mic, dar stabil."
                    valoare={p.randamentSiguranta}
                    min={0}
                    max={6}
                    pas={0.1}
                    onChange={(v) => set("randamentSiguranta", v)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="urgenta" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Fond de urgenta si capital initial
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <CampNumar
                    eticheta="Fond de urgenta"
                    ajutor="Banii pastrati pentru situatii neprevazute. Nu primesc niciodata sume noi, cresc doar din dobanda."
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
                    eticheta="Din acesti bani, cat merge spre investitie"
                    ajutor="Restul procentului merge automat spre partea in depozit bancar."
                    valoare={p.procentInitialCrestere}
                    min={0}
                    max={100}
                    onChange={(v) => set("procentInitialCrestere", v)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contributii" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Cat puneti deoparte lunar
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
                    eticheta="Cat din suma merge spre investitie"
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="copii" className="rounded-xl border bg-card px-4">
                <AccordionTrigger className="text-sm font-semibold">Copii</AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  {p.copii.map((c, i) => (
                    <div key={c.id} className="space-y-4 rounded-lg border border-dashed p-3">
                      <p className="text-xs font-semibold">{NUME_COPII[i] ?? `Copilul ${i + 1}`}</p>
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
                        eticheta="Cat merge spre investitie"
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
                      <CampNumar
                        eticheta="Ani de protectie inainte de 18 ani"
                        ajutor="Cu atatia ani inainte de majorat, toti banii copilului trec in depozit bancar, ca sa nu depinda de piata."
                        valoare={c.aniProtectie}
                        sufix="ani"
                        onChange={(v) =>
                          set(
                            "copii",
                            p.copii.map((x) => (x.id === c.id ? { ...x, aniProtectie: v } : x)),
                          )
                        }
                      />
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
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="urgenta"
                        name="Fond de urgenta"
                        stroke={CULORI[0]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="siguranta"
                        name="Depozit bancar parinti"
                        stroke={CULORI[1]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="crestere"
                        name="Investitie parinti"
                        stroke={CULORI[2]}
                        strokeWidth={2}
                        dot={false}
                      />
                      {p.copii.map((c, i) => (
                        <Line
                          key={c.id}
                          type="monotone"
                          dataKey={`copil${i}`}
                          name={NUME_COPII[i] ?? `Copilul ${i + 1}`}
                          stroke={CULORI[(i + 3) % CULORI.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                      {rezScenarii.map((s, i) => (
                        <Line
                          key={s.nume}
                          type="monotone"
                          dataKey={`scenariu${i}`}
                          name={`${s.nume} (total)`}
                          stroke={CULORI[i % CULORI.length]}
                          strokeDasharray="5 4"
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>An</TableHead>
                        <TableHead className="text-right">Urgenta</TableHead>
                        <TableHead className="text-right">Depozit bancar</TableHead>
                        <TableHead className="text-right">Investitie</TableHead>
                        {p.copii.map((c, i) => (
                          <TableHead key={c.id} className="text-right">
                            {NUME_COPII[i] ?? `Copilul ${i + 1}`}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total familie</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rez.ani.map((a) => (
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
                          {a.copii.map((v, i) => (
                            <TableCell key={i} className="text-right tabular-nums">
                              {formatEUR(v)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatEUR(a.totalFamilie)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
