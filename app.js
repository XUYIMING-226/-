const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const state = { view: 'dashboard', seconds: 0, timer: null, uploaded: false, uploadedObjectKey: null, uploadedFileName: null };

const demoGroups = [
  {id:1,title:'2024 年全国文化产业营业收入',source:'2025 国考 · 地市级',desc:'根据全国规模以上文化及相关产业企业营业收入与同比增速，回答 116—119 题。',tags:['增长率计算','基期量'],wrong:2,time:'08:42',score:'2 / 4'},
  {id:2,title:'某省新能源汽车产销情况',source:'2024 浙江省考 · A卷',desc:'包含新能源汽车产量、销量、出口量及市场占有率等统计数据。',tags:['比重变化','平均数'],wrong:1,time:'07:18',score:'3 / 4'},
  {id:3,title:'全国居民人均消费支出',source:'2024 联考 · 行测',desc:'按消费类别分列城镇与农村居民人均消费支出及增长情况。',tags:['增长量比较','倍数'],wrong:3,time:'10:26',score:'1 / 4'}
];

function dashboard(){return `
  <section>
    <div class="page-head"><div><span class="eyebrow">THURSDAY · AUGUST 13</span><h1>早上好，林同学</h1><p>真正的进步，藏在每一次认真复盘里。</p></div><div class="date-card"><div class="big-date">13</div><span>八月<br>星期四</span></div></div>
    <div class="dashboard-grid">
      <article class="card hero-card"><span class="kicker">TODAY'S FOCUS · 今日重点</span><h2>先把「增长率比较」练到<br>一眼能看出量级</h2><p>根据你的近 7 次练习，建议优先完成 6 道针对性复习。</p><div class="hero-actions"><button class="light-btn" data-action="start-review">开始今日复习 →</button><button class="ghost-btn" data-view="graph">查看知识点</button></div></article>
      <article class="card streak-card"><div class="card-title"><h3>学习连续记录</h3><span>本周 5 / 7 天</span></div><div class="streak-number"><strong>12</strong><span>天连续学习</span></div><div class="week-dots">${['一','二','三','四','五','六','日'].map((d,i)=>`<div class="day ${i<3?'done':i===3?'today':''}"><i>${i<3?'✓':i+11}</i>${d}</div>`).join('')}</div><div class="progress-row"><div class="progress-label"><span>本周目标 240 分钟</span><span>172 分钟</span></div><div class="progress-bar"><i style="width:72%"></i></div></div></article>
      <article class="card review-card"><div class="card-title"><h3>待复习</h3><span>共 6 题 →</span></div><div class="review-list"><div class="review-item"><div class="review-icon">今</div><div><strong>增长率计算 · 3 题</strong><span>记忆强度偏低</span></div><button data-action="start-review">开始</button></div><div class="review-item green"><div class="review-icon">2d</div><div><strong>比重变化 · 2 题</strong><span>第二轮复习</span></div><button data-action="start-review">开始</button></div><div class="review-item green"><div class="review-icon">5d</div><div><strong>基期量 · 1 题</strong><span>巩固复习</span></div><button data-action="start-review">开始</button></div></div></article>
      <article class="card weak-card"><div class="card-title"><h3>资料分析 · 知识点掌握</h3><span>近 30 天</span></div><div class="weak-content"><div class="weak-bars"><div class="bar-row"><span>简单计算</span><div class="bar-bg"><i style="width:88%"></i></div><em>88%</em></div><div class="bar-row"><span>现期比重</span><div class="bar-bg"><i style="width:76%"></i></div><em>76%</em></div><div class="bar-row weak"><span>增长率比较</span><div class="bar-bg"><i style="width:48%"></i></div><em>48%</em></div><div class="bar-row weak"><span>基期量</span><div class="bar-bg"><i style="width:55%"></i></div><em>55%</em></div></div><div class="weak-insight"><small>小知的观察</small><h4>速度比正确率更值得关注</h4><p>增长率题正确率正在回升，但平均用时仍比目标慢 26 秒。建议练习“截位直除”的快速判断。</p><button id="askAiInsight">请小知讲讲速算方法 →</button></div></div></article>
      <div class="stats-row"><article class="card metric"><div class="metric-top"><span>累计收录错题</span><i>+ 8 本周</i></div><strong>128 <span>题</span></strong></article><article class="card metric"><div class="metric-top"><span>本周正确率</span><i>↑ 6.2%</i></div><strong>71.4 <span>%</span></strong></article><article class="card metric"><div class="metric-top"><span>平均每题用时</span><i>↓ 4 秒</i></div><strong>52 <span>秒</span></strong></article></div>
    </div>
  </section>`}

