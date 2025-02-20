const nomeSelect = document.getElementById('nome');
const tableRows = document.querySelectorAll('tbody tr');

nomeSelect.addEventListener('change', () => {
  const selectedLetter = nomeSelect.value;

  tableRows.forEach(row => {
    const nome = row.cells[1].textContent.toLowerCase(); // Índice 1 para a coluna "Nome"
    const shouldShow = selectedLetter === 'todos' || nome.startsWith(selectedLetter);
    row.style.display = shouldShow ? 'table-row' : 'none';
  });
});

