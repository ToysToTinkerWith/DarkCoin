import admin from "../../../Firebase/FirebaseAdmin";
import { loadCatalog } from "../../../functions/market/chain";
import { deliverAnnouncement } from "../../../functions/market/discord";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.setHeader("Allow", "POST").status(405).json({ error: "Method not allowed." });
  const txId = req.body?.txId;
  if (typeof txId !== "string" || !/^[A-Z2-7]{52}$/.test(txId)) return res.status(400).json({ error: "Invalid transaction ID." });
  res.setHeader("Cache-Control", "no-store");
  try {
    const catalog = await loadCatalog({ fresh: true });
    const event = catalog.events.find((entry) => entry.txId === txId);
    if (!event) return res.status(202).json({ pending: true });
    const result = await deliverAnnouncement(admin.firestore(), event);
    return res.status(result.pending ? 202 : 200).json(result);
  } catch {
    return res.status(503).json({ pending: true, error: "The server will retry confirmed market announcements." });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };
