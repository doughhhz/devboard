from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# 1. Cria o motor (Engine) assíncrono
# echo=True faz o log de todos os comandos SQL (útil para debug, desligar em produção)
engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)

# 2. Configura a fábrica de sessões
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# 3. Dependência para Injeção (Dependency Injection)
# O FastAPI usará isso para dar um banco de dados para cada requisição
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()