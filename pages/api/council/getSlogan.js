export default function retired(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({ error: 'Legacy Council AI drafting and sanitization are retired. Submit the original proposal through /council/ask.' });
}
