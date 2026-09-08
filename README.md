# Planul Familiei

Construieste o aplicatie web, intr-o singura pagina, in limba romana, pentru o familie care vrea sa simuleze o strategie personala de economisire si investitii pe termen mediu si lung. Aplicatia este un instrument de explorare personala, nu un produs financiar public, nu are nevoie de autentificare, cont de utilizator, sau baza de date. Toate calculele se fac local, in browser, la fiecare schimbare de parametru, fara reincarcarea paginii.

1. Scopul aplicatiei

Familia vrea sa vada, in timp real, cum evolueaza mai multe "piloane" de capital in paralel, pe un orizont ajustabil de pana la 15 ani, in functie de parametri pe care ii pot modifica liber, cu sliders si campuri numerice. Piloanele sunt:

Fond de urgenta (sold fix, fara contributii noi, creste doar din dobanda)

Pilon de siguranta al parintilor (Festgeld sau Geldmarktfonds, randament mic dar stabil)

Pilon de crestere al parintilor (ETF global, randament mai mare dar volatil)

Cont de economii pentru copilul 1 (acelasi principiu, cu propriul orizont pana la 18 ani)

Cont de economii pentru copilul 2 (acelasi principiu, orizont propriu)

Numarul de copii trebuie sa fie el insusi ajustabil (0 pana la 4 copii), fiecare cu propriile campuri.

2. Parametri de intrare, toti ajustabili din interfata

Grupeaza acesti parametri in sectiuni pliabile (accordion sau tab-uri), ca ecranul sa nu fie aglomerat. Fiecare parametru are o valoare implicita (default), afisata mai jos, dar utilizatorul trebuie sa poata schimba orice valoare liber.

2.1 Parametri generali

Orizont de simulare, in ani (slider, minim 1, maxim 15, implicit 7)

Randament mediu anual estimat pentru pilonul de crestere (ETF), in procente (slider, minim 0, maxim 12, implicit 6)

Randament mediu anual estimat pentru pilonul de siguranta, in procente (slider, minim 0, maxim 6, implicit 2,7)

2.2 Fond de urgenta

Suma initiala (camp numeric EUR, implicit 15000)

Acest pilon nu primeste niciodata contributii lunare noi, creste doar din dobanda anuala compusa

2.3 Capitalul initial disponibil pentru investitie (parinti)

Suma totala disponibila (camp numeric EUR, implicit 25000)

Procent alocat initial catre pilonul de crestere, restul merge automat catre pilonul de siguranta (slider 0-100%, implicit 50%)

2.4 Contributia lunara a parintilor, in faze

Permite definirea a pana la 3 faze consecutive, fiecare cu:

Durata fazei, in luni (camp numeric)

Suma contribuita lunar in acea faza, in EUR (camp numeric)

Procent din acea suma alocat catre pilonul de crestere, restul catre pilonul de siguranta (slider 0-100%)

Valori implicite pentru cele 3 faze:

Faza 1: 12 luni, 500 EUR pe luna, 50% catre crestere

Faza 2: 27 luni, 500 EUR pe luna, 70% catre crestere

Faza 3: restul orizontului de simulare, 884,40 EUR pe luna, 70% catre crestere

Adauga si un buton "adauga o crestere de contributie", care insereaza automat o noua faza incepand de la o anumita luna, util pentru a modela momentul in care se termina un credit si se elibereaza o suma lunara suplimentara.

2.5 Copii (repeta acest bloc pentru fiecare copil activ)

Varsta actuala a copilului (camp numeric, ani)

Suma initiala deja economisita pentru copil (camp numeric EUR, implicit 700)

Contributia lunara pentru acest copil (camp numeric EUR, implicit 100)

Procent alocat catre pilonul de crestere pentru acest copil (slider 0-100%, implicit 100%)

Numarul de ani inainte de majorat in care capitalul se muta integral catre pilonul de siguranta, adica perioada de protectie finala (camp numeric, implicit 2)

Varsta la care copilul devine major este fixa, 18 ani, si se foloseste doar pentru a calcula orizontul propriu al fiecarui copil (18 minus varsta actuala).

2.6 Sectiune optionala, test de rezistenta (stress test)

Comutator (switch) "aplica o corectie de piata"

Daca activ: an in care are loc corectia (dropdown, intre anii simulati) si marimea corectiei, in procente (slider 0-50%, implicit 25%)

Corectia se aplica o singura data, instantaneu, doar valorii acumulate in acel moment in toate pilonii de crestere (ETF), niciodata pilonilor de siguranta sau fondului de urgenta

2.7 Sectiune optionala, obiectiv imobiliar de referinta

Comutator "arata cat acopera capitalul acumulat dintr-o achizitie imobiliara"

Daca activ: pret tinta al proprietatii (camp numeric EUR, implicit 600000), procent avans dorit (slider 10-30%, implicit 20%), procent taxe si costuri de achizitie (camp numeric, implicit 6,5%)

Aplicatia calculeaza capitalul total necesar (avans plus costuri) si afiseaza, pentru fiecare an simulat, cat la suta din acea suma este acoperit de capitalul lichid total al parintilor (fara conturile copiilor si fara fondul de urgenta, care raman rezervate altor scopuri)

3. Logica de calcul, formule exacte

