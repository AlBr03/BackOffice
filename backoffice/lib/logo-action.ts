export const LOGO_ACTION_OPTIONS = [
  {
    value: 'bestellen',
    label: 'Bestellen',
    customerLabel: "Logo's worden besteld",
    customerDescription: "De winkel verwerkt het bestellen van de benodigde logo's.",
  },
  {
    value: 'aanwezig',
    label: 'Aanwezig',
    customerLabel: "Logo's zijn aanwezig",
    customerDescription: "De benodigde logo's zijn al beschikbaar voor deze bestelling.",
  },
  {
    value: 'klant_aanleveren',
    label: 'Klant levert aan',
    customerLabel: "Logo's aanleveren",
    customerDescription: "Lever de logo's aan via deze pagina, zodat de printafdeling verder kan.",
  },
  {
    value: 'niet_nodig',
    label: 'Niet nodig',
    customerLabel: "Logo's niet nodig",
    customerDescription: 'Voor deze bestelling hoeven geen losse logobestanden aangeleverd te worden.',
  },
] as const

export type LogoAction = (typeof LOGO_ACTION_OPTIONS)[number]['value']

export function getLogoAction(value?: string | null) {
  return (
    LOGO_ACTION_OPTIONS.find((option) => option.value === value) ?? {
      value: value ?? '',
      label: value ?? '-',
      customerLabel: value ?? '-',
      customerDescription: 'Neem bij twijfel contact op met de winkel.',
    }
  )
}

export function shouldCustomerUploadLogo(value?: string | null) {
  return value === 'klant_aanleveren'
}
