/* =========================================================
   TELA DE LOGIN — MOSTRAR/OCULTAR SENHA E EFEITO DE PARTÍCULAS
   Fica no topo do arquivo de propósito: assim a tela de login
   continua funcionando visualmente mesmo se o Firebase (abaixo)
   demorar ou falhar para carregar.
   ========================================================= */
function toggleSenha() {
    const input = document.getElementById('passInput');
    const btn = document.getElementById('toggleSenhaBtn');
    if (!input || !btn) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.setAttribute('aria-label', 'Ocultar senha');
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
        btn.setAttribute('aria-label', 'Mostrar senha');
    }
}

/* =========================================================
   SIDEBAR "ECOSSISTEMA GE" — GRUPOS RECOLHÍVEIS E PÁGINAS
   PLACEHOLDER. Também fica no topo, sem depender do Firebase,
   pra sidebar e navegação funcionarem mesmo se o Firebase falhar.
   ========================================================= */

// Abre/fecha um grupo do menu (só um grupo aberto por vez)
function toggleGrupo(headerEl) {
    const grupo = headerEl.closest('.sidebar-group');
    if (!grupo) return;
    const estavaAberto = grupo.classList.contains('open');
    document.querySelectorAll('.sidebar-group.open').forEach(g => g.classList.remove('open'));
    if (!estavaAberto) grupo.classList.add('open');
}

// Preenche as 28 páginas placeholder do Ecossistema GE a partir dos
// atributos data-cat / data-icon / data-title de cada div.
// Quando o conteúdo real de um módulo for construído, é só remover
// a classe "eco-placeholder-tab" da div dele (ou apagar este bloco)
// que este preenchimento automático para de sobrescrevê-lo.
function renderPlaceholdersEco() {
    document.querySelectorAll('.eco-placeholder-tab').forEach(tab => {
        const categoria = tab.dataset.cat || '';
        const icone = tab.dataset.icon || '🧩';
        const titulo = tab.dataset.title || '';
        tab.innerHTML = `
            <div class="dashboard-topbar">
                <div>
                    <p class="eco-breadcrumb">ECOSSISTEMA GE · ${categoria}</p>
                    <h3>${titulo}</h3>
                </div>
            </div>
            <div class="placeholder-card">
                <div class="placeholder-icon">${icone}</div>
                <h4>Em construção</h4>
                <p>Esse módulo (<strong>${titulo}</strong>) ainda vai ganhar conteúdo. Estrutura de navegação pronta — o conteúdo entra aqui na próxima etapa.</p>
            </div>
        `;
    });
}

document.addEventListener('DOMContentLoaded', renderPlaceholdersEco);

// CONFIGURAÇÃO DO FIREBASE (Insira as chaves do seu projeto Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyATz6jursDtnBedoypXAUpezhfV2sUzhHM",
    authDomain: "dashboard-802de.firebaseapp.com",
    projectId: "dashboard-802de",
    storageBucket: "dashboard-802de.firebasestorage.app",
    messagingSenderId: "424731487631",
    appId: "1:424731487631:web:cba5fd9888dc10a26c6ffa"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (error) {
    console.error("Não foi possível conectar ao Firebase. Confira as chaves em firebaseConfig e a conexão com a internet.", error);
}

let dadosLeads = [];
let dadosFuncionarios = [];
let dadosInvestimentos = [];
let usuariosCadastrados = [];
let dadosEleitores = [];
let usuarioAtualObj = null; // Armazena o objeto completo do usuário logado

window.onload = function() {
    const usuarioLogadoNome = localStorage.getItem('usuario_logado');
    if (usuarioLogadoNome) {
        // Carrega os dados primeiro para validar a sessão
        db.collection('usuarios').get().then(snapshot => {
            usuariosCadastrados = [];
            snapshot.forEach(doc => {
                usuariosCadastrados.push({ id: doc.id, ...doc.data() });
            });
            const encontrado = usuariosCadastrados.find(u => u.usuario === usuarioLogadoNome);
            if (encontrado) {
                liberarAcesso(encontrado);
            } else {
                fazerLogout();
            }
        });
    }
    document.getElementById('leadData').valueAsDate = new Date();
    document.getElementById('invData').valueAsDate = new Date();
    popularAnosSelect();
};

