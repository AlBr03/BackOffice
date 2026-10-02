This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Zescijferige ordernummers

Voer `supabase/migrations/20261002130000_six_digit_order_numbers.sql` uit voordat de bijgewerkte orderinvoer wordt uitgerold. De bestaande beveiligingsmigraties moeten al zijn uitgevoerd (schema `app_private`). Nieuwe orders krijgen centraal een nummer vanaf `100001`, zonder prefix. Bestaande nummers, interne UUIDs en trackinglinks blijven behouden. Ook oude browsertabs krijgen bij invoegen de nieuwe nummering.

De database reserveert bestaande zescijferige nummers en voorkomt dubbele nummers met een unieke index. De reeks loopt tot `999999`, wordt nooit hergebruikt en kan gaten bevatten na mislukte invoer. Plan een opvolgende nummeringsstrategie voordat deze reeks uitgeput raakt. Controleer na migratie op een testdatabase ook gelijktijdige invoer vanuit twee sessies; beide orders moeten verschillende zescijferige nummers krijgen.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Dropdownbeheer vereist de migratie `supabase/migrations/20261002_add_dropdown_settings.sql`.
Voer deze uit via de bestaande Supabase-migratieworkflow of de SQL-editor, vóórdat de nieuwe instellingenpagina wordt gebruikt.
De migratie voegt centrale keuzelijsten en toegangsregels toe: iedereen kan de openbare labels lezen; alleen `admin` en `office` kunnen wijzigingen opslaan.
Zonder de migratie blijven de standaardopties beschikbaar en toont de instellingenpagina dat de database-inrichting ontbreekt.

Controleer keuzelijstvalidatie en API-toegang met `node --test tests/dropdown-settings.test.mjs`.

Bedrijfsinstellingen en persoonlijke voorkeuren vereisen daarna `supabase/migrations/20261002120000_add_business_settings.sql`.
Voer de dropdownmigratie **eerst** uit, gevolgd door deze migratie. Ze voegt centrale bedrijfsregels, gebruikersvoorkeuren, een beschermde wijzigingshistorie en databasevalidatie voor verplichte ordervelden toe.
Alleen `admin` en `office` beheren gedeelde instellingen en lezen de historie. Medewerkers beheren uitsluitend hun eigen voorkeuren. De publieke functie `public_business_details` deelt alleen bedrijfs- en winkelcontactgegevens; leveranciers en interne workflowregels worden niet publiek gedeeld.

Instellingen staan onder **Instellingen → Bedrijfsinstellingen**. Persoonlijke keuzes staan onder **Profielmenu → Mijn voorkeuren**. Herstel gebeurt als concept, met een voorbeeld vóór opslaan. Bestaande orderwaarden en de bestaande remindertermijnen blijven standaard behouden. Cron gebruikt bedrijfsinstellingen via het serveraccount, zonder een medewerkerssessie nodig te hebben. Mailvoorbeelden gebruiken de echte mailrendering met een afzonderlijke previewcontext die de mailtransportlaag niet aanroept.

Voer de gedragstests uit met `node --test tests/dropdown-settings.test.mjs tests/business-settings.test.mjs`, gevolgd door `npm run lint` en `npm run build`.
De tests gebruiken database- en mailmocks; controleer na het uitvoeren van de migraties ook de toegangsregels en verplichte ordervelden op een testdatabase.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
