import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UploadForm } from '@/components/upload-form'
import { StatusForm } from '@/components/status-form'
import { OrderDetailLiveShell } from '@/components/order-detail-live-shell'
import { DeleteOrderButton } from '@/components/delete-order-button'
import { CopyTrackingLinkButton } from '@/components/copy-tracking-link-button'
import { parseProductDescription } from '@/lib/order-fields'
import { isOfficeLikeRole } from '@/lib/roles'
import {
  getArticleStatusStyle,
  getPrintStatusStyle,
  translateArticleStatus,
  translatePrintStatus,
} from '@/lib/order-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ id: string }>
}

const ORDER_DETAIL_SELECT = `
  id,
  order_number,
  tracking_token,
  club_name,
  accepted_by,
  wefact_reference,
  wefact_quote_reference,
  wefact_quote_url,
  wefact_invoice_reference,
  wefact_invoice_url,
  logo_action,
  supplier,
  customer_email,
  article_status,
  print_status,
  print_proof_status,
  print_proof_feedback,
  print_proof_responded_at,
  product_description,
  print_instructions,
  quantity,
  has_print,
  status,
  deadline,
  delivery_date,
  notes,
  created_at,
  updated_at,
  order_items (
    product,
    quantity,
    product_code
  ),
  stores (
    id,
    name
  )
`

const ORDER_DETAIL_SELECT_WITHOUT_PRINT_PROOF = `
  id,
  order_number,
  tracking_token,
  club_name,
  accepted_by,
  wefact_reference,
  wefact_quote_reference,
  wefact_quote_url,
  wefact_invoice_reference,
  wefact_invoice_url,
  logo_action,
  supplier,
  customer_email,
  article_status,
  print_status,
  product_description,
  print_instructions,
  quantity,
  has_print,
  status,
  deadline,
  delivery_date,
  notes,
  created_at,
  updated_at,
  order_items (
    product,
    quantity,
    product_code
  ),
  stores (
    id,
    name
  )
`

const ORDER_DETAIL_SELECT_LEGACY = `
  id,
  order_number,
  tracking_token,
  club_name,
  accepted_by,
  wefact_reference,
  logo_action,
  supplier,
  customer_email,
  article_status,
  print_status,
  product_description,
  print_instructions,
  quantity,
  has_print,
  status,
  deadline,
  delivery_date,
  notes,
  created_at,
  updated_at,
  order_items (
    product,
    quantity,
    product_code
  ),
  stores (
    id,
    name
  )
`

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('nl-NL')
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('nl-NL')
}

function translateLogoAction(value?: string | null) {
  switch (value) {
    case 'bestellen':
      return 'Bestellen'
    case 'aanwezig':
      return 'Aanwezig'
    case 'niet_nodig':
      return 'Niet nodig'
    default:
      return value ?? '-'
  }
}

function translatePrintProofStatus(value?: string | null) {
  switch (value) {
    case 'approved':
      return 'Goedgekeurd'
    case 'rejected':
      return 'Afgewezen'
    default:
      return 'Nog niet beoordeeld'
  }
}

function getStoreName(stores?: { name?: string | null } | { name?: string | null }[] | null) {
  const store = Array.isArray(stores) ? stores[0] : stores

  return store?.name ?? '-'
}

function renderWefactValue(reference?: string | null, url?: string | null) {
  const trimmedReference = reference?.trim()
  const trimmedUrl = url?.trim()

  if (!trimmedReference && !trimmedUrl) {
    return '-'
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div>{trimmedReference || '-'}</div>
      {trimmedUrl ? (
        <a
          href={trimmedUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--intersport-blue)' }}
        >
          Open in Wefact
        </a>
      ) : null}
    </div>
  )
}

function withMissingPrintProofFields<T extends object>(order: T) {
  return {
    print_proof_status: 'pending',
    print_proof_feedback: null,
    print_proof_responded_at: null,
    ...order,
  }
}

