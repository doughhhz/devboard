/**
 * DEVBOARD - Lógica Principal
 * Gerencia a navegação (Sidebar), o Quadro Kanban e as Configurações.
 */

const API_COLUMNS = "/api/columns";
const API_TASKS = "/tasks";
const API_WORKSPACES = "/api/workspaces";
const API_BOARDS = "/api/boards";
const API_SEED = "/api/seed"; // Rota opcional para criar dados de teste

let currentBoardId = null;

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    loadPreferences(); // Aplica tema salvo
    loadStructure();   // Carrega a sidebar
});

// ==========================================================================
// 1. GERENCIAMENTO DA ESTRUTURA (SIDEBAR)
// ==========================================================================

async function loadStructure() {
    try {
        const response = await fetch(API_WORKSPACES);
        const workspaces = await response.json();
        const sidebar = document.getElementById('sidebarContent');
        sidebar.innerHTML = '';

        if (workspaces.length === 0) {
            sidebar.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">Sem dados.</div>`;
            return;
        }

        workspaces.forEach(ws => {
            const wsDiv = document.createElement('div');
            wsDiv.className = 'workspace-item expanded'; // Começa expandido por padrão
            wsDiv.id = `ws-${ws.id}`;

            // 1. Cabeçalho do Workspace (Seta + Título + Ações)
            // Note o onclick no header para alternar (toggle)
            wsDiv.innerHTML = `
                <div class="workspace-header" onclick="toggleWorkspace(${ws.id})">
                    <div class="ws-title-container">
                        <span class="arrow-icon">▶</span>
                        <span>${ws.icon} ${ws.title}</span>
                    </div>
                    <div class="sidebar-actions" onclick="event.stopPropagation()">
                        <button class="btn-sidebar-icon" onclick="openBoardModal(${ws.id})" title="Novo Quadro">+</button>
                        <button class="btn-sidebar-icon danger" onclick="deleteWorkspace(${ws.id})" title="Excluir Área">🗑️</button>
                    </div>
                </div>
            `;

            // 2. Container dos Quadros (Collapsible)
            const boardsContainer = document.createElement('div');
            boardsContainer.className = 'boards-container';
            
            if (ws.boards && ws.boards.length > 0) {
                ws.boards.forEach(board => {
                    const boardDiv = document.createElement('div');
                    boardDiv.className = 'board-item';
                    boardDiv.id = `board-btn-${board.id}`;
                    
                    // Conteúdo do botão do board + Lixeira
                    boardDiv.innerHTML = `
                        <div onclick="selectBoard(${board.id}, '${board.title}', '${board.description || ''}')" style="flex-grow:1; display:flex; align-items:center;">
                            <span style="opacity:0.4; margin-right:8px;">#</span>
                            ${board.title}
                        </div>
                        <div class="sidebar-actions">
                            <button class="btn-sidebar-icon danger" onclick="deleteBoard(${board.id})" title="Excluir Quadro">×</button>
                        </div>
                    `;
                    boardsContainer.appendChild(boardDiv);
                });
            } else {
                boardsContainer.innerHTML = '<div style="padding:5px 20px 5px 35px; font-size:0.75rem; color:#555;">Vazio</div>';
            }

            wsDiv.appendChild(boardsContainer);
            sidebar.appendChild(wsDiv);
        });

        // Re-seleciona visualmente o quadro atual se existir
        if (currentBoardId) {
            const btn = document.getElementById(`board-btn-${currentBoardId}`);
            if (btn) btn.classList.add('active');
        }

    } catch (error) { console.error(error); }
}

// --- FUNÇÕES DE CONTROLE VISUAL ---

function toggleWorkspace(wsId) {
    const wsDiv = document.getElementById(`ws-${wsId}`);
    wsDiv.classList.toggle('expanded');
}

// --- FUNÇÕES DE EXCLUSÃO (DELETE) ---

async function deleteWorkspace(wsId) {
    if (!confirm("ATENÇÃO: Excluir a Área de Trabalho apagará TODOS os quadros e tarefas dentro dela.\n\nTem certeza absoluta?")) return;

    try {
        const res = await fetch(`${API_WORKSPACES}/${wsId}`, { method: 'DELETE' });
        if (res.ok) {
            // Se o quadro atual estava dentro deste workspace, limpa a tela
            // (Simplificação: recarregamos tudo, se o board sumir, tratamos depois)
            if (document.getElementById(`ws-${wsId}`).contains(document.getElementById(`board-btn-${currentBoardId}`))) {
                currentBoardId = null;
                document.getElementById('currentBoardTitle').innerText = "Selecione um Quadro";
                document.getElementById('todo').innerHTML = '';
                document.getElementById('doing').innerHTML = '';
                document.getElementById('done').innerHTML = '';
            }
            loadStructure();
        } else {
            alert("Erro ao excluir.");
        }
    } catch (e) { console.error(e); }
}

