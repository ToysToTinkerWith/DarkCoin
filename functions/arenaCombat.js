const {onRequest}=require('firebase-functions/v2/https');
const handler=require('./arenaCombat.bundle.cjs').default;

// Admission only in WebSocket mode. Movement and combat run in the room worker.
exports.arenaCombat=onRequest({region:'us-central1',memory:'512MiB',timeoutSeconds:60,maxInstances:8,concurrency:40,secrets:['ARENA_TICKET_SECRET']},handler);