function errors(){return `<section class="section-page"><div class="page-head"><div><span class="eyebrow">ERROR NOTEBOOK</span><h1>资料分析错题本</h1><p>材料与关联小题成组保存，保留完整解题语境。</p></div><button class="primary-btn" id="pageUpload">＋ 录入新题组</button></div><div class="filter-row"><button class="filter-btn active">全部 12</button><button class="filter-btn">待复习 6</button><button class="filter-btn">反复错误 3</button><button class="filter-btn">已掌握 4</button></div><div class="error-layout"><div class="group-list">${demoGroups.map(g=>`<article class="group-card" data-group="${g.id}"><div class="group-top"><div class="paper-thumb"><i></i><i></i><i></i><i></i></div><div class="group-copy"><span class="meta">${g.source} · 4 道关联小题</span><h3>${g.title}</h3><p>${g.desc}</p><div class="tag-row">${g.tags.map((t,i)=>`<span class="tag ${i?'orange':''}">${t}</span>`).join('')}</div></div><div class="group-score"><strong>${g.score}</strong><span>上次作答 · ${g.time}</span></div></div><div class="subquestions"><span>小题状态</span>${[1,2,3,4].map((q,i)=>`<i class="q-dot ${i<g.wrong?'wrong':''}">${116+i}</i>`).join('')}<small>${g.wrong} 道错题需复习 →</small></div></article>`).join('')}</div><aside class="side-panel"><article class="mini-card"><h3>本月复盘质量</h3><div class="ring-wrap"><div class="ring"></div><div class="ring-copy"><strong>已复盘 34 / 48</strong><span>完成笔记与错因标注</span></div></div></article><article class="mini-card"><h3>高频错因</h3><div class="cause-row"><span>公式代入错误</span><span>12 次</span></div><div class="cause-row"><span>材料定位偏差</span><span>8 次</span></div><div class="cause-row"><span>计算耗时过长</span><span>7 次</span></div><div class="cause-row"><span>单位换算遗漏</span><span>5 次</span></div></article></aside></div></section>`}

function graph(){return `<section><div class="page-head"><div><span class="eyebrow">KNOWLEDGE MAP</span><h1>资料分析知识图谱</h1><p>节点越大代表练习越多，暖色代表近期更薄弱。</p></div></div><div class="knowledge-nodes"><div class="graph-line" style="width:270px;left:26%;top:30%;transform:rotate(20deg)"></div><div class="graph-line" style="width:250px;left:51%;top:45%;transform:rotate(-28deg)"></div><div class="graph-line" style="width:290px;left:25%;top:68%;transform:rotate(-27deg)"></div><div class="graph-line" style="width:260px;left:51%;top:54%;transform:rotate(29deg)"></div><div class="node main">资料分析</div><div class="node n1">增长率<br>48%</div><div class="node n2">基期量<br>55%</div><div class="node n3">比重变化<br>76%</div><div class="node n4">平均数<br>69%</div><div class="node n5">倍数<br>82%</div></div></section>`}

function review(){return `<section><div class="page-head"><div><span class="eyebrow">SPACED REVIEW</span><h1>今日复习计划</h1><p>按记忆强度与错误频次排序，建议用时 18 分钟。</p></div></div><div class="card"><div class="card-title"><h3>今天到期 · 6 道题</h3><span>间隔复习算法（本地模拟）</span></div>${[['增长率计算','3 题','记忆强度 32%','立即复习'],['比重变化','2 题','距上次 2 天','开始'],['基期量','1 题','距上次 5 天','开始']].map((x,i)=>`<div class="review-item ${i?'green':''}"><div class="review-icon">${i+1}</div><div><strong>${x[0]} · ${x[1]}</strong><span>${x[2]}</span></div><button data-action="start-review">${x[3]}</button></div>`).join('')}</div></section>`}

