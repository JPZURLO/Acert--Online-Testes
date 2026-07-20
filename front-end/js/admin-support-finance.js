const supportFinanceState={tickets:[],selectedTicket:null,finance:null};

function money(value){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function supportLabel(value){return {new:'Novo',in_progress:'Em atendimento',waiting_customer:'Aguardando cliente',resolved:'Resolvido',closed:'Fechado',question:'Dúvida',bug:'Bug',help:'Ajuda',low:'Baixa',medium:'Média',high:'Alta',urgent:'Urgente'}[value]||value}

async function loadSupport(){
  const params=new URLSearchParams();
  const status=document.getElementById('support-status').value;
  const category=document.getElementById('support-category').value;
  if(status)params.set('status',status);
  if(category)params.set('category',category);
  try{
    const data=await adminApi('/api/admin/support?'+params);
    supportFinanceState.tickets=data.tickets||[];
    document.getElementById('support-stat-new').textContent=data.stats.new;
    document.getElementById('support-stat-progress').textContent=data.stats.inProgress;
    document.getElementById('support-stat-waiting').textContent=data.stats.waitingCustomer;
    document.getElementById('support-stat-sla').textContent=data.stats.slaRisk;
    document.getElementById('support-badge').textContent=data.stats.new;
    renderSupportList();
    if(supportFinanceState.selectedTicket){
      const current=supportFinanceState.tickets.find(item=>item.id===supportFinanceState.selectedTicket.id);
      if(current)await selectSupportTicket(current);
    }
  }catch(error){handleAdminError(error)}
}
function renderSupportList(){
  const search=document.getElementById('support-search').value.trim().toLowerCase();
  const items=supportFinanceState.tickets.filter(item=>!search||[item.protocol,item.companyName,item.subject].some(value=>String(value||'').toLowerCase().includes(search)));
  const host=document.getElementById('support-ticket-list');host.replaceChildren();
  document.getElementById('support-count').textContent=items.length+' chamado'+(items.length===1?'':'s');
  items.forEach(item=>{
    const button=document.createElement('button');button.type='button';button.className='support-ticket'+(supportFinanceState.selectedTicket?.id===item.id?' active':'');
    const main=document.createElement('div');
    const meta=document.createElement('div');meta.className='support-ticket-meta';
    const dot=document.createElement('i');dot.className='priority-dot '+item.priority;
    const protocol=document.createElement('small');protocol.textContent=item.protocol+' · '+item.companyName;
    meta.append(dot,protocol);
    const title=document.createElement('strong');title.textContent=item.subject;
    const last=document.createElement('small');last.textContent=item.lastMessage||supportLabel(item.category);
    main.append(meta,title,last);
    button.append(main,statusBadge(item.status));
    button.addEventListener('click',()=>selectSupportTicket(item));
    host.appendChild(button);
  });
  if(!items.length){const empty=document.createElement('p');empty.className='admin-form-message';empty.textContent='Nenhum chamado encontrado.';host.appendChild(empty)}
}
async function selectSupportTicket(item){
  try{
    const data=await adminApi('/api/admin/support/'+item.id);
    const ticket=data.ticket;supportFinanceState.selectedTicket=ticket;renderSupportList();
    document.getElementById('support-detail-empty').hidden=true;document.getElementById('support-detail-content').hidden=false;
    document.getElementById('support-detail-protocol').textContent=ticket.protocol;
    document.getElementById('support-detail-subject').textContent=ticket.subject;
    document.getElementById('support-detail-company').textContent=ticket.companyName+' · '+supportLabel(ticket.category);
    document.getElementById('support-detail-status').value=ticket.status;
    document.getElementById('support-detail-priority').value=ticket.priority;
    const sla=document.getElementById('support-sla-pill');
    const due=ticket.slaDueAt?new Date(ticket.slaDueAt):null;
    sla.textContent=due?'SLA '+due.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Sem SLA';
    sla.className='admin-status '+(due&&due<new Date()&&!['resolved','closed'].includes(ticket.status)?'blocked':'pending');
    const conversation=document.getElementById('support-conversation');conversation.replaceChildren();
    (ticket.messages||[]).forEach(message=>{
      const article=document.createElement('article');article.className='support-message '+(message.authorType==='admin'?'admin':'company');
      const author=document.createElement('strong');author.textContent=message.authorName;
      const copy=document.createElement('p');copy.textContent=message.message;
      const time=document.createElement('time');time.textContent=new Date(message.createdAt).toLocaleString('pt-BR');
      article.append(author,copy,time);conversation.appendChild(article);
    });
    conversation.scrollTop=conversation.scrollHeight;
  }catch(error){handleAdminError(error)}
}
async function saveSupportStatus(){
  const ticket=supportFinanceState.selectedTicket;if(!ticket)return;
  try{
    await adminApi('/api/admin/support/'+ticket.id,{method:'PUT',body:JSON.stringify({status:document.getElementById('support-detail-status').value,priority:document.getElementById('support-detail-priority').value})});
    toast('Chamado atualizado.');await loadSupport();await selectSupportTicket(ticket);
  }catch(error){handleAdminError(error,false)}
}
async function sendSupportReply(event){
  event.preventDefault();const ticket=supportFinanceState.selectedTicket;const input=document.getElementById('support-reply');if(!ticket||!input.value.trim())return;
  try{await adminApi('/api/admin/support/'+ticket.id+'/messages',{method:'POST',body:JSON.stringify({message:input.value})});input.value='';toast('Resposta enviada.');await selectSupportTicket(ticket);await loadSupport()}catch(error){handleAdminError(error,false)}
}

function renderFinanceSeries(items){
  const host=document.getElementById('finance-series');host.replaceChildren();
  const maximum=Math.max(1,...items.flatMap(item=>[item.received,item.expected]));
  items.forEach(item=>{
    const wrap=document.createElement('div');wrap.className='finance-bar-item';
    const bars=document.createElement('div');bars.className='finance-bar-wrap';
    const received=document.createElement('i');received.className='finance-bar';received.style.height=Math.max(2,item.received/maximum*100)+'%';received.title='Recebido: '+money(item.received);
    const expected=document.createElement('i');expected.className='finance-bar expected';expected.style.height=Math.max(2,item.expected/maximum*100)+'%';expected.title='Previsto: '+money(item.expected);
    const label=document.createElement('small');label.textContent=item.label;
    bars.append(received,expected);wrap.append(bars,label);host.appendChild(wrap);
  });
}
function renderFinanceDistribution(distribution){
  const host=document.getElementById('finance-distribution');host.replaceChildren();
  [['paid','Pago'],['pending','Pendente'],['overdue','Vencido']].forEach(([key,label])=>{const item=document.createElement('article');item.className='payment-'+key;const small=document.createElement('small');small.textContent=label;const strong=document.createElement('strong');strong.textContent=distribution[key]||0;item.append(small,strong);host.appendChild(item)});
}
function renderFinanceTable(){
  const data=supportFinanceState.finance;const search=document.getElementById('finance-search').value.trim().toLowerCase();
  const items=(data?.licenses||[]).filter(item=>!search||item.companyName.toLowerCase().includes(search));
  document.getElementById('finance-count').textContent=items.length+' contrato'+(items.length===1?'':'s');
  const body=document.getElementById('finance-table');body.replaceChildren();
  items.forEach(item=>{
    const row=document.createElement('tr');
    const company=document.createElement('td');company.appendChild(cellMain(item.companyName,item.billingDueDay?'Vence todo dia '+item.billingDueDay:''));
    const plan=document.createElement('td');plan.textContent=item.planName;
    const value=document.createElement('td');value.textContent=money(item.monthlyValue);
    const due=document.createElement('td');due.textContent=formatDate(item.nextDueAt);
    const payment=document.createElement('td');const paymentBadge=statusBadge(item.paymentStatus);paymentBadge.classList.add('payment-'+item.paymentStatus);paymentBadge.textContent={paid:'Pago',pending:'Pendente',overdue:'Vencido',waived:'Isento'}[item.paymentStatus]||item.paymentStatus;payment.appendChild(paymentBadge);
    const license=document.createElement('td');license.appendChild(statusBadge(item.licenseStatus));
    const actions=document.createElement('td');const pay=document.createElement('button');pay.className='finance-action';pay.type='button';pay.textContent='Registrar pagamento';pay.addEventListener('click',()=>openPayment(item));const toggle=document.createElement('button');toggle.className='finance-action';toggle.type='button';toggle.textContent=item.licenseStatus==='blocked'?'Liberar':'Bloquear';toggle.addEventListener('click',()=>toggleFinanceLicense(item));actions.append(pay,toggle);
    row.append(company,plan,value,due,payment,license,actions);body.appendChild(row);
  });
}
function renderUpcoming(items){
  const host=document.getElementById('finance-upcoming');host.replaceChildren();
  (items||[]).forEach(item=>{const row=document.createElement('article');const name=document.createElement('strong');name.textContent=item.companyName;const due=document.createElement('span');due.textContent=formatDate(item.nextDueAt);row.append(name,due);host.appendChild(row)});
  if(!items?.length){host.textContent='Nenhum vencimento próximo.'}
}
async function loadFinance(){
  const month=document.getElementById('finance-month').value;
  try{
    const data=await adminApi('/api/admin/finance?month='+encodeURIComponent(month));supportFinanceState.finance=data;
    document.getElementById('finance-received').textContent=money(data.stats.received);
    document.getElementById('finance-received-rate').textContent=data.stats.receivedRate+'% do previsto';
    document.getElementById('finance-contracts').textContent=data.stats.newContracts;
    document.getElementById('finance-open').textContent=money(data.stats.open);
    document.getElementById('finance-expiring').textContent=data.stats.expiring;
    document.getElementById('finance-delinquency').textContent=data.stats.delinquencyRate+'%';
    renderFinanceSeries(data.series||[]);renderFinanceDistribution(data.distribution||{});renderUpcoming(data.upcoming||[]);renderFinanceTable();populatePaymentCompanies();
  }catch(error){handleAdminError(error)}
}
function populatePaymentCompanies(){
  const select=document.getElementById('payment-company');const current=select.value;select.replaceChildren(new Option('Selecione o cliente',''));
  (supportFinanceState.finance?.licenses||[]).forEach(item=>select.appendChild(new Option(item.companyName,String(item.companyId))));select.value=current;
}
function openPayment(item=null){
  const modal=document.getElementById('payment-modal');modal.hidden=false;populatePaymentCompanies();
  const now=new Date();document.getElementById('payment-company').value=item?String(item.companyId):'';
  document.getElementById('payment-amount').value=item?.monthlyValue||'';
  document.getElementById('payment-competence').value=document.getElementById('finance-month').value;
  document.getElementById('payment-date').value=now.toISOString().slice(0,10);document.getElementById('payment-message').textContent='';
}
function closePayment(){document.getElementById('payment-modal').hidden=true}
async function savePayment(event){
  event.preventDefault();const payload={companyId:Number(document.getElementById('payment-company').value),competence:document.getElementById('payment-competence').value,amount:Number(document.getElementById('payment-amount').value),paidAt:document.getElementById('payment-date').value,method:document.getElementById('payment-method').value,notes:document.getElementById('payment-notes').value,releaseLicense:document.getElementById('payment-release').checked};
  try{await adminApi('/api/admin/finance/payments',{method:'POST',body:JSON.stringify(payload)});closePayment();toast('Pagamento registrado e licença atualizada.');await loadFinance()}catch(error){document.getElementById('payment-message').textContent=error.message;handleAdminError(error,false)}
}
async function toggleFinanceLicense(item){
  const blocked=item.licenseStatus==='blocked';
  try{await adminApi('/api/admin/finance/licenses/'+item.companyId,{method:'PUT',body:JSON.stringify({paymentStatus:item.paymentStatus,licenseStatus:blocked?'active':'blocked'})});toast(blocked?'Licença liberada.':'Licença bloqueada.');await loadFinance()}catch(error){handleAdminError(error,false)}
}
function exportFinance(){
    const items = supportFinanceState.finance?.licenses || [];
    const rows = [['Empresa','Plano','Valor mensal','Vencimento','Pagamento','Licença']];
    items.forEach((item) => rows.push([
        item.companyName,
        item.planName,
        money(item.monthlyValue),
        item.nextDueAt ? dateLabel(item.nextDueAt) : '',
        paymentLabels[item.paymentStatus] || item.paymentStatus,
        item.status
    ]));
    const newline = String.fromCharCode(13, 10);
    const csv = String.fromCharCode(65279) + rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"','""')}"`).join(';')).join(newline);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    link.download = `financeiro-${document.getElementById('finance-month').value}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}
document.addEventListener('DOMContentLoaded',()=>{
  const today=new Date();document.getElementById('finance-month').value=today.toISOString().slice(0,7);
  document.querySelectorAll('[data-admin-view="support"]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('admin-breadcrumb').textContent='Central de suporte';loadSupport()}));
  document.querySelectorAll('[data-admin-view="finance"]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('admin-breadcrumb').textContent='Controle financeiro';loadFinance()}));
  document.getElementById('refresh-support').addEventListener('click',loadSupport);
  document.getElementById('support-category').addEventListener('change',loadSupport);document.getElementById('support-status').addEventListener('change',loadSupport);document.getElementById('support-search').addEventListener('input',renderSupportList);
  document.getElementById('save-support-status').addEventListener('click',saveSupportStatus);document.getElementById('support-reply-form').addEventListener('submit',sendSupportReply);
  document.getElementById('finance-month').addEventListener('change',loadFinance);document.getElementById('finance-search').addEventListener('input',renderFinanceTable);document.getElementById('new-payment').addEventListener('click',()=>openPayment());document.getElementById('export-finance').addEventListener('click',exportFinance);
  document.getElementById('close-payment').addEventListener('click',closePayment);document.getElementById('cancel-payment').addEventListener('click',closePayment);document.getElementById('payment-form').addEventListener('submit',savePayment);
  loadSupport();
});