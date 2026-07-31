import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserSession
from ..schemas import TlsHandshakeRequest, StandardResponse
from ..services.tls_service import TlsService
from ..websocket import manager

router = APIRouter(prefix="/api/tls", tags=["tls"])

@router.post("/handshake", response_model=StandardResponse)
async def tls_handshake(payload: TlsHandshakeRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.status = "TLS_HANDSHAKE_STARTED"
    db.commit()
    
    # 1. TLS started
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TLS_STARTED",
        message="TLS Handshake started."
    )
    await asyncio.sleep(0.3)
    
    # 2. Client Hello
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TLS_CLIENT_HELLO",
        message="Client Hello sent. Version: TLS 1.3. Cipher: TLS_AES_256_GCM_SHA384, Curve: SECP256R1.",
        data={
            "tls_version": "TLS 1.3",
            "supported_groups": ["SECP256R1"],
            "cipher_suites": ["TLS_AES_256_GCM_SHA384"],
            "sni": "api.quantumtrustbank.com"
        }
    )
    await asyncio.sleep(0.3)
    
    # 3. Server Hello
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TLS_SERVER_HELLO",
        message="Server Hello received. Version: TLS 1.3. Selected Cipher: TLS_AES_256_GCM_SHA384.",
        data={
            "tls_version": "TLS 1.3",
            "selected_cipher": "TLS_AES_256_GCM_SHA384",
            "selected_group": "SECP256R1"
        }
    )
    await asyncio.sleep(0.3)
    
    # 4. Certificate exchange
    server_pem, ca_pem = TlsService.generate_handshake_certificates()
    
    session.tls_cert_pem = server_pem
    session.tls_ca_cert_pem = ca_pem
    session.status = "TLS_ESTABLISHED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TLS_CERT_EXCHANGED",
        message="Server Certificate chain received and verified.",
        data={
            "server_cert": server_pem,
            "ca_cert": ca_pem,
            "certificate_info": {
                "subject": "CN=api.quantumtrustbank.com, O=Quantum Trust Bank, C=US",
                "issuer": "CN=QuantumShield CA Root G1, O=QuantumShield Root Authority Inc., C=US",
                "validity": "90 Days",
                "serial_number": "Simulated X509 Cert Chain"
            }
        }
    )
    await asyncio.sleep(0.3)
    
    # 5. Handshake Complete
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TLS_ESTABLISHED",
        message="TLS Session established. All transport layer packets are now encrypted.",
        data={"tls_status": "ESTABLISHED"}
    )
    
    return StandardResponse(
        success=True,
        status="TLS_ESTABLISHED",
        message="TLS Handshake completed successfully.",
        data={"server_cert_pem": server_pem, "ca_cert_pem": ca_pem}
    )
