import type {
  ConversationStatus,
  ConversationType,
  MessageDirection,
} from '@/constants/database'
import type {
  ConversationRow,
  MessageRow,
  SourceRow,
  VentureRow,
} from '@/db/schema'

type Venture = VentureRow
type Source = SourceRow
type Conversation = ConversationRow
type Message = MessageRow

interface ConversationWithSourceAndMessages extends Conversation {
  source: Source
  messages: Message[]
}

interface ConversationListItem extends Conversation {
  source_slug: string
  venture_slug: string
  venture_name: string
}

export type {
  ConversationStatus,
  ConversationType,
  MessageDirection,
  Venture,
  Source,
  Conversation,
  Message,
  ConversationWithSourceAndMessages,
  ConversationListItem,
}

