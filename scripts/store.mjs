import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

function findRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'examples/profile.json')) && fs.existsSync(path.join(current, 'scripts/store.mjs'))) return current;
    current = path.dirname(current);
  }
  throw new Error('找不到项目目录，请保留 examples 和 scripts 文件夹');
}
export const ROOT = process.env.UNIVERSE_ROOT || findRoot(path.dirname(fileURLToPath(import.meta.url)));
export const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function embedState(html, state) {
  const pattern=/(<script id="universe-data" type="application\/json">)[\s\S]*?(<\/script>)/;
  assert(pattern.test(html), '页面数据入口缺失', 500);
  const payload=JSON.stringify(state).replace(/</g,'\\u003c');
  return html.replace(pattern,(_match,start,end)=>start+payload+end);
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function assert(condition, message, status = 400) {
  if (!condition) throw Object.assign(new Error(message), { status });
}
export function atomicWrite(filename, data) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temp = `${filename}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, data);
    fs.renameSync(temp, filename);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export function parseMemory(source) {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert(match, '回忆缺少 YAML 元信息');
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const pair = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    assert(pair, '请使用每行一个字段的简单 YAML 格式');
    const [, key, raw] = pair;
    assert(!Object.hasOwn(meta, key), `重复字段：${key}`);
    assert(!['__proto__', 'constructor', 'prototype'].includes(key), '无效字段');
    try { meta[key] = JSON.parse(raw); }
    catch { meta[key] = raw.replace(/^'(.*)'$/, '$1').replace(/''/g, "'"); }
  }
  return { ...meta, body: match[2].trim() };
}
export function serializeMemory(memory) {
  const { body, ...metadata } = memory;
  return `---\n${Object.entries(metadata).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n${body.trim()}\n`;
}
export function renderMarkdown(source) {
  return source.split(/\n\s*\n/).map((block) => {
    if (/^#{1,3} /.test(block)) {
      const level = block.match(/^#+/)[0].length + 1;
      return `<h${level}>${escapeHtml(block.replace(/^#+ /, ''))}</h${level}>`;
    }
    if (block.split('\n').every(line => /^- /.test(line))) return `<ul>${block.split('\n').map(line => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

const sampleMedia = [
  ['demo-window', 'window', '在平凡里，遇见你', '#ead7bc'],
  ['demo-sea', 'sea', '一起等一场日落', '#c5d7d7'],
  ['demo-coffee', 'coffee', '慢慢喝完一杯咖啡', '#d7b4a1'],
  ['demo-flower', 'flower', '把小小的浪漫带回家', '#e7c8c6']
];
function illustration(kind, background) {
  const common = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100"><rect width="900" height="1100" fill="${background}"/><defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".065"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><g filter="url(#grain)">`;
  const scenes = {
    sea: '<circle cx="570" cy="365" r="110" fill="#e7a780"/><path d="M0 535 Q220 480 450 545 T900 530 V1100 H0Z" fill="#6f969b"/><path d="M0 690 Q220 635 430 705 T900 690 M0 800 Q280 740 520 815 T900 800" fill="none" stroke="#c6d7ca" stroke-width="10" opacity=".7"/><path d="M0 935 Q280 840 900 1000V1100H0Z" fill="#e6d4b8"/><path d="M180 260q35-35 65 0q35-35 65 0" fill="none" stroke="#5c7776" stroke-width="6"/>',
    window: '<rect x="175" y="150" width="550" height="650" rx="270" fill="#f6ecd9"/><path d="M215 755V440a235 235 0 01470 0v315Z" fill="#b0b9a0"/><circle cx="540" cy="400" r="95" fill="#eecda1"/><path d="M215 640Q390 475 685 650V755H215Z" fill="#7d9072"/><path d="M450 220v535M215 490h470" stroke="#f6ecd9" stroke-width="18"/><path d="M130 805h640" stroke="#9a7757" stroke-width="22"/><path d="M250 110Q70 430 180 810M650 110q180 320 70 700" stroke="#c2a887" stroke-width="80" fill="none"/><rect x="350" y="875" width="200" height="90" rx="10" fill="#a9775b"/><path d="M450 875V730m0 100q-100-20-100-95q110-15 100 95m0-15q100-30 100-105q-110 5-100 105" fill="#87906b" stroke="#74815f" stroke-width="7"/>',
    coffee: '<ellipse cx="450" cy="700" rx="290" ry="150" fill="#e9d9c2"/><ellipse cx="450" cy="690" rx="210" ry="100" fill="#f8edde"/><path d="M620 420q180-40 150 130q-25 80-140 35" stroke="#f8edde" stroke-width="45" fill="none"/><path d="M235 390h410v210q-10 130-205 130q-200 0-205-130Z" fill="#fcf1df"/><ellipse cx="440" cy="395" rx="205" ry="80" fill="#b57e58"/><ellipse cx="440" cy="395" rx="165" ry="55" fill="#ad6d48"/><path d="M420 410q-90-75-65-90q55-20 85 40q35-75 80-35q40 30-100 85" fill="#e9c7a4"/><path d="M355 250q-60-75 0-120M495 245q65-65 0-130" stroke="#ecd3be" stroke-width="15" fill="none" stroke-linecap="round"/>',
    flower: '<path d="M450 890V430m0 350L300 550m150 170 165-180" stroke="#7c9178" stroke-width="16" fill="none"/><path d="M440 750Q250 820 255 660q130-30 185 90M465 680q170 30 160-100q-130-25-160 100" fill="#91a18a"/><g fill="#b86c65"><ellipse cx="450" cy="330" rx="75" ry="125"/><ellipse cx="450" cy="330" rx="75" ry="125" transform="rotate(72 450 390)"/><ellipse cx="450" cy="330" rx="75" ry="125" transform="rotate(144 450 390)"/><ellipse cx="450" cy="330" rx="75" ry="125" transform="rotate(216 450 390)"/><ellipse cx="450" cy="330" rx="75" ry="125" transform="rotate(288 450 390)"/></g><circle cx="450" cy="390" r="60" fill="#ddba81"/><path d="M355 855h190l-30 150H385Z" fill="#ece0cd"/>'
  };
  return common + scenes[kind] + '</g></svg>';
}

export function initStore(root = ROOT) {
  for (const dir of ['vault/memories','vault/profile','media/originals','drafts','manifests','backups','export']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const profileFile = path.join(root, 'vault/profile/settings.json');
  if (!fs.existsSync(profileFile)) {
    atomicWrite(profileFile, fs.readFileSync(path.join(ROOT, 'examples/profile.json')));
    for (const file of fs.readdirSync(path.join(ROOT, 'examples/memories'))) {
      atomicWrite(path.join(root, 'vault/memories', file), fs.readFileSync(path.join(ROOT, 'examples/memories', file)));
    }
  }
  if (!fs.existsSync(path.join(root, 'manifests/media.json'))) {
    const media = sampleMedia.map(([id, kind, caption, color]) => {
      const svg = illustration(kind, color);
      const filename = `${id}.svg`;
      atomicWrite(path.join(root, 'media/originals', filename), svg);
      return { id, filename, type: 'image', caption, visibility:'shared', publish_online:true, include_in_archive:true, demo:true, sha256:hash(svg) };
    });
    atomicWrite(path.join(root, 'manifests/media.json'), JSON.stringify(media, null, 2));
  }
}

export function loadState(root = ROOT) {
  initStore(root);
  const profile = JSON.parse(fs.readFileSync(path.join(root, 'vault/profile/settings.json'), 'utf8'));
  const media = JSON.parse(fs.readFileSync(path.join(root, 'manifests/media.json'), 'utf8'));
  const memories = fs.readdirSync(path.join(root, 'vault/memories')).filter(f => f.endsWith('.md')).map(file => parseMemory(fs.readFileSync(path.join(root, 'vault/memories', file), 'utf8'))).sort((a,b) => b.date.localeCompare(a.date));
  for (const memory of memories) assert(typeof memory.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(memory.id) && validDate(memory.date) && Array.isArray(memory.media_ids), '档案元信息无效，请检查 ID、日期与 media_ids');
  return { profile, media, memories };
}
export function publicState(state, purpose = 'online') {
  const flag = purpose === 'offline' ? 'include_in_archive' : 'publish_online';
  const memories = state.memories.filter(m => m.visibility === 'shared' && m.status === 'confirmed' && m[flag] === true);
  const allowedIds = new Set(memories.flatMap(m => m.media_ids || []));
  const media = state.media.filter(m => allowedIds.has(m.id) && m.visibility === 'shared' && m[flag] === true).map(({ filename, ...m }) => ({ ...m, url:`media/${encodeURIComponent(filename)}` }));
  const validIds = new Set(media.map(m => m.id));
  const { model, revision, ...profile } = state.profile;
  return { profile, memories: memories.map(m => ({ ...m, media_ids:(m.media_ids || []).filter(id => validIds.has(id)) })), media };
}
export function saveProfile(patch, root = ROOT) {
  const current = loadState(root).profile;
  assert(patch.revision === current.revision, '资料已经更新，请刷新后再保存', 409);
  const { names, startDate, motto, letter, siteName, anniversaries, model } = patch;
  assert(Array.isArray(names) && names.length === 2 && names.every(n => typeof n === 'string' && n.trim().length > 0 && n.length <= 30), '请填写两个昵称，每个不超过 30 字');
  assert(startDate === '' || validDate(startDate), '恋爱日期无效');
  assert(typeof motto === 'string' && motto.length <= 150 && typeof letter === 'string' && letter.length <= 20000, '寄语或信件过长');
  assert(typeof siteName === 'string' && siteName.trim() && siteName.length <= 40, '网站名称无效');
  assert(Array.isArray(anniversaries) && anniversaries.length <= 30 && anniversaries.every(a => validDate(a.date) && typeof a.title === 'string' && a.title.length > 0 && a.title.length <= 60 && typeof a.recurring === 'boolean'), '纪念日格式无效');
  assert(typeof model === 'string' && /^[a-zA-Z0-9:._-]{1,80}$/.test(model), '模型名称无效');
  const next = {...current, names:names.map(n => n.trim()), startDate, motto, letter, siteName:siteName.trim(), anniversaries, model, demo:false, revision:current.revision + 1};
  saveHistory(path.join(root,'vault/profile/settings.json'), root);
  atomicWrite(path.join(root,'vault/profile/settings.json'), JSON.stringify(next, null, 2));
  return next;
}
function saveHistory(filename, root) {
  if (fs.existsSync(filename)) {
    const name = `${Date.now()}-${crypto.randomUUID()}-${path.basename(filename)}`;
    atomicWrite(path.join(root,'backups/history', name), fs.readFileSync(filename));
  }
}
export function saveMemory(input, root = ROOT) {
  const state = loadState(root);
  const existing = input.id ? state.memories.find(m => m.id === input.id) : null;
  assert(!input.id || existing, '没有找到这篇回忆', 404);
  assert(!existing || existing.revision === input.revision, '回忆已经更新，请刷新后再保存', 409);
  assert(typeof input.title === 'string' && input.title.trim() && input.title.length <= 100, '标题须为 1–100 字');
  assert(validDate(input.date), '日期无效');
  assert(typeof input.body === 'string' && input.body.trim() && input.body.length <= 50000, '请填写正文（最多 50000 字）');
  assert(['private','shared'].includes(input.visibility), '分享范围无效');
  assert(['draft','confirmed'].includes(input.status), '记录状态无效');
  assert(Array.isArray(input.tags) && input.tags.length <= 12 && input.tags.every(t => typeof t === 'string' && t.length <= 30), '标签格式无效');
  assert(Array.isArray(input.media_ids) && input.media_ids.every(id => state.media.some(m => m.id === id)), '关联素材不存在');
  for (const field of ['publish_online','include_in_archive','ai_readable']) assert(typeof input[field] === 'boolean', '分享设置无效');
  const memory = {
    id:existing?.id || `memory-${crypto.randomUUID()}`,
    date:input.date, title:input.title.trim(), tags:input.tags, visibility:input.visibility,
    publish_online:input.publish_online, include_in_archive:input.include_in_archive, ai_readable:input.ai_readable,
    status:input.status, media_ids:[...new Set(input.media_ids)], revision:(existing?.revision || 0)+1, demo:false,
    body:input.body
  };
  const folder = path.join(root,'vault/memories');
  const oldFile = existing && fs.readdirSync(folder).find(f => f.endsWith('.md') && parseMemory(fs.readFileSync(path.join(folder,f),'utf8')).id === existing.id);
  const filename = oldFile ? path.join(folder,oldFile) : path.join(folder,`${memory.id}.md`);
  saveHistory(filename, root);
  atomicWrite(filename, serializeMemory(memory));
  return memory;
}
export function clearExamples(root = ROOT) {
  const state = loadState(root);
  const dir = path.join(root,'vault/memories');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    if (parseMemory(fs.readFileSync(path.join(dir,file),'utf8')).demo === true) {
      saveHistory(path.join(dir,file),root);
      fs.unlinkSync(path.join(dir,file));
    }
  }
  const usedByRealStories = new Set(state.memories.filter(m => !m.demo).flatMap(m => m.media_ids || []));
  const remaining = state.media.filter(m => !m.demo || usedByRealStories.has(m.id));
  saveHistory(path.join(root,'manifests/media.json'),root);
  saveHistory(path.join(root,'vault/profile/settings.json'),root);
  atomicWrite(path.join(root,'manifests/media.json'),JSON.stringify(remaining,null,2));
  const profile = {...state.profile,demo:false, revision:state.profile.revision+1};
  atomicWrite(path.join(root,'vault/profile/settings.json'),JSON.stringify(profile,null,2));
}
export function searchMemories(query, state = loadState(), limit = 5) {
  const terms = [...new Set((query.match(/[a-z0-9]+|[\u4e00-\u9fff]+/gi) || []).flatMap(t => t.length > 2 && /[\u4e00-\u9fff]/.test(t) ? Array.from({length:t.length-1},(_,i)=>t.slice(i,i+2)) : [t]).map(t=>t.toLowerCase()))];
  return state.memories.filter(m => m.status==='confirmed' && m.visibility==='shared' && m.ai_readable===true && !m.demo).map(m => {
    const title = `${m.title} ${(m.tags||[]).join(' ')} ${m.date}`.toLowerCase();
    const body = m.body.toLowerCase();
    return { ...m, score:terms.reduce((sum,t)=>sum+(title.includes(t)?4:body.includes(t)?1:0),0) };
  }).filter(m=>m.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}
