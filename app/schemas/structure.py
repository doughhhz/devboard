from pydantic import BaseModel
from typing import Optional, List

# --- WORKSPACE ---
class WorkspaceBase(BaseModel):
    title: str
    icon: str = "💼"

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceResponse(WorkspaceBase):
    id: int
    class Config:
        from_attributes = True

# --- BOARD ---
class BoardBase(BaseModel):
    title: str
    description: Optional[str] = None

class BoardCreate(BoardBase):
    workspace_id: int

class BoardResponse(BoardBase):
    id: int
    class Config:
        from_attributes = True

# --- COLUMN (LISTA) ---
class ColumnBase(BaseModel):
    title: str
    order_index: int = 0

class ColumnCreate(ColumnBase):
    board_id: int

class ColumnResponse(ColumnBase):
    id: int
    class Config:
        from_attributes = True