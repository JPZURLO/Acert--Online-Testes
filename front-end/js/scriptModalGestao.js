const btnExpandirGestao = document.getElementById('btn-expandir-gestao');
const conteudoGestaoEmpresa = document.getElementById('conteudo-gestao-empresa');

btnExpandirGestao.addEventListener('click', () => {
    if (conteudoGestaoEmpresa.style.display === 'none') {
        conteudoGestaoEmpresa.style.display = 'block';
        btnExpandirGestao.textContent = 'Gestão da Empresa ▲';
    } else {
        conteudoGestaoEmpresa.style.display = 'none';
        btnExpandirGestao.textContent = 'Gestão da Empresa ▼';
    }
});