function popularAnosSelect() {
    const selectAno = document.getElementById('filtroAnoFinanceiro');
    if (!selectAno) return;
    
    const anoAtual = new Date().getFullYear();
    selectAno.innerHTML = '';
    
    for (let a = anoAtual; a >= 2024; a--) {
        selectAno.innerHTML += `<option value="${a}">${a}</option>`;
    }
}

async function fazerLogin() {
    const usuarioInput = document.getElementById('userInput').value.trim();
    const senhaInput = document.getElementById('passInput').value.trim();

    if(!usuarioInput || !senhaInput) {
        alert("Preencha usuário e senha!");
        return;
    }

    try {
        const snapshot = await db.collection('usuarios').get();
        usuariosCadastrados = [];
        snapshot.forEach(doc => {
            usuariosCadastrados.push({ id: doc.id, ...doc.data() });
        });

        // Cria um admin padrão caso o banco esteja totalmente vazio
        if (usuariosCadastrados.length === 0) {
            const adminPadrao = { usuario: "AdminGhost", senha: "Admin123", admin: true };
            const docRef = await db.collection('usuarios').add(adminPadrao);
            adminPadrao.id = docRef.id;
            usuariosCadastrados.push(adminPadrao);
        }

        const encontrado = usuariosCadastrados.find(
            u => u.usuario === usuarioInput && u.senha === senhaInput
        );

        if (encontrado) {
            localStorage.setItem('usuario_logado', encontrado.usuario);
            liberarAcesso(encontrado);
        } else {
            alert("Usuário ou senha incorretos!");
        }
    } catch (error) {
        console.error("Erro no login: ", error);
        alert("Erro ao conectar com a nuvem.");
    }
}

function liberarAcesso(usuarioObj) {
    usuarioAtualObj = usuarioObj;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'grid';
    document.getElementById('userNameDisplay').innerText = `${usuarioObj.usuario} (${usuarioObj.admin ? 'Admin' : 'Funcionário'})`;

    const isAdmin = usuarioObj.admin === true;

    // Exibe ou oculta menus restritos com base na permissão da conta
    // (usa optional chaining: esses IDs só existem se aquele menu específico
    // ainda estiver no sidebar — evita quebrar a tela caso ele seja removido/renomeado)
    const elFinanceiro = document.getElementById('menuFinanceiro');
    const elFuncionarios = document.getElementById('menuFuncionarios');
    const elContas = document.getElementById('menuContas');
    if (elFinanceiro) elFinanceiro.style.display = isAdmin ? 'block' : 'none';
    if (elFuncionarios) elFuncionarios.style.display = isAdmin ? 'block' : 'none';
    if (elContas) elContas.style.display = isAdmin ? 'block' : 'none';

    // Filtra os blocos do "Ecossistema GE" pela área de acesso da conta:
    // Administrador vê tudo; Funcionário só vê os blocos da área dele
    // (empresas ou político). Blocos sem data-area (ex: nenhum por
    // enquanto) ficam sempre visíveis.
    aplicarFiltroDeArea(usuarioObj);

    escutarDadosTempoReal();
}

function fazerLogout() {
    localStorage.removeItem('usuario_logado');
    usuarioAtualObj = null;
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('userInput').value = '';
    document.getElementById('passInput').value = '';
}

function escutarDadosTempoReal() {
    db.collection('leads').onSnapshot(snapshot => {
        dadosLeads = [];
        snapshot.forEach(doc => {
            dadosLeads.push({ id: doc.id, ...doc.data() });
        });
        renderizarTabelaLeads();
        renderizarTabelaInvestimentos();
        atualizarDashboard();
    });

    db.collection('funcionarios').onSnapshot(snapshot => {
        dadosFuncionarios = [];
        snapshot.forEach(doc => {
            dadosFuncionarios.push({ id: doc.id, ...doc.data() });
        });
        renderizarTabelaFuncionarios();
        atualizarDashboard();
    });

    db.collection('investimentos').onSnapshot(snapshot => {
        dadosInvestimentos = [];
        snapshot.forEach(doc => {
            dadosInvestimentos.push({ id: doc.id, ...doc.data() });
        });
        renderizarTabelaInvestimentos();
    });

    db.collection('usuarios').onSnapshot(snapshot => {
        usuariosCadastrados = [];
        snapshot.forEach(doc => {
            usuariosCadastrados.push({ id: doc.id, ...doc.data() });
        });
        renderizarTabelaContas();
        atualizarDashboard();
    });

    db.collection('eleitores').onSnapshot(snapshot => {
        dadosEleitores = [];
        snapshot.forEach(doc => {
            dadosEleitores.push({ id: doc.id, ...doc.data() });
        });
        renderizarTabelaEleitores();
    });
}

