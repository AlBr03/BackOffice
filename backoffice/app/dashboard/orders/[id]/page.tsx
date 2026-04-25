import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UploadForm } from '@/components/upload-form'
import { StatusForm } from '@/components/status-form'
import { OrderDetailLiveShell } from '@/components/order-detail-live-shell'
import { DeleteOrderButton } from '@/components/delete-order-button'
import { CopyTrackingLinkButton } from '@/components/copy-tracking-link-button'
import { parseProductDescription } from '@/lib/order-fields'
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
        <a href={trimmedUrl} target="_blank" rel="noreferrer" style={{ color: '#164196' }}>
          Open in Wefact
        </a>
      ) : null}
    </div>
  )
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
      <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>{label}</div>
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

  const canDelete = profile?.role === 'office' || profile?.role === 'admin'

  let { data: order, error } = await supabase
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('id', id)
    .single()

  if (error && /wefact_(quote|invoice)_/i.test(error.message)) {
    const fallbackResult = await supabase
      .from('orders')
      .select(ORDER_DETAIL_SELECT_LEGACY)
      .eq('id', id)
      .single()

    error = fallbackResult.error
    order = fallbackResult.data

    if (order) {
      order = {
        ...order,
        wefact_quote_reference: order.wefact_reference ?? null,
        wefact_quote_url: null,
        wefact_invoice_reference: null,
        wefact_invoice_url: null,
      }
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
      <div style={{ display: 'grid', gap: 20 }}>
        <section
          style={{
            background: 'white',
            borderRadius: 18,
            padding: 24,
            boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
            border: '1px solid #d9e2f0',
          }}
        >
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

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.1,
                  color: '#E30613',
                  marginBottom: 8,
                }}
              >
                INTERSPORT ORDER
              </div>

              <h1 style={{ margin: 0, fontSize: 30, color: '#082D78' }}>
                {order.order_number}
              </h1>

              <p style={{ margin: '10px 0 12px 0', color: '#5b6b84' }}>
                Bekeken door {profile?.full_name ?? 'gebruiker'}
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  href={`/dashboard/orders/${order.id}/edit`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#164196',
                    color: 'white',
                    fontWeight: 600,
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
                  fontWeight: 700,
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
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Print: {translatePrintStatus(order.print_status)}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 20,
          }}
        >
          <div style={{ display: 'grid', gap: 20 }}>
            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Administratie
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
                <InfoField label="Winkel" value={order.stores?.name ?? '-'} />
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

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Producten
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {productLines.map((line, index) => (
                  <div
                    key={`${line.product}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 2fr) 120px minmax(0, 1fr)',
                      gap: 16,
                      padding: 14,
                      borderRadius: 12,
                      background: '#f8faff',
                      border: '1px solid #e6edf7',
                    }}
                  >
                    <InfoField label="Product" value={line.product} />
                    <InfoField label="Aantal" value={line.quantity} />
                    <InfoField label="Productcode" value={line.productCode || '-'} />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Print
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
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
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Levering
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
                <InfoField label="Deadline" value={formatDate(order.deadline)} />
                <InfoField
                  label="Datum uitlevering"
                  value={formatDate(order.delivery_date)}
                />
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Opmerkingen
              </h2>

              <div
                style={{
                  background: '#f8faff',
                  border: '1px solid #e6edf7',
                  borderRadius: 12,
                  padding: 14,
                  minHeight: 90,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {order.notes?.trim() ? order.notes : 'Geen opmerkingen toegevoegd.'}
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Printinstructies
              </h2>

              <div
                style={{
                  background: '#f8faff',
                  border: '1px solid #e6edf7',
                  borderRadius: 12,
                  padding: 14,
                  minHeight: 90,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {order.print_instructions?.trim()
                  ? order.print_instructions
                  : 'Geen printinstructies toegevoegd.'}
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Activiteit
              </h2>

              {(activity ?? []).length === 0 ? (
                <div style={{ color: '#5b6b84' }}>Nog geen activiteit beschikbaar.</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {(activity ?? []).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: '#f8faff',
                        border: '1px solid #e6edf7',
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {item.description}
                      </div>
                      <div style={{ color: '#5b6b84', fontSize: 13 }}>
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20, alignSelf: 'start' }}>
            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Track & trace link
              </h2>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  padding: 16,
                  borderRadius: 14,
                  background: '#f8faff',
                  border: '1px solid #e6edf7',
                }}
              >
                <div style={{ color: '#5b6b84', lineHeight: 1.6 }}>
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
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 40,
                          padding: '0 14px',
                          borderRadius: 10,
                          background: '#eef3fb',
                          color: '#164196',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Openen
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#8a6514', fontWeight: 600 }}>
                    Stel `NEXT_PUBLIC_APP_URL` in om een volledige publieke link te tonen.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Statussen
              </h2>

              <StatusForm
                orderId={order.id}
                currentArticleStatus={order.article_status}
                currentPrintStatus={order.print_status}
                hasPrint={order.has_print}
              />
            </div>

            <div
              style={{
                background: 'white',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                border: '1px solid #d9e2f0',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78' }}>
                Printbestanden
              </h2>

              {order.has_print ? (
                <div style={{ marginBottom: 18 }}>
                  <UploadForm orderId={order.id} />
                </div>
              ) : null}

              {!order.has_print ? (
                <div
                  style={{
                    background: '#eef3fb',
                    color: '#164196',
                    borderRadius: 12,
                    padding: 14,
                    fontWeight: 600,
                  }}
                >
                  Voor deze order is geen print vereist.
                </div>
              ) : signedFiles.length === 0 ? (
                <div
                  style={{
                    background: '#fff8e8',
                    color: '#8a6514',
                    borderRadius: 12,
                    padding: 14,
                    fontWeight: 600,
                  }}
                >
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
                      style={{
                        display: 'block',
                        background: '#f8faff',
                        border: '1px solid #e6edf7',
                        borderRadius: 12,
                        padding: 14,
                        color: '#132033',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {file.file_name}
                      </div>
                      <div style={{ color: '#5b6b84', fontSize: 13 }}>
                        {file.mime_type || 'Bestand'} · {formatDate(file.created_at)}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {canDelete ? (
              <div
                style={{
                  background: 'white',
                  borderRadius: 18,
                  padding: 24,
                  boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
                  border: '1px solid #f3b3b8',
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: 18, color: '#b00012' }}>
                  Gevaarzone
                </h2>

                <p style={{ marginTop: 0, color: '#5b6b84' }}>
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
