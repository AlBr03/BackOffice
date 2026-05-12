
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLiveTable } from '@/components/dashboard-live-table'
import { ARTICLE_STATUS_OPTIONS, PRINT_STATUS_OPTIONS } from '@/lib/order-status'
import { isOfficeLikeRole, isStoreLikeRole, translateRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  const isOfficeLike = isOfficeLikeRole(profile?.role)

  if (!profile?.role || profile.role === 'pending') {
    return (
      <div className="ui-stack">
        <section className="ui-card">
          <h1 className="ui-title">Account in afwachting</h1>
          <p className="ui-text-muted" style={{ marginTop: 10, maxWidth: 700 }}>
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

  if (isStoreLikeRole(profile?.role) && profile?.store_id) {
    query = query.eq('store_id', profile.store_id)
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
    <div className="ui-stack">
      <section className="ui-card">
        <div className="ui-card-header">
          <div>
            <div className="ui-eyebrow">Orderoverzicht</div>
            <h1 className="ui-title">Dashboard</h1>
            <p className="ui-text-muted" style={{ marginTop: 8 }}>
              Welkom{profile?.full_name ? `, ${profile.full_name}` : ''} — rol:{' '}
              <strong style={{ color: '#164196' }}>
                {translateRole(profile?.role)}
              </strong>
            </p>
          </div>

          <div className="ui-actions">
            <Link
              href="/dashboard/new"
              className="ui-link-button"
              style={{ background: 'var(--button-background)', color: 'white', border: 'none' }}
            >
              Nieuwe order
            </Link>
          </div>
        </div>
      </section>

      <section className="ui-card">
        <form
          method="get"
          className="ui-filter-grid"
          style={{
            gridTemplateColumns: isOfficeLike
              ? '2fr 1fr 1fr 1fr 1fr auto'
              : '2fr 1fr 1fr 1fr auto',
          }}
        >
          <div>
            <label className="ui-label">Zoeken</label>
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Zoek op ordernummer, club of product"
            />
          </div>

          <div>
            <label className="ui-label">Artikelenstatus</label>
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
            <label className="ui-label">Print nodig</label>
            <select name="print" defaultValue={selectedPrint}>
              <option value="">Alles</option>
              <option value="ja">Alleen print</option>
              <option value="nee">Zonder print</option>
            </select>
          </div>

          <div>
            <label className="ui-label">Printstatus</label>
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
              <label className="ui-label">Winkel</label>
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

          <div className="ui-actions">
            <button type="submit">Filteren</button>
            <Link href="/dashboard" className="ui-link-button">
              Wissen
            </Link>
          </div>
        </form>
      </section>

      {error ? (
        <section className="ui-message ui-message-error">
          {error.message}
        </section>
      ) : null}

      <DashboardLiveTable
        orders={orders ?? []}
        showStoreColumn={!isStoreLikeRole(profile?.role)}
      />
    </div>
  )
}