// Esconde/mostra os itens do sidebar (grupos recolhíveis, itens soltos
// como "Leads/Clientes" e os rótulos de seção como "POLÍTICO") e trava o
// acesso direto às abas, de acordo com a área de acesso da conta logada:
// 'todas' (admin) vê tudo, 'empresas' só vê data-area="empresas", 'politico'
// só vê data-area="politico". Um item sem data-area fica sempre visível.
function aplicarFiltroDeArea(usuarioObj) {
    const isAdmin = usuarioObj && usuarioObj.admin === true;
    const area = usuarioObj ? usuarioObj.area : null;

    document.querySelectorAll('#menuLateral [data-area]').forEach(item => {
        const permitido = isAdmin || !area || item.dataset.area === area;
        item.style.display = permitido ? '' : 'none';
    });
}

function mudarAba(idAba, elementoMenu) {
    const isAdmin = usuarioAtualObj && usuarioAtualObj.admin === true;

    if (!isAdmin && (idAba === 'financeiro' || idAba === 'funcionarios' || idAba === 'contas')) {
        alert("Acesso restrito apenas a contas com privilégio de Administrador.");
        return;
    }

    // Trava também o acesso direto (não só o item do menu escondido) a
    // qualquer aba do Ecossistema GE que não seja da área da conta logada.
    const alvo = document.getElementById(idAba);
    const areaDoAlvo = alvo ? alvo.dataset.area : null;
    if (!isAdmin && areaDoAlvo && usuarioAtualObj && usuarioAtualObj.area !== areaDoAlvo) {
        alert("Acesso restrito: essa área não está liberada para a sua conta.");
        return;
    }

    document.querySelectorAll('.tab-content').forEach(aba => {
        aba.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-menu li').forEach(li => {
        li.classList.remove('active');
    });

    document.getElementById(idAba).classList.add('active');
    elementoMenu.classList.add('active');
}

function mascaraTelefone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    
    if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 5) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (v.length > 0) {
        v = v.replace(/^(\d*)/, '($1');
    }
    input.value = v;
}

function abrirPainelNovo() {
    document.getElementById('tituloPainelLead').innerText = "Cadastrar Novo Cliente / Lead";
    document.getElementById('btnSalvarLead').innerText = "Salvar Cliente";
    document.getElementById('editId').value = "";
    limparFormularioLead();
    document.getElementById('painelCadastroLead').classList.add('mostrar');
}

function fecharPainelCadastro() {
    document.getElementById('painelCadastroLead').classList.remove('mostrar');
}

function limparFormularioLead() {
    document.getElementById('leadNome').value = '';
    document.getElementById('leadEmail').value = '';
    document.getElementById('leadTelefone').value = '';
    document.getElementById('leadServico').value = '';
    document.getElementById('leadTemperatura').value = 'morno';
    document.getElementById('leadValor').value = '';
    document.getElementById('leadData').valueAsDate = new Date();
    document.getElementById('endRua').value = '';
    document.getElementById('endBairro').value = '';
    document.getElementById('endNumero').value = '';
    document.getElementById('endComplemento').value = '';
    document.getElementById('endCidade').value = '';
    document.getElementById('leadObs').value = '';
    document.getElementById('erroNome').style.display = 'none';
    document.getElementById('erroEmail').style.display = 'none';
    document.getElementById('erroTelefone').style.display = 'none';
}

