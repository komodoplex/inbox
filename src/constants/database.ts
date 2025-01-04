/**
 * Database table names and schema identifiers
 */
const DB_TABLES = {
  VENTURES: 'ventures',
  SOURCES: 'sources',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
} as const

type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES]

const CONVERSATION_TYPES = {
  INQUIRY: 'inquiry',
  SUPPORT: 'support',
} as const

type ConversationType = (typeof CONVERSATION_TYPES)[keyof typeof CONVERSATION_TYPES]

const CONVERSATION_STATUSES = {
  OPEN: 'open',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  SPAM: 'spam',
} as const

type ConversationStatus = (typeof CONVERSATION_STATUSES)[keyof typeof CONVERSATION_STATUSES]

const MESSAGE_DIRECTIONS = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  INTERNAL: 'internal',
} as const

type MessageDirection = (typeof MESSAGE_DIRECTIONS)[keyof typeof MESSAGE_DIRECTIONS]

const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const

type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS]

export {
  DB_TABLES,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
  MESSAGE_DIRECTIONS,
  SORT_ORDERS,
}
export type {
  DbTableName,
  ConversationType,
  ConversationStatus,
  MessageDirection,
  SortOrder,
}

