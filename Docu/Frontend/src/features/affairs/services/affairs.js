import { apiRequest } from "@utils/api";
import { API_URL } from "@utils/consts";

function tk() {
  return localStorage.getItem("token");
}

export async function listAffairsInstances({ status, workflowId } = {}) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  if (workflowId) p.set("workflowId", workflowId);
  const qs = p.toString();
  const data = await apiRequest(`/affairs/instance${qs ? `?${qs}` : ""}`, {
    method: "GET",
    token: tk(),
  });
  return data?.data?.instances || [];
}

export async function getAffairsInstance(id) {
  const data = await apiRequest(`/affairs/instance/${id}`, {
    method: "GET",
    token: tk(),
  });
  return data?.data;
}

/**
 * Fetches the ONE merged PDF that combines every document across every
 * selected instance and returns it as a blob URL. The caller is responsible
 * for revoking the URL when done. The server auto-transitions any of the
 * selected instances that are still `completed` to `printed` as a side effect.
 */
export async function fetchBulkMergedPdfUrl(instanceIds) {
  const ids = (instanceIds || []).join(",");
  const res = await fetch(
    `${API_URL}/affairs/instance/bulk-pdf?ids=${encodeURIComponent(ids)}`,
    { headers: { Authorization: `Bearer ${tk()}` } },
  );
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Fetches the merged PDF for a SINGLE instance and returns a blob URL. The
 * server auto-transitions the instance to `printed` if it was still
 * `completed`.
 */
export async function fetchInstanceMergedPdfUrl(instanceId) {
  const res = await fetch(`${API_URL}/affairs/instance/${instanceId}/pdf`, {
    headers: { Authorization: `Bearer ${tk()}` },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Prints a PDF from a blob URL using a hidden iframe.
 */
export function printPdfBlobUrl(url) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = url;
    document.body.appendChild(frame);

    frame.onload = () => {
      setTimeout(() => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch (_e) {
          window.open(url, "_blank");
        }
        setTimeout(() => {
          URL.revokeObjectURL(url);
          frame.remove();
          resolve();
        }, 15_000);
      }, 300);
    };
  });
}
