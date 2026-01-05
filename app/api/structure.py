from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.db.session import get_db
from app.models.structure import Workspace, Board, Column
from app.schemas.structure import WorkspaceCreate, BoardCreate, WorkspaceResponse, BoardResponse, ColumnCreate, ColumnResponse

router = APIRouter()

# --- WORKSPACES ---
@router.post("/workspaces", response_model=WorkspaceResponse)
async def create_workspace(ws: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    new_ws = Workspace(title=ws.title, icon=ws.icon)
    db.add(new_ws)
    await db.commit()
    await db.refresh(new_ws)
    return new_ws

@router.get("/workspaces")
async def get_structure(db: AsyncSession = Depends(get_db)):
    # Retorna a árvore completa para a sidebar
    query = select(Workspace).options(selectinload(Workspace.boards))
    result = await db.execute(query)
    return result.scalars().all()

# --- BOARDS ---
@router.post("/boards", response_model=BoardResponse)
async def create_board(board: BoardCreate, db: AsyncSession = Depends(get_db)):
    new_board = Board(
        title=board.title,
        description=board.description,
        workspace_id=board.workspace_id
    )
    db.add(new_board)
    await db.commit()
    await db.refresh(new_board)
    return new_board

# --- DELETE WORKSPACE ---
@router.delete("/workspaces/{ws_id}", status_code=204)
async def delete_workspace(ws_id: int, db: AsyncSession = Depends(get_db)):
    ws = await db.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    
    await db.delete(ws)
    await db.commit()
    return None

# --- DELETE BOARD ---
@router.delete("/boards/{board_id}", status_code=204)
async def delete_board(board_id: int, db: AsyncSession = Depends(get_db)):
    board = await db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Quadro não encontrado")
    
    await db.delete(board)
    await db.commit()
    return None

# --- COLUMNS (LISTAS) ---
@router.post("/columns", response_model=ColumnResponse)
async def create_column(col: ColumnCreate, db: AsyncSession = Depends(get_db)):
    new_col = Column(
        title=col.title,
        order_index=col.order_index,
        board_id=col.board_id
    )
    db.add(new_col)
    await db.commit()
    await db.refresh(new_col)
    return new_col

@router.get("/boards/{board_id}/columns", response_model=list[ColumnResponse])
async def get_board_columns(board_id: int, db: AsyncSession = Depends(get_db)):
    query = select(Column).where(Column.board_id == board_id).order_by(Column.order_index)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/columns/{column_id}", status_code=204)
async def delete_column(column_id: int, db: AsyncSession = Depends(get_db)):
    col = await db.get(Column, column_id)
    if not col:
        raise HTTPException(status_code=404, detail="Lista não encontrada")
    await db.delete(col)
    await db.commit()
    return None