function stats(){return `<section><div class="page-head"><div><span class="eyebrow">LEARNING INSIGHTS</span><h1>学习统计</h1><p>看见错误模式，也看见正在发生的进步。</p></div></div><div class="stats-row"><article class="card metric"><div class="metric-top"><span>30 天练习</span><i>+18%</i></div><strong>286 <span>题</span></strong></article><article class="card metric"><div class="metric-top"><span>资料分析正确率</span><i>+6.2%</i></div><strong>71.4 <span>%</span></strong></article><article class="card metric"><div class="metric-top"><span>平均用时</span><i>改善 4 秒</i></div><strong>52 <span>秒 / 题</span></strong></article></div><div class="card" style="margin-top:16px"><div class="card-title"><h3>知识点正确率与用时</h3><span>近 30 天</span></div><div class="weak-content"><div class="weak-bars"><div class="bar-row"><span>简单计算</span><div class="bar-bg"><i style="width:88%"></i></div><em>42s</em></div><div class="bar-row"><span>现期比重</span><div class="bar-bg"><i style="width:76%"></i></div><em>49s</em></div><div class="bar-row weak"><span>增长率比较</span><div class="bar-bg"><i style="width:48%"></i></div><em>78s</em></div><div class="bar-row weak"><span>基期量</span><div class="bar-bg"><i style="width:55%"></i></div><em>64s</em></div></div><div class="weak-insight"><small>趋势摘要</small><h4>正确率稳步提升，用时仍有空间</h4><p>本月资料分析正确率提升 6.2%，其中比重类进步最明显。增长率比较仍是当前瓶颈。</p></div></div></div></section>`}

function attempt(){return `<section><button class="detail-back" data-view="errors">← 返回错题本</button><div class="page-head"><div><span class="eyebrow">TIMED RETRY · 题组重做</span><h1>2024 年全国文化产业营业收入</h1><p>4 道关联小题 · 建议用时 8 分钟</p></div></div><div class="attempt-workspace"><div class="question-pane"><div class="source">2024 年，全国规模以上文化及相关产业企业实现营业收入 141510 亿元，比上年增长 6.0%。分业态看，文化新业态特征较为明显的 16 个行业小类实现营业收入 59082 亿元，比上年增长 9.8%。</div><table class="data-table"><tr><th>类别</th><th>营业收入（亿元）</th><th>同比增长</th></tr><tr><td>文化制造业</td><td>42191</td><td>4.5%</td></tr><tr><td>文化批发和零售业</td><td>23309</td><td>5.6%</td></tr><tr><td>文化服务业</td><td>76010</td><td>7.0%</td></tr></table><div class="question-tabs">${[116,117,118,119].map((q,i)=>`<button class="${i===0?'active':''}">${q}</button>`).join('')}</div><p class="question-text">116. 2023 年全国规模以上文化及相关产业企业实现营业收入约为多少万亿元？</p><div class="options">${['A. 12.6','B. 13.4','C. 14.2','D. 15.0'].map((x,i)=>`<label><input type="radio" name="answer" value="${i}"> ${x}</label>`).join('')}</div></div><aside class="answer-pane"><div class="timer-label">本题用时</div><div class="timer" id="timer">00:00</div><button class="secondary-btn" id="toggleTimer" style="width:100%">暂停计时</button><hr style="border:0;border-top:1px solid #e8ebe8;margin:20px 0"><span class="eyebrow">上次错因</span><div class="note-box">基期量公式代入错误。应使用：现期量 ÷（1 + 增长率）。注意结果单位由“亿元”换算为“万亿元”。</div><button class="primary-btn" id="submitAttempt">提交本题</button></aside></div></section>`}

function render(view){state.view=view;const views={dashboard,errors,review,graph,stats,attempt};$('#viewContainer').innerHTML=(views[view]||dashboard)();const names={dashboard:'今日概览',errors:'错题本',review:'复习计划',graph:'知识图谱',stats:'学习统计',attempt:'计时重做'};$('#crumbPage').textContent=names[view];$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(state.timer){clearInterval(state.timer);state.timer=null}if(view==='attempt') startTimer();bindDynamic();window.scrollTo({top:0,behavior:'smooth'})}

function bindDynamic(){
  $$('[data-view]').forEach(el=>el.onclick=()=>render(el.dataset.view));
  $$('[data-action="start-review"], [data-group]').forEach(el=>el.onclick=()=>render('attempt'));
  $('#pageUpload')?.addEventListener('click',()=>openModal('uploadModal'));
  if(state.view==='errors') loadCloudGroups();
  $('#askAiInsight')?.addEventListener('click',()=>openPanel());
  $('#submitAttempt')?.addEventListener('click',()=>{showToast('本题已提交','用时与作答结果已记录到本地');setTimeout(()=>render('review'),900)});
  $('#toggleTimer')?.addEventListener('click',e=>{if(state.timer){clearInterval(state.timer);state.timer=null;e.target.textContent='继续计时'}else{startTimer();e.target.textContent='暂停计时'}})
}

