from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.models.task import Task
from app.models.structure import Column # <--- Importante: Importar Column
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter()

# 1. Rota para LISTAR tarefas (Corrigida com JOIN)
@router.get("/", response_model=List[TaskResponse])
async def read_tasks(board_id: int, db: AsyncSession = Depends(get_db)):
    # CORREÇÃO: Fazemos o Join com a tabela Column para filtrar pelo board_id dela
    query = select(Task).join(Column).where(Column.board_id == board_id)
    result = await db.execute(query)
    return result.scalars().all()

# 2. Rota para CRIAR tarefa
@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    new_task = Task(
        title=task.title,
        description=task.description,
        column_id=task.column_id # <--- Confirme que está assim
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

# 3. Rota para LER UMA tarefa
@router.get("/{task_id}", response_model=TaskResponse)
async def read_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return task

# 4. Rota para ATUALIZAR (Mover, Editar)
@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_update: TaskUpdate, db: AsyncSession = Depends(get_db)):
    db_task = await db.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    await db.commit()
    await db.refresh(db_task)
    return db_task

# 5. Rota para DELETAR
@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    db_task = await db.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    await db.delete(db_task)
    await db.commit()
    return None