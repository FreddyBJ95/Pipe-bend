# Pipe-bend
Dansk PWA til planlægning af rørbuk. Ingen konto eller eksterne biblioteker.

## Arbejdsgang
1. Vælg bukker, fuld rørlængde, godstykkelse og måltype i Rørindstillinger. Nye projekter foreslår Swagelok MS-HTB-12M, Ø12/R38 og færdigmål til centerlinjehjørner.
2. Indtast første længde, fx 10 cm. Fortsæt fra A eller B med vinkel og næste mål.
3. Færdigmål går til de tænkte hjørner på rørenes centerlinjer. Lige længder går mellem buernes tangentpunkter. Skift af måltype omregner eksisterende værdier uden at ændre rørets form.
4. Spejlvend vælger venstre eller højre ud fra den valgte ende. Umuligt korte stykker afvises, også i forhåndsvisningen.
5. Afsætningsmål viser både det samlede mærkemål fra A og målet fra forrige mærke, samt fradrag fra det foregående buk og kaplængde efter det valgte værktøjs tabel. Første mål fra forrige mærke starter ved ende A; sidste række er fra sidste bukkemærke til rørslut. Fradraget er allerede indregnet i disse mål. Kolonnen findes også i arbejdsvisning og udskrift. Absolutte mærker afrundes én gang, og de viste delmål beregnes som differencer mellem dem, så summen af de viste delmål er den viste kaplængde. De rå producentkorrektioner og geometriske beregninger ændres ikke. Fortryd virker også efter anvendelse af et vægforslag.

Den ideelle centerlinjegeometri beregnes med tangentlængder plus cirkelbuer. Afsætningsmærker og kaplængde efter producentens værktøjstabel er en separat, praktisk mærkemetode. Begge værdier vises med tydelige betegnelser; geometriske tangentpunkter kaldes ikke bukkemærker. Materialeoversigten bruger værktøjstabellens kaplængde, når hele opsætningen understøttes, ellers den geometriske længde.

Rørredigeringen understøtter både plane rør og højdeskift mellem bukkeplaner. Vægplanlæggerens kontrol arbejder i 2D og kontrollerer rørets yderside mod de tegnede vægge, forhindringer, andre dele af samme rør samt klammer på de lige stykker. Højdeskift indgår ikke i vægkontrollen. Materialedeformation, fjederretur og savsnit modelleres ikke. Brug producentens mærkereference og kontrollér den valgte opsætning mod et prøvebuk.

Pythagoras finder en ukendt side i en retvinklet trekant. Tryk Vis trekant for at se en tegning med sidelængder og grøn markering af den beregnede side. Tegningen følger indtastningerne. Drej 90° og Spejlvend tilpasser orienteringen uden at ændre sider eller beregning. Nulstil retning gendanner standardvisningen. Forskydningsværktøjet bruger den praktiske mærkeafstand: ønsket forskydning × faktor. Ved 45° er standardfaktoren 1,4 (afrundet), fx 12 cm × 1,4 = 16,8 cm. Der udføres ingen radiuskorrektion; det forudsætter et bukkeværktøj, der selv kompenserer. Faktoren kan ændres, og ved en ny vinkel foreslås 1/sin(vinkel), afrundet til tre decimaler (45° foreslår altid 1,4).

## Udgiv på GitHub
Upload indholdet af denne mappe, **inklusive `.github`**, til roden af dit repository. Brug `main` som branch. Under Settings → Pages vælger du Source → GitHub Actions. Start derefter workflowet Deploy Pipe-bend i Actions, eller lav et nyt push. Intet build eller npm-installation nødvendigt. Relative stier virker også under `/repository-navn/`.

Appen installeres fra den HTTPS-adresse, GitHub Pages giver dig; en downloadet ZIP alene er ikke en installeret PWA.

- iPhone/iPad: Safari → Del → Føj til hjemmeskærm.
- Android: Chrome → Installer app / Føj til startskærm.
- Windows: Chrome eller Edge → Installer app.
- Mac: Safari → Arkiv → Føj til Dock på understøttede macOS-versioner, eller installer fra Chrome.

