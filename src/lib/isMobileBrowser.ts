/** Detecta browsers móveis onde popup/iframe do Google Sign-In costuma falhar. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS 13+ pode se reportar como Mac com touch.
  return navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform);
}
