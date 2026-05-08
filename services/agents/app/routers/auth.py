from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.sap.exceptions import SAPAuthError
from app.sap.session import SAPSession

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, request: Request):
    session: SAPSession = request.app.state.sap_session

    try:
        session_id = await session.login(body.username, body.password)
    except SAPAuthError as e:
        return JSONResponse(
            status_code=401,
            content={"error": e.message, "detail": e.detail},
        )

    response = JSONResponse(content={"status": "ok", "session_id": session_id})
    response.set_cookie(
        key="B1SESSION",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=not settings.dev_mode,
        max_age=1800,
    )
    return response


@router.post("/logout")
async def logout(request: Request):
    session: SAPSession = request.app.state.sap_session
    await session.logout()

    response = JSONResponse(content={"status": "ok"})
    response.delete_cookie("B1SESSION")
    return response
