import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {ROOT,initStore} from './store.mjs';
export function build(){
  initStore();
  const cli=path.join(ROOT,'site/node_modules/astro/bin/astro.mjs');
  const result=spawnSync(process.execPath,[cli,'build'],{cwd:path.join(ROOT,'site'),stdio:'inherit',env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
  if(result.status!==0)throw Error('网站构建没有完成，请查看上方提示');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build();