async function deleteBoard(boardId) {
    if (!confirm("Excluir este quadro e todas as suas tarefas?")) return;

    try {
        const res = await fetch(`${API_BOARDS}/${boardId}`, { method: 'DELETE' });
        if (res.ok) {
            if (currentBoardId === boardId) {
                currentBoardId = null;
                document.getElementById('currentBoardTitle').innerText = "Quadro Excluído";
                ['todo', 'doing', 'done'].forEach(id => document.getElementById(id).innerHTML = '');
            }
            loadStructure();
        }
    } catch (e) { console.error(e); }
}

function selectBoard(boardId, title, description) {
    currentBoardId = boardId;
    document.getElementById('currentBoardId').value = boardId;
    
    // Atualiza Header
    updateHeaderInfo(title, description || "Quadro de Projetos");

    // Atualiza Visual da Sidebar (Active State)
    document.querySelectorAll('.board-item').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById(`board-btn-${boardId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Carrega Tarefas
    fetchTasks();
}

function updateHeaderInfo(title, desc) {
    document.getElementById('currentBoardTitle').innerText = title;
    document.getElementById('currentBoardDesc').innerText = desc;
}

// ==========================================================================
// 2. KANBAN DINÂMICO (COLUNAS E TAREFAS)
// ==========================================================================

async function fetchTasks() {
    if (!currentBoardId) return;

    const boardContainer = document.getElementById('boardContainer');
    // Salva o botão de adicionar lista
    const addListWrapper = document.querySelector('.add-list-wrapper');
    const addListHtml = addListWrapper ? addListWrapper.outerHTML : ''; 
    
    // Mostra loading
    boardContainer.innerHTML = '<div style="color:white; padding:20px">Carregando quadro...</div>';

    try {
        console.log(`--- CARREGANDO QUADRO ${currentBoardId} ---`);

        // 1. Buscar Colunas
        const resCols = await fetch(`/api/boards/${currentBoardId}/columns`);
        const columns = await resCols.json();
        console.log("Colunas encontradas:", columns);

        // 2. Buscar Tarefas
        const resTasks = await fetch(`${API_TASKS}?board_id=${currentBoardId}`);
        const tasks = await resTasks.json();
        console.log("Tarefas encontradas:", tasks);

        // 3. Renderizar Colunas
        boardContainer.innerHTML = ''; // Limpa loading
        
        if (columns.length === 0) {
            boardContainer.innerHTML = '<div style="color:#aaa; padding:20px;">Este quadro não tem listas. Crie uma!</div>';
        }

        columns.forEach(col => {
            const colDiv = document.createElement('div');
            colDiv.className = 'column';
            colDiv.id = `col-${col.id}`; 
            
            // Note o ID da task-list: list-ID
            colDiv.innerHTML = `
                <div class="column-header">
                    <h2>${col.title}</h2>
                    <button onclick="deleteColumn(${col.id})" style="background:none; border:none; color:#555; cursor:pointer;">🗑️</button>
                </div>
                <div class="task-list" id="list-${col.id}" ondrop="drop(event)" ondragover="allowDrop(event)">
                    </div>
            `;
            boardContainer.appendChild(colDiv);
        });

        // Recoloca o botão de adicionar lista
        if (addListHtml) {
            const btnContainer = document.createElement('div');
            btnContainer.innerHTML = addListHtml;
            // Pega o primeiro filho (a div wrapper) e adiciona
            boardContainer.appendChild(btnContainer.firstElementChild);
        } else {
            // Caso tenha perdido o botão, recria (fallback)
            const btnWrapper = document.createElement('div');
            btnWrapper.className = 'add-list-wrapper';
            btnWrapper.innerHTML = `<button id="showAddListBtn" class="add-list-btn" onclick="showAddListForm()">+ Adicionar outra lista</button>...`; // (simplificado)
            boardContainer.appendChild(btnWrapper);
        }

        // 4. Distribuir Tarefas
        tasks.forEach(task => {
            console.log(`Tentando inserir Tarefa "${task.title}" (ID: ${task.id}) na Coluna ID: ${task.column_id}`);
            
            const listContainer = document.getElementById(`list-${task.column_id}`);
            
            if (listContainer) {
                const card = createCardElement(task);
                listContainer.appendChild(card);
                console.log("-> Sucesso!");
            } else {
                console.error(`-> ERRO: Coluna list-${task.column_id} não encontrada no HTML!`);
            }
        });

    } catch (error) {
        console.error("Erro fatal ao montar quadro:", error);
    }
}

// --- FUNÇÕES DE LISTA (COLUNA) ---

function showAddListForm() {
    document.getElementById('showAddListBtn').style.display = 'none';
    document.getElementById('addListForm').style.display = 'block';
    document.getElementById('newListTitle').focus();
}

function hideAddListForm() {
    document.getElementById('showAddListBtn').style.display = 'block';
    document.getElementById('addListForm').style.display = 'none';
}

async function createList() {
    const title = document.getElementById('newListTitle').value.trim();
    if (!title) return;

    try {
        await fetch(API_COLUMNS, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: title,
                board_id: currentBoardId,
                order_index: 99 // Simplificação: joga pro final
            })
        });
        fetchTasks(); // Recarrega tudo
    } catch (e) { console.error(e); }
}

async function deleteColumn(colId) {
    if(!confirm("Excluir esta lista e todas as tarefas nela?")) return;
    await fetch(`${API_COLUMNS}/${colId}`, { method: 'DELETE' });
    fetchTasks();
}



function createCardElement(task) {
    const div = document.createElement('div');
    div.className = 'card';
    div.draggable = true;
    div.id = `task-${task.id}`;
    div.dataset.id = task.id; // Guarda ID no elemento HTML
    
    // Eventos de Drag e Clique
    div.ondragstart = drag;
    div.ondblclick = () => openEditModal(task); // Duplo clique para editar

    // Conteúdo do Card
    // Corta a descrição se for muito longa para não poluir o card
    const shortDesc = task.description 
        ? (task.description.length > 60 ? task.description.substring(0, 60) + "..." : task.description)
        : "";

    div.innerHTML = `
        <h3>${task.title}</h3>
        ${shortDesc ? `<p>${shortDesc}</p>` : ''}
        <button class="btn-delete" onclick="event.stopPropagation(); deleteTask(${task.id})" title="Excluir Tarefa">Excluir</button>
    `;
    return div;
}

// --- Drag & Drop (Nativo HTML5) ---

function allowDrop(ev) {
    ev.preventDefault(); // Necessário para permitir o drop
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.dataTransfer.effectAllowed = "move";
}

async function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const card = document.getElementById(data);
    
    let target = ev.target;
    // Sobe até achar a div .task-list que tem o id "list-{ID}"
    while (!target.classList.contains('task-list')) {
        target = target.parentNode;
        if (!target || target.tagName === 'BODY') return;
    }
    
    // O id do target é "list-5", pegamos o 5
    const newColumnId = target.id.replace('list-', '');

    // Move visualmente
    target.appendChild(card);

    // Salva no Backend (mudou de column_status string para column_id int)
    await updateTaskStatus(card.dataset.id, parseInt(newColumnId));
}

async function updateTaskStatus(taskId, newColumnId) {
    await fetch(`${API_TASKS}/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_id: newColumnId })
    });
}

