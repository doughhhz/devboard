/**
 * DEVBOARD v1.1 - Lógica Completa
 * Inclui: Custom Alerts, CRUD de Estrutura, Checkboxes, Drag & Drop e Temas.
 */

const API_TASKS = "/tasks";
const API_WORKSPACES = "/api/workspaces";
const API_BOARDS = "/api/boards";
const API_COLUMNS = "/api/columns";
const API_SEED = "/api/seed";

let currentBoardId = null;

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    loadPreferences();
    loadStructure();
});

// ==========================================================================
// 1. SISTEMA DE ALERTAS CUSTOMIZADOS (CORRIGIDO)
// ==========================================================================

const customAlertOverlay = document.getElementById("customAlert");
const alertTitle = document.getElementById("alertTitle");
const alertMessage = document.getElementById("alertMessage");
const btnConfirm = document.getElementById("btnAlertConfirm");
const btnCancel = document.getElementById("btnAlertCancel");

// Função para Confirmação (Sim/Não)
function showConfirm(title, msg, onConfirm) {
    alertTitle.innerText = title;
    alertMessage.innerText = msg;
    
    btnCancel.style.display = "inline-block";
    btnConfirm.innerText = "Confirmar";
    
    // CORREÇÃO: Não clonamos mais o botão. Apenas sobrescrevemos o evento.
    // Isso garante que a variável 'btnConfirm' sempre aponte para o elemento real na tela.
    btnConfirm.onclick = () => {
        onConfirm();
        closeCustomAlert();
    };
    
    customAlertOverlay.style.display = "flex";
}

// Função para Alerta Simples (OK)
function showAlert(title, msg) {
    alertTitle.innerText = title;
    alertMessage.innerText = msg;
    
    btnCancel.style.display = "none";
    btnConfirm.innerText = "OK";
    
    // CORREÇÃO: Sobrescrevemos o evento para apenas fechar
    btnConfirm.onclick = closeCustomAlert;
    
    customAlertOverlay.style.display = "flex";
}

function closeCustomAlert() {
    customAlertOverlay.style.display = "none";
    
    // Boa prática: Limpar o evento ao fechar para evitar disparos acidentais
    btnConfirm.onclick = null; 
}

// ==========================================================================
// 2. SIDEBAR E ESTRUTURA (Com Edição e Exclusão)
// ==========================================================================