Foloseste dobanda compusa lunara, nu anuala, pentru toate piloanele. Pentru un randament anual R (exprimat ca fractie, de exemplu 0,06 pentru 6%), rata lunara echivalenta este:

rata_lunara = (1 + R) ^ (1/12) - 1

Pentru fiecare luna a simularii, pentru fiecare pilon:

valoare_noua = valoare_veche * (1 + rata_lunara) + contributia_din_acea_luna

Contributia lunara catre fiecare pilon depinde de faza activa in acea luna (vezi sectiunea 2.4) si de procentul de alocare catre crestere versus siguranta definit pentru acea faza.

Fondul de urgenta nu primeste niciodata contributii, doar aplica rata_lunara a pilonului de siguranta, luna de luna.

Pentru fiecare copil, aplica aceeasi logica de dobanda compusa lunara, cu contributia lui lunara fixa, alocata dupa procentul lui propriu de crestere versus siguranta, pana quando ajunge in ultima perioada de protectie (definita in 2.5). In acel moment, muta instantaneu, o singura data, intregul sold acumulat din pilonul de crestere al copilului catre pilonul lui de siguranta, apoi continua sa aplice rata pilonului de siguranta pentru sold si pentru contributiile ramase pana la majorat.

Daca testul de rezistenta este activ, la inceputul anului selectat, inmulteste instantaneu soldul curent al fiecarui pilon de crestere (ETF) cu (1 - procentul de corectie), inainte de a continua simularea lunara normal mai departe.

Rotunjeste toate sumele afisate la 2 zecimale, dar pastreaza precizia completa in calculele interne, pentru a evita erori cumulate de rotunjire.

Nu implementa calcule fiscale germane (Vorabpauschale, Abgeltungsteuer, Sparer-Pauschbetrag). Toate valorile afisate sunt brute, inainte de impozitare. Adauga doar o mentiune vizibila, permanenta, undeva in interfata, ca spune ca valorile sunt estimari brute, inainte de impozitare, si ca randamentele sunt ipoteze, nu garantii.

4. Iesiri si vizualizari

4.1 Grafic principal

Un grafic de tip linie, cu axa orizontala reprezentand anii simularii (de la 0 la orizontul ales) si axa verticala valoarea in EUR. Afiseaza o linie separata, cu culoare distincta si legenda clara, pentru fiecare pilon activ (fond de urgenta, pilon siguranta parinti, pilon crestere parinti, si cate o linie pentru fiecare copil activ). Graficul se actualizeaza instant la orice schimbare de parametru, fara a fi nevoie de un buton de refresh.

4.2 Tabel detaliat

Un tabel cu un rand per an simulat si o coloana per pilon, plus o coloana finala "Total familie", afisand suma tuturor pilonilor in acel an. Tabelul trebuie sa poata fi extins sau restrans (colapsabil), ca sa nu domine ecranul pe mobil.

4.3 Panou sumar, in partea de sus a paginii

Afiseaza in mod vizibil, actualizat instant:

Valoarea totala a capitalului familiei la finalul orizontului simulat

Suma totala contribuita efectiv, din buzunar, de-a lungul intregii perioade

Castigul net generat de randamente (diferenta dintre cele doua de mai sus), atat in EUR cat si in procente

4.4 Comparatie de scenarii

Adauga un buton "salveaza acest scenariu", care pastreaza starea curenta a tuturor parametrilor intr-un slot (Scenariul A, Scenariul B, pana la 3 sloturi). Cand exista mai mult de un scenariu salvat, afiseaza graficul principal cu toate scenariile suprapuse (linie punctata pentru scenariile salvate, linie plina pentru scenariul curent activ), plus un tabel comparativ cu totalurile finale ale fiecarui scenariu, unul langa altul.

5. Cerinte de interfata

Aplicatia trebuie sa fie utilizabila de o persoana fara experienta financiara sau tehnica avansata. Foloseste un limbaj simplu in toate etichetele, evita termenii tehnici nedefiniti, si adauga un mic tooltip (semn de intrebare langa fiecare parametru important) cu o explicatie de o propozitie, in romana, pentru fiecare concept (de exemplu, ce inseamna "pilon de siguranta" sau "test de rezistenta").

Design curat, spatiat, cu un ton profesional si calm, nu unul de tip aplicatie de trading agresiva. Culori linistite, fara rosu si verde stridente pentru castig si pierdere, prefera o paleta neutra, cu un singur accent de culoare pentru elementele interactive.

Aplicatia trebuie sa functioneze bine si pe telefon mobil, nu doar pe desktop, deoarece va fi folosita si de partenera pentru a intelege planul, posibil de pe telefon.

Toate sumele se afiseaza formatate cu separator de mii si simbolul EUR, de exemplu "45.426,05 EUR", in formatul romanesc de numere (punct pentru mii, virgula pentru zecimale).

6. Note tehnice

Nu este nevoie de backend, autentificare, sau baza de date. Toata logica de calcul si toata starea aplicatiei (parametrii curenti, scenariile salvate) pot ramane in starea locala a componentelor React, fara persistenta intre sesiuni. Foloseste o librarie de grafice potrivita pentru linii multiple cu legenda si tooltip la hover (de exemplu Recharts). Structureaza codul clar, cu o functie de simulare separata de componentele de interfata, ca logica financiara sa poata fi verificata si testata independent de UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://viitor-tau-calculat.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9a9fb76-197d-42b5-b192-c01d73133776).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
