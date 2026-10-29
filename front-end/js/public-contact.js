(function() {
  'use strict';

  function createContactModalHTML() {
    if (document.getElementById('contact-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'contact-modal';
    modal.className = 'contact-modal-backdrop';
    modal.hidden = true;
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="contact-modal-card" role="dialog" aria-labelledby="contact-modal-title" aria-modal="true">
        <div class="contact-modal-header">
          <h2 id="contact-modal-title"><i class="fa-regular fa-envelope" aria-hidden="true"></i> Fale com o Comercial</h2>
          <button type="button" class="contact-modal-close" id="contact-modal-close" aria-label="Fechar">&times;</button>
        </div>
        <form id="public-contact-form" class="contact-modal-form">
          <div id="contact-status-msg" class="contact-status-msg"></div>
          <label>
            <span>Seu nome completo *</span>
            <input type="text" id="contact-name" name="contactName" required placeholder="Digite seu nome" autocomplete="name">
          </label>
          <label>
            <span>E-mail de contato *</span>
            <input type="email" id="contact-email" name="email" required placeholder="seuemail@empresa.com.br" autocomplete="email">
          </label>
          <label>
            <span>Telefone / WhatsApp</span>
            <input type="tel" id="contact-phone" name="phone" placeholder="(11) 99999-9999" autocomplete="tel">
          </label>
          <label>
            <span>Assunto</span>
            <select id="contact-subject" name="subject">
              <option value="Dúvida Geral">Dúvida sobre a plataforma</option>
              <option value="Solicitar Proposta">Solicitar proposta / orçamento</option>
              <option value="Agendar Demonstração">Agendar demonstração</option>
              <option value="Suporte Comercial">Atendimento Comercial</option>
              <option value="Outros">Outros assuntos</option>
            </select>
          </label>
          <label>
            <span>Mensagem *</span>
            <textarea id="contact-message-text" name="message" rows="4" required placeholder="Como podemos ajudar você ou sua empresa?"></textarea>
          </label>
          <div class="contact-modal-actions">
            <button type="button" class="site-button secondary" id="contact-modal-cancel">Cancelar</button>
            <button type="submit" class="site-button" id="contact-modal-submit">Enviar mensagem</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // Event listeners for closing
    document.getElementById('contact-modal-close')?.addEventListener('click', closeContactModal);
    document.getElementById('contact-modal-cancel')?.addEventListener('click', closeContactModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeContactModal();
    });

    // Form submit listener
    document.getElementById('public-contact-form')?.addEventListener('submit', handleContactSubmit);
  }

  function openContactModal() {
    createContactModalHTML();
    const modal = document.getElementById('contact-modal');
    if (modal) {
      modal.hidden = false;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      const msgArea = document.getElementById('contact-status-msg');
      if (msgArea) {
        msgArea.className = 'contact-status-msg';
        msgArea.style.display = 'none';
        msgArea.textContent = '';
      }
      setTimeout(() => document.getElementById('contact-name')?.focus(), 100);
    }
  }

  function closeContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
      modal.hidden = true;
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('contact-modal-submit');
    const msgArea = document.getElementById('contact-status-msg');

    const name = document.getElementById('contact-name')?.value.trim();
    const email = document.getElementById('contact-email')?.value.trim();
    const phone = document.getElementById('contact-phone')?.value.trim();
    const subject = document.getElementById('contact-subject')?.value;
    const message = document.getElementById('contact-message-text')?.value.trim();

    if (!name || !email || !message) {
      showStatus('Preencha seu nome, e-mail e mensagem.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    try {
      const response = await fetch('/api/contact-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(data.message || 'Mensagem enviada com sucesso!', 'success');
        document.getElementById('public-contact-form')?.reset();
        setTimeout(closeContactModal, 2500);
      } else {
        showStatus(data.message || 'Não foi possível enviar sua mensagem. Tente novamente.', 'error');
      }
    } catch (err) {
      showStatus('Erro de conexão com o servidor. Tente novamente em instantes.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar mensagem';
      }
    }
  }

  function showStatus(text, type) {
    const msgArea = document.getElementById('contact-status-msg');
    if (msgArea) {
      msgArea.textContent = text;
      msgArea.className = 'contact-status-msg ' + type;
      msgArea.style.display = 'block';
    }
  }

  // Bind to any trigger button/link
  document.addEventListener('DOMContentLoaded', function() {
    createContactModalHTML();
    document.querySelectorAll('.open-contact-modal, a[href^="mailto:comercial@onlineteste.com.br"]').forEach(el => {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openContactModal();
      });
    });
  });

  window.openContactModal = openContactModal;
})();
