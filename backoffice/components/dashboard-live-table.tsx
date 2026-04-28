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
    <section className="ui-card ui-table-card" style={{ padding: 0 }}>
      <div className="ui-table-header">
        <h2 className="ui-section-title">Orderoverzicht</h2>
      </div>

      <table className="ui-table">
        <thead>
          <tr>
            <th>Order</th>
            {showStoreColumn !== false ? (
              <th>Winkel</th>
            ) : null}
            <th>Club</th>
            <th>Product</th>
            <th>Aantal</th>
            <th>Print</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={showStoreColumn !== false ? 7 : 6} style={{ color: '#5b6b84' }}>
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
                <tr key={order.id}>
                  <td style={{ fontWeight: 700 }}>
                    <Link href={`/dashboard/orders/${order.id}`}>
                      {order.order_number}
                    </Link>
                  </td>
                  {showStoreColumn !== false ? (
                    <td>{order.stores?.name ?? '-'}</td>
                  ) : null}
                  <td>{order.club_name}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{primaryProduct?.product ?? '-'}</div>
                    {extraProducts > 0 ? (
                      <div style={{ color: '#5b6b84', fontSize: 13 }}>
                        + {extraProducts} extra product{extraProducts > 1 ? 'en' : ''}
                      </div>
                    ) : null}
                  </td>
                  <td>{order.quantity}</td>
                  <td>
                    {order.has_print ? (
                      <span className="ui-pill" style={{ background: '#ffe9eb', color: '#b00012' }}>
                        Ja
                      </span>
                    ) : (
                      <span className="ui-pill" style={{ background: '#eef3fb', color: '#164196' }}>
                        Nee
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <span
                        className="ui-pill"
                        style={{
                          background: getArticleStatusStyle(order.article_status).background,
                          color: getArticleStatusStyle(order.article_status).color,
                        }}
                      >
                        Artikelen: {translateArticleStatus(order.article_status)}
                      </span>
                      {order.has_print ? (
                        <span
                          className="ui-pill"
                          style={{
                            background: getPrintStatusStyle(order.print_status).background,
                            color: getPrintStatusStyle(order.print_status).color,
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
