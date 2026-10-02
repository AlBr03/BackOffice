# Gebruikershandleiding INTERSPORT Backoffice

Versie: 2 oktober 2026  
Doelgroep: winkels, hoofdkantoor, bestelverantwoordelijken, printafdeling, beheerders en klanten

## 1. Doel van de backoffice

De INTERSPORT Backoffice ondersteunt het volledige proces rond bestellingen voor klanten en verenigingen. In het systeem kunnen medewerkers:

- orders aanmaken, bekijken en bijwerken;
- producten, leveranciers, deadlines en printinformatie vastleggen;
- de voortgang van artikelen en printwerk beheren;
- printbestanden en aangeleverde logo's raadplegen;
- klanten automatisch informeren per e-mail;
- klanten via een persoonlijke track-&-tracepagina de order laten volgen;
- printvoorbeelden door klanten laten goedkeuren of afwijzen;
- interne wijzigingen en automatische herinneringen volgen;
- gebruikers, rollen en winkels beheren, afhankelijk van de toegekende rol.

Welke informatie en functies beschikbaar zijn, wordt bepaald door de rol van de gebruiker.

## 2. Rollen en rechten

| Functie | Winkel | Hoofdverantwoordelijke winkel | Hoofdkantoor | Bestelverantwoordelijke | Printafdeling | Beheerder |
| --- | --- | --- | --- | --- | --- | --- |
| Orders bekijken | Alleen eigen winkel | Alleen eigen winkel | Alle winkels | Alle winkels | Alleen orders met printwerk | Alle winkels |
| Nieuwe order aanmaken | Ja, voor eigen winkel | Ja, voor eigen winkel | Ja, voor iedere winkel | Ja, voor iedere winkel | Nee | Ja, voor iedere winkel |
| Ordergegevens bewerken | Eigen winkel | Eigen winkel | Alle orders | Alle orders | Nee | Alle orders |
| Artikelenstatus wijzigen | Eigen winkel | Eigen winkel | Alle orders | Alle orders | Nee | Alle orders |
| Printstatus wijzigen | Eigen printorders | Eigen printorders | Alle printorders | Alle printorders | Alle printorders | Alle printorders |
| Printbestanden uploaden | Eigen printorders | Eigen printorders | Alle printorders | Alle printorders | Alle printorders | Alle printorders |
| Bestanden bekijken/downloaden | Eigen orders | Eigen orders | Alle orders | Alle orders | Alle printorders | Alle orders |
| Order verwijderen | Nee | Eigen winkel | Alle orders | Alle orders | Nee | Alle orders |
| Instellingen openen | Nee | Nee | Ja | Ja | Nee | Ja |
| Accounts en rollen beheren | Nee | Nee | Ja | Ja | Nee | Ja |
| Winkels beheren | Nee | Nee | Ja | Ja | Nee | Ja |
| Bedrijfsinstellingen en keuzelijsten beheren | Nee | Nee | Ja | Nee | Nee | Ja |
| Eigen dashboard en notificaties instellen | Ja | Ja | Ja | Ja | Ja | Ja |

> De rol **Bestelverantwoordelijke** kan accounts, rollen, winkels en bestaande instellingen beheren. Bedrijfsinstellingen, keuzelijsten en hun wijzigingshistorie zijn uitsluitend beschikbaar voor **Hoofdkantoor** en **Beheerder**.

### 2.1 Nog niet toegewezen

Een nieuw account kan de rol **Nog niet toegewezen** hebben. De gebruiker kan dan wel inloggen, maar ziet nog geen orders en kan nog niet met de backoffice werken. Hoofdkantoor, een bestelverantwoordelijke of een beheerder moet eerst een definitieve rol toewijzen.

### 2.2 Winkel

Een winkelgebruiker werkt uitsluitend met orders van de gekoppelde winkel. Deze gebruiker kan:

- orders van de eigen winkel bekijken;
- een nieuwe order voor de eigen winkel aanmaken;
- gegevens van eigen orders bewerken;
- de artikelenstatus en, indien van toepassing, de printstatus wijzigen;
- printvoorbeelden uploaden;
- klantlogo's en printbestanden bekijken en downloaden;
- de track-&-tracelink gebruiken;
- meldingen over wijzigingen aan orders van de eigen winkel ontvangen.