## Lokal start
Kør `python3 -m http.server 8080` i denne mappe og åbn http://localhost:8080. Offlinebrug kræver, at appen først er indlæst fra HTTPS eller localhost, og service worker er installeret. Ingen automatisk synkronisering: gem projekt som JSON for backup eller overførsel mellem enheder. Projekter gemmes også automatisk i browserens lokale lager. Hvert projekt har et fast projekt-ID; omdøbning eller ændring af tegningsnummer skifter ikke projektets vægudkast. Ældre projekter får et ID ved indlæsning, og et tilhørende ældre vægudkast flyttes til projektets eget lager uden at ændre opmålingen.

Gem projekt indeholder både det anvendte rør og et eventuelt uanvendt vægudkast, inklusive vægge, klammer, forhindringer, hjørnepunkter og ventende rettelser. Projektfilen beholder version 1 med et valgfrit wallDraft-felt, så ældre filer fortsat kan åbnes. Udkastet holdes adskilt fra det anvendte rør. Ved import kontrolleres både rør og udkast før erstatning; en ugyldig fil ændrer ikke det åbne projekt. Filer på op til 2 MiB kan åbnes, så også store komplette vægprojekter kan eksporteres og indlæses igen.

## Kontrol
Kør `node test.mjs`, `node benders.test.mjs`, `node measurements.test.mjs`, `node displayed-marks.test.mjs`, `node project-storage.test.mjs`, `node wall-validation-status.test.mjs`, `node wall-routing.test.mjs`, `node wall-obstacle-angle.test.mjs`, `node wall-pipe-edit.test.mjs`, `node linear-pipe-fit.test.mjs`, `node wall-pipe-solver.test.mjs`, `node wall-viewport.test.mjs`, `node wall-picking.test.mjs`, `node main-pipe-detail.test.mjs`, `node main-detail-annotations.test.mjs`, `node wall-detail-geometry.test.mjs`, `node wall-planner-corners.test.mjs`, `node wall-label-layout.test.mjs`, `node wall-plan-migration.test.mjs`, `node room-routing.test.mjs`, `node dimension-layout.test.mjs`, `node bend-references.test.mjs`, `node blank-layout.test.mjs` og `node offset-visual.test.mjs`. Testene dækker buegeometri, kompatibilitet med ældre projekter, begge målemetoder, producenttabeller, afsætningsmærker, åbne vægforløb, redigering af røret ved faste vægge, klammer, faktiske radiusbuer, kollisionskontrol, umulige mål og tegningens referencer.

## Sprog / Språk / Language
Vælg Norsk (bokmål), English eller Dansk øverst i appen. Valget gemmes på enheden. Sprogskift ændrer ikke projektets navn, mål eller trekantens retning.

## Redigering
Tryk på en længde eller vinkel i tegningen eller på et stykke/buk i arbejdsoversigten. Ret værdien og gem. For vinkler kan retningen også ændres. Restlængde og bukpositioner genberegnes, og ændringen kan fortrydes.

## Zoom og arbejdsvisning
Live-tegningen har zoomknapper (100–25.600 %), musehjulszoom og flytning ved at trække. På touchskærm kan to fingre zoome, og én finger flytter. Tastatur: fokusér tegningen, brug +/−, piletaster og 0 for tilpasning. Rørets bredde følger den faktiske diameter, og bukkene tegnes som præcise cirkelbuer. Ved indzoomning dukker et diameter- og radiusmål op, når de kan vises læseligt. Centerlinje, radiuscenter og tangentpunkter giver flere detaljer, mens måltekster, B-numre og A/B-markeringer bevarer fast skærmstørrelse. Mål på lange stykker placeres ved den synlige del, mens tallet fortsat er hele stykkets mål. Et tyndt rør får en diskret oversigtslinje, når den fysiske diameter er mindre end 1,5 pixel. Zoom og panorering ændrer ikke geometri, afsætningsmål eller udskrift.
Arbejdsvisning viser kun det gemte rør, uden den stiplede forhåndsvisning. Den indeholder en større tegning, udviklet rørlængde, materialemål, et udfoldet rør og en tabel med tangentstart, buemidte og tangentslut fra ende A. Afstande følger centerlinjen og er geometriske referencer, ikke universelle bukkeværktøjsmærker. Tilpas markeringer til værktøjets egen reference og korrektion. SVG-knappen gemmer rørtegningen; Udskriv / Gem PDF bruger browserens udskriftsdialog og medtager hele arbejdsarket. Ingen 1:1-skabelon.
Logo: industrielt rør med 90°-markering og orange typografi; logo.png og appikoner er inkluderet.

