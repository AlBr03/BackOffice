'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseProductDescription } from '@/lib/order-fields'
import {
  getArticleStatusStyle,
  getPrintStatusStyle,
  translateArticleStatus,
  translatePrintStatus,
} from '@/lib/order-status'

type OrderRow = {
  id: string
  order_number: string
  club_name: string
  product_description: string
  quantity: number
  article_status?: string | null
  print_status?: string | null
  order_items?: {
    product: string
    quantity: number
    product_code: string | null
  }[] | null
  has_print: boolean
  status: string
  stores?: {
    name?: string | null
  } | null
}

export function DashboardLiveTable({
  orders,
  showStoreColumn,
}: {
  orders: OrderRow[]
  showStoreColumn?: boolean
}) {
  const router = useRouter()

  useEffect(() => {
    console.log('Dashboard interval gestart')

    const interval = setInterval(() => {
      console.log('Dashboard refresh uitgevoerd')
      router.refresh()
    }, 5000)

    return () => clearInterval(interval)
  }, [router])

  return (
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
        <h2 style={{ margin: 0, color: '#082D78', fontSize: 20 }}>
          Orderoverzicht
        </h2>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8faff' }}>
            <th style={{ textAlign: 'left', padding: 14 }}>Order</th>
            {showStoreColumn !== false ? (
              <th style={{ textAlign: 'left', padding: 14 }}>Winkel</th>
            ) : null}
            <th style={{ textAlign: 'left', padding: 14 }}>Club</th>
            <th style={{ textAlign: 'left', padding: 14 }}>Product</th>
            <th style={{ textAlign: 'left', padding: 14 }}>Aantal</th>
            <th style={{ textAlign: 'left', padding: 14 }}>Print</th>
            <th style={{ textAlign: 'left', padding: 14 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={showStoreColumn !== false ? 7 : 6} style={{ padding: 20, color: '#5b6b84' }}>
                Geen orders gevonden.
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const productLines = order.order_items?.length
                ? order.order_items.map((item) => ({
                    product: item.product,
                    quantity: item.quantity,
                    productCode: item.product_code ?? '',
                  }))
                : parseProductDescription(order.product_description, order.quantity)
              const primaryProduct = productLines[0]
              const extraProducts = productLines.length - 1

              return (
                <tr key={order.id} style={{ borderTop: '1px solid #e6edf7' }}>
                  <td style={{ padding: 14, fontWeight: 600 }}>
                    <Link href={`/dashboard/orders/${order.id}`}>
                      {order.order_number}
                    </Link>
                  </td>
                  {showStoreColumn !== false ? (
                    <td style={{ padding: 14 }}>{order.stores?.name ?? '-'}</td>
                  ) : null}
                  <td style={{ padding: 14 }}>{order.club_name}</td>
                  <td style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600 }}>{primaryProduct?.product ?? '-'}</div>
                    {extraProducts > 0 ? (
                      <div style={{ color: '#5b6b84', fontSize: 13 }}>
                        + {extraProducts} extra product{extraProducts > 1 ? 'en' : ''}
                      </div>
                    ) : null}
                  </td>
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
                        Ja
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
                        Nee
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 14 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          width: 'fit-content',
                          background: getArticleStatusStyle(order.article_status).background,
                          color: getArticleStatusStyle(order.article_status).color,
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Artikelen: {translateArticleStatus(order.article_status)}
                      </span>
                      {order.has_print ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            width: 'fit-content',
                            background: getPrintStatusStyle(order.print_status).background,
                            color: getPrintStatusStyle(order.print_status).color,
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Print: {translatePrintStatus(order.print_status)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </section>
  )
}
