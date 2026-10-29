const candidateState={user:null,assignments:[],exam:null,attempt:null,answers:{},questionIndex:0,timer:null,autosave:null,deviceStream:null,screenStream:null,recordingStream:null,recorder:null,recordingCanvas:null,canvasTimer:null,deviceReady:false,screenReady:false,identityReady:false,submitting:false,enforcementArmed:false,recordingStopping:false,recordingFailed:false,chunkSequence:0,uploadedChunks:0,uploadQueue:Promise.resolve(),chatTimer:null,chatLastId:0,remoteTransition:false};
const candidateElements={};
const candidateIds=['assignments-view','preflight-view','waiting-room-view','exam-view','completion-view','candidate-name','candidate-first-name','candidate-initials','candidate-company','candidate-logo','candidate-logout','back-to-assignments','assignment-total','assignment-progress','assignment-completed','assignment-list','assignment-empty','preflight-title','preflight-company','preflight-duration','preflight-questions','preflight-description','preflight-instructions','resume-section','resume-code','resume-status','identity-section','identity-document','identity-selfie','document-label','selfie-label','submit-identity','identity-status','device-section','device-preview','check-devices','device-status','screen-section','check-screen','screen-status','recording-consent-wrap','recording-consent','start-attempt','preflight-message','waiting-room-logo','waiting-room-company','waiting-room-exam-title','waiting-room-candidate-name','waiting-room-status-label','waiting-check-camera','waiting-check-mic','waiting-check-screen','waiting-check-identity','waiting-chat-alert','waiting-chat-messages','waiting-chat-form','waiting-chat-input','exam-title','exam-progress-label','exam-timer','timer-card','recording-badge','monitor-camera','monitor-camera-status','monitor-microphone-status','monitor-screen-status','recording-sync-status','recording-chunk-status','candidate-chat-alert','candidate-chat-messages','candidate-chat-form','candidate-chat-input','question-navigation','question-container','autosave-status','previous-question','next-question','finish-attempt','completion-card','completion-icon','completion-eyebrow','completion-title','completion-message','completion-result','completion-score','completion-status','finish-confirmation','candidate-toast-region','candidate-exam-title'];
const statusLabels={not_started:'Não iniciado',pending:'Convite pendente',waiting_proctor:'Aguardando proctor',in_progress:'Em andamento',submitted:'Enviado',completed:'Concluído',approved:'Aprovado',failed:'Não aprovado',review:'Em revisão',invalidated:'Invalidado',paused:'Retomada pendente',closed:'Encerrado pela empresa'};

function cacheCandidateElements(){candidateIds.forEach(id=>candidateElements[id]=document.getElementById(id));if(document.getElementById('candidate-exam-title')){candidateElements['exam-title']=document.getElementById('candidate-exam-title')}}
function showCandidateView(viewId){
  ['assignments-view','preflight-view','waiting-room-view','exam-view','completion-view'].forEach(id=>{
    const el = candidateElements[id] || document.getElementById(id);
    if(el) el.hidden = (id !== viewId);
  });
}

window.CandidatePreviewAdapter = window.CandidatePreviewAdapter || {
  active: false,
  mockState: { answers: {}, currentQuestionIndex: 0 },
  activate(draftExamData) {
    this.active = true;
    this.mockState = { exam: draftExamData, answers: {}, currentQuestionIndex: 0 };
  },
  deactivate() {
    this.active = false;
    this.mockState = { answers: {}, currentQuestionIndex: 0 };
  },
  async handleApi(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (url.includes('/answers')) {
        return { success: true, simulated: true, message: 'Resposta registrada em memória (Modo de Prévia).' };
      }
      if (url.includes('/submit') || url.includes('/finish')) {
        return { success: true, simulated: true, score: 100, grade: null, resultStatus: 'completed', releaseStatus: 'pending', message: 'Exame concluído em Modo de Prévia.' };
      }
      if (url.includes('/documents')) {
        return { success: true, simulated: true, message: 'Operação de documento simulada (Modo de Prévia).' };
      }
      if (url.includes('/proctoring')) {
        return { success: true, simulated: true, message: 'Proctoring simulado (Modo de Prévia).' };
      }
      return { success: true, simulated: true, message: 'Operação simulada (Modo de Prévia).' };
    }
    if (url.includes('/assignments')) {
      return { user: { name: 'Participante (Prévia)' }, assignments: [] };
    }
    if (url.includes('/documents')) {
      return { documents: (candidateState.exam && candidateState.exam.documents) || [] };
    }
    return { success: true, simulated: true };
  }
};

function csrf(){const item=document.cookie.split('; ').find(value=>value.startsWith('acert_csrf_token='));return item?decodeURIComponent(item.split('=').slice(1).join('=')):''}
async function candidateApi(url,options={}){
  if (window.CandidatePreviewAdapter && window.CandidatePreviewAdapter.active) {
    return window.CandidatePreviewAdapter.handleApi(url, options);
  }
  const method=options.method||'GET';const isForm=options.body instanceof FormData;const headers={...(options.headers||{})};if(options.body&&!isForm)headers['Content-Type']='application/json';if(!['GET','HEAD','OPTIONS'].includes(method))headers['X-CSRF-Token']=csrf();const response=await fetch(url,{...options,headers});let data={};try{data=await response.json()}catch(_){data={}}if(!response.ok){const error=new Error(data.message||'Não foi possível concluir a operação.');error.status=response.status;throw error}return data}
async function candidateDocumentObjectUrl(url){const response=await fetch(url,{method:'GET'});if(!response.ok)throw new Error('Não foi possível carregar o documento.');const blob=await response.blob();return URL.createObjectURL(blob)}
function initials(name){return String(name||'PT').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}
async function loadCandidateDocuments(examId){
  const wrap=document.getElementById('candidate-documents-wrap');
  const host=document.getElementById('candidate-documents-list');
  if(!host)return;
  try{
    let docs = [];
    if (window.CandidatePreviewAdapter && window.CandidatePreviewAdapter.active) {
      docs = (candidateState.exam && candidateState.exam.documents) || [];
    } else {
      const data=await candidateApi(`/api/participant/exams/${examId}/documents`);
      docs=data.documents||[];
    }
    if(!docs.length){if(wrap)wrap.hidden=true;host.replaceChildren();return}
    if(wrap)wrap.hidden=false;
    host.replaceChildren();
    const docTypeLabels={rules:'Regras do teste',general_instructions:'Instruções gerais',terms:'Termo de aceite',support_material:'Material de apoio',other:'Documento'};
    const completedStatuses=new Set(['visualizado','baixado','leitura_confirmada','aceito','aprovado']);
    docs.forEach(doc=>{
      const card=document.createElement('article');
      card.className='candidate-reading-card';
      const title=document.createElement('strong');
      title.textContent=doc.title||doc.originalName||'Instrução do teste';
      const meta=document.createElement('small');
      meta.textContent=docTypeLabels[doc.docType]||doc.docType||'Instrução';
      const desc=document.createElement('p');
      desc.textContent=doc.description||'A empresa anexou este documento para leitura antes do início do teste.';
      card.append(title,meta,desc);
      const viewer=document.createElement('div');
      viewer.className='candidate-document-viewer';
      const viewUrl=`/api/participant/exams/${examId}/documents/${doc.id}/view`;
      const originalName=String(doc.originalName||'').toLowerCase();
      const contentType=String(doc.contentType||'').toLowerCase();
      if(contentType.includes('pdf')||originalName.endsWith('.pdf')){
        const frame=document.createElement('iframe');
        frame.src='about:blank';
        frame.title=doc.title||doc.originalName||'Documento do teste';
        frame.loading='lazy';
        candidateDocumentObjectUrl(viewUrl).then((objectUrl)=>{frame.src=objectUrl}).catch(()=>{viewer.textContent='Não foi possível exibir este documento.'});
        viewer.appendChild(frame);
      }else if(contentType.startsWith('image/')){
        const image=document.createElement('img');
        image.alt=doc.title||doc.originalName||'Documento do teste';
        candidateDocumentObjectUrl(viewUrl).then((objectUrl)=>{image.src=objectUrl}).catch(()=>{viewer.textContent='Não foi possível exibir esta imagem.'});
        viewer.appendChild(image);
      }else{
        const fallback=document.createElement('a');
        fallback.href=viewUrl;
        fallback.target='_blank';
        fallback.rel='noopener';
        fallback.textContent='Abrir documento para leitura';
        viewer.appendChild(fallback);
      }
      card.appendChild(viewer);
      if(doc.originalName){
        const file=document.createElement('span');
        file.className='candidate-reading-file';
        file.textContent=`Arquivo anexado: ${doc.originalName}`;
        card.appendChild(file);
      }
      const action=doc.participantAction||'view_only';
      const needsCheckbox=doc.blocksExamStart&&doc.mandatory&&['view_only','confirm_read','accept_electronic'].includes(action)&&!completedStatuses.has(doc.status);
      if(needsCheckbox){
        const acceptLabel=document.createElement('label');
        acceptLabel.className='candidate-document-acceptance';
        const checkbox=document.createElement('input');
        checkbox.type='checkbox';
        const span=document.createElement('span');
        span.textContent=action==='accept_electronic'?'Li e aceito este termo.':'Li e estou ciente deste documento.';
        acceptLabel.append(checkbox,span);
        checkbox.addEventListener('change',async()=>{
          if(!checkbox.checked)return;
          checkbox.disabled=true;
          try{
            const endpoint=action==='accept_electronic'?'accept':'confirm-read';
            await candidateApi(`/api/participant/exams/${examId}/documents/${doc.id}/${endpoint}`,{method:'POST'});
            candidateToast(action==='accept_electronic'?'Termo aceito com sucesso.':'Leitura confirmada com sucesso.','success');
            await loadCandidateDocuments(examId);
          }catch(error){
            checkbox.checked=false;
            checkbox.disabled=false;
            candidateToast(error.message,'error');
          }
        });
        card.appendChild(acceptLabel);
      }else if(completedStatuses.has(doc.status)){
        const done=document.createElement('em');
        done.textContent='Documento visualizado/confirmado.';
        card.appendChild(done);
      }
      host.appendChild(card);
    });
  }catch(_){if(wrap)wrap.hidden=true}
}

