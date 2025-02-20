function abrirModalEdicaoCurso(elemento) {
    // 1. Exibir o modal
    const modal = document.getElementById("modal-edicao-curso");
    modal.style.display = "block";
  
    // 2. Obter os dados da linha da tabela
    const linha = elemento.parentNode;
    const nomeExame = linha.cells[0].innerText;
    const dataInicio = linha.cells[1].innerText;
    const dataTermino = linha.cells[2].innerText;
    const numeroCurso = linha.cells[3].innerText;
    const categoriaCurso = linha.cells[4].innerText;
  
    // 3. Preencher o modal com os dados
    document.getElementById("nome-completo-curso").value = nomeExame;
    document.getElementById("nome-breve-curso").value = nomeExame; // Ou use outro valor
    document.getElementById("data-inicio").value = dataInicio;
    document.getElementById("data-termino").value = dataTermino;
    document.getElementById("numero-curso").value = numeroCurso;
  
    // 4. Selecionar a categoria correta
    const selectCategoria = document.getElementById("categoria-curso");
    for (let i = 0; i < selectCategoria.options.length; i++) {
      if (selectCategoria.options[i].text === categoriaCurso) {
        selectCategoria.selectedIndex = i;
        break;
      }
    }
  }
  
  function fecharModalEdicaoCurso() {
    document.getElementById("modal-edicao-curso").style.display = "none";
  }
  
  function salvarCurso() {
    // Lógica para salvar as informações do curso (ex: enviar para o servidor)
    // ...
  
    // Fechar o modal
    fecharModalEdicaoCurso();
  }
  // ... (restante do código JavaScript)

function abrirAba(abaId) {
  // Esconde todas as abas
  const abas = document.querySelectorAll(".conteudo-aba");
  abas.forEach(aba => aba.classList.remove("active"));

  // Remove a classe "active" de todos os links de aba
  const links = document.querySelectorAll(".aba-link");
  links.forEach(link => link.classList.remove("active"));

  // Exibe a aba selecionada
  document.getElementById(abaId).classList.add("active");

  // Marca o link da aba como ativo
  const link = document.querySelector(`.aba-link[onclick="abrirAba('${abaId}')"]`);
  link.classList.add("active");
}

// Função para minimizar outros menus ao abrir um
function alternarMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (menu.style.display === "none") {
      // Esconde todos os outros menus
      const menus = document.querySelectorAll(".conteudo-menu");
      menus.forEach(m => {
          if (m.id !== menuId) {
              m.style.display = "none";
          }
      });
      menu.style.display = "block";
  } else {
      menu.style.display = "none";
  }
}
function fecharModalEdicaoCurso() {
  document.getElementById("modal-edicao-curso").style.display = "none";
}

function alternarMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (menu.style.display === "none") {
      menu.style.display = "block";
  } else {
      menu.style.display = "none";
  }
}

function mostrarOpcoesResposta(select) {
  const tipoPergunta = select.value;
  const opcoesResposta = select.parentNode.querySelector("#opcoes-resposta");
  opcoesResposta.innerHTML = "";

  if (tipoPergunta === "multipla") {
      adicionarOpcaoMultipla(opcoesResposta);
  } else if (tipoPergunta === "caixa") {
      adicionarOpcaoCaixa(opcoesResposta);
  }
}

function adicionarOpcaoMultipla(opcoesResposta) {
  const opcaoMultipla = document.createElement("div");
  opcaoMultipla.classList.add("opcao-multipla");
  opcaoMultipla.innerHTML = `
      <input type="radio" name="resposta">
      <input type="text">
      <button onclick="adicionarOpcaoMultipla(this.parentNode.parentNode)">+</button>
  `;
  opcoesResposta.appendChild(opcaoMultipla);
}

function adicionarOpcaoCaixa(opcoesResposta) {
  const opcaoCaixa = document.createElement("div");
  opcaoCaixa.classList.add("opcao-caixa");
  opcaoCaixa.innerHTML = `
      <input type="checkbox">
      <input type="text">
      <button onclick="adicionarOpcaoCaixa(this.parentNode.parentNode)">+</button>
  `;
  opcoesResposta.appendChild(opcaoCaixa);
}

function adicionarPergunta() {
  const perguntasContainer = document.getElementById("perguntas-container");
  const pergunta = document.createElement("div");
  pergunta.classList.add("pergunta");
  pergunta.innerHTML = `
      <label for="pergunta">Pergunta:</label>
      <input type="text" id="pergunta"><br><br>

      <label for="tipo-pergunta">Tipo de Pergunta:</label>
      <select id="tipo-pergunta" onchange="mostrarOpcoesResposta(this)">
          <option value="multipla">Múltipla Escolha</option>
          <option value="caixa">Caixa de Seleção</option>
          <option value="dissertativa">Dissertativa</option>
      </select><br><br>

      <label for="pontuacao">Pontuação (0-10):</label>
      <input type="number" id="pontuacao" min="0" max="10"><br><br>

      <div id="opcoes-resposta">
          </div>
  `;
  perguntasContainer.appendChild(pergunta);
}

function excluirPergunta() {
  const perguntasContainer = document.getElementById("perguntas-container");
  perguntasContainer.removeChild(perguntasContainer.lastChild);
}