function InfoField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <div style={{ color: 'var(--text-soft)', fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, store_id')
    .eq('id', user.id)
    .single()

  const canDelete = isOfficeLikeRole(profile?.role)

  let { data: order, error } = await supabase
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('id', id)
    .single()

  if (error && /print_proof_/i.test(error.message)) {
    const fallbackResult = await supabase
      .from('orders')
      .select(ORDER_DETAIL_SELECT_WITHOUT_PRINT_PROOF)
      .eq('id', id)
      .single()

    error = fallbackResult.error
    order = fallbackResult.data ? withMissingPrintProofFields(fallbackResult.data) : null
  }

  if (error && /wefact_(quote|invoice)_/i.test(error.message)) {
    const fallbackResult = await supabase
      .from('orders')
      .select(ORDER_DETAIL_SELECT_LEGACY)
      .eq('id', id)
      .single()

    error = fallbackResult.error

    if (fallbackResult.data) {
      order = {
        ...withMissingPrintProofFields(fallbackResult.data),
        ...fallbackResult.data,
        wefact_quote_reference: fallbackResult.data.wefact_reference ?? null,
        wefact_quote_url: null,
        wefact_invoice_reference: null,
        wefact_invoice_url: null,
      }
    } else {
      order = null
    }
  }

  if (error || !order) {
    notFound()
  }

  const { data: files } = await supabase
    .from('order_files')
    .select('id, file_name, file_path, mime_type, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const signedFiles = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage
        .from('print-files')
        .createSignedUrl(file.file_path, 60 * 60)

      return {
        ...file,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

  const { data: activity } = await supabase
    .from('order_activity_log')
    .select('id, action_type, description, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const articleStatusStyle = getArticleStatusStyle(order.article_status)
  const printStatusStyle = getPrintStatusStyle(order.print_status)
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const trackingUrl =
    publicAppUrl && order.tracking_token
      ? `${publicAppUrl.replace(/\/$/, '')}/bestelstatus/${order.tracking_token}`
      : null
  const productLines = order.order_items?.length
    ? order.order_items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        productCode: item.product_code ?? '',
      }))
    : parseProductDescription(order.product_description, order.quantity)

  return (
    <OrderDetailLiveShell>
      <div className="ui-stack">
        <section className="ui-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ marginBottom: 10 }}>
                <Link href="/dashboard" style={{ fontWeight: 600 }}>
                  ← Terug naar dashboard
                </Link>
              </div>

              <div className="ui-eyebrow" style={{ marginBottom: 8 }}>Intersport order</div>

              <h1 className="ui-title">
                {order.order_number}
              </h1>

              <p className="ui-text-muted" style={{ margin: '10px 0 12px 0' }}>
                Bekeken door {profile?.full_name ?? 'gebruiker'}
              </p>

              <div className="ui-actions">
                <Link
                  href={`/dashboard/orders/${order.id}/edit`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: 'var(--button-background)',
                    color: 'white',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Order bewerken
                </Link>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  background: articleStatusStyle.background,
                  color: articleStatusStyle.color,
                  padding: '8px 14px',
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Artikelen: {translateArticleStatus(order.article_status)}
              </div>
              {order.has_print ? (
                <div
                  style={{
                    background: printStatusStyle.background,
                    color: printStatusStyle.color,
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  Print: {translatePrintStatus(order.print_status)}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ui-detail-layout">
          <div className="ui-stack">
            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Administratie
              </h2>

              <div className="ui-grid-two" style={{ gap: 16 }}>
                <InfoField label="Winkel" value={getStoreName(order.stores)} />
                <InfoField label="Naam klant / vereniging" value={order.club_name} />
                <InfoField label="E-mail klant" value={order.customer_email || '-'} />
                <InfoField label="Aangenomen door" value={order.accepted_by || '-'} />
                <InfoField
                  label="Wefact offerte"
                  value={renderWefactValue(
                    order.wefact_quote_reference ?? order.wefact_reference,
                    order.wefact_quote_url
                  )}
                />
                <InfoField
                  label="Wefact factuur"
                  value={renderWefactValue(
                    order.wefact_invoice_reference,
                    order.wefact_invoice_url
                  )}
                />
                <InfoField label="Aangemaakt" value={formatDate(order.created_at)} />
                <InfoField
                  label="Laatst bijgewerkt"
                  value={formatDate(order.updated_at)}
                />
              </div>
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Producten
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {productLines.map((line, index) => (
                  <div
                    key={`${line.product}-${index}`}
                    className="ui-product-row"
                    style={{ gridTemplateColumns: 'minmax(0, 2fr) 120px minmax(0, 1fr)', gap: 16 }}
                  >
                    <InfoField label="Product" value={line.product} />
                    <InfoField label="Aantal" value={line.quantity} />
                    <InfoField label="Productcode" value={line.productCode || '-'} />
                  </div>
                ))}
              </div>
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Print
              </h2>

              <div className="ui-grid-two" style={{ gap: 16 }}>
                <InfoField label="Leverancier" value={order.supplier || '-'} />
                <InfoField label="Totaal aantal" value={order.quantity} />
                <InfoField
                  label="Print nodig"
                  value={order.has_print ? 'Ja' : 'Nee'}
                />
                <InfoField
                  label="Logo's"
                  value={translateLogoAction(order.logo_action)}
                />
                {order.has_print ? (
                  <>
                    <InfoField
                      label="Printvoorbeeld"
                      value={translatePrintProofStatus(order.print_proof_status)}
                    />
                    <InfoField
                      label="Beoordeeld op"
                      value={formatDateTime(order.print_proof_responded_at)}
                    />
                  </>
                ) : null}
              </div>

              {order.has_print &&
              order.print_proof_status === 'rejected' &&
              order.print_proof_feedback?.trim() ? (
                <div className="ui-card-soft" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
                  <div style={{ color: 'var(--text-soft)', fontSize: 13, marginBottom: 6 }}>
                    Feedback klant
                  </div>
                  <div style={{ fontWeight: 700 }}>{order.print_proof_feedback}</div>
                </div>
              ) : null}
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Levering
              </h2>

              <div className="ui-grid-two" style={{ gap: 16 }}>
                <InfoField label="Deadline" value={formatDate(order.deadline)} />
                <InfoField
                  label="Datum uitlevering"
                  value={formatDate(order.delivery_date)}
                />
              </div>
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Opmerkingen
              </h2>

              <div className="ui-card-soft" style={{ minHeight: 90, whiteSpace: 'pre-wrap' }}>
                {order.notes?.trim() ? order.notes : 'Geen opmerkingen toegevoegd.'}
              </div>
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Printinstructies
              </h2>

              <div className="ui-card-soft" style={{ minHeight: 90, whiteSpace: 'pre-wrap' }}>
                {order.print_instructions?.trim()
                  ? order.print_instructions
                  : 'Geen printinstructies toegevoegd.'}
              </div>
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Activiteit
              </h2>

              {(activity ?? []).length === 0 ? (
                <div className="ui-text-muted">Nog geen activiteit beschikbaar.</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {(activity ?? []).map((item) => (
                    <div key={item.id} className="ui-card-soft">
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {item.description}
                      </div>
                      <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ui-stack" style={{ alignSelf: 'start' }}>
            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Track & trace link
              </h2>

              <div className="ui-card-soft" style={{ display: 'grid', gap: 12 }}>
                <div style={{ color: 'var(--text-soft)', lineHeight: 1.6 }}>
                  Gebruik deze link in klantmails om de publieke bestelstatus te tonen.
                </div>

                {trackingUrl ? (
                  <>
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontWeight: 700,
                        wordBreak: 'break-all',
                      }}
                    >
                      {trackingUrl}
                    </a>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <CopyTrackingLinkButton url={trackingUrl} />
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ui-link-button"
                      >
                        Openen
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-soft)', fontWeight: 600 }}>
                    Stel `NEXT_PUBLIC_APP_URL` in om een volledige publieke link te tonen.
                  </div>
                )}
              </div>
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Statussen
              </h2>

              <StatusForm
                orderId={order.id}
                currentArticleStatus={order.article_status}
                currentPrintStatus={order.print_status}
                hasPrint={order.has_print}
              />
            </div>

            <div className="ui-card">
              <h2 className="ui-section-title" style={{ marginBottom: 18 }}>
                Printbestanden
              </h2>

              {order.has_print ? (
                <div style={{ marginBottom: 18 }}>
                  <UploadForm orderId={order.id} />
                </div>
              ) : null}

              {!order.has_print ? (
                <div className="ui-card-soft" style={{ fontWeight: 600 }}>
                  Voor deze order is geen print vereist.
                </div>
              ) : signedFiles.length === 0 ? (
                <div className="ui-card-soft" style={{ fontWeight: 600 }}>
                  Er zijn nog geen printbestanden geüpload.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {signedFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.signedUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="ui-card-soft"
                      style={{ display: 'block', color: 'var(--text)', textDecoration: 'none' }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {file.file_name}
                      </div>
                      <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                        {file.mime_type || 'Bestand'} · {formatDate(file.created_at)}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {canDelete ? (
              <div className="ui-card" style={{ borderColor: 'rgba(176, 0, 18, 0.18)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 18, color: '#b00012' }}>
                  Gevaarzone
                </h2>

                <p style={{ marginTop: 0, color: 'var(--text-soft)' }}>
                  Verwijder deze order definitief uit het systeem.
                </p>

                <DeleteOrderButton
                  orderId={order.id}
                  orderNumber={order.order_number}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </OrderDetailLiveShell>
  )
}
