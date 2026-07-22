(function(){
  'use strict';
  const state={incidents:[],selected:null};
  const labels={new:'Novo',in_analysis:'Em análise',resolved:'Resolvido',ignored:'Ignorado',critical:'Crítico',high:'Alto',medium:'Médio',low:'Baixo',server:'Servidor',client:'Navegador',network:'Rede'};
  const element=id=>document.getElementById(id);
  const format=value=>value?new Date(value).toLocaleString('pt-BR'):'—';
  const badge=(value,type='status')=>{const span=document.createElement('span');span.className=`admin-status error-${type}-${value}`;span.textContent=labels[value]||value||'—';return span};
  function query(){const params=new URLSearchParams();['severity','status','module','period','search'].forEach(name=>{const value=element(`error-${name}`).value.trim();if(value)params.set(name,value)});return params.toString()}
  async function loadSystemErrors(){
    try{
      const data=await adminApi('/api/admin/system-errors?'+query());
      state.incidents=data.incidents||[];
      element('error-stat-critical').textContent=data.stats.critical;
      element('error-stat-analysis').textContent=data.stats.inAnalysis;
      element('error-stat-resolved').textContent=data.stats.resolvedToday;
      element('error-stat-24h').textContent=data.stats.last24h;
      element('errors-badge').textContent=data.stats.new;
      element('error-last-check').textContent='Última verificação '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const moduleSelect=element('error-module'),selectedModule=moduleSelect.value;
      moduleSelect.replaceChildren(new Option('Todos os módulos',''));
      (data.modules||[]).forEach(module=>moduleSelect.appendChild(new Option(module,module)));
      moduleSelect.value=selectedModule;
      renderTable();
      const selected=state.incidents.find(item=>item.id===state.selected?.id)||state.incidents[0];
      if(selected)await selectIncident(selected);else clearDetail();
    }catch(error){handleAdminError(error,false)}
  }
  window.loadSystemErrors=loadSystemErrors;
  async function loadBadge(){try{const data=await adminApi('/api/admin/system-errors?period=24h');element('errors-badge').textContent=data.stats.new}catch(_){} }
  function renderTable(){
    const body=element('error-table');body.replaceChildren();element('error-count').textContent=`${state.incidents.length} incidente${state.incidents.length===1?'':'s'}`;
    state.incidents.forEach(item=>{const row=document.createElement('tr');row.className=state.selected?.id===item.id?'selected':'';const cells=[format(item.lastOccurredAt),item.companyName,item.module,item.message];cells.forEach((value,index)=>{const cell=document.createElement('td');if(index===3){cell.appendChild(cellMain(value,item.code))}else cell.textContent=value;row.appendChild(cell)});const severity=document.createElement('td');severity.appendChild(badge(item.severity,'severity'));const status=document.createElement('td');status.appendChild(badge(item.status));row.append(severity,status);row.tabIndex=0;row.addEventListener('click',()=>selectIncident(item));row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectIncident(item)}});body.appendChild(row)});
    if(!state.incidents.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=6;cell.textContent='Nenhum incidente encontrado.';row.appendChild(cell);body.appendChild(row)}
  }
  function clearDetail(){state.selected=null;element('error-detail-empty').hidden=false;element('error-detail-content').hidden=true}
  async function selectIncident(item){
    try{
      const data=await adminApi(`/api/admin/system-errors/${item.id}`);state.selected=data.incident;renderTable();
      const incident=state.selected;element('error-detail-empty').hidden=true;element('error-detail-content').hidden=false;
      const statusHost=element('error-detail-status');statusHost.className=`admin-status error-status-${incident.status}`;statusHost.textContent=labels[incident.status]||incident.status;
      element('error-detail-code').textContent=incident.code;element('error-detail-title').textContent=incident.message;
      element('error-detail-company').textContent=incident.companyName;element('error-detail-module').textContent=incident.module;
      element('error-detail-first').textContent=format(incident.firstOccurredAt);element('error-detail-last').textContent=format(incident.lastOccurredAt);
      element('error-detail-occurrences').textContent=incident.occurrenceCount;element('error-detail-actors').textContent=incident.affectedActors;
      element('error-detail-summary').textContent=`${labels[incident.source]||incident.source} · ${incident.errorType}`;
      element('error-detail-route').textContent=[incident.method,incident.route].filter(Boolean).join(' ')||'Rota não informada';
      const timeline=element('error-timeline');timeline.replaceChildren();(incident.occurrences||[]).slice(0,8).forEach((occurrence,index)=>{const article=document.createElement('article');const dot=document.createElement('i');const copy=document.createElement('div');const time=document.createElement('time');time.textContent=format(occurrence.occurredAt);const strong=document.createElement('strong');strong.textContent=index===0?'Ocorrência mais recente':'Ocorrência registrada';const text=document.createElement('p');text.textContent=occurrence.technicalSummary||[occurrence.method,occurrence.route].filter(Boolean).join(' ')||'Falha capturada automaticamente.';copy.append(time,strong,text);article.append(dot,copy);timeline.appendChild(article)});
      const supportButton=element('error-create-support');supportButton.disabled=!incident.companyId||Boolean(incident.supportTicketId);supportButton.innerHTML=incident.supportTicketId?`<i class="fa-solid fa-headset"></i> Chamado ${incident.supportProtocol}`:'<i class="fa-solid fa-headset"></i> Criar chamado no Suporte';
      element('error-mark-analysis').disabled=incident.status==='in_analysis';element('error-resolve').disabled=incident.status==='resolved';
    }catch(error){handleAdminError(error,false)}
  }
  async function updateStatus(status){if(!state.selected)return;try{await adminApi(`/api/admin/system-errors/${state.selected.id}`,{method:'PUT',body:JSON.stringify({status})});toast(status==='resolved'?'Incidente resolvido.':'Incidente marcado em análise.');await loadSystemErrors()}catch(error){handleAdminError(error,false)}}
  async function createSupport(){if(!state.selected)return;try{const data=await adminApi(`/api/admin/system-errors/${state.selected.id}/support`,{method:'POST',body:'{}'});toast(`Chamado ${data.protocol} criado no Suporte.`);await loadSystemErrors()}catch(error){handleAdminError(error,false)}}
  document.addEventListener('DOMContentLoaded',()=>{
    element('refresh-errors').addEventListener('click',loadSystemErrors);
    ['severity','status','module','period'].forEach(name=>element(`error-${name}`).addEventListener('change',loadSystemErrors));
    let searchTimer;element('error-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadSystemErrors,350)});
    element('error-mark-analysis').addEventListener('click',()=>updateStatus('in_analysis'));element('error-resolve').addEventListener('click',()=>updateStatus('resolved'));element('error-create-support').addEventListener('click',createSupport);
    loadBadge();setInterval(loadBadge,60000);
  });
})();
