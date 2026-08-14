
import * as admin from "firebase-admin";
var serviceAccount = require("../service.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

console.log("initit")

export default admin;