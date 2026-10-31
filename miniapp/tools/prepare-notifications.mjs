import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'cloudfunctions/coupleApi'),target=path.join(root,'cloudfunctions/notificationWorker/lib');
fs.mkdirSync(target,{recursive:true});
for(const file of ['repository.js','notifications.js','notification-config.js','reminders.js','periods.js'])fs.copyFileSync(path.join(source,file),path.join(target,file));
fs.copyFileSync(path.join(source,'periods.js'),path.join(root,'miniprogram/services/period-core.js'));
console.log('Notification worker prepared from canonical coupleApi sources. No cloud resources changed.');
