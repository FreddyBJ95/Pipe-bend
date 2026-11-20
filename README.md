# Pipe-bend
Dansk PWA til planlægning af rørbuk. Ingen konto eller eksterne biblioteker.

## Arbejdsgang
1. Vælg bukker, fuld rørlængde, godstykkelse og måltype i Rørindstillinger. Nye projekter foreslår Swagelok MS-HTB-12M, Ø12/R38 og færdigmål til centerlinjehjørner.
2. Indtast første længde, fx 10 cm. Fortsæt fra A eller B med vinkel og næste mål.
3. Færdigmål går til de tænkte hjørner på rørenes centerlinjer. Lige længder går mellem buernes tangentpunkter. Skift af måltype omregner eksisterende værdier uden at ændre rørets form.
4. Spejlvend vælger venstre eller højre ud fra den valgte ende. Umuligt korte stykker afvises, også i forhåndsvisningen.
5. Afsætningsmål viser mærker fra A, fradrag fra det foregående buk og kaplængde efter det valgte værktøjs tabel. Fortryd virker også efter anvendelse af et vægforslag.

Den ideelle centerlinjegeometri beregnes med tangentlængder plus cirkelbuer. Afsætningsmærker og kaplængde efter producentens værktøjstabel er en separat, praktisk mærkemetode. Begge værdier vises med tydelige betegnelser; geometriske tangentpunkter kaldes ikke bukkemærker. Materialeoversigten bruger værktøjstabellens kaplængde, når hele opsætningen understøttes, ellers den geometriske længde.

Rørmodellen arbejder i ét plan (2D). Vægplanlæggeren kontrollerer rørets yderside mod de tegnede vægge, forhindringer, andre dele af samme rør samt klammer på de lige stykker. Der modelleres ikke højdeskift, rotation mellem bukkeplaner, materialedeformation, fjederretur eller savsnit. Brug producentens mærkereference og kontrollér den valgte opsætning mod et prøvebuk.

Pythagoras finder en ukendt side i en retvinklet trekant. Tryk Vis trekant for at se en tegning med sidelængder og grøn markering af den beregnede side. Tegningen følger indtastningerne. Drej 90° og Spejlvend tilpasser orienteringen uden at ændre sider eller beregning. Nulstil retning gendanner standardvisningen. Forskydningsværktøjet bruger den praktiske mærkeafstand: ønsket forskydning × faktor. Ved 45° er standardfaktoren 1,4 (afrundet), fx 12 cm × 1,4 = 16,8 cm. Der udføres ingen radiuskorrektion; det forudsætter et bukkeværktøj, der selv kompenserer. Faktoren kan ændres, og ved en ny vinkel foreslås 1/sin(vinkel), afrundet til tre decimaler (45° foreslår altid 1,4).

## Udgiv på GitHub
Upload indholdet af denne mappe, **inklusive `.github`**, til roden af dit repository. Brug `main` som branch. Under Settings → Pages vælger du Source → GitHub Actions. Start derefter workflowet Deploy Pipe-bend i Actions, eller lav et nyt push. Intet build eller npm-installation nødvendigt. Relative stier virker også under `/repository-navn/`.

Appen installeres fra den HTTPS-adresse, GitHub Pages giver dig; en downloadet ZIP alene er ikke en installeret PWA.

- iPhone/iPad: Safari → Del → Føj til hjemmeskærm.
- Android: Chrome → Installer app / Føj til startskærm.
- Windows: Chrome eller Edge → Installer app.
- Mac: Safari → Arkiv → Føj til Dock på understøttede macOS-versioner, eller installer fra Chrome.

## Lokal start
Kør `python3 -m http.server 8080` i denne mappe og åbn http://localhost:8080. Offlinebrug kræver, at appen først er indlæst fra HTTPS eller localhost, og service worker er installeret. Ingen automatisk synkronisering: gem projekt som JSON for backup eller overførsel mellem enheder. Projekter gemmes også automatisk i browserens lokale lager.

