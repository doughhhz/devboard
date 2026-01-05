from typing import List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.task import Task

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(50))
    icon: Mapped[str] = mapped_column(String(10), default="💼")

    # CASCADE IMPORTANTE: Se apagar Workspace, apaga Boards
    boards: Mapped[List["Board"]] = relationship(
        back_populates="workspace", 
        cascade="all, delete-orphan" 
    )

class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))

    workspace: Mapped["Workspace"] = relationship(back_populates="boards")
    
    # CASCADE IMPORTANTE: Se apagar Board, apaga Colunas
    columns: Mapped[List["Column"]] = relationship(
        back_populates="board", 
        cascade="all, delete-orphan",
        order_by="Column.order_index"
    )

class Column(Base):
    __tablename__ = "columns"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(50))
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id"))
    board: Mapped["Board"] = relationship(back_populates="columns")
    
    # CASCADE IMPORTANTE: Se apagar Coluna, apaga Tarefas
    tasks: Mapped[List["Task"]] = relationship(
        back_populates="column", 
        cascade="all, delete-orphan"
    )