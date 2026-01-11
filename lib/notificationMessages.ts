/**
 * Preset notification messages for sourdough reminders.
 * The first message is used as the default when no custom message is provided.
 * Users can select from these presets or type their own custom message.
 */

export const NOTIFICATION_MESSAGES = [
  'Ziit zum Starter füettere! 🍞',
  'Lueg mal wie din Teig ufgoht! 🥖',
  'Ziit zum Chnätä! 🫳',
  'Hüt isch Backtag! 🔥',
  'Form din Teig vor! 🫓',
  'Ziit zum Brot forme! 🥐',
  'Lueg nomal nach dim Suurteig! 👀',
] as const

export const DEFAULT_NOTIFICATION_MESSAGE = NOTIFICATION_MESSAGES[0]

/** Maximum length for custom notification messages (UTF-8 safe) */
export const MAX_MESSAGE_LENGTH = 255