## Kontrol
Kør `node test.mjs`, `node benders.test.mjs`, `node measurements.test.mjs`, `node wall-routing.test.mjs`, `node wall-planner-corners.test.mjs`, `node wall-label-layout.test.mjs`, `node wall-plan-migration.test.mjs`, `node room-routing.test.mjs`, `node dimension-layout.test.mjs`, `node bend-references.test.mjs`, `node blank-layout.test.mjs` og `node offset-visual.test.mjs`. Testene dækker buegeometri, kompatibilitet med ældre projekter, begge målemetoder, producenttabeller, afsætningsmærker, åbne vægforløb, klammer, faktiske radiusbuer, kollisionskontrol, umulige mål og tegningens referencer.

## Sprog / Språk / Language
Vælg Norsk (bokmål), English eller Dansk øverst i appen. Valget gemmes på enheden. Sprogskift ændrer ikke projektets navn, mål eller trekantens retning.

## Redigering
Tryk på en længde eller vinkel i tegningen eller på et stykke/buk i arbejdsoversigten. Ret værdien og gem. For vinkler kan retningen også ændres. Restlængde og bukpositioner genberegnes, og ændringen kan fortrydes.

## Zoom og arbejdsvisning
Live-tegningen har zoomknapper (100–800 %), musehjulszoom og flytning ved at trække. På touchskærm kan to fingre zoome, og én finger flytter. Tastatur: fokusér tegningen, brug +/−, piletaster og 0 for tilpasning.
Arbejdsvisning viser kun det gemte rør, uden den stiplede forhåndsvisning. Den indeholder en større tegning, udviklet rørlængde, materialemål, et udfoldet rør og en tabel med tangentstart, buemidte og tangentslut fra ende A. Afstande følger centerlinjen og er geometriske referencer, ikke universelle bukkeværktøjsmærker. Tilpas markeringer til værktøjets egen reference og korrektion. SVG-knappen gemmer rørtegningen; Udskriv / Gem PDF bruger browserens udskriftsdialog og medtager hele arbejdsarket. Ingen 1:1-skabelon.
Logo: industrielt rør med 90°-markering og orange typografi; logo.png og appikoner er inkluderet.

## Læselige referencer
Tegningen viser små B1, B2 … tæt ved bukkene. Korte henvisninger forbinder nummeret til den faktiske bue; der er ingen sidekolonner med lange forbindelseslinjer. Buk og mål under redigeringstegningen giver en samlet, trykbar liste med alle længder, vinkler og retninger. Samme B-numre bruges i arbejdsvisning, bukkeliste og på det udfoldede rør.

Visningen drejes automatisk for at udnytte tegnefeltet; det ændrer ikke rørets mål eller bukkeretninger. Længder står ved de lige stykker, hvor der er plads, og følger deres retning med læsbar tekstorientering. Nummermærker og længdetekster placeres samlet, så de ikke dækker rør, ender eller hinanden. Meget tætte tegninger bruger den fulde liste til mål, der ikke kan placeres læseligt i tegnefeltet.

Længdeteksterne viser kun tallet; alle mål på tegningen er i mm. En kollisionskontrol placerer teksten fri af røret, endepunkter, B-referencer og andre længdetekster. Forbindelseslinjer ligger bag tekstfelterne. Forhåndsvisningen ændrer ikke målestokken for det oprettede rør. Mobilvisning bruger tegnefeltets faktiske bredde, så teksterne bevarer deres læsbare størrelse.

Det udfoldede rør beholder mærkernes præcise placeringer og viser alle B-numre på forskudte rækker over og under røret. Hvis numrene ikke kan være der samlet, vises alle mærker med deres mål fra A i en liste direkte under oversigten. Der skjules aldrig kun hvert andet nummer. På mobil kan det udfoldede rør rulles vandret, så teksten kan læses; udskrift tilpasses sidens bredde med automatisk højde.

