const activationToken=new URLSearchParams(window.location.search).get('token')||'';
const activationForm=document.getElementById('activation-form');
const activationMessage=document.getElementById('activation-message');
const activationDescription=document.getElementById('activation-description');
const activationSubmit=document.getElementById('activation-submit');
const activationLogin=document.getElementById('activation-login');
const activationEnglish=localStorage.getItem('onlineTesteLanguage')==='en';
const activationTexts={
  invalid:'O link de ativação está incompleto. Solicite um novo envio ao administrador.',
  invalidEn:'The activation link is incomplete. Ask the administrator to send a new one.',
  approved:name=>`Acesso aprovado para ${name}. Confirme uma senha para concluir a ativação.`,
  approvedEn:name=>`Access approved for ${name}. Create a password to complete activation.`,
  mismatch:'As senhas não coincidem.',mismatchEn:'The passwords do not match.',
  activating:'Ativando...',activatingEn:'Activating...',
  submit:'Ativar meu acesso',submitEn:'Activate my access'
};
function activationText(key,...args){const candidate=activationEnglish?activationTexts[`${key}En`]:activationTexts[key];return typeof candidate==='function'?candidate(...args):candidate}

async function activationApi(path,payload){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  let data={};
  try{data=await response.json()}catch(_){data={}}
  if(!response.ok)throw new Error(data.message||'Não foi possível validar este acesso.');
  return data;
}

async function validateActivation(){
  if(!activationToken){activationDescription.textContent=activationText('invalid');return}
  try{
    const data=await activationApi('/api/company-activation/validate',{token:activationToken});
    activationDescription.textContent=activationText('approved',data.companyName);
    activationForm.hidden=false;
  }catch(error){activationDescription.textContent=error.message;activationLogin.hidden=false}
}

activationForm.addEventListener('submit',async event=>{
  event.preventDefault();
  activationMessage.className='activation-message';
  activationMessage.textContent='';
  const password=document.getElementById('activation-password').value;
  const passwordConfirmation=document.getElementById('activation-password-confirmation').value;
  if(password!==passwordConfirmation){activationMessage.textContent=activationText('mismatch');return}
  activationSubmit.disabled=true;
  activationSubmit.textContent=activationText('activating');
  try{
    const data=await activationApi('/api/company-activation/complete',{token:activationToken,password,passwordConfirmation});
    activationForm.replaceChildren();
    activationMessage.className='activation-message success';
    activationMessage.textContent=data.message;
    activationForm.appendChild(activationMessage);
    activationLogin.hidden=false;
  }catch(error){activationMessage.textContent=error.message;activationSubmit.disabled=false;activationSubmit.textContent=activationText('submit')}
});

validateActivation();