async function uploadIdentity(){const documentFile=candidateElements['identity-document'].files[0];const selfieFile=candidateElements['identity-selfie'].files[0];if(!documentFile||!selfieFile){candidateElements['identity-status'].textContent='Selecione o documento e a foto.';candidateElements['identity-status'].classList.add('error');return}const form=new FormData();form.append('document',documentFile);form.append('selfie',selfieFile);candidateElements['submit-identity'].disabled=true;candidateElements['identity-status'].classList.remove('error');candidateElements['identity-status'].textContent='Enviando imagens com segurança...';try{await candidateApi(`/api/participant/attempts/${candidateState.attempt.id}/identity`,{method:'POST',body:form});candidateState.identityReady=true;candidateElements['identity-status'].textContent='Identificação enviada com sucesso.'}catch(error){candidateElements['identity-status'].textContent=error.message;candidateElements['identity-status'].classList.add('error')}finally{candidateElements['submit-identity'].disabled=false}}

async function checkDevices(){candidateElements['check-devices'].disabled=true;candidateElements['device-status'].classList.remove('error');candidateElements['device-status'].textContent='Solicitando permissão...';try{candidateState.deviceStream?.getTracks().forEach(track=>track.stop());candidateState.deviceStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});candidateElements['device-preview'].srcObject=candidateState.deviceStream;candidateElements['device-preview'].hidden=false;await candidateElements['device-preview'].play();const videoReady=candidateState.deviceStream.getVideoTracks().some(track=>track.readyState==='live');const audioReady=candidateState.deviceStream.getAudioTracks().some(track=>track.readyState==='live');candidateState.deviceReady=videoReady&&audioReady;candidateElements['device-status'].textContent=candidateState.deviceReady?'Câmera e microfone funcionando.':'Não foi possível validar os dois equipamentos.'}catch(_){candidateState.deviceReady=false;candidateElements['device-status'].textContent='Permita o acesso à câmera e ao microfone no navegador.';candidateElements['device-status'].classList.add('error')}finally{candidateElements['check-devices'].disabled=false}}

async function checkScreen(){candidateElements['check-screen'].disabled=true;candidateElements['screen-status'].classList.remove('error');candidateElements['screen-status'].textContent='Selecione a opção Tela inteira...';try{candidateState.screenStream?.getTracks().forEach(track=>track.stop());candidateState.screenStream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'monitor'},audio:false});const track=candidateState.screenStream.getVideoTracks()[0];const surface=track.getSettings().displaySurface;candidateState.screenReady=track.readyState==='live'&&(!surface||surface==='monitor');if(!candidateState.screenReady){track.stop();throw new Error('Selecione a tela inteira, não apenas uma guia ou janela.')}track.addEventListener('ended',()=>{candidateState.screenReady=false;candidateElements['screen-status'].textContent='Compartilhamento interrompido.';candidateElements['screen-status'].classList.add('error');setMonitorStatus('monitor-screen-status',false);if(!candidateState.recordingStopping)terminateForSecurity('interrupção do compartilhamento da tela')});candidateElements['screen-status'].textContent='Tela inteira compartilhada com sucesso.'}catch(error){candidateState.screenReady=false;candidateElements['screen-status'].textContent=error.message||'Não foi possível compartilhar a tela inteira.';candidateElements['screen-status'].classList.add('error')}finally{candidateElements['check-screen'].disabled=false}}

function setMonitorStatus(id,active){const element=candidateElements[id];if(!element)return;element.classList.toggle('offline',!active);const icon=element.querySelector('i');if(icon)icon.className=active?'fa-solid fa-circle-check':'fa-solid fa-circle-xmark'}
async function logAuditEvent(type,severity='info',details={}){if(!candidateState.attempt?.id)return;try{await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/audit-events',{method:'POST',keepalive:true,body:JSON.stringify({type,severity,details})})}catch(_){}}

async function checkDevices(){candidateElements['check-devices'].disabled=true;candidateElements['device-status'].classList.remove('error');candidateElements['device-status'].textContent='Solicitando permissão...';try{candidateState.deviceStream?.getTracks().forEach(track=>track.stop());candidateState.deviceStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});candidateElements['device-preview'].srcObject=candidateState.deviceStream;candidateElements['device-preview'].hidden=false;await candidateElements['device-preview'].play();const videoReady=candidateState.deviceStream.getVideoTracks().some(track=>track.readyState==='live');const audioReady=candidateState.deviceStream.getAudioTracks().some(track=>track.readyState==='live');candidateState.deviceReady=videoReady&&audioReady;candidateElements['device-status'].textContent=candidateState.deviceReady?'Câmera e microfone funcionando.':'Não foi possível validar os dois equipamentos.'}catch(_){candidateState.deviceReady=false;candidateElements['device-status'].textContent='Permita o acesso à câmera e ao microfone no navegador.';candidateElements['device-status'].classList.add('error')}finally{candidateElements['check-devices'].disabled=false}}

async function checkScreen(){candidateElements['check-screen'].disabled=true;candidateElements['screen-status'].classList.remove('error');candidateElements['screen-status'].textContent='Selecione a opção Tela inteira...';try{candidateState.screenStream?.getTracks().forEach(track=>track.stop());candidateState.screenStream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'monitor'},audio:false});const track=candidateState.screenStream.getVideoTracks()[0];const surface=track.getSettings().displaySurface;candidateState.screenReady=track.readyState==='live'&&(!surface||surface==='monitor');if(!candidateState.screenReady){track.stop();throw new Error('Selecione a tela inteira, não apenas uma guia ou janela.')}track.addEventListener('ended',()=>{candidateState.screenReady=false;candidateElements['screen-status'].textContent='Compartilhamento interrompido.';candidateElements['screen-status'].classList.add('error');setMonitorStatus('monitor-screen-status',false);if(!candidateState.recordingStopping)terminateForSecurity('interrupção do compartilhamento da tela')});candidateElements['screen-status'].textContent='Tela inteira compartilhada com sucesso.'}catch(error){candidateState.screenReady=false;candidateElements['screen-status'].textContent=error.message||'Não foi possível compartilhar a tela inteira.';candidateElements['screen-status'].classList.add('error')}finally{candidateElements['check-screen'].disabled=false}}

