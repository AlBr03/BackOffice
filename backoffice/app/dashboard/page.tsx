import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
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

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, club_name, product_description, quantity, has_print, status, created_at, stores(name)'
    )
    .order('created_at', { ascending: false })

  if (profile?.role === 'print') {
    query = query.eq('has_print', true)
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
            <h1 style={{ margin: 0, fontSize: 30, color: '#082D78' }}>Dashboard</h1>
            <p style={{ margin: '8px 0 0 0', color: '#5b6b84' }}>
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ''} — role:{' '}
              <strong style={{ color: '#164196' }}>{profile?.role ?? 'unknown'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
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
              New order
            </Link>
          </div>
        </div>
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

      <section
        style={{
          background: 'white',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          border: '1px solid #d9e2f0',
        }}
      >
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #d9e2f0',
            background: '#eef3fb',
          }}
        >
          <h2 style={{ margin: 0, color: '#082D78', fontSize: 20 }}>Orders overview</h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8faff' }}>
              <th style={{ textAlign: 'left', padding: 14 }}>Order</th>
              <th style={{ textAlign: 'left', padding: 14 }}>Store</th>
              <th style={{ textAlign: 'left', padding: 14 }}>Club</th>
              <th style={{ textAlign: 'left', padding: 14 }}>Product</th>
              <th style={{ textAlign: 'left', padding: 14 }}>Qty</th>
              <th style={{ textAlign: 'left', padding: 14 }}>Print</th>
              <th style={{ textAlign: 'left', padding: 14 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, color: '#5b6b84' }}>
                  No orders yet.
                </td>
              </tr>
            ) : (
              (orders ?? []).map((order: any) => (
                <tr key={order.id} style={{ borderTop: '1px solid #e6edf7' }}>
                  <td style={{ padding: 14, fontWeight: 600 }}>{order.order_number}</td>
                  <td style={{ padding: 14 }}>{order.stores?.name ?? '-'}</td>
                  <td style={{ padding: 14 }}>{order.club_name}</td>
                  <td style={{ padding: 14 }}>{order.product_description}</td>
                  <td style={{ padding: 14 }}>{order.quantity}</td>
                  <td style={{ padding: 14 }}>
                    {order.has_print ? (
                      <span
                        style={{
                          background: '#ffe9eb',
                          color: '#b00012',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Yes
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#eef3fb',
                          color: '#164196',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        No
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 14 }}>
                    <span
                      style={{
                        background: '#eef3fb',
                        color: '#082D78',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}