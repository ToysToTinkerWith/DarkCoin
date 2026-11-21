"""Compile the selected PyTeal contract into a single shared deployment pair.

Only writes local TEAL and its manifest. Does not contact a node or sign anything.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from pyteal import Mode, compileTeal


def compile_contract(config_path, output_dir=None):
    config_path=Path(config_path).resolve()
    config=json.loads(config_path.read_text(encoding='utf-8'))
    source_name=config['source']
    if Path(source_name).name!=source_name or not source_name.endswith('.py'):
        raise ValueError('Select a Python filename in the contracts directory')
    source=config_path.parent/source_name
    version=config['avmVersion']
    schema=config['schema']
    if not isinstance(version,int) or isinstance(version,bool) or not 2<=version<=10:
        raise ValueError('Specify an AVM version between 2 and 10')
    if set(schema)!={'localInts','localBytes','globalInts','globalBytes'}:
        raise ValueError('Specify all four state schema sizes')
    if any(not isinstance(v,int) or isinstance(v,bool) or v<0 for v in schema.values()) or schema['localInts']+schema['localBytes']>16 or schema['globalInts']+schema['globalBytes']>64:
        raise ValueError('Invalid application state schema')
    if config['creationArgs'] not in ('oracle','none'):
        raise ValueError('creationArgs must be oracle or none')
    sys.path.insert(0,str(config_path.parent))
    spec=importlib.util.spec_from_file_location('selected_deployment_contract',source)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for attr,expected in [('DEPLOYMENT_SCHEMA',schema),('DEPLOYMENT_CREATE_ARGS',config['creationArgs']),('TEAL_VERSION',version)]:
        if hasattr(module,attr) and getattr(module,attr)!=expected:
            raise ValueError(f'{source_name} requires {attr}={getattr(module,attr)!r}; fix deployment.config.json')
    approval=compileTeal(module.approval_program(),Mode.Application,version=version,assembleConstants=getattr(module,'DEPLOYMENT_ASSEMBLE_CONSTANTS',False))
    clear=compileTeal(module.clear_state_program(),Mode.Application,version=version)
    return write_deployment_programs(source,approval,clear,config,output_dir)


def write_deployment_programs(source, approval, clear, config, output_dir=None):
    """Write already compiled programs; callable from a contract's __main__."""
    source=Path(source).resolve()
    out=Path(output_dir).resolve() if output_dir else source.parent
    out.mkdir(parents=True,exist_ok=True)
    sha=lambda data:hashlib.sha256(data).hexdigest()
    manifest={**config,'sourceSha256':sha(source.read_bytes()),'approvalSha256':sha(approval.encode()),'clearSha256':sha(clear.encode())}
    # Commit the manifest last. Readers reject mixed/stale files by their hashes.
    for filename,data in [('approval.teal',approval),('clear_state.teal',clear),('deployment-manifest.json',json.dumps(manifest,indent=2)+'\n')]:
        temporary=out/(filename+'.tmp')
        temporary.write_text(data,encoding='utf-8',newline='')
        temporary.replace(out/filename)
    return manifest


if __name__=='__main__':
    selected=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).with_name('deployment.config.json')
    result=compile_contract(selected,sys.argv[2] if len(sys.argv)>2 else None)
    print(f"Compiled {result['source']} (AVM {result['avmVersion']}) to approval.teal and clear_state.teal")
