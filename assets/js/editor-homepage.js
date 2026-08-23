/* ====================== Editor de conteúdo da homepage ======================
       Cada bloco editável é um elemento inteiro da página (um título, um parágrafo,
       um item de lista), preservando o destaque em outra fonte e as quebras de
       linha. O conteúdo publicado vive em um arquivo à parte, lido por todos os
       visitantes quando a página carrega.                                       */
    (function () {
      'use strict';
      var DESTINO = { owner:'wfagestaopublica-netizen', repo:'WFA', branch:'main' };
      var CMS_PATH = 'conteudo/home.json';
      var CMS_IMG_DIR = 'conteudo/img/';
      var TOKEN_KEY = 'wfaGithubToken';
      var DRAFT_KEY = 'wfaHomeDraft';
      var INLINE_OK = { EM:1, B:1, STRONG:1, I:1, SPAN:1, BR:1, SMALL:1, SUP:1, SUB:1, U:1 };
      var SCOPE_LABEL = { cabecalho:'Cabeçalho', inicio:'Topo do site', credentials:'Faixa de normas', empresa:'A empresa', servicos:'Soluções', municipios:'Atuação', metodo:'Método', contato:'Contato', rodape:'Rodapé', geral:'Outros' };
      var SCOPE_ORDER = ['cabecalho','inicio','credentials','empresa','servicos','municipios','metodo','contato','rodape','geral'];

      var mapa = null;
      var publicado = null;
      var alteracoes = {};
      var imagensPendentes = {};
      var editando = false;
      var seletorImagem = null;

      function toast(texto) {
        var el = document.getElementById('appToast');
        if (!el) return;
        el.textContent = texto;
        el.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(function () { el.classList.remove('show'); }, 4000);
      }
      function setStatus(texto, tipo) {
        var el = document.getElementById('cmsStatus');
        if (el) {
          el.textContent = texto;
          el.className = 'cms-status' + (tipo ? ' ' + tipo : '');
        }
        // durante a edição na página o painel está oculto: o retorno vai para a barra
        var naBarra = document.getElementById('cmsBarStatus');
        if (naBarra) {
          naBarra.textContent = texto;
          naBarra.className = 'cms-bar-status' + (tipo ? ' ' + tipo : '');
          naBarra.hidden = !texto;
        }
      }

      /* ---------------- limpeza do HTML editado ---------------- */
      function sanitizar(bruto) {
        var molde = document.createElement('div');
        molde.innerHTML = bruto;
        (function limpa(no) {
          for (var i = no.childNodes.length - 1; i >= 0; i -= 1) {
            var filho = no.childNodes[i];
            if (filho.nodeType === 3) continue;
            if (filho.nodeType !== 1 || !INLINE_OK[filho.tagName]) {
              no.replaceChild(document.createTextNode(filho.textContent || ''), filho);
              continue;
            }
            for (var a = filho.attributes.length - 1; a >= 0; a -= 1) {
              if (filho.attributes[a].name !== 'class') filho.removeAttribute(filho.attributes[a].name);
            }
            limpa(filho);
          }
        }(molde));
        return molde.innerHTML.replace(/\s+/g, ' ').replace(/<br>\s*(?:&nbsp;| )+/g, '<br>').replace(/&nbsp;| /g, ' ').trim();
      }

      /* ---------------- mapeamento da página ---------------- */
      function escopoDe(el) {
        var secao = el.closest('section[id], section[class], header.main-header, footer');
        if (!secao) return 'geral';
        if (secao.tagName === 'FOOTER') return 'rodape';
        if (secao.tagName === 'HEADER') return 'cabecalho';
        return secao.id || (secao.className || '').split(' ')[0] || 'geral';
      }
      function rotuloDe(el) {
        var tag = el.tagName.toLowerCase();
        var classe = (el.className || '').toString().split(' ')[0];
        return classe ? tag + '.' + classe : tag;
      }
      /* Cada trecho editável carrega o próprio nome no HTML (data-bloco).
         Antes o nome era recontado a cada carregamento, e qualquer mexida na
         página deslocava a numeração — o que estava publicado ia junto. */
      function editavel(el) {
        return !el.closest('#wfaApp, .app-toast, .site-preview-bar, .cms-edit-bar, .construction-gate');
      }
      function mapear() {
        var blocos = {};
        var imagens = {};
        Array.prototype.forEach.call(document.querySelectorAll('[data-bloco]'), function (el) {
          if (!editavel(el)) return;
          var chave = el.getAttribute('data-bloco');
          blocos[chave] = { el:el, chave:chave, escopo:escopoDe(el), orig:sanitizar(el.innerHTML), rotulo:rotuloDe(el) };
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-imagem]'), function (el) {
          if (!editavel(el)) return;
          var chave = el.getAttribute('data-imagem');
          imagens[chave] = { el:el, chave:chave, escopo:escopoDe(el), rotulo:el.getAttribute('alt') || el.className || 'imagem' };
        });
        return { blocos:blocos, imagens:imagens };
      }

      function aplicarBloco(campo, valor) {
        campo.el.innerHTML = sanitizar(valor);
      }
      function aplicarImagem(campo, url) {
        // caminho do repositório vira caminho absoluto; blob e data seguem inteiros
        campo.el.src = /^(blob:|data:|https?:|\/)/.test(url) ? url : '/' + url;
        campo.el.hidden = false;
        var retrato = campo.el.closest('.profile-portrait');
        if (retrato) retrato.classList.add('tem-foto');
      }
      function aplicarConteudo(dados) {
        if (!dados || !mapa) return;
        if (dados.blocos) Object.keys(dados.blocos).forEach(function (chave) {
          var campo = mapa.blocos[chave];
          var salvo = dados.blocos[chave];
          if (!campo || !salvo || typeof salvo.v !== 'string') return;
          alteracoes[chave] = salvo.v;
          aplicarBloco(campo, salvo.v);
        });
        if (dados.imagens) Object.keys(dados.imagens).forEach(function (chave) {
          var campo = mapa.imagens[chave];
          if (campo && dados.imagens[chave]) aplicarImagem(campo, dados.imagens[chave]);
        });
        if (typeof dados.emConstrucao === 'boolean') {
          document.body.dataset.construcao = dados.emConstrucao ? 'on' : 'off';
          var liberado = document.body.classList.contains('app-active') || document.body.classList.contains('previa-ativa');
          document.body.classList.toggle('em-construcao', dados.emConstrucao && !liberado);
        }
        if (dados.cores) {
          var cores = dados.cores;
          if (cores.destaque) cores = { '--gold-500': cores.destaque };   // formato antigo
          aplicarCores(cores);
        }
      }

      /* ---------------- alterações e rascunho ---------------- */
      function registrarAlteracao(chave, valor, jaNoDom) {
        var campo = mapa.blocos[chave];
        if (!campo) return;
        var limpo = sanitizar(valor);
        if (limpo === campo.orig) delete alteracoes[chave]; else alteracoes[chave] = limpo;
        if (!jaNoDom) aplicarBloco(campo, limpo);
        gravarRascunho();
      }
      function totalAlteracoes() {
        var total = Object.keys(alteracoes).length + Object.keys(imagensPendentes).length + Object.keys(coresAtuais()).length;
        var construcaoPublicada = publicado && typeof publicado.emConstrucao === 'boolean' ? publicado.emConstrucao : true;
        if (construcaoAtual() !== construcaoPublicada) total += 1;
        return total;
      }
      var CORES_PADRAO = { '--navy-950':'#051521', '--navy-900':'#071b2b', '--gold-500':'#c39a57', '--gold-400':'#d6b476', '--red-mg':'#b72d35', '--paper':'#f5f3ef', '--ink':'#102331' };
      function coresAtuais() {
        var cores = {};
        document.querySelectorAll('[data-cms-var]').forEach(function (entrada) {
          if (entrada.value.toLowerCase() !== String(CORES_PADRAO[entrada.dataset.cmsVar]).toLowerCase()) cores[entrada.dataset.cmsVar] = entrada.value;
        });
        return cores;
      }
      function aplicarCores(cores) {
        Object.keys(CORES_PADRAO).forEach(function (nome) {
          var valor = cores && cores[nome] ? cores[nome] : CORES_PADRAO[nome];
          document.documentElement.style.setProperty(nome, valor);
          var entrada = document.querySelector('[data-cms-var="' + nome + '"]');
          if (entrada) entrada.value = valor;
        });
      }
      function construcaoAtual() { var el = document.getElementById('cmsConstrucao'); return el ? el.checked : document.body.dataset.construcao !== 'off'; }
      function gravarRascunho() {
        var blocos = {};
        Object.keys(alteracoes).forEach(function (chave) {
          var campo = mapa.blocos[chave];
          if (campo) blocos[chave] = { v:alteracoes[chave], o:campo.orig };
        });
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ blocos:blocos, cores:coresAtuais(), emConstrucao:construcaoAtual() })); }
        catch (error) { /* sem espaço */ }
        atualizarBotoes();
        return blocos;
      }
      function lerRascunho() {
        try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (error) { return null; }
      }
      function atualizarBotoes() {
        var total = totalAlteracoes();
        var publicar = document.getElementById('cmsPublish');
        var descartar = document.getElementById('cmsDiscard');
        if (publicar) publicar.hidden = false;
        if (descartar) descartar.hidden = total === 0;
        var contador = document.getElementById('cmsBarCount');
        if (contador) contador.textContent = total === 0 ? 'Nenhuma alteração' : total + (total === 1 ? ' alteração pendente' : ' alterações pendentes');
        [document.getElementById('cmsBarPublish'), document.getElementById('cmsBarDiscard')].forEach(function (b) { if (b) b.disabled = total === 0; });
      }

      /* ---------------- edição direto na página ---------------- */
      function entrarEdicao() {
        if (editando) return;
        editando = true;
        document.body.classList.remove('app-active');
        document.body.classList.add('cms-editando');
        Object.keys(mapa.blocos).forEach(function (chave) {
          var el = mapa.blocos[chave].el;
          el.setAttribute('data-cms-inline', chave);
          el.setAttribute('contenteditable', 'true');
          el.setAttribute('spellcheck', 'false');
        });
        Object.keys(mapa.imagens).forEach(function (chave) { mapa.imagens[chave].el.setAttribute('data-cms-inline-img', chave); });
        var vazio = document.querySelector('.profile-photo-placeholder');
        var foto = document.getElementById('profilePhoto');
        if (vazio && foto && !foto.getAttribute('src')) {
          var chaveFoto = Object.keys(mapa.imagens).find(function (k) { return mapa.imagens[k].el === foto; });
          if (chaveFoto) vazio.setAttribute('data-cms-inline-img', chaveFoto);
        }
        window.scrollTo({ top: 0 });
        atualizarBotoes();
        toast('Clique no texto para editar. Enter quebra a linha. Selecione um trecho para formatar. Nas imagens, use o botão Trocar imagem.');
      }
      function sairEdicao(voltarAoPainel) {
        if (!editando) return;
        editando = false;
        esconderFormatacao();
        Object.keys(mapa.blocos).forEach(function (chave) {
          var el = mapa.blocos[chave].el;
          el.removeAttribute('data-cms-inline');
          el.removeAttribute('contenteditable');
          el.removeAttribute('spellcheck');
        });
        Object.keys(mapa.imagens).forEach(function (chave) { mapa.imagens[chave].el.removeAttribute('data-cms-inline-img'); });
        var vazio = document.querySelector('.profile-photo-placeholder');
        if (vazio) vazio.removeAttribute('data-cms-inline-img');
        var botaoImagem = document.getElementById('cmsImgBtn');
        if (botaoImagem) botaoImagem.hidden = true;
        var painelCores = document.getElementById('cmsColorPanel');
        if (painelCores) painelCores.hidden = true;
        var botaoCores = document.getElementById('cmsBarColors');
        if (botaoCores) botaoCores.classList.remove('ativo');
        document.body.classList.remove('cms-editando');
        if (voltarAoPainel !== false) document.body.classList.add('app-active');
      }

      function blocoDaSelecao() {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        var no = sel.getRangeAt(0).commonAncestorContainer;
        var el = no.nodeType === 1 ? no : no.parentElement;
        return el ? el.closest('[data-cms-inline]') : null;
      }
      function esconderFormatacao() {
        var barra = document.getElementById('cmsFormatBar');
        if (barra) barra.hidden = true;
      }
      function mostrarFormatacao() {
        var barra = document.getElementById('cmsFormatBar');
        if (!barra || !editando) return;
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !blocoDaSelecao()) { esconderFormatacao(); return; }
        var caixa = sel.getRangeAt(0).getBoundingClientRect();
        if (!caixa.width && !caixa.height) { esconderFormatacao(); return; }
        barra.hidden = false;
        barra.style.top = Math.max(8, caixa.top - barra.offsetHeight - 10) + 'px';
        barra.style.left = Math.max(8, Math.min(window.innerWidth - barra.offsetWidth - 8, caixa.left + caixa.width / 2 - barra.offsetWidth / 2)) + 'px';
        ajustarBotoesFormatacao();
      }
      // negrito e itálico não fazem sentido onde o estilo do site já aplica o efeito:
      // o navegador inverteria a marcação e criaria um estado que não sobrevive à publicação
      function ajustarBotoesFormatacao() {
        var sel = window.getSelection();
        if (!sel.rangeCount) return;
        var no = sel.getRangeAt(0).startContainer;
        var el = no.nodeType === 1 ? no : no.parentElement;
        if (!el) return;
        var bloco = blocoDaSelecao();
        var estilo = window.getComputedStyle(el);
        // negrito vindo da folha de estilo do site x negrito aplicado aqui pelo editor:
        // o primeiro não deve ser mexido, o segundo precisa poder ser desfeito
        var marcaNegrito = el.closest('b, strong');
        var marcaItalico = el.closest('i, em');
        var negritoDoEditor = Boolean(bloco && marcaNegrito && bloco.contains(marcaNegrito));
        var italicoDoEditor = Boolean(bloco && marcaItalico && bloco.contains(marcaItalico));
        var negritoDoSite = parseInt(estilo.fontWeight, 10) >= 700 && !negritoDoEditor;
        var italicoDoSite = estilo.fontStyle === 'italic' && !italicoDoEditor;
        var botaoNegrito = document.getElementById('cmsFmtBold');
        var botaoItalico = document.getElementById('cmsFmtItalic');
        if (botaoNegrito) {
          botaoNegrito.disabled = negritoDoSite;
          botaoNegrito.classList.toggle('ativo', negritoDoEditor);
          botaoNegrito.title = negritoDoSite ? 'Este trecho já é negrito no estilo do site' : (negritoDoEditor ? 'Remover negrito' : 'Negrito');
        }
        if (botaoItalico) {
          botaoItalico.disabled = italicoDoSite;
          botaoItalico.classList.toggle('ativo', italicoDoEditor);
          botaoItalico.title = italicoDoSite ? 'Este trecho já é itálico no estilo do site' : (italicoDoEditor ? 'Remover itálico' : 'Itálico');
        }
      }
      document.addEventListener('selectionchange', function () { if (editando) mostrarFormatacao(); });
      window.addEventListener('scroll', function () { if (editando) esconderFormatacao(); }, { passive:true });
      document.addEventListener('mouseup', function () {
        if (!editando) return;
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed) esconderFormatacao();
      });
      document.addEventListener('mousedown', function (evento) {
        if (!editando || !evento.target.closest) return;
        if (evento.target.closest('.cms-format-bar, .cms-color-panel, .cms-edit-bar')) return;
        esconderFormatacao();
      }, true);
      document.addEventListener('focusout', function (evento) {
        if (!editando || !evento.target.closest) return;
        if (evento.target.closest('[data-cms-inline]')) esconderFormatacao();
      });

      function tagDeDestaque(bloco) {
        return bloco && bloco.closest('.hero') && bloco.tagName === 'H1' ? 'span' : 'em';
      }
      function envolverSelecao(tag, classe) {
        var bloco = blocoDaSelecao();
        var sel = window.getSelection();
        if (!bloco || !sel.rangeCount || sel.isCollapsed) return;
        var faixa = sel.getRangeAt(0);
        var marca = document.createElement(tag);
        if (classe) marca.className = classe;
        try { faixa.surroundContents(marca); }
        catch (error) { marca.appendChild(faixa.extractContents()); faixa.insertNode(marca); }
        sel.removeAllRanges();
        esconderFormatacao();
        registrarAlteracao(bloco.dataset.cmsInline, bloco.innerHTML, true);
      }
      function aplicarDestaque() {
        var bloco = blocoDaSelecao();
        if (bloco) envolverSelecao(tagDeDestaque(bloco));
      }
      function alternarMarcacao(comando) {
        var bloco = blocoDaSelecao();
        var sel = window.getSelection();
        if (!bloco || !sel.rangeCount || sel.isCollapsed) return;
        var botao = document.getElementById(comando === 'bold' ? 'cmsFmtBold' : 'cmsFmtItalic');
        if (botao && botao.disabled) return;
        try { document.execCommand('styleWithCSS', false, false); } catch (error) { /* navegador antigo */ }
        document.execCommand(comando);
        registrarAlteracao(bloco.dataset.cmsInline, bloco.innerHTML, true);
        var viva = window.getSelection();
        if (viva && !viva.isCollapsed) mostrarFormatacao(); else esconderFormatacao();
      }
      function limparFormatacao() {
        var bloco = blocoDaSelecao();
        var sel = window.getSelection();
        if (!bloco || !sel.rangeCount || sel.isCollapsed) return;
        try { document.execCommand('styleWithCSS', false, false); } catch (error) { /* navegador antigo */ }
        document.execCommand('removeFormat');
        if (sel.rangeCount) {
          var faixa = sel.getRangeAt(0);
          Array.prototype.slice.call(bloco.querySelectorAll('em, i, b, strong, span, small, u')).forEach(function (marca) {
            if (!marca.parentNode || !faixa.intersectsNode(marca)) return;
            while (marca.firstChild) marca.parentNode.insertBefore(marca.firstChild, marca);
            marca.remove();
          });
          bloco.normalize();
        }
        registrarAlteracao(bloco.dataset.cmsInline, bloco.innerHTML, true);
        esconderFormatacao();
      }
      function removerDestaque() {
        var bloco = blocoDaSelecao();
        var sel = window.getSelection();
        if (!bloco || !sel.rangeCount) return;
        var no = sel.getRangeAt(0).commonAncestorContainer;
        var el = no.nodeType === 1 ? no : no.parentElement;
        var marca = el.closest('em, i, span, b, strong, small, u');
        if (marca && bloco.contains(marca) && marca !== bloco) {
          while (marca.firstChild) marca.parentNode.insertBefore(marca.firstChild, marca);
          marca.remove();
          bloco.normalize();
        }
        sel.removeAllRanges();
        esconderFormatacao();
        registrarAlteracao(bloco.dataset.cmsInline, bloco.innerHTML, true);
      }

      document.addEventListener('input', function (evento) {
        var bloco = evento.target.closest ? evento.target.closest('[data-cms-inline]') : null;
        if (bloco) registrarAlteracao(bloco.dataset.cmsInline, bloco.innerHTML, true);
      });
      document.addEventListener('keydown', function (evento) {
        var bloco = evento.target.closest ? evento.target.closest('[data-cms-inline]') : null;
        if (!bloco) return;
        if (evento.key === 'Escape') { bloco.blur(); esconderFormatacao(); return; }
        if (evento.key !== 'Enter') return;
        evento.preventDefault();
        if (!document.execCommand('insertLineBreak')) {
          var sel = window.getSelection();
          if (!sel.rangeCount) return;
          var faixa = sel.getRangeAt(0);
          faixa.deleteContents();
          var quebra = document.createElement('br');
          faixa.insertNode(quebra);
          faixa.setStartAfter(quebra);
          faixa.collapse(true);
          sel.removeAllRanges();
          sel.addRange(faixa);
        }
        registrarAlteracao(bloco.dataset.cmsInline, bloco.innerHTML, true);
      });
      document.addEventListener('paste', function (evento) {
        var bloco = evento.target.closest ? evento.target.closest('[data-cms-inline]') : null;
        if (!bloco) return;
        evento.preventDefault();
        var texto = (evento.clipboardData || window.clipboardData).getData('text').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
        document.execCommand('insertText', false, texto);
      });
      document.addEventListener('click', function (evento) {
        if (!editando) return;
        if (evento.target.closest && evento.target.closest('.cms-edit-bar, .cms-format-bar')) return;
        var link = evento.target.closest ? evento.target.closest('a[href]') : null;
        if (link) evento.preventDefault();
      }, true);
      document.addEventListener('submit', function (evento) { if (editando) evento.preventDefault(); }, true);

      /* ---------------- imagens ---------------- */
      var temporizadorBotaoImagem = null;
      function posicionarBotaoImagem(alvo) {
        var botao = document.getElementById('cmsImgBtn');
        if (!botao) return;
        clearTimeout(temporizadorBotaoImagem);
        var caixa = alvo.getBoundingClientRect();
        botao.dataset.chave = alvo.dataset.cmsInlineImg;
        botao.hidden = false;
        var largura = botao.offsetWidth || 160;
        var altura = botao.offsetHeight || 36;
        var ALTURA_CABECALHO = 110;   // o cabeçalho fixo cobre o topo da imagem do hero
        var MARGEM = 20;
        var limiteSuperior = Math.max(caixa.top + MARGEM, ALTURA_CABECALHO);
        var base = Math.min(caixa.bottom, window.innerHeight) - altura - MARGEM;
        var topo = Math.max(limiteSuperior, Math.min(base, window.innerHeight - altura - MARGEM));
        var esquerda = Math.min(caixa.right, window.innerWidth) - largura - MARGEM;
        botao.style.top = Math.round(Math.max(MARGEM, topo)) + 'px';
        botao.style.left = Math.round(Math.max(MARGEM, esquerda)) + 'px';
      }
      function agendarOcultarBotaoImagem() {
        clearTimeout(temporizadorBotaoImagem);
        temporizadorBotaoImagem = setTimeout(function () {
          var botao = document.getElementById('cmsImgBtn');
          if (botao) botao.hidden = true;
        }, 1200);
      }
      function abrirSeletorImagem(chave) {
        if (!seletorImagem) {
          seletorImagem = document.createElement('input');
          seletorImagem.type = 'file';
          seletorImagem.accept = 'image/*';
          seletorImagem.style.display = 'none';
          seletorImagem.addEventListener('change', function () {
            var arquivo = seletorImagem.files && seletorImagem.files[0];
            var destino = seletorImagem.dataset.chave;
            seletorImagem.value = '';
            if (arquivo && destino) trocarImagem(destino, arquivo);
          });
          document.body.appendChild(seletorImagem);
        }
        seletorImagem.dataset.chave = chave;
        seletorImagem.click();
      }
      function trocarImagem(chave, arquivo) {
        prepararImagem(arquivo).then(function (resultado) {
          var url = URL.createObjectURL(resultado.blob);
          imagensPendentes[chave] = { blob:resultado.blob, extensao:resultado.extensao, url:url };
          var campo = mapa.imagens[chave];
          if (campo) aplicarImagem(campo, url);
          var vazio = document.querySelector('.profile-photo-placeholder[data-cms-inline-img]');
          if (vazio) vazio.removeAttribute('data-cms-inline-img');
          atualizarBotoes();
          toast('Imagem preparada (' + Math.round(resultado.blob.size / 1024) + ' KB). Use Publicar para enviá-la.');
        }).catch(function (erro) { toast(erro.message); });
      }
      function prepararImagem(file) {
        var LARGURA_MAX = 1920, PNG_DIRETO = 700 * 1024, PNG_LIMITE = 1500 * 1024;
        return new Promise(function (resolve, reject) {
          if (!/^image\//.test(file.type)) { reject(new Error('Selecione um arquivo de imagem.')); return; }
          if (file.type === 'image/svg+xml') { resolve({ blob:file, extensao:'svg' }); return; }
          var url = URL.createObjectURL(file);
          var img = new Image();
          img.onload = function () {
            var ehPng = file.type === 'image/png';
            if (ehPng && img.naturalWidth <= LARGURA_MAX && file.size <= PNG_DIRETO) { URL.revokeObjectURL(url); resolve({ blob:file, extensao:'png' }); return; }
            var escala = Math.min(1, LARGURA_MAX / img.naturalWidth);
            var canvas = document.createElement('canvas');
            canvas.width = Math.round(img.naturalWidth * escala);
            canvas.height = Math.round(img.naturalHeight * escala);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            function comoJpeg() {
              var fundo = document.createElement('canvas');
              fundo.width = canvas.width; fundo.height = canvas.height;
              var fctx = fundo.getContext('2d');
              fctx.fillStyle = '#ffffff';
              fctx.fillRect(0, 0, fundo.width, fundo.height);
              fctx.drawImage(canvas, 0, 0);
              fundo.toBlob(function (blob) {
                URL.revokeObjectURL(url);
                if (blob) resolve({ blob:blob, extensao:'jpg' }); else reject(new Error('Não foi possível processar a imagem.'));
              }, 'image/jpeg', 0.82);
            }
            if (ehPng) {
              canvas.toBlob(function (blob) {
                if (blob && blob.size <= PNG_LIMITE) { URL.revokeObjectURL(url); resolve({ blob:blob, extensao:'png' }); return; }
                comoJpeg();
              }, 'image/png');
            } else comoJpeg();
          };
          img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Arquivo de imagem inválido.')); };
          img.src = url;
        });
      }

      /* ---------------- gravação ---------------- */
      function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
      function cabecalhos() { return { 'Authorization':'Bearer ' + token(), 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' }; }
      function urlConteudo(caminho) { return 'https://api.github.com/repos/' + DESTINO.owner + '/' + DESTINO.repo + '/contents/' + caminho; }
      function mensagemErro(status) {
        if (status === 401) return 'O token de publicação está inválido ou venceu. Gere um novo e salve novamente.';
        if (status === 403) return 'O token de publicação não tem permissão para salvar alterações.';
        if (status === 404) return 'Não foi possível alcançar o destino das alterações. Verifique o token de publicação.';
        if (status === 409) return 'O conteúdo foi alterado em outra sessão. Recarregue a página e salve novamente.';
        return 'O servidor não aceitou a gravação no momento. Tente de novo em instantes.';
      }
      function lerVersao(caminho) {
        return fetch(urlConteudo(caminho) + '?ref=' + DESTINO.branch, { headers:cabecalhos(), cache:'no-store' })
          .then(function (res) {
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(mensagemErro(res.status));
            return res.json().then(function (json) { return json.sha; });
          });
      }
      function gravar(caminho, base64, resumo) {
        return lerVersao(caminho).then(function (versao) {
          var corpo = { message:resumo, content:base64, branch:DESTINO.branch };
          if (versao) corpo.sha = versao;
          return fetch(urlConteudo(caminho), { method:'PUT', headers:Object.assign({ 'Content-Type':'application/json' }, cabecalhos()), body:JSON.stringify(corpo) })
            .then(function (res) {
              if (!res.ok) throw new Error(mensagemErro(res.status));
              return res.json();
            });
        });
      }
      function bytesParaBase64(bytes) {
        var saida = '', passo = 0x8000;
        for (var i = 0; i < bytes.length; i += passo) saida += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
        return btoa(saida);
      }
      function publicar() {
        if (!token()) { setStatus('Configure o token de publicação antes de salvar.', 'erro'); toast('Token de publicação não configurado.'); return; }
        var botoes = [document.getElementById('cmsPublish'), document.getElementById('cmsBarPublish')].filter(Boolean);
        botoes.forEach(function (b) { b.disabled = true; });
        setStatus('Salvando as alterações…', '');
        toast('Salvando as alterações…');
        var blocos = gravarRascunho();
        var conteudo = {
          v: 2,
          atualizadoEm: new Date().toISOString(),
          blocos: Object.assign({}, (publicado && publicado.blocos) || {}, blocos),
          imagens: Object.assign({}, (publicado && publicado.imagens) || {}),
          cores: coresAtuais(),
          emConstrucao: construcaoAtual()
        };
        var fila = Promise.resolve();
        Object.keys(imagensPendentes).forEach(function (chave) {
          fila = fila.then(function () {
            setStatus('Enviando imagem…', '');
            return imagensPendentes[chave].blob.arrayBuffer().then(function (buffer) {
              var caminho = CMS_IMG_DIR + chave.replace(/[^\w.-]/g, '-') + '-' + Date.now() + '.' + imagensPendentes[chave].extensao;
              return gravar(caminho, bytesParaBase64(new Uint8Array(buffer)), 'Atualiza imagem da homepage')
                .then(function () { conteudo.imagens[chave] = caminho; });
            });
          });
        });
        fila.then(function () {
          setStatus('Aplicando as alterações…', '');
          return gravar(CMS_PATH, bytesParaBase64(new TextEncoder().encode(JSON.stringify(conteudo, null, 2))), 'Atualiza o conteúdo da homepage');
        }).then(function () {
          publicado = conteudo;
          imagensPendentes = {};
          localStorage.removeItem(DRAFT_KEY);
          atualizarBotoes();
          setStatus('Alterações salvas no servidor. Aguarde cerca de 1 minuto até que a atualização se propague para os visitantes.', 'ok');
          toast('Alterações salvas. A atualização propaga em cerca de 1 minuto.');
        }).catch(function (erro) {
          setStatus(erro.message, 'erro');
          toast('Não foi possível salvar as alterações.');
        }).then(function () {
          botoes.forEach(function (b) { b.disabled = false; });
          atualizarBotoes();
        });
      }
      async function descartar() {
        if (!await window.wfaConfirmar('Todas as alterações que ainda não foram publicadas serão perdidas.', 'Descartar alterações', 'Descartar')) return;
        localStorage.removeItem(DRAFT_KEY);
        alteracoes = {};
        imagensPendentes = {};
        window.location.reload();
      }

      /* ---------------- interface ---------------- */
      function ligarInterface() {
        var entradaToken = document.getElementById('cmsToken');
        if (!entradaToken) return;
        if (token()) { entradaToken.value = '••••••••••••'; setStatus('Token de publicação configurado neste navegador.', 'ok'); }
        else setStatus('Sem o token de publicação, as alterações ficam apenas neste navegador.', '');

        document.getElementById('cmsTokenSave').addEventListener('click', function () {
          var valor = entradaToken.value.trim();
          if (!valor || /^•+$/.test(valor)) { setStatus('Cole o token de publicação no campo acima.', 'erro'); return; }
          localStorage.setItem(TOKEN_KEY, valor);
          entradaToken.value = '••••••••••••';
          setStatus('Token salvo neste navegador.', 'ok');
        });
        document.getElementById('cmsTokenClear').addEventListener('click', function () {
          localStorage.removeItem(TOKEN_KEY);
          entradaToken.value = '';
          setStatus('Token removido deste navegador.', '');
        });
        document.getElementById('cmsInline').addEventListener('click', entrarEdicao);
        document.getElementById('cmsBarExit').addEventListener('click', async function () {
          if (totalAlteracoes() && !await window.wfaConfirmar('As alterações ficam guardadas neste navegador e você pode publicar depois.', 'Sair sem publicar', 'Sair assim mesmo')) return;
          sairEdicao(true);
        });
        document.getElementById('cmsBarPublish').addEventListener('click', publicar);
        document.getElementById('cmsBarDiscard').addEventListener('click', descartar);
        document.getElementById('cmsBarColors').addEventListener('click', function () {
          var painel = document.getElementById('cmsColorPanel');
          painel.hidden = !painel.hidden;
          this.classList.toggle('ativo', !painel.hidden);
        });
        document.getElementById('cmsFormatOn').addEventListener('mousedown', function (e) { e.preventDefault(); aplicarDestaque(); });
        document.getElementById('cmsFormatOff').addEventListener('mousedown', function (e) { e.preventDefault(); limparFormatacao(); });
        document.getElementById('cmsFmtBold').addEventListener('mousedown', function (e) { e.preventDefault(); alternarMarcacao('bold'); });
        document.getElementById('cmsFmtItalic').addEventListener('mousedown', function (e) { e.preventDefault(); alternarMarcacao('italic'); });
        document.querySelectorAll('.cms-cores button').forEach(function (botao) {
          botao.addEventListener('mousedown', function (e) { e.preventDefault(); envolverSelecao('span', botao.dataset.cor); });
        });
        var botaoImagem = document.getElementById('cmsImgBtn');
        botaoImagem.addEventListener('click', function () {
          if (botaoImagem.dataset.chave) abrirSeletorImagem(botaoImagem.dataset.chave);
        });
        document.addEventListener('mouseover', function (evento) {
          if (!editando || !evento.target.closest) return;
          if (evento.target.closest('.cms-img-btn')) return;
          var alvo = evento.target.closest('[data-cms-inline-img]');
          if (!alvo) return;
          posicionarBotaoImagem(alvo);
        });
        botaoImagem.addEventListener('mouseenter', function () { clearTimeout(temporizadorBotaoImagem); });
        botaoImagem.addEventListener('mouseleave', agendarOcultarBotaoImagem);
        document.addEventListener('mouseout', function (evento) {
          if (!editando) return;
          var indo = evento.relatedTarget;
          if (indo && indo.closest && indo.closest('[data-cms-inline-img], .cms-img-btn')) return;
          if (!evento.target.closest || !evento.target.closest('[data-cms-inline-img]')) return;
          agendarOcultarBotaoImagem();
        });
        window.addEventListener('scroll', function () { if (editando) botaoImagem.hidden = true; }, { passive:true });
        document.getElementById('cmsPublish').addEventListener('click', publicar);
        document.getElementById('cmsDiscard').addEventListener('click', descartar);
        document.querySelectorAll('[data-cms-var]').forEach(function (entrada) {
          entrada.addEventListener('input', function () {
            document.documentElement.style.setProperty(entrada.dataset.cmsVar, entrada.value);
            gravarRascunho();
          });
        });
        document.getElementById('cmsResetCores').addEventListener('click', function () {
          aplicarCores(null);
          gravarRascunho();
          toast('Cores originais restauradas. Publique para valer no site.');
        });
        var construcao = document.getElementById('cmsConstrucao');
        construcao.addEventListener('change', function () {
          document.body.dataset.construcao = construcao.checked ? 'on' : 'off';
          gravarRascunho();
          setStatus(construcao.checked ? 'Ao publicar, os visitantes continuarão vendo o aviso de construção.' : 'Ao publicar, o site ficará aberto ao público.', '');
        });
        atualizarBotoes();
      }

      function iniciar() {
        mapa = mapear();
        fetch('/' + CMS_PATH + '?v=' + Date.now(), { cache:'no-store' })
          .then(function (res) { return res.ok ? res.json() : null; })
          .catch(function () { return null; })
          .then(function (dados) {
            publicado = dados;
            aplicarConteudo(dados);
            alteracoes = {};
            var rascunho = lerRascunho();
            if (rascunho) aplicarConteudo(rascunho);
            if (rascunho && rascunho.cores) aplicarCores(rascunho.cores);
            var interruptor = document.getElementById('cmsConstrucao');
            if (interruptor) interruptor.checked = document.body.dataset.construcao !== 'off';
            ligarInterface();
          });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
      else iniciar();
    }());
