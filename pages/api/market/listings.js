import algosdk from "algosdk";
import { loadCatalog, getListing } from "../../../functions/market/chain";
import { enrichListing, enrichListings } from "../../../functions/market/media";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.setHeader("Allow", "GET").status(405).json({ error: "Method not allowed." });
  res.setHeader("Cache-Control", "no-store");
  const { id, seller } = req.query;
  if ((id && (typeof id !== "string" || !/^(?:[A-Z2-7]{52}|[a-f0-9]{128})$/.test(id))) || (seller && (typeof seller !== "string" || !algosdk.isValidAddress(seller)))) return res.status(400).json({ error: "Invalid listing or stall address." });
  try {
    if (id) {
      const listing = await getListing(id, { fresh: true });
      return listing ? res.json({ listing: await enrichListing(listing) }) : res.status(404).json({ error: "Listing not found. A new listing may still be indexing." });
    }
    const catalog = await loadCatalog();
    const active = [...catalog.listings.values()].filter((l) => l.status === "active" && (!seller || l.seller === seller)).sort((a, b) => b.round - a.round || b.offset - a.offset);
    return res.json({ listings: await enrichListings(active) });
  } catch {
    return res.status(503).json({ error: "The market could not load from Algorand. Please retry." });
  }
}