Een winkelgebruiker kan geen orders verwijderen en heeft geen toegang tot de instellingen.

### 2.3 Hoofdverantwoordelijke winkel

Deze rol heeft dezelfde mogelijkheden als de rol Winkel, met als aanvullende bevoegdheid:

- orders van de eigen winkel definitief verwijderen.

Het e-mailadres van de hoofdverantwoordelijke wordt daarnaast gebruikt als antwoordadres voor klantmails wanneer dit account correct aan de winkel is gekoppeld.

### 2.4 Hoofdkantoor

Een hoofdkantoorgebruiker kan:

- orders van alle winkels bekijken;
- orders voor iedere winkel aanmaken;
- iedere order bewerken, statussen wijzigen en verwijderen;
- alle relevante bestanden bekijken en printvoorbeelden uploaden;
- filteren op winkel;
- accounts aanmaken, aanpassen en verwijderen;
- rollen en winkelkoppelingen beheren;
- winkels toevoegen, hernoemen en verwijderen;
- de weergave, mailstatus en koppelingen bekijken of beheren voor zover de interface dit ondersteunt.

### 2.5 Bestelverantwoordelijke

De bestelverantwoordelijke ontvangt orders waarvoor **Bestellen door inkoop** is gekozen. De rol ontvangt ook de bijbehorende automatische bestel- en leveringsherinneringen.

In de huidige technische inrichting heeft deze rol daarnaast dezelfde rechten als Hoofdkantoor en Beheerder. De bestelverantwoordelijke kan dus alle orders, instellingen, accounts en winkels beheren.

### 2.6 Printafdeling

De printafdeling ziet uitsluitend orders waarbij **Inclusief printwerk** is aangevinkt. Deze gebruiker kan:

- printorders van alle winkels bekijken;
- de printstatus wijzigen;
- klantlogo's en andere orderbestanden bekijken en downloaden;
- een printvoorbeeld uploaden;
- meldingen ontvangen over wijzigingen aan printorders;
- e-mails ontvangen wanneer een nieuwe printorder is aangemaakt;
- herinneringen ontvangen als te bestellen logo's na vijf dagen nog niet zijn besteld;
- een e-mail ontvangen wanneer een klant een printvoorbeeld goedkeurt of afwijst.

De printafdeling kan geen nieuwe order aanmaken, algemene ordergegevens bewerken, de artikelenstatus wijzigen, orders verwijderen of instellingen openen.

### 2.7 Beheerder

De beheerder heeft dezelfde functionele rechten als Hoofdkantoor en kan alle orders, accounts, rollen, winkels en instellingen beheren.

### 2.8 Klant of vereniging

Een klant heeft geen backofficeaccount nodig. Via de persoonlijke track-&-tracelink kan de klant:

- het ordernummer en de eigen klant- of verenigingsnaam bekijken;
- de artikelenstatus en eventuele printstatus volgen;
- de voortgang per processtap bekijken;
- de winkel, aanmaakdatum, deadline en uitleverdatum bekijken;
- de bestelde producten, artikelcodes, maten en aantallen bekijken;
- beschikbare printbestanden openen;
- de zichtbare orderactiviteit bekijken;
- logo's aanleveren wanneer **Klant levert aan** is ingesteld;
- een printvoorbeeld goedkeuren of met feedback afwijzen.

De track-&-tracelink geeft rechtstreeks toegang tot de publieke orderpagina. Deel deze link daarom alleen met de betreffende klant.

## 3. Inloggen en uitloggen

### Inloggen

1. Open de backoffice.
2. Vul het e-mailadres en wachtwoord in.
3. Kies **Inloggen**.
4. Na een succesvolle aanmelding wordt het dashboard geopend.

Bij een fout wordt de melding van het aanmeldsysteem onder het formulier getoond.

### Uitloggen

1. Open rechtsboven het ronde profielmenu.
2. Kies **Uitloggen**.
3. De actieve sessie wordt beëindigd en de inlogpagina wordt geopend.

### Een account aanvragen

Publieke registratie is standaard uitgeschakeld. Vraag Hoofdkantoor, een bestelverantwoordelijke of een beheerder om een account aan te maken. Als publieke registratie tijdelijk is ingeschakeld, krijgt een nieuw account eerst de rol **Nog niet toegewezen**.

## 4. Het dashboard gebruiken

Het dashboard toont de orders die bij de rol van de ingelogde gebruiker horen. Per order worden onder andere het ordernummer, de winkel, klantnaam, belangrijkste product, aantal, printindicatie en actuele statussen getoond.

### Zoeken en filteren

De volgende mogelijkheden zijn beschikbaar:

- zoeken op ordernummer;
- zoeken op klant- of verenigingsnaam;
- zoeken op productomschrijving;
- zoeken op Wefact-offerte- of factuurreferentie;
- filteren op artikelenstatus;
- filteren op printstatus;
- filteren op wel of geen printwerk;
- filteren op winkel voor Hoofdkantoor, Bestelverantwoordelijke en Beheerder.

Kies **Filteren** om de selectie toe te passen. Kies **Wissen** om terug te gaan naar het volledige overzicht. Het dashboard toont maximaal 100 orders per pagina. Gebruik **Vorige** en **Volgende** wanneer meerdere pagina's beschikbaar zijn.

Het zichtbare dashboard controleert iedere 30 seconden op bijgewerkte informatie. Een verborgen browsertab wordt hierbij overgeslagen.

## 5. Een nieuwe order aanmaken

De rollen Winkel, Hoofdverantwoordelijke winkel, Hoofdkantoor, Bestelverantwoordelijke en Beheerder kunnen orders aanmaken.

1. Kies op het dashboard **Nieuwe order**.
2. Selecteer de winkel. Bij een winkelrol staat de eigen winkel automatisch vast.
3. Vul de klant- en orderinformatie in.
4. Voeg één of meer productregels toe.
5. Leg vast wie de artikelen bestelt.
6. Vul indien nodig de voorraad-, print- en leveringsinformatie in.
7. Kies **Order opslaan**.

Na het opslaan wordt automatisch een uniek ordernummer aangemaakt en opent de orderdetailpagina.

### 5.1 Klantgegevens

- **Winkel**: verplicht; bij winkelrollen automatisch de gekoppelde winkel.
- **Naam klant / vereniging**: verplicht.
- **E-mailadres klant**: optioneel, maar noodzakelijk voor automatische klantmails.
- **Aangenomen door medewerker**: naam van de medewerker die de aanvraag heeft aangenomen.
- **Wefact offerte**: optionele referentie en directe URL.
- **Wefact factuur**: optionele referentie en directe URL.

### 5.2 Producten

Iedere productregel kan bevatten:

- artikelcode;
- omschrijving, verplicht;
- maat;
- aantal, minimaal één.

Gebruik de knop **+** om een extra productregel toe te voegen. Met **Kopieer** wordt een bestaande regel gedupliceerd. Met **Verwijder** wordt een regel weggehaald. Er blijft altijd minimaal één productregel beschikbaar.

### 5.3 Besteldetails

Kies bij **Bestellen door** één van de volgende opties:

- **Bestellen door inkoop**: de bestelverantwoordelijke is verantwoordelijk en ontvangt de betreffende mails en herinneringen.
- **Bestellen door winkel**: de hoofdverantwoordelijke van de gekoppelde winkel is verantwoordelijk.
- **Niet bestellen**: de artikelen hoeven niet te worden besteld.

Daarnaast kan een leverancier worden ingevuld.

Wanneer **Artikel niet direct op voorraad** wordt aangevinkt, kunnen ook worden ingevuld:

- de verwachte leverdatum van de artikelen;
- hoeveel dagen vóór deze datum een herinnering moet worden gestuurd.

### 5.4 Printdetails

Vink **Inclusief printwerk** aan wanneer printwerk nodig is. Daarna worden aanvullende velden zichtbaar:

- **Logo's / actie**:
  - Bestellen en drukvoorbeeld;
  - Aanwezig;
  - Klant levert aan;
  - Niet nodig.
- **Leverancier logo's**;
- **Printinstructies**.

Wanneer **Klant levert aan** is gekozen, verschijnt op de publieke track-&-tracepagina een formulier waarmee de klant `.ai`- en `.eps`-bestanden kan aanleveren.

### 5.5 Deadline en uitlevering