## Grænseflade
Ingen slogans eller dekorative brandtekster. Ét logo i hovedmenuen. Arbejdsark og udskrift bruger kun projektnavn, mål, funktionelle overskrifter og nødvendig målevejledning.

## Skrifttyper
Knappen Skrifttype viser seks skriftprøver: Poppins, Roboto, IBM Plex Sans, Open Sans, Source Sans Pro og Lato. Vælg en prøve for at bruge den i appen. Valget huskes på enheden. Skrifttyper og licenser følger med i fonts/ og kræver ikke en ekstern skrifttjeneste.

## Visualisering af forskydning
Vis forskydning viser en principskitse med to buk, den ønskede forskydning H og mærkeafstanden M. Skitsen er ikke målfast; mærkeafstanden bruger den valgte faktor, som ved 45° er afrundet. Tegningen kan drejes og spejlvendes. Mærkeafstanden overføres ikke til næste tangent-til-tangent-længde i rørmodellen, da disse er forskellige mål.

## Beregningshjælp
Info-knappen ved Pythagoras og Forskydning forklarer formler og eksempler. Forskydning viser den geometriske faktor for den aktuelle vinkel, den valgte faktor og den aktuelle mærkeafstand. Hjælpen findes på dansk, norsk bokmål og engelsk.

## Menu og mobil
Sprog, skrifttype og installation findes i Menu. Mobilvisningen bruger mindre blokafstande og indvendig padding, mens trykflader fortsat er mindst 44 px og indtastningsfelter bruger 16 px tekst.

## Oprettelse og redigering
Nyt rør åbner en dialog med navn, fuld rørlængde, diameter, gods og bukkeradius. Projektet oprettes først ved Opret rør; Annuller ændrer ikke det åbne rør. Menu → Rørindstillinger kan rette dimensionerne senere. Eksisterende projekter indlæses uden at blive nulstillet. Live-tegningen står over den primære fortsættelsesblok på både telefon og computer. Længde- og vinkellister findes i Arbejdsvisning. Mål og B-referencer på selve tegningen kan stadig redigeres.

## Arbejdsvisning og udskrift
Første A4-side indeholder kun rørtegningen med længder i mm, B-referencer med vinkler og tegningsnummer. Røret drejes og tilpasses sidens højde og bredde, og alle mål indgår i tilpasningen. Specifikationer, længde- og vinkellister, udfoldet rør og bukkedata begynder på næste side. Tegningsnummeret oprettes automatisk og kan ændres under Rørindstillinger; ældre projekter bruger projektnavnet, indtil et nummer angives.

## Appikon
Det valgte PB-logo bruges uændret i appen. PWA-manifestet indeholder192- og512-pixel ikoner samt et separat maskable-ikon med beskyttet margen. iPhone og iPad bruger et180-pixel Apple Touch-ikon.

Vinkelreferencernes prik og forbindelseslinje bruger samme koordinater som rørets buemidte i både redigering, arbejdsvisning og SVG/print. Ekstra højde til tætte referencer flytter rør og ankre samlet.

## Del appen
Menu → Del appen viser en QR-kode, appens offentlige adresse og knapper til at dele eller kopiere linket. QR-koden virker også offline, når appen er indlæst én gang. Linket åbner altid den offentlige app; rørprojekter og lokale indstillinger deles ikke.

## Swagelok-værktøjer
Kataloget indeholder 11 verificerede håndbukkere: MS-HTB-3M,6M,8M,10M og12M samt MS-HTB-2,4,4T,5,6T og8. Valget fastlægger diameter og nominel centerlinjeradius. Egen radius/andet værktøj bevarer fri geometrisk indtastning. Tommemodellers tabeller konverteres præcist til mm og vises med op til 3 decimaler.