async function loadStructure() {
    try {
        const response = await fetch(API_WORKSPACES);
        const workspaces = await response.json();
        const sidebar = document.getElementById('sidebarContent');
        sidebar.innerHTML = '';

        if (workspaces.length === 0) {
            sidebar.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">Sem dados.<br>Crie uma área nova ou restaure o backup abaixo.</div>`;
            return;
        }

        workspaces.forEach(ws => {
            const wsDiv = document.createElement('div');
            wsDiv.className = 'workspace-item expanded'; // Expandido por padrão
            wsDiv.id = `ws-${ws.id}`;

            // Cabeçalho do Workspace
            wsDiv.innerHTML = `
                <div class="workspace-header">
                    <div class="ws-title-container" onclick="toggleWorkspace(${ws.id})">
                        <span class="arrow-icon">▼</span>
                        <span>${ws.icon} ${ws.title}</span>
                    </div>
                    <div class="sidebar-actions">
                        <button class="btn-sidebar-icon" onclick="openEditWsModal(${ws.id}, '${ws.title}', '${ws.icon}')" title="Editar Área">✎</button>
                        <button class="btn-sidebar-icon" onclick="openBoardModal(${ws.id})" title="Novo Quadro">+</button>
                        <button class="btn-sidebar-icon danger" onclick="confirmDeleteWorkspace(${ws.id})" title="Excluir Área">🗑️</button>
                    </div>
                </div>
            `;

            // Container de Boards
            const boardsContainer = document.createElement('div');
            boardsContainer.className = 'boards-container';
            
            if (ws.boards && ws.boards.length > 0) {
                ws.boards.forEach(board => {
                    const boardDiv = document.createElement('div');
                    boardDiv.className = 'board-item';
                    boardDiv.id = `board-btn-${board.id}`;
                    
                    // Tratamento para descrição null
                    const safeDesc = board.description ? board.description.replace(/'/g, "\\'") : "";

                    boardDiv.innerHTML = `
                        <div onclick="selectBoard(${board.id}, '${board.title}', '${safeDesc}')" style="flex-grow:1; display:flex; align-items:center; cursor:pointer">
                            <span style="opacity:0.4; margin-right:8px;">#</span>
                            ${board.title}
                        </div>
                        <div class="sidebar-actions">
                            <button class="btn-sidebar-icon" onclick="openEditBoardModal(${board.id}, '${board.title}', '${safeDesc}')" title="Editar Quadro">✎</button>
                            <button class="btn-sidebar-icon danger" onclick="confirmDeleteBoard(${board.id})" title="Excluir Quadro">×</button>
                        </div>
                    `;
                    boardsContainer.appendChild(boardDiv);
                });
            } else {
                boardsContainer.innerHTML = '<div style="padding:5px 20px; color:#555; font-size:0.8rem; font-style:italic;">Sem quadros</div>';
            }

            wsDiv.appendChild(boardsContainer);
            sidebar.appendChild(wsDiv);
        });

        // Mantém seleção ativa após refresh
        if (currentBoardId) {
            const btn = document.getElementById(`board-btn-${currentBoardId}`);
            if (btn) btn.classList.add('active');
        } else if (workspaces[0]?.boards?.length > 0) {
            // Seleciona o primeiro automaticamente
            const first = workspaces[0].boards[0];
            selectBoard(first.id, first.title, first.description);
        }

    } catch (error) { console.error("Erro estrutura:", error); }
}

function toggleWorkspace(wsId) {
    const wsDiv = document.getElementById(`ws-${wsId}`);
    wsDiv.classList.toggle('expanded');
}

function selectBoard(boardId, title, description) {
    currentBoardId = boardId;
    document.getElementById('currentBoardId').value = boardId;
    updateHeaderInfo(title, description);

    // Visual Active
    document.querySelectorAll('.board-item').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById(`board-btn-${boardId}`);
    if (activeBtn) activeBtn.classList.add('active');

    fetchTasks();
}

function updateHeaderInfo(title, desc) {
    document.getElementById('currentBoardTitle').innerText = title;
    document.getElementById('currentBoardDesc').innerText = desc && desc !== 'null' ? desc : "Gerencie suas tarefas";
}

// ==========================================================================
// 3. LOGICA DE EDIÇÃO (CRUD WORKSPACES & BOARDS)
// ==========================================================================

// --- WORKSPACE ---
const wsModal = document.getElementById('workspaceModal'); // Modal de Criação
const editWsModal = document.getElementById('editWsModal'); // Modal de Edição

// Criar
function openWorkspaceModal() { 
    document.getElementById('newWsTitle').value = "";
    document.getElementById('newWsIcon').value = "";
    wsModal.style.display = 'block'; 
}
function closeWorkspaceModal() { wsModal.style.display = 'none'; }

async function createWorkspace() {
    const title = document.getElementById('newWsTitle').value;
    const icon = document.getElementById('newWsIcon').value || "💼";
    if(!title) return showAlert("Erro", "Nome obrigatório");
    
    await fetch(API_WORKSPACES, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title, icon })});
    closeWorkspaceModal();
    loadStructure();
}

// Editar
function openEditWsModal(id, title, icon) {
    document.getElementById('editWsId').value = id;
    document.getElementById('editWsTitle').value = title;
    document.getElementById('editWsIcon').value = icon;
    editWsModal.style.display = 'block';
}
function closeEditWsModal() { editWsModal.style.display = 'none'; }

