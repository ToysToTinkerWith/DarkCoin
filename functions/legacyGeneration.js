const {onDocumentCreated}=require('firebase-functions/v2/firestore');
exports.legacyGeneration=onDocumentCreated({document:'legacyGenerationJobs/{jobId}',region:'us-central1',retry:true},async event=>{
 if(event.data?.data()?.schemaVersion!==2||event.data.data().status!=='queued')return;
 const tokenResponse=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'}});
 if(!tokenResponse.ok)throw Error('Unable to authorize generation worker.');
 const token=await tokenResponse.json(),project=process.env.GCLOUD_PROJECT||'dark-coin-dc4a3';
 const response=await fetch(`https://run.googleapis.com/v2/projects/${project}/locations/us-central1/jobs/dark-coin-legacy-generator:run`,{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({overrides:{containerOverrides:[{env:[{name:'GENERATION_JOB_ID',value:event.params.jobId}]}]}})});
 if(!response.ok)throw Error(`Unable to start generation worker (${response.status}).`);
});
