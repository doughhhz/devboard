from typing import TYPE_CHECKING
from datetime import date, datetime
from sqlalchemy import String, Text, func, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.structure import Column

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # NOVOS CAMPOS
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False) # Obrigatório (nullable=False)

    column_id: Mapped[int] = mapped_column(ForeignKey("columns.id"))
    column: Mapped["Column"] = relationship(back_populates="tasks")

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())