- **Deadline**: gewenste einddatum.
- **Datum uitlevering**: geplande datum waarop de bestelling wordt uitgeleverd.
- **Overige opmerkingen**: aanvullende interne orderinformatie.

## 6. Een order bekijken

Open een order door op het ordernummer in het dashboard te klikken. De detailpagina bevat:

- actuele artikelen- en printstatus;
- administratie- en klantgegevens;
- Wefact-referenties en links;
- alle productregels;
- leverancier en bestelverantwoordelijkheid;
- voorraad- en verwachte leverinformatie;
- printgegevens en printinstructies;
- beoordeling en eventuele feedback van het printvoorbeeld;
- deadline en uitleverdatum;
- overige opmerkingen;
- de laatste 50 activiteiten;
- de publieke track-&-tracelink;
- statusbeheer;
- klantlogo's en printbestanden;
- functies voor bewerken of verwijderen wanneer de rol dit toestaat.

De detailpagina wordt niet voortdurend automatisch vernieuwd. Wanneer de pagina minimaal 30 seconden verborgen is geweest, wordt de informatie één keer vernieuwd zodra de gebruiker terugkeert. Na eigen wijzigingen, statusupdates en uploads wordt de pagina eveneens vernieuwd.

## 7. Een order bewerken

1. Open de order.
2. Kies **Order bewerken**.
3. Pas de gewenste velden of productregels aan.
4. Kies **Wijzigingen opslaan**.

Winkelrollen kunnen alleen orders van hun eigen winkel bewerken. De gekoppelde winkel kan daarbij niet naar een andere winkel worden veranderd. Hoofdkantoor, Bestelverantwoordelijke en Beheerder kunnen de winkel wel aanpassen.

Een wijziging wordt vastgelegd in de activiteit van de order. Statussen worden niet in het bewerkformulier gewijzigd; gebruik daarvoor het afzonderlijke onderdeel **Statussen** op de detailpagina.

## 8. Statussen beheren

### 8.1 Artikelenstatus

De gebruikelijke volgorde is:

1. **Nieuw**: de artikelen zijn nog niet besteld.
2. **Besteld**: de bestelling bij de leverancier is geplaatst.
3. **Op locatie**: de artikelen zijn bij de winkel of verwerkingslocatie aangekomen.
4. **Afgerond**: het artikelenproces is voltooid.

### 8.2 Printstatus

Voor orders met printwerk is de gebruikelijke volgorde:

1. **Nieuw**: het printproces is nog niet gestart.
2. **Logo's besteld**: de benodigde logo's zijn besteld.
3. **Logo's op locatie**: de logo's zijn ontvangen.
4. **Afgerond**: het printwerk is voltooid.

Het systeem toont alle statussen in een keuzelijst en dwingt de bovenstaande volgorde niet af. Controleer daarom zorgvuldig welke status wordt gekozen.

### 8.3 Een status wijzigen

1. Open de order.
2. Ga naar **Statussen**.
3. Kies de nieuwe artikelenstatus en/of printstatus.
4. Kies **Statussen opslaan**.

De wijziging wordt in de activiteit vastgelegd. Als een klantmailadres aanwezig is en mail correct is ingesteld, ontvangt de klant automatisch een passende statusmail.

De printafdeling ziet in dit formulier alleen de printstatus. Andere bevoegde rollen kunnen zowel de artikelenstatus als de printstatus wijzigen.

### 8.4 Speciale klantmails

- Wanneer de artikelenstatus **Op locatie** is en geen print nodig is, ontvangt de klant een bericht dat de bestelling kan worden opgehaald.
- Bij een printorder wordt dit afhaalbericht verzonden wanneer de artikelen **Op locatie** zijn en de printstatus **Afgerond** is.
- Wanneer de artikelenstatus **Afgerond** wordt, ontvangt de klant een afrondings- en bedankmail.

## 9. Bestanden en printvoorbeelden

### 9.1 Een printvoorbeeld uploaden

1. Open een order met printwerk.
2. Ga naar **Bestanden**.
3. Selecteer bij **Upload printvoorbeeld** het bestand.
4. Kies **Printvoorbeeld uploaden**.

Na een succesvolle upload:

