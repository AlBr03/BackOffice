import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseProductDescription } from '@/lib/order-fields'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  params: Promise<{ token: string }>
}

const STATUS_STEPS = [
  { value: 'new', label: 'Bestelling ontvangen', description: 'Uw order is goed ontvangen.' },
  {
    value: 'in_progress',
    label: 'In behandeling',
    description: 'We verwerken de bestelling en zetten de volgende stappen klaar.',
  },
  {
    value: 'waiting_print',
    label: 'Wacht op print',
    description: 'De bestelling wacht op drukwerk of afwerking.',
  },
  {
    value: 'completed',
    label: 'Afgerond',
    description: 'De bestelling is afgerond en klaar voor levering of afhalen.',
  },
]

function formatDate(value?: string | null) {
  if (!value) return 'Nog niet bekend'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusIndex(status?: string | null) {
  const index = STATUS_STEPS.findIndex((step) => step.value === status)
  return index >= 0 ? index : 0
}

function getStatusMeta(status?: string | null) {
  switch (status) {
    case 'completed':
      return {
        label: 'Afgerond',
        background: 'linear-gradient(135deg, #e8f7ee 0%, #f4fff7 100%)',
        color: '#167c3a',
      }
    case 'waiting_print':
      return {
        label: 'Wacht op print',
        background: 'linear-gradient(135deg, #fff1f2 0%, #fff7f7 100%)',
        color: '#b00012',
      }
    case 'in_progress':
      return {
        label: 'In behandeling',
        background: 'linear-gradient(135deg, #eef3fb 0%, #f7faff 100%)',
        color: '#164196',
      }
    default:
      return {
        label: 'Ontvangen',
        background: 'linear-gradient(135deg, #f4f6f8 0%, #fbfcfd 100%)',
        color: '#42526b',
      }
  }
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      order_number,
      club_name,
      status,
      notes,
      created_at,
      updated_at,
      deadline,
      delivery_date,
      supplier,
      product_description,
      quantity,
      stores (
        name
      ),
      order_items (
        product,
        quantity,
        product_code
      ),
      order_files (
        id,
        file_name,
        file_path,
        mime_type,
        created_at
      ),
      order_activity_log (
        id,
        action_type,
        description,
        created_at
      )
    `
    )
    .eq('tracking_token', token)
    .order('created_at', {
      referencedTable: 'order_activity_log',
      ascending: false,
    })
    .single()

  if (error || !order) {
    notFound()
  }

  const statusIndex = getStatusIndex(order.status)
  const statusMeta = getStatusMeta(order.status)
  const productLines = order.order_items?.length
    ? order.order_items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        productCode: item.product_code ?? '',
      }))
    : parseProductDescription(order.product_description, order.quantity)
  const signedFiles = await Promise.all(
    (order.order_files ?? []).map(async (file) => {
      const { data } = await supabase.storage
        .from('print-files')
        .createSignedUrl(file.file_path, 60 * 60)

      return {
        ...file,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 32,
          borderRadius: 28,
          background:
            'radial-gradient(circle at top left, rgba(227,6,19,0.12), transparent 30%), linear-gradient(135deg, #082D78 0%, #164196 55%, #1f5fd1 100%)',
          color: 'white',
          boxShadow: '0 18px 40px rgba(8,45,120,0.18)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 'auto -60px -80px auto',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            filter: 'blur(4px)',
          }}
        />

        <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              alignSelf: 'start',
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              fontWeight: 700,
            }}
          >
            Bestelstatus live
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.2, opacity: 0.8 }}>
                TRACK & TRACE
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 5vw, 3.6rem)', lineHeight: 1 }}>
                {order.order_number}
              </h1>
              <p style={{ margin: 0, maxWidth: 720, color: 'rgba(255,255,255,0.82)', fontSize: 18 }}>
                Volg hier stap voor stap de voortgang van uw bestelling voor {order.club_name}.
              </p>
            </div>

            <div
              style={{
                minWidth: 220,
                padding: 18,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <div style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.72, marginBottom: 8 }}>
                Huidige status
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{statusMeta.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.76)' }}>
                Laatste update: {formatDateTime(order.updated_at) ?? formatDate(order.updated_at)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '2.1fr 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'grid', gap: 24 }}>
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              border: '1px solid #d9e2f0',
              boxShadow: '0 10px 30px rgba(8,45,120,0.07)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: '#082D78', fontSize: 28 }}>Voortgang</h2>
                <p style={{ margin: '6px 0 0 0', color: '#5b6b84' }}>
                  Een overzicht zoals bij een bezorgdienst, maar dan voor uw bestelling.
                </p>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: statusMeta.background,
                  color: statusMeta.color,
                  fontWeight: 800,
                }}
              >
                {statusMeta.label}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 18 }}>
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index < statusIndex
                const isCurrent = index === statusIndex
                const isUpcoming = index > statusIndex

                return (
                  <div
                    key={step.value}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '56px 1fr',
                      gap: 16,
                      alignItems: 'start',
                    }}
                  >
                    <div style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: isCompleted
                            ? '#167c3a'
                            : isCurrent
                              ? '#164196'
                              : '#d9e2f0',
                          color: 'white',
                          fontWeight: 800,
                          boxShadow: isCurrent ? '0 0 0 8px rgba(22,65,150,0.12)' : 'none',
                        }}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      {index < STATUS_STEPS.length - 1 ? (
                        <div
                          style={{
                            width: 3,
                            minHeight: 84,
                            borderRadius: 999,
                            background: isCompleted ? '#167c3a' : '#d9e2f0',
                          }}
                        />
                      ) : null}
                    </div>

                    <div
                      style={{
                        padding: 18,
                        borderRadius: 20,
                        background: isCurrent
                          ? 'linear-gradient(135deg, #eef3fb 0%, #f7faff 100%)'
                          : '#f8faff',
                        border: isCurrent ? '1px solid #c8d8f2' : '1px solid #e6edf7',
                        opacity: isUpcoming ? 0.72 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#5b6b84', fontWeight: 800, letterSpacing: 1 }}>
                            {isCompleted ? 'VOLTOOID' : isCurrent ? 'ACTUELE FASE' : 'VOLGENDE STAP'}
                          </div>
                          <h3 style={{ margin: '6px 0 8px 0', color: '#082D78', fontSize: 22 }}>
                            {step.label}
                          </h3>
                        </div>
                        {isCurrent ? (
                          <div
                            style={{
                              alignSelf: 'start',
                              padding: '8px 12px',
                              borderRadius: 999,
                              background: '#164196',
                              color: 'white',
                              fontWeight: 700,
                            }}
                          >
                            Nu actief
                          </div>
                        ) : null}
                      </div>
                      <p style={{ margin: 0, color: '#42526b', lineHeight: 1.6 }}>{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              border: '1px solid #d9e2f0',
              boxShadow: '0 10px 30px rgba(8,45,120,0.07)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78', fontSize: 28 }}>
              Printbestanden
            </h2>

            {signedFiles.length === 0 ? (
              <div
                style={{
                  borderRadius: 18,
                  background: '#f8faff',
                  border: '1px solid #e6edf7',
                  padding: 18,
                  color: '#5b6b84',
                }}
              >
                Er zijn nog geen printbestanden toegevoegd aan deze bestelling.
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
                      display: 'grid',
                      gap: 4,
                      padding: 18,
                      borderRadius: 18,
                      background: '#f8faff',
                      border: '1px solid #e6edf7',
                      color: '#132033',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{file.file_name}</div>
                    <div style={{ color: '#42526b' }}>{file.mime_type || 'Bestand'}</div>
                    <div style={{ color: '#5b6b84' }}>
                      Geupload op {formatDate(file.created_at)}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 28,
              border: '1px solid #d9e2f0',
              boxShadow: '0 10px 30px rgba(8,45,120,0.07)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78', fontSize: 28 }}>
              Activiteit
            </h2>

            {(order.order_activity_log ?? []).length === 0 ? (
              <div
                style={{
                  borderRadius: 18,
                  background: '#f8faff',
                  border: '1px solid #e6edf7',
                  padding: 18,
                  color: '#5b6b84',
                }}
              >
                Er zijn nog geen updates beschikbaar.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {(order.order_activity_log ?? []).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gap: 6,
                      padding: 18,
                      borderRadius: 18,
                      background: '#f8faff',
                      border: '1px solid #e6edf7',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#132033' }}>{item.description}</div>
                    <div style={{ color: '#5b6b84' }}>{formatDateTime(item.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 24,
              border: '1px solid #d9e2f0',
              boxShadow: '0 10px 30px rgba(8,45,120,0.07)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78', fontSize: 24 }}>
              Samenvatting
            </h2>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>Klant / vereniging</div>
                <div style={{ fontWeight: 700 }}>{order.club_name}</div>
              </div>
              <div>
                <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>Winkel</div>
                <div style={{ fontWeight: 700 }}>{order.stores?.name ?? 'Onbekend'}</div>
              </div>
              <div>
                <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>Aangemaakt</div>
                <div style={{ fontWeight: 700 }}>{formatDate(order.created_at)}</div>
              </div>
              <div>
                <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>Deadline</div>
                <div style={{ fontWeight: 700 }}>{formatDate(order.deadline)}</div>
              </div>
              <div>
                <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>Verwachte uitlevering</div>
                <div style={{ fontWeight: 700 }}>{formatDate(order.delivery_date)}</div>
              </div>
              <div>
                <div style={{ color: '#5b6b84', fontSize: 13, marginBottom: 4 }}>Leverancier</div>
                <div style={{ fontWeight: 700 }}>{order.supplier || 'Nog niet ingevuld'}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 24,
              border: '1px solid #d9e2f0',
              boxShadow: '0 10px 30px rgba(8,45,120,0.07)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, color: '#082D78', fontSize: 24 }}>
              Bestelde producten
            </h2>

            <div style={{ display: 'grid', gap: 12 }}>
              {productLines.map((line, index) => (
                <div
                  key={`${line.product}-${index}`}
                  style={{
                    display: 'grid',
                    gap: 4,
                    padding: 16,
                    borderRadius: 18,
                    background: '#f8faff',
                    border: '1px solid #e6edf7',
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{line.product}</div>
                  <div style={{ color: '#42526b' }}>Aantal: {line.quantity}</div>
                  <div style={{ color: '#5b6b84' }}>
                    Productcode: {line.productCode || 'Nog niet toegevoegd'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.notes?.trim() ? (
            <div
              style={{
                background: 'white',
                borderRadius: 24,
                padding: 24,
                border: '1px solid #d9e2f0',
                boxShadow: '0 10px 30px rgba(8,45,120,0.07)',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 14, color: '#082D78', fontSize: 24 }}>
                Extra informatie
              </h2>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.65,
                  color: '#42526b',
                }}
              >
                {order.notes}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: 20,
          borderRadius: 22,
          background: 'linear-gradient(135deg, #fff 0%, #f8faff 100%)',
          border: '1px solid #d9e2f0',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, color: '#082D78', marginBottom: 4 }}>
            Vragen over deze bestelling?
          </div>
          <div style={{ color: '#5b6b84' }}>
            Neem contact op met uw winkel en vermeld ordernummer {order.order_number}.
          </div>
        </div>

        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 48,
            padding: '0 18px',
            borderRadius: 999,
            background: '#164196',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Naar backoffice
        </Link>
      </section>
    </div>
  )
}
