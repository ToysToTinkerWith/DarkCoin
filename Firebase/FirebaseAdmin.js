import * as admin from 'firebase-admin';
// Production uses its attached service identity. Local development can set
// GOOGLE_APPLICATION_CREDENTIALS; credentials never enter compiled source.
if (!admin.apps.some(app => app.name === '[DEFAULT]')) admin.initializeApp();
export default admin;
