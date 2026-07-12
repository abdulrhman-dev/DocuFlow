import { API_URL } from "@utils/consts";

/**
 * Parse a Content-Disposition header for the filename. Supports both
 *   filename="ascii.pdf"
 * and RFC 5987
 *   filename*=UTF-8''percent-encoded.pdf
 */
function parseFilename(header) {
  if (!header) return null;
  const utfMatch = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(header);
  if (utfMatch) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  if (plain) return plain[1];
  return null;
}

export async function getDocPdf({ docId }) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/document/${docId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = "Failed to fetch PDF";
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {
      /* non-JSON error */
    }
    throw new Error(msg);
  }

  const filename = parseFilename(res.headers.get("Content-Disposition"));
  const blob = await res.blob();
  return { blob, filename: filename || `document-${docId}.pdf` };
}
