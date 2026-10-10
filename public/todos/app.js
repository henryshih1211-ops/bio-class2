'use strict';
const KEY = 'henry-todos-v1';
const $ = (selector) => document.querySelector(selector);
const icons = {
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  list: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9 8h7m-7 4h7m-7 4h7M7 8h.01M7 12h.01M7 16h.01"/>',
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.34l-5.62 2.96 1.07-6.27L2.9 9.6l6.3-.9L12 3Z"/>',
  completed: '<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
  leaf: '<path d="M20 3c-2 3-7 1-12 4s-4 9-1 11 10 2 12-5 1-10 1-10Z"/><path d="M4 21 15 10m-5 5h5m-5 0v-4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
  note: '<path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5M8 12h8m-8 4h5"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.list}</svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = ['全部','学习','班务','生活','其他'];
const categoryClass = (value) => ({学习:'study',班务:'class',生活:'life',其他:'other'}[value] || 'other');
const views = [
  {id:'all',label:'全部待办',mobile:'全部',icon:'list',description:'把要做的事记下来，一件一件完成。'},
  {id:'today',label:'今天',mobile:'今天',icon:'sun',description:'专注眼前，也记得照顾还没完成的事。'},
  {id:'upcoming',label:'未来七天',mobile:'近期',icon:'calendar',description:'提前安排，让接下来的日子更从容。'},
  {id:'important',label:'重要事项',mobile:'重要',icon:'star',description:'把值得优先投入的事，放在这里。'},
  {id:'completed',label:'已完成',mobile:'完成',icon:'completed',description:'每一个勾选，都是你向前走过的一步。'}
];
let tasks = [], view = views.some(v=>v.id===location.hash.slice(1)) ? location.hash.slice(1) : 'all';
let category = '全部', query = '', sort = 'created', editingId = null, writable = true, undoAction = null, toastTimer;
function dateKey(date = new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function futureKey(days) {const d=new Date();d.setDate(d.getDate()+days);return dateKey(d);}
function validDate(value) {if(value==='')return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(`${value}T12:00:00`);return Number.isFinite(d.getTime())&&dateKey(d)===value;}
function isTask(t) {return t && typeof t.id==='string' && t.id.length>0 && t.id.length<200 && typeof t.title==='string' && !!t.title.trim() && t.title.length<=200 && categories.slice(1).includes(t.category) && typeof t.due==='string' && validDate(t.due) && typeof t.notes==='string' && t.notes.length<=5000 && typeof t.important==='boolean' && typeof t.done==='boolean' && Number.isFinite(t.createdAt) && (t.completedAt===null||Number.isFinite(t.completedAt));}
function parseData(raw) {const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.tasks)||d.tasks.length>10000||!d.tasks.every(isTask)||new Set(d.tasks.map(t=>t.id)).size!==d.tasks.length)throw new Error('Invalid backup');return d.tasks;}
function showError(message) {$('#storage-error').textContent=message;$('#storage-error').hidden=false;}
function load() {try {const raw=localStorage.getItem(KEY);tasks=raw?parseData(raw):[];}catch {writable=false;showError('本地记录无法读取，暂未覆盖原内容。请先导出原始备份，检查浏览器存储设置后重新打开。');}render();}
function save(next) {if(!writable){notify('暂时无法保存，请先检查本地记录');return false;}try{localStorage.setItem(KEY,JSON.stringify({version:1,tasks:next}));tasks=next;$('#storage-error').hidden=true;render();return true;}catch{showError('保存失败，浏览器存储可能已满或被禁用。输入已保留，请重试或导出备份。');return false;}}
function notify(message,undo=null) {clearTimeout(toastTimer);$('#toast-message').textContent=message;$('#toast').hidden=false;$('#undo-button').hidden=!undo;undoAction=undo;toastTimer=setTimeout(()=>{$('#toast').hidden=true;undoAction=null;},undo?9000:4000);}
function matchesView(t,id=view) {const today=dateKey();if(id==='completed')return t.done;if(id==='today')return (t.due&&t.due<=today)|| (t.done&&t.completedAt&&dateKey(new Date(t.completedAt))===today);if(id==='upcoming')return t.due>today&&t.due<=futureKey(7);if(id==='important')return t.important;return true;}
function renderNav() {$('#desktop-nav').innerHTML=views.map(v=>`<button class="nav-item ${view===v.id?'active':''}" data-view="${v.id}" ${view===v.id?'aria-current="page"':''}>${icon(v.icon)}<span>${v.label}</span><span class="count">${tasks.filter(t=>matchesView(t,v.id)&&(v.id==='completed'?t.done:!t.done)).length}</span></button>`).join('');$('#mobile-nav').innerHTML=views.map(v=>`<button class="mobile-nav-item ${view===v.id?'active':''}" data-view="${v.id}" ${view===v.id?'aria-current="page"':''}>${icon(v.icon)}<span>${v.mobile}</span></button>`).join('');}
function dateLabel(t) {if(!t.due)return '';const today=dateKey();const cls=!t.done&&t.due<today?'overdue':t.due===today?'today':'';const d=new Date(`${t.due}T12:00:00`);const text=t.due===today?'今天':t.due===futureKey(1)?'明天':`${d.getMonth()+1}月${d.getDate()}日`;return `<span class="${cls}">${icon('calendar')}${text}${cls==='overdue'?' · 已逾期':''}</span>`;}
function taskHTML(t) {return `<article class="task-row ${categoryClass(t.category)} ${t.done?'done':''}"><span class="task-stripe"></span><button class="task-content" data-edit="${escapeHTML(t.id)}" aria-label="编辑：${escapeHTML(t.title)}"><span class="task-title">${escapeHTML(t.title)}</span><span class="task-meta"><span class="task-tag">${t.category}</span>${dateLabel(t)}${t.notes?`<span>${icon('note')}有备注</span>`:''}${t.done?'<span>已完成</span>':''}</span></button><button class="task-star ${t.important?'important':''}" data-star="${escapeHTML(t.id)}" aria-label="${t.important?'取消重要标记':'标为重要'}：${escapeHTML(t.title)}" aria-pressed="${t.important}">${icon('star')}</button><label class="complete-control"><input type="checkbox" data-complete="${escapeHTML(t.id)}" ${t.done?'checked':''} aria-label="${t.done?'恢复为未完成':'标记完成'}：${escapeHTML(t.title)}">${icon('check')}</label></article>`;}
function render() {
  renderNav();const v=views.find(v=>v.id===view);$('#view-title').textContent=v.label;$('#view-description').textContent=v.description;$('#today-date').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
  $('#categories').innerHTML=categories.map(c=>`<button class="category-chip ${category===c?'active':''}" data-category="${c}" aria-pressed="${category===c}">${c==='全部'?'':`<span class="category-dot ${categoryClass(c)}"></span>`}${c}</button>`).join('');
  const doneToday=tasks.filter(t=>t.done&&t.completedAt&&dateKey(new Date(t.completedAt))===dateKey()).length;const pendingToday=tasks.filter(t=>!t.done&&t.due&&t.due<=dateKey()).length;
  $('#progress-number').textContent=doneToday;$('#progress-title').textContent=doneToday?'你的努力，都有记录':'今天，也在向前';$('#progress-text').textContent=pendingToday?`还有 ${pendingToday} 件今天或此前的事项等待完成。`:doneToday?'今天暂无到期事项，给自己一点休息。':'从一件小事开始，慢慢来，也很好。';$('#progress-fill').style.width=`${doneToday+pendingToday ? doneToday/(doneToday+pendingToday)*100 : 0}%`;
  const showDone=$('#show-completed').checked;$('#show-completed-label').hidden=view==='completed';$('#quick-form').hidden=view==='completed';$('#quick-title').placeholder=view==='upcoming'?'添加近期事项（默认明天），按 Enter 保存…':'添加一件要做的事，按 Enter 保存…';
  let filtered=tasks.filter(t=>matchesView(t)&&(category==='全部'||t.category===category)&&(!query||`${t.title} ${t.notes}`.toLocaleLowerCase().includes(query))&&(view==='completed'||showDone||!t.done));
  filtered.sort((a,b)=>{if(a.done!==b.done)return Number(a.done)-Number(b.done);if(view==='completed')return (b.completedAt||0)-(a.completedAt||0);if(sort==='priority'&&a.important!==b.important)return Number(b.important)-Number(a.important);if(sort==='due'&&a.due!==b.due)return (a.due||'9999').localeCompare(b.due||'9999');return b.createdAt-a.createdAt;});
  const pending=filtered.filter(t=>!t.done),done=filtered.filter(t=>t.done);$('#list-count').textContent=view==='completed'?`${done.length} 项已完成`:`${pending.length} 项待办${done.length?` · ${done.length} 项已完成`:''}`;
  if(!filtered.length){const searching=query||category!=='全部';const text=searching?'没有找到匹配的事项':view==='completed'?'完成的事，会留在这里':view==='today'?'今天的清单很清爽':view==='upcoming'?'未来七天，留一点空间':view==='important'?'把重要的事，放在心上':'从一件小事开始';const detail=searching?'试试其他关键词或分类。':view==='completed'?'完成待办后，回来看一看自己的进展。':view==='important'?'点事项旁的星星，就可以在这里找到它。':'记下作业、班务，或生活里想完成的事。';$('#task-list').innerHTML=`<div class="empty-state"><div class="empty-icon">${icon(view==='completed'?'completed':'leaf')}</div><h3>${text}</h3><p>${detail}</p>${view==='completed'||searching?'':'<button class="primary-button new-button">'+icon('plus')+'添加待办</button>'}</div>`;}else{$('#task-list').innerHTML=pending.map(taskHTML).join('')+(done.length&&view!=='completed'?`<div class="group-heading">已完成 · ${done.length}</div>`:'')+done.map(taskHTML).join('');}
}
function changeView(id){if(!views.some(v=>v.id===id))return;view=id;category='全部';render();if(location.hash!==`#${id}`)history.replaceState(null,'',`#${id}`);}
function openEditor(id=null){editingId=id;const t=tasks.find(t=>t.id===id);$('#editor-heading').textContent=t?'编辑待办':'新建待办';$('#task-title').setCustomValidity('');$('#task-title').value=t?.title||'';$('#task-category').value=t?.category||(category==='全部'?'学习':category);$('#task-due').value=t?t.due:(view==='today'?dateKey():view==='upcoming'?futureKey(1):'');$('#task-notes').value=t?.notes||'';$('#task-important').checked=t?t.important:view==='important';$('#delete-task').hidden=!t;$('#editor').showModal();$('#task-title').focus();}
document.addEventListener('click',(e)=>{const nav=e.target.closest('[data-view]'),chip=e.target.closest('[data-category]'),edit=e.target.closest('[data-edit]'),star=e.target.closest('[data-star]');if(nav)changeView(nav.dataset.view);else if(chip){category=chip.dataset.category;render();}else if(edit)openEditor(edit.dataset.edit);else if(star){const id=star.dataset.star;save(tasks.map(t=>t.id===id?{...t,important:!t.important}:t));}else if(e.target.closest('.new-button'))openEditor();else if(e.target.closest('.close-dialog'))e.target.closest('dialog').close();});
document.addEventListener('change',(e)=>{if(e.target.matches('[data-complete]')){const id=e.target.dataset.complete,t=tasks.find(t=>t.id===id);if(!t)return;const done=e.target.checked;if(save(tasks.map(item=>item.id===id?{...item,done,completedAt:done?Date.now():null}:item)))notify(done?'已完成，又向前一步':'已恢复为未完成',()=>{if(save(tasks.map(item=>item.id===id?{...item,done:t.done,completedAt:t.completedAt}:item)))notify('已撤销');});else e.target.checked=t.done;}});
$('#editor-form').addEventListener('submit',(e)=>{e.preventDefault();const title=$('#task-title').value.trim();if(!title){$('#task-title').setCustomValidity('请填写待办事项');$('#task-title').reportValidity();return;}const data={title,category:$('#task-category').value,due:$('#task-due').value,notes:$('#task-notes').value.trim(),important:$('#task-important').checked};if(!validDate(data.due)){notify('请选择有效日期');return;}const old=tasks.find(t=>t.id===editingId);const next=old?tasks.map(t=>t.id===editingId?{...t,...data}:t):[...tasks,{...data,id:crypto.randomUUID(),done:false,createdAt:Date.now(),completedAt:null}];if(save(next)){$('#editor').close();notify(old?'修改已保存':'待办已添加');}});
$('#task-title').addEventListener('input',()=>$('#task-title').setCustomValidity(''));
$('#quick-form').addEventListener('submit',(e)=>{e.preventDefault();const input=$('#quick-title'),title=input.value.trim();if(!title)return;const t={id:crypto.randomUUID(),title,category:category==='全部'?'学习':category,due:view==='today'?dateKey():view==='upcoming'?futureKey(1):'',notes:'',important:view==='important',done:false,createdAt:Date.now(),completedAt:null};if(save([...tasks,t])){input.value='';notify(view==='upcoming'?'已添加，截止日期设为明天':'待办已添加');}});
$('#delete-task').addEventListener('click',()=>{const removed=tasks.find(t=>t.id===editingId);if(!removed)return;if(save(tasks.filter(t=>t.id!==editingId))){$('#editor').close();notify('事项已删除',()=>{if(!tasks.some(t=>t.id===removed.id)&&save([...tasks,removed]))notify('已恢复事项');});}});
$('#search').addEventListener('input',(e)=>{query=e.target.value.trim().toLocaleLowerCase();render();});$('#sort').addEventListener('change',(e)=>{sort=e.target.value;render();});$('#show-completed').addEventListener('change',render);
$('#data-button').addEventListener('click',()=>$('#data-dialog').showModal());
$('#export-data').addEventListener('click',()=>{try{const raw=writable?JSON.stringify({version:1,tasks},null,2):localStorage.getItem(KEY)||'';const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`我的待办-${dateKey()}${writable?'':'-原始记录'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('备份已导出');}catch{notify('无法导出，请检查浏览器的存储设置');}});
$('#import-data').addEventListener('change',async(e)=>{const file=e.target.files[0];if(!file)return;try{if(file.size>15*1024*1024)throw new Error();const incoming=parseData(await file.text());const ids=new Set(tasks.map(t=>t.id));const additions=incoming.filter(t=>!ids.has(t.id));if(tasks.length+additions.length>10000)throw new Error();if(save([...tasks,...additions]))notify(`已导入 ${additions.length} 件新事项`);}catch{notify('备份格式不正确，请选择从本网站导出的 JSON 文件');}finally{e.target.value='';}});
$('#undo-button').addEventListener('click',()=>{const fn=undoAction;undoAction=null;if(fn)fn();});
window.addEventListener('hashchange',()=>changeView(location.hash.slice(1)));
window.addEventListener('storage',(e)=>{if(e.key===KEY){try{tasks=e.newValue?parseData(e.newValue):[];writable=true;$('#storage-error').hidden=true;render();notify('清单已同步当前浏览器中的修改');}catch{writable=false;showError('另一个窗口保存的记录无法读取，请先导出原始备份。');}}});
document.addEventListener('keydown',(e)=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.querySelector('dialog[open]'))return;if(e.key==='/'){e.preventDefault();$('#search').focus();}if(e.key.toLowerCase()==='n')openEditor();});
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
load();setInterval(render,60000);
