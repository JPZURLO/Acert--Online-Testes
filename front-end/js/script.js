document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const errorMessage = document.getElementById('error-message');

    fetch('http://localhost:5500/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // Use JSON para enviar dados
        },
        body: JSON.stringify({ email, senha }) // Formata os dados para JSON
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Login realizado:', data.message);
            // Redireciona para a página 'loginusuario'
            window.location.href = '/loginusuario';  // Aqui você redireciona
        } else {
            errorMessage.textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
        errorMessage.textContent = error.message || 'Erro desconhecido.';
    });
});
