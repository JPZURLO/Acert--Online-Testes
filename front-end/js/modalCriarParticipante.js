// Função para abrir o modal de criação
function abrirModalCriar() {
    document.getElementById("ModalCriar").style.display = "block";
  }
  
  // Função para fechar o modal de criação
  function fecharModalCriar() {
    document.getElementById("ModalCriar").style.display = "none";
  }
  
  // Função para abrir/fechar o menu dropdown
  function toggleMenu() {
    var menu = document.getElementById("menu");
    if (menu.style.display === "none") {
      menu.style.display = "block";
    } else {
      menu.style.display = "none";
    }
}