from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates # <--- Importar Jinja2
from app.core.config import settings
from app.api import tasks, structure

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rotas da API
    application.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])

    application.include_router(structure.router, prefix="/api", tags=["Structure"])
    
    # Arquivos Estáticos (CSS/JS)
    application.mount("/static", StaticFiles(directory="app/static"), name="static")

    return application

app = create_application()
templates = Jinja2Templates(directory="app/templates") # <--- Configurar pasta

# Rota Principal (Frontend)
@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Health Check (movi para /health para não conflitar com a home)
@app.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "online"}