// ==========================================================================
// 3. CRIAÇÃO E EDIÇÃO (MODAIS)
// ==========================================================================

// --- WORKSPACE ---
const wsModal = document.getElementById('workspaceModal');
function openWorkspaceModal() { 
    document.getElementById('newWsTitle').value = "";
    document.getElementById('newWsIcon').value = "";
    wsModal.style.display = 'block';
    document.getElementById('newWsTitle').focus();
}
function closeWorkspaceModal() { wsModal.style.display = 'none'; }

async function createWorkspace() {
    const title = document.getElementById('newWsTitle').value.trim();
    const icon = document.getElementById('newWsIcon').value.trim() || "💼";

    if (!title) return alert("Digite um nome para a Área de Trabalho.");

    await fetch(API_WORKSPACES, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, icon })
    });
    
    closeWorkspaceModal();
    loadStructure(); // Recarrega menu lateral
}

// --- BOARD (QUADRO) ---
const boardModal = document.getElementById('boardModal');
function openBoardModal(wsId) { 
    document.getElementById('targetWsId').value = wsId;
    document.getElementById('newBoardTitle').value = "";
    document.getElementById('newBoardDesc').value = "";
    boardModal.style.display = 'block'; 
    document.getElementById('newBoardTitle').focus();
}
function closeBoardModal() { boardModal.style.display = 'none'; }

async function createBoard() {
    const title = document.getElementById('newBoardTitle').value.trim();
    const desc = document.getElementById('newBoardDesc').value.trim();
    const wsId = document.getElementById('targetWsId').value;

    if (!title) return alert("O quadro precisa de um nome.");

    const res = await fetch(API_BOARDS, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            title: title, 
            description: desc, 
            workspace_id: wsId 
        })
    });
    
    if (res.ok) {
        const newBoard = await res.json();
        closeBoardModal();
        await loadStructure(); // Atualiza menu
        selectBoard(newBoard.id, newBoard.title, newBoard.description); // Já seleciona o novo
    }
}

