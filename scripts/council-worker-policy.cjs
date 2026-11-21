const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const excluded=new Set(['node_modules','.git','.next','.next-arena-dev','.agents','.codex','.aws','output','tmp','venv','.tmp-pyteal-venv','.firebase','.vscode','.compensation-state']);
function sourceFiles(root,prefix=''){
  const files=[];
  for(const entry of fs.readdirSync(path.join(root,prefix),{withFileTypes:true})){
    const relative=path.posix.join(prefix,entry.name);
    if(excluded.has(entry.name)||entry.name.startsWith('.env')||entry.name==='service.json'||/credential|\.pem$|\.key$|\.log$|firebase-debug/i.test(entry.name))continue;
    if(entry.isSymbolicLink())continue;
    if(entry.isDirectory())files.push(...sourceFiles(root,relative));else files.push(relative);
  }return files;
}
function allowedChange(file){
  return /^(components\/|public\/|lib\/|pages\/)/.test(file)&&!/^pages\/api\//.test(file)&&!/^lib\/(council|marketTransactions|depthsEntryPayments)/.test(file)&&!/(^|\/)(AGENTS\.md|\.env[^/]*|service\.json|node_modules|\.codex)(\/|$)/.test(file);
}
function snapshot(source,target){
  fs.mkdirSync(target,{recursive:true});const base={};
  for(const file of sourceFiles(source)){const from=path.join(source,file),dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);base[file]=sha(fs.readFileSync(from));}
  return base;
}
function changes(root,base){
  const current=new Set(sourceFiles(root)),changed=[];
  for(const file of new Set([...Object.keys(base),...current])){
    const digest=current.has(file)?sha(fs.readFileSync(path.join(root,file))):null;
    if(digest!==(base[file]||null)){
      if(!allowedChange(file))throw Error(`Execution changed protected file: ${file}. Council rules and treasury permissions must use the voted governance actions.`);
      changed.push({file,before:base[file]||null,after:digest});
    }
  }return changed;
}
function safePath(root,file){
  const resolved=path.resolve(root,file),relative=path.relative(path.resolve(root),resolved);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!allowedChange(file))throw Error('Invalid release path.');
  let cursor=resolved;while(cursor!==path.resolve(root)){if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw Error('Release paths cannot be symlinks.');cursor=path.dirname(cursor);}
  return resolved;
}
module.exports={sha,sourceFiles,allowedChange,snapshot,changes,safePath};
