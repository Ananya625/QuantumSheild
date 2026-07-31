import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserSession, Account
from ..schemas import LoginRequest, LoginResponse, VerifyDeviceRequest, AuthenticateRequest, CreateSessionRequest, StandardResponse
from ..websocket import manager

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Simple check for predefined users
    user = db.query(Account).filter(Account.owner_name == payload.username).first()
    if not user or payload.password != "password123":  # Standard password for demo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
        
    session_id = str(uuid.uuid4())
    
    # Save session
    db_session = UserSession(
        session_id=session_id,
        status="LOGIN_SUCCESS"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Broadcast event
    await manager.send_json(
        session_id=session_id,
        event_type="AUTH_SUCCESS",
        message=f"User {payload.username} logged in successfully.",
        data={"session_id": session_id, "username": payload.username}
    )
    
    return LoginResponse(
        session_id=session_id,
        username=payload.username,
        status="LOGIN_SUCCESS"
    )

@router.post("/verify-device", response_model=StandardResponse)
async def verify_device(payload: VerifyDeviceRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.device_id = payload.device_id
    session.status = "DEVICE_VERIFIED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="DEVICE_VERIFIED",
        message=f"Device '{payload.device_id}' verified and authorized.",
        data={"device_id": payload.device_id}
    )
    
    return StandardResponse(
        success=True,
        status="DEVICE_VERIFIED",
        message="Device verified successfully."
    )

@router.post("/authenticate", response_model=StandardResponse)
async def authenticate(payload: AuthenticateRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if payload.password != "password123":
        session.status = "AUTH_FAILED"
        db.commit()
        await manager.send_json(
            session_id=payload.session_id,
            event_type="AUTH_FAILED",
            message="Secondary password verification failed."
        )
        raise HTTPException(status_code=401, detail="Invalid password")
        
    session.status = "AUTHENTICATED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="AUTH_AUTHENTICATED",
        message="Secondary authentication credentials verified.",
        data={"status": "AUTHENTICATED"}
    )
    
    return StandardResponse(
        success=True,
        status="AUTHENTICATED",
        message="Authentication successful."
    )

@router.post("/create-session", response_model=StandardResponse)
async def create_session(payload: CreateSessionRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.status = "SESSION_CREATED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="SESSION_CREATED",
        message="Secure session token generated and stored in cookies.",
        data={"session_id": payload.session_id}
    )
    
    return StandardResponse(
        success=True,
        status="SESSION_CREATED",
        message="Secure session context created successfully."
    )
