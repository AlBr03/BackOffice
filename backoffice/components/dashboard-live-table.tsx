'use client'

import { useBusinessSettings } from '@/components/business-provider'
import type { ColumnKey } from '@/lib/business-settings'

import { DropdownLabel } from '@/components/dropdown-provider'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseProductDescription } from '@/lib/order-fields'
import {
  getArticleStatusStyle,
  getPrintStatusStyle,
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
    size: string | null
  }[] | null
  has_print: boolean
  status: string
  stores?:
    | {
        name?: string | null
      }
    | {
        name?: string | null
      }[]
    | null
}

function getStoreName(stores?: OrderRow['stores']) {
  const store = Array.isArray(stores) ? stores[0] : stores

  return store?.name ?? '-'
}

export function DashboardLiveTable({
  orders,
  showStoreColumn,
}: {
  orders: OrderRow[]
  showStoreColumn?: boolean
}) {
  const router = useRouter()
  const { personal } = useBusinessSettings()
  const showColumn = (key: ColumnKey) => personal.dashboard.columns.includes(key) && (key !== 'store' || showStoreColumn !== false)
  const columnCount = personal.dashboard.columns.filter((key) => showColumn(key)).length

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return
      router.refresh()
    }, 30000)

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
            {showColumn('store') ? (
              <th>Winkel</th>
            ) : null}
            {showColumn('customer') ? (<th>Klant</th>) : null}
            {showColumn('product') ? (<th>Product</th>) : null}
            {showColumn('quantity') ? (<th>Aantal</th>) : null}
            {showColumn('print') ? (<th>Print</th>) : null}
            {showColumn('status') ? (<th>Status</th>) : null}
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={columnCount} style={{ color: 'var(--text-soft)' }}>
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
                    size: item.size ?? '',
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
                  {showColumn('store') ? (
                    <td>{getStoreName(order.stores)}</td>
                  ) : null}
                  {showColumn('customer') ? (<td>{order.club_name}</td>) : null}
                  {showColumn('product') ? (<td>
                    <div style={{ fontWeight: 600 }}>{primaryProduct?.productCode || '-'}</div>
                    <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                      {primaryProduct?.product ?? '-'}
                      {primaryProduct?.size ? `, maat ${primaryProduct.size}` : ''}
                    </div>
                    {extraProducts > 0 ? (
                      <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                        + {extraProducts} extra product{extraProducts > 1 ? 'en' : ''}
                      </div>
                    ) : null}
                  </td>) : null}
                  {showColumn('quantity') ? (<td>{order.quantity}</td>) : null}
                  {showColumn('print') ? (<td>
                    {order.has_print ? (
                      <span className="ui-pill" style={{ background: 'var(--error-background)', color: 'var(--error-text)' }}>
                        Ja
                      </span>
                    ) : (
                      <span className="ui-pill" style={{ background: 'var(--info-background)', color: 'var(--link-color)' }}>
                        Nee
                      </span>
                    )}
                  </td>) : null}
                  {showColumn('status') ? (<td>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <span
                        className="ui-pill"
                        style={{
                          background: getArticleStatusStyle(order.article_status).background,
                          color: getArticleStatusStyle(order.article_status).color,
                        }}
                      >
                        Artikelen: {<DropdownLabel dropdown="article_status" value={order.article_status} />}
                      </span>
                      {order.has_print ? (
                        <span
                          className="ui-pill"
                          style={{
                            background: getPrintStatusStyle(order.print_status).background,
                            color: getPrintStatusStyle(order.print_status).color,
                          }}
                        >
                          Print: {<DropdownLabel dropdown="print_status" value={order.print_status} />}
                        </span>
                      ) : null}
                    </div>
                  </td>) : null}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </section>
  )
}