- wordt het bestand aan de order gekoppeld;
- wordt de beoordeling van het printvoorbeeld teruggezet naar **Nog niet beoordeeld**;
- wordt eerdere afwijzingsfeedback verwijderd;
- wordt een activiteit toegevoegd;
- ontvangt de klant, wanneer mogelijk, een e-mail met de track-&-tracelink om het voorbeeld te beoordelen.

Een individuele verwijderknop voor bestanden is momenteel niet beschikbaar. Wanneer een volledige order wordt verwijderd, worden de gekoppelde bestanden eveneens verwijderd.

### 9.2 Bestanden bekijken

Onder **Bestanden** staan twee groepen:

- **Aangeleverde logo's van klant**;
- **Printvoorbeelden ter beoordeling**.

Klik op een bestand om het in een nieuw tabblad te openen. Bestandslinks zijn tijdelijk en alleen beschikbaar voor gebruikers die toegang tot de betreffende order hebben.

## 10. Track & trace voor klanten

### 10.1 De link delen

1. Open de order.
2. Ga naar **Track & trace link**.
3. Kies **Link kopiëren**.
4. Deel de link uitsluitend met de betreffende klant.

Met **Openen** kan de medewerker controleren hoe de publieke pagina eruitziet.

De klant heeft voor deze pagina geen account nodig. De unieke link functioneert als toegangssleutel tot de publieke orderinformatie.

### 10.2 Logo's door de klant laten aanleveren

Het uploadformulier verschijnt alleen als:

- de order printwerk bevat; en
- bij Logo's / actie **Klant levert aan** is gekozen.

De klant kan één of meer `.ai`- of `.eps`-bestanden selecteren en uploaden. Na een succesvolle upload worden de bestanden zichtbaar in de backoffice en verschijnt een activiteit **Logo aangeleverd**.

> Tijdelijke technische beperking: het formulier vermeldt een maximum van 50 MB per bestand, maar de huidige uploadroute via Vercel accepteert in de praktijk maximaal ongeveer 4,5 MB voor de volledige aanvraag. Houd klantuploads voorlopig onder deze grens totdat directe uploads naar de bestandsopslag zijn geïmplementeerd.

### 10.3 Een printvoorbeeld beoordelen

Wanneer een printvoorbeeld beschikbaar is, kan de klant het op de track-&-tracepagina bekijken.

- Met **Goedkeuren** wordt het voorbeeld goedgekeurd.
- Met **Afwijzen met bericht** wordt het voorbeeld afgewezen. De klant moet beschrijven wat moet worden aangepast.
- Afwijzingsfeedback mag maximaal 2.000 tekens bevatten.

De beoordeling wordt direct bij de order opgeslagen en in de activiteit opgenomen. De printafdeling ontvangt een e-mail over de goedkeuring of afwijzing. Bij afwijzing wordt de feedback ook op de interne orderdetailpagina getoond.

## 11. Notificaties in de backoffice

Rechtsboven staat een bel-icoon. Het getal bij de bel geeft aan hoeveel nieuwe activiteiten sinds het laatste bezoek beschikbaar zijn.

De notificaties kunnen onder andere betrekking hebben op:

- een nieuw aangemaakte order;
- een bijgewerkte order;
- een statuswijziging;
- een verstuurde herinnering;
- een door de klant aangeleverd logo;
- een gereed printvoorbeeld;
- een goedgekeurd of afgewezen printvoorbeeld.

De lijst toont alleen activiteiten van andere gebruikers, klanten of het systeem. Eigen activiteiten worden niet als nieuwe notificatie aangeboden. Er worden maximaal 50 nieuwe activiteiten getoond.

De notificaties worden iedere minuut gecontroleerd. Bij het openen van het notificatiemenu worden de aanwezige meldingen als gezien gemarkeerd. Klik op een melding om de bijbehorende order te openen.

De zichtbaarheid volgt de rol:

- winkelrollen zien alleen notificaties van de eigen winkel;
- de printafdeling ziet alleen notificaties van orders met printwerk;
- Hoofdkantoor, Bestelverantwoordelijke en Beheerder zien notificaties van alle orders.

## 12. Automatische e-mails en herinneringen

Automatische e-mails worden alleen verstuurd als de benodigde ontvanger en mailinstellingen beschikbaar zijn.

### 12.1 Bij het aanmaken van een order