Fradrag er transskriberet fra Swagelok MS-13-43 Rev G, tabellen på side 23, med model/radius bekræftet i produktdata. Et link til kilden følger afsætningstabellen. Der interpoleres ikke mellem tabelvinkler, og der opfindes ikke fradrag for vinkler over 90° eller andre ukendte værdier. Fabrikantens krav til lige rør ved en fitting er ikke brugt som et generelt minimum mellem buk.

Eksempel med MS-HTB-12M og fem 90°-buk: færdigmål 100, 200, 200, 300, 600, 1000 mm giver mærker 100, 282, 464, 746, 1328 mm fra A og kaplængde 2310 mm efter tabellen. Den ideelle centerlinjelængde er ca. 2318,451 mm. Det er to forskellige beregningsmetoder, og de vises hver for sig.

## Vægforløb og rørforslag
Tegn vægforløb åbner en tegning af den del af væggen, røret skal følge. Tilføj første opmålte længde og fortsæt med længde og vinkel mod venstre eller højre, ligesom når du bygger et rør. Ét vægstykke er nok; forløbet behøver ikke lukke et helt rum. Tegningen viser længder og nummererer vægstykkerne. Vælg, hvilken side af vægforløbet røret skal sidde på.

Korte vægstykker vises med nummerreferencer, når der ikke er plads til hele målet på tegningen. Alle væglængder findes i den trykbare målliste under tegningen. Referencer flyttes fri af hinanden og væggen; retningspile skaleres eller udelades på de korteste stykker. Et uanvendt vægudkast huskes på enheden, når samme projekt genindlæses.

Tryk på et vægstykke for at vælge det, og placér start, slut, klammer og forhindringer med et mål fra stykkets start. Vægafstand er fri afstand fra væg til rørets yderside, og hver klamme kan have sin egen afstand. Forhindringer har position, bredde langs væggen og fremspring ud fra væggen.

Fri afstand til en forhindring måles fra forhindringen til rørets yderside. Konstruktionen lægger ikke en ekstra del af bukkeradiusen oven i denne højde; radius får plads ved en tidligere tilgang og senere tilbageføring langs væggen. Med et fremspring på 120 mm, vægafstand 10 mm og frirum 10 mm bliver forskydningen 120 mm. Ved 45° er skråstykkets færdigmål mellem centerlinjehjørnerne ca. 169,7 mm. Den faktiske lige tangentstrækning og værktøjets mærkeafstand er særskilte mål. Flere forhindringer, klammer eller andre krav kan stadig kræve en rørføring med større afstand enkelte steder.

Forslaget bruger den aktuelle diameter/radius og den valgte maksimale vinkel pr. buk. Det følger det opmålte vægforløb mellem start og slut og skal passe gennem alle klammer på lige stykker. Rørets faktiske radiusbuer kontrolleres mod de tegnede vægge og forhindringer. Der loves ikke globalt korteste rute. Tætte eller modstridende placeringer kan give en forklaring om, at intet kontrolleret forslag blev fundet.

Nye vægforløb tillader som udgangspunkt 90° pr. buk, så et almindeligt retvinklet væghjørne får ét 90°-buk, når radius og plads tillader det. En grænse på 45° kræver mindst to buk for samme retningsændring. Gemte valg bevares. Tillad 90°-buk og lav nyt forslag ændrer grænsen efter et aktivt tryk og opdaterer forslaget; det eksisterende rør erstattes først ved Brug rørforslaget.

Forslagets hjørnepunkter kan redigeres før brug og skal kontrolleres igen. Brug rørforslaget erstatter det aktuelle rør og kan fortrydes. Derefter kan længder/vinkler redigeres i den normale tegning. Vægforløbet gemmes med projektet; genåbning kontrollerer den seneste rørføring med de aktuelle dimensioner og klammer. Ældre rektangulære rumplaner bevarer deres vægge, klammer, forhindringer og rørføring ved konvertering til vægstykker. Ældre projekter uden måltype bliver ved med at bruge tangentlængder.