async function salvarLead() {
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('leadNome').value.trim();
    const email = document.getElementById('leadEmail').value.trim();
    const telefone = document.getElementById('leadTelefone').value.trim();
    const servico = document.getElementById('leadServico').value.trim();
    const temperatura = document.getElementById('leadTemperatura').value;
    const valor = parseFloat(document.getElementById('leadValor').value) || 0;
    const dataPagamento = document.getElementById('leadData').value;

    const rua = document.getElementById('endRua').value.trim();
    const bairro = document.getElementById('endBairro').value.trim();
    const numero = document.getElementById('endNumero').value.trim();
    const complemento = document.getElementById('endComplemento').value.trim();
    const cidade = document.getElementById('endCidade').value.trim();
    const obs = document.getElementById('leadObs').value.trim();

    const erroNome = document.getElementById('erroNome');
    const erroEmail = document.getElementById('erroEmail');
    const erroTelefone = document.getElementById('erroTelefone');

    let temErro = false;

    if (nome.split(' ').length < 2) {
        erroNome.style.display = 'block';
        temErro = true;
    } else {
        erroNome.style.display = 'none';
    }

    if (!email.includes('@')) {
        erroEmail.style.display = 'block';
        temErro = true;
    } else {
        erroEmail.style.display = 'none';
    }

    if (telefone.length < 14) {
        erroTelefone.style.display = 'block';
        temErro = true;
    } else {
        erroTelefone.style.display = 'none';
    }

    if (temErro) return;

    const enderecoCompleto = `${rua}, ${bairro} - Nº ${numero} ${complemento ? ', ' + complemento : ''} - ${cidade}`;
    const autorNome = usuarioAtualObj ? usuarioAtualObj.usuario : 'Admin';

    try {
        if (!id) {
            const leadDataObj = {
                nome, email, telefone, servico, temperatura, valor, dataPagamento,
                endereco: enderecoCompleto, obs, cadastradoPor: autorNome, favorito: false
            };
            await db.collection('leads').add(leadDataObj);
            alert("Cliente cadastrado com sucesso!");
        } else {
            const leadAntigo = dadosLeads.find(l => l.id === id);
            const leadDataObj = {
                nome, email, telefone, servico, temperatura, valor, dataPagamento,
                endereco: enderecoCompleto, obs, 
                cadastradoPor: leadAntigo ? leadAntigo.cadastradoPor : autorNome, 
                favorito: leadAntigo ? leadAntigo.favorito : false
            };
            await db.collection('leads').doc(id).update(leadDataObj);
            alert("Cliente atualizado com sucesso!");
        }
        fecharPainelCadastro();
    } catch (error) {
        console.error("Erro ao salvar lead: ", error);
        alert("Erro ao salvar no banco de dados.");
    }
}

function filtrarLeads() {
    const termo = document.getElementById('inputBuscaLead').value.toLowerCase();
    const leadsFiltrados = dadosLeads.filter(lead => lead.nome.toLowerCase().includes(termo));
    renderizarTabelaFiltrada(leadsFiltrados);
}

function renderizarTabelaLeads() {
    filtrarLeads();
}

