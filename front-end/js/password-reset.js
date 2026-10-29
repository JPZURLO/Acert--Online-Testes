document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('password-reset-form');
  const emailInput = document.getElementById('password-reset-email');
  const button = document.getElementById('password-reset-button');
  const message = document.getElementById('password-reset-message');

  if (!form || !emailInput || !button || !message) return;

  const setMessage = (text, type = 'info') => {
    message.textContent = text;
    message.dataset.type = type;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      setMessage('Informe seu e-mail para continuar.', 'error');
      return;
    }

    button.disabled = true;
    button.textContent = 'Enviando...';
    setMessage('Verificando cadastro...', 'info');

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Não foi possível solicitar a recuperação agora.');
      }
      setMessage(data.message || 'Se o e-mail estiver cadastrado, enviaremos as instruções em instantes.', 'success');
      form.reset();
    } catch (error) {
      setMessage(error.message || 'Não foi possível solicitar a recuperação agora.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Redefinir Senha';
    }
  });
});