## Læselige referencer
Tegningen viser små B1, B2 … tæt ved bukkene. Korte henvisninger forbinder nummeret til den faktiske bue; der er ingen sidekolonner med lange forbindelseslinjer. Buk og mål under redigeringstegningen giver en samlet, trykbar liste med alle længder, vinkler og retninger. Samme B-numre bruges i arbejdsvisning, bukkeliste og på det udfoldede rør.

Visningen drejes automatisk for at udnytte tegnefeltet; det ændrer ikke rørets mål eller bukkeretninger. Længder står ved de lige stykker, hvor der er plads, og følger deres retning med læsbar tekstorientering. Nummermærker og længdetekster placeres samlet, så de ikke dækker rør, ender eller hinanden. Meget tætte tegninger bruger den fulde liste til mål, der ikke kan placeres læseligt i tegnefeltet.

Længdeteksterne viser kun tallet; alle mål på tegningen er i mm. En kollisionskontrol placerer teksten fri af røret, endepunkter, B-referencer og andre længdetekster. Forbindelseslinjer ligger bag tekstfelterne. Forhåndsvisningen ændrer ikke målestokken for det oprettede rør. Mobilvisning bruger tegnefeltets faktiske bredde, så teksterne bevarer deres læsbare størrelse.

Det udfoldede rør beholder mærkernes præcise placeringer og viser alle B-numre på forskudte rækker over og under røret. Hvis numrene ikke kan være der samlet, vises alle mærker med deres mål fra A i en liste direkte under oversigten. Der skjules aldrig kun hvert andet nummer. På mobil kan det udfoldede rør rulles vandret, så teksten kan læses; udskrift tilpasses sidens bredde med automatisk højde.

## Grænseflade

Spejlvending, rotation, nulstilling, Fortryd, arbejdsvisning og Tilpas visning bruger ens SVG-ikoner på 44 × 44 pixel med oversatte navne og tooltips. Den valgte bukkeretning vises i selve pilikonet og i det tilgængelige navn. Lommeregneren ligger ved indtastningens knapper, så den ikke dækker indholdet på telefonen. Længde, vinkel og spejlknap deles om en række, når bredden tillader det; felterne ombryder på smallere skærme.

Gentagen brugsvejledning og lange metodeforklaringer er fjernet fra det almindelige arbejdsflow eller samlet under infoikoner. Afsætningsmål er foldet sammen ved opstart, mens tabellens tal, kaplængde, geometrisk længde og relevante advarsler bevares. Kolonneoverskrifter er kortere med fulde forklaringer som tilgængelige navne. Metodeforklaringer og producentlink er tilgængelige under Info; arbejdsarkets forklaringer foldes ud ved udskrift. Måletype, enheder, fejl og beskeder om mindre forhindringsvinkler forbliver synlige.
Projektknapperne Tegn vægforløb, Åbn projekt, Gem projekt og Udskriv er samlet i topbjælken ved logo og Menu. Nyt rør ligger som et separat ikon i topbjælken, også i vægvisningen. På telefon står det ved Menu over de fire projektknapper, mens Fortryd og lommeregneren bliver ved indtastningen. På smalle skærme vises de på en egen række med fire trykbare knapper og ombrudt tekst. Logoets papirbaggrund tones ind i topbjælken med CSS; kildebilledet og appikonerne bevares. Ingen slogans eller dekorative brandtekster. Ét logo i hovedmenuen. Arbejdsark og udskrift bruger kun projektnavn, mål, funktionelle overskrifter og nødvendig målevejledning.

## Skrifttyper
Knappen Skrifttype viser seks skriftprøver: Poppins, Roboto, IBM Plex Sans, Open Sans, Source Sans Pro og Lato. Vælg en prøve for at bruge den i appen. Valget huskes på enheden. Skrifttyper og licenser følger med i fonts/ og kræver ikke en ekstern skrifttjeneste.

