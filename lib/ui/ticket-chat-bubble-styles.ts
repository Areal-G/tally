/**
 * Ticket chat bubble shell + opposing left/right glow gradients.
 * Content-sized width is applied in SupportTicketReplyThread (w-fit max-w-[90%]).
 * Glow uses even blur (0 offset) so all sides render when parent is overflow-visible.
 */

/** Shared bubble chrome (corners overridden per side). */
export const TICKET_CHAT_BUBBLE_SHELL =
  "w-fit max-w-[90%] min-w-0 rounded-2xl border px-3 py-2.5 ";

/**
 * Creator / left — glow on left → fade to white/clear on right.
 */
export const TICKET_CHAT_BUBBLE_LEFT =
  "rounded-tl-md border-border/50 " +
  " bg-slate-400/30 " +
  "dark:bg-white/15 " +
  " ";

/**
 * Staff / right — glow on right → fade to white/clear on left (opposite of left).
 */
export const TICKET_CHAT_BUBBLE_RIGHT =
  "rounded-tr-md border-violet-400/25 " +
  " bg-violet-500/30 " +
  "dark:bg-violet-500/35 " +
  " ";