- De klant ontvangt een orderbevestiging wanneer een klantmailadres is ingevuld.
- De bestelverantwoordelijke ontvangt een bericht wanneer **Bestellen door inkoop** is gekozen.
- De hoofdverantwoordelijke van de gekoppelde winkel ontvangt een bericht wanneer **Bestellen door winkel** is gekozen.
- De printafdeling ontvangt een bericht wanneer de order printwerk bevat.

### 12.2 Bij wijzigingen

- Een statuswijziging kan automatisch een klantmail veroorzaken.
- Een geüpload printvoorbeeld veroorzaakt een beoordelingsmail aan de klant.
- Goedkeuring of afwijzing van het printvoorbeeld veroorzaakt een bericht aan de printafdeling.

### 12.3 Dagelijkse herinneringen

Het systeem controleert dagelijks welke herinneringen nodig zijn. Iedere herinnering wordt maximaal één keer verstuurd wanneer een ontvanger is gevonden.

De onderstaande termijnen en ontvangers zijn de standaardinstellingen. Hoofdkantoor en Beheerder kunnen reminders inschakelen of uitschakelen en termijnen en ontvangers aanpassen via **Instellingen → Bedrijfsinstellingen → Reminders**. Bestaande orders behouden een reeds ingevulde eigen termijn voor de verwachte levering.

- **Artikelen nog niet besteld**: na drie dagen in status Nieuw, naar de gekozen bestelverantwoordelijke.
- **Logo's nog niet besteld**: na vijf dagen bij een printorder met logoactie Bestellen en drukvoorbeeld en printstatus Nieuw, naar de printafdeling.
- **Bestelde artikelen nog niet binnen**: 21 dagen nadat de artikelenstatus Besteld is geworden, naar de gekozen bestelverantwoordelijke.
- **Verwachte artikellevering nadert**: bij een niet-direct-voorradig artikel, op het ingestelde aantal dagen vóór de verwachte leverdatum, naar de gekozen bestelverantwoordelijke.

Verstuurde herinneringen verschijnen ook in de activiteit en notificaties.

## 13. Accounts beheren

Beschikbaar voor Hoofdkantoor, Bestelverantwoordelijke en Beheerder via **Profielmenu → Instellingen → Accounts**.

### Een account aanmaken

1. Vul de volledige naam in.
2. Vul het e-mailadres in.
3. Geef een tijdelijk wachtwoord van minimaal acht tekens op.
4. Kies de rol.
5. Selecteer bij een winkelrol verplicht de juiste winkel.
6. Kies **Aanmaken**.

Het account wordt direct bevestigd en kan meteen worden gebruikt. Deel het tijdelijke wachtwoord op een veilige manier met de gebruiker.

### Een account aanpassen

Van een bestaand account kunnen de naam, rol en winkelkoppeling worden gewijzigd. Een winkelkoppeling is alleen beschikbaar en verplicht voor de rollen Winkel en Hoofdverantwoordelijke winkel.

### Een account verwijderen

Kies **Verwijderen** en bevestig de waarschuwing. Verwijderen kan niet ongedaan worden gemaakt. Een gebruiker kan het eigen ingelogde account niet verwijderen.

## 14. Winkels beheren

Beschikbaar voor Hoofdkantoor, Bestelverantwoordelijke en Beheerder via **Profielmenu → Instellingen → Winkels**.

- Voeg een winkel toe door een unieke winkelnaam in te vullen.
- Wijzig een bestaande winkelnaam en sla de wijziging op.
- Verwijder een winkel alleen als er geen accounts of orders meer aan zijn gekoppeld.

Als er gekoppelde gebruikers of orders bestaan, blokkeert het systeem het verwijderen van de winkel.

## 15. Overige instellingen

### Weergave

Onder **Weergave** kan worden gekozen tussen lichte en donkere modus. De keuze wordt op het gebruikte apparaat onthouden.

### Keuzelijsten

Beschikbaar voor **Hoofdkantoor** en **Beheerder** via **Profielmenu → Instellingen → Keuzelijsten**.