async function saveWsEdit() {
    const id = document.getElementById('editWsId').value;
    const title = document.getElementById('editWsTitle').value;
    const icon = document.getElementById('editWsIcon').value;

    await fetch(`${API_WORKSPACES}/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, icon })
    });
    closeEditWsModal();
    loadStructure();
}

// --- BOARD ---
const boardModal = document.getElementById('boardModal'); // Modal de Criação
const editBoardModal = document.getElementById('editBoardModal'); // Modal de Edição

// Criar
function openBoardModal(wsId) { 
    document.getElementById('targetWsId').value = wsId; 
    document.getElementById('newBoardTitle').value = "";
    document.getElementById('newBoardDesc').value = "";
    boardModal.style.display = 'block'; 
}
function closeBoardModal() { boardModal.style.display = 'none'; }

async function createBoard() {
    const title = document.getElementById('newBoardTitle').value;
    const desc = document.getElementById('newBoardDesc').value;
    const wsId = document.getElementById('targetWsId').value;
    if(!title) return showAlert("Erro", "Nome obrigatório");
    
    await fetch(API_BOARDS, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title, description: desc, workspace_id: wsId })});
    closeBoardModal();
    loadStructure();
}

// Editar
function openEditBoardModal(id, title, desc) {
    document.getElementById('editBoardId').value = id;
    document.getElementById('editBoardTitleInput').value = title;
    document.getElementById('editBoardDescInput').value = desc === 'null' || !desc ? '' : desc;
    editBoardModal.style.display = 'block';
}
function closeEditBoardModal() { editBoardModal.style.display = 'none'; }

async function saveBoardEdit() {
    const id = document.getElementById('editBoardId').value;
    const title = document.getElementById('editBoardTitleInput').value;
    const description = document.getElementById('editBoardDescInput').value;

    await fetch(`${API_BOARDS}/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, description })
    });
    
    if (currentBoardId == id) updateHeaderInfo(title, description);
    
    closeEditBoardModal();
    loadStructure();
}

// ==========================================================================
// 4. DELEÇÃO (COM CUSTOM ALERT)
// ==========================================================================

function confirmDeleteWorkspace(id) {
    showConfirm("Excluir Área?", "Isso apagará TODOS os quadros e tarefas dentro dela. Não há volta.", async () => {
        await fetch(`${API_WORKSPACES}/${id}`, { method: 'DELETE' });
        if (currentBoardId) location.reload(); 
        else loadStructure();
    });
}

function confirmDeleteBoard(id) {
    showConfirm("Excluir Quadro?", "Todas as tarefas serão perdidas.", async () => {
        await fetch(`${API_BOARDS}/${id}`, { method: 'DELETE' });
        if (currentBoardId == id) location.reload();
        else loadStructure();
    });
}

function confirmDeleteColumn(id) {
    showConfirm("Excluir Lista?", "As tarefas desta lista serão apagadas.", async () => {
        await fetch(`${API_COLUMNS}/${id}`, { method: 'DELETE' });
        fetchTasks();
    });
}

function confirmDeleteTask(id) {
    showConfirm("Excluir Tarefa?", "Tem certeza?", async () => {
        await fetch(`${API_TASKS}/${id}`, { method: 'DELETE' });
        fetchTasks();
    });
}

// ==========================================================================
// 5. KANBAN, CHECKBOXES E TAREFAS
// ==========================================================================

async function fetchTasks() {
    if (!currentBoardId) return;

    const boardContainer = document.getElementById('boardContainer');
    
    // Salva botão de adicionar lista para restaurar
    const addListWrapper = document.querySelector('.add-list-wrapper');
    const addListHtml = addListWrapper ? addListWrapper.outerHTML : null; 

    try {
        const resCols = await fetch(`${API_BOARDS}/${currentBoardId}/columns`);
        const columns = await resCols.json();
        
        const resTasks = await fetch(`${API_TASKS}?board_id=${currentBoardId}`);
        const tasks = await resTasks.json();

        boardContainer.innerHTML = '';
        
        // Renderiza Colunas
        columns.forEach(col => {
            const colDiv = document.createElement('div');
            colDiv.className = 'column';
            colDiv.id = `col-${col.id}`;
            
            colDiv.innerHTML = `
                <div class="column-header">
                    <h2>${col.title}</h2>
                    <button onclick="confirmDeleteColumn(${col.id})" title="Excluir Lista" style="background:none; border:none; color:#555; cursor:pointer;">🗑️</button>
                </div>
                <div class="task-list" id="list-${col.id}" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
            `;
            boardContainer.appendChild(colDiv);
        });

        // Restaura botão de adicionar lista
        if (addListHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = addListHtml;
            boardContainer.appendChild(tempDiv.firstElementChild);
        } else {
             // Fallback
             const div = document.createElement('div');
             div.className = 'add-list-wrapper';
             div.innerHTML = `
                <button id="showAddListBtn" class="add-list-btn" onclick="showAddListForm()">+ Adicionar outra lista</button>
                <div id="addListForm" class="new-list-form" style="display:none; min-width: 280px; background: #2d2d2d; padding: 10px; border-radius: 12px; border: 1px solid #444;">
                    <input type="text" id="newListTitle" placeholder="Título..." style="width:100%; padding:8px; margin-bottom:8px; border-radius:4px; border:1px solid #555; background:#111; color:white;">
                    <div style="display: flex; gap: 5px;">
                        <button onclick="createList()" style="background: var(--accent-color); color:black; font-weight:bold; padding:8px; border-radius:4px; border:none; cursor:pointer; flex-grow:1;">Salvar</button>
                        <button onclick="hideAddListForm()" style="background:transparent; border:none; color:#aaa; cursor:pointer;">×</button>
                    </div>
                </div>`;
             boardContainer.appendChild(div);
        }

        // Renderiza Tarefas
        tasks.forEach(task => {
            const listContainer = document.getElementById(`list-${task.column_id}`);
            if (listContainer) {
                listContainer.appendChild(createCardElement(task));
            }
        });

    } catch (e) { console.error("Erro renderizando board:", e); }
}

