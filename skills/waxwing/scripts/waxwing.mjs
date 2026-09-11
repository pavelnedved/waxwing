import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {boundRuntime} from './runtime.mjs';

const skillDirectory=fileURLToPath(new URL('../',import.meta.url));
try {
  let runtime;
  try {runtime=boundRuntime(skillDirectory);} catch(error) {
    throw new Error(`Waxwing skill runtime unavailable or changed: ${error.message} Reinstall with the intended Waxwing package: waxwing skill install ${JSON.stringify(skillDirectory)}. This adapter has not run the requested command.`);
  }
  const [command,...args]=process.argv.slice(2);
  if(command==='check') {
    if(args.length)throw new Error('check takes no arguments.');
    console.log(JSON.stringify({ok:true,...runtime},null,2));
  } else if(command==='guide'||command==='review-update') {
    const helpers=await import(pathToFileURL(path.join(runtime.packageRoot,'modules/skill/workflow.mjs')));
    if(command==='guide') {
      if(args.length!==1)throw new Error('guide requires one topic, or list.');
      console.log(helpers.readGuide(runtime.packageRoot,args[0]));
    } else {
      if(args.length!==2)throw new Error('review-update requires baseline and updated model paths.');
      console.log(JSON.stringify({ok:true,...helpers.reviewUpdate(args[0],args[1])},null,2));
    }
  } else {
    const result=spawnSync(process.execPath,[path.join(runtime.packageRoot,'bin/waxwing.mjs'),...process.argv.slice(2)],{stdio:'inherit'});
    if(result.error)throw result.error;
    process.exitCode=result.status??1;
  }
} catch(error) {
  console.error(JSON.stringify({ok:false,message:error.message,diagnostics:error.diagnostics??[]},null,2));process.exitCode=1;
}
