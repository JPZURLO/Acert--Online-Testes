document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const errorMessage = document.getElementById('error-message');

    fetch('http://localhost:5500/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message || 'Erro na requisição'); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('✅ Login realizado:', data.message);
            alert('Login realizado com sucesso!');

            // Armazena os dados no localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('NomeCompleto', data.NomeCompleto); 

            console.log('🔄 Redirecionando para login_cliente.html...');
            window.location.replace('login_cliente.html'); // Usa replace para evitar voltar à tela de login
        } else {
            errorMessage.textContent = data.message || 'Erro no login';
        }
    })
    .catch(error => {
        console.error('❌ Erro na requisição:', error);
        errorMessage.textContent = error.message || 'Erro desconhecido.';
    });
});
