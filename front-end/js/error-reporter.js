(function(){
  'use strict';
  if(window.__onlineTesteErrorReporterInstalled)return;
  window.__onlineTesteErrorReporterInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  const recent=new Map();
  const csrf=()=>{const item=document.cookie.split('; ').find(value=>value.startsWith('acert_csrf_token='));return item?decodeURIComponent(item.split('=').slice(1).join('=')):''};
  const clean=value=>String(value||'').replace(/([?&](?:token|password|senha|secret|key)=)[^&\s]+/gi,'$1[OCULTO]').slice(0,1000);
  function mayReport(signature){const now=Date.now();for(const[key,time]of recent){if(now-time>60000)recent.delete(key)}if(recent.has(signature)||recent.size>=12)return false;recent.set(signature,now);return true}
  function report(payload){
    const normalized={source:payload.source||'client',errorType:clean(payload.errorType||'JavaScriptError'),message:clean(payload.message||'Falha no navegador'),route:clean(payload.route||location.pathname),method:clean(payload.method||''),page:location.pathname,technicalSummary:clean(payload.technicalSummary||'')};
    const signature=[normalized.source,normalized.errorType,normalized.message,normalized.route].join('|');
    if(!mayReport(signature))return;
    const headers={'Content-Type':'application/json'};const token=csrf();if(token)headers['X-CSRF-Token']=token;
    nativeFetch('/api/system-errors/client',{method:'POST',headers,body:JSON.stringify(normalized),keepalive:true}).catch(()=>{});
  }
  window.addEventListener('error',event=>report({errorType:event.error?.name||'JavaScriptError',message:event.message,route:event.filename||location.pathname,technicalSummary:`Linha ${event.lineno||0}, coluna ${event.colno||0}`}));
  window.addEventListener('unhandledrejection',event=>{const reason=event.reason;report({errorType:reason?.name||'UnhandledPromiseRejection',message:reason?.message||reason||'Promessa rejeitada sem tratamento',technicalSummary:'Rejeição assíncrona capturada automaticamente.'})});
  window.fetch=async function(input,options={}){
    const url=typeof input==='string'?input:input?.url||'';
    if(String(url).includes('/api/system-errors/client'))return nativeFetch(input,options);
    try{
      const response=await nativeFetch(input,options);
      if(response.status>=500)report({source:'network',errorType:`HTTP${response.status}`,message:`A API retornou HTTP ${response.status}.`,route:url,method:options.method||'GET',technicalSummary:'Falha de rede detectada automaticamente pelo navegador.'});
      return response;
    }catch(error){
      report({source:'network',errorType:error?.name||'NetworkError',message:error?.message||'Falha de conexão com o servidor.',route:url,method:options.method||'GET',technicalSummary:'A requisição não recebeu resposta do servidor.'});
      throw error;
    }
  };
})();