- Pas namen, volgorde en zichtbaarheid aan voor artikelenstatus, printstatus, bestellen door, printvoorbeeld/logoactie, gebruikersrollen en het dashboardfilter voor bedrukking.
- Voeg bij printvoorbeeld/logoactie nieuwe vrije opties toe. Vul ook de naam en uitleg in die de klant op de bestelstatuspagina ziet.
- Nieuwe vrije opties starten geen automatische reminders of verzoeken om logo's aan te leveren. Gebruik daarvoor de bestaande workflowopties.
- Beheer winkelopties via **Instellingen → Winkels**.
- Sla wijzigingen op met **Keuzelijsten opslaan**. Open of herlaad een pagina om de actuele opties te zien.

De interne werking van statussen, rollen en bestelverantwoordelijkheden blijft behouden. Verplichte opties kunnen niet worden verborgen. Opgeslagen opties worden verborgen in plaats van verwijderd; bestaande orders en accounts behouden hun gekozen optie. Als een andere beheerder tegelijk wijzigingen heeft opgeslagen, herlaad dan de pagina voordat je opnieuw wijzigt en opslaat.

Bekijk wijzigingen eerst via **Voorbeeld bekijken** en sla ze daarna op. Via **Wijzigingshistorie** kun je zien wie wanneer iets heeft aangepast en een eerdere versie als concept terugzetten. **Standaardkeuzelijsten als concept herstellen** zet de oorspronkelijke namen, volgorde en zichtbaarheid terug; opgeslagen vrije opties blijven behouden, maar worden verborgen.

### Bedrijfsinstellingen

Beschikbaar voor **Hoofdkantoor** en **Beheerder** via **Profielmenu → Instellingen → Bedrijfsinstellingen**.

- **Bedrijf en winkels**: stel de communicatienaam, contactgegevens, adres, openingstijden en mailhandtekening in. Contactgegevens verschijnen op de klantpagina. De bedrijfsnaam verschijnt in de applicatie en klantmails; de merkkleur wordt in klantmails gebruikt. Winkelgegevens overschrijven de bedrijfsgegevens waar ze zijn ingevuld. Wijzig de naam van een winkel in de keuzelijsten via het bestaande winkelbeheer.
- **Leveranciers**: beheer artikel- en printleveranciers met contactgegevens. Actieve leveranciers verschijnen als suggesties in orderformulieren. Bestaande orders behouden hun opgeslagen leverancier; vrije invoer blijft mogelijk. Deactiveer een leverancier in plaats van deze te verwijderen. Kies eerst een andere orderdefault als een leverancier nog als standaard wordt gebruikt.
- **Orderdefaults**: kies de standaardleveranciers, bestelverantwoordelijkheid en het aantal dagen vóór verwachte levering voor nieuwe orders. Via de winkeldetails kun je per winkel andere defaults instellen. Bestaande orders worden niet aangepast.
- **Reminders**: stel per reminder de termijn, ontvangers en aan/uit-keuze in. Winkelverantwoordelijken ontvangen uitsluitend reminders voor hun eigen winkel; de printafdeling uitsluitend voor printorders. Een eigen termijn op een bestaande order blijft leidend voor de leveringsherinnering.
- **Mailtemplates**: pas het onderwerp en de berichttekst per gebeurtenis aan en schakel mails afzonderlijk in of uit. Lege velden behouden de bestaande standaardtekst. Gebruik de getoonde placeholders, bijvoorbeeld `{{order_number}}`, `{{customer}}`, `{{store}}` en `{{tracking_url}}`. Het systeem voegt ordergegevens en contactinformatie toe. Het mailvoorbeeld gebruikt dezelfde opmaak als de echte mail, maar verstuurt niets.
- **Verplichte ordervelden**: bepaal welke aanvullende velden bij nieuwe orders of bij een bepaalde statuswijziging moeten zijn ingevuld. Winkel, klantnaam en productregels blijven verplicht. Printvelden gelden alleen voor printorders; de verwachte artikellevering alleen als artikelen niet op voorraad zijn. Vul ontbrekende gegevens via **Order bewerken** aan voordat je de status wijzigt.
- **Notificaties per rol**: bepaal welke ordergebeurtenissen in het notificatiemenu verschijnen en voor welke rollen. De bestaande toegang tot orders blijft van toepassing.

Gebruik **Voorbeeld bekijken** voordat je opslaat. De wijzigingshistorie vermeldt wie wanneer gedeelde instellingen heeft gewijzigd. Je kunt een eerdere versie of de standaardinstellingen als concept herstellen, controleren en opnieuw opslaan. Opgeslagen leveranciers blijven bij herstel behouden; ontbrekende leveranciers worden gedeactiveerd. Gelijktijdige wijzigingen van een andere beheerder worden niet ongemerkt overschreven.

