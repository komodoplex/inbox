import type { Insertable, Selectable, Updateable } from 'kysely'
import type {
  ConversationStatus,
  ConversationType,
  MessageDirection,
} from '@/constants/database'

interface VentureTable {
  id: string
  slug: string
  name: string
  enabled: number
  created_at: number
  updated_at: number
}

interface SourceTable {
  id: string
  venture_id: string
  slug: string
  channel: string
  domain: string
  enabled: number
  created_at: number
  updated_at: number
}

interface ConversationTable {
  id: string
  source_id: string
  type: ConversationType
  status: ConversationStatus
  subject: string | null
  requester_name: string | null
  requester_email: string | null
  created_at: number
  updated_at: number
}

interface MessageTable {
  id: string
  conversation_id: string
  direction: MessageDirection
  body: string
  sender_name: string | null
  sender_email: string | null
  metadata: string | null
  created_at: number
}

interface Database {
  ventures: VentureTable
  sources: SourceTable
  conversations: ConversationTable
  messages: MessageTable
}

type VentureRow = Selectable<VentureTable>
type NewVenture = Insertable<VentureTable>

type SourceRow = Selectable<SourceTable>
type NewSource = Insertable<SourceTable>

type ConversationRow = Selectable<ConversationTable>
type NewConversation = Insertable<ConversationTable>
type UpdateConversation = Updateable<ConversationTable>

type MessageRow = Selectable<MessageTable>
type NewMessage = Insertable<MessageTable>

export type {
  VentureTable,
  SourceTable,
  ConversationTable,
  MessageTable,
  Database,
  VentureRow,
  NewVenture,
  SourceRow,
  NewSource,
  ConversationRow,
  NewConversation,
  UpdateConversation,
  MessageRow,
  NewMessage,
}