## Visualisering af forskydning
Vis forskydning viser en principskitse med to buk, den ønskede forskydning H og mærkeafstanden M. Skitsen er ikke målfast; mærkeafstanden bruger den valgte faktor, som ved 45° er afrundet. Tegningen kan drejes og spejlvendes. Mærkeafstanden overføres ikke til næste tangent-til-tangent-længde i rørmodellen, da disse er forskellige mål.

## Beregningshjælp
Info-knappen ved Pythagoras og Forskydning forklarer formler og eksempler. Forskydning viser den geometriske faktor for den aktuelle vinkel, den valgte faktor og den aktuelle mærkeafstand. Hjælpen findes på dansk, norsk bokmål og engelsk.

## Menu og mobil
Sprog, skrifttype og installation findes i Menu. Mobilvisningen bruger mindre blokafstande og indvendig padding, mens trykflader fortsat er mindst 44 px og indtastningsfelter bruger 16 px tekst.

## Oprettelse og redigering
Nyt rør åbner en dialog med navn, fuld rørlængde, diameter, gods og bukkeradius. Projektet oprettes først ved Opret rør; Annuller ændrer ikke det åbne rør. Første stykke kræver kun en gyldig længde. En tidligere ugyldig vinkel kan ikke blokere et nyt rør; vinkel og fortsættelsesfelter nulstilles ved oprettelse. Menu → Rørindstillinger kan rette dimensionerne senere. Eksisterende projekter indlæses uden at blive nulstillet. Live-tegningen står over den primære fortsættelsesblok på både telefon og computer. Længde- og vinkellister findes i Arbejdsvisning. Mål og B-referencer på selve tegningen kan stadig redigeres.

## Arbejdsvisning og udskrift
Første A4-side indeholder rørtegningen med længder i mm, B-referencer med vinkler og tegningsnummer. For vægprojekter vises også Vægkontrol: kontrolleret eller Vægkontrol: kræver ny kontrol. Den samme status vises på datasiden, i PDF og i SVG-eksporten. Den bygger på det aktuelle rørs geometri; ændringer i hovedtegningen kræver ny kontrol og anvendelse i vægvisningen. Røret drejes og tilpasses sidens højde og bredde, og alle mål indgår i tilpasningen. Specifikationer, længde- og vinkellister, udfoldet rør og bukkedata begynder på næste side. Tegningsnummeret oprettes automatisk og kan ændres under Rørindstillinger; ældre projekter bruger projektnavnet, indtil et nummer angives.

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

I Væg-visningen står små V-numre tæt ved vægstykkerne med korte henvisninger. Kun den valgte væg får et fuldt måltal og en mållinje. Flere korte, sammenhængende vægstykker samles i fx V3–V5; tryk på gruppen for at zoome ind, hvorefter de enkelte numre vises, når pladsen tillader det. I Rør-visningen vises kun den valgte L- eller B-reference med dens aktuelle mål; vægnumre og væghenvisninger skjules. Alle væglængder findes i den trykbare målliste under tegningen. Et uanvendt vægudkast huskes på enheden, når samme projekt genindlæses.

Tryk på et vægstykke for at vælge det, og placér start, slut, klammer og forhindringer med et mål fra stykkets start. Vægafstand er fri afstand fra væg til rørets yderside, og hver klamme kan have sin egen afstand. Forhindringer har position, bredde langs væggen og fremspring ud fra væggen.

Fri afstand til en forhindring måles fra forhindringen til rørets yderside. Konstruktionen lægger ikke en ekstra del af bukkeradiusen oven i denne højde; radius får plads ved en tidligere tilgang og senere tilbageføring langs væggen. Med et fremspring på 120 mm, vægafstand 10 mm og frirum 10 mm bliver forskydningen 120 mm. Ved 45° er skråstykkets færdigmål mellem centerlinjehjørnerne ca. 169,7 mm. Den faktiske lige tangentstrækning og værktøjets mærkeafstand er særskilte mål. Flere forhindringer, klammer eller andre krav kan stadig kræve en rørføring med større afstand enkelte steder.

