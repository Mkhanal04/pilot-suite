(function () {
  'use strict';

  const API = '/api/chat';
  const STORAGE_KEY = 'milan-chatbot-session';
  const EMAIL_KEY = 'milan-chatbot-email';

  function uuid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    let id;
    try {
      id = localStorage.getItem(STORAGE_KEY);
    } catch (_) {}
    if (!id) {
      id = uuid();
      try { localStorage.setItem(STORAGE_KEY, id); } catch (_) {}
    }
    return id;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== undefined && attrs[k] !== null) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function injectStyles() {
    if (document.getElementById('mk-chatbot-styles')) return;
    const css = [
      '.mk-cb-btn { position: fixed; bottom: 24px; right: 24px; z-index: 9998; width: 56px; height: 56px; border-radius: 50%; border: none; background: var(--color-accent, #0f172a); color: var(--color-surface, #fff); box-shadow: 0 10px 25px rgba(15,23,42,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: var(--font-sans, "Outfit", system-ui, sans-serif); font-size: 22px; transition: transform 0.15s ease, box-shadow 0.15s ease; }',
      '.mk-cb-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15,23,42,0.28); }',
      '.mk-cb-btn:focus-visible { outline: 2px solid var(--color-accent, #0f172a); outline-offset: 3px; }',
      '.mk-cb-panel { position: fixed; bottom: 0; right: 0; z-index: 9999; width: min(420px, 100vw); height: min(640px, 100vh); background: var(--color-surface, #fff); border-top-left-radius: 16px; box-shadow: -20px 0 60px rgba(15,23,42,0.18); display: flex; flex-direction: column; transform: translateY(110%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); font-family: var(--font-sans, "Outfit", system-ui, sans-serif); color: var(--color-text, #0f172a); }',
      '.mk-cb-panel.open { transform: translateY(0); }',
      '.mk-cb-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border, #e5e7eb); }',
      '.mk-cb-title { font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }',
      '.mk-cb-beta { display: inline-block; margin-left: 8px; padding: 1px 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-muted, #64748b); background: var(--color-muted-surface, #f1f5f9); border: 1px solid var(--color-border, #e5e7eb); border-radius: 4px; vertical-align: 2px; }',
      '.mk-cb-sub { font-size: 12px; color: var(--color-muted, #64748b); margin-top: 2px; }',
      '.mk-cb-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-muted, #64748b); padding: 4px 8px; }',
      '.mk-cb-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }',
      '.mk-cb-msg { max-width: 88%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; word-break: break-word; }',
      '.mk-cb-msg.user { align-self: flex-end; background: var(--color-accent, #0f172a); color: var(--color-surface, #fff); border-bottom-right-radius: 4px; }',
      '.mk-cb-msg.bot { align-self: flex-start; background: var(--color-muted-surface, #f1f5f9); color: var(--color-text, #0f172a); border-bottom-left-radius: 4px; }',
      '.mk-cb-msg.error { align-self: center; background: transparent; color: var(--color-muted, #64748b); font-size: 12px; font-style: italic; }',
      '.mk-cb-sources { margin-top: 8px; font-size: 11px; color: var(--color-muted, #64748b); line-height: 1.4; }',
      '.mk-cb-form { display: flex; padding: 12px 16px; gap: 8px; border-top: 1px solid var(--color-border, #e5e7eb); }',
      '.mk-cb-input { flex: 1; padding: 10px 14px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 10px; font-family: inherit; font-size: 14px; color: inherit; background: var(--color-surface, #fff); }',
      '.mk-cb-input:focus { outline: none; border-color: var(--color-accent, #0f172a); }',
      '.mk-cb-send { padding: 10px 14px; border: none; border-radius: 10px; background: var(--color-accent, #0f172a); color: var(--color-surface, #fff); font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; }',
      '.mk-cb-send:disabled { opacity: 0.5; cursor: not-allowed; }',
      '.mk-cb-typing { display: inline-flex; gap: 3px; align-items: center; }',
      '.mk-cb-typing span { width: 6px; height: 6px; background: var(--color-muted, #64748b); border-radius: 50%; animation: mk-pulse 1.4s infinite ease-in-out; }',
      '.mk-cb-typing span:nth-child(2) { animation-delay: 0.2s; }',
      '.mk-cb-typing span:nth-child(3) { animation-delay: 0.4s; }',
      '@keyframes mk-pulse { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }',
      '.mk-cb-email-prompt { margin-top: 8px; padding: 10px 12px; background: var(--color-muted-surface, #f1f5f9); border-radius: 10px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; }',
      '.mk-cb-email-prompt input { padding: 6px 10px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 6px; font-size: 13px; font-family: inherit; }',
      '.mk-cb-email-prompt button { padding: 6px 10px; background: var(--color-accent, #0f172a); color: var(--color-surface, #fff); border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }',
      '@media (max-width: 640px) { .mk-cb-panel { width: 100vw; height: 85vh; border-top-left-radius: 16px; border-top-right-radius: 16px; } .mk-cb-btn { bottom: 16px; right: 16px; } }'
    ].join('\n');
    const style = document.createElement('style');
    style.id = 'mk-chatbot-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderMarkdown(text) {
    const stripped = text
      .replace(/\s*\[\d+\]/g, '')
      .replace(/\s*[\u2014\u2013]\s*/g, ', ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();
    const escaped = stripped
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function sourceLabel(path) {
    if (path === 'index.html') return 'Home';
    if (path === 'about/index.html') return 'About';
    if (path === 'content/work.json') return 'Work';
    if (path.startsWith('writing/')) return 'Writing';
    if (path.startsWith('talentpilot/')) return 'TalentPilot';
    if (path.startsWith('tradepilot/')) return 'TradePilot';
    if (path.includes('resume')) return 'Resume';
    return path.split('/')[0];
  }

  function init() {
    if (document.getElementById('mk-chatbot-root')) return;
    injectStyles();

    const root = el('div', { id: 'mk-chatbot-root' });
    const btn = el('button', {
      class: 'mk-cb-btn',
      'aria-label': 'Open chat with Milan\'s digital twin',
      title: 'Ask Milan\'s digital twin'
    }, '\u2728');

    const panel = el('div', { class: 'mk-cb-panel', role: 'dialog', 'aria-label': 'Chat with Milan' });
    const head = el('div', { class: 'mk-cb-head' }, [
      el('div', null, [
        el('div', { class: 'mk-cb-title' }, [
          'Ask my digital twin',
          el('span', { class: 'mk-cb-beta' }, 'Beta')
        ]),
        el('div', { class: 'mk-cb-sub' }, 'Trained on Milan\'s writing and work. Answers cite sources.')
      ]),
      el('button', { class: 'mk-cb-close', 'aria-label': 'Minimize chat', title: 'Minimize' }, '\u2304')
    ]);
    const body = el('div', { class: 'mk-cb-body', role: 'log', 'aria-live': 'polite' });
    const form = el('form', { class: 'mk-cb-form' });
    const input = el('input', {
      class: 'mk-cb-input', type: 'text',
      placeholder: 'Ask about Milan\'s projects, thesis, or work...',
      'aria-label': 'Your message', maxlength: '2000'
    });
    const send = el('button', { class: 'mk-cb-send', type: 'submit' }, 'Send');
    form.appendChild(input);
    form.appendChild(send);
    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(form);
    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Seed greeting
    const greeting = el('div', { class: 'mk-cb-msg bot' });
    greeting.innerHTML = "Hi. I'm Milan's digital twin. Ask about my projects, writing, or how I think about AI. I cite sources and refuse what's outside my knowledge base.";
    body.appendChild(greeting);

    function open() {
      panel.classList.add('open');
      setTimeout(function () { input.focus(); }, 100);
    }
    function close() {
      panel.classList.remove('open');
      btn.focus();
    }

    btn.addEventListener('click', open);
    head.querySelector('.mk-cb-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    let sending = false;

    function appendUser(text) {
      const msg = el('div', { class: 'mk-cb-msg user' });
      msg.textContent = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function appendBot(reply, sources, refused) {
      const msg = el('div', { class: 'mk-cb-msg bot' });
      msg.innerHTML = renderMarkdown(reply);
      if (sources && sources.length) {
        const labels = [];
        const seen = {};
        sources.forEach(function (s) {
          const label = sourceLabel(s.path);
          if (seen[label]) return;
          seen[label] = true;
          labels.push(label);
        });
        if (labels.length) {
          const srcLine = el('div', { class: 'mk-cb-sources' });
          srcLine.textContent = 'Sources: ' + labels.join(', ');
          msg.appendChild(srcLine);
        }
      }
      body.appendChild(msg);
      if (refused) maybeShowEmailPrompt(msg);
      body.scrollTop = body.scrollHeight;
    }

    function appendError(text) {
      const msg = el('div', { class: 'mk-cb-msg error' });
      msg.textContent = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function showTyping() {
      const t = el('div', { class: 'mk-cb-msg bot', id: 'mk-cb-typing-row' });
      t.innerHTML = '<span class="mk-cb-typing"><span></span><span></span><span></span></span>';
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
      return t;
    }

    function maybeShowEmailPrompt(botMsg) {
      let saved = null;
      try { saved = localStorage.getItem(EMAIL_KEY); } catch (_) {}
      if (saved) return;
      const promptBox = el('div', { class: 'mk-cb-email-prompt' }, [
        el('div', null, 'Want Milan to follow up on this? Drop your email.'),
        el('div', { style: 'display:flex;gap:6px;' })
      ]);
      const emailInput = el('input', { type: 'email', placeholder: 'you@example.com', 'aria-label': 'Your email' });
      const submitBtn = el('button', { type: 'button' }, 'Send');
      promptBox.children[1].appendChild(emailInput);
      promptBox.children[1].appendChild(submitBtn);
      submitBtn.addEventListener('click', async function () {
        const val = (emailInput.value || '').trim();
        if (!val || val.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
        try { localStorage.setItem(EMAIL_KEY, val); } catch (_) {}
        try {
          await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: getSessionId(), message: '[email_opt_in]', optional_email: val })
          });
        } catch (_) {}
        promptBox.innerHTML = '<div style="color: var(--color-muted, #64748b); font-size: 12px;">Thanks. Milan will follow up.</div>';
      });
      botMsg.appendChild(promptBox);
    }

    async function sendMessage(text) {
      if (sending || !text) return;
      sending = true;
      send.disabled = true;
      input.disabled = true;
      input.value = '';
      appendUser(text);
      const typing = showTyping();
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: getSessionId(), message: text })
        });
        typing.remove();
        const data = await res.json().catch(function () { return {}; });
        if (res.status === 429) {
          appendError('Slow down. Rate limit hit. Try again in a bit.');
        } else if (res.status === 503) {
          appendError(data.reply || 'Chatbot is temporarily offline.');
        } else if (!res.ok) {
          appendError(data.reply || 'Something broke. Try again.');
        } else {
          appendBot(data.reply || '', data.sources || [], !!data.refused);
        }
      } catch (err) {
        typing.remove();
        appendError('Network error. Try again.');
      } finally {
        sending = false;
        send.disabled = false;
        input.disabled = false;
        input.focus();
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = (input.value || '').trim();
      sendMessage(text);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
