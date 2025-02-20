document.addEventListener('DOMContentLoaded', () => {
  const botaoLogin = document.getElementById('botao-login');

  // Função para atualizar o botão
  function atualizarBotaoLogin(nomeUsuario, imagemUsuario) {
    if (botaoLogin) {
      botaoLogin.innerHTML = `
        <a href="#">
          <img src="${imagemUsuario}" alt="Foto do usuário">
          <span>${nomeUsuario}</span>
          <i class="fas fa-cog"></i>
        </a>
      `;

      // Modal
      const iconeOpcoes = botaoLogin.querySelector('.fa-cog');
      const modalOpcoes = document.getElementById('modal-opcoes');
      if (iconeOpcoes && modalOpcoes) {
        iconeOpcoes.addEventListener('click', () => {
          modalOpcoes.style.display = 'block';
        });
      }

      // Logout
      const botaoLogout = document.getElementById('botao-logout');
      if (botaoLogout) {
        botaoLogout.addEventListener('click', () => {
          localStorage.removeItem('logado');
          localStorage.removeItem('nomeUsuario');
          localStorage.removeItem('imagemUsuario');
          localStorage.removeItem('RazaoSocial');  // Limpa RazaoSocial no logout
          window.location.href = 'index.html';
        });
      }
    } else {
      console.error("Botão com ID 'botao-login' não encontrado!");
    }
  }

  // Verifica se o usuário está logado
  if (localStorage.getItem('logado') === 'true') {
    const nomeUsuario = localStorage.getItem('nomeUsuario');
    const imagemUsuario = localStorage.getItem('imagemUsuario');
    const razaoSocial = localStorage.getItem('RazaoSocial');  // Obtém RazaoSocial caso seja empresa

    // Se for uma empresa, mostra RazaoSocial
    if (razaoSocial) {
      atualizarBotaoLogin(razaoSocial, imagemUsuario);  // Se for empresa, usa RazaoSocial
    } else {
      atualizarBotaoLogin(nomeUsuario, imagemUsuario);  // Caso contrário, usa o nome comum
    }
  }

  // Evento de clique no botão de login (se precisar redirecionar para a página de login)
  if (botaoLogin) {
    botaoLogin.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
});