Forslaget bruger den aktuelle diameter/radius og den valgte maksimale vinkel pr. buk. Ved forhindringer prøves den valgte vinkel først, op til 90°, ud fra forhindringens mål og radiusens tangentlængder. Uafhængige forhindringer kan bruge forskellige vinkler, så en lav forhindring ikke i sig selv sænker vinklen ved en anden. Overlappende forhindringer kan få en fælles omvej. Den valgte vinkel og alle alternativer skal stadig bestå den fulde kontrol af vægge, frirum, radius, klammer og ender. Søgningen er begrænset; hvis den bruger mindre vinkler, vises den mindste ekstra anvendte vinkel ved tegningen. Beskeden bevares ved validering, genåbning og projektfiler, mens ændringer i mål eller manuel rørredigering rydder den gamle besked. Et kortere rør med 45° vinder ikke over et fundet kontrolleret 90°-forslag alene på materialeforbrug. Det følger det opmålte vægforløb mellem start og slut og skal passe gennem alle klammer på lige stykker. Rørets faktiske radiusbuer kontrolleres mod de tegnede vægge og forhindringer. Der loves ikke globalt korteste rute. Tætte eller modstridende placeringer kan give en forklaring om, at intet kontrolleret forslag blev fundet.

Nye vægforløb tillader som udgangspunkt 90° pr. buk, så et almindeligt retvinklet væghjørne får ét 90°-buk, når radius og plads tillader det. En grænse på 45° kræver mindst to buk for samme retningsændring. Gemte valg bevares. Tillad 90°-buk og lav nyt forslag ændrer grænsen efter et aktivt tryk og opdaterer forslaget; det eksisterende rør erstattes først ved Brug rørforslaget.

Tegn vægforløb åbnes som en selvstændig side med samme tegneområde og værktøjsstil som den almindelige rørtegning. Vægindstillingerne er opdelt i fanerne Vægge, Placering, Klammer og Forhindringer, med ét aktivt panel ad gangen. På pc står panelet ved siden af tegningen; på telefon står det under tegningen. Valg af en vægreference, klamme, forhindring eller A/B i tegningen åbner den relevante fane. I Klammer/Forhindringer kan man fortsat trykke på væggen for at vælge placeringen. Fanerne kan betjenes med piletaster, Home og End. Ugyldige felter i skjulte paneler bliver vist, før validering forklarer fejlen. Tegningen har tofingerzoom, musehjulszoom, Tilpas visning og panorering. Vægforløbet viser kun et ikon til Tilpas visning ved Væg/Rør-knapperne; plus/minus og zoomprocent fylder ikke tegningen. Musehjul, tofingerzoom, panorering og tastatur virker fortsat. Den valgte længde eller bukkevinkel redigeres under tegningen. Tryk vælger den nærmeste faktiske rørgeometri inden for mindst 22 skærmpixel, uanset stykkets retning og SVG-elementernes rækkefølge. Små fingerbevægelser på op til 12 pixel tolereres ved et tryk; panorering og tofingerzoom vælger ikke et rørstykke. Ved indzoomning følger rørets synlige bredde den faktiske diameter, og væggens flade vises som en tynd grænse med baggrund på vægsiden. Markeringer og tekst beholder en læsbar størrelse på skærmen. Detaljemål viser den beregnede frie afstand fra væggen til rørets yderside, når afstanden er stor nok i visningen til et tydeligt mål. Radiusbuer tegnes som cirkelbuer. Tilføjede vægstykker vises som kompakte rækker med længde og drejning; hver række kan foldes ud for at rette målene. Automatiske ændringer og måloversigten kan også foldes ud efter behov.

Rediger rør i vægvisningen beregner rørføringen samlet, når en længde, bukkevinkel eller retning ændres. Det valgte mål fastholdes, mens andre rørlængder og om nødvendigt andre buk tilpasses. Beregningen søger først efter små, nærliggende ændringer og udvider søgningen til andre rørstykker. Den er ikke bundet til en bestemt form eller et bestemt antal buk omkring en forhindring. En ændring kan fordeles til begge sider eller tages fra den side, hvor der er plads. A, B, vægge, forhindringer og klammer bliver ved deres valgte placeringer. Radius, maksimal bukkevinkel og frirum kontrolleres med rørets faktiske radiusbuer, før et resultat tilbydes. De automatisk ændrede L- og B-mål vises, så resultatet kan gennemgås og fortrydes. Længder måles mellem de tænkte centerlinjehjørner.

