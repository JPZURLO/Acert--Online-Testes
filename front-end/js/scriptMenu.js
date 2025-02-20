// Função para mostrar/ocultar o menu
function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
  
  // Função para excluir linhas selecionadas
  function excluirLinhas() {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
      const row = checkbox.parentNode.parentNode;
      row.remove();
    });
  }
  
  // Função para criar uma nova linha
  function criarLinha() {
    const tbody = document.querySelector('tbody');
    const newRow = tbody.insertRow();
    // Adicione células à nova linha com os campos desejados
    // Você pode usar innerHTML ou appendChild para criar os elementos
  }