function renderizarTabelaFiltrada(lista) {
    const tbody = document.getElementById('tabelaLeads');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    lista.forEach((lead) => {
        let tempClass = 'temp-morno';
        if (lead.temperatura === 'frio') tempClass = 'temp-frio';
        if (lead.temperatura === 'quente') tempClass = 'temp-quente';

        tbody.innerHTML += `
            <tr>
                <td>
                    <button class="btn-icon" onclick="toggleFavorito('${lead.id}', ${lead.favorito})">
                        ${lead.favorito ? '⭐' : '☆'}
                    </button>
                </td>
                <td><strong>${lead.nome}</strong></td>
                <td>${lead.email}</td>
                <td>${lead.telefone}</td>
                <td>${lead.servico || '-'}</td>
                <td><span class="badge-temp ${tempClass}">${lead.temperatura}</span></td>
                <td>R$ ${(lead.valor || 0).toFixed(2)}</td>
                <td>${lead.endereco}</td>
                <td><span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${lead.cadastradoPor || 'Admin'}</span></td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="editarLead('${lead.id}')">✏️</button>
                    <button class="btn-icon" title="Excluir" onclick="excluirLead('${lead.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function toggleFavorito(id, statusAtual) {
    try {
        await db.collection('leads').doc(id).update({ favorito: !statusAtual });
    } catch (error) {
        console.error("Erro ao atualizar favorito: ", error);
    }
}

function editarLead(id) {
    const lead = dadosLeads.find(l => l.id === id);
    if (!lead) return;

    document.getElementById('tituloPainelLead').innerText = "Editar Cliente / Lead";
    document.getElementById('btnSalvarLead').innerText = "Atualizar Cliente";
    document.getElementById('editId').value = id;

    document.getElementById('leadNome').value = lead.nome;
    document.getElementById('leadEmail').value = lead.email;
    document.getElementById('leadTelefone').value = lead.telefone;
    document.getElementById('leadServico').value = lead.servico || '';
    document.getElementById('leadTemperatura').value = lead.temperatura || 'morno';
    document.getElementById('leadValor').value = lead.valor || '';
    document.getElementById('leadData').value = lead.dataPagamento || '';
    document.getElementById('leadObs').value = lead.obs || '';

    document.getElementById('endRua').value = '';
    document.getElementById('endBairro').value = '';
    document.getElementById('endNumero').value = '';
    document.getElementById('endComplemento').value = '';
    document.getElementById('endCidade').value = '';

    document.getElementById('painelCadastroLead').classList.add('mostrar');
}

async function excluirLead(id) {
    if (confirm("Deseja realmente excluir este lead/cliente?")) {
        try {
            await db.collection('leads').doc(id).delete();
        } catch (error) {
            console.error("Erro ao excluir lead: ", error);
        }
    }
}

// ===== CADASTRO DE ELEITORES (Base & Relacionamento - Político) =====

function abrirPainelNovoEleitor() {
    document.getElementById('tituloPainelEleitor').innerText = "Cadastrar Novo Eleitor";
    document.getElementById('btnSalvarEleitor').innerText = "Salvar Eleitor";
    document.getElementById('editIdEleitor').value = "";
    limparFormularioEleitor();
    document.getElementById('painelCadastroEleitor').classList.add('mostrar');
}

function fecharPainelCadastroEleitor() {
    document.getElementById('painelCadastroEleitor').classList.remove('mostrar');
}

function limparFormularioEleitor() {
    document.getElementById('eleitorNome').value = '';
    document.getElementById('eleitorTelefone').value = '';
    document.getElementById('eleitorBairro').value = '';
    document.getElementById('eleitorStatus').value = 'indeciso';
    document.getElementById('eleitorObs').value = '';
    document.getElementById('erroNomeEleitor').style.display = 'none';
}

async function salvarEleitor() {
    const id = document.getElementById('editIdEleitor').value;
    const nome = document.getElementById('eleitorNome').value.trim();
    const telefone = document.getElementById('eleitorTelefone').value.trim();
    const bairro = document.getElementById('eleitorBairro').value.trim();
    const status = document.getElementById('eleitorStatus').value;
    const obs = document.getElementById('eleitorObs').value.trim();

    const erroNome = document.getElementById('erroNomeEleitor');
    if (!nome) {
        erroNome.style.display = 'block';
        return;
    }
    erroNome.style.display = 'none';

    const autorNome = usuarioAtualObj ? usuarioAtualObj.usuario : 'Admin';

    try {
        if (!id) {
            await db.collection('eleitores').add({
                nome, telefone, bairro, status, obs, cadastradoPor: autorNome
            });
            alert("Eleitor cadastrado com sucesso!");
        } else {
            await db.collection('eleitores').doc(id).update({
                nome, telefone, bairro, status, obs
            });
            alert("Eleitor atualizado com sucesso!");
        }
        fecharPainelCadastroEleitor();
    } catch (error) {
        console.error("Erro ao salvar eleitor: ", error);
        alert("Erro ao salvar no banco de dados.");
    }
}

function filtrarEleitores() {
    const inputBusca = document.getElementById('inputBuscaEleitor');
    const termo = inputBusca ? inputBusca.value.toLowerCase() : '';
    const lista = dadosEleitores.filter(e => e.nome.toLowerCase().includes(termo));
    renderizarTabelaEleitoresFiltrada(lista);
}

function renderizarTabelaEleitores() {
    filtrarEleitores();
}

function renderizarTabelaEleitoresFiltrada(lista) {
    const tbody = document.getElementById('tabelaEleitores');
    if (!tbody) return;
    tbody.innerHTML = '';

    const nomesStatus = { apoiador: '✅ Apoiador', indeciso: '🤔 Indeciso', contra: '❌ Contra' };

    lista.forEach((eleitor) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${eleitor.nome}</strong></td>
                <td>${eleitor.telefone || '-'}</td>
                <td>${eleitor.bairro || '-'}</td>
                <td>${nomesStatus[eleitor.status] || eleitor.status}</td>
                <td>${eleitor.obs || '-'}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="editarEleitor('${eleitor.id}')">✏️</button>
                    <button class="btn-icon" title="Excluir" onclick="excluirEleitor('${eleitor.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function editarEleitor(id) {
    const eleitor = dadosEleitores.find(e => e.id === id);
    if (!eleitor) return;

    document.getElementById('tituloPainelEleitor').innerText = "Editar Eleitor";
    document.getElementById('btnSalvarEleitor').innerText = "Atualizar Eleitor";
    document.getElementById('editIdEleitor').value = id;

    document.getElementById('eleitorNome').value = eleitor.nome;
    document.getElementById('eleitorTelefone').value = eleitor.telefone || '';
    document.getElementById('eleitorBairro').value = eleitor.bairro || '';
    document.getElementById('eleitorStatus').value = eleitor.status || 'indeciso';
    document.getElementById('eleitorObs').value = eleitor.obs || '';

    document.getElementById('painelCadastroEleitor').classList.add('mostrar');
}

async function excluirEleitor(id) {
    if (confirm("Deseja realmente excluir este eleitor?")) {
        try {
            await db.collection('eleitores').doc(id).delete();
        } catch (error) {
            console.error("Erro ao excluir eleitor: ", error);
        }
    }
}

async function salvarInvestimento() {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) {
        alert("Apenas administradores podem gerenciar investimentos.");
        return;
    }
    const desc = document.getElementById('invDescricao').value.trim();
    const val = parseFloat(document.getElementById('invValor').value) || 0;
    const data = document.getElementById('invData').value;

    if(!desc || val <= 0) {
        alert("Preencha a descrição e um valor válido.");
        return;
    }

    try {
        await db.collection('investimentos').add({ desc, val, data });
        document.getElementById('invDescricao').value = '';
        document.getElementById('invValor').value = '';
        document.getElementById('invData').valueAsDate = new Date();
        alert("Investimento registrado com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar investimento: ", error);
    }
}

function renderizarTabelaInvestimentos() {
    const tbody = document.getElementById('tabelaInvestimentos');
    if (!tbody) return;
    tbody.innerHTML = '';

    const selectAno = document.getElementById('filtroAnoFinanceiro');
    const anoSelecionado = selectAno ? parseInt(selectAno.value) : new Date().getFullYear();

    let itensExtrato = [];

    dadosInvestimentos.forEach((inv) => {
        if (inv.data) {
            const anoInv = new Date(inv.data + 'T00:00:00').getFullYear();
            if (anoInv === anoSelecionado) {
                itensExtrato.push({
                    tipo: 'Investimento',
                    descricao: inv.desc,
                    valor: inv.val,
                    data: inv.data,
                    cor: 'var(--danger-color)',
                    sinal: '- ',
                    id: inv.id,
                    origem: 'investimento'
                });
            }
        }
    });

    dadosLeads.forEach((lead) => {
        if ((lead.valor || 0) > 0 && lead.dataPagamento) {
            const anoLead = new Date(lead.dataPagamento + 'T00:00:00').getFullYear();
            if (anoLead === anoSelecionado) {
                itensExtrato.push({
                    tipo: 'Venda',
                    descricao: `${lead.nome} (${lead.servico || 'Serviço Geral'})`,
                    valor: lead.valor,
                    data: lead.dataPagamento,
                    cor: 'var(--success-color)',
                    sinal: '+ ',
                    id: lead.id,
                    origem: 'venda'
                });
            }
        }
    });

    itensExtrato.sort((a, b) => new Date(b.data) - new Date(a.data));

    itensExtrato.forEach((item) => {
        let dataFormatada = item.data ? item.data.split('-').reverse().join('/') : '-';
        
        let acaoBtn = item.origem === 'investimento' 
            ? `<button class="btn-icon" title="Excluir" onclick="excluirInvestimento('${item.id}')">🗑️</button>`
            : `<span style="color: #94a3b8; font-size: 11px;">Gerenciado em Leads</span>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>${item.tipo}</strong></td>
                <td>${item.descricao}</td>
                <td style="color: ${item.cor}; font-weight: bold;">${item.sinal}R$ ${Number(item.valor).toFixed(2)}</td>
                <td>${dataFormatada}</td>
                <td>${acaoBtn}</td>
            </tr>
        `;
    });

    if (itensExtrato.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">Nenhuma transação registrada no ano de ${anoSelecionado}.</td></tr>`;
    }
}

async function excluirInvestimento(id) {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) return;
    if (confirm("Deseja excluir este investimento?")) {
        try {
            await db.collection('investimentos').doc(id).delete();
        } catch (error) {
            console.error("Erro ao excluir investimento: ", error);
        }
    }
}