function startTimer(){state.seconds=0;clearInterval(state.timer);state.timer=setInterval(()=>{state.seconds++;const m=String(Math.floor(state.seconds/60)).padStart(2,'0'),s=String(state.seconds%60).padStart(2,'0');$('#timer')&&($('#timer').textContent=`${m}:${s}`)},1000)}
function openModal(id){$('#overlay').classList.add('show');$('#'+id).classList.add('show')}
function closeAll(){$('#overlay').classList.remove('show');$$('.modal,.ai-panel').forEach(x=>x.classList.remove('show'))}
function openPanel(){closeAll();$('#overlay').classList.add('show');$('#aiPanel').classList.add('show')}
function showToast(title,sub){$('#toast strong').textContent=title;$('#toast small').textContent=sub;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2600)}

$('#uploadBtn').onclick=()=>openModal('uploadModal');$('#aiFab').onclick=openPanel;$('#overlay').onclick=closeAll;$$('[data-close]').forEach(x=>x.onclick=closeAll);
$$('[data-upload-tab]').forEach(btn=>btn.onclick=()=>{$$('[data-upload-tab]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const image=btn.dataset.uploadTab==='image';$('#dropTitle').textContent=image?'拖入一道题目截图':'拖入一份试卷 PDF';$('#dropHint').textContent=image?'支持 PNG、JPG；可连续录入同一材料的关联题':'支持 PDF，原型中将使用演示文件模拟解析';$('#fileInput').accept=image?'image/*':'.pdf'});
$('#chooseFile').onclick=()=>$('#fileInput').click();
['dragenter','dragover'].forEach(e=>$('#dropZone').addEventListener(e,x=>{x.preventDefault();$('#dropZone').classList.add('dragover')}));['dragleave','drop'].forEach(e=>$('#dropZone').addEventListener(e,x=>{x.preventDefault();$('#dropZone').classList.remove('dragover');if(e==='drop') simulateParse(x.dataTransfer.files?.[0])}));
$('#fileInput').onchange=event=>simulateParse(event.target.files?.[0]);
/*
 * Cloud uploads use the site server as a private relay.  This keeps the OSS
 * credential out of the browser and avoids browser-to-OSS CORS requirements.
 */
async function uploadViaServer(file){
  const response=await fetch('/api/uploads',{method:'POST',headers:{'content-type':file.type,'x-file-name':encodeURIComponent(file.name)},body:file});
  const payload=await response.json();
  if(!response.ok) throw new Error(payload.error||'OSS upload failed.');
  return payload.objectKey;
}

async function simulateParse(file){
  const dz=$('#dropZone');
  const showProgress=(title,detail)=>{dz.innerHTML=`<div class="upload-cloud">☁</div><h3>${title}</h3><p>${detail}</p><div class="progress-bar" style="max-width:260px;margin:auto"><i style="width:72%"></i></div>`};
  if(!file){showProgress('正在本地模拟识别题目…','整理材料结构与 4 道关联小题');setTimeout(()=>{closeAll();openModal('classifyModal')},750);return}
  showProgress('正在准备安全上传…','正在向网站后端申请短时上传凭据');
  try{
    const serverObjectKey=await uploadViaServer(file);
    state.uploaded=true;state.uploadedObjectKey=serverObjectKey;state.uploadedFileName=file.name;
    showProgress('上传完成，正在识别题目…','材料将与 4 道关联小题保持成组保存。');
    setTimeout(()=>{closeAll();openModal('classifyModal')},600);
    return;
    const policyResponse=await fetch('/api/upload-policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fileName:file.name,contentType:file.type})});
    if(!policyResponse.ok) throw new Error((await policyResponse.json()).error||'上传服务暂不可用');
    const policy=await policyResponse.json();
    const form=new FormData();Object.entries(policy.fields).forEach(([key,value])=>form.append(key,value));form.append('file',file);
    showProgress('正在上传到私有资料库…','文件只会保存在你的 OSS Bucket，链接不会公开');
    const uploadResponse=await fetch(policy.url,{method:'POST',body:form});
    if(!uploadResponse.ok) throw new Error('OSS 返回上传失败，请检查 Bucket CORS 和 RAM 权限');
    state.uploaded=true;state.uploadedObjectKey=policy.objectKey;state.uploadedFileName=file.name;
    showProgress('上传完成，正在识别题目…','材料将与 4 道关联小题保持成组保存');
    setTimeout(()=>{closeAll();openModal('classifyModal')},600);
  }catch(error){
    console.warn('Cloud upload unavailable; using demo parser.',error);
    showToast('云端上传暂未启用','当前仍可继续体验本地模拟流程；部署后会自动启用私有 OSS 上传。');
    showProgress('正在本地模拟识别题目…','云端凭据尚未配置，未上传任何文件');
    setTimeout(()=>{closeAll();openModal('classifyModal')},750);
  }
}
$('#backUpload').onclick=()=>{closeAll();openModal('uploadModal')};
$('#confirmSave').onclick=async()=>{
  const button=$('#confirmSave'); button.disabled=true;
  try{
    if(!state.uploadedObjectKey) throw new Error('请先完成文件上传；当前演示模式不会写入云端。');
    const title=(state.uploadedFileName||'新录入题组').replace(/\.[^.]+$/,'').slice(0,255);
    const response=await fetch('/api/material-groups',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({subject:'资料分析',title,sourceName:state.uploadedFileName,ossObjectKey:state.uploadedObjectKey})});
    const payload=await response.json();
    if(!response.ok) throw new Error(payload.error||'保存失败');
    closeAll(); showToast('题组已保存到云端','资料文件保存在私有 OSS，题组记录已写入 RDS。');
    state.uploaded=false;state.uploadedObjectKey=null;state.uploadedFileName=null;
    setTimeout(()=>render('errors'),500);
  }catch(error){ showToast('暂未保存到云端',error.message); }
  finally{button.disabled=false;}
};

async function loadCloudGroups(){
  try{
    const response=await fetch('/api/material-groups'); if(!response.ok) return;
    const {groups=[]}=await response.json(); if(!groups.length) return;
    const list=$('.group-list'); if(!list) return;
    const cloudCards=groups.map(group=>`<article class="group-card cloud-group" data-cloud-group="${group.id}"><div class="group-top"><div class="paper-thumb"><i></i><i></i><i></i><i></i></div><div class="group-copy"><span class="meta">云端题组 · ${group.questionCount||0} 道关联小题</span><h3>${escapeHtml(group.title)}</h3><p>已保存到你的私有云端资料库；后续可在此补录题干、选项、错因与速算笔记。</p><div class="tag-row"><span class="tag">${escapeHtml(group.subject)}</span><span class="tag orange">RDS 已保存</span></div></div><div class="group-score"><strong>${group.questionCount||0} / 4</strong><span>${new Date(group.createdAt).toLocaleDateString('zh-CN')}</span></div></div><div class="subquestions"><span>云端状态</span><small>材料与题组关联已建立 →</small></div></article>`).join('');
    list.insertAdjacentHTML('afterbegin',cloudCards);
  }catch(error){console.warn('Could not load cloud material groups.',error);}
}

function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
$('#chatForm').onsubmit=e=>{e.preventDefault();const input=$('#chatInput');if(!input.value.trim())return;$('#chatBody').insertAdjacentHTML('beforeend',`<div class="message user"><div class="bubble">${input.value.replace(/[<>]/g,'')}</div></div><div class="message assistant"><div class="mini-avatar">✦</div><div class="bubble">可以先用“分子分母同向变化”判断趋势，再做截位估算。结合你的错题记录，建议把精算留到两个选项非常接近时。<br><br><small>这是本地模拟回答，不会发送到云端。</small></div></div>`);input.value='';$('#chatBody').scrollTop=$('#chatBody').scrollHeight};$$('.quick-prompts button').forEach(b=>b.onclick=()=>{$('#chatInput').value=b.textContent;$('#chatForm').requestSubmit()});
$('#searchBtn').onclick=()=>{if(!$('#searchModal')){document.body.insertAdjacentHTML('beforeend',`<section class="modal search-modal" id="searchModal"><div class="modal-header" style="padding:0 0 12px"><h2>搜索知识库</h2><button class="close-btn" data-close="searchModal">×</button></div><input autofocus placeholder="输入知识点、题源或笔记关键词…"><div class="search-results"><div class="search-result"><span>增长率计算 · 4 组错题</span><span>知识点</span></div><div class="search-result"><span>基期量 = 现期量 ÷ (1 + 增长率)</span><span>笔记</span></div><div class="search-result"><span>2024 年全国文化产业营业收入</span><span>题组</span></div></div></section>`);$('#searchModal [data-close]').onclick=closeAll}openModal('searchModal');setTimeout(()=>$('#searchModal input').focus(),100)};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchBtn').click()}if(e.key==='Escape')closeAll()});
render('dashboard');
