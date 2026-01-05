from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional

# Base comum
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[date] = None # Opcional
    due_date: date                    # Obrigatório (sem Optional, sem default)

# Criação (Frontend envia isso)
class TaskCreate(TaskBase):
    column_id: int 

# Atualização (Frontend envia isso ao editar)
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    column_id: Optional[int] = None

# Resposta (Backend devolve isso)
class TaskResponse(TaskBase):
    id: int
    column_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)