async function salvarFuncionario() {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) return;
    const id = document.getElementById('editFuncId').value;
    const nome = document.getElementById('funcNome').value.trim();
    const cargo = document.getElementById('funcCargo').value.trim();

    if(!nome) {
        alert("Preencha o nome do funcionário.");
        return;
    }

    try {
        if (!id) {
            await db.collection('funcionarios').add({ nome, cargo });
            alert("Funcionário cadastrado com sucesso!");
        } else {
            await db.collection('funcionarios').doc(id).update({ nome, cargo });
            alert("Funcionário atualizado com sucesso!");
            cancelarEdicaoFunc();
        }
        document.getElementById('funcNome').value = '';
        document.getElementById('funcCargo').value = '';
    } catch (error) {
        console.error("Erro ao salvar funcionário: ", error);
    }
}

function renderizarTabelaFuncionarios() {
    const tbody = document.getElementById('tabelaFuncionarios');
    if(!tbody) return;
    tbody.innerHTML = '';
    dadosFuncionarios.forEach((func) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${func.nome}</strong></td>
                <td>${func.cargo || '-'}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="editarFuncionario('${func.id}')">✏️</button>
                    <button class="btn-icon" title="Excluir" onclick="excluirFuncionario('${func.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function editarFuncionario(id) {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) return;
    const func = dadosFuncionarios.find(f => f.id === id);
    if (!func) return;

    document.getElementById('tituloPainelFunc').innerText = "Editar Funcionário";
    document.getElementById('btnSalvarFunc').innerText = "Atualizar Funcionário";
    document.getElementById('btnCancelarFunc').style.display = 'inline-block';
    document.getElementById('editFuncId').value = id;

    document.getElementById('funcNome').value = func.nome;
    document.getElementById('funcCargo').value = func.cargo || '';
}

function cancelarEdicaoFunc() {
    document.getElementById('tituloPainelFunc').innerText = "Cadastrar Funcionário";
    document.getElementById('btnSalvarFunc').innerText = "Cadastrar Funcionário";
    document.getElementById('btnCancelarFunc').style.display = 'none';
    document.getElementById('editFuncId').value = "";
    document.getElementById('funcNome').value = '';
    document.getElementById('funcCargo').value = '';
}

async function excluirFuncionario(id) {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) return;
    if (confirm("Deseja realmente excluir este funcionário?")) {
        try {
            await db.collection('funcionarios').doc(id).delete();
        } catch (error) {
            console.error("Erro ao excluir funcionário: ", error);
        }
    }
}

