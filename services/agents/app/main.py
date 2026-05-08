import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.auth import AuthMiddleware
from app.middleware.sap_proxy import SAPProxyMiddleware
from app.routers import auth, chat, health
from app.sap.session import SAPSession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create SAP session manager
    app.state.sap_session = SAPSession()
    logger.info("SAP session manager initialized")
    yield
    # Shutdown: clean up SAP session
    await app.state.sap_session.close()
    logger.info("SAP session manager closed")


app = FastAPI(
    title="VK Agents",
    description="SAP Business One AI Agent Service",
    version="0.1.0",
    lifespan=lifespan,
)

# --- Middleware stack (applied bottom-to-top) ---

# CORS — allow NextJS frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.nextjs_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth validation — rejects unauthenticated requests (except /auth/*, /health*)
app.add_middleware(AuthMiddleware)

# SAP proxy — session keep-alive, request logging
app.add_middleware(SAPProxyMiddleware)

# --- Routers ---
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
