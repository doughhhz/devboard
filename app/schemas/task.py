from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

# Base comum
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None

# O que o Frontend TEM que mandar para Criar
class TaskCreate(TaskBase):
    column_id: int  # <--- Verifique se isso está aqui! (Antes era board_id)

# O que o Frontend PODE mandar para Atualizar
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    column_id: Optional[int] = None

# O que o Backend DEVOLVE para o Frontend
class TaskResponse(TaskBase):
    id: int
    column_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)