// Mostra/oculta o seletor de "Área de Acesso" — Administrador vê tudo,
// então esse campo só faz sentido pra conta de Funcionário.
function atualizarCampoArea() {
    const isAdminSelect = document.getElementById('novoUsuarioAdmin').value === 'true';
    const grupo = document.getElementById('grupoAreaAcesso');
    if (grupo) grupo.style.display = isAdminSelect ? 'none' : 'block';
}

async function criarContaFuncionario() {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) return;
    const u = document.getElementById('novoUsuarioLogin').value.trim();
    const s = document.getElementById('novoUsuarioSenha').value.trim();
    const isAdminSelect = document.getElementById('novoUsuarioAdmin').value === 'true';
    // Administrador tem acesso a todas as áreas (empresas + político);
    // funcionário fica restrito à área escolhida no select.
    const area = isAdminSelect ? 'todas' : document.getElementById('novoUsuarioArea').value;

    if (!u || !s) {
        alert("Preencha o usuário e a senha.");
        return;
    }

    if (usuariosCadastrados.some(item => item.usuario === u)) {
        alert("Este nome de usuário já existe!");
        return;
    }

    try {
        await db.collection('usuarios').add({ usuario: u, senha: s, admin: isAdminSelect, area: area });
        document.getElementById('novoUsuarioLogin').value = '';
        document.getElementById('novoUsuarioSenha').value = '';
        document.getElementById('novoUsuarioAdmin').value = 'false';
        atualizarCampoArea();
        alert("Conta criada com sucesso!");
    } catch (error) {
        console.error("Erro ao criar conta: ", error);
    }
}

