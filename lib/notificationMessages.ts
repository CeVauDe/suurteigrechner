/**
 * Preset notification messages for sourdough reminders.
 * The first message is used as the default when no custom message is provided.
 * Users can select from these presets or type their own custom message.
 */

export const NOTIFICATION_MESSAGES = [
  'Time to feed your starter! 🍞',
  'Check your dough\'s rise! 🥖',
  'Stretch and fold time! 🫳',
  'Baking day reminder! 🔥',
  'Preshape your loaves! 🫓',
  'Time to shape your bread! 🥐',
  'Check on your sourdough! 👀',
] as const

export const DEFAULT_NOTIFICATION_MESSAGE = NOTIFICATION_MESSAGES[0]

/** Maximum length for custom notification messages (UTF-8 safe) */
export const MAX_MESSAGE_LENGTH = 255
