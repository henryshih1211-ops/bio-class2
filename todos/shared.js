'use strict';
// Connection secrets stay in this browser, never in public source or backup files.
class SharedStore {
  constructor({validate,onChange,onStatus,onNotice}) {
    Object.assign(this,{validate,onChange,onStatus,onNotice});
    this.active=false;this.busy=false;this.config=null;this.state={tasks:[],pending:[]};
    this.configKey='henry-todos-shared-connection';
    window.addEventListener('storage',e=>{if(this.active&&e.key===this.cacheKey){try{this.state=this.read();this.onChange(this.state.tasks);this.sync();}catch{this.onStatus('缓存无法读取 · 请先备份');}}});
    window.addEventListener('online',()=>this.sync());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.sync();});
    setInterval(()=>{if(!document.hidden)this.sync();},15000);
  }
  normalize(config) {
    const u=new URL(config.api);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw new Error('共享服务地址需要使用 HTTPS');
    if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('请填写共享服务的主地址，不含路径或参数');
    if(!/^[a-f0-9]{64}$/.test(config.room))throw new Error('共享空间码应为部署时生成的 64 位代码');
    return {api:u.origin,room:config.room};
  }
  read() {
    const raw=localStorage.getItem(this.cacheKey);if(!raw)return {tasks:[],pending:[]};
    const s=JSON.parse(raw);if(!Array.isArray(s.tasks)||!s.tasks.every(this.validate)||!Array.isArray(s.pending)||s.pending.length>10000||!s.pending.every(op=>typeof op.opId==='string'&&typeof op.id==='string'&&['create','patch','delete'].includes(op.kind)))throw new Error('共享缓存无法读取，已保留原记录。');return s;
  }
  persist(state) {localStorage.setItem(this.cacheKey,JSON.stringify(state));this.state=state;this.onChange(state.tasks);}
  overlay(tasks,ops) {
    const map=new Map(tasks.map(t=>[t.id,{...t}]));
    for(const op of ops){if(op.kind==='delete')map.delete(op.id);else if(op.kind==='create')map.set(op.id,{...op.data});else if(map.has(op.id))map.set(op.id,{...map.get(op.id),...op.data});}
    return [...map.values()];
  }
  async request(config,method='GET',body) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetch(`${config.api}/api/tasks`,{method,headers:{Authorization:`Bearer ${config.room}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw new Error(response.status===401?'共享空间码不正确':response.status===413?'待办过多，请分批导入或清理后重试':response.status===429?'服务当前额度不足，请稍后重试':`共享服务暂不可用（${response.status}）`);
      const result=await response.json();if(!Array.isArray(result.tasks)||!result.tasks.every(this.validate)||new Set(result.tasks.map(t=>t.id)).size!==result.tasks.length)throw new Error('共享服务返回的数据无法读取');return result;
    }catch(error){if(error.name==='AbortError')throw new Error('连接超时，请检查手机网络或共享地址');if(error instanceof TypeError)throw new Error('无法连接共享服务，请检查地址及当前网络');throw error;}finally{clearTimeout(timer);}
  }
  async connect(config,{resume=false}={}) {
    if(this.busy)throw new Error('正在同步，请稍后再连接');
    if(this.active&&this.read().pending.length)throw new Error('还有修改尚未同步，请先联网同步后再切换空间');
    const normalized=this.normalize(config),cacheKey=`henry-todos-shared-v2:${normalized.api}:${normalized.room}`;
    const previous={config:this.config,cacheKey:this.cacheKey,active:this.active,state:this.state};
    this.config=normalized;this.cacheKey=cacheKey;
    try{
      const cached=this.read();
      if(resume){this.active=true;this.state=cached;this.onChange(cached.tasks);this.onStatus('正在连接共享空间…');}
      const remote=await this.request(normalized);
      // Re-read in case another tab edited this space while the request was in flight.
      const current=this.read();this.persist({tasks:this.overlay(remote.tasks,current.pending),pending:current.pending});
      localStorage.setItem(this.configKey,JSON.stringify(normalized));this.active=true;this.onStatus(current.pending.length?'修改待同步':'两人共享 · 已同步');this.sync();
    }catch(error){if(resume){this.active=true;this.onStatus('共享离线 · 联网后重试');this.onNotice(error.message);}else{Object.assign(this,previous);}throw error;}
  }
  async start() {
    const params=new URLSearchParams(location.hash.split('?')[1]||'');
    const invite=params.has('api')||params.has('room');
    // Remove capability tokens from the visible address after reading an invitation.
    if(invite)history.replaceState(null,'',location.pathname+location.search+'#'+location.hash.slice(1).split('?')[0]);
    try{const saved=localStorage.getItem(this.configKey);const config=invite?{api:params.get('api'),room:params.get('room')}:saved?JSON.parse(saved):null;if(config)await this.connect(config,{resume:!invite});else this.onStatus('本机记录 · 共享未连接');}
    catch(error){this.onNotice(error.message);}
  }
  save(before,next) {
    try{
      if(next.length>10000)throw new Error('待办数量已达上限，请先清理或导出');
      if(!next.every(this.validate))throw new Error('待办格式无法保存');
      const current=this.read(),oldMap=new Map(before.map(t=>[t.id,t])),newMap=new Map(next.map(t=>[t.id,t])),ops=[];
      for(const t of next){const old=oldMap.get(t.id);if(!old)ops.push({kind:'create',id:t.id,data:t});else{const data=Object.fromEntries(Object.entries(t).filter(([key,value])=>key!=='id'&&value!==old[key]));if(Object.keys(data).length)ops.push({kind:'patch',id:t.id,data});}}
      for(const t of before)if(!newMap.has(t.id))ops.push({kind:'delete',id:t.id});
      ops.forEach(op=>op.opId=crypto.randomUUID?crypto.randomUUID():[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join(''));
      if(current.pending.length+ops.length>10000)throw new Error('离线修改太多，请先同步');
      this.persist({tasks:this.overlay(current.tasks,ops),pending:[...current.pending,...ops]});
      this.onStatus('已保存到本机 · 等待同步');this.sync();return true;
    }catch(error){this.onNotice(error.message||'本机存储已满，输入已保留，请先导出备份');return false;}
  }
  async sync() {
    if(!this.active||this.busy)return;this.busy=true;
    try{
      do{
        const initial=this.read(),batch=initial.pending.slice(0,25);this.onStatus(batch.length?'正在同步修改…':'正在检查共享记录…');
        const result=await this.request(this.config,batch.length?'PATCH':'GET',batch.length?{ops:batch}:undefined);
        const current=this.read(),sent=new Set(batch.map(op=>op.opId)),remaining=current.pending.filter(op=>!sent.has(op.opId));
        this.persist({tasks:this.overlay(result.tasks,remaining),pending:remaining});
        if(result.ignored?.length)this.onNotice('有事项已在另一台设备上删除，相关修改未保存；可以重新添加。');
      }while(this.state.pending.length);
      this.onStatus('两人共享 · 已同步');
    }catch(error){this.onStatus(this.state.pending.length?'共享离线 · 修改已保存在本机':'共享离线 · 显示上次记录');}
    finally{this.busy=false;}
  }
  disconnect() {
    if(this.busy){this.onNotice('正在同步，请稍后再切换');return false;}
    try{if(this.read().pending.length){this.onNotice('还有修改尚未同步，请先联网同步后再切换');return false;}localStorage.removeItem(this.configKey);this.active=false;this.config=null;this.onStatus('本机记录 · 共享未连接');return true;}
    catch{this.onNotice('缓存无法读取，请先备份并检查浏览器存储');return false;}
  }
}
