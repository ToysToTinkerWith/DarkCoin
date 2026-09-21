const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { loadCatalog } = require("./market/chain");
const { deliverAnnouncement, announcementStartTime } = require("./market/discord");

exports.marketAnnouncements = onSchedule({
  schedule: "every 1 minutes", region: "us-central1", timeoutSeconds: 300, memory: "512MiB", maxInstances: 1,
}, async () => {
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  const cursorRef = db.collection("marketAnnouncementState").doc("cursor");
  const cursor = (await cursorRef.get()).data() || { round: 0, offset: -1 };
  const start = announcementStartTime();
  const catalog = await loadCatalog({ fresh: true });
  const events = catalog.events.filter((event) => event.time >= start && (event.round > cursor.round || (event.round === cursor.round && event.offset > cursor.offset)));
  for (const event of events.slice(0, 50)) {
    const result = await deliverAnnouncement(db, event);
    if (result.pending) break;
    await cursorRef.set({ round: event.round, offset: event.offset });
  }
});
