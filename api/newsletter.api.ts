import { API_BASE } from "@/config";

export async function subscribeToNewsletter(
  email: string,
  options?: { source?: string; topic?: string }
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/web/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...options }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.subscribed ?? false;

  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return false;
  }
}

export async function unsubscribeFromNewsletter(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/web/newsletter/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.unsubscribed ?? false;

  } catch (err) {
    console.error("Newsletter unsubscribe error:", err);
    return false;
  }
}

export async function getNewsletterStatus(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/web/newsletter/status/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.subscribed ?? false;

  } catch (err) {
    console.error("Newsletter status error:", err);
    return false;
  }
}