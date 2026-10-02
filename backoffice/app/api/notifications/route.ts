import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isStoreLikeRole } from '@/lib/roles'
import { loadBusinessSettings, loadPersonalSettings } from '@/lib/business-settings-server'
import { visibleNotificationEvents } from '@/lib/business-settings'

type ActivityRow = {
  id: string
  order_id: string
  action_type: string | null
  description: string | null
  created_at: string | null
  performed_by: string | null
  orders:
    | {
        order_number: string | null
        club_name: string | null
        store_id: string | null
        has_print: boolean | null
        stores?: { name?: string | null } | { name?: string | null }[] | null
      }
    | {
        order_number: string | null
        club_name: string | null
        store_id: string | null
        has_print: boolean | null
        stores?: { name?: string | null } | { name?: string | null }[] | null
      }[]
    | null
}

function getOrder(row: ActivityRow) {
  return Array.isArray(row.orders) ? row.orders[0] : row.orders
}

function normalizeStoreName(
  stores?: { name?: string | null } | { name?: string | null }[] | null
) {
  const store = Array.isArray(stores) ? stores[0] : stores
  return store?.name ?? null
}

async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

async function getPerformerNames(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>()
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(new Set(userIds)))

  return new Map((data ?? []).map((profile) => [profile.id, profile.full_name || 'Gebruiker']))
}

export async function GET() {
  const { user, profile } = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }

  if (!profile?.role || profile.role === 'pending') {
    return NextResponse.json({
      lastSeenAt: null,
      unreadCount: 0,
      notifications: [],
    })
  }

  const admin = createAdminClient()
  const { data: readState } = await admin
    .from('notification_read_state')
    .select('last_seen_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const lastSeenAt = readState?.last_seen_at ?? null
  const [{ settings: business }, { settings: personal }] = await Promise.all([loadBusinessSettings(), loadPersonalSettings(user.id)])
  const events = visibleNotificationEvents(business, personal, profile.role)
  if (!events.length || (isStoreLikeRole(profile.role) && !profile.store_id)) return NextResponse.json({ lastSeenAt, unreadCount: 0, notifications: [] })
  const baseSelect = `
    id,
    order_id,
    action_type,
    description,
    created_at,
    performed_by,
    orders!inner (
      order_number,
      club_name,
      store_id,
      has_print,
      stores (
        name
      )
    )
  `

  let countQuery = admin
    .from('order_activity_log')
    .select('id, orders!inner (store_id, has_print)', { count: 'exact', head: true })
    .or(`performed_by.is.null,performed_by.neq.${user.id}`)
    .in('action_type', events)

  if (lastSeenAt) {
    countQuery = countQuery.gt('created_at', lastSeenAt)
  }

  if (profile.role === 'print') {
    countQuery = countQuery.eq('orders.has_print', true)
  }

  if (isStoreLikeRole(profile.role) && profile.store_id) {
    countQuery = countQuery.eq('orders.store_id', profile.store_id)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 })
  }

  let activityQuery = admin
    .from('order_activity_log')
    .select(baseSelect)
    .or(`performed_by.is.null,performed_by.neq.${user.id}`)
    .in('action_type', events)

  if (lastSeenAt) {
    activityQuery = activityQuery.gt('created_at', lastSeenAt)
  }

  if (profile.role === 'print') {
    activityQuery = activityQuery.eq('orders.has_print', true)
  }

  if (isStoreLikeRole(profile.role) && profile.store_id) {
    activityQuery = activityQuery.eq('orders.store_id', profile.store_id)
  }

  const { data: activityRows, error: activityError } = await activityQuery
    .order('created_at', { ascending: false })
    .limit(50)

  if (activityError) {
    return NextResponse.json({ error: activityError.message }, { status: 400 })
  }

  const rows = ((activityRows ?? []) as ActivityRow[]).reverse()
  const performerNames = await getPerformerNames(
    rows.map((row) => row.performed_by).filter((id): id is string => Boolean(id))
  )

  return NextResponse.json({
    lastSeenAt,
    unreadCount: count ?? 0,
    notifications: rows.map((row) => {
      const order = getOrder(row)

      return {
        id: row.id,
        orderId: row.order_id,
        orderNumber: order?.order_number ?? '-',
        clubName: order?.club_name ?? '-',
        storeName: normalizeStoreName(order?.stores),
        actionType: row.action_type,
        description: row.description,
        createdAt: row.created_at,
        performedBy: row.performed_by,
        performerName: row.performed_by
          ? performerNames.get(row.performed_by) ?? 'Gebruiker'
          : 'Klant of systeem',
      }
    }),
  })
}

export async function POST(request: NextRequest) {
  const { user } = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { lastSeenAt?: unknown } | null
  const requestedSeenAt = typeof body?.lastSeenAt === 'string' ? body.lastSeenAt : null
  const seenAt = requestedSeenAt && !Number.isNaN(new Date(requestedSeenAt).getTime())
    ? requestedSeenAt
    : new Date().toISOString()
  const admin = createAdminClient()
  const { error } = await admin
    .from('notification_read_state')
    .upsert({
      user_id: user.id,
      last_seen_at: seenAt,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, lastSeenAt: seenAt })
}
