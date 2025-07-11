/** Safari / Chrome NotFoundError text variants for DOM removeChild races */
function isRemoveChildNotFoundMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("removechild") ||
    lower.includes("not a child") ||
    lower.includes("can not be found here") ||
    lower.includes("cannot be found here")
  );
}

/**
 * Radix Select portals to document.body; App Router navigation can tear down the portal
 * while React is still reconciling, causing NotFoundError on removeChild (Safari + Chrome).
 */
export function isRadixPortalRemoveChildError(
  error: Error,
  componentStack?: string,
): boolean {
  if (error.name !== "NotFoundError") {
    return false;
  }

  const message = error.message ?? "";
  const stack = error.stack ?? "";
  if (isRemoveChildNotFoundMessage(message) || isRemoveChildNotFoundMessage(stack)) {
    return true;
  }

  if (componentStack) {
    return (
      componentStack.includes("SelectPortal") ||
      componentStack.includes("SelectContent")
    );
  }

  return false;
}