function renderizarTabelaContas() {
    const tbody = document.getElementById('tabelaContas');
    if (!tbody) return;
    tbody.innerHTML = '';

    const nomesArea = { todas: 'Todas', empresas: 'Empresas', politico: 'Político' };

    usuariosCadastrados.forEach((item) => {
        let tipo = item.admin ? "Administrador (Acesso Total)" : "Funcionário (Acesso Restrito)";
        let area = nomesArea[item.area] || (item.admin ? 'Todas' : '—');

        // Impede que o usuário exclua a si mesmo acidentalmente
        let acoes = (usuarioAtualObj && usuarioAtualObj.usuario === item.usuario)
            ? `<span style="color: #94a3b8; font-size: 11px;">Conta Atual</span>`
            : `<button class="btn-icon" title="Excluir Conta" onclick="excluirConta('${item.id}')">🗑️</button>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>${item.usuario}</strong></td>
                <td>${tipo}</td>
                <td>${area}</td>
                <td>${acoes}</td>
            </tr>
        `;
    });
}

async function excluirConta(id) {
    if (!usuarioAtualObj || !usuarioAtualObj.admin) return;
    if (confirm("Deseja excluir esta conta de acesso?")) {
        try {
            await db.collection('usuarios').doc(id).delete();
        } catch (error) {
            console.error("Erro ao excluir conta: ", error);
        }
    }
}

function atualizarDashboard() {
    const totalLeads = dadosLeads.length;
    const quentes = dadosLeads.filter(l => l.temperatura === 'quente').length;
    const mornos = dadosLeads.filter(l => l.temperatura === 'morno').length;
    const frios = dadosLeads.filter(l => l.temperatura === 'frio').length;

    document.getElementById('lblTotalLeads').innerText = totalLeads;
    document.getElementById('lblQuentes').innerText = quentes;
    document.getElementById('lblMornos').innerText = mornos;
    document.getElementById('lblFrios').innerText = frios;

    document.getElementById('donutTotalVal').innerText = totalLeads;

    let pctQ = 0, pctM = 0, pctF = 0;
    if (totalLeads > 0) {
        pctQ = (quentes / totalLeads) * 100;
        pctM = (mornos / totalLeads) * 100;
        pctF = (frios / totalLeads) * 100;
    }

    document.getElementById('pctQuente').innerText = pctQ.toFixed(0) + '%';
    document.getElementById('pctMorno').innerText = pctM.toFixed(0) + '%';
    document.getElementById('pctFrio').innerText = pctF.toFixed(0) + '%';

    const degQ = (quentes / (totalLeads || 1)) * 360;
    const degM = degQ + (mornos / (totalLeads || 1)) * 360;

    const donutEl = document.getElementById('donutChartElement');
    if (totalLeads === 0) {
        donutEl.style.background = "#e2e8f0";
    } else {
        donutEl.style.background = `conic-gradient(
            #dc2626 0deg ${degQ}deg,
            #d97706 ${degQ}deg ${degM}deg,
            #0284c7 ${degM}deg 360deg
        )`;
    }

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let ganhoMes = 0;
    let ganhoAno = 0;

    dadosLeads.forEach(lead => {
        if(lead.dataPagamento) {
            const dataP = new Date(lead.dataPagamento + 'T00:00:00');
            const val = lead.valor || 0;
            if(dataP.getFullYear() === anoAtual) {
                ganhoAno += val;
                if(dataP.getMonth() === mesAtual) {
                    ganhoMes += val;
                }
            }
        }
    });

    document.getElementById('lblGanhoMes').innerText = `R$ ${ganhoMes.toFixed(2)}`;
    document.getElementById('lblGanhoAno').innerText = `R$ ${ganhoAno.toFixed(2)}`;

    const containerProdutividade = document.getElementById('listaProdutividadeFuncionarios');
    if (containerProdutividade) {
        containerProdutividade.innerHTML = '';
        
        let contagemUsuarios = {};
        dadosLeads.forEach(lead => {
            let autor = lead.cadastradoPor || 'Admin';
            contagemUsuarios[autor] = (contagemUsuarios[autor] || 0) + 1;
        });

        const chavesUsuarios = Object.keys(contagemUsuarios);
        if (chavesUsuarios.length === 0) {
            containerProdutividade.innerHTML = `<p style="color: #64748b; font-size: 13px;">Nenhum cadastro registrado ainda.</p>`;
        } else {
            chavesUsuarios.forEach(user => {
                let qtd = contagemUsuarios[user];
                containerProdutividade.innerHTML += `
                    <div class="temp-row-item">
                        <div class="temp-info-left">👤 ${user}</div>
                        <div style="font-weight: bold; color: var(--primary-color);">${qtd} ${qtd === 1 ? 'cadastro' : 'cadastros'}</div>
                    </div>
                `;
            });
        }
    }
}