function setMonitorStatus(id,active){const element=candidateElements[id];if(!element)return;element.classList.toggle('offline',!active);const icon=element.querySelector('i');if(icon)icon.className=active?'fa-solid fa-circle-check':'fa-solid fa-circle-xmark'}
async function logAuditEvent(type,severity='info',details={}){if(!candidateState.attempt?.id)return;try{await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/audit-events',{method:'POST',keepalive:true,body:JSON.stringify({type,severity,details})})}catch(_){}}
function supportedRecordingType(){return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>window.MediaRecorder?.isTypeSupported(type))||''}
function drawMonitoringFrame(screenVideo,cameraVideo,canvas){const context=canvas.getContext('2d',{alpha:false});let logoImg=null;if(candidateState.exam?.logoData){logoImg=new Image();logoImg.src=candidateState.exam.logoData}const draw=()=>{if(candidateState.recordingStopping)return;context.fillStyle='#0f172a';context.fillRect(0,0,canvas.width,canvas.height);if(screenVideo.readyState>=2)context.drawImage(screenVideo,0,0,canvas.width,canvas.height);if(cameraVideo.readyState>=2){const width=250,height=150,x=canvas.width-width-24,y=canvas.height-height-24;context.fillStyle='#ffffff';context.fillRect(x-4,y-4,width+8,height+8);context.drawImage(cameraVideo,x,y,width,height)}const companyName=candidateState.exam?.companyName||'Online Teste';context.fillStyle='rgba(15, 23, 42, 0.78)';context.fillRect(16,16,290,44);context.fillStyle='#ffffff';context.font='bold 14px sans-serif';if(logoImg&&logoImg.complete&&logoImg.naturalWidth){context.drawImage(logoImg,24,22,32,32);context.fillText(companyName.slice(0,22),64,43)}else{context.fillText(companyName.slice(0,25),28,43)}candidateState.canvasTimer=requestAnimationFrame(draw)};draw()}
function queueRecordingChunk(blob){if(!blob||!blob.size||candidateState.recordingFailed)return;const sequence=candidateState.chunkSequence++;candidateState.uploadQueue=candidateState.uploadQueue.then(async()=>{const form=new FormData();form.append('chunk',blob,'fragmento-'+sequence+'.webm');form.append('sequence',String(sequence));form.append('durationMs','5000');await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/recording/chunks',{method:'POST',body:form});candidateState.uploadedChunks++;candidateElements['recording-sync-status'].textContent='Evidências sincronizadas';candidateElements['recording-chunk-status'].textContent=candidateState.uploadedChunks+' fragmento'+(candidateState.uploadedChunks===1?'':'s')+' enviado'+(candidateState.uploadedChunks===1?'':'s')}).catch(async error=>{candidateState.recordingFailed=true;candidateElements['recording-sync-status'].textContent='Falha ao sincronizar gravação';candidateElements['recording-chunk-status'].textContent=error.message;await logAuditEvent('chunk_upload_failed','critical',{sequence,message:error.message});if(!candidateState.recordingStopping)terminateForSecurity('falha no envio da gravação de auditoria')})}
async function startProctoring(){if(!candidateState.exam.requireRecording)return;if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('Use uma versão atual do Chrome ou Edge para realizar este teste.');const screenTrack=candidateState.screenStream?.getVideoTracks()[0];const cameraTrack=candidateState.deviceStream?.getVideoTracks()[0];const microphoneTrack=candidateState.deviceStream?.getAudioTracks()[0];if(!screenTrack||!cameraTrack||!microphoneTrack)throw new Error('Câmera, microfone e tela inteira precisam permanecer ativos.');candidateState.recordingStopping=false;candidateState.recordingFailed=false;candidateState.chunkSequence=Number(candidateState.exam.recordingNextSequence||0);candidateState.uploadedChunks=0;candidateState.uploadQueue=Promise.resolve();const screenVideo=document.createElement('video');screenVideo.srcObject=candidateState.screenStream;screenVideo.muted=true;screenVideo.playsInline=true;const cameraVideo=document.createElement('video');cameraVideo.srcObject=candidateState.deviceStream;cameraVideo.muted=true;cameraVideo.playsInline=true;await Promise.all([screenVideo.play(),cameraVideo.play()]);const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;candidateState.recordingCanvas=canvas;drawMonitoringFrame(screenVideo,cameraVideo,canvas);const composed=canvas.captureStream(12);composed.addTrack(microphoneTrack);candidateState.recordingStream=composed;const mimeType=supportedRecordingType();candidateState.recorder=new MediaRecorder(composed,{...(mimeType?{mimeType}:{}),videoBitsPerSecond:1200000,audioBitsPerSecond:64000});candidateState.recorder.addEventListener('dataavailable',event=>queueRecordingChunk(event.data));candidateState.recorder.addEventListener('error',async event=>{candidateState.recordingFailed=true;await logAuditEvent('recording_error','critical',{message:event.error?.message||'Falha no gravador'});if(!candidateState.recordingStopping)terminateForSecurity('falha na gravação de auditoria')});cameraTrack.addEventListener('ended',()=>{setMonitorStatus('monitor-camera-status',false);if(!candidateState.recordingStopping)terminateForSecurity('interrupção da câmera')});microphoneTrack.addEventListener('ended',()=>{setMonitorStatus('monitor-microphone-status',false);if(!candidateState.recordingStopping)terminateForSecurity('interrupção do microfone')});candidateElements['monitor-camera'].srcObject=candidateState.deviceStream;await candidateElements['monitor-camera'].play();setMonitorStatus('monitor-camera-status',true);setMonitorStatus('monitor-microphone-status',true);setMonitorStatus('monitor-screen-status',true);candidateElements['recording-sync-status'].textContent='Gravação iniciada';candidateElements['recording-chunk-status'].textContent='Aguardando primeiro fragmento';candidateState.recorder.start(5000);await logAuditEvent('recording_started','info',{mimeType:candidateState.recorder.mimeType});initCandidateWebRTC();}
async function stopProctoring(finalize=true){if(!candidateState.exam?.requireRecording)return;stopCandidateWebRTC();candidateState.recordingStopping=true;const recorder=candidateState.recorder;if(recorder&&recorder.state!=='inactive'){await new Promise(resolve=>{const timeout=setTimeout(resolve,3500);recorder.addEventListener('stop',()=>{clearTimeout(timeout);resolve()},{once:true});try{recorder.requestData();recorder.stop()}catch(_){clearTimeout(timeout);resolve()}})}await candidateState.uploadQueue;if(finalize&&candidateState.uploadedChunks&&!candidateState.recordingFailed){try{await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/recording/complete',{method:'POST',body:'{}'});candidateElements['recording-sync-status'].textContent='Gravação concluída'}catch(error){candidateState.recordingFailed=true;await logAuditEvent('recording_error','critical',{message:error.message})}}if(candidateState.canvasTimer)cancelAnimationFrame(candidateState.canvasTimer);candidateState.recordingStream?.getTracks().forEach(track=>track.stop());candidateState.screenStream?.getTracks().forEach(track=>track.stop());candidateState.deviceStream?.getTracks().forEach(track=>track.stop());candidateState.recorder=null;candidateState.recordingStream=null;candidateState.screenStream=null;candidateState.deviceStream=null}
async function enterSecureFullscreen(){if(!document.documentElement.requestFullscreen)throw new Error('Este navegador não oferece o modo de tela cheia exigido.');if(!document.fullscreenElement)await document.documentElement.requestFullscreen()}
let waitingRoomTimer = null;

function enterWaitingRoom() {
  if (!candidateState.attempt) return;
  showCandidateView('waiting-room-view');

  const logoEl = candidateElements['waiting-room-logo'] || document.getElementById('waiting-room-logo');
  if (logoEl) {
    logoEl.src = candidateState.branding?.logoData || candidateState.exam?.logoData || './assets/images/Logo_com_Slogan (sem fundo).png';
  }
  const compEl = candidateElements['waiting-room-company'] || document.getElementById('waiting-room-company');
  if (compEl) {
    compEl.textContent = candidateState.exam?.companyName || 'Empresa';
  }
  const titleEl = candidateElements['waiting-room-exam-title'] || document.getElementById('waiting-room-exam-title');
  if (titleEl) {
    titleEl.textContent = candidateState.exam?.title || 'Exame';
  }
  const nameEl = candidateElements['waiting-room-candidate-name'] || document.getElementById('waiting-room-candidate-name');
  if (nameEl) {
    nameEl.textContent = candidateState.user?.name || candidateState.attempt?.fullName || 'Participante';
  }

  const cam = document.getElementById('waiting-check-camera');
  if (cam) cam.innerHTML = candidateState.deviceReady ? '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Câmera validada' : '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Câmera pendente';
  const mic = document.getElementById('waiting-check-mic');
  if (mic) mic.innerHTML = candidateState.deviceReady ? '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Microfone validado' : '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Microfone pendente';
  const scr = document.getElementById('waiting-check-screen');
  if (scr) scr.innerHTML = candidateState.screenReady ? '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Tela compartilhada' : '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Tela pendente';
  const iden = document.getElementById('waiting-check-identity');
  if (iden) {
    const needId = candidateState.exam?.requireIdentity;
    const ok = !needId || candidateState.identityReady;
    iden.innerHTML = ok ? '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Identidade OK' : '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Identidade pendente';
  }

  startWaitingRoomPolling();
  startCandidateChat();
}

function startWaitingRoomPolling() {
  if (waitingRoomTimer) clearInterval(waitingRoomTimer);
  waitingRoomTimer = setInterval(async () => {
    if (!candidateState.attempt?.id) return;
    try {
      const data = await candidateApi('/api/participant/attempts/' + candidateState.attempt.id);
      if (data.attempt && data.attempt.status === 'in_progress') {
        clearInterval(waitingRoomTimer);
        waitingRoomTimer = null;
        candidateState.attempt = data.attempt;
        candidateState.exam = data.exam;
        applyCandidateBranding(data.branding);
        await startProctoring();
        await loadAttempt(candidateState.attempt.id);
        candidateState.enforcementArmed = true;
      }
    } catch (_) {}
  }, 3000);
}

async function startAttempt(){const requireIdentity=candidateState.exam.requireIdentity;const requireRecording=candidateState.exam.requireRecording;const consent=candidateElements['recording-consent'].checked;if(requireIdentity&&!candidateState.identityReady){setPreflightError('Envie sua identificação antes de iniciar.');return}if(requireRecording&&!candidateState.deviceReady){setPreflightError('Teste a câmera e o microfone antes de iniciar.');return}if(requireRecording&&!candidateState.screenReady){setPreflightError('Compartilhe a tela inteira antes de iniciar.');return}if(requireRecording&&!consent){setPreflightError('Marque a autorização de áudio, imagem e tela para continuar.');return}candidateElements['start-attempt'].disabled=true;candidateElements['preflight-message'].classList.remove('error');candidateElements['preflight-message'].textContent='Concluindo verificações...';try{await enterSecureFullscreen();const res=await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/start',{method:'POST',body:JSON.stringify({consentRecording:consent,cameraChecked:candidateState.deviceReady,microphoneChecked:candidateState.deviceReady,screenChecked:candidateState.screenReady,resumeCode:candidateElements['resume-code'].value.trim().toUpperCase()})});if(res.status==='waiting_proctor'||candidateState.attempt.status==='waiting_proctor'){candidateState.attempt.status='waiting_proctor';enterWaitingRoom();return}await startProctoring();await loadAttempt(candidateState.attempt.id);candidateState.enforcementArmed=true}catch(error){candidateState.enforcementArmed=false;candidateState.recordingStopping=true;candidateState.recorder?.state!=='inactive'&&candidateState.recorder?.stop();candidateState.screenStream?.getTracks().forEach(track=>track.stop());candidateState.deviceStream?.getTracks().forEach(track=>track.stop());if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});setPreflightError(error.message)}finally{candidateElements['start-attempt'].disabled=false}}
function setPreflightError(message){candidateElements['preflight-message'].textContent=message;candidateElements['preflight-message'].classList.add('error')}

async function loadAttempt(attemptId,completionOnly=false){try{const data=await candidateApi(`/api/participant/attempts/${attemptId}`);candidateState.attempt=data.attempt;candidateState.exam=data.exam;candidateState.answers=data.attempt.answers||{};applyCandidateBranding(data.branding);if(data.attempt.status==='waiting_proctor'){enterWaitingRoom();return}if(data.attempt.status==='submitted'||completionOnly){candidateState.enforcementArmed=false;renderCompletion(data.result);showCandidateView('completion-view');return}candidateState.questionIndex=0;candidateElements['exam-title'].textContent=data.exam.title;renderQuestionNavigation();renderQuestion();startTimer(data.attempt.remainingSeconds);startAutosave();showCandidateView('exam-view');startCandidateChat()}catch(error){candidateToast(error.message,'error')}}
function applyCandidateBranding(branding){if(!branding)return;const root=document.documentElement;root.style.setProperty('--candidate-primary',branding.primaryColor||'#0f6f73');root.style.setProperty('--candidate-accent',branding.accentColor||'#2a9d8f');root.style.setProperty('--candidate-background',branding.backgroundColor||'#f3f7f7');root.style.setProperty('--candidate-radius',({small:'8px',medium:'14px',large:'22px'}[branding.borderRadius]||'14px'));root.style.fontFamily=`${branding.fontFamily||'Inter'}, "Segoe UI", Arial, sans-serif`;candidateElements['candidate-company'].textContent=candidateState.exam?.companyName||'Online Teste';candidateElements['candidate-logo'].src=branding.logoData||'./assets/images/Logo_com_Slogan (sem fundo).png'}

function renderQuestionNavigation(){const host=candidateElements['question-navigation'];host.replaceChildren();candidateState.exam.questions.forEach((question,index)=>{const button=document.createElement('button');button.type='button';button.textContent=String(index+1);button.classList.toggle('active',index===candidateState.questionIndex);button.classList.toggle('answered',Boolean(String(candidateState.answers[question.id]||'').trim()));button.setAttribute('aria-label',`Ir para a questão ${index+1}`);button.addEventListener('click',()=>{candidateState.questionIndex=index;renderQuestion();renderQuestionNavigation()});host.appendChild(button)})}
function renderQuestion(){const questions=candidateState.exam.questions;const question=questions[candidateState.questionIndex];if(!question)return;const scoreless=candidateState.exam?.gradingScale?.type==='none';candidateElements['exam-progress-label'].textContent=`Questão ${candidateState.questionIndex+1} de ${questions.length}`;const host=candidateElements['question-container'];host.replaceChildren();const number=document.createElement('span');number.className='question-number';number.textContent=`QUESTÃO ${candidateState.questionIndex+1}`;const points=document.createElement('span');points.className='question-points';points.textContent=scoreless?'Perfil comportamental':`${question.points} ponto${question.points===1?'':'s'}`;number.appendChild(points);const title=document.createElement('h2');title.textContent=question.prompt;host.append(number,title);const imageSource=question.imageData||question.imageUrl||'';if(imageSource){const figure=document.createElement('figure');figure.className='question-visual';const image=document.createElement('img');image.src=imageSource;image.alt=question.imageAlt||question.imageName||'Imagem da questão';image.loading='lazy';figure.appendChild(image);host.appendChild(figure);}if(['long_answer','essay'].includes(question.type)){const textarea=document.createElement('textarea');textarea.className='essay-answer';textarea.placeholder='Digite sua resposta com clareza...';textarea.maxLength=question.maxCharacters||10000;textarea.value=candidateState.answers[question.id]||'';textarea.addEventListener('input',()=>updateAnswer(question.id,textarea.value));host.appendChild(textarea)}else if(question.type==='short_answer'){const input=document.createElement('input');input.type='text';input.className='short-answer-input';input.placeholder='Digite sua resposta curta...';input.maxLength=500;input.value=candidateState.answers[question.id]||'';input.addEventListener('input',()=>updateAnswer(question.id,input.value));host.appendChild(input)}else if(question.type==='multiple_choice'){const options=document.createElement('div');options.className='answer-options';let selectedList=[];try{const raw=candidateState.answers[question.id];if(Array.isArray(raw))selectedList=raw;else if(raw&&raw.startsWith('['))selectedList=JSON.parse(raw);else if(raw)selectedList=[raw];}catch(_){selectedList=[];}(question.options||[]).forEach((option,index)=>{const label=document.createElement('label');label.className='answer-option';const input=document.createElement('input');input.type='checkbox';input.name=`answer-${question.id}`;input.value=option;input.checked=selectedList.includes(option);input.addEventListener('change',()=>{if(input.checked){if(!selectedList.includes(option))selectedList.push(option);}else{selectedList=selectedList.filter(item=>item!==option);}updateAnswer(question.id,JSON.stringify(selectedList));});const marker=document.createElement('strong');marker.textContent=String.fromCharCode(65+index);const copy=document.createElement('span');copy.textContent=option;label.append(input,marker,copy);options.appendChild(label)});host.appendChild(options)}else{const options=document.createElement('div');options.className='answer-options';(question.options||[]).forEach((option,index)=>{const label=document.createElement('label');label.className='answer-option';const input=document.createElement('input');input.type='radio';input.name=`answer-${question.id}`;input.value=option;input.checked=candidateState.answers[question.id]===option;input.addEventListener('change',()=>updateAnswer(question.id,option));const marker=document.createElement('strong');marker.textContent=String.fromCharCode(65+index);const copy=document.createElement('span');copy.textContent=option;label.append(input,marker,copy);options.appendChild(label)});host.appendChild(options)}candidateElements['previous-question'].disabled=candidateState.questionIndex===0;const last=candidateState.questionIndex===questions.length-1;candidateElements['next-question'].hidden=last;candidateElements['finish-attempt'].hidden=!last}
function updateAnswer(id,value){candidateState.answers[id]=value;candidateElements['autosave-status'].classList.add('saving');candidateElements['autosave-status'].lastChild.textContent=' Salvando...';renderQuestionNavigation()}
function navigateQuestion(offset){const next=Math.max(0,Math.min(candidateState.exam.questions.length-1,candidateState.questionIndex+offset));candidateState.questionIndex=next;renderQuestion();renderQuestionNavigation()}
async function saveAnswers(silent=true){if(!candidateState.attempt||candidateState.attempt.status!=='in_progress')return;candidateElements['autosave-status'].classList.add('saving');try{await candidateApi(`/api/participant/attempts/${candidateState.attempt.id}/answers`,{method:'PUT',body:JSON.stringify({answers:candidateState.answers})});candidateElements['autosave-status'].classList.remove('saving');candidateElements['autosave-status'].lastChild.textContent=' Respostas salvas'}catch(error){candidateElements['autosave-status'].lastChild.textContent=' Falha ao salvar';if(!silent)candidateToast(error.message,'error')}}
function startAutosave(){clearInterval(candidateState.autosave);candidateState.autosave=setInterval(()=>saveAnswers(),15000)}
function startTimer(seconds){clearInterval(candidateState.timer);let remaining=Math.max(0,Number(seconds||0));const render=()=>{const hours=Math.floor(remaining/3600);const minutes=Math.floor((remaining%3600)/60);const secs=remaining%60;candidateElements['exam-timer'].textContent=[hours,minutes,secs].map(value=>String(value).padStart(2,'0')).join(':');candidateElements['timer-card'].classList.toggle('warning',remaining<=600&&remaining>120);candidateElements['timer-card'].classList.toggle('danger',remaining<=120);if(remaining<=0){clearInterval(candidateState.timer);submitAttempt(true);return}remaining--};render();candidateState.timer=setInterval(render,1000)}
function openFinishConfirmation(){candidateElements['finish-confirmation'].hidden=false}
async function submitAttempt(automatic=false){if(candidateState.submitting)return;candidateState.submitting=true;candidateState.enforcementArmed=false;candidateElements['finish-confirmation'].hidden=true;clearInterval(candidateState.timer);clearInterval(candidateState.autosave);try{await saveAnswers(true);await stopProctoring();const terminationReason=candidateState.recordingFailed?'falha na gravação de auditoria':'';const data=await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/submit',{method:'POST',body:JSON.stringify({answers:candidateState.answers,automatic,terminationReason})});candidateState.attempt.status='submitted';renderCompletion({score:data.score,grade:data.grade,status:data.resultStatus,releaseStatus:data.releaseStatus},terminationReason);showCandidateView('completion-view');if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});candidateToast(terminationReason?'O teste foi enviado para revisão por falha na gravação.':automatic?'O tempo terminou e suas respostas foram enviadas.':'Teste enviado com sucesso.',terminationReason?'error':'success')}catch(error){candidateState.submitting=false;candidateState.enforcementArmed=true;candidateToast(error.message,'error');startTimer(30)}}
function secureExamActive(){return candidateState.enforcementArmed&&!candidateState.submitting&&candidateState.attempt?.status==='in_progress'&&!candidateElements['exam-view'].hidden}
async function terminateForSecurity(reason){if(!secureExamActive())return;candidateState.submitting=true;candidateState.enforcementArmed=false;candidateState.attempt.status='submitted';clearInterval(candidateState.timer);clearInterval(candidateState.autosave);candidateElements['finish-confirmation'].hidden=true;const eventType=reason.includes('tela cheia')?'fullscreen_exit':reason.includes('compartilhamento')?'screen_share_stopped':reason.includes('guia')||reason.includes('fora da prova')?'focus_lost':'recording_error';await logAuditEvent(eventType,'critical',{reason});renderCompletion({status:'invalidated',releaseStatus:'pending'},reason);showCandidateView('completion-view');try{await stopProctoring();const payload={automatic:true,terminationReason:reason};const savedAnswers=JSON.stringify(candidateState.answers);if(savedAnswers.length<45000)payload.answers=candidateState.answers;await candidateApi('/api/participant/attempts/'+candidateState.attempt.id+'/submit',{method:'POST',keepalive:true,body:JSON.stringify(payload)});candidateToast('O teste foi encerrado e a ocorrência foi registrada.','error')}catch(error){candidateToast('O teste foi bloqueado. Mantenha a conexão para registrar a ocorrência.','error')}finally{if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{})}}
function renderCompletion(result,violationReason=''){const storedReason=String(result?.notes||'').replace('Encerramento automático de segurança: ','');const reason=violationReason||storedReason||'violação do ambiente seguro';const violated=Boolean(violationReason)||result?.status==='invalidated';const released=result?.releaseStatus==='released';candidateElements['completion-card'].classList.toggle('violation',violated);candidateElements['completion-icon'].innerHTML=violated?'<i class="fa-solid fa-lock"></i>':'<i class="fa-solid fa-check"></i>';candidateElements['completion-eyebrow'].textContent=violated?'TESTE ENCERRADO':'TESTE CONCLUÍDO';candidateElements['completion-title'].textContent=violated?'A prova foi fechada por segurança':'Suas respostas foram enviadas';candidateElements['completion-message'].textContent=violated?`Foi detectada uma saída do ambiente da prova: ${reason}. As respostas foram enviadas e a ocorrência ficará disponível para análise.`:(released?'Seu resultado foi calculado e já está disponível.':'A empresa responsável fará a revisão e liberará o resultado.');candidateElements['completion-result'].hidden=violated||!released;if(released&&!violated){const grade=result.grade;candidateElements['completion-score'].textContent=grade?(grade.type==='none'?(grade.label||'Sem pontuação'):(grade.type==='concept'?(String(grade.value)+' — '+String(grade.label||'')):(Number(grade.value||0).toLocaleString('pt-BR')+' / '+grade.maximum))):(Number(result.score||0).toLocaleString('pt-BR')+'%');candidateElements['completion-status'].textContent=statusLabels[result.status]||'Resultado disponível'}}

function stopCandidateChat(){if(candidateState.chatTimer){clearInterval(candidateState.chatTimer);candidateState.chatTimer=null}}
function appendCandidateChat(messages){const hosts=[candidateElements['candidate-chat-messages'], document.getElementById('waiting-chat-messages')].filter(Boolean);if(!messages.length)return;hosts.forEach(host => {host.querySelector('.chat-empty')?.remove();messages.forEach(item=>{candidateState.chatLastId=Math.max(candidateState.chatLastId,Number(item.id||0));const bubble=document.createElement('article');bubble.className=`candidate-chat-message ${item.senderType}`;const copy=document.createElement('span');copy.textContent=item.message;const meta=document.createElement('small');const time=item.createdAt?new Date(item.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';meta.textContent=`${item.senderType==='company'?'Aplicador':'Você'}${time?' · '+time:''}`;bubble.append(copy,meta);host.appendChild(bubble);});host.scrollTop=host.scrollHeight;});const companyMsg = messages.some(m => m.senderType === 'company');if(companyMsg){if(candidateElements['candidate-chat-alert']) candidateElements['candidate-chat-alert'].hidden=false;const wAlert = document.getElementById('waiting-chat-alert');if(wAlert) wAlert.hidden = false;candidateToast('Nova mensagem do aplicador.');}}
async function pollCandidateChat(){if(!candidateState.attempt?.id||candidateState.remoteTransition)return;const inExam=!candidateElements['exam-view']?.hidden;const inWaiting=!document.getElementById('waiting-room-view')?.hidden;if(!inExam&&!inWaiting)return;try{const data=await candidateApi(`/api/participant/attempts/${candidateState.attempt.id}/chat?after=${candidateState.chatLastId}`);appendCandidateChat(data.messages||[]);if(data.attemptStatus==='paused')await handleCompanyPause();else if(data.attemptStatus==='closed')await handleCompanyClose()}catch(error){if(error.status===401||error.status===403)stopCandidateChat()}}
function startCandidateChat(){stopCandidateChat();candidateState.chatLastId=0;if(candidateElements['candidate-chat-alert'])candidateElements['candidate-chat-alert'].hidden=true;const wAlert=document.getElementById('waiting-chat-alert');if(wAlert)wAlert.hidden=true;if(candidateElements['candidate-chat-messages'])candidateElements['candidate-chat-messages'].innerHTML='<p class="chat-empty">Nenhuma mensagem ainda.</p>';const wMessages=document.getElementById('waiting-chat-messages');if(wMessages)wMessages.innerHTML='<p class="chat-empty">Nenhuma mensagem ainda.</p>';pollCandidateChat();candidateState.chatTimer=setInterval(pollCandidateChat,3000)}
async function sendCandidateChat(event){event.preventDefault();const form=event.target;const input=form.querySelector('input')||candidateElements['candidate-chat-input'];const message=input?input.value.trim():'';if(!message||!candidateState.attempt?.id)return;const button=form.querySelector('button');if(button)button.disabled=true;try{await candidateApi(`/api/participant/attempts/${candidateState.attempt.id}/chat`,{method:'POST',body:JSON.stringify({message})});if(input)input.value='';await pollCandidateChat()}catch(error){candidateToast(error.message,'error')}finally{if(button)button.disabled=false;if(input)input.focus()}}
async function handleCompanyPause(){if(candidateState.remoteTransition)return;candidateState.remoteTransition=true;candidateState.enforcementArmed=false;clearInterval(candidateState.timer);clearInterval(candidateState.autosave);stopCandidateChat();try{await stopProctoring(false);if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});candidateState.attempt.status='paused';const assignment=candidateState.assignments.find(item=>Number(item.examId)===Number(candidateState.exam.id))||{examId:candidateState.exam.id};await openAssignment(assignment);candidateElements['preflight-message'].classList.remove('error');candidateElements['preflight-message'].textContent='A empresa pausou o teste. Aguarde o código especial enviado por e-mail para retomar.';candidateToast('O teste foi pausado pela empresa.')}finally{candidateState.remoteTransition=false}}
async function handleCompanyClose(){if(candidateState.remoteTransition)return;candidateState.remoteTransition=true;candidateState.enforcementArmed=false;candidateState.submitting=true;clearInterval(candidateState.timer);clearInterval(candidateState.autosave);stopCandidateChat();try{await stopProctoring(true)}catch(_){}if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});candidateState.attempt.status='closed';candidateElements['completion-card'].classList.add('violation');candidateElements['completion-icon'].innerHTML='<i class="fa-solid fa-lock"></i>';candidateElements['completion-eyebrow'].textContent='AVALIAÇÃO ENCERRADA';candidateElements['completion-title'].textContent='O teste foi fechado pela empresa';candidateElements['completion-message'].textContent='O aplicador encerrou esta avaliação. As respostas e evidências já registradas permanecem disponíveis para análise.';candidateElements['completion-result'].hidden=true;showCandidateView('completion-view');candidateToast('A avaliação foi encerrada pela empresa.','error')}
function bindCandidateEvents(){candidateElements['candidate-chat-form'].addEventListener('submit',sendCandidateChat);candidateElements['candidate-chat-input'].addEventListener('input',()=>candidateElements['candidate-chat-alert'].hidden=true);const wForm=document.getElementById('waiting-chat-form');if(wForm)wForm.addEventListener('submit',sendCandidateChat);const wInput=document.getElementById('waiting-chat-input');if(wInput)wInput.addEventListener('input',()=>{const wAlert=document.getElementById('waiting-chat-alert');if(wAlert)wAlert.hidden=true});candidateElements['back-to-assignments'].addEventListener('click',()=>showCandidateView('assignments-view'));candidateElements['identity-document'].addEventListener('change',()=>candidateElements['document-label'].textContent=candidateElements['identity-document'].files[0]?.name||'Selecionar documento');candidateElements['identity-selfie'].addEventListener('change',()=>candidateElements['selfie-label'].textContent=candidateElements['identity-selfie'].files[0]?.name||'Tirar ou selecionar foto');candidateElements['submit-identity'].addEventListener('click',uploadIdentity);candidateElements['check-devices'].addEventListener('click',checkDevices);candidateElements['check-screen'].addEventListener('click',checkScreen);candidateElements['start-attempt'].addEventListener('click',startAttempt);candidateElements['previous-question'].addEventListener('click',()=>navigateQuestion(-1));candidateElements['next-question'].addEventListener('click',()=>navigateQuestion(1));candidateElements['finish-attempt'].addEventListener('click',openFinishConfirmation);document.getElementById('cancel-finish').addEventListener('click',()=>candidateElements['finish-confirmation'].hidden=true);document.getElementById('confirm-finish').addEventListener('click',()=>submitAttempt(false));document.getElementById('completion-back').addEventListener('click',async()=>{showCandidateView('assignments-view');await loadAssignments()});candidateElements['candidate-logout'].addEventListener('click',async()=>{try{await candidateApi('/logout',{method:'POST'})}finally{window.location.replace('index.html')}});document.addEventListener('visibilitychange',()=>{if(document.hidden)terminateForSecurity('troca de guia, janela ou minimização')});window.addEventListener('blur',()=>{setTimeout(()=>{if(!document.hasFocus())terminateForSecurity('abertura de outro item fora da prova')},120)});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)terminateForSecurity('saída do modo de tela cheia')});window.addEventListener('pagehide',()=>terminateForSecurity('saída ou fechamento da página'));window.addEventListener('beforeunload',event=>{if(secureExamActive()){terminateForSecurity('saída ou atualização da página');event.preventDefault();event.returnValue=''}});document.addEventListener('contextmenu',event=>{if(!candidateElements['exam-view'].hidden)event.preventDefault()});document.addEventListener('copy',event=>{if(!candidateElements['exam-view'].hidden)event.preventDefault()})}
// -------------------------------------------------------------------
// Controle de inicialização: separa contexto real (participante) do
// contexto de prévia (admin). O simples carregamento do script no
// painel administrativo NÃO executa loadAssignments nem bindCandidateEvents.
// -------------------------------------------------------------------

// AbortController para remover listeners ao fechar a prévia sem duplicação.
let _previewEventController = null;

// Expõe ponto de entrada exclusivo para o painel admin usar na prévia.
// Chamado por openCandidatePreviewModal() em company-dashboard.js.
window.initCandidatePreview = function(draftExamData) {
  // Reset completo de estado antes de inicializar
  clearInterval(candidateState.timer);
  clearInterval(candidateState.autosave);
  if (candidateState.chatTimer) clearInterval(candidateState.chatTimer);
  if (candidateState.canvasTimer) cancelAnimationFrame(candidateState.canvasTimer);
  candidateState.deviceStream?.getTracks().forEach(t => t.stop());
  candidateState.screenStream?.getTracks().forEach(t => t.stop());
  candidateState.recordingStream?.getTracks().forEach(t => t.stop());

  // Reinicia cada campo do estado
  Object.assign(candidateState, {
    user: null, assignments: [], exam: null, attempt: null, answers: {},
    questionIndex: 0, timer: null, autosave: null,
    deviceStream: null, screenStream: null, recordingStream: null,
    recorder: null, recordingCanvas: null, canvasTimer: null,
    deviceReady: false, screenReady: false, identityReady: false,
    submitting: false, enforcementArmed: false, recordingStopping: false,
    recordingFailed: false, chunkSequence: 0, uploadedChunks: 0,
    uploadQueue: Promise.resolve(), chatTimer: null, chatLastId: 0,
    remoteTransition: false
  });

  // Ativa o adaptador de prévia e reseta seu mockState
  window.CandidatePreviewAdapter.activate(draftExamData);

  // Atualiza referências DOM (o shell do player está dentro do modal)
  cacheCandidateElements();

  // Bind idempotente: cancela listeners anteriores antes de registrar novos
  if (_previewEventController) _previewEventController.abort();
  _previewEventController = new AbortController();
  const { signal } = _previewEventController;
  bindCandidatePreviewEvents(signal);

  // Popula candidateState com os dados do rascunho
  const duration = draftExamData.duration || 60;
  candidateState.exam = draftExamData;
  candidateState.attempt = {
    id: 'preview-mock',
    status: 'in_progress',
    remainingSeconds: duration * 60,
    answers: {}
  };
  candidateState.answers = {};
  candidateState.questionIndex = 0;

  // Aplica branding e renderiza o player
  if (draftExamData.branding) applyCandidateBranding(draftExamData.branding);
  if (candidateElements['candidate-name']) candidateElements['candidate-name'].textContent = 'Participante (Prévia)';
  if (candidateElements['candidate-initials']) candidateElements['candidate-initials'].textContent = 'PT';
  if (candidateElements['candidate-company']) candidateElements['candidate-company'].textContent = draftExamData.companyName || 'Online Teste';
  if (candidateElements['candidate-exam-title'] || candidateElements['exam-title']) {
    (candidateElements['exam-title'] || candidateElements['candidate-exam-title']).textContent = draftExamData.title || 'Teste';
  }

  renderQuestionNavigation();
  renderQuestion();
  startTimer(candidateState.attempt.remainingSeconds);
  showCandidateView('exam-view');
};

// Limpeza completa ao fechar o modal de prévia.
// Chamado por closeCandidatePreviewModal() em company-dashboard.js.
window.destroyCandidatePreview = function() {
  // Para timers e polling
  clearInterval(candidateState.timer);
  clearInterval(candidateState.autosave);
  if (candidateState.chatTimer) clearInterval(candidateState.chatTimer);
  if (candidateState.canvasTimer) cancelAnimationFrame(candidateState.canvasTimer);
  candidateState.timer = null;
  candidateState.autosave = null;
  candidateState.chatTimer = null;
  candidateState.canvasTimer = null;

  // Para streams de mídia (não iniciados no preview, mas por segurança)
  candidateState.deviceStream?.getTracks().forEach(t => t.stop());
  candidateState.screenStream?.getTracks().forEach(t => t.stop());
  candidateState.recordingStream?.getTracks().forEach(t => t.stop());

  // Revoga object URLs criados por candidateDocumentObjectUrl
  document.querySelectorAll('#candidate-preview-container iframe[src^="blob:"], #candidate-preview-container img[src^="blob:"]').forEach(el => {
    try { URL.revokeObjectURL(el.src); } catch (_) {}
  });

  // Reseta todo o candidateState
  Object.assign(candidateState, {
    user: null, assignments: [], exam: null, attempt: null, answers: {},
    questionIndex: 0, timer: null, autosave: null,
    deviceStream: null, screenStream: null, recordingStream: null,
    recorder: null, recordingCanvas: null, canvasTimer: null,
    deviceReady: false, screenReady: false, identityReady: false,
    submitting: false, enforcementArmed: false, recordingStopping: false,
    recordingFailed: false, chunkSequence: 0, uploadedChunks: 0,
    uploadQueue: Promise.resolve(), chatTimer: null, chatLastId: 0,
    remoteTransition: false
  });

  // Remove todos os listeners do preview via AbortController
  if (_previewEventController) { _previewEventController.abort(); _previewEventController = null; }

  // Desativa o adaptador e limpa mockState
  window.CandidatePreviewAdapter.deactivate();

  // Esvazia DOM para que próxima abertura comece limpa
  if (candidateElements['question-container']) candidateElements['question-container'].replaceChildren();
  if (candidateElements['question-navigation']) candidateElements['question-navigation'].replaceChildren();
  if (candidateElements['candidate-toast-region']) candidateElements['candidate-toast-region'].replaceChildren();
};

// Bind de eventos específico para o contexto de prévia (escopo de signal).
// Ao abortar o signal todos os listeners são removidos automaticamente.
function bindCandidatePreviewEvents(signal) {
  const el = candidateElements;
  if (el['previous-question']) el['previous-question'].addEventListener('click', () => navigateQuestion(-1), { signal });
  if (el['next-question']) el['next-question'].addEventListener('click', () => navigateQuestion(1), { signal });
  if (el['finish-attempt']) el['finish-attempt'].addEventListener('click', openFinishConfirmation, { signal });
  const cancelFinish = document.getElementById('cancel-finish');
  const confirmFinish = document.getElementById('confirm-finish');
  if (cancelFinish) cancelFinish.addEventListener('click', () => { if (el['finish-confirmation']) el['finish-confirmation'].hidden = true; }, { signal });
  if (confirmFinish) confirmFinish.addEventListener('click', () => submitAttempt(false), { signal });
  const completionBack = document.getElementById('completion-back');
  if (completionBack) completionBack.addEventListener('click', () => {
    // Em modo prévia, "Refazer prévia" reinicia a prévia do zero
    if (window.CandidatePreviewAdapter && window.CandidatePreviewAdapter.active) {
      const draft = window.CandidatePreviewAdapter.mockState && window.CandidatePreviewAdapter.mockState.exam;
      if (draft) window.initCandidatePreview(draft);
    }
  }, { signal });
  if (el['start-attempt']) el['start-attempt'].addEventListener('click', () => {
    // Em modo de prévia, Iniciar pula o preflight e vai direto para o exame
    if (window.CandidatePreviewAdapter && window.CandidatePreviewAdapter.active) {
      showCandidateView('exam-view');
    }
  }, { signal });
}

// Inicialização real do participante: só executa em AreaParticipante.html
// (identificado por window.__ACERT_CONTEXT__ === 'candidate')
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__ACERT_CONTEXT__ !== 'candidate') {
    // Contexto de admin ou outro: NÃO inicializa o player real.
    // O script foi carregado apenas para expor initCandidatePreview() e
    // as funções de renderização que a prévia reutiliza.
    return;
  }
  cacheCandidateElements();
  bindCandidateEvents();
  await loadAssignments();
});

// ---------------------------------------------------------------------------
// Abstração de Sinalização e Transmissão WebRTC P2P (ETAPA 7.2B)
// ---------------------------------------------------------------------------

window.ACERT_ICE_SERVERS = window.ACERT_ICE_SERVERS || [{ urls: 'stun:stun.l.google.com:19302' }];

async function sendCandidateWebRTCSignal(signalType, payload) {
  if (!candidateState.attempt || !candidateState.attempt.id) {
    throw new Error('Tentativa não identificada para envio de sinalização.');
  }
  return await candidateApi('/api/webrtc/signal', {
    method: 'POST',
    body: JSON.stringify({
      attemptId: candidateState.attempt.id,
      signalType: signalType,
      payload: payload
    })
  });
}

async function pollCandidateWebRTCSignals(lastId = 0) {
  if (!candidateState.attempt || !candidateState.attempt.id) {
    return { success: false, signals: [], count: 0 };
  }
  return await candidateApi(
    `/api/webrtc/signals?attemptId=${candidateState.attempt.id}&lastId=${lastId}`
  );
}

async function initCandidateWebRTC() {
  if (!candidateState.attempt || !candidateState.attempt.id) return;
  // 1. NÃO iniciar o WebRTC antes do candidateState.recordingStream estar realmente disponível
  if (!candidateState.recordingStream || !candidateState.recordingStream.getTracks().length) {
    return;
  }

  // 2. Previne duplicação de RTCPeerConnection por tentativa
  if (candidateState.peerConnection && candidateState.peerConnection.connectionState !== 'closed') {
    startCandidateWebRTCSignalingLoop();
    return;
  }

  candidateState.webrtcNegotiationId = Date.now();
  candidateState.reconnectAttempts = candidateState.reconnectAttempts || 0;
  candidateState.reconnectInProgress = false;

  const iceServers = window.ACERT_ICE_SERVERS || [{ urls: 'stun:stun.l.google.com:19302' }];
  const pc = new RTCPeerConnection({ iceServers });
  candidateState.peerConnection = pc;
  candidateState.webrtcOfferSent = false;

  // Reutiliza o recordingStream existente sem chamar getUserMedia/getDisplayMedia novamente
  candidateState.recordingStream.getTracks().forEach(track => {
    pc.addTrack(track, candidateState.recordingStream);
  });

  pc.ontrack = (event) => {
    const audioPlayer = document.getElementById('proctor-audio-player');
    const notice = document.getElementById('proctor-audio-notice');
    if (audioPlayer && event.streams && event.streams[0]) {
      audioPlayer.srcObject = event.streams[0];
      audioPlayer.play().then(() => {
        if (notice) notice.hidden = true;
      }).catch(err => {
        console.warn('[WebRTC Candidate] Autoplay do áudio do proctor bloqueado:', err);
        if (notice) notice.hidden = false;
      });
    }

    if (event.track) {
      event.track.onunmute = () => {
        const indicator = document.getElementById('proctor-speaking-indicator');
        if (indicator) indicator.hidden = false;
      };
      event.track.onmute = () => {
        const indicator = document.getElementById('proctor-speaking-indicator');
        if (indicator) indicator.hidden = true;
      };
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const payload = event.candidate.toJSON();
      payload.negotiationId = candidateState.webrtcNegotiationId;
      sendCandidateWebRTCSignal('ice_candidate', payload).catch(_ => {});
    }
  };

  // Monitoramento do estado da conexão sem derrubar a prova se o WebRTC oscilar
  const handleStateChange = () => {
    const connState = pc.connectionState;
    const iceState = pc.iceConnectionState;

    if (connState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      candidateState.reconnectAttempts = 0;
      candidateState.reconnectInProgress = false;
      if (candidateState.webrtcGraceTimer) {
        clearTimeout(candidateState.webrtcGraceTimer);
        candidateState.webrtcGraceTimer = null;
      }
    } else if (connState === 'disconnected' || iceState === 'disconnected') {
      console.warn('[WebRTC Candidate] Conexão de monitoramento oscilou (disconnected). Aguardando janela de tolerância...');
      if (!candidateState.webrtcGraceTimer) {
        candidateState.webrtcGraceTimer = setTimeout(() => {
          candidateState.webrtcGraceTimer = null;
          handleCandidateWebRTCFailure();
        }, 3000);
      }
    } else if (connState === 'failed' || iceState === 'failed') {
      console.warn('[WebRTC Candidate] Falha de sinalização WebRTC detectada (failed). Iniciando recuperação...');
      if (candidateState.webrtcGraceTimer) {
        clearTimeout(candidateState.webrtcGraceTimer);
        candidateState.webrtcGraceTimer = null;
      }
      handleCandidateWebRTCFailure();
    }
  };

  pc.onconnectionstatechange = handleStateChange;
  pc.oniceconnectionstatechange = handleStateChange;

  await createAndSendCandidateOffer();
  startCandidateWebRTCSignalingLoop();
}

async function createAndSendCandidateOffer(isIceRestart = false) {
  const pc = candidateState.peerConnection;
  if (!pc || pc.connectionState === 'closed') return;

  try {
    candidateState.webrtcNegotiationId = Date.now();
    const offerOptions = isIceRestart ? { iceRestart: true } : {};
    const offer = await pc.createOffer(offerOptions);
    await pc.setLocalDescription(offer);
    await sendCandidateWebRTCSignal('offer', {
      sdp: pc.localDescription.sdp,
      type: pc.localDescription.type,
      negotiationId: candidateState.webrtcNegotiationId
    });
    candidateState.webrtcOfferSent = true;
  } catch (error) {
    console.warn('[WebRTC Candidate] Falha ao criar oferta SDP:', error.message);
  }
}

async function handleCandidateWebRTCFailure() {
  if (candidateState.reconnectInProgress) return;
  const pc = candidateState.peerConnection;
  if (!pc || pc.connectionState === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
    candidateState.reconnectInProgress = false;
    candidateState.reconnectAttempts = 0;
    return;
  }

  candidateState.reconnectInProgress = true;
  candidateState.reconnectAttempts = (candidateState.reconnectAttempts || 0) + 1;

  if (candidateState.reconnectAttempts <= 4) {
    const delays = [1000, 2000, 5000, 10000];
    const delay = delays[candidateState.reconnectAttempts - 1] || 10000;
    console.warn(`[WebRTC Candidate] Tentativa de ICE Restart ${candidateState.reconnectAttempts}/4 em ${delay}ms...`);

    setTimeout(async () => {
      const currentPc = candidateState.peerConnection;
      if (!currentPc || currentPc.connectionState === 'connected' || currentPc.iceConnectionState === 'connected') {
        candidateState.reconnectInProgress = false;
        candidateState.reconnectAttempts = 0;
        return;
      }
      try {
        await createAndSendCandidateOffer(true);
      } catch (_) {}
      candidateState.reconnectInProgress = false;
    }, delay);
  } else {
    console.warn('[WebRTC Candidate] Limite de ICE Restarts atingido (4/4). Executando recriação limpa de peer como fallback...');
    stopCandidateWebRTC();
    candidateState.reconnectAttempts = 0;
    candidateState.reconnectInProgress = false;
    await initCandidateWebRTC();
  }
}

function startCandidateWebRTCSignalingLoop() {
  // Previne loop de polling duplicado
  if (candidateState.webrtcTimer) return;
  candidateState.webrtcTimer = setInterval(async () => {
    await processCandidateWebRTCSignals();
  }, 2000);
}

async function processCandidateWebRTCSignals() {
  if (!candidateState.attempt || !candidateState.attempt.id) return;
  try {
    const res = await pollCandidateWebRTCSignals(candidateState.webrtcLastSignalId);
    if (res && res.success && res.signals && res.signals.length > 0) {
      for (const sig of res.signals) {
        candidateState.webrtcLastSignalId = Math.max(candidateState.webrtcLastSignalId, Number(sig.id || 0));
        const pc = candidateState.peerConnection;
        if (!pc || pc.connectionState === 'closed') continue;

        const payload = sig.payload || {};

        if (sig.signalType === 'answer') {
          if (payload.negotiationId && payload.negotiationId !== candidateState.webrtcNegotiationId) {
            console.warn('[WebRTC Candidate] Resposta SDP antiga ignorada.');
            continue;
          }
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
          }
        } else if (sig.signalType === 'ice_candidate') {
          if (payload.negotiationId && payload.negotiationId !== candidateState.webrtcNegotiationId) {
            continue;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          } catch (_) {}
        } else if (sig.signalType === 'speaking_state') {
          const indicator = document.getElementById('proctor-speaking-indicator');
          if (indicator) {
            indicator.hidden = !payload.speaking;
          }
        } else if (sig.signalType === 'request_offer') {
          console.warn('[WebRTC Candidate] Solicitação de nova oferta enviada pelo proctor. Emitindo oferta...');
          await createAndSendCandidateOffer(true);
        }
      }
    }
  } catch (_) {}
}

function stopCandidateWebRTC() {
  if (candidateState.webrtcTimer) {
    clearInterval(candidateState.webrtcTimer);
    candidateState.webrtcTimer = null;
  }
  if (candidateState.webrtcGraceTimer) {
    clearTimeout(candidateState.webrtcGraceTimer);
    candidateState.webrtcGraceTimer = null;
  }
  if (candidateState.peerConnection) {
    try { candidateState.peerConnection.close(); } catch (_) {}
    candidateState.peerConnection = null;
  }
  candidateState.webrtcOfferSent = false;
  candidateState.reconnectInProgress = false;
}


