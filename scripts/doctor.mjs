import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,loadState} from './store.mjs';
import {aiStatus} from './server.mjs';
const gpu=spawnSync('nvidia-smi',['--query-gpu=name,memory.total,driver_version','--format=csv,noheader'],{encoding:'utf8',windowsHide:true});
console.log(JSON.stringify({node:process.version,project:ROOT,gpu:gpu.stdout?.trim()||'未检测到 NVIDIA 驱动',dependenciesInstalled:fs.existsSync(path.join(ROOT,'site/node_modules/astro')),buildExists:fs.existsSync(path.join(ROOT,'site/dist/index.html')),memories:loadState().memories.length,ai:await aiStatus()},null,2));