### Mijn voorkeuren

Iedere ingelogde medewerker kan via **Profielmenu → Mijn voorkeuren** de eigen weergave instellen:

- lichte of donkere modus;
- standaardfilters voor artikelenstatus, printstatus en printwerk;
- sortering van het dashboard;
- zichtbare kolommen, waarbij de orderkolom altijd blijft staan;
- notificatie-events die de medewerker zelf wil ontvangen.

Deze voorkeuren gelden alleen voor het eigen account. De kleurmodus wordt ook op het gebruikte apparaat onthouden. Een persoonlijke notificatiekeuze kan een bedrijfsregel of toegangsbeperking niet verruimen. Met **Wissen** op het dashboard worden de filters voor die weergave leeggemaakt. De opgeslagen standaardfilters worden bij het opnieuw openen van het dashboard weer gebruikt.

### Mail

De pagina **Mail** toont of de benodigde serverinstellingen aanwezig zijn. Geheime waarden en wachtwoorden worden niet weergegeven. Onderwerpen, teksten en mailhandtekeningen zijn aanpasbaar via **Bedrijfsinstellingen**; de technische mailverbinding wordt via de serverconfiguratie beheerd.

### Koppelingen

De pagina **Koppelingen** toont de huidige ondersteuning voor:

- Wefact-offerte- en factuurreferenties met directe links;
- de publieke track-&-tracefunctie.

## 16. Een order verwijderen

Alleen Hoofdkantoor, Bestelverantwoordelijke, Beheerder en de Hoofdverantwoordelijke van de betreffende winkel kunnen een order verwijderen.

1. Open de order.
2. Ga naar het rode verwijdergedeelte onderaan de pagina.
3. Kies **Order verwijderen**.
4. Bevestig de waarschuwing.

Deze handeling kan niet ongedaan worden gemaakt. De order, gekoppelde databasegegevens en opgeslagen bestanden worden verwijderd.

## 17. Praktische aandachtspunten

- Vul waar mogelijk altijd het klantmailadres in; zonder dit adres worden klantmails overgeslagen.
- Controleer vóór het opslaan de winkel, bestelverantwoordelijkheid en printindicatie. Deze keuzes bepalen wie de order en automatische e-mails ontvangt.
- Gebruik **Afgerond** pas wanneer het betreffende proces werkelijk klaar is.
- Upload een nieuw printvoorbeeld na een afwijzing; de klant krijgt dan opnieuw de mogelijkheid om te beoordelen.
- Deel een track-&-tracelink niet met anderen dan de betreffende klant.
- Verwijder orders en accounts alleen wanneer dit werkelijk nodig is; deze acties kunnen niet worden teruggedraaid.
- Meld ontbrekende mails eerst bij de beheerder. Die kan onder **Instellingen → Mail** controleren of de technische mailconfiguratie compleet is.

## 18. Bekende beperkingen

- Er is nog geen functie voor een gebruiker om zelf het wachtwoord te wijzigen of te herstellen.
- Individuele orderbestanden kunnen niet via de interface worden verwijderd.
- Het systeem dwingt de logische volgorde van statussen niet af.
- De detailpagina werkt niet volledig realtime; de pagina wordt vernieuwd na eigen acties of wanneer een gebruiker na minimaal 30 seconden terugkeert naar een verborgen tabblad.
- Publieke logo-uploads via de huidige serverroute zijn praktisch beperkt tot ongeveer 4,5 MB per aanvraag, ondanks de zichtbare grens van 50 MB per bestand.
- De rollen Hoofdkantoor, Bestelverantwoordelijke en Beheerder hebben momenteel dezelfde brede beheerrechten.

## 19. Ondersteuning

Vermeld bij een probleem altijd:

- het ordernummer;
- de eigen gebruikersrol;
- welke handeling werd uitgevoerd;
- de volledige foutmelding;
- het tijdstip waarop het probleem optrad.

Bij vragen van een klant kan de winkel de order opzoeken via het ordernummer en de actuele voortgang controleren op de interne orderdetailpagina.