Hvis beregningen ikke finder et kontrolleret resultat, bevares den seneste rørføring, og det ønskede mål vises som en ikke anvendt rettelse. Der loves ikke, at alle geometrisk mulige løsninger kan findes, og beregningen tilføjer ikke nye buk automatisk. Ændr eventuelt mål, endepunkter, klammer eller den tilladte vinkel, og prøv igen. Brug rørforslaget er blokeret, mens en ønsket rettelse ikke er opfyldt.

Avanceret redigering af hjørnepunkternes X/Y-mål er også tilgængelig. Brug rørforslaget kontrollerer røret igen og erstatter først derefter det aktuelle rør; ændringen kan fortrydes. Vægforløbet og den rettede rørføring gemmes med projektet, og genåbning kontrollerer med de aktuelle dimensioner og klammer. Ældre rektangulære rumplaner bevarer deres vægge, klammer, forhindringer og rørføring ved konvertering til vægstykker. Ældre projekter uden måltype bliver ved med at bruge tangentlængder.


### Buk op/ned og højder (v37)

Rørredigeringen understøtter nu rumlige buk med venstre/højre, op/ned og frem/tilbage efter et lodret stykke. Vinkler og længder bruger samme radius og målereference som almindelige rør. Et valgfrit bukkeplan kan indtastes i grader. Alle højder har nul ved A.

Visningen kan skiftes mellem den oprindelige rørtegning, ovenfra, forfra, fra siden og 3D-overblik, som kan drejes med mus eller én finger. Lodrette stykker får op/ned-symboler ovenfra. Overlappende lige stykker bevarer deres virkelige koordinater; skjulte dele vises stiplet og kan vælges ved tryk. Zoom gør rørdiameter og bukkurver mere detaljerede.

Arbejdsvisning og SVG/PDF viser projektioner og højder samt en ekstra kolonne for drejning før hvert buk. Drejning er set A→B, positiv med uret; første reference vises ved A som 0°, øvrige drejninger følger det foregående buk. Værktøjstabellernes afsætningsmål og kaplængder bruger fortsat den dokumenterede metode.

Projektformatversion 1 bevares med valgfrie `bendRotations` og `startFrame`; gamle projekter og måledata fungerer fortsat. Begge ender, redigering, Fortryd og JSON-overførsel bevarer rumlig geometri. Vægplanlæggeren er fortsat 2D: den kan ikke godkende højdeskift eller erstatte et rumligt rør med et 2D-forslag. Dens vægudkast kan stadig redigeres separat.


### Visninger og arbejdstegning (v38)

Visningsskift viser nu den valgte SVG ved at styre dens HTML-attribut direkte; SVG-elementers `hidden`-egenskab fungerer ikke som på HTML-elementer. Den skjulte tegnings kamera påvirker ikke zoomknapperne.

Arbejdsvisningen viser igen én stor tegning. Vælg overblik, ovenfra, forfra, fra siden eller 3D i værktøjslinjen; SVG og udskrift bruger samme valgte side. Plane projekter beholder deres oprindelige overblikstegning. Andre sider udelader mål på stykker, der ses fra enden, skjulte stykker og buk, der kun fremstår som en streg. Ovenfra bevares symboler og højdeskift for lodrette rør. De fulde afsætningsmål og bukkedata nedenunder bevares uafhængigt af visningen.


### Retningsrække og højdelag (v39)

Venstre/højre, vandret og op/ned samt eventuelle frem/tilbage-knapper står samlet i én række. På helt smalle skærme kan rækken rulles sidelæns uden at gøre trykfladerne mindre.

I arbejdsvisningen ovenfra kan Lag vise alle højder eller et bestemt højdeniveau fra A. Det valgte lag viser sine egne rørstykker og mål, selv om andre rørstykker ligger over dem i samme projektion. Ved overgange angives op/ned og næste højdeniveau. L/B-numrene bevares, og hele rørets afsætningsmål og kaplængde ændres ikke. Valget følger med i SVG og udskrift. Andre visninger viser fortsat hele røret.


De rumlige visninger har Mål: Alle mål / Ved tryk. Ved tryk vises kun data for det valgte rørstykke eller buk; et tryk i et tomt område skjuler dem igen. I redigeringen kan den viste målmarkering trykkes igen for at rette målet. Arbejdstegningen bruger samme valg ved SVG og udskrift, og et valgt højdelag afgrænser også, hvilke dele der kan vælges. Retningen og alle afsætningsdata bevares.
