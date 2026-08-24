(function () {
      const modal = document.getElementById('loginModal');
      const closeButton = document.getElementById('closeModal');
      const loginForm = document.getElementById('loginForm');
      const loginMessage = document.getElementById('loginMessage');
      const loginSubmit = document.getElementById('loginSubmit');
      const forgotPassword = document.getElementById('forgotPassword');
      const menu = document.getElementById('mainNav');
      const menuButton = document.getElementById('menuButton');
      const app = document.getElementById('wfaApp');
      const appSidebar = document.getElementById('appSidebar');
      const appToast = document.getElementById('appToast');
      let authAdapter = null;
      let toastTimer = null;

      function setLoginMessage(text, error) {
        loginMessage.textContent = text;
        loginMessage.classList.toggle('error', Boolean(error));
        loginMessage.classList.add('show');
      }
      function openLogin() {
        if (document.body.classList.contains('sessao-ativa')) { document.body.classList.add('app-active'); escreverRota(wfaCurrentView || 'workspace', true); return; }
        modal.classList.add('open');
        document.body.classList.add('modal-open');
        setTimeout(function () { document.getElementById('loginEmail').focus(); }, 50);
      }
      function closeLogin() {
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
        loginMessage.classList.remove('show', 'error');
      }
      function enterApp(user) {
        document.body.classList.remove('em-construcao');
        document.body.classList.add('app-active', 'sessao-ativa');
        document.body.classList.remove('modal-open');
        modal.classList.remove('open');
        app.setAttribute('aria-hidden', 'false');
        document.getElementById('appUserEmail').textContent = user && user.email ? user.email : 'Usuário autenticado';
        selectView(telaPedidaNaUrl || wfaSavedView || 'workspace');
        telaPedidaNaUrl = null;
      }
      function leaveApp() {
        voltarParaRaiz();
        document.body.classList.remove('app-active', 'app-compact', 'app-hide-welcome', 'sessao-ativa');
        if (document.body.dataset.construcao === 'on' && !document.body.classList.contains('previa-ativa')) document.body.classList.add('em-construcao');
        app.setAttribute('aria-hidden', 'true');
        appSidebar.classList.remove('open');
      }
      // confirmação interna: promessa resolvida pelos botões do próprio sistema
      function confirmarNoSistema(texto, titulo, rotuloOk) {
        return new Promise(function (resolver) {
          const palco = document.getElementById('appConfirm');
          if (!palco) { resolver(true); return; }
          document.getElementById('appConfirmTitle').textContent = titulo || 'Confirmar';
          document.getElementById('appConfirmText').textContent = texto;
          const ok = document.getElementById('appConfirmOk');
          const cancelar = document.getElementById('appConfirmCancel');
          ok.textContent = rotuloOk || 'Confirmar';
          palco.hidden = false;
          setTimeout(function () { cancelar.focus(); }, 20);
          function encerrar(resposta) {
            palco.hidden = true;
            ok.removeEventListener('click', aoConfirmar);
            cancelar.removeEventListener('click', aoCancelar);
            document.removeEventListener('keydown', aoTeclar, true);
            palco.removeEventListener('mousedown', aoClicarFora);
            resolver(resposta);
          }
          function aoConfirmar() { encerrar(true); }
          function aoCancelar() { encerrar(false); }
          function aoTeclar(evento) {
            if (evento.key === 'Escape') { evento.preventDefault(); encerrar(false); }
            if (evento.key === 'Enter') { evento.preventDefault(); encerrar(true); }
          }
          function aoClicarFora(evento) { if (evento.target === palco) encerrar(false); }
          ok.addEventListener('click', aoConfirmar);
          cancelar.addEventListener('click', aoCancelar);
          document.addEventListener('keydown', aoTeclar, true);
          palco.addEventListener('mousedown', aoClicarFora);
        });
      }
      window.wfaConfirmar = confirmarNoSistema;

      function showToast(text) {
        clearTimeout(toastTimer);
        appToast.textContent = text;
        appToast.classList.add('show');
        toastTimer = setTimeout(function () { appToast.classList.remove('show'); }, 3200);
      }

      window.registerWfaAuth = function (adapter) {
        authAdapter = adapter;
        adapter.onChange(function (user) { if (user) enterApp(user); else leaveApp(); });
      };

      document.querySelectorAll('[data-open-login]').forEach(function (button) { button.addEventListener('click', openLogin); });
      closeButton.addEventListener('click', closeLogin);
      modal.addEventListener('mousedown', function (event) { if (event.target === modal) closeLogin(); });
      document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { closeLogin(); appSidebar.classList.remove('open'); } });
      loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!authAdapter) { setLoginMessage('O serviço de acesso está indisponível no momento. Tente novamente em instantes.', true); return; }
        loginSubmit.disabled = true;
        loginSubmit.firstChild.textContent = 'Entrando... ';
        try {
          await authAdapter.signIn(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPassword').value, document.getElementById('rememberLogin').checked);
          loginForm.reset();
        } catch (error) {
          setLoginMessage('Não foi possível entrar. Verifique o e-mail e a senha ou solicite a recuperação do acesso.', true);
        } finally {
          loginSubmit.disabled = false;
          loginSubmit.firstChild.textContent = 'Entrar ';
        }
      });
      forgotPassword.addEventListener('click', async function (event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        if (!authAdapter) { setLoginMessage('O serviço de acesso está indisponível no momento. Tente novamente em instantes.', true); return; }
        if (!email) { setLoginMessage('Informe seu e-mail para receber a recuperação de senha.', true); return; }
        try { await authAdapter.reset(email); setLoginMessage('Se o e-mail estiver cadastrado, as instruções de recuperação serão enviadas.', false); }
        catch (error) { setLoginMessage('Não foi possível solicitar a recuperação agora.', true); }
      });
      document.getElementById('appViewSite').addEventListener('click', function () {
        voltarParaRaiz();
        document.body.classList.remove('app-active');
        window.scrollTo({ top: 0 });
        showToast('Pré-visualizando a homepage. Use "Voltar ao sistema" para retornar.');
      });
      document.getElementById('backToApp').addEventListener('click', function () {
        document.body.classList.add('app-active');
        escreverRota(wfaCurrentView || 'workspace', true);
      });
      document.getElementById('endPreview').addEventListener('click', function () {
        try { sessionStorage.removeItem('wfaPreviaPublica'); } catch (error) { /* ignora */ }
        window.location.reload();
      });
      document.getElementById('appLogout').addEventListener('click', async function () { if (authAdapter) await authAdapter.signOut(); leaveApp(); });

      const viewTitles = { workspace:'Central de documentos', 'comparador-fontes':'Área de trabalho', personalizar:'Personalizar página', configuracoes:'Configurações' };
      /* ============ Planilhas e automações ============
         A planilha nasce vazia e é sua. As automações são acionadas de dentro
         dela e a preenchem com os documentos marcados na barra lateral.      */
      const AUTOMACOES = [
        {
          id: 'comparacao-fontes',
          nome: 'Comparação de fonte por relatório',
          descricao: 'Lê o quadro Total por fonte de recurso no fim de cada relatório e cruza os valores fonte a fonte, com diferença e execução.',
          regra: 'Marque na barra lateral dois destes três relatórios:',
          // orçada, arrecadada e empenhada, na ordem em que aparecem no menu
          requisitos: ['budget', 'collected', 'committed'],
          situacao: function () {
            const marcados = documentosSelecionados();
            const tipos = tiposSelecionados();
            if (!workspaceState.files.length) return { ok:false, texto:'nenhum documento carregado' };
            if (!marcados.length) return { ok:false, texto:'marque documentos na barra lateral' };
            if (tipos.length < 2) return { ok:false, texto:'marque dois tipos diferentes' };
            if (marcados.length > tipos.length) return { ok:false, texto:'há dois documentos do mesmo tipo' };
            return { ok:true, texto:tipos.length + ' documentos marcados' };
          },
          executar: function () { launchWorkspaceComparator(); }
        },
        {
          id: 'consignacoes-folha',
          nome: 'Consignações por fonte de recurso (folha)',
          descricao: 'Cruza os descontos consignados da folha com a fonte de recurso que os pagou.',
          disponivel: false,
          nota: 'em desenvolvimento',
          regra: '',
          requisitos: [],
          situacao: function () { return { ok:false, texto:'em desenvolvimento' }; },
          executar: function () {}
        }
      ];

      /* O menu de automações mostra o que cada rotina precisa e o que já está
         marcado na barra lateral, para não haver adivinhação. */
      function fecharMenuAutomacoes() {
        const painel = document.getElementById('sheetAutomacaoMenu');
        if (painel) painel.hidden = true;
      }
      function abrirMenuAutomacoes(id) {
        const painel = document.getElementById('sheetAutomacaoMenu');
        const botao = document.getElementById('sheetAutomacao');
        if (!painel || !botao) return;
        const escolhidas = AUTOMACOES.filter(function (a) { return a.id === id; });
        if (!escolhidas.length) { fecharMenuAutomacoes(); return; }
        const marcados = documentosSelecionados();
        painel.innerHTML = escolhidas.map(function (automacao) {
          const situacao = automacao.situacao();
          const requisitos = (automacao.requisitos || []).map(function (papel) {
            const doc = marcados.find(function (item) { return item.role === papel; });
            return '<li class="' + (doc ? 'marcado' : '') + '"><span class="marca" aria-hidden="true">' + (doc ? '✓' : '') + '</span>' +
              '<span class="req-nome">' + escapeHtml(ROLE_INFO[papel].nome) + '</span>' +
              '<span class="req-doc">' + escapeHtml(doc ? doc.file.name : 'não marcado') + '</span></li>';
          }).join('');
          return '<article class="automacao-item" data-automacao="' + escapeHtml(automacao.id) + '">' +
            '<h4>' + escapeHtml(automacao.nome) + '</h4>' +
            '<p class="automacao-desc">' + escapeHtml(automacao.descricao || '') + '</p>' +
            (requisitos ? '<p class="automacao-regra">' + escapeHtml(automacao.regra || 'Requisitos:') + '</p><ul class="automacao-req">' + requisitos + '</ul>' : '') +
            '<div class="automacao-pe">' +
              '<span class="automacao-estado' + (situacao.ok ? ' pronto' : '') + '">' + escapeHtml(situacao.ok ? 'Pronta para rodar' : situacao.texto) + '</span>' +
              '<button type="button" class="automacao-run" data-rodar="' + escapeHtml(automacao.id) + '"' + (situacao.ok ? '' : ' disabled') + '>Executar</button>' +
            '</div></article>';
        }).join('');
        painel.hidden = false;
        const caixa = botao.getBoundingClientRect();
        const largura = painel.offsetWidth || 320;
        painel.style.left = Math.max(8, Math.min(caixa.left, window.innerWidth - largura - 8)) + 'px';
        painel.style.top = (caixa.bottom + 4) + 'px';
      }

      // Registros gravados antes das automações não guardam o modo: quem tem
      // dois relatórios é comparação; o resto é planilha em branco.
      function modoDeduzido(relatorios) {
        return Object.keys(relatorios || {}).length >= 2 ? 'comparador' : 'livre';
      }
      function filtrarLinhasLivres(todas, busca) {
        if (!busca) return todas.slice();
        return todas.filter(function (row) {
          const extras = row.extras || {};
          const texto = Object.keys(extras).map(function (chave) { return extras[chave]; }).join(' ');
          return normalizeSearch(texto).includes(busca);
        });
      }
      // O rascunho de uma planilha nova: uma coluna larga para nomes e as demais
      // no tamanho de um valor, como numa folha de cálculo qualquer.
      function colunasDoRascunho() {
        const colunas = [novaColunaLivre(210)];
        for (let c = 0; c < 11; c += 1) colunas.push(novaColunaLivre(128));
        return colunas;
      }
      function novaColunaLivre(largura) {
        return { id:'col-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36), titulo:'', ancora:null, lado:null, largura:largura || 150 };
      }
      function novaPlanilha() {
        execucaoAberta = null;
        clearTimeout(regravarTimer);
        compareState.modo = 'livre';
        compareState.reports = {};
        compareState.audit = [];
        compareState.titulos = {};
        compareState.formulas = {};
        compareState.larguras = {};
        compareState.alturas = {};
        compareState.sourceSort = 'manual';
        compareState.editorMode = null;
        compareState.editorKey = null;
        COMPARE_ROLES.forEach(function (papel) { compareState.files[papel] = null; });
        compareState.colunasExtras = colunasDoRascunho();
        compareState.rows = [];
        for (let n = 0; n < 18; n += 1) {
          compareState.rows.push({ key:'L' + (n + 1), description:'', co:[], extras:{}, ordem:n, edited:false, manual:true, deleted:false });
        }
        compareDom.empty.hidden = true;
        compareDom.results.hidden = false;
        compareDom.view.classList.add('results-ready');
        compareDom.view.classList.remove('show-setup');
        compareDom.detailsToggle.hidden = true;
        compareDom.auditToggle.hidden = true;
        setCompareAlert('');
        addAudit('Planilha criada', 'Planilha em branco aberta na área de trabalho.', 'Estrutura');
        renderCompareTable();
        renderAudit();
        selectView('comparador-fontes');
        salvarExecucao();
        showToast('Planilha criada. Use Automação para preenchê-la com os documentos.');
      }

      function documentosSelecionados() {
        return workspaceState.files.filter(function (item) {
          return workspaceState.selected.has(item.id) && item.status === 'ready' && ROLE_INFO[item.role];
        });
      }
      function tiposSelecionados() {
        const tipos = [];
        documentosSelecionados().forEach(function (item) { if (tipos.indexOf(item.role) === -1) tipos.push(item.role); });
        return tipos;
      }
      function renderScriptBrief() { atualizarResumoDoBrief(); }
      // Barra lateral: quantas planilhas existem e quantos documentos estão
      // marcados para as automações.
      function atualizarResumoDoBrief() {
        const marcados = documentosSelecionados().length;
        const aviso = document.getElementById('sidebarDocsMarcados');
        if (aviso) {
          aviso.textContent = marcados ? marcados + (marcados === 1 ? ' marcado' : ' marcados') : '';
          aviso.hidden = !marcados;
          aviso.classList.toggle('pronto', tiposSelecionados().length >= 2);
        }
      }
      function atualizarContadorPlanilhas(quantas) {
        const marcador = document.getElementById('scriptCompareMeta');
        if (!marcador) return;
        marcador.textContent = quantas ? String(quantas) : '';
        marcador.hidden = !quantas;
        marcador.title = quantas + (quantas === 1 ? ' planilha' : ' planilhas');
      }

      function atualizarResumoDosScripts() { renderScriptBrief(); }

      /* ============ Endereços das telas ============
         Cada tela tem um endereço próprio, para poder ser guardada, compartilhada
         e navegada com os botões voltar e avançar do navegador.               */
      var ROTAS = { workspace:'documentos', 'comparador-fontes':'planilhas', personalizar:'personalizar', configuracoes:'configuracoes' };
      var TELAS_POR_ROTA = Object.keys(ROTAS).reduce(function (mapa, tela) { mapa[ROTAS[tela]] = tela; return mapa; }, {});
      var navegandoPelaRota = false;

      function caminhoDaTela(view) { return '/sistema/' + (ROTAS[view] || 'documentos'); }
      function telaDoCaminho(caminho) {
        var partes = String(caminho || '').replace(/^\/+|\/+$/g, '').split('/');
        if (partes[0] !== 'sistema') return null;
        return TELAS_POR_ROTA[partes[1]] || 'workspace';
      }
      function escreverRota(view, substituir) {
        if (navegandoPelaRota) return;
        var destino = caminhoDaTela(view) + window.location.search;
        if (window.location.pathname === caminhoDaTela(view)) return;
        try {
          window.history[substituir ? 'replaceState' : 'pushState']({ tela: view }, '', destino);
        } catch (erro) { /* navegador sem suporte: segue sem endereço */ }
      }
      function voltarParaRaiz() {
        if (window.location.pathname === '/') return;
        try { window.history.replaceState({}, '', '/' + window.location.search); } catch (erro) { /* ignora */ }
      }
      // endereço pedido antes do login, para abrir a tela certa depois de entrar
      var telaPedidaNaUrl = telaDoCaminho(window.location.pathname);

      window.addEventListener('popstate', function (evento) {
        if (!document.body.classList.contains('app-active')) return;
        var tela = (evento.state && evento.state.tela) || telaDoCaminho(window.location.pathname);
        if (!tela) return;
        navegandoPelaRota = true;
        selectView(tela);
        navegandoPelaRota = false;
      });

      function selectView(view) {
        wfaCurrentView = view;
        escreverRota(view);
        if (view === 'comparador-fontes') ajustarAlturaDaPlanilha();
        document.querySelectorAll('[data-view-panel]').forEach(function (panel) { panel.classList.toggle('active', panel.dataset.viewPanel === view); });
        document.querySelectorAll('.app-nav [data-app-view]').forEach(function (button) { button.classList.toggle('active', button.dataset.appView === view); });
        document.querySelectorAll('.app-nav [data-workspace-tool]').forEach(function (button) { button.classList.toggle('active', view === 'comparador-fontes' && button.dataset.workspaceTool === 'compare'); });
        atualizarResumoDosScripts();
        appSidebar.classList.remove('open');
        if (typeof closeCompareFilesSheet === 'function') closeCompareFilesSheet();
        document.querySelector('.app-main').scrollTo({ top: 0, behavior: 'smooth' });
        persistWfaLater();
      }
      document.querySelectorAll('[data-app-view]').forEach(function (button) { button.addEventListener('click', function () { selectView(button.dataset.appView); }); });
      document.getElementById('appMenuToggle').addEventListener('click', function () { appSidebar.classList.toggle('open'); });
      document.querySelectorAll('[data-demo-action]').forEach(function (button) { button.addEventListener('click', function () { showToast(button.dataset.demoAction + ': função preparada para a próxima etapa do sistema.'); }); });

      const COMPARE_ROLES = ['budget', 'committed', 'collected'];
      const ROLE_INFO = {
        budget:    { curto:'Orçado',     nome:'Receitas orçadas',      titulo:'Relatório de Receitas Orçadas',    marca:'RELATORIO DE RECEITAS ORCADAS',    comCo:false },
        committed: { curto:'Empenhado',  nome:'Despesas empenhadas',   titulo:'Relação da Despesa Empenhada',     marca:'RELACAO DA DESPESA',               comCo:false },
        collected: { curto:'Arrecadado', nome:'Receitas arrecadadas',  titulo:'Relação das Receitas Arrecadadas', marca:'RELACAO DAS RECEITAS ARRECADADAS', comCo:true }
      };
      function papeisCarregados() { return COMPARE_ROLES.filter(function (papel) { return Boolean(compareState.files[papel]); }); }
      function papeisComRelatorio() { return COMPARE_ROLES.filter(function (papel) { return Boolean(compareState.reports[papel]); }); }
      const compareState = { files: { budget: null, committed: null, collected: null }, reports: {}, rows: [], audit: [], editorMode: null, editorKey: null, sourceSort: 'asc', colunasExtras: [], titulos: {}, formulas: {}, larguras: {}, alturas: {}, modo: 'livre' };
      const compareDom = {
        run: document.getElementById('compareRun'), progress: document.getElementById('compareProgress'), alert: document.getElementById('compareAlert'), results: document.getElementById('compareResults'),
        processHint: document.getElementById('compareProcessHint'), tableBody: document.getElementById('compareTableBody'), search: document.getElementById('compareSearch'), status: document.getElementById('compareStatusFilter'),
        auditList: document.getElementById('auditList'), auditCount: document.getElementById('auditCount'), editor: document.getElementById('compareEditor'), editorForm: document.getElementById('compareEditorForm'),
        details: document.getElementById('compareReportDetails'), detailsToggle: document.getElementById('compareReportDetailsToggle'), batchInput: document.getElementById('comparePdfBatch'),
        batchDropzone: document.getElementById('compareBatchDropzone'), batchState: document.getElementById('compareBatchState'), batchCount: document.getElementById('compareBatchCount'),
        view: document.getElementById('compareView'), setup: document.getElementById('compareSetup'), filesToggle: document.getElementById('compareFilesToggle'),
        optionsToggle: document.getElementById('compareOptionsToggle'), optionsMenu: document.getElementById('compareOptionsMenu'), auditToggle: document.getElementById('compareAuditToggle'),
        auditPanel: document.getElementById('compareAuditPanel'), summary: document.getElementById('compareSummaryDetails'), summaryLabel: document.getElementById('compareSummaryLabel'),
        tableOptionsToggle: document.getElementById('compareTableOptionsToggle'), tableOptionsMenu: document.getElementById('compareTableOptionsMenu'),
        filesLabel: document.getElementById('compareFilesButtonLabel'), filesCount: document.getElementById('compareFilesButtonCount'), filesBackdrop: document.getElementById('compareFilesBackdrop'), filesClose: document.getElementById('compareFilesClose'),
        empty: document.getElementById('compareEmptyState'), emptyTitle: document.getElementById('compareEmptyTitle'), emptyText: document.getElementById('compareEmptyText'),
        sortSource: document.getElementById('compareSortSource'), sortSourceIcon: document.getElementById('compareSortSourceIcon')
      };
      let pdfJsPromise = null;
      let externalScriptPromises = {};
      let compareIdentificationToken = 0;

      function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) { return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]; });
      }
      function normalizeSearch(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
      }
      function formatBytes(bytes) {
        if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2).replace('.', ',') + ' MB';
      }
      function parseBrl(value) {
        if (typeof value === 'number') return value;
        let cleaned = String(value || '').replace(/R\$/gi, '').replace(/\s/g, '');
        if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        const number = Number(cleaned);
        return Number.isFinite(number) ? number : NaN;
      }
      function formatBrl(value) {
        return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(value) || 0);
      }
      function formatPercent(value) {
        return Number.isFinite(value) ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 }).format(value) + '%' : '—';
      }
      function normalizeSourceCode(value) {
        const parts = String(value || '').match(/\d+/g) || [];
        if (parts.length !== 4) return null;
        const sizes = [2,4,4,4];
        if (parts.some(function (part, index) { return part.length > sizes[index]; })) return null;
        return parts.map(function (part, index) { return part.padStart(sizes[index], '0'); }).join(' ');
      }
      function currentAuditUser() {
        return document.getElementById('appUserEmail').textContent || 'Usuário autenticado';
      }
      function addAudit(action, detail, source) {
        compareState.audit.push({ at: new Date().toISOString(), user: currentAuditUser(), action: action, detail: detail, source: source || '' });
        renderAudit();
      }
      function renderAudit() {
        persistWfaLater();
        compareDom.auditCount.textContent = compareState.audit.length + (compareState.audit.length === 1 ? ' registro' : ' registros');
        if (!compareState.audit.length) { compareDom.auditList.innerHTML = '<div class="audit-empty">A trilha será criada ao processar os relatórios.</div>'; return; }
        compareDom.auditList.innerHTML = compareState.audit.slice().reverse().map(function (item) {
          const date = new Date(item.at);
          return '<div class="audit-item"><div class="audit-time">' + escapeHtml(date.toLocaleString('pt-BR')) + '<br>' + escapeHtml(item.user) + '</div><div class="audit-copy"><strong>' + escapeHtml(item.action) + (item.source ? ' • ' + escapeHtml(item.source) : '') + '</strong><p>' + escapeHtml(item.detail) + '</p></div></div>';
        }).join('');
      }
      function setCompareAlert(message) {
        compareDom.alert.textContent = message || '';
        compareDom.alert.classList.toggle('show', Boolean(message));
      }
      function fileState(role, state, title, detail, badge) {
        const element = document.getElementById(role + 'FileState');
        element.className = 'pdf-file-state' + (state ? ' ' + state : '');
        element.innerHTML = '<span><strong>' + escapeHtml(title) + '</strong>' + escapeHtml(detail) + '</span><span class="file-badge">' + escapeHtml(badge) + '</span>';
      }
      function updateCompareReady() {
        const carregados = papeisCarregados();
        const ready = carregados.length >= 2;
        compareDom.run.disabled = !ready;
        compareDom.setup.classList.toggle('files-ready', ready);
        compareDom.setup.classList.toggle('expanded', !ready);
        const identified = carregados.length;
        compareDom.filesLabel.textContent = identified ? 'Documentos' : 'Carregar PDFs';
        compareDom.filesCount.textContent = identified + '/3';
        compareDom.batchCount.textContent = identified + (identified === 1 ? ' arquivo' : ' arquivos') + ' de 3';
        const nomesCarregados = carregados.map(function (papel) { return ROLE_INFO[papel].curto.toLowerCase(); }).join(', ');
        if (ready) {
          compareDom.processHint.textContent = 'Pronto para processar: ' + nomesCarregados + '.';
          renderScriptBrief();
        } else if (identified === 1) {
          compareDom.processHint.textContent = 'Carregue mais um relatório para comparar.';
          renderScriptBrief();
        } else {
          compareDom.processHint.textContent = 'Selecione ao menos dois relatórios em PDF.';
          renderScriptBrief();
        }
      }
      function resetCompareOutput() {
        compareDom.results.hidden = true;
        compareDom.empty.hidden = false;
        compareDom.view.classList.remove('results-ready', 'show-setup');
        compareDom.details.hidden = true;
        compareDom.detailsToggle.hidden = true;
        compareDom.detailsToggle.setAttribute('aria-expanded', 'false');
        compareDom.detailsToggle.textContent = 'Detalhes dos relatórios';
        compareDom.auditPanel.hidden = true;
        compareDom.auditToggle.hidden = true;
        compareDom.auditToggle.setAttribute('aria-expanded', 'false');
        compareDom.auditToggle.textContent = 'Trilha de auditoria';
        setCompareAlert('');
      }
      function clearCompareRole(role) {
        compareIdentificationToken += 1;
        compareState.files[role] = null;
        document.getElementById(role + 'Clear').hidden = true;
        const detail = role === 'budget' ? 'Selecione o relatório de receitas orçadas.' : 'Selecione a relação de receitas arrecadadas.';
        fileState(role, '', 'Nenhum arquivo selecionado', detail, 'Aguardando');
        resetCompareOutput();
        updateCompareReady();
        persistWfaLater();
      }
      async function identifyCompareFiles(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const token = ++compareIdentificationToken;
        const pdfFiles = files.filter(function (file) { return /\.pdf$/i.test(file.name) || file.type === 'application/pdf'; });
        const invalidFiles = files.filter(function (file) { return !pdfFiles.includes(file); }).map(function (file) { return file.name; });
        resetCompareOutput();
        compareDom.run.disabled = true;
        compareDom.batchState.className = 'pdf-batch-state show';
        compareDom.batchState.textContent = 'Identificando ' + pdfFiles.length + (pdfFiles.length === 1 ? ' PDF…' : ' PDFs…');
        const identified = [];
        const unrecognized = invalidFiles.slice();
        const replaced = [];
        for (const file of pdfFiles) {
          try {
            const role = await detectCompareFileRole(file);
            if (token !== compareIdentificationToken) return;
            if (!role) { unrecognized.push(file.name); upsertWorkspaceFile(file, 'unknown', 'error', false); continue; }
            if (compareState.files[role]) replaced.push(compareState.files[role].name);
            compareState.files[role] = file;
            upsertWorkspaceFile(file, role, 'ready', true);
            identified.push({ role:role, file:file });
            document.getElementById(role + 'Clear').hidden = false;
            fileState(role, 'ready', file.name, formatBytes(file.size) + ' • organizado automaticamente', 'Pronto');
          } catch (error) {
            unrecognized.push(file.name + ' (' + (error.name === 'PasswordException' ? 'protegido por senha' : 'não reconhecido') + ')');
            upsertWorkspaceFile(file, 'unknown', 'error', false);
          }
        }
        if (token !== compareIdentificationToken) return;
        updateCompareReady();
        const messages = [];
        if (identified.length) messages.push(identified.length + (identified.length === 1 ? ' relatório identificado e direcionado automaticamente.' : ' relatórios identificados e direcionados automaticamente.'));
        if (replaced.length) messages.push('Arquivo anterior substituído: ' + replaced.join(', ') + '.');
        if (unrecognized.length) messages.push('Não reconhecidos: ' + unrecognized.join(', ') + '.');
        compareDom.batchState.className = 'pdf-batch-state show' + ((replaced.length || unrecognized.length) ? ' warning' : '');
        compareDom.batchState.textContent = messages.join(' ') || 'Nenhum relatório compatível foi encontrado.';
        compareDom.batchInput.value = '';
      }
      compareDom.batchInput.addEventListener('change', function () { identifyCompareFiles(compareDom.batchInput.files); });
      ['dragenter','dragover'].forEach(function (eventName) { compareDom.batchDropzone.addEventListener(eventName, function (event) { event.preventDefault(); compareDom.batchDropzone.classList.add('dragging'); }); });
      ['dragleave','drop'].forEach(function (eventName) { compareDom.batchDropzone.addEventListener(eventName, function (event) { event.preventDefault(); compareDom.batchDropzone.classList.remove('dragging'); }); });
      compareDom.batchDropzone.addEventListener('drop', function (event) { identifyCompareFiles(event.dataTransfer.files); });
      document.getElementById('budgetClear').addEventListener('click', function () { clearCompareRole('budget'); });
      document.getElementById('collectedClear').addEventListener('click', function () { clearCompareRole('collected'); });
      function toggleCompareMenu(menu, trigger, willOpen) {
        menu.hidden = !willOpen;
        trigger.setAttribute('aria-expanded', String(willOpen));
      }
      compareDom.optionsToggle.addEventListener('click', function () {
        const willOpen = compareDom.optionsMenu.hidden;
        toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, willOpen);
        toggleCompareMenu(compareDom.tableOptionsMenu, compareDom.tableOptionsToggle, false);
      });
      compareDom.tableOptionsToggle.addEventListener('click', function () {
        const willOpen = compareDom.tableOptionsMenu.hidden;
        toggleCompareMenu(compareDom.tableOptionsMenu, compareDom.tableOptionsToggle, willOpen);
        toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
      });
      function openCompareFilesSheet() {
        compareDom.setup.classList.add('sheet-open');
        compareDom.setup.setAttribute('aria-hidden', 'false');
        compareDom.setup.inert = false;
        compareDom.filesBackdrop.hidden = false;
        compareDom.filesToggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('compare-files-open');
        toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
        window.setTimeout(function () { compareDom.filesClose.focus(); }, 30);
      }
      function closeCompareFilesSheet() {
        compareDom.setup.classList.remove('sheet-open');
        compareDom.setup.setAttribute('aria-hidden', 'true');
        compareDom.setup.inert = true;
        compareDom.filesBackdrop.hidden = true;
        compareDom.filesToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('compare-files-open');
      }
      compareDom.filesToggle.addEventListener('click', openCompareFilesSheet);
      document.querySelectorAll('[data-open-compare-files]').forEach(function (button) { button.addEventListener('click', openCompareFilesSheet); });
      compareDom.filesClose.addEventListener('click', closeCompareFilesSheet);
      compareDom.filesBackdrop.addEventListener('click', closeCompareFilesSheet);
      compareDom.detailsToggle.addEventListener('click', function () {
        const willOpen = compareDom.details.hidden;
        compareDom.details.hidden = !willOpen;
        compareDom.detailsToggle.setAttribute('aria-expanded', String(willOpen));
        compareDom.detailsToggle.textContent = willOpen ? 'Ocultar detalhes dos relatórios' : 'Detalhes dos relatórios';
        toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
        if (willOpen) compareDom.details.scrollIntoView({ behavior:'smooth', block:'nearest' });
      });
      compareDom.auditToggle.addEventListener('click', function () {
        const willOpen = compareDom.auditPanel.hidden;
        compareDom.auditPanel.hidden = !willOpen;
        compareDom.auditToggle.setAttribute('aria-expanded', String(willOpen));
        compareDom.auditToggle.textContent = willOpen ? 'Ocultar trilha de auditoria' : 'Trilha de auditoria';
        toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
        if (willOpen) compareDom.auditPanel.scrollIntoView({ behavior:'smooth', block:'start' });
      });
      compareDom.tableOptionsMenu.addEventListener('click', function (event) {
        if (event.target.closest('button')) toggleCompareMenu(compareDom.tableOptionsMenu, compareDom.tableOptionsToggle, false);
      });
      compareDom.optionsMenu.addEventListener('click', function (event) {
        if (event.target.closest('button')) toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
      });
      document.addEventListener('click', function (event) {
        if (!event.target.closest('.compare-options')) toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
        if (!event.target.closest('.compare-table-options')) toggleCompareMenu(compareDom.tableOptionsMenu, compareDom.tableOptionsToggle, false);
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          toggleCompareMenu(compareDom.optionsMenu, compareDom.optionsToggle, false);
          toggleCompareMenu(compareDom.tableOptionsMenu, compareDom.tableOptionsToggle, false);
          closeCompareFilesSheet();
        }
      });

      function loadExternalScript(url, test) {
        if (test()) return Promise.resolve();
        if (externalScriptPromises[url]) return externalScriptPromises[url];
        externalScriptPromises[url] = new Promise(function (resolve, reject) {
          const script = document.createElement('script');
          script.src = url;
          script.onload = resolve;
          script.onerror = function () { reject(new Error('Não foi possível carregar o recurso de exportação. Verifique a conexão com a internet.')); };
          document.head.appendChild(script);
        });
        return externalScriptPromises[url];
      }
      function getPdfJs() {
        if (!pdfJsPromise) {
          pdfJsPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs').then(function (pdfjs) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';
            return pdfjs;
          });
        }
        return pdfJsPromise;
      }
      async function sha256(buffer) {
        if (!window.crypto || !window.crypto.subtle) return 'não disponível';
        const digest = await window.crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest)).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
      }
      function linesFromPdfItems(items) {
        const lines = [];
        items.forEach(function (item) {
          const text = String(item.str || '').trim();
          if (!text) return;
          const y = item.transform && Number(item.transform[5]);
          const x = item.transform && Number(item.transform[4]);
          let line = lines.find(function (candidate) { return Math.abs(candidate.y - y) < 2.2; });
          if (!line) { line = { y:y, parts:[] }; lines.push(line); }
          line.parts.push({ x:x, text:text });
        });
        return lines.sort(function (a,b) { return b.y - a.y; }).map(function (line) {
          return line.parts.sort(function (a,b) { return a.x - b.x; }).map(function (part) { return part.text; }).join(' ').replace(/\s+/g, ' ').trim();
        }).filter(Boolean);
      }
      async function detectCompareFileRole(file) {
        const pdfjs = await getPdfJs();
        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data:new Uint8Array(buffer), enableScripting:false, isEvalSupported:false });
        const pdf = await loadingTask.promise;
        let role = null;
        for (let pageNumber = 1; pageNumber <= pdf.numPages && !role; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const normalized = normalizeSearch(linesFromPdfItems(content.items).join(' '));
          page.cleanup();
          if (normalized.includes('RELATORIO DE RECEITAS ORCADAS')) role = 'budget';
          else if (normalized.includes('RELACAO DAS RECEITAS ARRECADADAS')) role = 'collected';
          else if (normalized.includes('RELACAO DA DESPESA')) role = 'committed';
        }
        if (typeof pdf.destroy === 'function') await pdf.destroy();
        return role;
      }

      const workspaceState = { files: [], selected: new Set(), nextId: 1 };
      const workspaceDom = {
        upload: document.getElementById('workspaceUploadInput'),
        uploadTrigger: document.getElementById('workspaceUploadTrigger'),
        sidebar: document.getElementById('workspaceSidebarFiles'),
        rows: document.getElementById('workspaceFileRows'),
        wrap: document.getElementById('workspaceTableWrap'),
        empty: document.getElementById('workspaceEmptyState'),
        search: document.getElementById('workspaceFileSearch'),
        filter: document.getElementById('workspaceFileFilter'),
        selectAll: document.getElementById('workspaceSelectAll'),
        hint: document.getElementById('workspaceSelectionHint'),
        run: document.getElementById('workspaceRunSelected'),
        toolToggle: document.getElementById('workspaceToolToggle')
      };

      function workspaceRoleLabel(role) {
        if (ROLE_INFO[role]) return ROLE_INFO[role].nome;
        return 'Não identificado';
      }
      function workspaceStatusLabel(status) {
        if (status === 'processing') return 'Identificando';
        if (status === 'ready') return 'Pronto para uso';
        return 'Requer revisão';
      }
      function findWorkspaceFile(id) {
        return workspaceState.files.find(function (item) { return item.id === id; });
      }
      function visibleWorkspaceFiles() {
        const query = normalizeSearch(workspaceDom.search.value);
        const filter = workspaceDom.filter.value;
        return workspaceState.files.filter(function (item) {
          const matchesQuery = !query || normalizeSearch(item.file.name + ' ' + workspaceRoleLabel(item.role)).includes(query);
          const matchesFilter = filter === 'all' || item.role === filter;
          return matchesQuery && matchesFilter;
        });
      }
      function renderWorkspaceFiles() {
        const visible = visibleWorkspaceFiles();
        workspaceDom.wrap.hidden = workspaceState.files.length === 0;
        workspaceDom.empty.hidden = workspaceState.files.length > 0;
        workspaceDom.rows.innerHTML = visible.map(function (item) {
          const selected = workspaceState.selected.has(item.id);
          return '<tr class="' + (selected ? 'is-selected' : '') + '"><td><input type="checkbox" data-workspace-select="' + escapeHtml(item.id) + '" aria-label="Selecionar ' + escapeHtml(item.file.name) + '"' + (selected ? ' checked' : '') + '></td><td><div class="workspace-file-name"><span>PDF</span><div><b title="' + escapeHtml(item.file.name) + '">' + escapeHtml(item.file.name) + '</b><small>Documento local • não enviado a servidores</small></div></div></td><td><span class="workspace-kind">' + escapeHtml(workspaceRoleLabel(item.role)) + '</span></td><td>' + escapeHtml(item.addedAt.toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })) + '</td><td>' + escapeHtml(formatBytes(item.file.size)) + '</td><td><span class="workspace-status ' + escapeHtml(item.status) + '">' + escapeHtml(workspaceStatusLabel(item.status)) + '</span></td><td><button class="workspace-remove" type="button" data-workspace-remove="' + escapeHtml(item.id) + '">Remover</button></td></tr>';
        }).join('');
        if (workspaceState.files.length && !visible.length) workspaceDom.rows.innerHTML = '<tr><td colspan="7">Nenhum arquivo corresponde à busca ou ao filtro selecionado.</td></tr>';
        workspaceDom.sidebar.innerHTML = workspaceState.files.length ? workspaceState.files.map(function (item) {
          const selected = workspaceState.selected.has(item.id);
          return '<label class="sidebar-file"><input type="checkbox" data-workspace-select="' + escapeHtml(item.id) + '"' + (selected ? ' checked' : '') + '><span><b title="' + escapeHtml(item.file.name) + '">' + escapeHtml(item.file.name) + '</b><small>' + escapeHtml(workspaceRoleLabel(item.role)) + '</small></span><button class="remover-doc" type="button" data-remover-doc="' + escapeHtml(item.id) + '" title="Remover documento" aria-label="Remover ' + escapeHtml(item.file.name) + '">×</button></label>';
        }).join('') : '<p class="sidebar-library-empty">Os PDFs enviados aparecerão aqui para seleção rápida.</p>';

        const selectedItems = workspaceState.files.filter(function (item) { return workspaceState.selected.has(item.id); });
        const papeisProntos = [];
        selectedItems.forEach(function (item) { if (item.status === 'ready' && ROLE_INFO[item.role] && papeisProntos.indexOf(item.role) === -1) papeisProntos.push(item.role); });
        workspaceDom.run.disabled = papeisProntos.length < 2;
        workspaceDom.hint.textContent = selectedItems.length ? selectedItems.length + (selectedItems.length === 1 ? ' arquivo selecionado.' : ' arquivos selecionados.') + (papeisProntos.length >= 2 ? ' Comparação disponível.' : ' Marque ao menos dois relatórios de tipos diferentes.') : 'Nenhum arquivo selecionado.';
        document.getElementById('workspaceTotalCount').textContent = workspaceState.files.length;
        document.getElementById('workspaceSelectedCount').textContent = selectedItems.length;
        document.getElementById('workspaceReadyCount').textContent = workspaceState.files.filter(function (item) { return item.status === 'ready'; }).length;
        document.getElementById('workspacePendingCount').textContent = workspaceState.files.filter(function (item) { return item.status !== 'ready'; }).length;
        atualizarResumoDosScripts();
        const visibleSelectable = visible.filter(function (item) { return item.status !== 'processing'; });
        const visibleSelected = visibleSelectable.filter(function (item) { return workspaceState.selected.has(item.id); });
        workspaceDom.selectAll.checked = Boolean(visibleSelectable.length && visibleSelected.length === visibleSelectable.length);
        workspaceDom.selectAll.indeterminate = Boolean(visibleSelected.length && visibleSelected.length < visibleSelectable.length);
        persistWfaLater();
      }
      function upsertWorkspaceFile(file, role, status, selectFile) {
        let item = workspaceState.files.find(function (candidate) { return candidate.file.name === file.name && candidate.file.size === file.size && candidate.file.lastModified === file.lastModified; });
        if (!item) {
          item = { id:'doc-' + workspaceState.nextId++, file:file, role:role || 'unknown', status:status || 'processing', addedAt:new Date() };
          workspaceState.files.unshift(item);
          storeWorkspaceBlob(item);
        } else {
          item.role = role || item.role;
          item.status = status || item.status;
          item.file = file;
        }
        if (selectFile) workspaceState.selected.add(item.id);
        renderWorkspaceFiles();
        return item;
      }
      async function addWorkspaceFiles(fileList) {
        const allFiles = Array.from(fileList || []);
        const pdfFiles = allFiles.filter(function (file) { return /\.pdf$/i.test(file.name) || file.type === 'application/pdf'; });
        if (!pdfFiles.length) { showToast('Selecione um ou mais arquivos em PDF.'); return; }
        if (pdfFiles.length !== allFiles.length) showToast('Arquivos que não eram PDF foram ignorados.');
        for (const file of pdfFiles) {
          const item = upsertWorkspaceFile(file, 'unknown', 'processing', false);   // quem escolhe é você
          try {
            item.role = (await detectCompareFileRole(file)) || 'unknown';
            item.status = item.role === 'unknown' ? 'error' : 'ready';
          } catch (error) {
            item.role = 'unknown';
            item.status = 'error';
          }
          renderWorkspaceFiles();
        }
        showToast(pdfFiles.length + (pdfFiles.length === 1 ? ' documento adicionado à central.' : ' documentos adicionados à central.'));
        workspaceDom.upload.value = '';
      }
      function setWorkspaceSelection(id, selected) {
        if (!findWorkspaceFile(id)) return;
        if (selected) workspaceState.selected.add(id); else workspaceState.selected.delete(id);
        renderWorkspaceFiles();
      }
      function removeWorkspaceFile(id) {
        const item = findWorkspaceFile(id);
        if (!item) return;
        workspaceState.files = workspaceState.files.filter(function (candidate) { return candidate.id !== id; });
        workspaceState.selected.delete(id);
        dropWorkspaceBlob(id);
        const usadoNaComparacao = COMPARE_ROLES.some(function (papel) { return compareState.files[papel] === item.file; });
        COMPARE_ROLES.forEach(function (papel) { if (compareState.files[papel] === item.file) clearCompareRole(papel); });
        renderWorkspaceFiles();
        // sem aba salva por trás, a tabela deixa de ter origem: não pode continuar em tela
        if (usadoNaComparacao && !execucaoAberta && !compareDom.results.hidden) {
          limparComparacaoAtual();
          showToast('Arquivo removido. A comparação em tela foi encerrada porque dependia dele.');
          return;
        }
        showToast('Arquivo removido da central.');
      }
      // Ao preencher uma planilha em branco, as colunas do rascunho que ficaram
      // sem nome e sem conteúdo saem de cena; as que você nomeou permanecem.
      function limparColunasVaziasDoRascunho() {
        if (compareState.modo !== 'livre') return;
        compareState.colunasExtras = (compareState.colunasExtras || []).filter(function (extra) {
          const titulo = (compareState.titulos && compareState.titulos[extra.id]) || extra.titulo || '';
          if (titulo.trim()) return true;
          return compareState.rows.some(function (row) {
            return row.extras && String(row.extras[extra.id] || '').trim();
          });
        });
      }

      function launchWorkspaceComparator() {
        const selected = workspaceState.files.filter(function (item) { return workspaceState.selected.has(item.id) && item.status === 'ready'; });
        const escolhidos = {};
        COMPARE_ROLES.forEach(function (papel) {
          const item = selected.find(function (candidato) { return candidato.role === papel; });
          if (item) escolhidos[papel] = item;
        });
        const papeis = Object.keys(escolhidos);
        if (papeis.length < 2) {
          showToast('Marque ao menos dois relatórios de tipos diferentes na central.');
          selectView('workspace');
          return;
        }
        limparColunasVaziasDoRascunho();
        COMPARE_ROLES.forEach(function (papel) { if (!escolhidos[papel]) clearCompareRole(papel); });
        papeis.forEach(function (papel) {
          const item = escolhidos[papel];
          compareState.files[papel] = item.file;
          document.getElementById(papel + 'Clear').hidden = false;
          fileState(papel, 'ready', item.file.name, formatBytes(item.file.size) + ' • selecionado na central', 'Pronto');
        });
        compareDom.batchState.className = 'pdf-batch-state show';
        compareDom.batchState.textContent = papeis.length + ' relatórios selecionados na Central de documentos.';
        resetCompareOutput();
        updateCompareReady();
        selectView('comparador-fontes');
        window.setTimeout(function () { compareDom.run.click(); }, 80);
      }

      workspaceDom.uploadTrigger.addEventListener('click', function () { workspaceDom.upload.click(); });
      workspaceDom.upload.addEventListener('change', function () { addWorkspaceFiles(workspaceDom.upload.files); });
      workspaceDom.search.addEventListener('input', renderWorkspaceFiles);
      workspaceDom.filter.addEventListener('change', renderWorkspaceFiles);
      workspaceDom.selectAll.addEventListener('change', function () {
        visibleWorkspaceFiles().forEach(function (item) { if (workspaceDom.selectAll.checked) workspaceState.selected.add(item.id); else workspaceState.selected.delete(item.id); });
        renderWorkspaceFiles();
      });
      [workspaceDom.rows, workspaceDom.sidebar].forEach(function (container) {
        container.addEventListener('change', function (event) { const input = event.target.closest('[data-workspace-select]'); if (input) setWorkspaceSelection(input.dataset.workspaceSelect, input.checked); });
      });
      workspaceDom.sidebar.addEventListener('click', function (event) {
        const botao = event.target.closest('[data-remover-doc]');
        if (!botao) return;
        event.preventDefault();
        event.stopPropagation();
        removeWorkspaceFile(botao.dataset.removerDoc);
      });
      workspaceDom.rows.addEventListener('click', function (event) { const button = event.target.closest('[data-workspace-remove]'); if (button) removeWorkspaceFile(button.dataset.workspaceRemove); });
      document.querySelectorAll('[data-workspace-tool="compare"]').forEach(function (button) { button.addEventListener('click', launchWorkspaceComparator); });
      document.getElementById('novaPlanilhaBotao').addEventListener('click', function () { novaPlanilha(); });
      document.getElementById('sidebarNovaPlanilha').addEventListener('click', function () { novaPlanilha(); });
      // As automações moram dentro da planilha, na barra de comandos.
      document.getElementById('sheetAutomacao').addEventListener('click', function (evento) {
        evento.stopPropagation();
        fecharMenuAutomacoes();
        const itens = [{ titulo:'Automações desta planilha' }];
        AUTOMACOES.forEach(function (automacao) {
          const disponivel = automacao.disponivel !== false;
          itens.push({
            rotulo: automacao.nome,
            nota: disponivel ? '' : automacao.nota || 'em desenvolvimento',
            desabilitado: !disponivel,
            dica: disponivel ? automacao.descricao : 'Esta automação ainda não está pronta.',
            // o quadro abre depois que este clique termina, senão o fechamento
            // por clique fora o derrubaria no mesmo instante
            acao: function () { window.setTimeout(function () { abrirMenuAutomacoes(automacao.id); }, 0); }
          });
        });
        abrirMenuPlanilha(evento, itens);
      });
      document.getElementById('sheetAutomacaoMenu').addEventListener('click', function (evento) {
        const botao = evento.target.closest('[data-rodar]');
        if (!botao || botao.disabled) return;
        const automacao = AUTOMACOES.find(function (item) { return item.id === botao.dataset.rodar; });
        fecharMenuAutomacoes();
        if (automacao) automacao.executar();
      });
      document.addEventListener('click', function (evento) {
        const painel = document.getElementById('sheetAutomacaoMenu');
        if (painel && !painel.hidden && !painel.contains(evento.target)) fecharMenuAutomacoes();
      });
      document.addEventListener('keydown', function (evento) { if (evento.key === 'Escape') fecharMenuAutomacoes(); });
      workspaceDom.run.addEventListener('click', launchWorkspaceComparator);
      renderWorkspaceFiles();

      async function extractCompareReport(role, file) {
        const pdfjs = await getPdfJs();
        const buffer = await file.arrayBuffer();
        const hash = await sha256(buffer.slice(0));
        const loadingTask = pdfjs.getDocument({ data:new Uint8Array(buffer), enableScripting:false, isEvalSupported:false });
        const pdf = await loadingTask.promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const lines = linesFromPdfItems(content.items);
          pages.push({ number:pageNumber, lines:lines, text:lines.join('\n') });
          page.cleanup();
        }
        const allLines = pages.reduce(function (result, page) { return result.concat(page.lines); }, []);
        const normalizedDocument = normalizeSearch(allLines.join(' '));
        let detected = null;
        if (normalizedDocument.includes('RELATORIO DE RECEITAS ORCADAS')) detected = 'budget';
        if (normalizedDocument.includes('RELACAO DAS RECEITAS ARRECADADAS')) detected = 'collected';
        if (!detected && normalizedDocument.includes('RELACAO DA DESPESA')) detected = 'committed';
        if (!detected) throw Object.assign(new Error('Não foi possível reconhecer o tipo do arquivo “' + file.name + '”. Confirme se ele contém um dos relatórios esperados.'), { compareRole:role });
        if (detected !== role) {
          const found = ROLE_INFO[detected].nome;
          const expected = ROLE_INFO[role].nome;
          throw Object.assign(new Error('O arquivo “' + file.name + '” foi identificado como “' + found + '”, mas foi colocado no espaço “' + expected + '”. Troque o arquivo de posição.'), { compareRole:role });
        }
        let sectionPage = -1;
        let sectionLine = -1;
        pages.some(function (page, pageIndex) {
          const lineIndex = page.lines.findIndex(function (line) { return normalizeSearch(line).includes('TOTAL POR FONTE DE RECURSO'); });
          if (lineIndex >= 0) { sectionPage = pageIndex; sectionLine = lineIndex; return true; }
          return false;
        });
        if (sectionPage < 0) throw Object.assign(new Error('O quadro “Total por Fonte de Recurso” não foi encontrado em “' + file.name + '”.'), { compareRole:role });
        let sectionLines = pages[sectionPage].lines.slice(sectionLine + 1);
        pages.slice(sectionPage + 1).forEach(function (page) { sectionLines = sectionLines.concat(page.lines); });
        const budgetPattern = /^(\d{2})\s+(\d{4})\s+(\d{4})\s+(\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})$/;
        const collectedPattern = /^(\d{2})\s+(\d{4})\s+(\d{4})\s+(\d{4})\s+(\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})$/;
        const sourceMap = new Map();
        sectionLines.forEach(function (line) {
          const match = line.match(ROLE_INFO[role].comCo ? collectedPattern : budgetPattern);
          if (!match) return;
          const key = [match[1],match[2],match[3],match[4]].join(' ');
          const temCo = ROLE_INFO[role].comCo;
          const co = temCo ? match[5] : '';
          const description = temCo ? match[6] : match[5];
          const value = parseBrl(temCo ? match[7] : match[6]);
          if (!Number.isFinite(value)) return;
          const existing = sourceMap.get(key) || { key:key, description:description, value:0, co:[] };
          existing.value += value;
          if (description.length > existing.description.length) existing.description = description;
          if (co && !existing.co.includes(co)) existing.co.push(co);
          sourceMap.set(key, existing);
        });
        if (!sourceMap.size) throw Object.assign(new Error('O relatório foi reconhecido, mas nenhuma linha de fonte pôde ser extraída. Revise a qualidade do PDF.'), { compareRole:role });
        const totalCandidates = sectionLines.map(function (line) { const match = line.match(/^TOTAL\b.*?(-?[\d.]+,\d{2})\s*$/i); return match ? parseBrl(match[1]) : null; }).filter(function (value) { return Number.isFinite(value); });
        const reportedTotal = totalCandidates.length ? totalCandidates[totalCandidates.length - 1] : null;
        const extractedTotal = Array.from(sourceMap.values()).reduce(function (sum, source) { return sum + source.value; }, 0);
        const municipalityLine = allLines.find(function (line) { const normalized = normalizeSearch(line); return normalized.includes('MUNICIPIO') && /-\s*MG/i.test(line); }) || '';
        const municipalityMatch = municipalityLine.match(/MUNIC.PIO\s+(.+?-\s*MG)/i);
        const exerciseMatch = normalizeSearch(allLines.join(' ')).match(/EXERCICIO\s*:\s*(\d{4})/);
        const periodMatch = normalizedDocument.match(/PERIODO\s*:\s*([A-Z]+)\s+A\s+([A-Z]+)/);
        return {
          role:role, fileName:file.name, fileSize:file.size, hash:hash, pages:pdf.numPages, sectionPages:(sectionPage + 1) + '–' + pdf.numPages,
          title:ROLE_INFO[role].titulo, municipality:municipalityMatch ? municipalityMatch[1].trim() : 'Não identificado',
          exercise:exerciseMatch ? exerciseMatch[1] : 'Não identificado', period:periodMatch ? periodMatch[1] + ' a ' + periodMatch[2] : 'Não informado',
          sources:sourceMap, reportedTotal:reportedTotal, extractedTotal:extractedTotal, reconciled:Number.isFinite(reportedTotal) && Math.abs(reportedTotal - extractedTotal) <= 0.05
        };
      }
      function mergeCompareReports() {
        const papeis = papeisComRelatorio();
        const keys = new Set();
        papeis.forEach(function (papel) {
          Array.from(compareState.reports[papel].sources.keys()).forEach(function (chave) { keys.add(chave); });
        });
        return Array.from(keys).sort().map(function (key) {
          const linha = { key:key, description:'', co:[], edited:false, manual:false, deleted:false };
          COMPARE_ROLES.forEach(function (papel) {
            const relatorio = compareState.reports[papel];
            const fonte = relatorio ? relatorio.sources.get(key) : null;
            linha[papel] = fonte ? fonte.value : 0;
            linha['original_' + papel] = fonte ? fonte.value : null;
            linha['tem_' + papel] = Boolean(fonte);
            if (fonte) {
              if (fonte.description.length > linha.description.length) linha.description = fonte.description;
              if (fonte.co && fonte.co.length) linha.co = fonte.co;
            }
          });
          return linha;
        });
      }
      function compareStatus(row) {
        const papeis = papeisComRelatorio();
        const presentes = papeis.filter(function (papel) { return row['tem_' + papel]; });
        if (presentes.length < papeis.length) {
          return { code:'only-' + presentes.join('-'), label:'Só ' + presentes.map(function (p) { return ROLE_INFO[p].curto.toLowerCase(); }).join(' + '), className:'warning' };
        }
        if (row.tem_budget && row.collected > row.budget + 0.005) return { code:'above', label:'Arrecadado > orçado', className:'danger' };
        if (row.tem_budget && row.tem_committed && row.committed > row.budget + 0.005) return { code:'above', label:'Empenhado > orçado', className:'danger' };
        return { code:'matched', label:'Conferido', className:'' };
      }
      function activeCompareRows() { return compareState.rows.filter(function (row) { return !row.deleted; }); }
      function renderCompareMeta(report, targetId) {
        document.getElementById(targetId).innerHTML = '<span>Município<br><b>' + escapeHtml(report.municipality) + '</b></span><span>Exercício<br><b>' + escapeHtml(report.exercise) + '</b></span><span>Páginas do quadro<br><b>' + escapeHtml(report.sectionPages) + '</b></span><span>Arquivo<br><b title="' + escapeHtml(report.fileName) + '">' + escapeHtml(report.fileName) + '</b></span><span>Total informado<br><b>' + formatBrl(report.reportedTotal) + '</b></span><span>SHA-256<br><b title="' + escapeHtml(report.hash) + '">' + escapeHtml(report.hash.slice(0,16)) + '…</b></span>';
      }
      function renderCompareValidations() {
        const alvo = document.getElementById('compareValidations');
        if (!alvo) return;
        alvo.innerHTML = papeisComRelatorio().map(function (papel) {
          const relatorio = compareState.reports[papel];
          const diferenca = Number.isFinite(relatorio.reportedTotal) ? relatorio.extractedTotal - relatorio.reportedTotal : NaN;
          const titulo = relatorio.title + ': extraído ' + formatBrl(relatorio.extractedTotal) + ' • informado ' + formatBrl(relatorio.reportedTotal) +
            (relatorio.reconciled ? ' • confere' : ' • diferença ' + formatBrl(diferenca));
          return '<span class="validacao-etiqueta' + (relatorio.reconciled ? '' : ' alerta') + '" title="' + escapeHtml(titulo) + '">' +
            (relatorio.reconciled ? '✓' : '!') + ' ' + escapeHtml(ROLE_INFO[papel].curto) + '</span>';
        }).join('');
      }

      function renderCompareKpis() {
        const rows = activeCompareRows();
        const papeis = papeisComRelatorio();
        const completa = function (row) { return papeis.every(function (papel) { return row['tem_' + papel]; }); };
        const matched = rows.filter(completa).length;
        const onlyBudget = rows.length - matched;
        const onlyCollected = rows.filter(function (row) { return row.tem_budget && row.tem_committed && row.committed > row.budget + 0.005; }).length;
        const above = rows.filter(function (row) { return row.tem_budget && row.tem_collected && row.collected > row.budget + 0.005; }).length;
        document.getElementById('kpiSources').textContent = rows.length;
        document.getElementById('kpiMatched').textContent = matched;
        document.getElementById('kpiOnlyBudget').textContent = onlyBudget;
        document.getElementById('kpiOnlyCollected').textContent = onlyCollected;
        document.getElementById('kpiAbove').textContent = above;
        if (compareDom.summaryLabel) compareDom.summaryLabel.textContent = rows.length + ' fontes • ' + matched + ' em todos os relatórios • ' + above + ' arrecadadas acima do orçado';
      }
      const LETRAS_COLUNA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      // Estrutura da planilha: colunas de dados são editáveis, as calculadas não.
      function colunasDaTabela() {
        const colunas = [];
        // Uma planilha em branco sem coluna nenhuma não serve para nada: devolve o rascunho.
        if (compareState.modo === 'livre' && !(compareState.colunasExtras || []).length && compareState.rows.length) {
          compareState.colunasExtras = colunasDoRascunho();
        }
        // Planilha em branco: existem só as colunas que você criou.
        if (compareState.modo !== 'livre') {
        colunas.push({ id:'key', tipo:'texto', titulo:'Fonte de recurso', largura:150, classe:'cell-code' });
        colunas.push({ id:'description', tipo:'texto', titulo:'Descrição', largura:380, classe:'' });
        papeisComRelatorio().forEach(function (papel) {
          colunas.push({ id:papel, tipo:'moeda', titulo:ROLE_INFO[papel].curto, largura:118, classe:'cell-money' });
        });
        // letras das colunas de valor, para montar a fórmula padrão de cada coluna calculada
        const par = parDeComparacao();
        const letraDe = function (papel) {
          const indice = colunas.findIndex(function (coluna) { return coluna.id === papel; });
          return indice >= 0 ? LETRAS_COLUNA[indice] : '';
        };
        const padraoDiferenca = par ? '=' + letraDe(par.alvo) + '-' + letraDe(par.base) : '=0';
        const padraoExecucao = par ? '=' + letraDe(par.alvo) + '/' + letraDe(par.base) + '*100' : '=0';
        colunas.push({ id:'diferenca', tipo:'formula', formato:'moeda', titulo:'Diferença', largura:130, padrao:padraoDiferenca });
        colunas.push({ id:'execucao', tipo:'formula', formato:'percentual', titulo:'Execução', largura:96, padrao:padraoExecucao });
        colunas.push({ id:'situacao', tipo:'calculada', titulo:'Situação', largura:170, formula:'comparação entre os relatórios' });
        }
        (compareState.colunasExtras || []).forEach(function (extra) {
          const definicao = { id:extra.id, tipo:'livre', titulo:extra.titulo || '', largura:extra.largura || 150, classe:'' };
          const alvo = extra.ancora ? colunas.findIndex(function (coluna) { return coluna.id === extra.ancora; }) : -1;
          if (alvo >= 0) colunas.splice(extra.lado === 'antes' ? alvo : alvo + 1, 0, definicao);
          else colunas.push(definicao);
        });
        return colunas.map(function (coluna) {
          const personalizado = compareState.titulos && compareState.titulos[coluna.id];
          if (personalizado) coluna.titulo = personalizado;
          if (coluna.tipo === 'formula') coluna.dica = formulaDaColuna(coluna);
          return coluna;
        });
      }

      // Sem o relatório orçado, comparar contra zero não diz nada. O par de referência
      // é sempre o mais informativo entre os relatórios que foram carregados.
      function parDeComparacao() {
        const papeis = papeisComRelatorio();
        const tem = function (papel) { return papeis.indexOf(papel) !== -1; };
        if (tem('budget') && tem('collected')) return { base:'budget', alvo:'collected' };
        if (tem('budget') && tem('committed')) return { base:'budget', alvo:'committed' };
        if (tem('committed') && tem('collected')) return { base:'committed', alvo:'collected' };
        return null;
      }
      function diferencaDaLinha(row) {
        const par = parDeComparacao();
        if (!par) return 0;
        return row[par.alvo] - row[par.base];
      }
      function execucaoDaLinha(row) {
        const par = parDeComparacao();
        if (!par || !row[par.base]) return NaN;
        return (row[par.alvo] / row[par.base]) * 100;
      }
      function descricaoDoPar() {
        const par = parDeComparacao();
        if (!par) return 'os relatórios carregados';
        return ROLE_INFO[par.alvo].curto + ' menos ' + ROLE_INFO[par.base].curto;
      }
      /* ============ Fórmulas nas colunas livres ============
         Escreva =C2-D2, =SOMA(C2:C9) ou =MEDIA(E2:E9). Referências usam as letras
         do cabeçalho e o número da linha visível. Só as colunas criadas por você
         aceitam fórmula; as de origem guardam o dado extraído do PDF.        */
      const FUNCOES_PLANILHA = {
        SOMA: function (valores) { return valores.reduce(function (a, b) { return a + b; }, 0); },
        MEDIA: function (valores) { return valores.length ? valores.reduce(function (a, b) { return a + b; }, 0) / valores.length : 0; },
        MIN: function (valores) { return valores.length ? Math.min.apply(null, valores) : 0; },
        MAX: function (valores) { return valores.length ? Math.max.apply(null, valores) : 0; },
        CONT: function (valores) { return valores.length; },
        ABS: function (valores) { return Math.abs(valores[0] || 0); },
        ARRED: function (valores) { const casas = valores.length > 1 ? valores[1] : 2; const fator = Math.pow(10, casas); return Math.round((valores[0] || 0) * fator) / fator; },
        SE: function (valores) { return valores[0] ? (valores.length > 1 ? valores[1] : 1) : (valores.length > 2 ? valores[2] : 0); }
      };

      function ehFormula(texto) { return typeof texto === 'string' && texto.trim().charAt(0) === '='; }

      // valor numérico de uma célula, pela letra da coluna e número da linha exibida
      function valorDaCelula(letra, numeroLinha, contexto) {
        const indice = contexto.colunas.findIndex(function (coluna, posicao) { return contexto.letras[posicao] === letra; });
        // letra que não corresponde a coluna nenhuma: melhor acusar do que somar zero calado
        if (indice < 0) throw new Error('referencia:' + letra);
        const coluna = contexto.colunas[indice];
        const row = contexto.linhas[numeroLinha - 1];
        if (!row) return 0;
        if (coluna.tipo === 'moeda') return Number(row[coluna.id]) || 0;
        if (coluna.id === 'diferenca') return diferencaDaLinha(row);
        if (coluna.id === 'execucao') { const v = execucaoDaLinha(row); return Number.isFinite(v) ? v : 0; }
        if (coluna.tipo === 'livre') {
          const bruto = (row.extras && row.extras[coluna.id]) || '';
          if (ehFormula(bruto)) return valorDeCelulaComFormula(bruto, coluna, row, numeroLinha, contexto);
          return parseBrl(bruto) || Number(String(bruto).replace(',', '.')) || 0;
        }
        return 0;
      }

      /* Uma celula referida pode ela mesma guardar uma formula: =SOMA(C1:C8) sobre
         uma coluna de =A1+B1 tem de somar os resultados, nao zeros. A avaliacao
         entra na celula referida e volta com o numero. Cada avaliacao aninhada
         recebe seu proprio rascunho de parciais, para nao atropelar a de fora,
         e o caminho percorrido fica registrado para barrar referencia circular. */
      function contextoAninhado(contexto) {
        return { colunas: contexto.colunas, letras: contexto.letras, linhas: contexto.linhas, parciais: [], emCurso: contexto.emCurso };
      }
      function valorDeCelulaComFormula(formula, coluna, row, numeroLinha, contexto) {
        contexto.emCurso = contexto.emCurso || new Set();
        const marca = coluna.id + '@' + row.key;
        if (contexto.emCurso.has(marca)) throw new Error('circular');
        contexto.emCurso.add(marca);
        try {
          const dentro = avaliarFormula(formula, contextoAninhado(contexto), numeroLinha);
          if (dentro.erro) throw new Error(dentro.rotulo === '#CIRC' ? 'circular' : 'dependente');
          return dentro.valor;
        } finally {
          contexto.emCurso.delete(marca);
        }
      }

      // aritmética pura: troca referências por números e resolve a conta
      function avaliarAritmetica(expressao, contexto, linhaAtual) {
        // resultados de funções já resolvidas voltam como marcadores, sem parênteses,
        // para não atrapalhar o reconhecimento de uma função externa
        let conta = expressao.replace(/#(\d+)#/g, function (todo, indice) {
          return '(' + String(contexto.parciais[Number(indice)]) + ')';
        });
        conta = conta.replace(/([A-Z])(\d+)/g, function (todo, letra, numero) {
          return '(' + String(valorDaCelula(letra, Number(numero), contexto)) + ')';
        });
        // letra sem número = coluna desta mesma linha (usada nas fórmulas de coluna)
        if (linhaAtual) {
          conta = conta.replace(/\b([A-Z])\b/g, function (todo, letra) {
            return '(' + String(valorDaCelula(letra, linhaAtual, contexto)) + ')';
          });
        }
        conta = conta.replace(/(\d),(\d)/g, '$1.$2');   // vírgula decimal
        if (/[^0-9+\-*/().\s]/.test(conta)) throw new Error('sintaxe');
        const resultado = Function('"use strict";return (' + conta + ')')();
        if (!Number.isFinite(resultado)) throw new Error('resultado');
        return resultado;
      }

      // separa argumentos por ; ou por vírgula que não seja decimal
      function separarArgumentos(texto) {
        return texto.split(/;|,(?!\d)/).map(function (parte) { return parte.trim(); }).filter(function (parte) { return parte.length; });
      }

      function semAcento(texto) {
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }

      function avaliarFormula(texto, contexto, linhaDaFormula) {
        try {
          let expressao = semAcento(texto.trim().slice(1)).toUpperCase();
          contexto.parciais = [];
          let voltas = 0;
          // resolve as funções de dentro para fora
          const chamada = /([A-Z]{2,})\(([^()]*)\)/;
          while (chamada.test(expressao)) {
            if (voltas += 1, voltas > 50) throw new Error('complexa');
            expressao = expressao.replace(chamada, function (todo, nome, argumentos) {
              const funcao = FUNCOES_PLANILHA[nome];
              if (!funcao) throw new Error('nome:' + nome);
              const valores = [];
              separarArgumentos(argumentos).forEach(function (parte) {
                // coluna inteira: SOMA(C)
                const colunaInteira = parte.match(/^([A-Z])$/);
                if (colunaInteira && !linhaDaFormula) {
                  for (let n = 1; n <= contexto.linhas.length; n += 1) valores.push(valorDaCelula(colunaInteira[1], n, contexto));
                  return;
                }
                if (colunaInteira && linhaDaFormula) {
                  for (let n = 1; n <= contexto.linhas.length; n += 1) valores.push(valorDaCelula(colunaInteira[1], n, contexto));
                  return;
                }
                const intervalo = parte.match(/^([A-Z])(\d+)\s*:\s*([A-Z])(\d+)$/);
                if (intervalo) {
                  const inicio = Math.min(Number(intervalo[2]), Number(intervalo[4]));
                  const fim = Math.max(Number(intervalo[2]), Number(intervalo[4]));
                  for (let n = inicio; n <= fim; n += 1) valores.push(valorDaCelula(intervalo[1], n, contexto));
                  return;
                }
                valores.push(avaliarAritmetica(parte, contexto, linhaDaFormula));
              });
              contexto.parciais.push(funcao(valores));
              return '#' + (contexto.parciais.length - 1) + '#';
            });
          }
          return { valor: avaliarAritmetica(expressao, contexto, linhaDaFormula) };
        } catch (erro) {
          const motivo = String(erro.message || '');
          if (motivo.indexOf('nome:') === 0) return { erro: true, rotulo: '#NOME?', detalhe: 'A função ' + motivo.slice(5) + ' não existe. Disponíveis: ' + Object.keys(FUNCOES_PLANILHA).join(', ') + '.' };
          if (motivo.indexOf('referencia:') === 0) return { erro: true, rotulo: '#REF', detalhe: 'Não existe a coluna ' + motivo.slice(11) + ' nesta planilha. Confira a letra no cabeçalho.' };
          if (motivo === 'circular') return { erro: true, rotulo: '#CIRC', detalhe: 'Esta fórmula depende dela mesma, direta ou indiretamente. Se você somou a coluna inteira dentro da própria coluna, troque por um intervalo, como C1:C8.' };
          if (motivo === 'dependente') return { erro: true, rotulo: '#ERRO', detalhe: 'Uma das células usadas por esta fórmula está com erro. Corrija-a primeiro.' };
          return { erro: true, rotulo: '#ERRO', detalhe: 'Confira a fórmula: parênteses, referências como C1 e o separador ; entre argumentos.' };
        }
      }

      function textoDaCelulaLivre(row, coluna, contexto) {
        const bruto = (row.extras && row.extras[coluna.id]) || '';
        if (!ehFormula(bruto)) return { exibido: bruto, formula: false };
        // a própria célula entra no caminho: assim =C1 escrito em C1 é apontado como circular
        contexto.emCurso = new Set([coluna.id + '@' + row.key]);
        const resultado = avaliarFormula(bruto, contexto, contexto.linhas.indexOf(row) + 1);
        contexto.emCurso = null;
        if (resultado.erro) return { exibido: resultado.rotulo, formula: true, erro: true, detalhe: resultado.detalhe };
        return { exibido: formatBrl(resultado.valor), formula: true };
      }

      function valorCalculado(row, id) {
        if (id === 'diferenca') return formatBrl(diferencaDaLinha(row));
        if (id === 'execucao') return formatPercent(execucaoDaLinha(row));
        return compareStatus(row).label;
      }

      /* A planilha ocupa o que sobra da tela. Antes era uma conta fixa em CSS,
         calibrada para um cabeçalho que não existe mais — e sobrava um vão. */
      /* ---------------- largura das colunas e altura das linhas ----------------
         Arrastar a divisa na linha das letras muda a largura; arrastar a divisa
         de baixo no número da linha muda a altura. Fica guardado com a planilha. */
      const LARGURA_MINIMA = 54;
      const ALTURA_MINIMA = 22;
      let redimensionando = null;

      function larguraGuardada(coluna) {
        const guardadas = compareState.larguras || {};
        return guardadas[coluna.id] || coluna.largura;
      }
      function guardarLargura(id, valor) {
        compareState.larguras = compareState.larguras || {};
        compareState.larguras[id] = Math.max(LARGURA_MINIMA, Math.round(valor));
      }
      function guardarAltura(chave, valor) {
        compareState.alturas = compareState.alturas || {};
        compareState.alturas[chave] = Math.max(ALTURA_MINIMA, Math.round(valor));
      }

      function iniciarRedimensionamento(evento) {
        const pegaColuna = evento.target.closest('[data-redim-col]');
        const pegaLinha = evento.target.closest('[data-redim-linha]');
        if (!pegaColuna && !pegaLinha) return;
        evento.preventDefault();
        evento.stopPropagation();
        if (pegaColuna) {
          const indice = Number(pegaColuna.dataset.redimCol);
          const colunas = colunasDaTabela();
          const coluna = colunas[indice];
          if (!coluna) return;
          redimensionando = { tipo:'coluna', id:coluna.id, indice:indice, inicio:evento.clientX, base:larguraGuardada(coluna) };
        } else {
          const linha = document.querySelector('#compareTableBody tr [data-menu-linha="' + pegaLinha.dataset.redimLinha + '"]');
          const alvo = linha ? linha.parentElement : null;
          if (!alvo) return;
          redimensionando = { tipo:'linha', chave:pegaLinha.dataset.redimLinha, inicio:evento.clientY, base:alvo.getBoundingClientRect().height, el:alvo };
        }
        document.body.classList.add('redimensionando');
      }

      document.getElementById('compareHead').addEventListener('mousedown', iniciarRedimensionamento);
      document.getElementById('compareTableBody').addEventListener('mousedown', iniciarRedimensionamento);

      document.addEventListener('mousemove', function (evento) {
        if (!redimensionando) return;
        if (redimensionando.tipo === 'coluna') {
          const nova = Math.max(LARGURA_MINIMA, redimensionando.base + (evento.clientX - redimensionando.inicio));
          const col = document.getElementById('compareCols').children[redimensionando.indice + 1];
          if (col) col.style.width = Math.round(nova) + 'px';
          redimensionando.valor = nova;
        } else {
          const nova = Math.max(ALTURA_MINIMA, redimensionando.base + (evento.clientY - redimensionando.inicio));
          redimensionando.el.style.height = Math.round(nova) + 'px';
          redimensionando.valor = nova;
        }
      });
      document.addEventListener('mouseup', function () {
        if (!redimensionando) return;
        if (redimensionando.valor) {
          if (redimensionando.tipo === 'coluna') guardarLargura(redimensionando.id, redimensionando.valor);
          else guardarAltura(redimensionando.chave, redimensionando.valor);
          persistWfaLater();
          regravarExecucaoAberta();
        }
        redimensionando = null;
        document.body.classList.remove('redimensionando');
      });

      function ajustarAlturaDaPlanilha() {
        const caixa = document.querySelector('.compare-table-wrap');
        if (!caixa) return;
        // Depois do desenho, e insistindo: a planilha pode estar escondida ainda
        // quando a tela é restaurada, e aí a caixa não tem posição para medir.
        let tentativas = 0;
        const medir = function () {
          const topo = caixa.getBoundingClientRect().top;
          if (!topo) {
            if (tentativas += 1, tentativas < 12) window.setTimeout(medir, 80);
            return;
          }
          const rodape = document.querySelector('.compare-table-footer');
          const abas = document.querySelector('.sheet-tabs');
          // medir até o começo das abas evita ter de saber de margens e recuos
          const limite = abas && abas.getBoundingClientRect().top
            ? abas.getBoundingClientRect().top
            : window.innerHeight;
          const sobra = limite - topo - (rodape ? rodape.offsetHeight : 0) - 6;
          caixa.style.maxHeight = Math.max(220, Math.round(sobra)) + 'px';
        };
        window.setTimeout(medir, 0);
      }
      window.addEventListener('resize', ajustarAlturaDaPlanilha);

      function renderCompareTable() {
        const query = normalizeSearch(compareDom.search.value);
        const filter = compareDom.status.value;
        const allRows = activeCompareRows();
        const colunas = colunasDaTabela();

        const rows = compareState.modo === 'livre' ? filtrarLinhasLivres(allRows, query) : allRows.filter(function (row) {
          const status = compareStatus(row);
          const matchesSearch = !query || normalizeSearch(row.key + ' ' + row.description).includes(query);
          let matchesStatus = filter === 'all' || status.code === filter;
          if (filter === 'matched') matchesStatus = papeisComRelatorio().every(function (papel) { return row['tem_' + papel]; });
          if (filter === 'edited') matchesStatus = row.edited || row.manual;
          return matchesSearch && matchesStatus;
        });
        if (compareState.sourceSort === 'manual') {
          rows.sort(function (left, right) { return (left.ordem || 0) - (right.ordem || 0); });
        } else {
          rows.sort(function (left, right) {
            const comparison = left.key.localeCompare(right.key, 'pt-BR', { numeric:true, sensitivity:'base' });
            return compareState.sourceSort === 'asc' ? comparison : -comparison;
          });
        }

        /* Colunas com a largura pedida, mais uma coluna vazia no fim. É ela que
           recebe a sobra da tela: sem isso, ou a tabela estica e engorda todas
           as colunas, ou termina no meio da caixa e a grade fica falhada. */
        document.getElementById('compareCols').innerHTML = '<col class="col-row-number">' +
          colunas.map(function (coluna) {
            // Numa tela larga a tabela estica e reparte a sobra por todas as
            // colunas, engordando até a do código, que nunca precisa disso.
            // Sem largura declarada, a descrição fica com a sobra inteira.
            return '<col style="width:' + larguraGuardada(coluna) + 'px">';
          }).join('') + '<col class="col-preenchimento">';

        // cabeçalho: linha de letras + linha de títulos renomeáveis
        const letras = '<tr class="sheet-letters"><th class="sheet-corner"></th>' +
          colunas.map(function (coluna, indice) {
            return '<th>' + LETRAS_COLUNA[indice] +
              '<span class="pega-largura" data-redim-col="' + indice + '" title="Arraste para mudar a largura"></span></th>';
          }).join('') + '<th class="preenchimento"></th></tr>';
        const titulos = '<tr><th class="sheet-corner">#</th>' +
          colunas.map(function (coluna, indice) {
            const simbolo = compareState.sourceSort === 'asc' ? '↑' : compareState.sourceSort === 'desc' ? '↓' : '≡';
            const seta = coluna.id === 'key' ? '<button class="sheet-sort-button" id="compareSortSource" type="button" title="' + (compareState.sourceSort === 'manual' ? 'Ordem manual — clique para ordenar pelo código' : 'Classificar por fonte de recurso') + '"><span id="compareSortSourceIcon">' + simbolo + '</span></button>' : '';
            const numerica = coluna.tipo === 'moeda' || coluna.id === 'diferenca' || coluna.id === 'execucao';
            return '<th class="' + (numerica ? 'num ' : '') + 'col-' + escapeHtml(coluna.id) + (coluna.tipo === 'calculada' ? ' coluna-calculada' : '') + '">' +
              '<span class="cabecalho-topo">' +
                '<span class="titulo-coluna" contenteditable="true" spellcheck="false" data-coluna="' + escapeHtml(coluna.id) + '" title="' + escapeHtml(coluna.dica ? coluna.dica : 'Clique para renomear') + '">' + escapeHtml(coluna.titulo) + '</span>' + seta +
                '<button class="menu-coluna" type="button" data-menu-coluna="' + escapeHtml(coluna.id) + '" title="Opções da coluna" aria-label="Opções da coluna">▾</button>' +
              '</span>' +
              (coluna.dica ? '<small class="dica-coluna">' + escapeHtml(coluna.dica) + '</small>' : '') +
              '<span class="pega-largura" data-redim-col="' + indice + '" title="Arraste para mudar a largura"></span>' +
              '</th>';
          }).join('') + '<th class="preenchimento"></th></tr>';
        document.getElementById('compareHead').innerHTML = letras + titulos;

        // corpo
        const contextoFormula = { colunas: colunas, letras: colunas.map(function (coluna, indice) { return LETRAS_COLUNA[indice]; }), linhas: rows };
        compareDom.tableBody.innerHTML = rows.map(function (row, rowIndex) {
          const status = compareStatus(row);
          const celulas = colunas.map(function (coluna) {
            if (coluna.tipo === 'formula') {
              const formula = formulaDaColuna(coluna);
              const resultado = avaliarFormula(formula, contextoFormula, rowIndex + 1);
              let exibido = '#ERRO';
              let classeValor = ' celula-erro';
              if (!resultado.erro) {
                exibido = coluna.formato === 'percentual' ? formatPercent(resultado.valor) : formatBrl(resultado.valor);
                classeValor = coluna.formato === 'moeda' ? (resultado.valor < 0 ? ' value-negative' : resultado.valor > 0 ? ' value-positive' : '') : '';
              }
              return '<td class="num editable-cell col-' + escapeHtml(coluna.id) + classeValor + '"><input class="cell-editor cell-money" data-formula-col="' + escapeHtml(coluna.id) + '" data-bruto="' + escapeHtml(formula) + '" value="' + escapeHtml(exibido) + '" title="Fórmula da coluna: ' + escapeHtml(formula) + ' — editar aqui altera a coluna inteira" aria-label="' + escapeHtml(coluna.titulo) + '"></td>';
            }
            if (coluna.tipo === 'calculada') {
              let extraClasse = '';
              if (coluna.id === 'diferenca') {
                const diferenca = diferencaDaLinha(row);
                extraClasse = diferenca < 0 ? ' value-negative' : diferenca > 0 ? ' value-positive' : '';
              }
              const conteudo = coluna.id === 'situacao'
                ? '<span class="compare-badge ' + status.className + '">' + escapeHtml(status.label) + '</span>'
                : escapeHtml(valorCalculado(row, coluna.id));
              const numerica = coluna.id !== 'situacao';
              return '<td class="' + (numerica ? 'num ' : '') + 'coluna-calculada col-' + escapeHtml(coluna.id) + extraClasse + '" data-calculada="' + escapeHtml(coluna.titulo) + '" data-formula="' + escapeHtml(coluna.formula || '') + '">' + conteudo + '</td>';
            }
            if (coluna.tipo === 'livre') {
              const bruto = (row.extras && row.extras[coluna.id]) || '';
              const saida = textoDaCelulaLivre(row, coluna, contextoFormula);
              const classes = 'editable-cell col-' + escapeHtml(coluna.id) + (saida.formula ? ' celula-formula' : '') + (saida.erro ? ' celula-erro' : '');
              return '<td class="' + classes + (saida.formula ? ' num' : '') + '"><input class="cell-editor" data-compare-extra="' + escapeHtml(coluna.id) + '" data-row-key="' + escapeHtml(row.key) + '" data-bruto="' + escapeHtml(bruto) + '" value="' + escapeHtml(saida.exibido) + '" title="' + escapeHtml(saida.erro ? saida.detalhe : saida.formula ? bruto : 'Aceita texto ou fórmula começando com =') + '" aria-label="' + escapeHtml(coluna.titulo) + '"></td>';
            }
            const campo = coluna.id === 'key' ? 'code' : coluna.id;
            let valor = row[coluna.id];
            if (coluna.tipo === 'moeda') valor = formatBrl(row[coluna.id]).replace(/[^\d.,-]/g, '').trim();
            if (coluna.id === 'key') valor = row.key;
            const co = coluna.id === 'description' && row.co && row.co.length ? '<small>CO: ' + escapeHtml(row.co.join(', ')) + '</small>' : '';
            const entrada = '<input class="cell-editor ' + coluna.classe + '" data-compare-cell="' + campo + '" data-row-key="' + escapeHtml(row.key) + '" value="' + escapeHtml(String(valor)) + '"' + (coluna.tipo === 'moeda' ? ' inputmode="decimal"' : '') + ' aria-label="' + escapeHtml(coluna.titulo) + '">';
            return '<td class="' + (coluna.tipo === 'moeda' ? 'num ' : '') + 'editable-cell col-' + escapeHtml(coluna.id) + '">' + (co ? '<div class="cell-stack">' + entrada + co + '</div>' : entrada) + '</td>';
          }).join('');
          const alturaLinha = compareState.alturas && compareState.alturas[row.key];
          return '<tr' + (alturaLinha ? ' style="height:' + alturaLinha + 'px"' : '') + '><td class="sheet-row-number" data-menu-linha="' + escapeHtml(row.key) + '" title="Opções da linha"' + (compareState.alturas && compareState.alturas[row.key] ? ' style="height:' + compareState.alturas[row.key] + 'px"' : '') + '><span class="numero">' + (rowIndex + 1) + '</span><span class="pega-altura" data-redim-linha="' + escapeHtml(row.key) + '" title="Arraste para mudar a altura"></span><button class="menu-linha" type="button" data-abrir-menu-linha="' + escapeHtml(row.key) + '" title="Opções da linha" aria-label="Opções da linha">▾</button></td>' + celulas + '<td class="preenchimento"></td></tr>';
        }).join('');

        // rodapé de totais
        // o rodapé soma o que está à vista: filtrou, o total acompanha
        const filtrado = rows.length !== allRows.length;
        const somar = function (campo) { return rows.reduce(function (acumulado, row) { return acumulado + row[campo]; }, 0); };
        const parTotal = parDeComparacao();
        const totais = colunas.map(function (coluna) {
          if (coluna.tipo === 'moeda') {
            return '<th class="num col-' + escapeHtml(coluna.id) + '">' + formatBrl(somar(coluna.id)) + '</th>';
          }
          if (coluna.id === 'diferenca') {
            return '<th class="num">' + formatBrl(parTotal ? somar(parTotal.alvo) - somar(parTotal.base) : 0) + '</th>';
          }
          if (coluna.id === 'execucao') {
            const base = parTotal ? somar(parTotal.base) : 0;
            const alvo = parTotal ? somar(parTotal.alvo) : 0;
            return '<th class="num">' + formatPercent(base ? (alvo / base) * 100 : NaN) + '</th>';
          }
          if (compareState.modo === 'livre') return '<th></th>';
          if (coluna.id === 'key') return '<th>' + (filtrado ? 'Total exibido (' + rows.length + ' de ' + allRows.length + ')' : 'Total das fontes') + '</th>';
          return '<th></th>';
        }).join('');
        document.getElementById('compareFoot').innerHTML = '<tr><th class="sheet-corner"></th>' + totais + '<th class="preenchimento"></th></tr>';

        compareDom.tableBody.dispatchEvent(new CustomEvent('wfa:redesenhou'));
        ajustarAlturaDaPlanilha();
        compareDom.view.classList.toggle('planilha-livre', compareState.modo === 'livre');
        document.getElementById('compareCount').textContent = compareState.modo === 'livre'
          ? rows.length + (rows.length === 1 ? ' linha' : ' linhas') + ' • ' + colunas.length + (colunas.length === 1 ? ' coluna' : ' colunas')
          : rows.length + (rows.length === 1 ? ' fonte exibida' : ' fontes exibidas');
        const cartao = document.querySelector('.compare-table-card');
        if (cartao) COMPARE_ROLES.forEach(function (papel) { cartao.classList.toggle('tem-' + papel, Boolean(compareState.reports[papel])); });
        renderCompareKpis();
        persistWfaLater();
      }

      // ---------- inserir e excluir linhas ----------
      function proximaChaveLivre() {
        let n = 1;
        while (compareState.rows.some(function (row) { return row.key === 'Nova fonte ' + n; })) n += 1;
        return 'Nova fonte ' + n;
      }
      function garantirOrdem() {
        const visiveis = activeCompareRows();
        visiveis.forEach(function (row, indice) { if (typeof row.ordem !== 'number') row.ordem = indice; });
      }
      function inserirLinha(chaveReferencia, posicao) {
        garantirOrdem();
        const nova = {
          key: proximaChaveLivre(), description: '', co: [], extras: {},
          edited: true, manual: true, deleted: false, novo: true
        };
        COMPARE_ROLES.forEach(function (papel) {
          nova[papel] = 0;
          nova['original_' + papel] = null;
          nova['tem_' + papel] = false;
        });
        if (chaveReferencia) {
          const referencia = findCompareRow(chaveReferencia);
          const base = referencia ? (referencia.ordem || 0) : 0;
          nova.ordem = posicao === 'antes' ? base - 0.5 : base + 0.5;
          compareState.sourceSort = 'manual';
        } else {
          nova.ordem = activeCompareRows().length;
        }
        compareState.rows.push(nova);
        // renumera para manter inteiros
        activeCompareRows().slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
          .forEach(function (row, indice) { row.ordem = indice; });
        renderCompareTable();
        addAudit('Fonte adicionada', 'Linha em branco criada para preenchimento manual.', nova.key);
        regravarExecucaoAberta();
        setTimeout(function () {
          const campo = document.querySelector('[data-row-key="' + nova.key.replace(/"/g, '') + '"][data-compare-cell="code"]');
          if (campo) { campo.focus(); campo.select(); }
        }, 60);
      }
      function duplicarLinha(chave) {
        const original = findCompareRow(chave);
        if (!original) return;
        garantirOrdem();
        const copia = JSON.parse(JSON.stringify(Object.assign({}, original, { extras: original.extras || {} })));
        copia.key = proximaChaveLivre();
        copia.manual = true;
        copia.edited = true;
        copia.ordem = (original.ordem || 0) + 0.5;
        compareState.sourceSort = 'manual';
        compareState.rows.push(copia);
        activeCompareRows().slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
          .forEach(function (row, indice) { row.ordem = indice; });
        renderCompareTable();
        addAudit('Linha duplicada', 'Cópia de ' + original.key + ' criada como ' + copia.key + '.', copia.key);
        regravarExecucaoAberta();
      }

      async function excluirLinha(chave) {
        const row = findCompareRow(chave);
        if (!row) return;
        const confirmado = await window.wfaConfirmar('A fonte ' + row.key + ' sai da tabela e do total. A remoção fica registrada na trilha de auditoria.', 'Excluir fonte', 'Excluir');
        if (!confirmado) return;
        row.deleted = true;
        row.edited = true;
        addAudit('Fonte removida da comparação', row.key + ' • ' + (row.description || 'sem descrição'), row.key);
        renderCompareTable();
        regravarExecucaoAberta();
      }

      // ---------- menu de contexto no padrão de planilha ----------
      function fecharMenuPlanilha() {
        const menu = document.getElementById('sheetMenu');
        if (menu) menu.hidden = true;
      }
      function abrirMenuPlanilha(evento, itens) {
        const menu = document.getElementById('sheetMenu');
        if (!menu) return;
        menu.innerHTML = itens.map(function (item, indice) {
          if (item.separador) return '<hr>';
          if (item.titulo) return '<span class="menu-titulo">' + escapeHtml(item.titulo) + '</span>';
          const classes = (item.perigo ? 'perigo' : '') + (item.desabilitado ? ' desligado' : '');
          return '<button type="button" data-item="' + indice + '"' + (classes.trim() ? ' class="' + classes.trim() + '"' : '') +
            (item.desabilitado ? ' disabled' : '') +
            (item.dica ? ' title="' + escapeHtml(item.dica) + '"' : '') + '>' + escapeHtml(item.rotulo) +
            (item.nota ? '<small>' + escapeHtml(item.nota) + '</small>' : '') + '</button>';
        }).join('');
        menu.hidden = false;
        const largura = menu.offsetWidth || 200;
        const altura = menu.offsetHeight || 120;
        menu.style.left = Math.min(evento.clientX, window.innerWidth - largura - 8) + 'px';
        menu.style.top = Math.min(evento.clientY, window.innerHeight - altura - 8) + 'px';
        menu.onclick = function (clique) {
          const botao = clique.target.closest('[data-item]');
          if (!botao) return;
          fecharMenuPlanilha();
          const escolhido = itens[Number(botao.dataset.item)];
          if (escolhido && escolhido.acao) escolhido.acao();
        };
      }
      function abrirMenuLinha(evento, chave) {
        evento.preventDefault();
        abrirMenuPlanilha(evento, [
          { rotulo:'Inserir linha acima', acao:function () { inserirLinha(chave, 'antes'); } },
          { rotulo:'Inserir linha abaixo', acao:function () { inserirLinha(chave, 'depois'); } },
          { rotulo:'Duplicar esta linha', acao:function () { duplicarLinha(chave); } },
          { separador:true },
          { rotulo:'Excluir esta linha', perigo:true, acao:function () { excluirLinha(chave); } }
        ]);
      }
      function abrirMenuColuna(evento, celula) {
        evento.preventDefault();
        const titulo = celula.querySelector('.titulo-coluna');
        if (!titulo) return;
        const id = titulo.dataset.coluna;
        const extras = compareState.colunasExtras || [];
        const ehLivre = extras.some(function (coluna) { return coluna.id === id; });
        const itens = [
          { rotulo:'Inserir coluna à esquerda', acao:function () { criarColunaLivre(id, 'antes'); } },
          { rotulo:'Inserir coluna à direita', acao:function () { criarColunaLivre(id, 'depois'); } },
          { separador:true },
          { rotulo:'Renomear coluna', acao:function () {
            titulo.focus();
            const faixa = document.createRange();
            faixa.selectNodeContents(titulo);
            const selecao = window.getSelection();
            selecao.removeAllRanges();
            selecao.addRange(faixa);
          } }
        ];
        const definicao = colunasDaTabela().find(function (coluna) { return coluna.id === id; });
        if (definicao && definicao.tipo === 'formula') {
          itens.push({ rotulo:'Editar fórmula da coluna', acao:function () { editarFormulaDeColuna(id); } });
          if (compareState.formulas && compareState.formulas[id]) {
            itens.push({ rotulo:'Restaurar fórmula padrão', acao:function () {
              delete compareState.formulas[id];
              renderCompareTable();
              regravarExecucaoAberta();
              showToast('Fórmula padrão restaurada.');
            } });
          }
        }
        if (ehLivre) itens.push({ rotulo:'Aplicar fórmula a toda a coluna', acao:function () { aplicarFormulaNaColuna(id); } });
        if (ehLivre) itens.push({ rotulo:'Limpar conteúdo da coluna', acao:function () {
          compareState.rows.forEach(function (row) { if (row.extras) delete row.extras[id]; });
          renderCompareTable();
          regravarExecucaoAberta();
        } });
        if (ehLivre) itens.push({ rotulo:'Remover esta coluna', perigo:true, acao:function () {
          compareState.colunasExtras = extras.filter(function (coluna) { return coluna.id !== id; });
          compareState.rows.forEach(function (row) { if (row.extras) delete row.extras[id]; });
          renderCompareTable();
          regravarExecucaoAberta();
        } });
        abrirMenuPlanilha(evento, itens);
      }

      function criarColunaLivre(referencia, posicao) {
        compareState.colunasExtras = compareState.colunasExtras || [];
        const id = 'extra' + (compareState.colunasExtras.length + 1) + '-' + Date.now().toString(36);
        const nova = { id: id, titulo: 'Nova coluna', ancora: referencia || null, lado: posicao || null };
        compareState.colunasExtras.push(nova);
        renderCompareTable();
        addAudit('Coluna criada', 'Coluna livre adicionada à tabela para anotações.', 'Estrutura');
        regravarExecucaoAberta();
        showToast('Coluna criada. Clique no título para renomeá-la.');
        setTimeout(function () {
          const titulo = document.querySelector('.titulo-coluna[data-coluna="' + id + '"]');
          if (titulo) {
            titulo.focus();
            const faixa = document.createRange();
            faixa.selectNodeContents(titulo);
            const selecao = window.getSelection();
            selecao.removeAllRanges();
            selecao.addRange(faixa);
          }
        }, 60);
      }

      function renderCompareResults() {
        if (compareState.reports.budget) renderCompareMeta(compareState.reports.budget, 'budgetMeta');
        if (compareState.reports.collected) renderCompareMeta(compareState.reports.collected, 'collectedMeta');
        renderCompareValidations();
        renderCompareTable();
        renderAudit();
      }

      compareDom.run.addEventListener('click', async function () {
        if (papeisCarregados().length < 2) return;
        compareDom.run.disabled = true;
        compareDom.run.textContent = 'Processando PDFs…';
        compareDom.progress.classList.add('active');
        compareDom.progress.setAttribute('aria-hidden', 'false');
        setCompareAlert('');
        compareState.audit = [];
        compareState.rows = [];
        compareDom.results.hidden = true;
        compareDom.details.hidden = true;
        compareDom.detailsToggle.hidden = true;
        compareDom.detailsToggle.setAttribute('aria-expanded', 'false');
        compareDom.detailsToggle.textContent = 'Detalhes dos relatórios';
        try {
          const papeis = papeisCarregados();
          const lidos = await Promise.all(papeis.map(function (papel) { return extractCompareReport(papel, compareState.files[papel]); }));
          const relatorios = {};
          papeis.forEach(function (papel, indice) { relatorios[papel] = lidos[indice]; });

          // exercício e município precisam bater entre todos os relatórios carregados
          const exercicios = lidos.map(function (r) { return r.exercise; }).filter(function (e) { return e !== 'Não identificado'; });
          if (new Set(exercicios).size > 1) throw new Error('Os relatórios pertencem a exercícios diferentes (' + Array.from(new Set(exercicios)).join(' e ') + ').');
          const municipios = lidos.map(function (r) { return normalizeSearch(r.municipality); }).filter(function (m) { return m !== normalizeSearch('Não identificado'); });
          if (new Set(municipios).size > 1) throw new Error('Os relatórios parecem pertencer a municípios diferentes. Revise os arquivos antes de comparar.');

          compareState.modo = 'comparador';
          compareState.reports = relatorios;
          // planilha nova: não herda colunas nem títulos da execução anterior
          if (!execucaoAberta) {
            compareState.colunasExtras = [];
            compareState.titulos = {};
            compareState.formulas = {};
            compareState.sourceSort = 'asc';
          }
          compareState.rows = mergeCompareReports();
          papeis.forEach(function (papel) {
            const relatorio = relatorios[papel];
            fileState(papel, 'ready', relatorio.fileName, relatorio.sources.size + ' fontes • total ' + formatBrl(relatorio.reportedTotal), 'Validado');
            addAudit('Relatório validado', relatorio.fileName + ' • ' + relatorio.pages + ' páginas • SHA-256 ' + relatorio.hash, ROLE_INFO[papel].nome);
          });
          addAudit('Extração concluída', papeis.map(function (papel) { return relatorios[papel].sources.size + ' fontes em ' + ROLE_INFO[papel].curto.toLowerCase(); }).join(', ') + '. União dinâmica: ' + compareState.rows.length + ' fontes.', 'Comparação');
          addAudit('Conferência dos totais', papeis.map(function (papel) { return ROLE_INFO[papel].curto + ': ' + (relatorios[papel].reconciled ? 'conferido' : 'divergente'); }).join('. ') + '.', 'Validação');
          compareDom.results.hidden = false;
          compareDom.empty.hidden = true;
          compareDom.details.hidden = true;
          compareDom.detailsToggle.hidden = false;
          compareDom.auditPanel.hidden = true;
          compareDom.auditToggle.hidden = false;
          compareDom.auditToggle.setAttribute('aria-expanded', 'false');
          compareDom.auditToggle.textContent = 'Trilha de auditoria';
          compareDom.view.classList.add('results-ready');
          compareDom.view.classList.remove('show-setup');
          compareDom.setup.classList.remove('expanded');
          compareDom.filesLabel.textContent = 'Documentos';
          compareDom.filesCount.textContent = papeis.length + '/3';
          renderCompareResults();
          salvarExecucao();
          closeCompareFilesSheet();
          compareDom.results.scrollIntoView({ behavior:'smooth', block:'start' });
        } catch (error) {
          if (error.compareRole && compareState.files[error.compareRole]) fileState(error.compareRole, 'error', compareState.files[error.compareRole].name, error.message, 'Revisar');
          setCompareAlert(error.message || 'Não foi possível processar os relatórios.');
        } finally {
          compareDom.progress.classList.remove('active');
          compareDom.progress.setAttribute('aria-hidden', 'true');
          compareDom.run.textContent = 'Processar e comparar';
          compareDom.run.disabled = papeisCarregados().length < 2;
        }
      });
      compareDom.search.addEventListener('input', renderCompareTable);
      compareDom.status.addEventListener('change', renderCompareTable);
      const cabecalhoTabela = document.getElementById('compareHead');
      cabecalhoTabela.addEventListener('click', function (evento) {
        if (evento.target.closest('#compareSortSource')) {
          compareState.sourceSort = compareState.sourceSort === 'asc' ? 'desc' : 'asc';
          renderCompareTable();
          return;
        }
        const gatilhoMenu = evento.target.closest('[data-menu-coluna]');
        if (gatilhoMenu) {
          evento.preventDefault();
          evento.stopPropagation();
          abrirMenuColuna(evento, gatilhoMenu.closest('th'));
          return;
        }
      });
      // renomear título: confirma ao sair do campo ou com Enter
      cabecalhoTabela.addEventListener('keydown', function (evento) {
        const titulo = evento.target.closest('.titulo-coluna');
        if (!titulo) return;
        if (evento.key === 'Enter') { evento.preventDefault(); titulo.blur(); }
        if (evento.key === 'Escape') { evento.preventDefault(); renderCompareTable(); }
      });
      cabecalhoTabela.addEventListener('focusout', function (evento) {
        const titulo = evento.target.closest('.titulo-coluna');
        if (!titulo) return;
        const id = titulo.dataset.coluna;
        const novo = titulo.textContent.trim();
        if (!novo) { renderCompareTable(); return; }
        compareState.titulos = compareState.titulos || {};
        const padrao = colunasDaTabela().find(function (coluna) { return coluna.id === id; });
        if (padrao && novo === padrao.titulo) return;
        compareState.titulos[id] = novo;
        const extra = (compareState.colunasExtras || []).find(function (coluna) { return coluna.id === id; });
        if (extra) extra.titulo = novo;
        addAudit('Coluna renomeada', 'Título alterado para “' + novo + '”.', 'Estrutura');
        renderCompareTable();
        regravarExecucaoAberta();
      });
      // aviso ao tentar editar uma coluna calculada
      compareDom.tableBody.addEventListener('click', function (evento) {
        const calculada = evento.target.closest('.coluna-calculada');
        if (!calculada) return;
        showToast(calculada.dataset.calculada + ' é calculada automaticamente (' + calculada.dataset.formula + '). Edite as colunas de origem para alterá-la.');
      });
      // extras livres
      compareDom.tableBody.addEventListener('focusin', function (evento) {
        const campoColuna = evento.target.closest('[data-formula-col]');
        if (campoColuna) campoColuna.value = campoColuna.dataset.bruto;
      });
      compareDom.tableBody.addEventListener('focusout', function (evento) {
        const campoColuna = evento.target.closest('[data-formula-col]');
        if (campoColuna && document.contains(campoColuna) && campoColuna.value === campoColuna.dataset.bruto) renderCompareTable();
      });
      compareDom.tableBody.addEventListener('change', function (evento) {
        const campoColuna = evento.target.closest('[data-formula-col]');
        if (!campoColuna) return;
        const id = campoColuna.dataset.formulaCol;
        const formula = campoColuna.value.trim();
        if (!ehFormula(formula)) { showToast('A fórmula precisa começar com o sinal de igual.'); renderCompareTable(); return; }
        const colunas = colunasDaTabela();
        const teste = avaliarFormula(formula, { colunas: colunas, letras: colunas.map(function (c, i) { return LETRAS_COLUNA[i]; }), linhas: activeCompareRows() }, 1);
        if (teste.erro) { showToast(teste.detalhe); renderCompareTable(); return; }
        compareState.formulas = compareState.formulas || {};
        compareState.formulas[id] = formula;
        renderCompareTable();
        addAudit('Fórmula da coluna alterada', id + ' passou a usar ' + formula + '.', 'Estrutura');
        regravarExecucaoAberta();
        showToast('Fórmula aplicada à coluna inteira.');
      });

      compareDom.tableBody.addEventListener('focusin', function (evento) {
        const campo = evento.target.closest('[data-compare-extra]');
        if (campo && campo.dataset.bruto) campo.value = campo.dataset.bruto;
      });
      // ao sair sem alterar nada, a célula precisa voltar a exibir o resultado
      compareDom.tableBody.addEventListener('focusout', function (evento) {
        const campo = evento.target.closest('[data-compare-extra]');
        if (!campo || !document.contains(campo)) return;
        const row = findCompareRow(campo.dataset.rowKey);
        if (!row) return;
        const bruto = (row.extras && row.extras[campo.dataset.compareExtra]) || '';
        if (campo.value === bruto && ehFormula(bruto)) renderCompareTable();
      });
      compareDom.tableBody.addEventListener('change', function (evento) {
        const campo = evento.target.closest('[data-compare-extra]');
        if (!campo) return;
        const row = findCompareRow(campo.dataset.rowKey);
        if (!row) return;
        row.extras = row.extras || {};
        row.extras[campo.dataset.compareExtra] = campo.value;
        persistWfaLater();
        regravarExecucaoAberta();
        renderCompareTable();
      });

      compareDom.tableBody.addEventListener('contextmenu', function (evento) {
        const numero = evento.target.closest('[data-menu-linha]');
        if (numero) abrirMenuLinha(evento, numero.dataset.menuLinha);
      });
      compareDom.tableBody.addEventListener('click', function (evento) {
        const gatilho = evento.target.closest('[data-abrir-menu-linha]');
        if (!gatilho) return;
        evento.preventDefault();
        evento.stopPropagation();
        abrirMenuLinha(evento, gatilho.dataset.abrirMenuLinha);
      });
      document.getElementById('compareHead').addEventListener('contextmenu', function (evento) {
        const celula = evento.target.closest('th');
        if (celula && celula.querySelector('.titulo-coluna')) abrirMenuColuna(evento, celula);
      });
      document.addEventListener('mousedown', function (evento) {
        if (!evento.target.closest('#sheetMenu')) fecharMenuPlanilha();
      });
      document.addEventListener('keydown', function (evento) { if (evento.key === 'Escape') fecharMenuPlanilha(); });
      window.addEventListener('scroll', fecharMenuPlanilha, { passive:true });

      function formulaDaColuna(coluna) {
        return (compareState.formulas && compareState.formulas[coluna.id]) || coluna.padrao;
      }
      function editarFormulaDeColuna(id) {
        const coluna = colunasDaTabela().find(function (item) { return item.id === id; });
        if (!coluna) return;
        colunaDaFormula = id;
        const entrada = document.getElementById('campoFormulaEntrada');
        entrada.value = formulaDaColuna(coluna);
        document.getElementById('campoFormulaTitulo').textContent = 'Fórmula de “' + coluna.titulo + '”';
        document.getElementById('campoFormulaErro').hidden = true;
        document.getElementById('campoFormula').hidden = false;
        setTimeout(function () { entrada.focus(); entrada.select(); }, 20);
      }

      // ---------- guia de fórmulas ----------
      const GUIA_FORMULAS = [
        { grupo:'Referências', itens:[
          ['<code>C2</code>', 'valor da coluna C na linha 2'],
          ['<code>C</code>', 'dentro de uma função, a coluna C inteira; numa fórmula de coluna, a mesma linha'],
          ['<code>C2:C9</code>', 'intervalo da linha 2 à 9 na coluna C']
        ]},
        { grupo:'Contas', itens:[
          ['<code>=C2-D2</code>', 'subtração entre duas células'],
          ['<code>=C2/D2*100</code>', 'as quatro operações, com parênteses'],
          ['<code>=C2*0,1</code>', 'a vírgula é decimal; o ponto e vírgula separa argumentos']
        ]},
        { grupo:'Funções', itens:[
          ['<code>=SOMA(C2:C9)</code>', 'soma um intervalo'],
          ['<code>=SOMA(C1;D1)</code>', 'soma valores separados por ponto e vírgula'],
          ['<code>=SOMA(C)</code>', 'soma a coluna inteira'],
          ['<code>=MEDIA(D2:D9)</code>', 'média dos valores'],
          ['<code>=MIN(C)</code> · <code>=MAX(C)</code>', 'menor e maior valor'],
          ['<code>=CONT(C2:C9)</code>', 'quantidade de valores'],
          ['<code>=ABS(E2)</code>', 'valor absoluto, sem o sinal'],
          ['<code>=ARRED(C2/D2;2)</code>', 'arredonda com o número de casas indicado'],
          ['<code>=SE(C2-D2;1;0)</code>', 'se o primeiro for diferente de zero, devolve o segundo; senão o terceiro']
        ]},
        { grupo:'Aninhadas', itens:[
          ['<code>=ABS(SOMA(C1;-D1))</code>', 'funções podem conter outras funções'],
          ['<code>=ARRED(MEDIA(C;D);0)</code>', 'sem limite de profundidade']
        ]},
        { grupo:'Preencher', itens:[
          ['apontar com o mouse', 'com a fórmula aberta, clicar ou arrastar em outras células escreve a referência dentro dela'],
          ['arrastar a alça', 'o quadrado verde no canto da célula copia a fórmula para baixo, ajustando as linhas'],
          ['<code>Ctrl</code> + <code>D</code>', 'repete a célula de cima na célula atual']
        ]},
        { grupo:'Encadeadas', itens:[
          ['<code>=C1+D1</code> e depois <code>=SOMA(C1:C8)</code>', 'uma fórmula pode somar células que também são fórmulas'],
          ['<code>=SOMA(C1:C8)</code> dentro da coluna C', 'referência circular: use um intervalo que não inclua a própria célula']
        ]},
        { grupo:'Seleção', itens:[
          ['arrastar pela tabela', 'marca um bloco de células; o rodapé mostra quantas são e a soma delas'],
          ['<code>Shift</code> + clique ou setas', 'estica a marcação até onde você indicar'],
          ['<code>Delete</code>', 'limpa tudo o que está marcado'],
          ['<code>Ctrl</code> + <code>C</code>', 'copia o bloco no formato que o Excel cola']
        ]},
        { grupo:'Medidas', itens:[
          ['divisa na linha das letras', 'arraste para mudar a largura da coluna'],
          ['divisa abaixo do número', 'arraste para mudar a altura da linha']
        ]},
        { grupo:'Erros', itens:[
          ['<code>#NOME?</code>', 'a função não existe — passe o mouse para ver as disponíveis'],
          ['<code>#REF</code>', 'a letra não corresponde a nenhuma coluna da planilha'],
          ['<code>#CIRC</code>', 'a fórmula depende dela mesma, direta ou indiretamente'],
          ['<code>#ERRO</code>', 'parênteses, referência ou separador incorretos']
        ]}
      ];
      function abrirGuiaFormulas() {
        const corpo = document.getElementById('guiaCorpo');
        corpo.innerHTML = '<p>Comece a célula com <code>=</code>. As letras seguem o cabeçalho da tabela e os números seguem a linha exibida.</p>' +
          GUIA_FORMULAS.map(function (secao) {
            return '<p class="guia-secao">' + secao.grupo + '</p><table class="guia-tabela"><tbody>' +
              secao.itens.map(function (item) { return '<tr><td>' + item[0] + '</td><td>' + escapeHtml(item[1]) + '</td></tr>'; }).join('') +
              '</tbody></table>';
          }).join('');
        document.getElementById('guiaFormulas').hidden = false;
      }

      // ---------- fórmula aplicada a toda a coluna ----------
      let colunaDaFormula = null;
      function aplicarFormulaNaColuna(id) {
        colunaDaFormula = id;
        const entrada = document.getElementById('campoFormulaEntrada');
        const primeira = compareState.rows.find(function (row) { return !row.deleted && row.extras && ehFormula(row.extras[id]); });
        entrada.value = primeira ? primeira.extras[id] : '=C-D';
        document.getElementById('campoFormulaErro').hidden = true;
        document.getElementById('campoFormula').hidden = false;
        setTimeout(function () { entrada.focus(); entrada.select(); }, 20);
      }
      function confirmarFormulaDaColuna() {
        const entrada = document.getElementById('campoFormulaEntrada');
        const aviso = document.getElementById('campoFormulaErro');
        const formula = entrada.value.trim();
        if (!ehFormula(formula)) {
          aviso.textContent = 'A fórmula precisa começar com o sinal de igual.';
          aviso.hidden = false;
          return;
        }
        // valida na primeira linha antes de espalhar
        const colunas = colunasDaTabela();
        const linhas = activeCompareRows();
        const teste = avaliarFormula(formula, { colunas: colunas, letras: colunas.map(function (c, i) { return LETRAS_COLUNA[i]; }), linhas: linhas }, 1);
        if (teste.erro) {
          aviso.textContent = teste.detalhe;
          aviso.hidden = false;
          return;
        }
        const definicao = colunasDaTabela().find(function (coluna) { return coluna.id === colunaDaFormula; });
        if (definicao && definicao.tipo === 'formula') {
          compareState.formulas = compareState.formulas || {};
          compareState.formulas[colunaDaFormula] = formula;
        } else {
          compareState.rows.forEach(function (row) {
            if (row.deleted) return;
            row.extras = row.extras || {};
            row.extras[colunaDaFormula] = formula;
          });
        }
        document.getElementById('campoFormula').hidden = true;
        renderCompareTable();
        addAudit('Fórmula aplicada à coluna', formula + ' — vale para todas as linhas.', 'Estrutura');
        regravarExecucaoAberta();
        showToast('Fórmula aplicada a ' + activeCompareRows().length + ' linhas.');
      }

      document.getElementById('guiaFechar').addEventListener('click', function () { document.getElementById('guiaFormulas').hidden = true; });
      document.getElementById('guiaFormulas').addEventListener('mousedown', function (evento) { if (evento.target === this) this.hidden = true; });
      document.getElementById('campoFormulaFechar').addEventListener('click', function () { document.getElementById('campoFormula').hidden = true; });
      document.getElementById('campoFormulaCancelar').addEventListener('click', function () { document.getElementById('campoFormula').hidden = true; });
      document.getElementById('campoFormulaAplicar').addEventListener('click', confirmarFormulaDaColuna);
      document.getElementById('campoFormulaEntrada').addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter') { evento.preventDefault(); confirmarFormulaDaColuna(); }
        if (evento.key === 'Escape') { evento.preventDefault(); document.getElementById('campoFormula').hidden = true; }
      });
      document.addEventListener('keydown', function (evento) {
        if (evento.key !== 'Escape') return;
        const guia = document.getElementById('guiaFormulas');
        if (guia && !guia.hidden) guia.hidden = true;
      });

      /* ============ Preenchimento arrastando para baixo ============
         Como no Excel: as referências com número de linha acompanham o
         deslocamento; as sem número já são relativas e ficam como estão. */
      function deslocarReferencias(formula, deslocamento) {
        return formula.replace(/([A-Z])(\d+)/g, function (todo, letra, numero) {
          const destino = Number(numero) + deslocamento;
          return destino >= 1 ? letra + destino : todo;
        });
      }

      (function () {
        const alca = document.getElementById('alcaPreenchimento');
        if (!alca) return;
        let origem = null;      // { chave, coluna, formula, indice }
        let arrastando = false;
        let ultimoAlvo = -1;

        function celulaDaAlca() {
          const ativo = document.activeElement;
          if (!ativo || !ativo.dataset || !ativo.dataset.compareExtra) return null;
          return ativo.closest('td');
        }
        function posicionar() {
          const celula = celulaDaAlca();
          if (!celula || arrastando) { if (!arrastando) alca.hidden = true; return; }
          const caixa = celula.getBoundingClientRect();
          const area = document.querySelector('.compare-table-wrap').getBoundingClientRect();
          if (caixa.bottom < area.top || caixa.top > area.bottom) { alca.hidden = true; return; }
          alca.style.left = (caixa.right - 5) + 'px';
          alca.style.top = (caixa.bottom - 5) + 'px';
          alca.hidden = false;
        }
        compareDom.tableBody.addEventListener('focusin', function () { setTimeout(posicionar, 0); });
        compareDom.tableBody.addEventListener('focusout', function () { setTimeout(function () { if (!arrastando) posicionar(); }, 0); });
        window.addEventListener('scroll', function () { if (!arrastando) alca.hidden = true; }, { passive:true });
        const area = document.querySelector('.compare-table-wrap');
        if (area) area.addEventListener('scroll', function () { if (!arrastando) alca.hidden = true; }, { passive:true });

        function limparRealce() {
          compareDom.tableBody.querySelectorAll('td.alvo-preenchimento').forEach(function (td) { td.classList.remove('alvo-preenchimento'); });
        }

        alca.addEventListener('mousedown', function (evento) {
          const celula = celulaDaAlca();
          if (!celula) return;
          evento.preventDefault();
          const campo = celula.querySelector('[data-compare-extra]');
          const linha = celula.parentElement;
          origem = {
            chave: campo.dataset.rowKey,
            coluna: campo.dataset.compareExtra,
            indice: Array.prototype.indexOf.call(compareDom.tableBody.rows, linha)
          };
          const row = findCompareRow(origem.chave);
          origem.conteudo = (row && row.extras && row.extras[origem.coluna]) || '';
          arrastando = true;
          ultimoAlvo = origem.indice;
        });

        document.addEventListener('mousemove', function (evento) {
          if (!arrastando) return;
          const alvo = document.elementFromPoint(evento.clientX, evento.clientY);
          const linha = alvo && alvo.closest ? alvo.closest('#compareTableBody tr') : null;
          if (!linha) return;
          const indice = Array.prototype.indexOf.call(compareDom.tableBody.rows, linha);
          if (indice === ultimoAlvo) return;
          ultimoAlvo = indice;
          limparRealce();
          const inicio = Math.min(origem.indice, indice);
          const fim = Math.max(origem.indice, indice);
          for (let n = inicio; n <= fim; n += 1) {
            const celula = compareDom.tableBody.rows[n].querySelector('[data-compare-extra="' + origem.coluna + '"]');
            if (celula) celula.closest('td').classList.add('alvo-preenchimento');
          }
        });

        document.addEventListener('mouseup', function () {
          if (!arrastando) return;
          arrastando = false;
          limparRealce();
          alca.hidden = true;
          if (ultimoAlvo === origem.indice) return;
          const inicio = Math.min(origem.indice, ultimoAlvo);
          const fim = Math.max(origem.indice, ultimoAlvo);
          let preenchidas = 0;
          for (let n = inicio; n <= fim; n += 1) {
            if (n === origem.indice) continue;
            const celula = compareDom.tableBody.rows[n].querySelector('[data-compare-extra="' + origem.coluna + '"]');
            if (!celula) continue;
            const row = findCompareRow(celula.dataset.rowKey);
            if (!row) continue;
            row.extras = row.extras || {};
            row.extras[origem.coluna] = ehFormula(origem.conteudo)
              ? deslocarReferencias(origem.conteudo, n - origem.indice)
              : origem.conteudo;
            preenchidas += 1;
          }
          renderCompareTable();
          regravarExecucaoAberta();
          showToast(preenchidas + (preenchidas === 1 ? ' célula preenchida.' : ' células preenchidas.'));
        });

        // Ctrl+D repete a célula de cima, como no Excel
        document.addEventListener('keydown', function (evento) {
          if (!evento.ctrlKey || evento.key.toLowerCase() !== 'd') return;
          const ativo = document.activeElement;
          if (!ativo || !ativo.dataset || !ativo.dataset.compareExtra) return;
          evento.preventDefault();
          const linha = ativo.closest('tr');
          const indice = Array.prototype.indexOf.call(compareDom.tableBody.rows, linha);
          if (indice < 1) return;
          const acima = compareDom.tableBody.rows[indice - 1].querySelector('[data-compare-extra="' + ativo.dataset.compareExtra + '"]');
          if (!acima) return;
          const rowAcima = findCompareRow(acima.dataset.rowKey);
          const rowAtual = findCompareRow(ativo.dataset.rowKey);
          if (!rowAcima || !rowAtual) return;
          const conteudo = (rowAcima.extras && rowAcima.extras[ativo.dataset.compareExtra]) || '';
          rowAtual.extras = rowAtual.extras || {};
          rowAtual.extras[ativo.dataset.compareExtra] = ehFormula(conteudo) ? deslocarReferencias(conteudo, 1) : conteudo;
          renderCompareTable();
          regravarExecucaoAberta();
          showToast('Célula preenchida a partir da linha de cima.');
        });
      }());

      function findCompareRow(key) { return compareState.rows.find(function (row) { return row.key === key && !row.deleted; }); }
      function commitCompareCell(input) {
        const row = findCompareRow(input.dataset.rowKey);
        const field = input.dataset.compareCell;
        if (!row || !field) return;
        const typedValue = input.value.trim();
        let before = '';
        let after = '';
        let fieldLabel = '';
        if (field === 'code') {
          const normalized = normalizeSourceCode(typedValue);
          const duplicate = normalized && compareState.rows.find(function (item) { return !item.deleted && item !== row && item.key === normalized; });
          if (!normalized || duplicate) {
            showToast(duplicate ? 'Esta fonte já existe na comparação.' : 'Use o padrão 01 0500 0000 0000.');
            renderCompareTable();
            return;
          }
          if (normalized === row.key) return;
          before = row.key;
          row.key = normalized;
          after = normalized;
          fieldLabel = 'Fonte de recurso';
        } else if (field === 'description') {
          if (!typedValue) { showToast('A descrição não pode ficar vazia.'); renderCompareTable(); return; }
          if (typedValue === row.description) return;
          before = row.description;
          row.description = typedValue;
          after = typedValue;
          fieldLabel = 'Descrição';
        } else if (field === 'budget' || field === 'collected') {
          const parsed = parseBrl(typedValue);
          if (!Number.isFinite(parsed)) { showToast('Informe um valor válido, como 1.234,56.'); renderCompareTable(); return; }
          if (Math.abs(parsed - row[field]) < .005) return;
          before = formatBrl(row[field]);
          row[field] = parsed;
          if (COMPARE_ROLES.indexOf(field) !== -1) row['tem_' + field] = true;
          after = formatBrl(parsed);
          fieldLabel = field === 'budget' ? 'Valor orçado' : 'Valor arrecadado';
        } else return;
        row.edited = true;
        addAudit('Célula alterada na tabela', fieldLabel + ': de “' + before + '” para “' + after + '”.', row.key);
        renderCompareTable();
      }
      compareDom.tableBody.addEventListener('focusin', function (event) {
        const input = event.target.closest('[data-compare-cell]');
        if (input) input.dataset.initialValue = input.value;
      });
      compareDom.tableBody.addEventListener('keydown', function (event) {
        const input = event.target.closest('[data-compare-cell]');
        if (!input) return;
        if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
        if (event.key === 'Escape') {
          event.preventDefault();
          input.value = input.dataset.initialValue || input.defaultValue;
          input.dataset.cancelEdit = 'true';
          input.blur();
        }
      });
      compareDom.tableBody.addEventListener('focusout', function (event) {
        const input = event.target.closest('[data-compare-cell]');
        if (!input) return;
        if (input.dataset.cancelEdit === 'true') { delete input.dataset.cancelEdit; return; }
        if (input.value !== input.dataset.initialValue) commitCompareCell(input);
      });
      function openCompareEditor(mode, row) {
        compareState.editorMode = mode;
        compareState.editorKey = row ? row.key : null;
        const removeMode = mode === 'remove';
        document.getElementById('compareEditorTitle').textContent = mode === 'add' ? 'Adicionar fonte' : removeMode ? 'Remover fonte' : 'Corrigir fonte';
        document.getElementById('compareEditorSubtitle').textContent = removeMode ? 'A fonte será retirada da comparação, mas continuará registrada na trilha de auditoria.' : 'Toda alteração exige uma justificativa e ficará registrada.';
        document.getElementById('compareEditCode').value = row ? row.key : '';
        document.getElementById('compareEditDescription').value = row ? row.description : '';
        document.getElementById('compareEditBudget').value = row ? formatBrl(row.budget).replace(/[^\d.,-]/g,'') : '0,00';
        document.getElementById('compareEditCollected').value = row ? formatBrl(row.collected).replace(/[^\d.,-]/g,'') : '0,00';
        document.getElementById('compareEditReason').value = '';
        ['compareEditCode','compareEditDescription','compareEditBudget','compareEditCollected'].forEach(function (id) { document.getElementById(id).readOnly = removeMode; });
        const save = document.getElementById('compareEditorSave');
        save.textContent = removeMode ? 'Confirmar remoção' : mode === 'add' ? 'Adicionar e registrar' : 'Registrar alteração';
        save.classList.toggle('danger', removeMode);
        save.classList.toggle('primary', !removeMode);
        compareDom.editor.classList.add('open');
        document.getElementById(removeMode ? 'compareEditReason' : 'compareEditCode').focus();
      }
      function closeCompareEditor() { compareDom.editor.classList.remove('open'); compareDom.editorForm.reset(); compareState.editorMode = null; compareState.editorKey = null; }
      document.getElementById('compareAddRow').addEventListener('click', function () { inserirLinha(null, 'depois'); });
      document.getElementById('compareEditorClose').addEventListener('click', closeCompareEditor);
      document.getElementById('compareEditorCancel').addEventListener('click', closeCompareEditor);
      compareDom.editor.addEventListener('mousedown', function (event) { if (event.target === compareDom.editor) closeCompareEditor(); });
      compareDom.tableBody.addEventListener('click', function (event) {
        const edit = event.target.closest('[data-compare-edit]');
        const remove = event.target.closest('[data-compare-remove]');
        if (edit) openCompareEditor('edit', findCompareRow(edit.dataset.compareEdit));
        if (remove) excluirLinha(remove.dataset.compareRemove);
      });
      compareDom.editorForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const reason = document.getElementById('compareEditReason').value.trim();
        const mode = compareState.editorMode;
        const current = compareState.editorKey ? findCompareRow(compareState.editorKey) : null;
        if (mode === 'remove') {
          current.deleted = true;
          current.edited = true;
          addAudit('Fonte removida da comparação', current.key + ' • ' + current.description + ' • Motivo: ' + reason, current.key);
          closeCompareEditor();
          renderCompareTable();
          return;
        }
        const codeInput = document.getElementById('compareEditCode');
        const code = normalizeSourceCode(codeInput.value);
        if (!code) { codeInput.setCustomValidity('Informe quatro blocos: 01 0500 0000 0000.'); codeInput.reportValidity(); return; }
        codeInput.setCustomValidity('');
        const duplicate = compareState.rows.find(function (row) { return !row.deleted && row.key === code && row !== current; });
        if (duplicate) { codeInput.setCustomValidity('Esta fonte já existe na comparação.'); codeInput.reportValidity(); return; }
        const budget = parseBrl(document.getElementById('compareEditBudget').value);
        const collected = parseBrl(document.getElementById('compareEditCollected').value);
        if (!Number.isFinite(budget) || !Number.isFinite(collected)) { showToast('Informe valores válidos no padrão 1.234,56.'); return; }
        const next = { key:code, description:document.getElementById('compareEditDescription').value.trim(), budget:budget, collected:collected };
        if (mode === 'add') {
          compareState.rows.push({ key:next.key, description:next.description, budget:next.budget, committed:0, collected:next.collected, original_budget:null, original_committed:null, original_collected:null, tem_budget:true, tem_committed:false, tem_collected:true, co:[], edited:true, manual:true, deleted:false });
          addAudit('Fonte adicionada manualmente', next.key + ' • ' + next.description + ' • Orçado ' + formatBrl(next.budget) + ' • Arrecadado ' + formatBrl(next.collected) + ' • Motivo: ' + reason, next.key);
        } else {
          const before = current.key + ' • ' + current.description + ' • Orçado ' + formatBrl(current.budget) + ' • Arrecadado ' + formatBrl(current.collected);
          current.key = next.key; current.description = next.description; current.budget = next.budget; current.collected = next.collected; current.edited = true;
          addAudit('Fonte corrigida', 'Antes: ' + before + '. Depois: ' + next.key + ' • ' + next.description + ' • Orçado ' + formatBrl(next.budget) + ' • Arrecadado ' + formatBrl(next.collected) + ' • Motivo: ' + reason, next.key);
        }
        closeCompareEditor();
        renderCompareTable();
      });

      function exportFileStem() {
        const base = compareState.reports[papeisComRelatorio()[0]] || null;
        const municipality = base ? base.municipality : 'municipio';
        const exercise = base ? base.exercise : '';
        return ('comparacao-fontes-' + municipality + '-' + exercise).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
      }
      document.getElementById('compareExportXlsx').addEventListener('click', async function () {
        try {
          await loadExternalScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', function () { return Boolean(window.XLSX); });
          addAudit('Exportação gerada', 'Planilha Excel com comparação, metadados e trilha de auditoria.', 'Excel');
          const rows = activeCompareRows();
          const papeisAtivos = papeisComRelatorio();
          const comparison = rows.map(function (row) {
            const status = compareStatus(row);
            const linha = { 'Fonte de Recurso':row.key, 'Descrição':row.description, 'CO arrecadado':row.co.join(', ') };
            papeisAtivos.forEach(function (papel) { linha['Valor ' + ROLE_INFO[papel].curto] = row[papel]; });
            if (row.tem_budget) {
              linha['Diferença (' + descricaoDoPar() + ')'] = diferencaDaLinha(row);
              const execucao = execucaoDaLinha(row);
              linha['Execução (%)'] = Number.isFinite(execucao) ? execucao : null;
            }
            linha['Situação'] = status.label;
            linha['Alteração manual'] = row.edited || row.manual ? 'Sim' : 'Não';
            return linha;
          });
          const campos = [
            ['Arquivo', 'fileName'], ['Município', 'municipality'], ['Exercício', 'exercise'],
            ['Páginas do quadro', 'sectionPages'], ['Total informado', 'reportedTotal'], ['Total extraído', 'extractedTotal'], ['SHA-256', 'hash']
          ];
          const metadata = [['Campo'].concat(papeisAtivos.map(function (papel) { return ROLE_INFO[papel].nome; }))].concat(
            campos.map(function (campo) {
              return [campo[0]].concat(papeisAtivos.map(function (papel) { return compareState.reports[papel][campo[1]]; }));
            })
          );
          const audit = compareState.audit.map(function (item) { return { 'Data e hora':new Date(item.at).toLocaleString('pt-BR'), 'Usuário':item.user, 'Ação':item.action, 'Fonte/Etapa':item.source, 'Detalhes':item.detail }; });
          const workbook = window.XLSX.utils.book_new();
          const compareSheet = window.XLSX.utils.json_to_sheet(comparison);
          compareSheet['!cols'] = [{wch:20},{wch:62},{wch:18}].concat(papeisAtivos.map(function () { return {wch:18}; })).concat([{wch:24},{wch:14},{wch:26},{wch:18}]);
          window.XLSX.utils.book_append_sheet(workbook, compareSheet, 'Comparação');
          window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(metadata), 'Metadados');
          window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.json_to_sheet(audit), 'Auditoria');
          window.XLSX.writeFile(workbook, exportFileStem() + '.xlsx');
          renderAudit();
        } catch (error) { addAudit('Falha na exportação', error.message || 'Não foi possível exportar a planilha.', 'Excel'); showToast(error.message || 'Não foi possível exportar a planilha.'); }
      });
      document.getElementById('compareExportPdf').addEventListener('click', async function () {
        try {
          await loadExternalScript('https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js', function () { return Boolean(window.jspdf && window.jspdf.jsPDF); });
          addAudit('Exportação gerada', 'Relatório PDF com comparação e trilha de auditoria.', 'PDF');
          const jsPDF = window.jspdf.jsPDF;
          const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
          const rows = activeCompareRows();
          const margin = 12;
          const pageWidth = 297;
          const pageHeight = 210;
          const papeisAtivos = papeisComRelatorio();
          const colunasValor = papeisAtivos.map(function () { return 31; });
          const largurasBase = 34 + 72 + 21 + 34;
          const sobra = 273 - largurasBase - colunasValor.reduce(function (a, b) { return a + b; }, 0) - 31;
          const columns = [34, 72 + Math.max(0, sobra)].concat(colunasValor).concat([31, 21, 34]);
          const rotulosValor = papeisAtivos.map(function (papel) { return ROLE_INFO[papel].curto; });
          const indiceUltimoNumero = 1 + colunasValor.length + 2;
          const starts = columns.reduce(function (result, width, index) { result.push(index ? result[index - 1] + columns[index - 1] : margin); return result; }, []);
          function pdfHeader() {
            doc.setFillColor(6,28,42); doc.rect(0,0,pageWidth,22,'F');
            doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text('WFA Gestão Pública',margin,9);
            doc.setFontSize(11); doc.text('Comparação de receitas por fonte de recurso',margin,16);
            doc.setTextColor(40,52,60); doc.setFont('helvetica','normal'); doc.setFontSize(8);
            const refPdf = compareState.reports[papeisComRelatorio()[0]];
            doc.text(refPdf.municipality + ' • Exercício ' + refPdf.exercise + ' • Gerado em ' + new Date().toLocaleString('pt-BR'),margin,20);
          }
          function tableHeader(y) {
            doc.setFillColor(237,241,242); doc.rect(margin,y - 4,273,8,'F');
            doc.setTextColor(31,48,58); doc.setFont('helvetica','bold'); doc.setFontSize(7);
            ['Fonte','Descrição'].concat(rotulosValor).concat(['Diferença','Execução','Situação']).forEach(function (label,index) {
              const numerica = index >= 2 && index <= indiceUltimoNumero;
              doc.text(label, starts[index] + (numerica ? columns[index] - 2 : 1), y, { align:numerica ? 'right' : 'left' });
            });
          }
          pdfHeader();
          let y = 38;
          tableHeader(y);
          y += 7;
          rows.forEach(function (row) {
            const status = compareStatus(row);
            const description = doc.splitTextToSize(row.description, columns[1] - 3).slice(0,3);
            const height = Math.max(7, description.length * 4);
            if (y + height > pageHeight - 12) { doc.addPage(); pdfHeader(); y = 38; tableHeader(y); y += 7; }
            doc.setDrawColor(225,230,232); doc.line(margin,y + height - 2,pageWidth - margin,y + height - 2);
            doc.setTextColor(54,68,76); doc.setFont('helvetica','normal'); doc.setFontSize(7);
            doc.text(row.key, starts[0] + 1, y);
            doc.text(description, starts[1] + 1, y);
            const values = papeisAtivos.map(function (papel) { return formatBrl(row[papel]); })
              .concat([formatBrl(diferencaDaLinha(row)), formatPercent(execucaoDaLinha(row))]);
            values.forEach(function (value,index) { const columnIndex = index + 2; doc.text(value, starts[columnIndex] + columns[columnIndex] - 2, y, { align:'right' }); });
            doc.text(status.label, starts[columns.length - 1] + 1, y);
            y += height;
          });
          const totalBudget = rows.reduce(function (sum,row) { return sum + row.budget; }, 0);
          const totalCollected = rows.reduce(function (sum,row) { return sum + row.collected; }, 0);
          if (y > pageHeight - 25) { doc.addPage(); pdfHeader(); y = 38; }
          doc.setFillColor(237,241,242); doc.rect(margin,y - 3,273,10,'F'); doc.setFont('helvetica','bold'); doc.setTextColor(20,39,51); doc.setFontSize(8);
          doc.text('TOTAL',starts[0] + 1,y + 2);
          const totaisLinha = papeisAtivos.map(function (papel) { return formatBrl(rows.reduce(function (sum,row) { return sum + row[papel]; }, 0)); })
            .concat([formatBrl(totalCollected - totalBudget), formatPercent(totalBudget ? (totalCollected / totalBudget) * 100 : NaN)]);
          totaisLinha.forEach(function (valor,index) { const columnIndex = index + 2; doc.text(valor, starts[columnIndex] + columns[columnIndex] - 2, y + 2, { align:'right' }); });
          doc.addPage(); pdfHeader(); doc.setTextColor(20,39,51); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('Trilha de auditoria',margin,39); y = 47;
          compareState.audit.forEach(function (item) {
            const text = new Date(item.at).toLocaleString('pt-BR') + ' • ' + item.user + ' • ' + item.action + (item.source ? ' • ' + item.source : '') + '\n' + item.detail;
            const lines = doc.splitTextToSize(text,270);
            const height = lines.length * 4 + 4;
            if (y + height > pageHeight - 12) { doc.addPage(); pdfHeader(); y = 38; }
            doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(63,77,85); doc.text(lines,margin,y); doc.setDrawColor(228,232,234); doc.line(margin,y + height - 2,pageWidth - margin,y + height - 2); y += height;
          });
          const totalPages = doc.getNumberOfPages();
          for (let page = 1; page <= totalPages; page += 1) { doc.setPage(page); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(120,130,136); doc.text('Página ' + page + ' de ' + totalPages,pageWidth - margin,pageHeight - 5,{align:'right'}); }
          const refProp = compareState.reports[papeisComRelatorio()[0]];
          doc.setProperties({ title:'Comparação por fonte de recurso', subject:refProp.municipality + ' - ' + refProp.exercise, author:'WFA Gestão Pública' });
          doc.save(exportFileStem() + '.pdf');
          renderAudit();
        } catch (error) { addAudit('Falha na exportação', error.message || 'Não foi possível exportar o PDF.', 'PDF'); showToast(error.message || 'Não foi possível exportar o PDF.'); }
      });

      /* ============ Persistencia local do sistema (localForage / IndexedDB) ============
         Guarda no proprio navegador: os PDFs carregados (conteudo real, nao o caminho do
         disco), a tabela do comparador com as edicoes, a trilha de auditoria, os filtros
         e a ultima tela aberta. Nada disso sai do computador do usuario.               */
      var WFA_DB_NAME = 'wfa-gestao-publica';
      var WFA_STATE_VERSION = 1;
      var wfaStorePromise = null;
      var wfaReady = false;
      var wfaSaveTimer = null;
      var wfaPersistDisabled = false;
      var wfaCurrentView = 'workspace';
      var wfaSavedView = null;

      function getWfaStores() {
        if (wfaPersistDisabled) return Promise.reject(new Error('Armazenamento indisponível.'));
        if (!wfaStorePromise) {
          wfaStorePromise = loadExternalScript('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js', function () { return Boolean(window.localforage); })
            .then(function () {
              return window.localforage.setDriver(window.localforage.INDEXEDDB).then(function () {
                return {
                  files: window.localforage.createInstance({ name:WFA_DB_NAME, storeName:'arquivos' }),
                  state: window.localforage.createInstance({ name:WFA_DB_NAME, storeName:'estado' })
                };
              });
            })
            .catch(function (error) { wfaPersistDisabled = true; throw error; });
        }
        return wfaStorePromise;
      }

      function workspaceFileMeta(item) {
        return { id:item.id, role:item.role, status:item.status, addedAt:item.addedAt.getTime(), name:item.file.name, size:item.file.size, type:item.file.type, lastModified:item.file.lastModified };
      }
      function workspaceIdForFile(file) {
        if (!file) return null;
        const found = workspaceState.files.find(function (item) { return item.file === file; });
        return found ? found.id : null;
      }

      async function storeWorkspaceBlob(item) {
        try {
          const stores = await getWfaStores();
          if (await stores.files.getItem(item.id)) return;
          const buffer = await item.file.arrayBuffer();
          await stores.files.setItem(item.id, new Blob([buffer], { type:item.file.type || 'application/pdf' }));
          updateStorageSummary();
        } catch (error) {
          if (error && (error.name === 'QuotaExceededError' || /quota/i.test(error.message || ''))) showToast('Espaço do navegador esgotado: este arquivo não ficará salvo após recarregar.');
        }
      }
      async function dropWorkspaceBlob(id) {
        try { const stores = await getWfaStores(); await stores.files.removeItem(id); updateStorageSummary(); } catch (error) { /* nada a fazer */ }
      }

      async function persistWfaNow() {
        if (!wfaReady || wfaPersistDisabled) return;
        try {
          const stores = await getWfaStores();
          await stores.state.setItem('workspace', {
            v: WFA_STATE_VERSION,
            files: workspaceState.files.map(workspaceFileMeta),
            selected: Array.from(workspaceState.selected),
            nextId: workspaceState.nextId,
            search: workspaceDom.search.value,
            filter: workspaceDom.filter.value
          });
          await stores.state.setItem('compare', {
            v: WFA_STATE_VERSION,
            budgetId: workspaceIdForFile(compareState.files.budget),
            committedId: workspaceIdForFile(compareState.files.committed),
            collectedId: workspaceIdForFile(compareState.files.collected),
            reports: compareState.reports,
            rows: compareState.rows,
            audit: compareState.audit,
            modo: compareState.modo,
            sourceSort: compareState.sourceSort,
            colunasExtras: compareState.colunasExtras,
            larguras: compareState.larguras,
            alturas: compareState.alturas,
            titulos: compareState.titulos,
            formulas: compareState.formulas,
            execucaoAberta: typeof execucaoAberta === 'string' ? execucaoAberta : null,
            hasResults: compareDom.results.hidden === false,
            search: compareDom.search.value,
            status: compareDom.status.value
          });
          await stores.state.setItem('ui', { v: WFA_STATE_VERSION, view: wfaCurrentView, savedAt: Date.now() });
        } catch (error) { /* modo privativo, cota cheia ou navegador sem IndexedDB */ }
      }
      function persistWfaLater() {
        if (!wfaReady || wfaPersistDisabled) return;
        clearTimeout(wfaSaveTimer);
        wfaSaveTimer = setTimeout(persistWfaNow, 500);
      }

      async function restoreWfaState() {
        let stores;
        try { stores = await getWfaStores(); }
        catch (error) { wfaReady = true; updateStorageSummary(); return; }
        try {
          const savedWorkspace = await stores.state.getItem('workspace');
          const savedCompare = await stores.state.getItem('compare');
          const savedUi = await stores.state.getItem('ui');

          if (savedWorkspace && Array.isArray(savedWorkspace.files)) {
            const restored = [];
            for (const meta of savedWorkspace.files) {
              const blob = await stores.files.getItem(meta.id);
              if (!blob) continue;
              const file = new File([blob], meta.name, { type:meta.type || 'application/pdf', lastModified:meta.lastModified || Date.now() });
              restored.push({ id:meta.id, file:file, role:meta.role || 'unknown', status:meta.status || 'ready', addedAt:new Date(meta.addedAt || Date.now()) });
            }
            workspaceState.files = restored;
            workspaceState.nextId = savedWorkspace.nextId || restored.length + 1;
            workspaceState.selected = new Set((savedWorkspace.selected || []).filter(function (id) { return restored.some(function (item) { return item.id === id; }); }));
            if (savedWorkspace.search) workspaceDom.search.value = savedWorkspace.search;
            if (savedWorkspace.filter) workspaceDom.filter.value = savedWorkspace.filter;
            renderWorkspaceFiles();
          }

          if (savedCompare) {
            compareState.sourceSort = savedCompare.sourceSort || 'asc';
            compareState.colunasExtras = savedCompare.colunasExtras || [];
            compareState.larguras = savedCompare.larguras || {};
            compareState.alturas = savedCompare.alturas || {};
            compareState.titulos = savedCompare.titulos || {};
            compareState.formulas = savedCompare.formulas || {};
            if (savedCompare.execucaoAberta) execucaoAberta = savedCompare.execucaoAberta;
            [['budget', savedCompare.budgetId], ['committed', savedCompare.committedId], ['collected', savedCompare.collectedId]].forEach(function (entry) {
              const item = entry[1] ? findWorkspaceFile(entry[1]) : null;
              if (!item) return;
              compareState.files[entry[0]] = item.file;
              document.getElementById(entry[0] + 'Clear').hidden = false;
              fileState(entry[0], 'ready', item.file.name, formatBytes(item.file.size) + ' • restaurado deste navegador', 'Pronto');
            });
            updateCompareReady();
            const chavesExec = (await stores.state.keys()).filter(function (chave) { return chave.indexOf('exec-') === 0; });
            const hasReports = chavesExec.length && savedCompare.reports && Object.keys(savedCompare.reports).length >= 2;
            // planilha em branco não tem relatório nenhum; comparação pela metade não volta
            const semRelatorio = !Object.keys(savedCompare.reports || {}).length;
            const livreSalva = chavesExec.length && semRelatorio && (savedCompare.modo || 'livre') === 'livre';
            if (savedCompare.hasResults && (hasReports || livreSalva) && Array.isArray(savedCompare.rows) && savedCompare.rows.length) {
              compareState.modo = savedCompare.modo || modoDeduzido(savedCompare.reports);
              compareState.reports = savedCompare.reports;
              compareState.rows = savedCompare.rows;
              compareState.audit = Array.isArray(savedCompare.audit) ? savedCompare.audit : [];
              if (savedCompare.search) compareDom.search.value = savedCompare.search;
              if (savedCompare.status) compareDom.status.value = savedCompare.status;
              renderCompareResults();
              compareDom.results.hidden = false;
              compareDom.empty.hidden = true;
              compareDom.details.hidden = true;
              compareDom.detailsToggle.hidden = compareState.modo === 'livre';
              compareDom.auditPanel.hidden = true;
              compareDom.auditToggle.hidden = compareState.modo === 'livre';
              compareDom.view.classList.add('results-ready');
              compareDom.view.classList.remove('show-setup');
              compareDom.setup.classList.remove('expanded');
              setCompareAlert(compareState.modo === 'livre' ? '' : 'Tabela restaurada do armazenamento deste navegador. Reprocesse os PDFs se precisar recalcular do zero.');
            }
          }

          // Se o retrato da tela não trouxe a planilha de volta mas a aba aberta
          // continua guardada, é ela que deve reaparecer — nunca uma grade vazia.
          if (compareDom.results.hidden && execucaoAberta) {
            const guardada = await stores.state.getItem(PREFIXO_EXEC + execucaoAberta);
            if (guardada && Array.isArray(guardada.rows) && guardada.rows.length) await abrirExecucao(execucaoAberta);
          }

          // guarda contra resultado órfão: sem execução salva, nada de tabela restaurada
          if (!compareDom.results.hidden) {
            const execucoesSalvas = (await stores.state.keys()).filter(function (chave) { return chave.indexOf('exec-') === 0; });
            if (!execucoesSalvas.length) {
              compareState.rows = [];
              compareState.reports = {};
              compareState.audit = [];
              resetCompareOutput();
              await stores.state.removeItem('compare');
            }
          }
          if (savedUi && savedUi.view) {
            wfaSavedView = savedUi.view;
            if (document.body.classList.contains('app-active')) selectView(wfaSavedView);
          }
        } catch (error) {
          console.warn('Não foi possível restaurar os dados salvos:', error);
        } finally {
          wfaReady = true;
          updateStorageSummary();
        }
      }

      async function updateStorageSummary() {
        const target = document.getElementById('storageSummary');
        if (!target) return;
        if (wfaPersistDisabled) { target.textContent = 'Este navegador está bloqueando o armazenamento local (modo privativo?). Os dados serão perdidos ao recarregar.'; return; }
        const totalBytes = workspaceState.files.reduce(function (sum, item) { return sum + item.file.size; }, 0);
        let quotaText = '';
        try {
          if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            if (estimate && estimate.usage && estimate.quota) quotaText = ' Uso total do site: ' + formatBytes(estimate.usage) + ' de ' + formatBytes(estimate.quota) + ' disponíveis.';
          }
        } catch (error) { /* estimativa indisponível */ }
        target.textContent = workspaceState.files.length
          ? workspaceState.files.length + (workspaceState.files.length === 1 ? ' arquivo guardado' : ' arquivos guardados') + ' (' + formatBytes(totalBytes) + '), além da tabela e da trilha de auditoria.' + quotaText
          : 'Nenhum arquivo guardado ainda.' + quotaText;
      }

      async function clearWfaStorage() {
        try {
          const stores = await getWfaStores();
          await stores.files.clear();
          await stores.state.clear();
          showToast('Dados salvos apagados. Recarregando…');
          window.setTimeout(function () { window.location.reload(); }, 900);
        } catch (error) { showToast('Não foi possível apagar os dados salvos.'); }
      }

      // devolve filtros, ordenação e tela inicial ao padrão, sem tocar nos arquivos guardados
      var layoutResetButton = document.getElementById('layoutReset');
      if (layoutResetButton) layoutResetButton.addEventListener('click', async function () {
        try {
          var stores = await getWfaStores();
          await stores.state.removeItem('ui');
          var workspace = await stores.state.getItem('workspace');
          if (workspace) { workspace.search = ''; workspace.filter = 'all'; await stores.state.setItem('workspace', workspace); }
          var compare = await stores.state.getItem('compare');
          if (compare) { compare.search = ''; compare.status = 'all'; compare.sourceSort = 'asc'; await stores.state.setItem('compare', compare); }
        } catch (error) { /* segue mesmo sem armazenamento */ }
        // impede que a gravação de saída devolva o estado antigo por cima do reset
        wfaReady = false;
        clearTimeout(wfaSaveTimer);
        showToast('Layout restaurado. Recarregando…');
        window.setTimeout(function () { window.location.reload(); }, 800);
      });

      var storageClearButton = document.getElementById('storageClear');
      if (storageClearButton) storageClearButton.addEventListener('click', async function () {
        if (await window.wfaConfirmar('Os PDFs guardados, a tabela e a trilha de auditoria deste navegador serão apagados. Esta ação não pode ser desfeita.', 'Apagar dados salvos', 'Apagar tudo')) clearWfaStorage();
      });
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
      restoreWfaState();
      window.addEventListener('pagehide', function () { clearTimeout(wfaSaveTimer); persistWfaNow(); });


      /* ============ Comportamento de planilha na grade do comparador ============
         Navegação por teclado entre células, indicador de célula ativa no padrão
         de caixa de nome e comandos diretos sobre as linhas.                    */
      (function () {
        var LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        var corpo = document.getElementById('compareTableBody');
        if (!corpo) return;
        var caixaNome = document.getElementById('sheetNameBox');
        var celulaLigada = null;   // { seletor } — reencontrada na hora de gravar
        var barraFormula = document.getElementById('sheetFormula');
        var botaoExcluir = document.querySelector('[data-sheet-cmd="del"]');

        function seletorDaCelula(campo) {
          var chave = campo.dataset.rowKey ? campo.dataset.rowKey.replace(/"/g, '\\"') : '';
          if (campo.dataset.compareCell) return '[data-compare-cell="' + campo.dataset.compareCell + '"][data-row-key="' + chave + '"]';
          if (campo.dataset.compareExtra) return '[data-compare-extra="' + campo.dataset.compareExtra + '"][data-row-key="' + chave + '"]';
          if (campo.dataset.formulaCol) {
            var linha = campo.closest('tr');
            var indice = Array.prototype.indexOf.call(corpo.rows, linha) + 1;
            return 'tr:nth-child(' + indice + ') [data-formula-col="' + campo.dataset.formulaCol + '"]';
          }
          return null;
        }

        function celulaDe(elemento) { return elemento ? elemento.closest('td') : null; }
        function coordenadas(celula) {
          var linha = celula.parentElement;
          var indiceColuna = Array.prototype.indexOf.call(linha.children, celula);
          var indiceLinha = Array.prototype.indexOf.call(corpo.rows, linha);
          return { coluna: indiceColuna, linha: indiceLinha };
        }
        function marcarAtiva(celula) {
          corpo.querySelectorAll('td.celula-ativa').forEach(function (c) { c.classList.remove('celula-ativa'); });
          corpo.querySelectorAll('tr.linha-ativa').forEach(function (l) { l.classList.remove('linha-ativa'); });
          if (!celula) {
            caixaNome.textContent = '—';
            celulaLigada = null;
            barraFormula.value = '';
            barraFormula.disabled = true;
            if (botaoExcluir) botaoExcluir.disabled = true;
            return;
          }
          celula.classList.add('celula-ativa');
          celula.parentElement.classList.add('linha-ativa');
          var pos = coordenadas(celula);
          caixaNome.textContent = (LETRAS[pos.coluna - 1] || '#') + (pos.linha + 1);
          var campo = celula.querySelector('.cell-editor');
          celulaLigada = campo ? seletorDaCelula(campo) : null;
          barraFormula.disabled = !campo;
          barraFormula.value = campo ? (campo.dataset.bruto || campo.value) : celula.textContent.trim();
          if (botaoExcluir) botaoExcluir.disabled = !celula.parentElement.querySelector('[data-compare-remove]');
        }
        function focarCelula(indiceLinha, indiceColuna) {
          var linha = corpo.rows[indiceLinha];
          if (!linha) return false;
          var passo = indiceColuna > 0 ? 1 : -1;
          for (var c = indiceColuna; c >= 0 && c < linha.children.length; c += passo) {
            var campo = linha.children[c] && linha.children[c].querySelector('.cell-editor');
            if (campo) { campo.focus(); campo.select(); return true; }
          }
          return false;
        }

        /* ---------------- seleção de várias células ----------------
           Como no Excel: arrastar pela tabela, clicar com Shift para esticar
           até ali, ou Shift com as setas. Sobre a seleção valem Delete para
           limpar e Ctrl+C para copiar, já no formato que o Excel entende. */
        var selecao = null;          // { ancora:{linha,coluna}, foco:{linha,coluna} }
        var arrastando = false;
        var ancoraDoArrasto = null;

        function retangulo() {
          if (!selecao) return null;
          return {
            l1: Math.min(selecao.ancora.linha, selecao.foco.linha),
            l2: Math.max(selecao.ancora.linha, selecao.foco.linha),
            c1: Math.min(selecao.ancora.coluna, selecao.foco.coluna),
            c2: Math.max(selecao.ancora.coluna, selecao.foco.coluna)
          };
        }
        function limparSelecao() {
          selecao = null;
          corpo.querySelectorAll('td.celula-marcada').forEach(function (c) { c.classList.remove('celula-marcada'); });
          atualizarResumoSelecao();
        }
        function pintarSelecao() {
          corpo.querySelectorAll('td.celula-marcada').forEach(function (c) { c.classList.remove('celula-marcada'); });
          var r = retangulo();
          if (!r) { atualizarResumoSelecao(); return; }
          if (r.l1 === r.l2 && r.c1 === r.c2) { atualizarResumoSelecao(); return; }
          for (var l = r.l1; l <= r.l2; l += 1) {
            var linha = corpo.rows[l];
            if (!linha) continue;
            for (var c = r.c1; c <= r.c2; c += 1) {
              if (linha.children[c]) linha.children[c].classList.add('celula-marcada');
            }
          }
          atualizarResumoSelecao();
        }
        // o rodapé conta e soma o que está marcado, como a barra de status do Excel
        function atualizarResumoSelecao() {
          var aviso = document.getElementById('sheetSelecao');
          if (!aviso) return;
          var r = retangulo();
          if (!r || (r.l1 === r.l2 && r.c1 === r.c2)) { aviso.hidden = true; return; }
          var quantas = 0;
          var numeros = 0;
          var soma = 0;
          percorrerSelecao(function (campo) {
            quantas += 1;
            if (!campo) return;
            var texto = campo.value;
            var n = parseBrl(texto);
            if (!n) n = Number(String(texto).replace(/\./g, '').replace(',', '.'));
            if (texto && Number.isFinite(n) && n !== 0) { numeros += 1; soma += n; }
          });
          aviso.hidden = false;
          aviso.textContent = quantas + ' células' + (numeros ? ' • soma ' + formatBrl(soma) : '');
        }
        function percorrerSelecao(acao) {
          var r = retangulo();
          if (!r) return;
          for (var l = r.l1; l <= r.l2; l += 1) {
            var linha = corpo.rows[l];
            if (!linha) continue;
            for (var c = r.c1; c <= r.c2; c += 1) {
              var celula = linha.children[c];
              if (!celula) continue;
              acao(celula.querySelector('.cell-editor'), celula, l, c);
            }
          }
        }

        function definirSelecao(ancora, foco) {
          selecao = { ancora: ancora, foco: foco };
          pintarSelecao();
        }

        /* ---------------- apontar células dentro de uma fórmula ----------------
           Como no Excel: com a célula em modo de fórmula, arrastar ou clicar em
           outras células escreve a referência dentro da fórmula, em vez de
           trocar a seleção. B1:B8 aparece onde o cursor estava.            */
        var apontando = null;   // { campo, inicio, ancora }

        function letraDaColuna(indice) { return LETRAS[indice - 1] || ''; }
        function referenciaDoRetangulo(r) {
          var c1 = letraDaColuna(r.c1);
          var c2 = letraDaColuna(r.c2);
          if (!c1 || !c2) return '';
          if (r.l1 === r.l2 && r.c1 === r.c2) return c1 + (r.l1 + 1);
          return c1 + (r.l1 + 1) + ':' + c2 + (r.l2 + 1);
        }
        // a fórmula aceita uma referência aqui? só depois de = ( ; , ou de um operador
        function esperaReferencia(texto, posicao) {
          var antes = texto.slice(0, posicao).replace(/\s+$/, '');
          if (!antes || antes === '=') return true;
          return /[=+\-*/(;,:]$/.test(antes);
        }
        function campoEmFormula() {
          var ativo = document.activeElement;
          if (!ativo || !ativo.classList || !ativo.classList.contains('cell-editor')) return null;
          return ehFormula(ativo.value) ? ativo : null;
        }
        function escreverReferencia(texto) {
          if (!apontando) return;
          var campo = apontando.campo;
          var antes = campo.value.slice(0, apontando.inicio);
          var depois = campo.value.slice(apontando.fim);
          campo.value = antes + texto + depois;
          apontando.fim = apontando.inicio + texto.length;
          campo.setSelectionRange(apontando.fim, apontando.fim);
          barraFormula.value = campo.value;
        }
        function comecarApontamento(campo, pos) {
          var inicio = campo.selectionStart;
          if (!esperaReferencia(campo.value, inicio)) return false;
          apontando = { campo: campo, inicio: inicio, fim: campo.selectionEnd, ancora: pos };
          escreverReferencia(referenciaDoRetangulo({ l1: pos.linha, l2: pos.linha, c1: pos.coluna, c2: pos.coluna }));
          definirSelecao(pos, pos);
          document.body.classList.add('apontando-celulas');
          return true;
        }
        function estenderApontamento(pos) {
          if (!apontando) return;
          var r = {
            l1: Math.min(apontando.ancora.linha, pos.linha), l2: Math.max(apontando.ancora.linha, pos.linha),
            c1: Math.min(apontando.ancora.coluna, pos.coluna), c2: Math.max(apontando.ancora.coluna, pos.coluna)
          };
          escreverReferencia(referenciaDoRetangulo(r));
          definirSelecao(apontando.ancora, pos);
        }
        function encerrarApontamento() {
          if (!apontando) return;
          apontando.campo.focus();
          apontando.campo.setSelectionRange(apontando.fim, apontando.fim);
          apontando = null;
          document.body.classList.remove('apontando-celulas');
        }

        // arrastar pela tabela marca o retângulo; um clique simples continua editando
        corpo.addEventListener('mousedown', function (evento) {
          var celula = celulaDe(evento.target);
          if (!celula || celula.classList.contains('sheet-row-number') || celula.classList.contains('preenchimento')) return;
          var pos = coordenadas(celula);
          // com uma fórmula aberta, clicar em outra célula escreve a referência nela
          var emFormula = campoEmFormula();
          if (emFormula && celula !== celulaDe(emFormula) && comecarApontamento(emFormula, pos)) {
            evento.preventDefault();
            ancoraDoArrasto = pos;
            return;
          }
          if (evento.shiftKey && selecao) {
            evento.preventDefault();
            definirSelecao(selecao.ancora, pos);
            return;
          }
          ancoraDoArrasto = pos;
          arrastando = false;
          // um clique simples deixa a âncora pronta: é dela que o Shift estica depois
          definirSelecao(pos, pos);
        });
        corpo.addEventListener('mouseover', function (evento) {
          if (!ancoraDoArrasto || evento.buttons !== 1) return;
          var celula = celulaDe(evento.target);
          if (!celula || celula.classList.contains('sheet-row-number') || celula.classList.contains('preenchimento')) return;
          var pos = coordenadas(celula);
          if (apontando) { estenderApontamento(pos); return; }
          if (pos.linha === ancoraDoArrasto.linha && pos.coluna === ancoraDoArrasto.coluna) return;
          if (!arrastando) {
            arrastando = true;
            var ativo = document.activeElement;
            if (ativo && ativo.blur) ativo.blur();
            document.body.classList.add('selecionando-celulas');
          }
          definirSelecao(ancoraDoArrasto, pos);
        });
        document.addEventListener('mouseup', function () {
          encerrarApontamento();
          ancoraDoArrasto = null;
          arrastando = false;
          document.body.classList.remove('selecionando-celulas');
        });

        // Shift com as setas estica a seleção a partir da célula em foco
        corpo.addEventListener('keydown', function (evento) {
          if (!evento.shiftKey) return;
          var passos = { ArrowUp:[-1, 0], ArrowDown:[1, 0], ArrowLeft:[0, -1], ArrowRight:[0, 1] };
          var passo = passos[evento.key];
          if (!passo) return;
          var celula = celulaDe(evento.target);
          if (!celula) return;
          evento.preventDefault();
          var base = selecao ? selecao : { ancora: coordenadas(celula), foco: coordenadas(celula) };
          var linha = Math.min(Math.max(base.foco.linha + passo[0], 0), corpo.rows.length - 1);
          var maxColuna = (corpo.rows[linha] ? corpo.rows[linha].children.length : 1) - 1;
          var coluna = Math.min(Math.max(base.foco.coluna + passo[1], 1), maxColuna);
          definirSelecao(base.ancora, { linha: linha, coluna: coluna });
        });

        // apagar e copiar valem para tudo o que está marcado
        document.addEventListener('keydown', function (evento) {
          if (!selecao || apontando) return;
          var r = retangulo();
          if (!r || (r.l1 === r.l2 && r.c1 === r.c2)) return;
          var editando = document.activeElement && document.activeElement.classList
            && document.activeElement.classList.contains('cell-editor');

          if ((evento.key === 'Delete' || evento.key === 'Backspace') && !editando) {
            evento.preventDefault();
            // recolhe todos os alvos antes de mexer: cada alteração redesenha a
            // tabela e as células seguintes deixariam de existir no meio do caminho
            var alvos = [];
            percorrerSelecao(function (campo) {
              if (!campo || campo.readOnly || campo.disabled) return;
              if (!campo.dataset.compareExtra || campo.value === '') return;
              alvos.push({ chave: campo.dataset.rowKey, coluna: campo.dataset.compareExtra });
            });
            if (!alvos.length) { showToast('Nada para limpar nas células marcadas.'); return; }
            alvos.forEach(function (alvo) {
              var linha = findCompareRow(alvo.chave);
              if (linha && linha.extras) linha.extras[alvo.coluna] = '';
            });
            persistWfaLater();
            regravarExecucaoAberta();
            renderCompareTable();
            showToast(alvos.length + (alvos.length === 1 ? ' célula limpa.' : ' células limpas.'));
            return;
          }
          if ((evento.ctrlKey || evento.metaKey) && (evento.key === 'c' || evento.key === 'C')) {
            var linhas = [];
            var atual = null;
            var ultimaLinha = -1;
            percorrerSelecao(function (campo, celula, l) {
              if (l !== ultimaLinha) { atual = []; linhas.push(atual); ultimaLinha = l; }
              atual.push(campo ? campo.value : celula.textContent.trim());
            });
            var texto = linhas.map(function (l) { return l.join('\t'); }).join('\n');
            try {
              navigator.clipboard.writeText(texto);
              showToast('Copiado. Pode colar no Excel.');
            } catch (erro) { /* navegador sem área de transferência */ }
            evento.preventDefault();
            return;
          }
          if (evento.key === 'Escape' && !editando) limparSelecao();
        });

        // depois de redesenhar, a marcação continua onde estava, ajustada ao que sobrou
        corpo.addEventListener('wfa:redesenhou', function () {
          if (!selecao) return;
          var ultimaLinha = corpo.rows.length - 1;
          if (ultimaLinha < 0) { limparSelecao(); return; }
          [selecao.ancora, selecao.foco].forEach(function (ponto) {
            ponto.linha = Math.min(ponto.linha, ultimaLinha);
            var ultimaColuna = corpo.rows[ponto.linha].children.length - 1;
            ponto.coluna = Math.min(Math.max(ponto.coluna, 1), Math.max(ultimaColuna, 1));
          });
          pintarSelecao();
        });

        corpo.addEventListener('focusin', function (evento) {
          var celula = celulaDe(evento.target);
          if (celula) marcarAtiva(celula);
        });
        corpo.addEventListener('input', function (evento) {
          if (evento.target.classList.contains('cell-editor')) barraFormula.value = evento.target.value;
        });
        corpo.addEventListener('change', function (evento) {
          if (evento.target.classList && evento.target.classList.contains('cell-editor')) limparSelecao();
        });
        // digitar na barra e confirmar altera a célula selecionada
        barraFormula.addEventListener('keydown', function (evento) {
          if (evento.key === 'Escape') {
            evento.preventDefault();
            var atualEsc = celulaLigada ? corpo.querySelector(celulaLigada) : null;
            if (atualEsc) barraFormula.value = atualEsc.dataset.bruto || atualEsc.value;
            barraFormula.blur();
            return;
          }
          if (evento.key !== 'Enter') return;
          evento.preventDefault();
          if (!celulaLigada) return;
          var atual = corpo.querySelector(celulaLigada);   // reencontra depois de qualquer redesenho
          if (!atual) return;
          atual.value = barraFormula.value;
          // cada tipo de célula confirma de um jeito: dado no focusout, fórmula no change
          if (atual.dataset.compareCell) atual.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
          else atual.dispatchEvent(new Event('change', { bubbles: true }));
          barraFormula.blur();
        });
        corpo.addEventListener('keydown', function (evento) {
          var campo = evento.target;
          if (!campo.classList || !campo.classList.contains('cell-editor')) return;
          var celula = celulaDe(campo);
          if (!celula) return;
          var pos = coordenadas(celula);
          var tecla = evento.key;

          if (tecla === 'Escape') { campo.value = campo.dataset.initialValue || campo.defaultValue; barraFormula.textContent = campo.value; campo.blur(); return; }
          if (tecla === 'Enter') { evento.preventDefault(); campo.blur(); focarCelula(pos.linha + (evento.shiftKey ? -1 : 1), pos.coluna); return; }
          if (tecla === 'Tab') { evento.preventDefault(); campo.blur(); if (!focarCelula(pos.linha, pos.coluna + (evento.shiftKey ? -1 : 1))) focarCelula(pos.linha + 1, 1); return; }
          if (tecla === 'ArrowDown' || tecla === 'ArrowUp') {
            evento.preventDefault();
            campo.blur();
            focarCelula(pos.linha + (tecla === 'ArrowDown' ? 1 : -1), pos.coluna);
            return;
          }
          if (tecla === 'ArrowLeft' && campo.selectionStart === 0) {
            evento.preventDefault(); campo.blur(); focarCelula(pos.linha, pos.coluna - 1); return;
          }
          if (tecla === 'ArrowRight' && campo.selectionStart === campo.value.length) {
            evento.preventDefault(); campo.blur(); focarCelula(pos.linha, pos.coluna + 1); return;
          }
        });

        corpo.addEventListener('focusin', function (evento) {
          var campo = evento.target.closest ? evento.target.closest('.cell-editor') : null;
          if (!campo) return;
          setTimeout(function () {
            celulaLigada = seletorDaCelula(campo);
            barraFormula.disabled = false;
            barraFormula.value = campo.dataset.bruto || campo.value;
          }, 0);
        });
        // Shift + roda do mouse rola a planilha na horizontal, como no Excel
        (function () {
          var area = document.querySelector('.compare-table-wrap');
          if (!area) return;
          area.addEventListener('wheel', function (evento) {
            if (!evento.shiftKey || !evento.deltaY) return;
            evento.preventDefault();
            area.scrollLeft += evento.deltaY;
          }, { passive:false });
        }());

        document.addEventListener('keydown', function (evento) {
          if (!evento.ctrlKey) return;
          var ativa = corpo.querySelector('td.celula-ativa');
          if (evento.shiftKey && (evento.key === '+' || evento.key === '=')) { evento.preventDefault(); acionar('add'); }
          else if (evento.key === '-' && ativa) { evento.preventDefault(); acionar('del'); }
        });

        function acionar(comando) {
          if (comando === 'add') { document.getElementById('compareAddRow').click(); return; }
          if (comando === 'del') {
            var ativa = corpo.querySelector('td.celula-ativa');
            var botao = ativa && ativa.parentElement.querySelector('[data-compare-remove]');
            if (botao) { botao.click(); marcarAtiva(null); }
            return;
          }
          if (comando === 'asc' || comando === 'desc') {
            var atual = document.getElementById('compareSortSource');
            if (compareState.sourceSort !== comando) atual.click();
            return;
          }
          if (comando === 'clear') {
            compareDom.search.value = '';
            compareDom.status.value = 'all';
            renderCompareTable();
            return;
          }
          if (comando === 'col') { criarColunaLivre(); return; }
          if (comando === 'guia') { abrirGuiaFormulas(); return; }
          if (comando === 'xlsx') { document.getElementById('compareExportXlsx').click(); return; }
        }
        document.querySelectorAll('[data-sheet-cmd]').forEach(function (botao) {
          botao.addEventListener('click', function () { acionar(botao.dataset.sheetCmd); });
        });
      }());


      /* ===================== Paleta de comandos, barra de status e arrastar-e-soltar =====================
         Tudo aqui opera sobre ações que já existem no sistema: nada de atalho decorativo. */
      (function () {
        const palco = document.getElementById('cmdk');
        const campo = document.getElementById('cmdkInput');
        const lista = document.getElementById('cmdkList');
        if (!palco || !campo || !lista) return;
        let visiveis = [];
        let ativo = 0;

        function tipoDoScriptPronto() {
          const tipos = [];
          workspaceState.files.forEach(function (item) {
            if (item.status === 'ready' && ROLE_INFO[item.role] && tipos.indexOf(item.role) === -1) tipos.push(item.role);
          });
          return tipos;
        }

        function comandos() {
          const temResultado = !compareDom.results.hidden;
          const prontos = tipoDoScriptPronto().length;
          const base = [
            { icone:'▦', titulo:'Área de trabalho', detalhe:'planilhas e automações', grupo:'Área', acao:function () { selectView('comparador-fontes'); } },
            { icone:'▤', titulo:'Central de documentos', detalhe:workspaceState.files.length + ' arquivos', grupo:'Área', acao:function () { selectView('workspace'); } },
            { icone:'Aa', titulo:'Personalizar página', detalhe:'editor da homepage e cores', grupo:'Área', acao:function () { selectView('personalizar'); } },
            { icone:'⚙', titulo:'Configurações', detalhe:'acesso e dados salvos', grupo:'Área', acao:function () { selectView('configuracoes'); } },
            { icone:'↥', titulo:'Carregar documentos', detalhe:'selecionar PDFs do computador', grupo:'Ação', acao:function () { workspaceDom.upload.click(); } }
          ];
          base.push({ icone:'＋', titulo:'Nova planilha', detalhe:'planilha em branco na área de trabalho', grupo:'Ação', acao:function () { novaPlanilha(); } });
          if (prontos >= 2) base.push({ icone:'⚙', titulo:'Automação: comparação de fontes', detalhe:'usa os documentos marcados na barra lateral', grupo:'Ação', acao:function () { launchWorkspaceComparator(); } });
          if (temResultado) {
            base.push({ icone:'XLS', titulo:'Exportar para Excel', detalhe:'planilha com comparação e auditoria', grupo:'Ação', acao:function () { document.getElementById('compareExportXlsx').click(); } });
            base.push({ icone:'PDF', titulo:'Exportar para PDF', detalhe:'relatório com trilha de auditoria', grupo:'Ação', acao:function () { document.getElementById('compareExportPdf').click(); } });
            base.push({ icone:'＋', titulo:'Adicionar fonte manualmente', detalhe:'nova linha na tabela', grupo:'Ação', acao:function () { document.getElementById('compareAddRow').click(); } });
          }
          base.push({ icone:'✎', titulo:'Editar a homepage', detalhe:'edição direto na página', grupo:'Ação', acao:function () { selectView('personalizar'); setTimeout(function () { document.getElementById('cmsInline').click(); }, 120); } });
          base.push({ icone:'↗', titulo:'Ver a homepage', detalhe:'pré-visualizar como visitante', grupo:'Ação', acao:function () { document.getElementById('appViewSite').click(); } });
          base.push({ icone:'↺', titulo:'Restaurar layout inicial', detalhe:'filtros e tela padrão, sem apagar arquivos', grupo:'Sistema', acao:function () { document.getElementById('layoutReset').click(); } });
          base.push({ icone:'⏻', titulo:'Sair do sistema', detalhe:'encerrar a sessão', grupo:'Sistema', acao:function () { document.getElementById('appLogout').click(); } });
          workspaceState.files.forEach(function (item) {
            base.push({
              icone:'PDF', titulo:item.file.name, detalhe:workspaceRoleLabel(item.role) + ' • ' + formatBytes(item.file.size), grupo:'Documento',
              acao:function () { workspaceState.selected.add(item.id); renderWorkspaceFiles(); selectView('workspace'); }
            });
          });
          return base;
        }

        function pontuar(texto, termo) {
          const alvo = normalizeSearch(texto);
          const busca = normalizeSearch(termo);
          if (!busca) return 1;
          const direto = alvo.indexOf(busca);
          if (direto === 0) return 1000;
          if (direto > 0) return 600 - direto;
          let i = 0;
          for (let c = 0; c < alvo.length && i < busca.length; c += 1) { if (alvo[c] === busca[i]) i += 1; }
          return i === busca.length ? 200 : 0;
        }

        function desenhar() {
          const termo = campo.value.trim();
          visiveis = comandos()
            .map(function (cmd) { return { cmd:cmd, nota:Math.max(pontuar(cmd.titulo, termo), pontuar(cmd.detalhe, termo) - 50) }; })
            .filter(function (linha) { return linha.nota > 0; })
            .sort(function (a, b) { return b.nota - a.nota; })
            .map(function (linha) { return linha.cmd; })
            .slice(0, 40);
          if (ativo >= visiveis.length) ativo = 0;
          if (!visiveis.length) { lista.innerHTML = '<li class="cmdk-empty">Nenhum comando corresponde a essa busca.</li>'; return; }
          lista.innerHTML = visiveis.map(function (cmd, indice) {
            return '<li role="option" data-indice="' + indice + '" aria-selected="' + (indice === ativo) + '"><span class="cmdk-icon">' + escapeHtml(cmd.icone) + '</span><span><b>' + escapeHtml(cmd.titulo) + '</b><small>' + escapeHtml(cmd.detalhe) + '</small></span><span class="cmdk-group">' + escapeHtml(cmd.grupo) + '</span></li>';
          }).join('');
          const marcado = lista.querySelector('[aria-selected="true"]');
          if (marcado) marcado.scrollIntoView({ block:'nearest' });
        }

        function abrir() {
          if (!document.body.classList.contains('app-active')) return;
          palco.hidden = false;
          campo.value = '';
          ativo = 0;
          desenhar();
          setTimeout(function () { campo.focus(); }, 20);
        }
        function fechar() { palco.hidden = true; }
        function executar() {
          const escolha = visiveis[ativo];
          if (!escolha) return;
          fechar();
          setTimeout(escolha.acao, 40);
        }

        campo.addEventListener('input', function () { ativo = 0; desenhar(); });
        campo.addEventListener('keydown', function (evento) {
          if (evento.key === 'ArrowDown') { evento.preventDefault(); ativo = Math.min(ativo + 1, visiveis.length - 1); desenhar(); }
          else if (evento.key === 'ArrowUp') { evento.preventDefault(); ativo = Math.max(ativo - 1, 0); desenhar(); }
          else if (evento.key === 'Enter') { evento.preventDefault(); executar(); }
          else if (evento.key === 'Escape') { evento.preventDefault(); fechar(); }
        });
        lista.addEventListener('click', function (evento) {
          const item = evento.target.closest('[data-indice]');
          if (!item) return;
          ativo = Number(item.dataset.indice);
          executar();
        });
        palco.addEventListener('mousedown', function (evento) { if (evento.target === palco) fechar(); });
        document.addEventListener('keydown', function (evento) {
          if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') { evento.preventDefault(); palco.hidden ? abrir() : fechar(); }
        });
        const gatilho = document.getElementById('statusCmdk');
        if (gatilho) gatilho.addEventListener('click', abrir);

        /* ---- barra de status ---- */
        async function atualizarStatus() {
          const docs = document.getElementById('statusDocs');
          if (!docs) return;
          const total = workspaceState.files.length;
          docs.textContent = total + (total === 1 ? ' documento' : ' documentos');
          const prontos = tipoDoScriptPronto().length;
          const script = document.getElementById('statusScript');
          script.textContent = 'Comparador ' + prontos + '/3';
          script.className = 'status-item ' + (prontos >= 2 ? 'ok' : prontos ? 'alerta' : '');
          const linhas = document.getElementById('statusRows');
          if (compareDom.results.hidden) { linhas.textContent = 'sem execução'; linhas.className = 'status-item'; }
          else {
            const ativas = compareState.rows.filter(function (row) { return !row.deleted; }).length;
            const editadas = compareState.rows.filter(function (row) { return row.edited || row.manual; }).length;
            linhas.textContent = ativas + ' fontes' + (editadas ? ' • ' + editadas + ' editadas' : '');
            linhas.className = 'status-item ok';
          }
          try {
            if (navigator.storage && navigator.storage.estimate) {
              const est = await navigator.storage.estimate();
              if (est && est.usage) document.getElementById('statusStorage').textContent = formatBytes(est.usage) + ' guardados';
            }
          } catch (error) { /* estimativa indisponível */ }
        }
        window.wfaAtualizarStatus = atualizarStatus;
        setInterval(atualizarStatus, 4000);
        atualizarStatus();

        /* ---- arrastar e soltar em qualquer lugar do painel ---- */
        const cortina = document.getElementById('dropOverlay');
        let arrastando = 0;
        document.addEventListener('dragenter', function (evento) {
          if (!document.body.classList.contains('app-active')) return;
          if (!evento.dataTransfer || Array.prototype.indexOf.call(evento.dataTransfer.types, 'Files') === -1) return;
          arrastando += 1;
          cortina.hidden = false;
        });
        document.addEventListener('dragover', function (evento) { if (!cortina.hidden) evento.preventDefault(); });
        document.addEventListener('dragleave', function () { arrastando = Math.max(0, arrastando - 1); if (!arrastando) cortina.hidden = true; });
        document.addEventListener('drop', function (evento) {
          if (cortina.hidden) return;
          evento.preventDefault();
          arrastando = 0;
          cortina.hidden = true;
          if (evento.dataTransfer && evento.dataTransfer.files.length) addWorkspaceFiles(evento.dataTransfer.files);
        });
      }());

      /* ============ Áreas de trabalho: execuções concluídas ============
         Cada execução do script vira um registro reabrível, com os dados da
         tabela e dos relatórios que a geraram.                              */
      const PREFIXO_EXEC = 'exec-';
      let execucaoAberta = null;

      async function salvarExecucao() {
        try {
          const stores = await getWfaStores();
          const papeis = papeisComRelatorio();
          const livre = compareState.modo === 'livre' || !papeis.length;
          const id = execucaoAberta || 'exec-' + Date.now();
          const resumo = {
            id: id,
            script: livre ? 'Planilha' : 'Comparador de fontes',
            criadoEm: Date.now(),
            papeis: papeis,
            arquivos: papeis.map(function (papel) { return compareState.reports[papel].fileName; }),
            municipio: livre ? 'Planilha em branco' : compareState.reports[papeis[0]].municipality,
            exercicio: livre ? '' : compareState.reports[papeis[0]].exercise,
            fontes: compareState.rows.filter(function (row) { return !row.deleted; }).length,
            totais: papeis.reduce(function (acc, papel) {
              acc[papel] = compareState.rows.reduce(function (soma, row) { return soma + row[papel]; }, 0);
              return acc;
            }, {})
          };
          await stores.state.setItem(PREFIXO_EXEC + id, { resumo: resumo, modo: compareState.modo, reports: compareState.reports, rows: compareState.rows, audit: compareState.audit, colunasExtras: compareState.colunasExtras, larguras: compareState.larguras, alturas: compareState.alturas, titulos: compareState.titulos, formulas: compareState.formulas });
          execucaoAberta = id;
          renderExecucoes();
        } catch (error) { /* sem armazenamento: a execução segue apenas na tela */ }
      }

      async function lerExecucoes() {
        try {
          const stores = await getWfaStores();
          const chaves = (await stores.state.keys()).filter(function (chave) { return chave.indexOf(PREFIXO_EXEC) === 0; });
          const registros = await Promise.all(chaves.map(function (chave) { return stores.state.getItem(chave); }));
          return registros.filter(Boolean).sort(function (a, b) { return a.resumo.criadoEm - b.resumo.criadoEm; });
        } catch (error) { return []; }
      }

      function nomeDaExecucao(resumo) {
        if (!resumo.papeis || !resumo.papeis.length) return 'Planilha';
        return resumo.papeis.map(function (papel) { return ROLE_INFO[papel] ? ROLE_INFO[papel].curto : papel; }).join('×');
      }

      async function renderExecucoes() {
        const faixa = document.getElementById('sheetTabsList');
        if (!faixa) return;
        const registros = await lerExecucoes();
        if (registros.length && !execucaoAberta && !compareDom.results.hidden) {
          execucaoAberta = registros[registros.length - 1].resumo.id;
        }
        atualizarContadorPlanilhas(registros.length);
        if (!registros.length) {
          faixa.innerHTML = '<span class="sheet-tabs-vazio">Nenhuma planilha ainda — use o ＋ para criar a primeira.</span>';
          return;
        }
        faixa.innerHTML = registros.map(function (registro, indice) {
          const r = registro.resumo;
          const quando = new Date(r.criadoEm).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
          return '<button class="sheet-tab' + (r.id === execucaoAberta ? ' ativa' : '') + '" type="button" data-exec="' + escapeHtml(r.id) + '" title="' + escapeHtml(r.municipio + ' • ' + quando + ' • ' + r.fontes + ' fontes') + '"><span>' + escapeHtml(nomeDaExecucao(r)) + '</span><small>' + r.fontes + '</small><i data-exec-del="' + escapeHtml(r.id) + '" title="Excluir execução">×</i></button>';
        }).join('');
        const ativa = faixa.querySelector('.sheet-tab.ativa');
        if (ativa) ativa.scrollIntoView({ block:'nearest', inline:'nearest' });
      }

      // limpa o resultado em tela e o que estava guardado da última comparação
      async function limparComparacaoAtual() {
        compareState.rows = [];
        compareState.reports = {};
        compareState.audit = [];
        // colunas e títulos pertencem à planilha que foi encerrada
        compareState.colunasExtras = [];
        compareState.titulos = {};
        compareState.formulas = {};
        compareState.sourceSort = 'asc';
        COMPARE_ROLES.forEach(function (papel) { compareState.files[papel] = null; });
        resetCompareOutput();
        updateCompareReady();
        renderAudit();
        renderScriptBrief();
        try {
          const stores = await getWfaStores();
          await stores.state.removeItem('compare');
        } catch (error) { /* ignora */ }
      }

      // a aba aberta acompanha as edições de estrutura e de células
      var regravarTimer = null;
      function regravarExecucaoAberta() {
        if (!execucaoAberta) return;
        clearTimeout(regravarTimer);
        regravarTimer = setTimeout(async function () {
          try {
            const stores = await getWfaStores();
            const registro = await stores.state.getItem(PREFIXO_EXEC + execucaoAberta);
            if (!registro) return;
            registro.rows = compareState.rows;
            registro.audit = compareState.audit;
            registro.modo = compareState.modo;
            registro.colunasExtras = compareState.colunasExtras;
            registro.larguras = compareState.larguras;
            registro.alturas = compareState.alturas;
            registro.titulos = compareState.titulos;
            registro.formulas = compareState.formulas;
            registro.resumo.fontes = compareState.rows.filter(function (row) { return !row.deleted; }).length;
            await stores.state.setItem(PREFIXO_EXEC + execucaoAberta, registro);
            renderExecucoes();
          } catch (error) { /* segue sem regravar */ }
        }, 600);
      }

      async function excluirExecucao(id) {
        // tira a aba da tela imediatamente: o banco é lento demais para o clique
        const abaNaTela = document.querySelector('.sheet-tab[data-exec="' + id + '"]');
        if (abaNaTela) abaNaTela.remove();
        try {
          const stores = await getWfaStores();
          await stores.state.removeItem(PREFIXO_EXEC + id);
        } catch (error) { /* ignora */ }
        const eraAAberta = execucaoAberta === id;
        if (eraAAberta) { execucaoAberta = null; clearTimeout(regravarTimer); }
        const restantes = await lerExecucoes();
        if (!restantes.length) {
          execucaoAberta = null;
          await limparComparacaoAtual();
        } else if (eraAAberta) {
          await abrirExecucao(restantes[restantes.length - 1].resumo.id);
        }
        renderExecucoes();
        showToast('Execução excluída.');
      }

      async function abrirExecucao(id) {
        try {
          const stores = await getWfaStores();
          const registro = await stores.state.getItem(PREFIXO_EXEC + id);
          if (!registro) return;
          compareState.modo = registro.modo || modoDeduzido(registro.reports);
          compareState.reports = registro.reports;
          compareState.rows = registro.rows;
          compareState.audit = registro.audit || [];
          compareState.colunasExtras = registro.colunasExtras || [];
          compareState.larguras = registro.larguras || {};
          compareState.alturas = registro.alturas || {};
          compareState.titulos = registro.titulos || {};
          compareState.formulas = registro.formulas || {};
          execucaoAberta = id;
          COMPARE_ROLES.forEach(function (papel) {
            const relatorio = compareState.reports[papel];
            if (relatorio) fileState(papel, 'ready', relatorio.fileName, relatorio.sources.size + ' fontes • total ' + formatBrl(relatorio.reportedTotal), 'Validado');
          });
          const livre = compareState.modo === 'livre';
          renderCompareResults();
          compareDom.results.hidden = false;
          compareDom.empty.hidden = true;
          compareDom.detailsToggle.hidden = livre;
          compareDom.auditToggle.hidden = livre;
          compareDom.view.classList.add('results-ready');
          compareDom.view.classList.remove('show-setup');
          setCompareAlert(livre ? '' : 'Execução de ' + new Date(registro.resumo.criadoEm).toLocaleString('pt-BR') + ' reaberta.');
          selectView('comparador-fontes');
          renderExecucoes();
        } catch (error) { showToast('Não foi possível reabrir esta execução.'); }
      }

      document.getElementById('sheetTabsList').addEventListener('click', function (evento) {
        const excluir = evento.target.closest('[data-exec-del]');
        if (excluir) {
          evento.stopPropagation();
          window.wfaConfirmar('Esta execução sai da lista de abas. Os documentos usados continuam guardados na central.', 'Excluir execução', 'Excluir')
            .then(function (sim) { if (sim) excluirExecucao(excluir.dataset.execDel); });
          return;
        }
        const aba = evento.target.closest('[data-exec]');
        if (aba) abrirExecucao(aba.dataset.exec);
      });
      document.getElementById('sheetTabNew').addEventListener('click', function () { novaPlanilha(); });
      renderExecucoes();

      // barra lateral recolhida fica guardada entre sessões
      (function () {
        const botao = document.getElementById('appRecolher');
        if (!botao) return;
        const CHAVE = 'wfaSidebarRecolhida';
        function aplicar(recolhida) {
          document.body.classList.toggle('sidebar-recolhida', recolhida);
          botao.title = recolhida ? 'Expandir a barra lateral' : 'Recolher a barra lateral';
          botao.setAttribute('aria-label', botao.title);
        }
        try { aplicar(localStorage.getItem(CHAVE) === '1'); } catch (erro) { /* sem armazenamento */ }
        botao.addEventListener('click', function () {
          const recolhida = !document.body.classList.contains('sidebar-recolhida');
          aplicar(recolhida);
          try { localStorage.setItem(CHAVE, recolhida ? '1' : '0'); } catch (erro) { /* ignora */ }
        });
      }());

      menuButton.addEventListener('click', function () { const isOpen = menu.classList.toggle('open'); menuButton.setAttribute('aria-expanded', String(isOpen)); });
      menu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { menu.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); }); });
      document.getElementById('contactForm').addEventListener('submit', function (event) { event.preventDefault(); document.getElementById('formStatus').hidden = false; });
      const revealObserver = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) entry.target.classList.add('visible'); }); }, { threshold: .12 });
      document.querySelectorAll('.reveal').forEach(function (element) { revealObserver.observe(element); });
      // trechos redesenhados depois do carregamento também precisam aparecer
      window.wfaObservarReveal = function (raiz) {
        (raiz || document).querySelectorAll('.reveal:not(.visible)').forEach(function (element) { revealObserver.observe(element); });
      };
    }());
