
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLiveTable } from '@/components/dashboard-live-table'
import { ARTICLE_STATUS_OPTIONS, PRINT_STATUS_OPTIONS } from '@/lib/order-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function translateRole(role?: string | null) {
  switch (role) {
    case 'pending':
      return 'Nog niet toegewezen'
    case 'store':
      return 'Winkel'
    case 'office':
      return 'Hoofdkantoor'
    case 'print':
      return 'Printafdeling'
    case 'admin':
      return 'Beheerder'
    default:
      return 'Onbekend'
  }
}

type DashboardPageProps = {
  searchParams?: Promise<{
    article_status?: string
    print_status?: string
    print?: string
    store?: string
    q?: string
  }>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = (await searchParams) ?? {}
  const selectedArticleStatus = params.article_status ?? ''
  const selectedPrintStatus = params.print_status ?? ''
  const selectedPrint = params.print ?? ''
  const selectedStore = params.store ?? ''
  const searchQuery = params.q ?? ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id, full_name')
    .eq('id', user.id)
    .single()

  const isOfficeLike = profile?.role === 'office' || profile?.role === 'admin'

  if (!profile?.role || profile.role === 'pending') {
    return (
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
          <h1 style={{ margin: 0, fontSize: 30, color: '#082D78' }}>Account in afwachting</h1>
          <p style={{ margin: '10px 0 0 0', color: '#5b6b84', maxWidth: 700 }}>
            Je account is aangemaakt, maar er is nog geen rol toegewezen. Een hoofdkantoor- of
            beheeraccount kan dit doen via accountbeheer. Zodra dat is gebeurd, krijg je toegang
            tot het dashboard.
          </p>
        </section>
      </div>
    )
  }

  const { data: stores } = isOfficeLike
    ? await supabase.from('stores').select('id, name').order('name')
    : { data: [] }

  let query = supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      club_name,
      product_description,
      quantity,
      article_status,
      print_status,
      order_items (
        product,
        quantity,
        product_code
      ),
      has_print,
      status,
      created_at,
      store_id,
      stores (
        name
      )
    `
    )
    .order('created_at', { ascending: false })

  if (profile?.role === 'print') {
    query = query.eq('has_print', true)
  }

  if (selectedArticleStatus) {
    query = query.eq('article_status', selectedArticleStatus)
  }

  if (selectedPrintStatus) {
    query = query.eq('print_status', selectedPrintStatus)
  }

  if (selectedPrint === 'ja') {
    query = query.eq('has_print', true)
  }

  if (selectedPrint === 'nee') {
    query = query.eq('has_print', false)
  }

  if (isOfficeLike && selectedStore) {
    query = query.eq('store_id', selectedStore)
  }

  if (searchQuery.trim()) {
    const safeQuery = searchQuery.trim().replace(/,/g, ' ')
    query = query.or(
      `order_number.ilike.%${safeQuery}%,club_name.ilike.%${safeQuery}%,product_description.ilike.%${safeQuery}%`
    )
  }

  const { data: orders, error } = await query

  return (
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
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30, color: '#082D78' }}>
              Dashboard
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#5b6b84' }}>
              Welkom{profile?.full_name ? `, ${profile.full_name}` : ''} — rol:{' '}
              <strong style={{ color: '#164196' }}>
                {translateRole(profile?.role)}
              </strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/dashboard/new"
              style={{
                background: '#164196',
                color: 'white',
                padding: '10px 14px',
                borderRadius: 10,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Nieuwe order
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          border: '1px solid #d9e2f0',
        }}
      >
        <form
          method="get"
          style={{
            display: 'grid',
            gridTemplateColumns: isOfficeLike
              ? '2fr 1fr 1fr 1fr 1fr auto'
              : '2fr 1fr 1fr 1fr auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#5b6b84',
                fontWeight: 600,
              }}
            >
              Zoeken
            </label>
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Zoek op ordernummer, club of product"
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#5b6b84',
                fontWeight: 600,
              }}
            >
              Artikelenstatus
            </label>
            <select name="article_status" defaultValue={selectedArticleStatus}>
              <option value="">Alle artikelstatussen</option>
              {ARTICLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#5b6b84',
                fontWeight: 600,
              }}
              >
              Print nodig
            </label>
            <select name="print" defaultValue={selectedPrint}>
              <option value="">Alles</option>
              <option value="ja">Alleen print</option>
              <option value="nee">Zonder print</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#5b6b84',
                fontWeight: 600,
              }}
            >
              Printstatus
            </label>
            <select name="print_status" defaultValue={selectedPrintStatus}>
              <option value="">Alle printstatussen</option>
              {PRINT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isOfficeLike ? (
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  color: '#5b6b84',
                  fontWeight: 600,
                }}
              >
                Winkel
              </label>
              <select name="store" defaultValue={selectedStore}>
                <option value="">Alle winkels</option>
                {(stores ?? []).map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit">Filteren</button>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 14px',
                borderRadius: 10,
                background: '#eef3fb',
                color: '#164196',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Wissen
            </Link>
          </div>
        </form>
      </section>

      {error ? (
        <section
          style={{
            background: '#fff5f5',
            border: '1px solid #f3b3b8',
            color: '#a61b25',
            padding: 16,
            borderRadius: 14,
          }}
        >
          {error.message}
        </section>
      ) : null}

      <DashboardLiveTable
        orders={orders ?? []}
        showStoreColumn={profile?.role !== 'store'}
      />
    </div>
  )
}
