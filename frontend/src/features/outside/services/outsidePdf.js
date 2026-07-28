import { API_URL } from "@utils/consts";

export async function getOutsideDocPdf({ token, docId }) {
  const res = await fetch(
    `${API_URL}/outside/respond/${encodeURIComponent(token)}/document/${docId}/pdf`,
  );
  if (!res.ok) {
    let msg = "Failed to fetch PDF";
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const m =
    /filename\*\s*=\s*[^']*''([^;]+)/i.exec(cd) ||
    /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
  let filename = m ? decodeURIComponent(m[1]) : `document-${docId}.pdf`;
  return { blob, filename };
}
