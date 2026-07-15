function aplicarFiltros() {
    const nomeExame = document.getElementById("nome-teste").value;
    const dataInicio = document.getElementById("data-inicio").value;
    const dataTermino = document.getElementById("data-termino").value;
    const numeroCurso = document.getElementById("numero-curso").value;
    const categoriaCurso = document.getElementById("categoria-curso").value;
  
    // Lógica para aplicar os filtros (ex: filtrar uma tabela, enviar dados para o servidor, etc.)
    console.log("Filtros aplicados:", {
      nomeExame,
      dataInicio,
      dataTermino,
      numeroCurso,
      categoriaCurso
    });
  }