# Pipe-bend
Dansk PWA til planlægning af rørbuk. Ingen konto eller eksterne biblioteker.

## Arbejdsgang
1. Indtast rørets fulde længde, diameter, gods og centerlinjeradius.
2. Tilføj første lige stykke, fx 35 cm.
3. Tryk på ende A eller B, angiv vinklen og næste længde.
4. Spejlvend skifter mellem venstre og højre, set ud fra den valgte ende i byggeretningen. Stiplet linje viser resultatet før tilføjelse.
5. Fortsæt fra begge ender. Fortryd virker i den åbne session.

Målene er **lige længder mellem tangentpunkterne**, ikke ydermål eller mål til teoretiske hjørner. Materialeforbrug = sum af lige stykker + R × sum af absolutte vinkler i radianer. Bukstart i oversigten er centerlinjeafstand fra ende A til buens begyndelse. Den er ikke automatisk værktøjets bukmarkering.

Første version arbejder i ét plan (2D), uden rotation mellem bukkeplaner eller kollisionskontrol. Godstykkelsen gemmes, men der beregnes ikke deformation, fjederretur, materialestræk, savsnit eller værktøjsoffset. Kontrollér beregningen mod prøvebuk før produktion.

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
Kør `node test.mjs`. Testene omfatter buegeometri, materialeforbrug, forlængelse fra begge ender, Pythagoras, forskydning og lommeregner.

## Sprog / Språk / Language
Vælg Norsk (bokmål), English eller Dansk øverst i appen. Valget gemmes på enheden. Sprogskift ændrer ikke projektets navn, mål eller trekantens retning.

## Redigering
Tryk på en længde eller vinkel i tegningen eller på et stykke/buk i arbejdsoversigten. Ret værdien og gem. For vinkler kan retningen også ændres. Restlængde og bukpositioner genberegnes, og ændringen kan fortrydes.

## Zoom og arbejdsvisning
Live-tegningen har zoomknapper (100–800 %), musehjulszoom og flytning ved at trække. På touchskærm kan to fingre zoome, og én finger flytter. Tastatur: fokusér tegningen, brug +/−, piletaster og 0 for tilpasning.
Arbejdsvisning viser kun det gemte rør, uden den stiplede forhåndsvisning. Den indeholder en større tegning, udviklet rørlængde, materialemål, et udfoldet rør og en tabel med tangentstart, buemidte og tangentslut fra ende A. Afstande følger centerlinjen og er geometriske referencer, ikke universelle bukkeværktøjsmærker. Tilpas markeringer til værktøjets egen reference og korrektion. SVG-knappen gemmer rørtegningen; Udskriv / Gem PDF bruger browserens udskriftsdialog og medtager hele arbejdsarket. Ingen 1:1-skabelon.
Logo: industrielt rør med 90°-markering og orange typografi; logo.png og appikoner er inkluderet.

## Læselige referencer
Tegningen viser L1, L2 … for lige stykker og B1, B2 … for buk. Referencerne placeres i separate kolonner med forbindelseslinjer til røret for at undgå overlappende tekst. Længder og vinkler vises i en læsbar liste under tegningen og på arbejdsarket. Tryk på en reference eller dens listeværdi for at redigere. Samme B-numre bruges i bukkelisten og på det udfoldede rør.

Visningen drejes automatisk for at udnytte tegnefeltet; det ændrer ikke rørets mål eller bukkeretninger. Længder står ved de lige stykker og følger deres retning med læsbar tekstorientering. B-referencer står i separate kolonner. Ved tætte mål flyttes længdeteksterne længere væk med forbindelseslinjer; alle værdier findes også i listen nedenunder.

Længdeteksterne viser kun tallet; alle mål på tegningen er i mm. En kollisionskontrol placerer teksten fri af røret, endepunkter, B-referencer og andre længdetekster. Forbindelseslinjer ligger bag tekstfelterne. Forhåndsvisningen ændrer ikke længere målestokken for det oprettede rør. Ved behov udvides tegningsrammen, så mål ikke beskæres.

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
