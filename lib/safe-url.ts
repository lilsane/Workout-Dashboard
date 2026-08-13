// Guards <img src> against javascript:/data: URIs sneaking in through
// user-controlled fields (Google/photo URLs, workout photo attachments).
export function isSafeImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
