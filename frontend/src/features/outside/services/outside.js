import { API_URL } from "@utils/consts";

export async function fetchOutsideView(token) {
  const res = await fetch(
    `${API_URL}/outside/respond/${encodeURIComponent(token)}`,
  );
  const j = await res.json();
  if (!res.ok) throw new Error(j?.message || "Invalid link");
  return j.data;
}

export async function submitOutsideResponse(token, body) {
  const res = await fetch(
    `${API_URL}/outside/respond/${encodeURIComponent(token)}/respond`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const j = await res.json();
  if (!res.ok) throw new Error(j?.message || "Failed to submit");
  return j.data;
}
