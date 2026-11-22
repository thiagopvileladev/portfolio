/* ==========================================================================
   SaaS & Services — app.js
   Lógica compartilhada pela vitrine (index.html) e pelo painel (admin.html).
   100% JavaScript puro: sem frameworks, sem dependências e sem backend.
   Os dados ficam no localStorage do navegador.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURAÇÃO RÁPIDA (altere aqui)
   -------------------------------------------------------------------------- */

/**
 * CREDENCIAIS DO PAINEL ADMIN (admin.html)
 *
 *   Usuário: admin
 *   Senha:   admin123
 *
 * Troque os valores abaixo para definir seu próprio acesso.
 * ATENÇÃO: este login é apenas um bloqueio simples feito no navegador.
 * Qualquer pessoa que abrir este arquivo consegue ler os valores, então
 * não reutilize aqui uma senha que você usa em outros serviços.
 */
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

/**
 * PERFIL  >>> EDITE AQUI COM OS SEUS DADOS <<<
 * Preenche automaticamente o nome, o cargo e os links de contato da vitrine
 * (elementos com data-profile="..." e data-contact="..." no HTML).
 * Deixe um campo vazio ('') para esconder o botão correspondente.
 * whatsappNumber: DDI + DDD + número, somente dígitos (ex.: 5511987654321).
 */
const PROFILE = {
  name: 'Seu Nome',
  role: 'Desenvolvedor Full-Stack',
  location: 'Brasil · remoto',
  email: 'thiagopvileladev@gmail.com',
  github: 'https://github.com/seu-usuario',
  linkedin: 'https://www.linkedin.com/in/seu-usuario',
  cv: 'curriculo.pdf',  // PDF na raiz do projeto ou um link (vazio esconde o botão)
  whatsappNumber: '',   // opcional
  whatsappMessage: 'Oi! Vi o seu portfólio e queria conversar.',
};
const CONTACT = PROFILE;

/* ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. CONSTANTES & CATÁLOGOS
     ------------------------------------------------------------------------ */
  const STORAGE_KEY = 'saas-services:projects:v1';
  const DATA_FILE = 'portfolio-data.json';
  let PUBLISHED = null; // conteúdo de portfolio-data.json, quando existir
  const SESSION_KEY = 'saas-services:admin-session';
  const SCHEMA_VERSION = 1;
  const STORAGE_QUOTA = 5 * 1024 * 1024; // limite típico do localStorage (~5 MB)

  /** Parâmetros de otimização das imagens enviadas por upload. */
  const IMAGE_OPTIONS = {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.82,
    minQuality: 0.5,
    maxChars: 600 * 1024, // tamanho máximo do Base64 final (~450 KB de imagem)
    maxInputBytes: 20 * 1024 * 1024,
    background: '#111113', // fundo aplicado sob imagens com transparência
  };

  /** Categorias exibidas nos filtros e no formulário. */
  const CATEGORIES = [
    { id: 'saas', label: 'SaaS', icon: 'layers', aliases: [] },
    { id: 'web', label: 'Sistemas Web', icon: 'app-window', aliases: ['sistema web', 'sistemas', 'web'] },
    { id: 'automation', label: 'Automações', icon: 'zap', aliases: ['automacoes', 'automação', 'automacao'] },
    { id: 'other', label: 'Outros', icon: 'box', aliases: ['outro'] },
  ];

  /** Status possíveis de um projeto (tone define a cor do badge). */
  const STATUSES = [
    { id: 'production', label: 'Em Produção', tone: 'success', aliases: ['em producao', 'produção', 'producao'] },
    { id: 'mvp', label: 'MVP', tone: 'warning', aliases: [] },
    { id: 'on-demand', label: 'Sob Demanda', tone: 'accent', aliases: ['sob demanda', 'demanda'] },
    { id: 'private', label: 'Privado / Interno', tone: 'neutral', aliases: ['privado', 'interno', 'privado/interno'] },
  ];

  /* ------------------------------------------------------------------------
     2. ÍCONES (SVG inline, traço de 24px no estilo Lucide)
     ------------------------------------------------------------------------ */
  const ICONS = {
    'github': '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    'linkedin': '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8M16 13H8M16 17H8"/>',
    'code': '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41M17.66 6.34l1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>',
    'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'alert': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'message': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'mail': '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    'layers': '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    'app-window': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/>',
    'zap': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    'box': '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    'grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    'pencil': '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    'trash': '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    'image': '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'save': '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'tag': '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
    'inbox': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'refresh': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'loader': '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
  };

  /** Retorna o markup de um ícone SVG inline. */
  function icon(name, extraClass) {
    const body = ICONS[name];
    if (!body) return '';
    const cls = extraClass ? 'i ' + extraClass : 'i';
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /** Substitui os placeholders <span data-icon="nome"> do HTML pelos SVGs. */
  function hydrateIcons(root) {
    $$('[data-icon]', root || document).forEach(function (el) {
      const svg = htmlToElement(icon(el.dataset.icon, el.className));
      if (!svg) return;
      if (el.id) svg.id = el.id;
      el.replaceWith(svg);
    });
  }

  /* ------------------------------------------------------------------------
     3. DADOS INICIAIS (SEED)
     Carregados automaticamente na primeira visita (localStorage vazio).
     ------------------------------------------------------------------------ */
  const SEED_PROJECTS = [
    {
      id: 'seed-agendo',
      name: 'Agendo',
      category: 'saas',
      status: 'production',
      shortDescription: 'SaaS de agendamento online para clínicas, salões e profissionais autônomos, com lembretes automáticos no WhatsApp e sinal via Pix.',
      fullDescription:
        'O Agendo é uma plataforma multi-empresa que substitui a agenda de papel e as conversas intermináveis no WhatsApp. Cada negócio ganha uma página pública de agendamento com a própria marca, onde o cliente escolhe serviço, profissional e horário em menos de um minuto.\n\n' +
        'No painel, a equipe acompanha a agenda do dia, bloqueia horários, gerencia comissões e visualiza métricas de ocupação e faturamento. Lembretes automáticos reduzem as faltas, e o sinal antecipado via Pix garante o compromisso do cliente.',
      features: [
        'Página de agendamento personalizada com domínio próprio',
        'Lembretes e confirmações automáticas via WhatsApp',
        'Sinal ou pagamento antecipado via Pix',
        'Agenda multi-profissional com bloqueios e intervalos',
        'Dashboard de ocupação, faturamento e taxa de faltas',
        'Planos por assinatura com cobrança recorrente',
      ],
      tags: ['Node.js', 'PostgreSQL', 'WhatsApp API', 'Pix', 'Multi-tenant', 'PWA'],
      image: '',
      link: '',
    },
    {
      id: 'seed-menuflow',
      name: 'MenuFlow',
      category: 'web',
      status: 'mvp',
      shortDescription: 'Cardápio digital via QR Code integrado à gestão de pedidos, mesas e cozinha para restaurantes, bares e deliveries.',
      fullDescription:
        'O MenuFlow digitaliza a operação do salão: o cliente escaneia o QR Code da mesa, navega por um cardápio rápido e bonito, faz o pedido e acompanha o preparo em tempo real, sem baixar nenhum aplicativo.\n\n' +
        'Os pedidos chegam direto ao painel da cozinha, organizados por tempo de preparo, enquanto o gestor controla mesas, comandas, disponibilidade de itens e horários de pico. Alterar um preço ou pausar um prato leva segundos e reflete na hora no cardápio.',
      features: [
        'Cardápio digital responsivo com fotos, adicionais e observações',
        'Pedidos pela mesa via QR Code, sem instalar app',
        'Painel da cozinha (KDS) com fila em tempo real',
        'Gestão de mesas, comandas e fechamento de conta',
        'Pausa de itens e edição de preços instantânea',
        'Relatórios de vendas, ticket médio e itens mais pedidos',
      ],
      tags: ['JavaScript', 'WebSockets', 'QR Code', 'Firebase', 'Dashboard'],
      image: '',
      link: '',
    },
    {
      id: 'seed-orcabot',
      name: 'OrçaBot',
      category: 'automation',
      status: 'on-demand',
      shortDescription: 'Automação de atendimento que qualifica leads no WhatsApp, calcula orçamentos personalizados e envia a proposta em PDF em minutos.',
      fullDescription:
        'O OrçaBot assume o primeiro atendimento comercial 24 horas por dia. Um fluxo conversacional coleta as informações do cliente, aplica as regras de precificação do negócio e gera automaticamente uma proposta profissional em PDF, enviada na própria conversa.\n\n' +
        'Cada lead é registrado no CRM ou em uma planilha com o histórico completo, e a equipe só entra na conversa quando o cliente está pronto para fechar. A implantação é sob demanda, com regras, integrações e identidade visual adaptadas a cada operação.',
      features: [
        'Atendimento automático 24/7 no WhatsApp e Instagram',
        'Qualificação de leads com perguntas personalizadas',
        'Cálculo de orçamento com regras de negócio configuráveis',
        'Geração e envio de propostas em PDF com a sua marca',
        'Integração com CRM, Google Sheets e e-mail',
        'Transferência inteligente para atendimento humano',
      ],
      tags: ['Python', 'n8n', 'WhatsApp API', 'OpenAI', 'Google Sheets', 'PDF'],
      image: '',
      link: '',
    },
  ];

  /* ------------------------------------------------------------------------
     4. UTILITÁRIOS
     ------------------------------------------------------------------------ */
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  /** Escapa texto para inserção segura em HTML (previne XSS). */
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /** Converte uma string HTML em um único elemento. */
  function htmlToElement(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  /** Converte uma string HTML em fragmento (múltiplos nós). */
  function htmlToFragment(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return tpl.content;
  }

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function debounce(fn, wait) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function plural(n, singular, pluralForm) {
    return n + ' ' + (n === 1 ? singular : pluralForm);
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  /** Normaliza uma lista vinda de array ou de texto separado. */
  function toList(value, separator) {
    let list = [];
    if (Array.isArray(value)) list = value;
    else if (typeof value === 'string') list = value.split(separator);
    return list.map(function (v) { return String(v).trim(); }).filter(Boolean);
  }

  /** Remove itens duplicados (sem diferenciar maiúsculas/minúsculas). */
  function uniqueCaseInsensitive(list) {
    const seen = new Set();
    return list.filter(function (item) {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Aceita o id ou o rótulo de uma opção (útil ao importar JSON). */
  function resolveOption(options, value, fallback) {
    const v = String(value == null ? '' : value).trim().toLowerCase();
    if (!v) return fallback;
    const found = options.find(function (o) {
      return o.id === v || o.label.toLowerCase() === v || o.aliases.indexOf(v) !== -1;
    });
    return found ? found.id : fallback;
  }

  function getCategory(id) {
    return CATEGORIES.find(function (c) { return c.id === id; }) || CATEGORIES[CATEGORIES.length - 1];
  }

  function getStatus(id) {
    return STATUSES.find(function (s) { return s.id === id; }) || STATUSES[0];
  }

  /* ----- URLs seguras ----------------------------------------------------- */
  const SCHEME_RE = /^[a-z][a-z\d+\-.]*:/i;
  const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

  /** Valida o src de uma imagem: http(s), caminho relativo ou Base64 de imagem. */
  function safeImageSrc(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (v.slice(0, 5).toLowerCase() === 'data:') return DATA_IMAGE_RE.test(v) ? v : '';
    if (v.slice(0, 2) === '//') return 'https:' + v;
    if (!SCHEME_RE.test(v)) return v; // caminho relativo (ex.: img/capa.png)
    try {
      const url = new URL(v);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  /** Valida um link externo. Sem protocolo, assume https://. */
  function safeLink(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^(mailto|tel):[^\s]+$/i.test(v)) return v;
    const candidate = SCHEME_RE.test(v) && !/^[\w-]+(\.[\w-]+)+:\d+/.test(v) ? v : 'https://' + v.replace(/^\/+/, '');
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (!url.hostname || url.hostname.indexOf('.') === -1 && url.hostname !== 'localhost') return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  /* ----- Contato ---------------------------------------------------------- */
  function whatsappUrl(message) {
    const number = String(CONTACT.whatsappNumber).replace(/\D/g, '');
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message || CONTACT.whatsappMessage);
  }

  function mailtoUrl(subject) {
    return 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(subject || 'Contato pelo portfólio');
  }

  /* ------------------------------------------------------------------------
     5. MODELO & PERSISTÊNCIA (localStorage)
     ------------------------------------------------------------------------ */

  /** Garante que um projeto (cadastrado ou importado) tenha formato válido. */
  function normalizeProject(input) {
    if (!input || typeof input !== 'object') return null;
    const name = String(input.name == null ? '' : input.name).trim();
    if (!name) return null;
    const now = new Date().toISOString();
    return {
      id: typeof input.id === 'string' && input.id.trim() ? input.id.trim() : uid(),
      name: name.slice(0, 120),
      category: resolveOption(CATEGORIES, input.category, 'other'),
      status: resolveOption(STATUSES, input.status, 'production'),
      shortDescription: String(input.shortDescription || '').trim(),
      fullDescription: String(input.fullDescription || '').trim(),
      features: toList(input.features, /\r?\n/).map(function (f) { return f.replace(/^[-*•]\s*/, ''); }).filter(Boolean),
      tags: uniqueCaseInsensitive(toList(input.tags, ',')),
      image: String(input.image || '').trim(),
      link: String(input.link || '').trim(),
      repo: String(input.repo || '').trim(),
      createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
      updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : now,
    };
  }

  function isQuotaError(error) {
    return Boolean(error) && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  function storageErrorMessage(error) {
    return isQuotaError(error)
      ? 'O armazenamento do navegador está cheio. Use imagens menores ou URLs externas, ou exporte um backup e remova projetos antigos.'
      : 'Não foi possível salvar os dados neste navegador.';
  }

  /**
   * Store: fonte única dos projetos.
   * Toda escrita passa por commit(), que só atualiza o estado em memória
   * se o localStorage aceitar a gravação (evita divergência ao estourar a cota).
   */
  const Store = {
    items: [],

    init: function () {
      this.items = this.read();
      return this;
    },

    read: function () {
      let raw = null;
      try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (_) { raw = null; }

      // Nada salvo neste navegador: usa os dados publicados (ou os de exemplo).
      // Não grava nada, assim visitantes sempre veem a versão publicada mais recente.
      if (raw === null) {
        const source = PUBLISHED && Array.isArray(PUBLISHED.projects) ? PUBLISHED.projects : SEED_PROJECTS;
        return source.map(normalizeProject).filter(Boolean);
      }

      try {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.projects) ? parsed.projects : []);
        return list.map(normalizeProject).filter(Boolean);
      } catch (_) {
        return [];
      }
    },

    write: function (list) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error };
      }
    },

    commit: function (next) {
      const result = this.write(next);
      if (result.ok) this.items = next;
      return result;
    },

    all: function () { return this.items.slice(); },

    get: function (id) {
      return this.items.find(function (p) { return p.id === id; }) || null;
    },

    indexOf: function (id) {
      return this.items.findIndex(function (p) { return p.id === id; });
    },

    /** Novos projetos entram no topo da vitrine. */
    create: function (data) {
      const now = new Date().toISOString();
      const project = normalizeProject(Object.assign({}, data, { id: uid(), createdAt: now, updatedAt: now }));
      if (!project) return { ok: false, error: new Error('Projeto inválido.') };
      const result = this.commit([project].concat(this.items));
      return Object.assign(result, { project: project });
    },

    update: function (id, data) {
      const index = this.indexOf(id);
      if (index === -1) return { ok: false, error: new Error('Projeto não encontrado.') };
      const current = this.items[index];
      const project = normalizeProject(Object.assign({}, current, data, {
        id: id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      const next = this.items.slice();
      next[index] = project;
      return Object.assign(this.commit(next), { project: project });
    },

    remove: function (id) {
      return this.commit(this.items.filter(function (p) { return p.id !== id; }));
    },

    /** Move um projeto uma posição para cima (-1) ou para baixo (+1). */
    move: function (id, delta) {
      const from = this.indexOf(id);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= this.items.length) return { ok: false };
      const next = this.items.slice();
      const moved = next[from];
      next[from] = next[to];
      next[to] = moved;
      return this.commit(next);
    },

    replaceAll: function (list) { return this.commit(list.slice()); },

    /** Mescla por id: atualiza existentes e adiciona os novos ao final. */
    merge: function (list) {
      const next = this.items.slice();
      list.forEach(function (project) {
        const index = next.findIndex(function (p) { return p.id === project.id; });
        if (index === -1) next.push(project);
        else next[index] = project;
      });
      return this.commit(next);
    },

    restoreSeeds: function () {
      return this.merge(SEED_PROJECTS.map(normalizeProject).filter(Boolean));
    },

    /** Tamanho aproximado ocupado pelos projetos no localStorage. */
    usage: function () {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY) || '';
        return raw.length + STORAGE_KEY.length;
      } catch (_) {
        return 0;
      }
    },
  };

  /* ------------------------------------------------------------------------
     6. AUTENTICAÇÃO DO ADMIN (sessionStorage)
     ------------------------------------------------------------------------ */
  const Auth = {
    memory: false, // fallback caso o sessionStorage esteja bloqueado

    isAuthenticated: function () {
      try { return window.sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (_) { return this.memory; }
    },

    login: function (username, password) {
      const ok = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
      if (ok) {
        this.memory = true;
        try { window.sessionStorage.setItem(SESSION_KEY, 'true'); } catch (_) { /* usa memória */ }
      }
      return ok;
    },

    logout: function () {
      this.memory = false;
      try { window.sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* nada a fazer */ }
    },
  };

  /* ------------------------------------------------------------------------
     7. IMAGENS: leitura, redimensionamento e compressão via Canvas
     ------------------------------------------------------------------------ */
  const ImageTools = {
    readAsDataURL: function (file) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result)); };
        reader.onerror = function () { reject(new Error('Não foi possível ler o arquivo selecionado.')); };
        reader.readAsDataURL(file);
      });
    },

    loadImage: function (src) {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('Formato de imagem não suportado por este navegador.')); };
        img.src = src;
      });
    },

    /** Desenha a imagem em um canvas no tamanho indicado e exporta em WebP (ou JPEG). */
    encode: function (img, width, height, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = IMAGE_OPTIONS.background;
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let output = canvas.toDataURL('image/webp', quality);
      // Navegadores sem suporte a WebP devolvem PNG: usa JPEG nesse caso.
      if (output.indexOf('data:image/webp') !== 0) output = canvas.toDataURL('image/jpeg', quality);
      return output;
    },

    /**
     * Comprime um arquivo de imagem até caber no limite configurado.
     * Reduz primeiro a qualidade e, se necessário, as dimensões.
     */
    compress: function (file) {
      const self = this;
      return self.readAsDataURL(file)
        .then(function (dataUrl) { return self.loadImage(dataUrl); })
        .then(function (img) {
          const sourceW = img.naturalWidth || img.width;
          const sourceH = img.naturalHeight || img.height;
          if (!sourceW || !sourceH) throw new Error('A imagem selecionada parece estar vazia.');

          let scale = Math.min(1, IMAGE_OPTIONS.maxWidth / sourceW, IMAGE_OPTIONS.maxHeight / sourceH);
          let quality = IMAGE_OPTIONS.quality;
          let width = Math.max(1, Math.round(sourceW * scale));
          let height = Math.max(1, Math.round(sourceH * scale));
          let output = self.encode(img, width, height, quality);

          for (let attempt = 0; output.length > IMAGE_OPTIONS.maxChars && attempt < 8; attempt++) {
            if (quality > IMAGE_OPTIONS.minQuality) {
              quality = Math.max(IMAGE_OPTIONS.minQuality, quality - 0.1);
            } else {
              scale *= 0.8;
              width = Math.max(1, Math.round(sourceW * scale));
              height = Math.max(1, Math.round(sourceH * scale));
            }
            output = self.encode(img, width, height, quality);
          }

          return { dataUrl: output, width: width, height: height };
        });
    },
  };

  /* ------------------------------------------------------------------------
     8. COMPONENTES DE INTERFACE COMPARTILHADOS
     ------------------------------------------------------------------------ */

  /* ----- Abertura/fechamento animados de camadas (modal, dialog) ---------- */
  const layerTimers = new WeakMap();

  function openLayer(el) {
    clearTimeout(layerTimers.get(el));
    el.hidden = false;
    void el.offsetWidth; // força reflow para a transição de entrada acontecer
    el.classList.add('is-open');
  }

  function closeLayer(el, done) {
    el.classList.remove('is-open');
    clearTimeout(layerTimers.get(el));
    layerTimers.set(el, setTimeout(function () {
      el.hidden = true;
      if (done) done();
    }, prefersReducedMotion() ? 0 : 320));
  }

  /* ----- Trava de scroll com contador (suporta camadas sobrepostas) ------- */
  const ScrollLock = {
    count: 0,
    lock: function () {
      if (this.count++ > 0) return;
      const root = document.documentElement;
      root.style.setProperty('--scrollbar-w', (window.innerWidth - root.clientWidth) + 'px');
      root.classList.add('is-locked');
    },
    unlock: function () {
      if (this.count === 0) return;
      if (--this.count === 0) document.documentElement.classList.remove('is-locked');
    },
  };

  /* ----- Mantém o foco do teclado dentro de um container ------------------ */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const nodes = $$(FOCUSABLE, container).filter(function (n) { return n.offsetParent !== null; });
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ----- Toasts (notificações) -------------------------------------------- */
  const Toast = {
    container: null,

    show: function (message, type, timeout) {
      type = type || 'success';
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'toasts';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(this.container);
      }
      const iconName = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check-circle';
      const toast = document.createElement('div');
      toast.className = 'toast toast--' + type;
      toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
      toast.innerHTML = icon(iconName);
      const text = document.createElement('span');
      text.textContent = message; // textContent: nunca interpreta HTML
      toast.appendChild(text);
      this.container.appendChild(toast);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () { toast.classList.add('is-visible'); });
      });

      setTimeout(function () {
        toast.classList.remove('is-visible');
        setTimeout(function () { toast.remove(); }, 350);
      }, timeout || 3400);
    },
  };

  /* ----- Dialog de confirmação (substitui window.confirm) ----------------- */
  const Dialog = {
    el: null,
    resolver: null,
    lastFocus: null,

    build: function () {
      if (this.el) return;
      const self = this;
      const el = htmlToElement(
        '<div class="dialog" hidden>' +
          '<div class="dialog__backdrop" data-dialog-dismiss></div>' +
          '<div class="dialog__panel" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">' +
            '<div class="dialog__icon" data-dialog-icon></div>' +
            '<h2 class="dialog__title" id="dialog-title"></h2>' +
            '<p class="dialog__message" id="dialog-message"></p>' +
            '<div class="dialog__actions" data-dialog-actions></div>' +
          '</div>' +
        '</div>'
      );
      document.body.appendChild(el);

      el.addEventListener('click', function (event) {
        if (event.target.closest('[data-dialog-dismiss]')) { self.finish(null); return; }
        const button = event.target.closest('[data-dialog-value]');
        if (button) self.finish(button.dataset.dialogValue);
      });

      el.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          event.stopPropagation();
          self.finish(null);
          return;
        }
        trapFocus($('.dialog__panel', el), event);
      });

      this.el = el;
    },

    /**
     * Abre o dialog e resolve com o "value" da ação escolhida (ou null).
     * @param {{title:string, message:string, tone?:string, iconName?:string,
     *          cancelLabel?:string, actions:Array<{label:string,value:string,variant?:string}>}} options
     */
    open: function (options) {
      this.build();
      if (this.resolver) this.finish(null);

      const tone = options.tone || 'info';
      const iconBox = $('[data-dialog-icon]', this.el);
      iconBox.className = 'dialog__icon dialog__icon--' + tone;
      iconBox.innerHTML = icon(options.iconName || 'info', 'i--lg');
      $('#dialog-title', this.el).textContent = options.title;
      $('#dialog-message', this.el).textContent = options.message;

      const actions = $('[data-dialog-actions]', this.el);
      actions.innerHTML = '';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn btn--ghost';
      cancel.setAttribute('data-dialog-dismiss', '');
      cancel.textContent = options.cancelLabel || 'Cancelar';
      actions.appendChild(cancel);
      (options.actions || []).forEach(function (action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn--' + (action.variant || 'primary');
        button.dataset.dialogValue = action.value;
        button.textContent = action.label;
        actions.appendChild(button);
      });

      this.lastFocus = document.activeElement;
      openLayer(this.el);
      ScrollLock.lock();
      // Foco inicial em "Cancelar": evita confirmar ações destrutivas sem querer.
      requestAnimationFrame(function () { cancel.focus(); });

      const self = this;
      return new Promise(function (resolve) { self.resolver = resolve; });
    },

    confirm: function (options) {
      return this.open(Object.assign({}, options, {
        actions: [{ label: options.confirmLabel || 'Confirmar', value: 'confirm', variant: options.variant || 'primary' }],
      })).then(function (value) { return value === 'confirm'; });
    },

    finish: function (value) {
      if (!this.resolver) return;
      const resolve = this.resolver;
      this.resolver = null;
      closeLayer(this.el);
      ScrollLock.unlock();
      if (this.lastFocus && document.contains(this.lastFocus)) this.lastFocus.focus({ preventScroll: true });
      resolve(value);
    },
  };

  /* ----- Badges, mídia e capa automática ---------------------------------- */
  function categoryBadge(categoryId) {
    const cat = getCategory(categoryId);
    return '<span class="badge badge--category">' + icon(cat.icon, 'i--xs') + escapeHTML(cat.label) + '</span>';
  }

  function statusBadge(statusId) {
    const status = getStatus(statusId);
    return '<span class="badge badge--' + status.tone + '"><span class="badge__dot" aria-hidden="true"></span>' + escapeHTML(status.label) + '</span>';
  }

  /** Ilustração vetorial por categoria, usada como capa quando não há imagem. */
  function coverArt(categoryId) {
    function r(x, y, w, h, cls, rx) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx == null ? 2.5 : rx) + '" class="' + cls + '"/>';
    }
    let inner = '';

    switch (categoryId) {
      case 'saas': { // agenda / calendário
        inner += r(60, 68, 36, 5, 'cv-accent') + r(60, 80, 30, 4, 'cv-line') + r(60, 90, 34, 4, 'cv-line') +
                 r(60, 100, 26, 4, 'cv-line') + r(60, 110, 32, 4, 'cv-line');
        inner += r(116, 66, 58, 6, 'cv-line-strong') + r(232, 63, 34, 11, 'cv-accent-soft', 5.5);
        const highlight = { 3: 'cv-accent', 9: 'cv-accent-soft', 10: 'cv-accent-soft', 16: 'cv-accent-soft', 22: 'cv-accent-soft', 25: 'cv-accent-soft' };
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 7; col++) {
            const i = row * 7 + col;
            inner += r(116 + col * 22, 84 + row * 20, 18, 16, highlight[i] || 'cv-cell', 3);
          }
        }
        inner += '<g class="cv-float">' + r(178, 146, 100, 30, 'cv-popover', 7) + r(188, 155, 4, 12, 'cv-accent', 2) +
                 r(198, 155, 52, 4, 'cv-line-strong') + r(198, 163, 34, 4, 'cv-line') + '</g>';
        break;
      }
      case 'web': { // dashboard + lista de pedidos
        for (let i = 0; i < 3; i++) {
          const x = 60 + i * 70;
          inner += r(x, 66, 62, 36, 'cv-card', 6) + r(x + 8, 74, 24, 4, 'cv-line') +
                   r(x + 8, 84, i === 0 ? 38 : 30, 9, i === 0 ? 'cv-accent' : 'cv-line-strong', 3);
        }
        for (let j = 0; j < 3; j++) {
          const y = 114 + j * 22;
          inner += r(60, y, 16, 16, j === 1 ? 'cv-accent-soft' : 'cv-cell', 4) +
                   r(84, y + 2, 92 - j * 14, 5, 'cv-line-strong') + r(84, y + 10, 56, 4, 'cv-line') +
                   r(226, y + 3, 36, 10, j === 0 ? 'cv-accent' : 'cv-pill', 5);
        }
        break;
      }
      case 'automation': { // fluxo de nós conectados
        const node = function (x, y, accent) {
          return r(x, y, 64, 28, accent ? 'cv-node cv-node--accent' : 'cv-node', 7) +
                 '<circle cx="' + (x + 13) + '" cy="' + (y + 14) + '" r="5" class="' + (accent ? 'cv-accent' : 'cv-line-strong') + '"/>' +
                 r(x + 24, y + 9, 30, 4, 'cv-line-strong') + r(x + 24, y + 16, 20, 3.5, 'cv-line');
        };
        inner += '<path d="M128 84 H192" class="cv-wire"/>' +
                 '<path d="M96 98 C96 126 110 142 128 142" class="cv-wire"/>' +
                 '<path d="M224 98 C224 126 210 142 192 142" class="cv-wire"/>';
        inner += node(64, 70, false) + node(192, 70, false) + node(128, 128, true);
        inner += '<g class="cv-float">' + r(206, 150, 60, 22, 'cv-popover', 8) + r(214, 157, 32, 4, 'cv-line-strong') + r(214, 164, 22, 3, 'cv-line') + '</g>';
        break;
      }
      default: { // editor de código
        const lines = [[0, 54, 'cv-accent'], [1, 82, 'cv-line-strong'], [2, 64, 'cv-line'], [2, 96, 'cv-accent-soft'],
                       [1, 44, 'cv-line-strong'], [0, 30, 'cv-line'], [0, 70, 'cv-accent'], [1, 88, 'cv-line']];
        lines.forEach(function (line, i) {
          const y = 68 + i * 13;
          inner += r(60, y, 8, 4, 'cv-line', 2) + r(80 + line[0] * 14, y, line[1], 5, line[2]);
        });
        inner += '<rect x="186" y="157" width="2" height="9" class="cv-accent cv-caret"/>';
      }
    }

    return '<svg class="cover__art" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<rect x="48" y="28" width="224" height="180" rx="10" class="cv-window"/>' +
      '<path d="M48 52 H272" class="cv-divider"/>' +
      '<circle cx="62" cy="40" r="3" class="cv-dot"/><circle cx="72" cy="40" r="3" class="cv-dot"/><circle cx="82" cy="40" r="3" class="cv-dot"/>' +
      r(130, 36, 60, 8, 'cv-address', 4) + inner +
      '</svg>';
  }

  function coverMarkup(categoryId) {
    const cat = getCategory(categoryId);
    return '<div class="cover cover--' + cat.id + '" role="img" aria-label="Capa ilustrativa: ' + escapeHTML(cat.label) + '">' + coverArt(cat.id) + '</div>';
  }

  /** Imagem do projeto ou capa automática. Falhas de carregamento caem na capa (ver initImageFallback). */
  function renderMedia(project, options) {
    const opts = options || {};
    const src = safeImageSrc(project.image);
    if (!src) return coverMarkup(project.category);
    return '<img src="' + escapeHTML(src) + '" alt="' + escapeHTML(opts.alt != null ? opts.alt : 'Capa do projeto ' + project.name) + '"' +
      (opts.eager ? ' fetchpriority="high"' : ' loading="lazy"') +
      ' decoding="async" data-fallback="' + escapeHTML(project.category) + '">';
  }

  /* ------------------------------------------------------------------------
     9. MELHORIAS GLOBAIS (executadas nas duas páginas)
     ------------------------------------------------------------------------ */
  /** Caminho de arquivo do próprio site, como "curriculo.pdf" ou "docs/cv.pdf". */
  function isLocalFile(value) {
    return /^(?!.*:)(?!\/\/)[\w./-]+\.(pdf|docx?)$/i.test(String(value || '').trim());
  }

  function initContactLinks() {
    $$('[data-contact]').forEach(function (el) {
      const kind = el.dataset.contact;
      let href = '';
      if (kind === 'email') href = PROFILE.email ? mailtoUrl() : '';
      else if (kind === 'whatsapp') href = PROFILE.whatsappNumber ? whatsappUrl() : '';
      else if (kind === 'cv' && isLocalFile(PROFILE.cv)) href = PROFILE.cv.trim();
      else href = safeLink(PROFILE[kind] || '');
      // Arquivo da própria pasta (ex.: curriculo.pdf) é baixado direto
      if (kind === 'cv' && href && isLocalFile(PROFILE.cv)) el.setAttribute('download', '');
      else el.removeAttribute('download');
      el.hidden = !href;
      if (href) el.href = href;
    });
    $$('[data-profile]').forEach(function (el) {
      const value = PROFILE[el.dataset.profile];
      if (value) el.textContent = value;
    });
    $$('[data-profile-initials]').forEach(function (el) {
      el.textContent = String(PROFILE.name || '').split(/\s+/).filter(Boolean).slice(0, 2)
        .map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || '>_';
    });
    if (PROFILE.name && document.body.dataset.page === 'showcase') {
      document.title = PROFILE.name + ' · ' + PROFILE.role;
    }
    $$('[data-contact-label="email"]').forEach(function (el) { el.textContent = CONTACT.email; });
  }

  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  function initNavScroll() {
    const nav = $('.nav');
    if (!nav) return;
    const update = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /** Alternância entre tema claro e escuro (preferência salva no localStorage). */
  const THEME_KEY = 'saas-services:theme';
  function initTheme() {
    const root = document.documentElement;
    const apply = function (theme) {
      root.setAttribute('data-theme', theme);
      $$('[data-theme-toggle]').forEach(function (btn) {
        btn.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
      });
    };
    apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    document.addEventListener('click', function (event) {
      const btn = event.target.closest ? event.target.closest('[data-theme-toggle]') : null;
      if (!btn) return;
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* modo privado: vale só nesta sessão */ }
    });
    window.addEventListener('storage', function (event) {
      if (event.key === THEME_KEY && (event.newValue === 'light' || event.newValue === 'dark')) apply(event.newValue);
    });
  }

  /** Troca imagens quebradas pela capa automática (o evento error não propaga, por isso a captura). */
  function initImageFallback() {
    document.addEventListener('error', function (event) {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-fallback')) return;
      img.replaceWith(htmlToFragment(coverMarkup(img.getAttribute('data-fallback'))));
    }, true);
  }

  /** Contador animado (hero da vitrine). */
  function animateCount(el, to) {
    const from = Number(el.dataset.current || 0);
    el.dataset.current = String(to);
    if (from === to || prefersReducedMotion()) { el.textContent = pad2(to); return; }
    const start = performance.now();
    const duration = 700;
    const step = function (now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = pad2(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------------
     10. VITRINE (index.html)
     ------------------------------------------------------------------------ */
  function renderCard(project, index) {
    const link = safeLink(project.link);
    const visibleTags = project.tags.slice(0, 3);
    const hiddenTags = project.tags.length - visibleTags.length;
    const description = project.shortDescription || project.fullDescription || 'Detalhes deste projeto em breve.';
    const repo = safeLink(project.repo);

    const tagsHtml = visibleTags.length
      ? '<ul class="tags" aria-label="Tecnologias">' +
          visibleTags.map(function (t) { return '<li class="tag">' + escapeHTML(t) + '</li>'; }).join('') +
          (hiddenTags > 0 ? '<li class="tag tag--more">+' + hiddenTags + '</li>' : '') +
        '</ul>'
      : '';

    // Prioriza o projeto online; sem ele, mostra o código-fonte.
    const secondary = link
      ? '<a class="btn btn--ghost btn--sm" href="' + escapeHTML(link) + '" target="_blank" rel="noopener noreferrer">Ver online' + icon('arrow-up-right', 'i--sm i--shift-up') + '</a>'
      : repo
        ? '<a class="btn btn--ghost btn--sm" href="' + escapeHTML(repo) + '" target="_blank" rel="noopener noreferrer">' + icon('github', 'i--sm') + 'Código</a>'
        : '';

    return '' +
      '<article class="card spotlight" data-id="' + escapeHTML(project.id) + '" style="--i:' + index + '">' +
        '<div class="card__media">' + renderMedia(project) + '</div>' +
        '<div class="card__body">' +
          '<div class="card__badges">' + categoryBadge(project.category) + statusBadge(project.status) + '</div>' +
          '<div class="card__text">' +
            '<h3 class="card__title">' + escapeHTML(project.name) + '</h3>' +
            '<p class="card__desc">' + escapeHTML(description) + '</p>' +
          '</div>' +
          tagsHtml +
          '<div class="card__actions">' +
            '<button type="button" class="btn btn--secondary btn--sm" data-action="details" aria-haspopup="dialog">Ver Detalhes</button>' +
            secondary +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderModalContent(project) {
    const link = safeLink(project.link);
    const repo = safeLink(project.repo);
    let section = 1;

    const paragraphs = project.fullDescription
      ? project.fullDescription.split(/\n\s*\n/).map(function (p) {
          return '<p>' + escapeHTML(p.trim()).replace(/\n/g, '<br>') + '</p>';
        }).join('')
      : '';

    const about = paragraphs || !project.shortDescription
      ? '<section class="modal__section" style="--d:' + (section++) + '"><h3 class="modal__label">Sobre o projeto</h3>' +
          '<div class="prose">' + (paragraphs || '<p>Detalhes deste projeto em breve.</p>') + '</div></section>'
      : '';

    const features = project.features.length
      ? '<section class="modal__section" style="--d:' + (section++) + '"><h3 class="modal__label">Funcionalidades &amp; diferenciais</h3>' +
          '<ul class="feature-list">' + project.features.map(function (f) {
            return '<li><span class="feature-list__check">' + icon('check') + '</span><span>' + escapeHTML(f) + '</span></li>';
          }).join('') + '</ul></section>'
      : '';

    const tags = project.tags.length
      ? '<section class="modal__section" style="--d:' + (section++) + '"><h3 class="modal__label">Stack &amp; recursos</h3>' +
          '<ul class="tags">' + project.tags.map(function (t) { return '<li class="tag">' + escapeHTML(t) + '</li>'; }).join('') + '</ul></section>'
      : '';

    const actions =
      (link ? '<a class="btn btn--primary" href="' + escapeHTML(link) + '" target="_blank" rel="noopener noreferrer">Ver online' + icon('arrow-up-right', 'i--shift-up') + '</a>' : '') +
      (repo ? '<a class="btn ' + (link ? 'btn--secondary' : 'btn--primary') + '" href="' + escapeHTML(repo) + '" target="_blank" rel="noopener noreferrer">' + icon('github') + 'Ver código</a>' : '') +
      (PROFILE.email ? '<a class="btn btn--ghost" href="' + escapeHTML(mailtoUrl('Sobre o projeto ' + project.name)) + '">' + icon('mail') + 'Falar sobre este projeto</a>' : '');

    return '' +
      '<div class="modal__media">' + renderMedia(project, { eager: true }) + '</div>' +
      '<div class="modal__body">' +
        '<div class="card__badges">' + categoryBadge(project.category) + statusBadge(project.status) + '</div>' +
        '<h2 class="modal__title" id="modal-title">' + escapeHTML(project.name) + '</h2>' +
        (project.shortDescription ? '<p class="modal__lead">' + escapeHTML(project.shortDescription) + '</p>' : '') +
        about + features + tags +
        '<div class="modal__actions">' + actions + '</div>' +
      '</div>';
  }

  const Showcase = {
    filter: 'all',
    modalOpen: false,
    lastTrigger: null,

    init: function () {
      this.els = {
        filters: $('#filters'),
        grid: $('#projects-grid'),
        modal: $('#project-modal'),
        modalDialog: $('#project-modal .modal__dialog'),
        modalContent: $('#modal-content'),
      };
      if (!this.els.grid || !this.els.filters) return;
      this.refresh();
      this.bind();
    },

    refresh: function () {
      // Se a categoria filtrada deixou de existir após uma atualização, volta para "Todos".
      if (this.filter !== 'all' && !Store.items.some(function (p) { return p.category === this.filter; }, this)) {
        this.filter = 'all';
      }
      this.renderFilters();
      this.renderGrid();
      this.renderStats();
    },

    counts: function () {
      const counts = { all: Store.items.length };
      CATEGORIES.forEach(function (c) { counts[c.id] = 0; });
      Store.items.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
      return counts;
    },

    renderFilters: function () {
      const counts = this.counts();
      const active = this.filter;
      const tabs = [{ id: 'all', label: 'Todos', icon: 'grid' }].concat(CATEGORIES);
      this.els.filters.innerHTML =
        '<span class="tabs__indicator" aria-hidden="true"></span>' +
        tabs.map(function (tab) {
          return '<button type="button" class="tab" data-filter="' + tab.id + '" aria-pressed="' + (tab.id === active) + '">' +
            icon(tab.icon, 'i--sm') + '<span>' + escapeHTML(tab.label) + '</span>' +
            '<span class="tab__count">' + (counts[tab.id] || 0) + '</span>' +
          '</button>';
        }).join('');
      this.moveIndicator(false);
    },

    /** Posiciona o "pill" deslizante sob a aba ativa. */
    moveIndicator: function (animate) {
      const indicator = $('.tabs__indicator', this.els.filters);
      const activeTab = $('.tab[aria-pressed="true"]', this.els.filters);
      if (!indicator || !activeTab) return;
      if (!animate) indicator.style.transition = 'none';
      indicator.style.width = activeTab.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + activeTab.offsetLeft + 'px)';
      if (!animate) {
        void indicator.offsetWidth;
        indicator.style.transition = '';
      }
    },

    setFilter: function (id) {
      if (id === this.filter) return;
      this.filter = id;
      $$('.tab', this.els.filters).forEach(function (tab) {
        tab.setAttribute('aria-pressed', String(tab.dataset.filter === id));
      });
      this.moveIndicator(true);
      const activeTab = $('.tab[aria-pressed="true"]', this.els.filters);
      if (activeTab && this.els.filters.scrollWidth > this.els.filters.clientWidth) {
        activeTab.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }
      this.renderGrid();
    },

    renderGrid: function () {
      const filter = this.filter;
      const list = filter === 'all' ? Store.items : Store.items.filter(function (p) { return p.category === filter; });

      if (!list.length) {
        const noProjects = Store.items.length === 0;
        this.els.grid.innerHTML =
          '<div class="empty">' +
            '<span class="empty__icon">' + icon('inbox', 'i--lg') + '</span>' +
            '<p class="empty__title">' + (noProjects ? 'Novos projetos em breve' : 'Nenhum projeto nesta categoria ainda') + '</p>' +
            '<p>' + (noProjects ? 'Estou organizando os projetos por aqui. Enquanto isso, dá uma olhada no meu GitHub.' : 'Explore as outras categorias.') + '</p>' +
            (noProjects
              ? (PROFILE.github ? '<a class="btn btn--primary btn--sm" href="' + escapeHTML(safeLink(PROFILE.github)) + '" target="_blank" rel="noopener noreferrer">' + icon('github', 'i--sm') + 'Ver GitHub</a>' : '')
              : '<button type="button" class="btn btn--secondary btn--sm" data-action="reset-filter">Ver todos os projetos</button>') +
          '</div>';
        return;
      }

      this.els.grid.innerHTML = list.map(renderCard).join('');
    },

    renderStats: function () {
      const total = $('[data-stat="total"]');
      const production = $('[data-stat="production"]');
      if (total) animateCount(total, Store.items.length);
      if (production) animateCount(production, Store.items.filter(function (p) { return p.status === 'production'; }).length);
      // Tecnologias distintas usadas nos projetos (tags, sem diferenciar maiúsculas)
      const tech = $('[data-stat="tech"]');
      if (tech) {
        const seen = {};
        Store.items.forEach(function (p) { p.tags.forEach(function (t) { seen[t.toLowerCase()] = true; }); });
        animateCount(tech, Object.keys(seen).length);
      }
    },

    openModal: function (id, trigger) {
      const project = Store.get(id);
      if (!project) return;
      this.lastTrigger = trigger || null;
      this.els.modalContent.innerHTML = renderModalContent(project);
      this.els.modalContent.scrollTop = 0;
      if (!this.modalOpen) {
        openLayer(this.els.modal);
        ScrollLock.lock();
      }
      this.modalOpen = true;
      const closeBtn = $('.modal__close', this.els.modal);
      requestAnimationFrame(function () { closeBtn.focus({ preventScroll: true }); });
    },

    closeModal: function () {
      if (!this.modalOpen) return;
      this.modalOpen = false;
      closeLayer(this.els.modal);
      ScrollLock.unlock();
      if (this.lastTrigger && document.contains(this.lastTrigger)) this.lastTrigger.focus({ preventScroll: true });
    },

    bind: function () {
      const self = this;

      this.els.filters.addEventListener('click', function (event) {
        const tab = event.target.closest('[data-filter]');
        if (tab) self.setFilter(tab.dataset.filter);
      });

      // Clique no card (ou em "Ver Detalhes") abre o modal; links externos seguem normalmente.
      this.els.grid.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        if (event.target.closest('[data-action="reset-filter"]')) { self.setFilter('all'); return; }
        const card = event.target.closest('.card');
        if (card) self.openModal(card.dataset.id, $('[data-action="details"]', card));
      });

      this.els.modal.addEventListener('click', function (event) {
        if (event.target.closest('[data-close]')) self.closeModal();
      });

      document.addEventListener('keydown', function (event) {
        if (!self.modalOpen) return;
        if (event.key === 'Escape') { self.closeModal(); return; }
        trapFocus(self.els.modalDialog, event);
      });

      window.addEventListener('resize', debounce(function () { self.moveIndicator(false); }, 120));
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { self.moveIndicator(false); });
      }

      // Sincroniza com alterações feitas no painel aberto em outra aba.
      window.addEventListener('storage', function (event) {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        Store.init();
        self.refresh();
        if (self.modalOpen) self.closeModal();
      });
    },
  };

  /* ------------------------------------------------------------------------
     11. PAINEL ADMINISTRATIVO (admin.html)
     ------------------------------------------------------------------------ */
  const Admin = {
    editingId: null,
    image: '',      // valor atual da imagem (URL ou Base64)
    imageMeta: '',  // informação exibida sobre a imagem (dimensões/tamanho)

    init: function () {
      this.els = {
        login: $('#login'),
        loginForm: $('#login-form'),
        loginCard: $('.login__card'),
        loginError: $('#login-error'),
        passwordToggle: $('[data-toggle-password]'),
        dashboard: $('#dashboard'),
        logout: $('#logout-btn'),
        exportBtn: $('#export-btn'),
        importBtn: $('#import-btn'),
        importInput: $('#import-input'),
        newBtn: $('#new-btn'),
        statTotal: $('#stat-total'),
        statProduction: $('#stat-production'),
        statStorage: $('#stat-storage'),
        statStorageHint: $('#stat-storage-hint'),
        storageMeter: $('#storage-meter'),
        storageBar: $('#storage-bar'),
        formPanel: $('#form-panel'),
        form: $('#project-form'),
        formTitle: $('#form-title'),
        formBadge: $('#form-badge'),
        submit: $('#submit-btn'),
        cancel: $('#cancel-btn'),
        category: $('#f-category'),
        status: $('#f-status'),
        shortDesc: $('#f-short'),
        shortCounter: $('#short-counter'),
        imageUrl: $('#f-image-url'),
        imageFile: $('#f-image-file'),
        dropzone: $('#dropzone'),
        dropzoneText: $('#dropzone-text'),
        preview: $('#image-preview'),
        tags: $('#f-tags'),
        tagsPreview: $('#tags-preview'),
        list: $('#project-list'),
        listCount: $('#list-count'),
      };
      if (!this.els.form) return;

      this.populateSelects();
      this.bindLogin();
      this.bindDashboard();
      this.resetForm();

      if (Auth.isAuthenticated()) this.showDashboard();
      else this.showLogin();
    },

    /* ----- Login ---------------------------------------------------------- */
    showLogin: function () {
      this.els.dashboard.hidden = true;
      this.els.login.hidden = false;
      this.els.loginForm.reset();
      this.els.loginError.hidden = true;
      this.setPasswordVisible(false);
      const user = $('#login-user');
      requestAnimationFrame(function () { user.focus(); });
    },

    showDashboard: function () {
      this.els.login.hidden = true;
      this.els.dashboard.hidden = false;
      this.renderAll();
    },

    setPasswordVisible: function (visible) {
      const input = $('#login-pass');
      const toggle = this.els.passwordToggle;
      input.type = visible ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      toggle.innerHTML = icon(visible ? 'eye-off' : 'eye');
    },

    bindLogin: function () {
      const self = this;
      const els = this.els;

      els.loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const username = els.loginForm.elements.username.value.trim();
        const password = els.loginForm.elements.password.value;

        if (!username || !password) {
          self.showLoginError('Preencha usuário e senha.');
          return;
        }

        if (Auth.login(username, password)) {
          self.showDashboard();
          Toast.show('Login realizado. Bem-vindo ao painel.', 'success');
          return;
        }

        self.showLoginError('Usuário ou senha incorretos.');
        els.loginForm.elements.password.value = '';
        els.loginForm.elements.password.focus();
      });

      els.passwordToggle.addEventListener('click', function () {
        self.setPasswordVisible($('#login-pass').type === 'password');
      });
    },

    showLoginError: function (message) {
      const els = this.els;
      els.loginError.innerHTML = icon('alert', 'i--sm');
      els.loginError.appendChild(document.createTextNode(message));
      els.loginError.hidden = false;
      els.loginCard.classList.remove('is-shaking');
      void els.loginCard.offsetWidth; // reinicia a animação
      els.loginCard.classList.add('is-shaking');
    },

    /* ----- Dashboard: eventos -------------------------------------------- */
    bindDashboard: function () {
      const self = this;
      const els = this.els;

      els.logout.addEventListener('click', function () {
        Auth.logout();
        self.resetForm();
        self.showLogin();
        Toast.show('Sessão encerrada.', 'info');
      });

      els.newBtn.addEventListener('click', function () {
        self.resetForm();
        self.focusForm();
      });

      els.exportBtn.addEventListener('click', function () { self.exportJSON(); });
      els.importBtn.addEventListener('click', function () { els.importInput.click(); });
      els.importInput.addEventListener('change', function () {
        const file = els.importInput.files && els.importInput.files[0];
        els.importInput.value = '';
        if (file) self.importJSON(file);
      });

      els.form.addEventListener('submit', function (event) { self.handleSubmit(event); });
      els.cancel.addEventListener('click', function () {
        self.resetForm();
        Toast.show('Edição cancelada.', 'info');
      });

      els.form.elements.name.addEventListener('input', function () { self.clearFieldError('name'); });
      els.form.elements.link.addEventListener('input', function () { self.clearFieldError('link'); });
      els.form.elements.repo.addEventListener('input', function () { self.clearFieldError('repo'); });
      els.shortDesc.addEventListener('input', function () { self.updateCounter(); });
      els.tags.addEventListener('input', function () { self.renderTagsPreview(); });
      els.category.addEventListener('change', function () { if (!self.image) self.renderPreview(); });

      // Imagem: alternância URL / Upload
      $$('[data-image-mode]', els.form).forEach(function (button) {
        button.addEventListener('click', function () { self.setImageMode(button.dataset.imageMode); });
      });

      els.imageUrl.addEventListener('input', debounce(function () {
        self.image = els.imageUrl.value.trim();
        self.imageMeta = '';
        self.clearFieldError('image');
        self.renderPreview();
      }, 350));

      els.imageFile.addEventListener('change', function () {
        const file = els.imageFile.files && els.imageFile.files[0];
        if (file) self.handleImageFile(file);
      });

      ['dragenter', 'dragover'].forEach(function (type) {
        els.dropzone.addEventListener(type, function () { els.dropzone.classList.add('is-dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        els.dropzone.addEventListener(type, function () { els.dropzone.classList.remove('is-dragover'); });
      });

      els.preview.addEventListener('click', function (event) {
        if (event.target.closest('[data-action="remove-image"]')) self.clearImage();
      });

      // Lista: delegação de eventos dos botões de ação
      els.list.addEventListener('click', function (event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const item = button.closest('[data-id]');
        self.handleListAction(button.dataset.action, item ? item.dataset.id : null);
      });

      // Mantém o painel sincronizado se os dados mudarem em outra aba.
      window.addEventListener('storage', function (event) {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        Store.init();
        if (self.editingId && !Store.get(self.editingId)) self.resetForm();
        if (!self.els.dashboard.hidden) self.renderAll();
      });
    },

    populateSelects: function () {
      this.els.category.innerHTML = CATEGORIES.map(function (c) {
        return '<option value="' + c.id + '">' + escapeHTML(c.label) + '</option>';
      }).join('');
      this.els.status.innerHTML = STATUSES.map(function (s) {
        return '<option value="' + s.id + '">' + escapeHTML(s.label) + '</option>';
      }).join('');
    },

    /* ----- Formulário ----------------------------------------------------- */
    resetForm: function () {
      const els = this.els;
      this.editingId = null;
      this.image = '';
      this.imageMeta = '';
      els.form.reset();
      this.clearAllErrors();
      this.setImageMode('url');
      this.renderPreview();
      this.updateCounter();
      this.renderTagsPreview();
      els.formTitle.textContent = 'Novo projeto';
      els.formBadge.textContent = 'cadastro';
      els.formBadge.classList.remove('pill--accent');
      els.submit.innerHTML = icon('plus') + 'Cadastrar projeto';
      els.cancel.hidden = true;
      els.formPanel.classList.remove('is-editing');
      this.markEditingItem();
    },

    startEdit: function (id) {
      const project = Store.get(id);
      if (!project) return;
      const els = this.els;
      const fields = els.form.elements;

      this.editingId = id;
      this.clearAllErrors();
      fields.name.value = project.name;
      fields.category.value = project.category;
      fields.status.value = project.status;
      fields.shortDescription.value = project.shortDescription;
      fields.fullDescription.value = project.fullDescription;
      fields.features.value = project.features.join('\n');
      fields.link.value = project.link;
      fields.repo.value = project.repo || '';
      fields.tags.value = project.tags.join(', ');

      const isUpload = project.image.indexOf('data:') === 0;
      this.image = project.image;
      this.imageMeta = isUpload ? formatBytes(Math.round(project.image.length * 0.75)) + ' · arquivo local' : '';
      els.imageUrl.value = isUpload ? '' : project.image;
      this.setImageMode(isUpload ? 'upload' : 'url');
      this.renderPreview();
      this.updateCounter();
      this.renderTagsPreview();

      els.formTitle.textContent = 'Editar: ' + project.name;
      els.formBadge.textContent = 'edição';
      els.formBadge.classList.add('pill--accent');
      els.submit.innerHTML = icon('save') + 'Salvar alterações';
      els.cancel.hidden = false;
      els.formPanel.classList.add('is-editing');
      this.markEditingItem();
      this.focusForm();
    },

    focusForm: function () {
      const panel = this.els.formPanel;
      const name = this.els.form.elements.name;
      const rect = panel.getBoundingClientRect();
      // Só rola quando o formulário não está visível (ex.: mobile).
      if (rect.top < 60 || rect.top > window.innerHeight * 0.6) {
        panel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
      setTimeout(function () { name.focus({ preventScroll: true }); }, 250);
    },

    handleSubmit: function (event) {
      event.preventDefault();
      const fields = this.els.form.elements;
      this.clearAllErrors();

      const name = fields.name.value.trim();
      if (!name) {
        this.setFieldError('name', 'Informe o nome do projeto.');
        fields.name.focus();
        return;
      }

      const rawLink = fields.link.value.trim();
      const link = rawLink ? safeLink(rawLink) : '';
      if (rawLink && !link) {
        this.setFieldError('link', 'Informe uma URL válida, por exemplo https://meuprojeto.com.br');
        fields.link.focus();
        return;
      }

      const rawRepo = fields.repo.value.trim();
      const repo = rawRepo ? safeLink(rawRepo) : '';
      if (rawRepo && !repo) {
        this.setFieldError('repo', 'Informe uma URL válida, por exemplo https://github.com/voce/projeto');
        fields.repo.focus();
        return;
      }

      // Garante que a URL digitada por último seja considerada (debounce),
      // sem descartar uma imagem enviada por upload quando o campo de URL está vazio.
      const typedUrl = this.els.imageUrl.value.trim();
      if (this.imageMode === 'url' && (typedUrl || this.image.indexOf('data:') !== 0)) this.image = typedUrl;
      if (this.image && !safeImageSrc(this.image)) {
        this.setFieldError('image', 'Use uma URL de imagem iniciada por http:// ou https://.');
        this.els.imageUrl.focus();
        return;
      }

      const data = {
        name: name,
        category: fields.category.value,
        status: fields.status.value,
        shortDescription: fields.shortDescription.value,
        fullDescription: fields.fullDescription.value,
        features: fields.features.value,
        tags: fields.tags.value,
        image: this.image,
        link: link,
        repo: repo,
      };

      const isEdit = Boolean(this.editingId);
      const result = isEdit ? Store.update(this.editingId, data) : Store.create(data);
      if (!result.ok) {
        Toast.show(storageErrorMessage(result.error), 'error', 7000);
        return;
      }

      Toast.show(isEdit ? '"' + name + '" foi atualizado.' : '"' + name + '" foi cadastrado na vitrine.', 'success');
      const savedId = result.project.id;
      this.resetForm();
      this.renderAll({ highlight: savedId });
    },

    /* ----- Erros de validação -------------------------------------------- */
    fieldInput: function (field) {
      if (field === 'image') return this.els.imageUrl;
      return this.els.form.elements[field] || null;
    },

    setFieldError: function (field, message) {
      const error = $('[data-error-for="' + field + '"]', this.els.form);
      const input = this.fieldInput(field);
      if (error) {
        error.innerHTML = icon('alert', 'i--xs');
        error.appendChild(document.createTextNode(message));
        error.hidden = false;
      }
      if (input) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
      }
    },

    clearFieldError: function (field) {
      const error = $('[data-error-for="' + field + '"]', this.els.form);
      const input = this.fieldInput(field);
      if (error) { error.hidden = true; error.textContent = ''; }
      if (input) {
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
      }
    },

    clearAllErrors: function () {
      const self = this;
      ['name', 'link', 'repo', 'image'].forEach(function (f) { self.clearFieldError(f); });
    },

    updateCounter: function () {
      const max = Number(this.els.shortDesc.getAttribute('maxlength')) || 180;
      const length = this.els.shortDesc.value.length;
      this.els.shortCounter.textContent = length + '/' + max;
      this.els.shortCounter.classList.toggle('is-near', length > max * 0.9);
    },

    renderTagsPreview: function () {
      const tags = uniqueCaseInsensitive(toList(this.els.tags.value, ','));
      this.els.tagsPreview.innerHTML = tags.map(function (t) { return '<li class="tag">' + escapeHTML(t) + '</li>'; }).join('');
    },

    /* ----- Imagem --------------------------------------------------------- */
    setImageMode: function (mode) {
      this.imageMode = mode;
      $$('[data-image-mode]', this.els.form).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.imageMode === mode));
      });
      $$('[data-image-panel]', this.els.form).forEach(function (panel) {
        panel.hidden = panel.dataset.imagePanel !== mode;
      });
    },

    handleImageFile: function (file) {
      const self = this;
      const els = this.els;

      if (!/^image\//.test(file.type)) {
        Toast.show('Selecione um arquivo de imagem (JPG, PNG ou WebP).', 'error');
        els.imageFile.value = '';
        return;
      }
      if (file.size > IMAGE_OPTIONS.maxInputBytes) {
        Toast.show('Imagem muito grande. Envie um arquivo de até ' + formatBytes(IMAGE_OPTIONS.maxInputBytes) + '.', 'error');
        els.imageFile.value = '';
        return;
      }

      els.dropzone.classList.add('is-loading');
      els.dropzoneText.textContent = 'Otimizando imagem...';
      const dzIcon = $('#dropzone-icon');
      if (dzIcon) dzIcon.outerHTML = icon('loader', '').replace('<svg ', '<svg id="dropzone-icon" ');

      ImageTools.compress(file)
        .then(function (result) {
          const size = Math.round(result.dataUrl.length * 0.75);
          self.image = result.dataUrl;
          self.imageMeta = result.width + '×' + result.height + ' · ' + formatBytes(size);
          els.imageUrl.value = '';
          self.clearFieldError('image');
          self.renderPreview();
          Toast.show('Imagem otimizada: ' + formatBytes(file.size) + ' → ' + formatBytes(size) + '.', 'success');
        })
        .catch(function (error) {
          Toast.show(error.message || 'Não foi possível processar a imagem.', 'error', 5000);
        })
        .then(function () {
          els.dropzone.classList.remove('is-loading');
          els.dropzoneText.innerHTML = '<strong>Clique para enviar</strong> ou arraste uma imagem';
          const current = $('#dropzone-icon');
          if (current) current.outerHTML = icon('image', '').replace('<svg ', '<svg id="dropzone-icon" ');
          els.imageFile.value = '';
        });
    },

    clearImage: function () {
      this.image = '';
      this.imageMeta = '';
      this.els.imageUrl.value = '';
      this.clearFieldError('image');
      this.renderPreview();
    },

    renderPreview: function () {
      const self = this;
      const box = this.els.preview;
      const current = this.image;
      const src = safeImageSrc(current);
      const category = this.els.category.value;

      if (!src) {
        box.innerHTML = coverMarkup(category) + '<span class="preview__meta">sem imagem · capa automática</span>';
        return;
      }

      box.innerHTML =
        '<img alt="Pré-visualização da capa do projeto">' +
        (this.imageMeta ? '<span class="preview__meta">' + escapeHTML(this.imageMeta) + '</span>' : '') +
        '<button type="button" class="icon-btn icon-btn--sm preview__remove" data-action="remove-image" aria-label="Remover imagem" title="Remover imagem">' + icon('x', 'i--sm') + '</button>';

      const img = $('img', box);
      img.addEventListener('error', function () {
        if (self.image !== current) return; // ignora respostas de URLs antigas
        self.setFieldError('image', 'Não foi possível carregar esta imagem. Confira a URL (a vitrine usará a capa automática).');
        img.replaceWith(htmlToFragment(coverMarkup(category)));
      }, { once: true });
      img.src = src;
    },

    /* ----- Lista ---------------------------------------------------------- */
    markEditingItem: function () {
      const editingId = this.editingId;
      $$('.item', this.els.list).forEach(function (item) {
        item.classList.toggle('is-editing', item.dataset.id === editingId);
      });
    },

    renderList: function (options) {
      const opts = options || {};
      const items = Store.items;
      const list = this.els.list;
      const editingId = this.editingId;
      this.els.listCount.textContent = String(items.length);

      if (!items.length) {
        list.innerHTML =
          '<li class="list-empty">' +
            '<span class="empty__icon">' + icon('inbox', 'i--lg') + '</span>' +
            '<p class="empty__title">Nenhum projeto cadastrado</p>' +
            '<p>Use o formulário para adicionar o primeiro projeto ou restaure os exemplos.</p>' +
            '<button type="button" class="btn btn--secondary btn--sm" data-action="restore-seeds">' + icon('refresh', 'i--sm') + 'Restaurar projetos de exemplo</button>' +
          '</li>';
        return;
      }

      const last = items.length - 1;
      list.innerHTML = items.map(function (p, i) {
        const name = escapeHTML(p.name);
        return '' +
          '<li class="item' + (p.id === editingId ? ' is-editing' : '') + '" data-id="' + escapeHTML(p.id) + '">' +
            '<span class="item__pos" aria-hidden="true">' + pad2(i + 1) + '</span>' +
            '<div class="item__thumb">' + renderMedia(p, { alt: '' }) + '</div>' +
            '<div class="item__body">' +
              '<p class="item__title" title="' + name + '">' + name + '</p>' +
              '<div class="item__meta">' + categoryBadge(p.category) + statusBadge(p.status) + '</div>' +
            '</div>' +
            '<div class="item__actions">' +
              '<button type="button" class="icon-btn icon-btn--sm" data-action="up" title="Subir" aria-label="Mover ' + name + ' para cima"' + (i === 0 ? ' disabled' : '') + '>' + icon('chevron-up') + '</button>' +
              '<button type="button" class="icon-btn icon-btn--sm" data-action="down" title="Descer" aria-label="Mover ' + name + ' para baixo"' + (i === last ? ' disabled' : '') + '>' + icon('chevron-down') + '</button>' +
              '<span class="item__sep" aria-hidden="true"></span>' +
              '<button type="button" class="icon-btn icon-btn--sm" data-action="edit" title="Editar" aria-label="Editar ' + name + '">' + icon('pencil', 'i--sm') + '</button>' +
              '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-action="delete" title="Excluir" aria-label="Excluir ' + name + '">' + icon('trash', 'i--sm') + '</button>' +
            '</div>' +
          '</li>';
      }).join('');

      if (opts.highlight) {
        const item = this.findItem(opts.highlight);
        if (item) item.classList.add('is-moved');
      }
    },

    findItem: function (id) {
      return $$('.item', this.els.list).find(function (el) { return el.dataset.id === id; }) || null;
    },

    renderStats: function () {
      const items = Store.items;
      const used = Store.usage();
      const percent = Math.min(100, (used / STORAGE_QUOTA) * 100);

      this.els.statTotal.textContent = String(items.length);
      this.els.statProduction.textContent = String(items.filter(function (p) { return p.status === 'production'; }).length);
      this.els.statStorage.textContent = formatBytes(used);
      this.els.statStorageHint.textContent = percent.toFixed(percent < 10 ? 1 : 0) + '% de ~5 MB';
      this.els.storageBar.style.width = (used ? Math.max(percent, 1.5) : 0) + '%';
      this.els.storageMeter.setAttribute('aria-valuenow', String(Math.round(percent)));
      this.els.storageMeter.classList.toggle('is-warn', percent >= 70 && percent < 90);
      this.els.storageMeter.classList.toggle('is-danger', percent >= 90);
    },

    renderAll: function (options) {
      this.renderList(options);
      this.renderStats();
    },

    handleListAction: function (action, id) {
      const self = this;

      if (action === 'restore-seeds') {
        const result = Store.restoreSeeds();
        if (!result.ok) { Toast.show(storageErrorMessage(result.error), 'error', 6000); return; }
        this.renderAll();
        Toast.show('Projetos de exemplo restaurados.', 'success');
        return;
      }

      const project = id ? Store.get(id) : null;
      if (!project) return;

      if (action === 'up' || action === 'down') {
        const result = Store.move(id, action === 'up' ? -1 : 1);
        if (!result.ok) {
          if (result.error) Toast.show(storageErrorMessage(result.error), 'error');
          return;
        }
        this.renderAll({ highlight: id });
        // Mantém o foco no mesmo botão para permitir mover várias posições pelo teclado.
        const item = this.findItem(id);
        if (item) {
          const same = $('[data-action="' + action + '"]', item);
          const fallback = $('[data-action="' + (action === 'up' ? 'down' : 'up') + '"]', item);
          (same && !same.disabled ? same : fallback).focus({ preventScroll: true });
        }
        return;
      }

      if (action === 'edit') {
        this.startEdit(id);
        return;
      }

      if (action === 'delete') {
        Dialog.confirm({
          title: 'Excluir projeto?',
          message: '"' + project.name + '" será removido da vitrine. Esta ação não pode ser desfeita (exporte um backup antes, se necessário).',
          confirmLabel: 'Excluir projeto',
          variant: 'danger',
          tone: 'danger',
          iconName: 'trash',
        }).then(function (confirmed) {
          if (!confirmed) return;
          const result = Store.remove(id);
          if (!result.ok) { Toast.show(storageErrorMessage(result.error), 'error'); return; }
          if (self.editingId === id) self.resetForm();
          self.renderAll();
          Toast.show('"' + project.name + '" foi excluído.', 'success');
        });
      }
    },

    /* ----- Backup: exportar / importar JSON ------------------------------ */
    exportJSON: function () {
      const projects = Store.all();
      const payload = {
        app: 'portfolio',
        schema: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        count: projects.length,
        projects: projects,
        site: SiteContent.data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Mesmo nome que a vitrine procura: basta colocar este arquivo na raiz e publicar.
      a.download = DATA_FILE;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      Toast.show('Backup exportado com ' + plural(projects.length, 'projeto', 'projetos') + '.', 'success');
    },

    importJSON: function (file) {
      const self = this;

      readFileAsText(file)
        .then(function (text) {
          let parsed;
          try { parsed = JSON.parse(text); } catch (_) {
            throw new Error('Arquivo JSON inválido ou corrompido.');
          }
          const raw = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.projects) ? parsed.projects : null);
          const site = parsed && !Array.isArray(parsed) && parsed.site && typeof parsed.site === 'object' ? parsed.site : null;
          if (site) {
            const saved = SiteContent.save(site);
            if (!saved.ok) throw new Error(storageErrorMessage(saved.error));
            SiteEditor.fill(SiteContent.data);
            if (!raw || !raw.length) { Toast.show('Conteúdo do site importado.', 'success'); return null; }
          }
          if (!raw) throw new Error('Formato não reconhecido: o arquivo não contém projetos nem conteúdo do site.');

          // Normaliza e garante ids únicos dentro do próprio arquivo.
          const seen = new Set();
          const list = raw.map(normalizeProject).filter(Boolean).map(function (p) {
            if (seen.has(p.id)) p.id = uid();
            seen.add(p.id);
            return p;
          });
          if (!list.length) throw new Error('Nenhum projeto válido encontrado no arquivo.');
          return list;
        })
        .then(function (list) {
          if (!list) return { choice: null };
          return Dialog.open({
            title: 'Importar backup',
            message: plural(list.length, 'projeto encontrado', 'projetos encontrados') + ' em "' + file.name + '". ' +
              '"Mesclar" mantém os projetos atuais e atualiza os que tiverem o mesmo ID. "Substituir tudo" apaga a lista atual.',
            tone: 'info',
            iconName: 'upload',
            actions: [
              { label: 'Mesclar', value: 'merge', variant: 'secondary' },
              { label: 'Substituir tudo', value: 'replace', variant: 'danger' },
            ],
          }).then(function (choice) { return { choice: choice, list: list }; });
        })
        .then(function (data) {
          if (!data.choice) return;
          const result = data.choice === 'replace' ? Store.replaceAll(data.list) : Store.merge(data.list);
          if (!result.ok) { Toast.show(storageErrorMessage(result.error), 'error', 7000); return; }
          self.resetForm();
          self.renderAll();
          Toast.show(plural(data.list.length, 'projeto importado', 'projetos importados') + ' com sucesso.', 'success');
        })
        .catch(function (error) {
          Toast.show(error.message || 'Não foi possível importar o arquivo.', 'error', 6000);
        });
    },
  };

  /* ------------------------------------------------------------------------
     11b. CONTEÚDO DO SITE (textos, perfil, serviços, stack…)
     Tudo o que aparece na vitrine fica salvo em localStorage e é editável
     pela aba "Conteúdo do site" do painel. DEFAULT_SITE é o conteúdo inicial.
     ------------------------------------------------------------------------ */
  const SITE_KEY = 'saas-services:site:v1';

  const DEFAULT_SITE = {
    profile: {
      name: PROFILE.name,
      role: PROFILE.role,
      location: PROFILE.location,
      status: 'Aberto a oportunidades',
      email: PROFILE.email,
      github: PROFILE.github,
      linkedin: PROFILE.linkedin,
      cv: PROFILE.cv,
      whatsappNumber: PROFILE.whatsappNumber,
      whatsappMessage: PROFILE.whatsappMessage,
    },
    seo: {
      title: '',
      description: 'Portfólio de desenvolvedor full-stack: projetos SaaS, sistemas web e automações, com código, stack e detalhes de cada projeto.',
    },
    hero: {
      titleBefore: 'Eu transformo ideias em software que',
      titleHighlight: 'funciona',
      titleAfter: 'de verdade.',
      subtitle: 'Crio aplicações web, produtos SaaS e automações, do banco de dados à interface. Gosto de código limpo, de interface bem feita e de software que resolve problema real.',
      ctaPrimary: 'Ver projetos',
      statProjects: 'Projetos',
      statProduction: 'Em produção',
      statTech: 'Tecnologias',
    },
    about: {
      kicker: 'Sobre mim',
      title: 'Quem está por trás do código.',
      text: 'Sou desenvolvedor e gosto de construir coisas que as pessoas realmente usam. Comecei automatizando tarefas chatas e hoje desenvolvo sistemas completos: modelo o banco, escrevo a API, cuido da interface e coloco no ar.\n\n' +
        'Este site é um exemplo: foi feito com HTML, CSS e JavaScript puro, sem framework, com tema claro e escuro e um painel próprio para gerenciar os projetos.',
    },
    services: [
      { title: 'Produtos SaaS', text: 'Plataformas com login, planos, painel de métricas e múltiplos clientes na mesma base.', tags: 'multi-tenant, auth, dashboards' },
      { title: 'Sistemas web', text: 'Sistemas de gestão, painéis internos e interfaces responsivas que funcionam bem no celular.', tags: 'CRUD, APIs REST, PWA' },
      { title: 'Automações', text: 'Bots, integrações entre sistemas e scripts que tiram trabalho manual e repetitivo do caminho.', tags: 'WhatsApp, integrações, IA' },
    ],
    projects: {
      kicker: 'Projetos',
      title: 'Coisas que eu construí.',
      desc: 'Projetos pessoais, freelas e estudos. Clique em um card para ver o problema, as funcionalidades e a stack usada.',
    },
    stack: {
      kicker: 'Stack',
      title: 'Ferramentas do dia a dia.',
      desc: 'O que eu uso para tirar um projeto do papel. Sempre aprendendo algo novo.',
      groups: [
        { title: 'Front-end', tags: 'HTML, CSS, JavaScript, TypeScript, React' },
        { title: 'Back-end', tags: 'Node.js, Express, Python, APIs REST' },
        { title: 'Dados & infra', tags: 'PostgreSQL, Firebase, Docker, Git' },
        { title: 'Automação & IA', tags: 'n8n, WhatsApp API, OpenAI, Google Sheets' },
        { title: '', tags: '' },
        { title: '', tags: '' },
      ],
    },
    contact: {
      kicker: 'Contato',
      title: 'Bora construir algo juntos?',
      text: 'Estou aberto a vagas, freelas e colaborações. Me chama por e-mail ou no LinkedIn que eu respondo rápido.',
    },
    footer: {
      text: 'Feito à mão com HTML, CSS e JavaScript.',
    },
  };

  const SERVICE_ICONS = ['layers', 'app-window', 'zap'];
  const STACK_ICONS = ['app-window', 'code', 'database', 'zap', 'layers', 'folder'];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  /** Mescla o salvo sobre o padrão, aceitando só campos conhecidos (strings). */
  function mergeSite(base, saved) {
    if (Array.isArray(base)) {
      return base.map(function (item, i) { return mergeSite(item, Array.isArray(saved) ? saved[i] : undefined); });
    }
    if (base && typeof base === 'object') {
      const out = {};
      Object.keys(base).forEach(function (k) { out[k] = mergeSite(base[k], saved && typeof saved === 'object' ? saved[k] : undefined); });
      return out;
    }
    return typeof saved === 'string' ? saved : base;
  }

  function getPath(obj, path) {
    return path.split('.').reduce(function (acc, k) { return acc == null ? acc : acc[k]; }, obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce(function (acc, k) { return acc[k]; }, obj);
    if (target && Object.prototype.hasOwnProperty.call(target, last)) target[last] = value;
  }

  const SiteContent = {
    data: clone(DEFAULT_SITE),

    init: function () {
      let saved = null;
      try { saved = JSON.parse(window.localStorage.getItem(SITE_KEY) || 'null'); } catch (_) { saved = null; }
      if (!saved && PUBLISHED && PUBLISHED.site && typeof PUBLISHED.site === 'object') saved = PUBLISHED.site;
      this.data = mergeSite(DEFAULT_SITE, saved);
      Object.assign(PROFILE, this.data.profile);
      return this;
    },

    save: function (next) {
      const data = mergeSite(DEFAULT_SITE, next);
      try {
        window.localStorage.setItem(SITE_KEY, JSON.stringify(data));
      } catch (error) {
        return { ok: false, error: error };
      }
      this.data = data;
      Object.assign(PROFILE, data.profile);
      return { ok: true };
    },

    reset: function () {
      try { window.localStorage.removeItem(SITE_KEY); } catch (_) { /* ignora */ }
      this.data = clone(DEFAULT_SITE);
      Object.assign(PROFILE, this.data.profile);
    },

    /** Preenche a vitrine com o conteúdo salvo. */
    apply: function () {
      const d = this.data;

      $$('[data-site]').forEach(function (el) {
        const value = getPath(d, el.dataset.site);
        if (typeof value !== 'string') return;
        el.textContent = value;
        // Esconde elementos opcionais vazios (ex.: descrições)
        if (el.hasAttribute('data-site-optional')) el.hidden = !value.trim();
      });

      $$('[data-site-paragraphs]').forEach(function (el) {
        const value = getPath(d, el.dataset.siteParagraphs) || '';
        el.innerHTML = value.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
          .map(function (p) { return '<p>' + escapeHTML(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
      });

      // Foco = títulos dos cards de "O que eu faço"
      const focusList = d.services.map(function (s) { return s.title.trim(); }).filter(Boolean);
      const focus = $('#about-focus');
      if (focus) focus.textContent = focusList.join(' · ');
      $$('.facts__row').forEach(function (row) {
        const dd = row.querySelector('dd');
        row.hidden = !dd || !dd.textContent.trim();
      });

      // Editor de código do hero: um objeto que descreve você
      const code = $('#hero-code');
      if (code) {
        const str = function (v) { return '<span class="c-str">"' + escapeHTML(v) + '"</span>'; };
        const key = function (k) { return '<span class="c-key">' + k + '</span>: '; };
        const arr = function (list) {
          const shown = list.slice(0, 4).map(str).join(', ');
          return '[' + shown + (list.length > 4 ? ', <span class="c-muted">…</span>' : '') + ']';
        };
        const stackTags = [];
        d.stack.groups.forEach(function (g) {
          uniqueCaseInsensitive(toList(g.tags, ',')).forEach(function (t) { if (stackTags.indexOf(t) === -1) stackTags.push(t); });
        });
        const rows = [
          '<span class="c-kw">const</span> <span class="c-var">dev</span> = {',
          '  ' + key('nome') + str(d.profile.name) + ',',
        ];
        if (d.profile.role) rows.push('  ' + key('cargo') + str(d.profile.role) + ',');
        if (d.profile.location) rows.push('  ' + key('local') + str(d.profile.location) + ',');
        if (stackTags.length) rows.push('  ' + key('stack') + arr(stackTags) + ',');
        if (focusList.length) rows.push('  ' + key('foco') + arr(focusList) + ',');
        rows.push('  ' + key('disponivel') + '<span class="c-kw">' + (d.profile.status.trim() ? 'true' : 'false') + '</span>,');
        rows.push('};');
        rows.push('');
        rows.push('<span class="c-muted">// bora conversar? role até o contato</span>');
        code.innerHTML = rows.map(function (r) { return '<li><span class="code-line">' + (r || ' ') + '</span></li>'; }).join('');
      }

      $$('[data-status-pill]').forEach(function (el) {
        el.hidden = !d.profile.status.trim();
        el.title = d.profile.status;
      });

      const services = $('#services-list');
      if (services) {
        services.innerHTML = d.services.filter(function (s) { return s.title.trim() || s.text.trim(); }).map(function (s, i) {
          return '<article class="service">' +
            '<div class="service__icon">' + icon(SERVICE_ICONS[i % SERVICE_ICONS.length], 'i--lg') + '</div>' +
            '<h3 class="service__title">' + escapeHTML(s.title) + '</h3>' +
            '<p class="service__text">' + escapeHTML(s.text) + '</p>' +
            tagList(s.tags) +
          '</article>';
        }).join('');
      }

      const stack = $('#stack-list');
      if (stack) {
        const groups = d.stack.groups.filter(function (g) { return g.title.trim() || g.tags.trim(); });
        stack.dataset.count = String(groups.length);
        stack.hidden = !groups.length;
        stack.innerHTML = groups.map(function (g, i) {
          return '<div class="stack__group">' +
            '<h3 class="stack__title">' + icon(STACK_ICONS[i % STACK_ICONS.length], 'i--sm') + escapeHTML(g.title) + '</h3>' +
            tagList(g.tags) +
          '</div>';
        }).join('');
      }

      if (document.body.dataset.page === 'showcase') {
        document.title = d.seo.title.trim() || (d.profile.name + (d.profile.role ? ' · ' + d.profile.role : ''));
        const meta = $('meta[name="description"]');
        if (meta) meta.setAttribute('content', d.seo.description);
      }
    },
  };

  function tagList(value) {
    const tags = uniqueCaseInsensitive(toList(value, ','));
    return tags.length
      ? '<ul class="tags">' + tags.map(function (t) { return '<li class="tag">' + escapeHTML(t) + '</li>'; }).join('') + '</ul>'
      : '';
  }

  /* ----- Editor do conteúdo (painel) -------------------------------------- */
  const SITE_SCHEMA = [
    { title: 'Perfil e contato', icon: 'user', open: true, fields: [
      { key: 'profile.name', label: 'Seu nome', required: true },
      { key: 'profile.role', label: 'Cargo / título', placeholder: 'Desenvolvedor Full-Stack' },
      { key: 'profile.location', label: 'Localização', placeholder: 'São Paulo · remoto' },
      { key: 'profile.status', label: 'Selo de status (topo)', hint: 'vazio esconde', placeholder: 'Aberto a oportunidades' },
      { key: 'profile.email', label: 'E-mail', type: 'email', hint: 'vazio esconde o botão' },
      { key: 'profile.github', label: 'GitHub', type: 'url', placeholder: 'https://github.com/voce' },
      { key: 'profile.linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/voce' },
      { key: 'profile.cv', label: 'Currículo', type: 'url', hint: 'curriculo.pdf (arquivo na raiz) ou um link', placeholder: 'curriculo.pdf' },
      { key: 'profile.whatsappNumber', label: 'WhatsApp', hint: 'só dígitos, com DDI e DDD', placeholder: '5511987654321' },
      { key: 'profile.whatsappMessage', label: 'Mensagem inicial do WhatsApp' },
    ] },
    { title: 'Topo (hero)', icon: 'app-window', fields: [
      { key: 'hero.titleBefore', label: 'Título: início' },
      { key: 'hero.titleHighlight', label: 'Título: palavra grifada', hint: 'recebe o sublinhado azul' },
      { key: 'hero.titleAfter', label: 'Título: final' },
      { key: 'hero.subtitle', label: 'Subtítulo', type: 'textarea', rows: 3 },
      { key: 'hero.ctaPrimary', label: 'Texto do botão principal' },
      { key: 'hero.statProjects', label: 'Rótulo: nº de projetos' },
      { key: 'hero.statProduction', label: 'Rótulo: em produção' },
      { key: 'hero.statTech', label: 'Rótulo: tecnologias' },
    ] },
    { title: 'Sobre mim', icon: 'user', fields: [
      { key: 'about.kicker', label: 'Rótulo da seção' },
      { key: 'about.title', label: 'Título' },
      { key: 'about.text', label: 'Texto', type: 'textarea', rows: 6, hint: 'linha em branco separa parágrafos' },
    ] },
    { title: 'O que eu faço (3 cards)', icon: 'layers', list: 'services', itemLabel: 'Card', fields: [
      { key: 'title', label: 'Título' },
      { key: 'text', label: 'Descrição', type: 'textarea', rows: 2 },
      { key: 'tags', label: 'Tags', hint: 'separadas por vírgula' },
    ] },
    { title: 'Seção de projetos', icon: 'folder', fields: [
      { key: 'projects.kicker', label: 'Rótulo da seção' },
      { key: 'projects.title', label: 'Título' },
      { key: 'projects.desc', label: 'Descrição', type: 'textarea', rows: 2 },
    ] },
    { title: 'Stack', icon: 'code', fields: [
      { key: 'stack.kicker', label: 'Rótulo da seção' },
      { key: 'stack.title', label: 'Título' },
      { key: 'stack.desc', label: 'Descrição', type: 'textarea', rows: 2 },
    ] },
    { title: 'Grupos da stack (até 6)', icon: 'tag', list: 'stack.groups', itemLabel: 'Grupo', fields: [
      { key: 'title', label: 'Nome do grupo', placeholder: 'Front-end' },
      { key: 'tags', label: 'Tecnologias', hint: 'separadas por vírgula; grupo vazio fica oculto' },
    ] },
    { title: 'Contato', icon: 'mail', fields: [
      { key: 'contact.kicker', label: 'Rótulo da seção' },
      { key: 'contact.title', label: 'Título' },
      { key: 'contact.text', label: 'Texto', type: 'textarea', rows: 3 },
    ] },
    { title: 'Rodapé e SEO', icon: 'globe', fields: [
      { key: 'footer.text', label: 'Texto do rodapé' },
      { key: 'seo.title', label: 'Título da aba do navegador', hint: 'vazio usa "Nome · Cargo"' },
      { key: 'seo.description', label: 'Descrição para Google/LinkedIn', type: 'textarea', rows: 2 },
    ] },
  ];

  function siteFieldHtml(field, name) {
    const id = 'site-' + name.replace(/\./g, '-');
    const hint = field.hint ? ' <span class="hint">' + escapeHTML(field.hint) + '</span>' : '';
    const attrs = ' class="' + (field.type === 'textarea' ? 'textarea' : 'input') + '" id="' + id + '" name="' + name + '"' +
      (field.placeholder ? ' placeholder="' + escapeHTML(field.placeholder) + '"' : '') +
      ' autocomplete="off"' + (field.type === 'url' || field.type === 'email' ? ' spellcheck="false" inputmode="' + field.type + '"' : '');
    const control = field.type === 'textarea'
      ? '<textarea' + attrs + ' rows="' + (field.rows || 3) + '"></textarea>'
      : '<input type="text"' + attrs + '>';
    return '<div class="field">' +
      '<label class="label" for="' + id + '"><span>' + escapeHTML(field.label) + (field.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</span>' + hint + '</label>' +
      control +
      '<p class="field__error" data-site-error="' + name + '" hidden></p>' +
    '</div>';
  }

  const SiteEditor = {
    init: function () {
      this.form = $('#site-form');
      if (!this.form) return;
      this.build();
      this.fill(SiteContent.data);
      const self = this;
      this.form.addEventListener('submit', function (event) { event.preventDefault(); self.save(); });
      this.form.addEventListener('input', function () { self.setDirty(true); });
      $('#site-reset').addEventListener('click', function () { self.restoreDefaults(); });
    },

    build: function () {
      const html = SITE_SCHEMA.map(function (group) {
        let body;
        if (group.list) {
          const items = getPath(DEFAULT_SITE, group.list);
          body = items.map(function (_, i) {
            return '<div class="site-item"><p class="site-item__label">' + escapeHTML(group.itemLabel) + ' ' + (i + 1) + '</p>' +
              group.fields.map(function (f) { return siteFieldHtml(f, group.list + '.' + i + '.' + f.key); }).join('') +
            '</div>';
          }).join('');
          body = '<div class="site-items">' + body + '</div>';
        } else {
          body = group.fields.map(function (f) { return siteFieldHtml(f, f.key); }).join('');
        }
        return '<details class="site-group"' + (group.open ? ' open' : '') + '>' +
          '<summary class="site-group__head">' + icon(group.icon) + '<span>' + escapeHTML(group.title) + '</span>' + icon('chevron-down', 'site-group__chevron') + '</summary>' +
          '<div class="site-group__body">' + body + '</div>' +
        '</details>';
      }).join('');
      $('#site-fields').innerHTML = html;
    },

    fill: function (data) {
      $$('[name]', this.form).forEach(function (el) {
        const value = getPath(data, el.name);
        el.value = typeof value === 'string' ? value : '';
      });
      this.setDirty(false);
    },

    collect: function () {
      const data = clone(SiteContent.data);
      $$('[name]', this.form).forEach(function (el) { setPath(data, el.name, el.value.trim()); });
      return data;
    },

    setDirty: function (dirty) {
      this.dirty = dirty;
      const status = $('#site-status');
      if (status) status.textContent = dirty ? 'Alterações não salvas' : 'Tudo salvo';
      if (status) status.classList.toggle('is-dirty', dirty);
    },

    showError: function (name, message) {
      const el = $('[data-site-error="' + name + '"]', this.form);
      const input = this.form.elements[name];
      if (el) { el.textContent = message; el.hidden = false; }
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        const group = input.closest('details');
        if (group) group.open = true;
        input.focus();
      }
    },

    save: function () {
      $$('[data-site-error]', this.form).forEach(function (el) { el.hidden = true; });
      $$('[aria-invalid]', this.form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
      const data = this.collect();

      if (!data.profile.name) return this.showError('profile.name', 'Informe o seu nome.');
      if (data.profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.profile.email)) {
        return this.showError('profile.email', 'E-mail inválido.');
      }
      const urls = ['profile.github', 'profile.linkedin', 'profile.cv'];
      for (let i = 0; i < urls.length; i++) {
        const raw = getPath(data, urls[i]);
        if (raw && !safeLink(raw)) return this.showError(urls[i], 'Link inválido. Ex.: https://github.com/voce');
      }
      data.profile.whatsappNumber = data.profile.whatsappNumber.replace(/\D/g, '');

      const result = SiteContent.save(data);
      if (!result.ok) { Toast.show(storageErrorMessage(result.error), 'error', 7000); return; }
      this.fill(SiteContent.data);
      Toast.show('Conteúdo do site salvo. A vitrine já está atualizada.', 'success');
    },

    restoreDefaults: function () {
      const self = this;
      Dialog.confirm({
        title: 'Restaurar textos padrão?',
        message: 'Todos os textos, links e dados de perfil voltam ao conteúdo original. Os projetos não são afetados.',
        confirmLabel: 'Restaurar',
        tone: 'warning',
      }).then(function (ok) {
        if (!ok) return;
        SiteContent.reset();
        self.fill(SiteContent.data);
        Toast.show('Conteúdo padrão restaurado.', 'success');
      });
    },
  };

  /** Alterna entre "Projetos" e "Conteúdo do site" no painel. */
  function initAdminViews() {
    const buttons = $$('[data-view]');
    const show = function (view) {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
      $$('[data-view-panel]').forEach(function (p) { p.hidden = p.dataset.viewPanel !== view; });
      try { sessionStorage.setItem('saas-services:admin-view', view); } catch (_) { /* ignora */ }
    };
    buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); }); });
    // "Novo projeto" sempre leva à aba de projetos (captura: roda antes do foco no formulário)
    const newBtn = $('#new-btn');
    if (newBtn) newBtn.addEventListener('click', function () { show('projects'); }, true);
    let initial = 'projects';
    try { initial = sessionStorage.getItem('saas-services:admin-view') || 'projects'; } catch (_) { /* ignora */ }
    show(initial === 'site' ? 'site' : 'projects');
  }

  function readFileAsText(file) {
    if (typeof file.text === 'function') return file.text();
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('Não foi possível ler o arquivo.')); };
      reader.readAsText(file);
    });
  }

  /* ------------------------------------------------------------------------
     12. INICIALIZAÇÃO
     ------------------------------------------------------------------------ */
  function boot() {
    Store.init();
    SiteContent.init();
    SiteContent.apply();
    hydrateIcons();
    initContactLinks();
    initYear();
    initNavScroll();
    initTheme();
    initImageFallback();

    const page = document.body.dataset.page;
    if (page === 'showcase') {
      Showcase.init();
      // Mudanças feitas no painel em outra aba aparecem na hora
      window.addEventListener('storage', function (event) {
        if (event.key !== SITE_KEY) return;
        SiteContent.init();
        SiteContent.apply();
        hydrateIcons();
        initContactLinks();
      });
    } else if (page === 'admin') {
      Admin.init();
      SiteEditor.init();
      initAdminViews();
    }
  }

  /**
   * Dados publicados: portfolio-data.json na raiz (gerado em "Exportar JSON").
   * Visitantes não têm nada no localStorage, então veem este arquivo.
   * No seu navegador, o que você editou no painel tem prioridade (prévia).
   * Abrindo via file:// o fetch é bloqueado; aí valem os dados de exemplo.
   */
  function loadPublished() {
    if (location.protocol === 'file:' || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(DATA_FILE, { cache: 'no-cache' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
  }

  function start() {
    loadPublished().then(function (data) {
      PUBLISHED = data && typeof data === 'object' ? data : null;
      boot();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