// --- TAREFAS (TASK) ---
const editModal = document.getElementById("editModal");

function openCreateModal() {
    if (!currentBoardId) return alert("Por favor, crie ou selecione um Quadro primeiro!");
    
    document.getElementById("modalTitle").innerText = "Nova Tarefa";
    document.getElementById("editTaskId").value = ""; // Vazio = Criar
    document.getElementById("editTitle").value = "";
    document.getElementById("editDescription").value = "";
    
    editModal.style.display = "block";
    document.getElementById("editTitle").focus();
}

function openEditModal(task) {
    document.getElementById("modalTitle").innerText = "Editar Tarefa";
    document.getElementById("editTaskId").value = task.id; // Com ID = Editar
    document.getElementById("editTitle").value = task.title;
    document.getElementById("editDescription").value = task.description || "";
    
    editModal.style.display = "block";
}

function closeModal() {
    editModal.style.display = "none";
}

async function saveEdit() {
    // ... (mesmo código de pegar valores) ...
    const id = document.getElementById("editTaskId").value;
    const title = document.getElementById("editTitle").value;
    const description = document.getElementById("editDescription").value;
    
    const payload = { title, description };

    if (id) {
        await fetch(`${API_TASKS}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } else {
        // PRECISAMOS DESCOBRIR A PRIMEIRA COLUNA
        // Truque: Olhamos pro DOM já renderizado
        const firstColumn = document.querySelector('.task-list');
        if (!firstColumn) return alert("Crie uma lista antes de criar tarefas!");
        
        const firstColId = firstColumn.id.replace('list-', '');
        
        payload.column_id = parseInt(firstColId); // <--- Usa o ID da primeira coluna
        
        await fetch(API_TASKS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
    
    closeModal();
    fetchTasks();
}

async function deleteTask(id) {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    await fetch(`${API_TASKS}/${id}`, { method: 'DELETE' });
    fetchTasks();
}

// ==========================================================================
// 4. CONFIGURAÇÕES E UTILITÁRIOS
// ==========================================================================

// Seed Data (Dados de Exemplo)
async function seedData() {
    if(!confirm("Isso criará uma estrutura de exemplo (Empresa > Projetos). Continuar?")) return;
    try {
        await fetch(API_SEED, { method: 'POST' });
        loadStructure();
    } catch (error) {
        alert("Erro ao criar dados. Verifique se o backend tem a rota /api/seed");
    }
}

// Configurações de Tema (Settings)
const settingsModal = document.getElementById("settingsModal");
const root = document.documentElement;

function openSettings() {
    // Carrega valores atuais nos inputs
    const currentAccent = getComputedStyle(root).getPropertyValue('--accent-color').trim();
    const currentBg = getComputedStyle(root).getPropertyValue('--bg-image');
    
    document.getElementById("accentColorPicker").value = currentAccent;
    
    // Limpa a string 'url("...")' para mostrar só o link
    const urlClean = currentBg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
    document.getElementById("bgImageInput").value = urlClean.startsWith('http') ? urlClean : '';
    
    settingsModal.style.display = "block";
}

function closeSettings() {
    settingsModal.style.display = "none";
}

function updateTheme() {
    const newAccent = document.getElementById("accentColorPicker").value;
    const newBg = document.getElementById("bgImageInput").value;

    // Atualiza CSS
    root.style.setProperty('--accent-color', newAccent);
    // Cria um brilho com 30% de opacidade baseado na cor escolhida
    root.style.setProperty('--accent-glow', `0 0 15px ${newAccent}4d`);

    if (newBg) {
        root.style.setProperty('--bg-image', `url('${newBg}')`);
    }

    // Persiste no LocalStorage
    localStorage.setItem('devboard_accent', newAccent);
    localStorage.setItem('devboard_bg', newBg);
}

function resetTheme() {
    if(!confirm("Voltar ao tema original?")) return;
    localStorage.removeItem('devboard_accent');
    localStorage.removeItem('devboard_bg');
    location.reload(); // Recarrega para pegar os padrões do CSS
}

function loadPreferences() {
    const savedAccent = localStorage.getItem('devboard_accent');
    const savedBg = localStorage.getItem('devboard_bg');

    if (savedAccent) {
        root.style.setProperty('--accent-color', savedAccent);
        root.style.setProperty('--accent-glow', `0 0 15px ${savedAccent}4d`);
    }
    if (savedBg) {
        root.style.setProperty('--bg-image', `url('${savedBg}')`);
    }
}

// Fechar modais ao clicar fora da janela (backdrop)
window.onclick = function(event) {
    if (event.target == settingsModal) closeSettings();
    if (event.target == editModal) closeModal();
    if (event.target == wsModal) closeWorkspaceModal();
    if (event.target == boardModal) closeBoardModal();
}