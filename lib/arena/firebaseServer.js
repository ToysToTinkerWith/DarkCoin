import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Deployed functions use their service account. Local development may use the
// existing project service file; its contents never enter the client bundle.
export function arenaDatabase(){
 let app=admin.apps.find(a=>a.name==='playground-authority');
 if(!app){
  const options={projectId:process.env.GCLOUD_PROJECT||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||'dark-coin-dc4a3'};
  const local=path.join(process.cwd(),'service.json');
  if(!process.env.FIRESTORE_EMULATOR_HOST){
   options.credential=process.env.NODE_ENV!=='production'&&fs.existsSync(local)
    ?admin.credential.cert(JSON.parse(fs.readFileSync(local,'utf8'))):admin.credential.applicationDefault();
  }
  app=admin.initializeApp(options,'playground-authority');
 }
 return app.firestore();
}
