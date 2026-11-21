import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import algosdk from 'algosdk';

export const contractsDirectory=path.dirname(fileURLToPath(import.meta.url));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export function readDeploymentPrograms(directory=contractsDirectory){
 // The Python file last compiled selects the program and its deployment schema.
 // deployment.config.json is only used by the optional generic Python compiler.
 if(!fs.existsSync(path.join(directory,'deployment-manifest.json')))throw new Error('Compile your contract first: python ArenaTreasury.py');
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'deployment-manifest.json'),'utf8'));
 const approvalSource=fs.readFileSync(path.join(directory,'approval.teal'),'utf8'),clearSource=fs.readFileSync(path.join(directory,'clear_state.teal'),'utf8');
 if(path.basename(manifest.source)!==manifest.source||!manifest.source.endsWith('.py'))throw new Error('Invalid contract source filename');
 if(sha(fs.readFileSync(path.join(directory,manifest.source)))!==manifest.sourceSha256||sha(approvalSource)!==manifest.approvalSha256||sha(clearSource)!==manifest.clearSha256)throw new Error(`Deployment files are stale or mismatched. Run python ${manifest.source} again.`);
 return {...manifest,approvalSource,clearSource};
}
export function compileContract({directory=contractsDirectory,python=process.env.PYTHON||'python'}={}){
 const result=spawnSync(python,[path.join(contractsDirectory,'compile_contract.py'),path.join(directory,'deployment.config.json'),directory],{cwd:directory,encoding:'utf8',windowsHide:true});
 if(result.error)throw new Error(`Cannot run Python compiler: ${result.error.message}. Set PYTHON to your Python executable.`);
 if(result.status!==0)throw new Error(`Contract compilation failed; deployment stopped.\n${result.stderr||result.stdout}`);
 const programs=readDeploymentPrograms(directory);
 console.log(`Selected contract: ${programs.source}; AVM ${programs.avmVersion}; schema ${JSON.stringify(programs.schema)}`);
 console.log('Generated contracts/approval.teal and contracts/clear_state.teal. No transaction sent.');
 return programs;
}
export async function compileDeploymentBytecode(client,programs){
 const compile=async source=>new Uint8Array(Buffer.from((await client.compile(new TextEncoder().encode(source)).do()).result,'base64'));
 const [approvalProgram,clearProgram]=await Promise.all([compile(programs.approvalSource),compile(programs.clearSource)]);
 if(!approvalProgram.length||!clearProgram.length)throw new Error('Node returned an empty compiled program');
 const extraPages=Math.max(0,Math.ceil((approvalProgram.length+clearProgram.length)/2048)-1);
 if(extraPages>3)throw new Error('Compiled program exceeds application size limits');
 return {approvalProgram,clearProgram,extraPages};
}
export function deploymentCreationArgs(programs,{oracleAddress,appArgs}={}){
 if(programs.creationArgs==='oracle'){
  if(!algosdk.isValidAddress(oracleAddress))throw new Error('Set ARENA_REWARD_ORACLE_ADDRESS to the public reward oracle address before creating the treasury.');
  if(appArgs!==undefined)throw new Error('Treasury creation args are derived from oracleAddress; do not override appArgs.');
  return [algosdk.decodeAddress(oracleAddress).publicKey];
 }
 return appArgs||[];
}
export function assertUpdateCompatible(programs,bytecode,app,sender){
 const p=app.params;
 if(String(p.creator)!==String(sender))throw new Error('Only the existing application creator can update it.');
 const schema=programs.schema;
 if(Number(p.globalStateSchema?.numUint||0)<schema.globalInts||Number(p.globalStateSchema?.numByteSlice||0)<schema.globalBytes||Number(p.localStateSchema?.numUint||0)<schema.localInts||Number(p.localStateSchema?.numByteSlice||0)<schema.localBytes)throw new Error('Existing app schema is incompatible. Create the correct contract as a new app.');
 if(bytecode.extraPages>Number(p.extraProgramPages||0))throw new Error('Updated program does not fit the existing application capacity.');
 if(programs.source==='ArenaTreasury.py'){
  const globals=Object.fromEntries((p.globalState||[]).map(r=>[Buffer.from(r.key).toString(),r.value]));
  if(![2n,3n].includes(BigInt(globals.version?.uint||0))||globals.oracle?.bytes?.length!==32)throw new Error('Target app is not an initialized arena treasury. Create a new app instead of overwriting another contract.');
 }
}
