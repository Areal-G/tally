/**
 * Attach owner-products href for Parties & Roles rows.
 * Self uses default sky link (no gray override); href unchanged.
 * Pure helper (no React); safe for client party cards.
 */

import { resolveOwnerProductsHref } from "@/lib/navigation/owner-products-href";

export type EnrichedPartyPerson = {
  userId?: string;
  name?: string | null;
  email: string;
  image?: string | null;
  href?: string;
  /** Optional name link class override; leave undefined for default sky. */
  linkClassName?: string;
};

export function enrichPartyPerson(
  person:
    | {
        userId?: string;
        name?: string | null;
        email: string;
        image?: string | null;
      }
    | null
    | undefined,
  options: { isAdminRole: boolean; viewerUserId?: string | null },
): EnrichedPartyPerson | null {
  if (!person) return null;
  const href = person.userId
    ? resolveOwnerProductsHref(person.userId, options.isAdminRole)
    : undefined;

  return {
    userId: person.userId,
    name: person.name,
    email: person.email,
    image: person.image,
    href,
    // Self + non-self both use AvatarInlineLink default sky
    linkClassName: undefined,
  };
}
