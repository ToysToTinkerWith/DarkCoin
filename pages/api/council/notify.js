import admin from '../../../Firebase/FirebaseAdmin';
import { queueConfirmedReceipt } from '../../../functions/council/discord';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  try {
    const result = await queueConfirmedReceipt({ db: admin.firestore(), txid: String(req.body?.txid || '') });
    return res.status(202).json(result);
  } catch (error) {
    if (Number(error.status || error.response?.status) === 404) return res.status(202).json({ queued: false, pending: true });
    return res.status(400).json({ error: error.message });
  }
}
