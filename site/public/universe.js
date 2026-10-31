/* Our Universe: one local script for the website and file:// archive. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const esc = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = JSON.parse($('#universe-data').textContent);
  let fullState = null, token = '', isLocal = false, selectedIds = [], pendingFiles = [], activeTag = '';
  let toastTimer, gameTimer, game = [], flipped = [], moves = 0, busy = false;
  const mediaById = id => state.media.find(m=>m.id===id);
  const dateToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dayDiff = (a,b) => Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
  function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500); }
  async function api(route, data, method='POST') {
    const options = {method,headers:{'x-universe-token':token}};
    if(data!==undefined){options.headers['content-type']='application/json';options.body=JSON.stringify(data);}
    const response = await fetch(route,options);
    const result = await response.json();
    if(!response.ok) throw new Error(result.error || '这次保存没有完成，请重试');
    return result;
  }
  async function refresh() {
    state=await api('/api/public',undefined,'GET');
    fullState=await api('/api/state',undefined,'GET');
    render();
  }
  function mediaMarkup(media) {
    if(!media)return '';
    if(media.type==='video') return `<video src="${esc(media.url)}" controls playsinline preload="metadata"></video>`;
    if(media.type==='audio') return `<audio src="${esc(media.url)}" controls preload="metadata"></audio>`;
    return `<img src="${esc(media.url)}" alt="${esc(media.caption)}" loading="lazy">`;
  }
  function render() {
    const p=state.profile;
    document.title=`${p.siteName} · 把日子写成故事`;
    $('[data-site-name]').innerHTML=`${esc(p.siteName)}<small>OUR LITTLE UNIVERSE</small>`;
    $('#motto').textContent=p.motto;
    $('#couple-names').textContent=p.names.join(' & ');
    $$('.avatar').forEach((el,i)=>el.textContent=p.names[i]?.slice(0,1)||'♡');
    $('#demo-note').hidden=!state.memories.some(m=>m.demo);
    $('#letter-content').textContent=p.letter;
    const images=state.media.filter(m=>m.type==='image');
    for(const [id,index] of [['hero-back',0],['hero-front',1]]){
      const image=images[index]||images[0];
      const target=$('#'+id);
      if(image){target.src=image.url;target.alt=image.caption+(image.demo?'（示例插画）':'');}
      else {target.removeAttribute('src');target.alt='这里，等一张属于我们的照片';}
    }
    $('.art-label').textContent=images.some(i=>i.demo)?'ILLUSTRATED MEMORIES / 示例插画':'OUR OWN LITTLE MOMENTS';
    updateDates();
    const tags=[...new Set(state.memories.flatMap(m=>m.tags||[]))].filter(t=>t!=='示例').slice(0,7);
    if(activeTag&&!tags.includes(activeTag))activeTag='';
    $('#memory-filters').innerHTML=['',...tags].map(t=>`<button class="pill ${t===activeTag?'active':''}" data-tag="${esc(t)}">${esc(t||'全部手记')}</button>`).join('');
    renderMemories();
    $('#photo-grid').innerHTML=state.media.map((m,i)=>`<button class="photo-card" style="--rotation:${[-2,1.3,-1,2][i%4]}deg" data-media="${esc(m.id)}"><figure>${m.type==='image'?`<img src="${esc(m.url)}" alt="${esc(m.caption)}" loading="lazy" width="300" height="350">`:`<div class="media-placeholder">${m.type==='video'?'▷':'♫'}</div>`}<figcaption>${esc(m.caption)}<small>${m.demo?'示例插画':m.type==='image'?'OUR MOMENT':m.type==='video'?'VIDEO':'VOICE'}</small></figcaption></figure></button>`).join('')||'<p class="quiet">把第一张合照，留在这里。</p>';
    renderWishes();
    $$('.local-only').forEach(el=>el.hidden=!isLocal);
    $('#offline-badge').hidden=isLocal||location.protocol!=='file:';
    if(!isLocal){$('#model-status').textContent=location.protocol==='file:'?'离线收藏 · 可以查找已保存的故事':'只读浏览 · 本地助手在原电脑运行';}
  }
  function updateDates() {
    const p=state.profile, today=dateToday();
    if(p.startDate){
      const days=dayDiff(p.startDate,today);
      $('#days-together').textContent=Math.abs(days).toLocaleString();
      $('#days-label').textContent=days>=0?'天，在一起':'天后，故事开始';
      $('#since-date').textContent=`SINCE ${p.startDate.replaceAll('-',' . ')} · 北京时间`;
    }else{$('#days-together').textContent='—';$('#days-label').textContent='等你写下第一天';$('#since-date').textContent='设置相恋日期，开启我们的计时';}
    const events=[...(p.anniversaries||[])];
    if(p.startDate)events.push({title:'相恋纪念日',date:p.startDate,recurring:true});
    const next=events.map(a=>{
      let nextDate=a.date;
      if(a.recurring){
        let year=Number(today.slice(0,4));
        const inYear=y=>{
          const md=a.date.slice(5)==='02-29' && new Date(`${y}-03-01T00:00:00Z`).getUTCDate()===1 && new Date(Date.UTC(y,1,29)).getUTCMonth()!==1?'02-28':a.date.slice(5);
          return `${y}-${md}`;
        };
        nextDate=inYear(year);if(nextDate<today)nextDate=inYear(++year);
      }
      return {...a,nextDate,gap:dayDiff(today,nextDate)};
    }).filter(a=>a.gap>=0).sort((a,b)=>a.gap-b.gap)[0];
    $('#next-anniversary').textContent=next?.title||'下一次值得期待的日子';
    $('#anniversary-gap').textContent=next?(next.gap===0?'就是今天，纪念日快乐 ♡':`${next.nextDate} · 还有 ${next.gap} 天`):'把重要的日期，放在心上';
  }
  function renderMemories(){
    const memories=state.memories.filter(m=>!activeTag||(m.tags||[]).includes(activeTag));
    $('#memory-count').textContent=`${memories.length} 篇时光手记`;
    $('#memory-empty').hidden=memories.length>0;
    $('#memory-list').innerHTML=memories.map(m=>{
      const image=(m.media_ids||[]).map(mediaById).find(p=>p?.type==='image');
      return `<button class="memory-row" data-memory="${esc(m.id)}"><span class="memory-date">${m.date.slice(5).replace('-','.')}<small>${m.date.slice(0,4)} / ${m.demo?'DEMO':'OUR DAYS'}</small></span><span><span class="memory-title">${esc(m.title)}</span><span class="memory-excerpt">${esc(m.body)}</span><span class="memory-tags">${(m.tags||[]).map(t=>`<span># ${esc(t)}</span>`).join('')}</span></span>${image?`<img src="${esc(image.url)}" alt="${esc(image.caption)}" loading="lazy">`:'<span class="memory-arrow">↗</span>'}</button>`;
    }).join('');
  }
  function renderWishes(){
    const wishes=state.profile.wishes||[];
    $('#wish-count').textContent=`${wishes.filter(w=>w.done).length} / ${wishes.length}`;
    $('#wish-list').innerHTML=wishes.map(w=>`<label class="wish-item ${w.done?'done':''}"><input type="checkbox" data-wish="${esc(w.id)}" ${w.done?'checked':''}><span>${esc(w.text)}</span></label>`).join('');
  }
  function openStory(id){
    const memory=state.memories.find(m=>m.id===id);if(!memory)return;
    $('#story-content').innerHTML=`<p class="eyebrow">${esc(memory.date)} / ${memory.demo?'示例故事':'OUR STORY'}</p><h2>${esc(memory.title)}</h2><div class="prose">${esc(memory.body)}</div><div class="story-media">${(memory.media_ids||[]).map(id=>mediaMarkup(mediaById(id))).join('')}</div><p class="quiet">${(memory.tags||[]).map(t=>'# '+esc(t)).join(' · ')}</p>`;
    if(!$('#story-dialog').open)$('#story-dialog').showModal();
  }
  function studioTab(tab){$$('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));$$('[data-pane]').forEach(el=>el.hidden=el.dataset.pane!==tab);$('#studio-feedback').textContent='';}
  async function openStudio(tab='profile'){
    if(!isLocal)return;
    try{await refresh();fillProfile();fillManage();studioTab(tab);if(!$('#studio-dialog').open)$('#studio-dialog').showModal();}catch(e){toast(e.message);}
  }
  function fillProfile(){
    const p=fullState.profile,f=$('#profile-form');
    for(const [name,value] of Object.entries({name1:p.names[0],name2:p.names[1],siteName:p.siteName,startDate:p.startDate,motto:p.motto,letter:p.letter,anniversaries:(p.anniversaries||[]).map(a=>`${a.title} | ${a.date} | ${a.recurring?'每年':'一次'}`).join('\n')}))f.elements[name].value=value;
    $('#model-name').value=p.model;
  }
  function fillManage(){
    $('#manage-memories').innerHTML=fullState.memories.map(m=>`<div class="manage-row"><div>${esc(m.title)}<small>${m.date} · ${m.demo?'示例 · ':''}${m.visibility==='private'?'仅自己':m.status==='draft'?'草稿':'两个人共享'}</small></div><button data-edit="${esc(m.id)}">编辑这篇</button></div>`).join('')||'<p class="quiet">还没有手记。</p>';
  }
  function resetMemory(){const f=$('#memory-form');f.reset();f.elements.id.value='';f.elements.revision.value='';f.elements.date.value=dateToday();selectedIds=[];pendingFiles=[];renderSelected();}
  function renderSelected(){
    $('#selected-media').innerHTML=[...selectedIds.map(id=>({id,name:fullState?.media.find(m=>m.id===id)?.caption||id})),...pendingFiles.map((f,i)=>({id:`pending-${i}`,name:f.name}))].map(m=>`<div class="selected-item"><span>${esc(m.name)}</span><button type="button" data-remove-media="${esc(m.id)}">移除</button></div>`).join('');
  }
  async function runForm(button, action){button.disabled=true;$('#studio-feedback').textContent='正在认真保存……';try{await action();$('#studio-feedback').textContent='已经保存在这台电脑。';toast('已经收藏好了 ♡');}catch(e){$('#studio-feedback').textContent=e.message;toast(e.message);}finally{button.disabled=false;}}
  $('#profile-form').addEventListener('submit',e=>{e.preventDefault();runForm(e.submitter,async()=>{
    const f=e.target.elements;
    const anniversaries=f.anniversaries.value.split('\n').filter(x=>x.trim()).map(line=>{const parts=line.split('|').map(s=>s.trim());if(parts.length!==3||!['每年','一次'].includes(parts[2]))throw new Error('纪念日请按“名称 | YYYY-MM-DD | 每年 或 一次”填写');return {title:parts[0],date:parts[1],recurring:parts[2]==='每年'};});
    await api('/api/profile',{...fullState.profile,names:[f.name1.value,f.name2.value],siteName:f.siteName.value,startDate:f.startDate.value,motto:f.motto.value,letter:f.letter.value,anniversaries});await refresh();fillProfile();
  });});
  $('#memory-form').addEventListener('submit',e=>{e.preventDefault();runForm(e.submitter,async()=>{
    const f=e.target.elements;
    const flags={visibility:f.visibility.value,publish_online:f.publish_online.checked,include_in_archive:f.include_in_archive.checked};
    while(pendingFiles.length){
      const file=pendingFiles[0];
      const response=await fetch('/api/media',{method:'POST',headers:{'content-type':file.type||'application/octet-stream','x-file-name':encodeURIComponent(file.name),'x-media-permissions':JSON.stringify(flags),'x-universe-token':token},body:file});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'素材上传没有完成');selectedIds.push(result.id);pendingFiles.shift();renderSelected();
    }
    await api('/api/memory',{id:f.id.value||undefined,revision:Number(f.revision.value)||undefined,title:f.title.value,date:f.date.value,body:f.body.value,tags:f.tags.value.split(/[,，]/).map(t=>t.trim()).filter(Boolean),...flags,ai_readable:f.ai_readable.checked,status:f.status.value,media_ids:selectedIds});
    await refresh();resetMemory();fillManage();
  });});
  $('#media-upload').addEventListener('change',e=>{const files=Array.from(e.target.files);if(files.some(f=>f.size>128*1024*1024)){toast('请先把超过 128 MB 的视频压缩后再添加');return;}pendingFiles.push(...files);renderSelected();});
  $('#reset-memory').addEventListener('click',resetMemory);
  $('#open-studio').addEventListener('click',()=>openStudio());
  $('#open-letter').addEventListener('click',()=>$('#letter-dialog').showModal());
  $('#save-model').addEventListener('click',e=>runForm(e.target,async()=>{await api('/api/profile',{...fullState.profile,model:$('#model-name').value.trim()});await refresh();fillProfile();await modelStatus();}));
  $('#clear-demo').addEventListener('click',e=>runForm(e.target,async()=>{await api('/api/clear-examples',{});await refresh();fillManage();fillProfile();}));
  $('#backup').addEventListener('click',e=>runForm(e.target,async()=>{const result=await api('/api/backup',{});$('#studio-feedback').textContent=`备份已保存：${result.name}`;toast(`备份已保存：${result.name}`);}));
  $('#export-offline').addEventListener('click',async e=>{e.target.disabled=true;toast('正在打包这份回忆……');try{const result=await api('/api/export',{});const a=document.createElement('a');a.href=result.url;a.download=result.name;document.body.append(a);a.click();a.remove();toast('离线包已做好；解压后双击 index.html');}catch(error){toast(error.message);}finally{e.target.disabled=false;}});
  $('#wish-form').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/wishes',{revision:fullState.profile.revision,text:$('#new-wish').value});await refresh();$('#new-wish').value='';}catch(error){toast(error.message);}});
  document.addEventListener('change',async e=>{if(!e.target.matches('[data-wish]'))return;const id=e.target.dataset.wish,wish=state.profile.wishes.find(w=>w.id===id);if(!wish)return;const previous=wish.done;wish.done=e.target.checked;renderWishes();if(isLocal){try{await api('/api/wishes',{revision:fullState.profile.revision,id,done:wish.done});await refresh();}catch(error){wish.done=previous;renderWishes();toast(error.message);}}else{toast('已在本次浏览中打勾；关闭页面后不会写回档案。');}});
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a');if(!el)return;
    if(el.hasAttribute('data-close')){const dialog=el.closest('dialog');dialog.querySelectorAll('video,audio').forEach(m=>m.pause());dialog.close();}
    if(el.hasAttribute('data-tag')){activeTag=el.dataset.tag;render();}
    if(el.dataset.memory)openStory(el.dataset.memory);
    if(el.dataset.media){const media=mediaById(el.dataset.media);$('#story-content').innerHTML=`<h2>${esc(media.caption)}</h2><div class="story-media">${mediaMarkup(media)}</div>`;$('#story-dialog').showModal();}
    if(el.dataset.studioTab)openStudio(el.dataset.studioTab);
    if(el.dataset.tab)studioTab(el.dataset.tab);
    if(el.dataset.edit){const m=fullState.memories.find(m=>m.id===el.dataset.edit);if(!m)return;const f=$('#memory-form').elements;for(const key of ['id','revision','title','date','body','visibility','status'])f[key].value=m[key];f.tags.value=(m.tags||[]).join('，');for(const key of ['publish_online','include_in_archive','ai_readable'])f[key].checked=m[key]===true;selectedIds=[...(m.media_ids||[])];pendingFiles=[];renderSelected();studioTab('memory');}
    if(el.dataset.removeMedia){const id=el.dataset.removeMedia;if(id.startsWith('pending-'))pendingFiles.splice(Number(id.slice(8)),1);else selectedIds=selectedIds.filter(i=>i!==id);renderSelected();}
    if(el.dataset.question){$('#question').value=el.dataset.question;$('#ask-form').requestSubmit();}
  });
  function startGame(){
    clearTimeout(gameTimer);flipped=[];moves=0;busy=false;
    const images=state.media.filter(m=>m.type==='image').slice(0,8);
    if(images.length<2){toast('先添加至少两张照片，再来玩一局吧。');return false;}
    game=[...images,...images].map(m=>({...m,matched:false})).sort(()=>Math.random()-.5);
    $('#game-board').innerHTML=game.map((m,i)=>`<button data-card="${i}" aria-label="翻开第 ${i+1} 张卡片">♡</button>`).join('');
    $('#game-status').textContent=`${images.length} 对回忆 · 已翻 0 次`;return true;
  }
  $('#open-game').addEventListener('click',()=>{if(startGame())$('#game-dialog').showModal();});
  $('#reset-game').addEventListener('click',startGame);
  $('#game-board').addEventListener('click',e=>{const button=e.target.closest('[data-card]');if(!button||busy)return;const i=Number(button.dataset.card);if(game[i].matched||flipped.includes(i))return;button.innerHTML=`<img src="${esc(game[i].url)}" alt="${esc(game[i].caption)}">`;flipped.push(i);if(flipped.length===2){moves++;const[a,b]=flipped;if(game[a].id===game[b].id){game[a].matched=game[b].matched=true;flipped=[];$('#game-board').children[a].classList.add('matched');$('#game-board').children[b].classList.add('matched');}else{busy=true;gameTimer=setTimeout(()=>{for(const n of [a,b])$('#game-board').children[n].textContent='♡';flipped=[];busy=false;},850);}$('#game-status').textContent=game.every(m=>m.matched)?`所有瞬间，都找到了彼此 ♡ 共 ${moves} 次`:`${game.length/2} 对回忆 · 已翻 ${moves} 次`;}});
  async function modelStatus(){try{const status=await api('/api/ai/status',undefined,'GET');$('#model-status').textContent=status.ready?`● 本地 ${status.model} · 私人回忆助手`:'○ 本地模型尚未就绪 · 可以先查找回忆';$('#ai-detail').textContent=status.detail;}catch{$('#model-status').textContent='本地模型暂未连接 · 可以先查找回忆';}}
  $('#ask-form').addEventListener('submit',async e=>{e.preventDefault();const question=$('#question').value.trim();if(!question)return;const target=$('#answer'),button=e.submitter||$('#ask-form button');target.hidden=false;target.textContent='正在翻找你们的回忆……';button.disabled=true;try{
    if(isLocal){const result=await api('/api/ask',{question});target.textContent=result.answer;for(const source of result.sources||[]){const link=document.createElement('a');link.href='#memories';link.textContent=`↗ ${source.date} · ${source.title}`;link.addEventListener('click',event=>{event.preventDefault();openStory(source.id);});target.append(link);}if(result.draftSaved){const note=document.createElement('p');note.textContent='草稿已保存到本机 drafts 文件夹。';target.append(note);}}
    else{const terms=Array.from(new Set(question.match(/[\u4e00-\u9fff]{2}|[a-z0-9]+/gi)||[]));const found=state.memories.filter(m=>terms.some(t=>(m.title+m.body+(m.tags||[]).join()).includes(t))).slice(0,3);target.textContent=found.length?found.map(m=>`${m.date} · ${m.title}\n${m.body}`).join('\n\n'):'这份离线档案里没有找到相关记录。可以翻阅上方的手记，或回到原电脑使用本地 AI。';}
  }catch(error){target.textContent=error.message;}finally{button.disabled=false;}});
  for(const dialog of $$('dialog'))dialog.addEventListener('close',()=>dialog.querySelectorAll('video,audio').forEach(m=>m.pause()));
  render();resetMemory();setInterval(updateDates,60000);
  if(location.protocol!=='file:')fetch('/api/session').then(r=>{if(!r.ok)throw Error();return r.json();}).then(async session=>{token=session.token;isLocal=true;await refresh();await modelStatus();}).catch(()=>{isLocal=false;render();});
})();
