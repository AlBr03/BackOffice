import { NextRequest } from 'next/server'
import { getConversation, postConversation } from '@/lib/order-conversation-server'
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, context: Context) { return getConversation(request,(await context.params).id,false) }
export async function POST(request: NextRequest, context: Context) { return postConversation(request,(await context.params).id,false) }