function createCardElement(task) {
    const div = document.createElement('div');
    div.className = 'card';
    div.draggable = true;
    div.id = `task-${task.id}`;
    div.dataset.id = task.id;
    
    div.ondragstart = drag;
    div.ondblclick = () => openEditTaskModal(task);

    const descShort = task.description ? (task.description.length > 50 ? task.description.substring(0,50) + "..." : task.description) : "";

    div.innerHTML = `
        <div class="card-header-flex">
            <label class="task-check-wrapper" onclick="event.stopPropagation()">
                <input type="checkbox">
                <span class="checkmark"></span>
            </label>
            <h3 style="margin:0; flex-grow:1; font-size: 1rem;">${task.title}</h3>
        </div>
        ${descShort ? `<p style="margin-left: 32px; margin-top:5px; color:#aaa; font-size:0.85rem;">${descShort}</p>` : ''}
        <div style="text-align:right; margin-top:10px;">
             <button class="btn-delete" onclick="event.stopPropagation(); confirmDeleteTask(${task.id})">Excluir</button>
        </div>
    `;
    return div;
}

// --- DRAG AND DROP ---
function allowDrop(ev) { ev.preventDefault(); }
function drag(ev) { ev.dataTransfer.setData("text", ev.target.id); }

async function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const card = document.getElementById(data);
    
    let target = ev.target;
    // Sobe no DOM até achar a lista
    while (!target.classList.contains('task-list')) {
        target = target.parentNode;
        if (!target || target.tagName === 'BODY') return;
    }
    
    // Move visualmente
    target.appendChild(card);
    
    // Salva no banco
    const newColId = target.id.replace('list-', '');
    await fetch(`${API_TASKS}/${card.dataset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column_id: parseInt(newColId) })
    });
}

// --- EDITAR/CRIAR TAREFA (MODAL) ---
// --- EDITAR/CRIAR TAREFA (MODAL) ---
const editModal = document.getElementById("editModal");

function openCreateModal() { 
    if(!currentBoardId) return showAlert("Ops", "Selecione um quadro primeiro!");
    
    document.getElementById("modalTitle").innerText = "Nova Tarefa";
    document.getElementById("editTaskId").value = "";
    
    // Limpar campos
    document.getElementById("editTitle").value = "";
    document.getElementById("editDescription").value = "";
    document.getElementById("editStartDate").value = "";
    document.getElementById("editDueDate").value = ""; // Importante limpar
    
    editModal.style.display = "block";
    document.getElementById("editTitle").focus();
}

function openEditTaskModal(task) {
    document.getElementById("modalTitle").innerText = "Editar Tarefa";
    document.getElementById("editTaskId").value = task.id;
    document.getElementById("editTitle").value = task.title;
    document.getElementById("editDescription").value = task.description || "";
    
    // Preencher datas (Se existirem)
    document.getElementById("editStartDate").value = task.start_date || "";
    document.getElementById("editDueDate").value = task.due_date || "";
    
    editModal.style.display = "block";
}

function closeModal() { editModal.style.display = "none"; }

async function saveEdit() {
    const id = document.getElementById("editTaskId").value;
    const title = document.getElementById("editTitle").value.trim();
    const description = document.getElementById("editDescription").value.trim();
    
    // Capturar novas datas
    const startDate = document.getElementById("editStartDate").value;
    const dueDate = document.getElementById("editDueDate").value;
    
    // Validação
    if(!title) return showAlert("Atenção", "O título é obrigatório");
    if(!dueDate) return showAlert("Atenção", "A Data de Vencimento é obrigatória!");

    // Montar Payload
    const payload = { 
        title, 
        description,
        start_date: startDate || null, // Envia null se estiver vazio
        due_date: dueDate
    };

    try {
        if (id) {
            // Editar
            await fetch(`${API_TASKS}/${id}`, { 
                method: 'PATCH', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(payload)
            });
        } else {
            // Criar
            const firstCol = document.querySelector('.task-list');
            if(!firstCol) return showAlert("Erro", "Crie uma lista (coluna) antes de adicionar tarefas!");
            
            payload.column_id = parseInt(firstCol.id.replace('list-', ''));
            
            await fetch(API_TASKS, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(payload)
            });
        }
        closeModal();
        fetchTasks();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        showAlert("Erro", "Falha ao salvar tarefa.");
    }
}

// --- COLUNAS (LISTAS) ---
function showAddListForm() { document.getElementById('addListForm').style.display = 'block'; document.getElementById('showAddListBtn').style.display = 'none'; document.getElementById('newListTitle').focus(); }
function hideAddListForm() { document.getElementById('addListForm').style.display = 'none'; document.getElementById('showAddListBtn').style.display = 'block'; }

async function createList() {
    const title = document.getElementById('newListTitle').value;
    if(!title) return;
    
    await fetch(API_COLUMNS, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ title, board_id: currentBoardId, order_index: 99 })
    });
    fetchTasks();
}

// ==========================================================================
// 6. CONFIGURAÇÕES E UTILITÁRIOS
// ==========================================================================

async function seedData() {
    showConfirm("Restaurar dados?", "Isso criará uma estrutura de exemplo.", async () => {
        await fetch(API_SEED, { method: 'POST' });
        loadStructure();
    });
}

// Configurações (Tema)
const settingsModal = document.getElementById("settingsModal");
const root = document.documentElement;

function openSettings() {
    const currentAccent = getComputedStyle(root).getPropertyValue('--accent-color').trim();
    const currentBg = getComputedStyle(root).getPropertyValue('--bg-image');
    
    document.getElementById("accentColorPicker").value = currentAccent;
    const urlClean = currentBg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
    document.getElementById("bgImageInput").value = urlClean.startsWith('http') ? urlClean : '';
    
    settingsModal.style.display = "block";
}
function closeSettings() { settingsModal.style.display = "none"; }

function updateTheme() {
    const newAccent = document.getElementById("accentColorPicker").value;
    const newBg = document.getElementById("bgImageInput").value;

    root.style.setProperty('--accent-color', newAccent);
    root.style.setProperty('--accent-glow', `0 0 15px ${newAccent}4d`);

    if (newBg) root.style.setProperty('--bg-image', `url('${newBg}')`);

    localStorage.setItem('devboard_accent', newAccent);
    localStorage.setItem('devboard_bg', newBg);
}

function resetTheme() {
    showConfirm("Resetar tema?", "Voltar às cores originais?", () => {
        localStorage.removeItem('devboard_accent');
        localStorage.removeItem('devboard_bg');
        location.reload();
    });
}

function loadPreferences() {
    const savedAccent = localStorage.getItem('devboard_accent');
    const savedBg = localStorage.getItem('devboard_bg');
    if (savedAccent) {
        root.style.setProperty('--accent-color', savedAccent);
        root.style.setProperty('--accent-glow', `0 0 15px ${savedAccent}4d`);
    }
    if (savedBg) root.style.setProperty('--bg-image', `url('${savedBg}')`);
}

// Fechar modais ao clicar fora
window.onclick = function(event) {
    if (event.target == settingsModal) closeSettings();
    if (event.target == editModal) closeModal();
    if (event.target == wsModal) closeWorkspaceModal();
    if (event.target == boardModal) closeBoardModal();
    if (event.target == editWsModal) closeEditWsModal();
    if (event.target == editBoardModal) closeEditBoardModal();
    if (event.target == customAlertOverlay) closeCustomAlert();
}