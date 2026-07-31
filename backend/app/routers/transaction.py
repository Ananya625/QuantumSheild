import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import UserSession, Transaction, Account
from ..schemas import StandardResponse, SendTransactionRequest, VerifySignatureRequest, DecryptTransactionRequest, SettlementRequest, ConfirmationRequest
from ..services.crypto_service import CryptoService
from ..websocket import manager

router = APIRouter(prefix="/api/transaction", tags=["transaction"])

@router.post("/send-transaction", response_model=StandardResponse)
async def send_transaction(payload: SendTransactionRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    tx = db.query(Transaction).filter(Transaction.session_id == payload.session_id).first()
    if not tx or not tx.encrypted_payload_hex:
        raise HTTPException(status_code=400, detail="Transaction payload not encrypted yet")
        
    session.status = "TRANSACTION_SENT"
    tx.status = "SENT"
    db.commit()
    
    # Construct simulated TCP/IP & TLS/HTTP Packet data for Wireshark inspection
    packet_data = {
        "network_frame": {
            "source_ip": "192.168.1.45",
            "dest_ip": "10.0.8.12",
            "protocol": "TCP / TLS 1.3 / HTTPS",
            "length": 1024 + len(tx.encrypted_payload_hex) // 2
        },
        "http_header": {
            "method": "POST",
            "path": "/api/gateway/incoming-transfer",
            "host": "api.bankb-gateway.com",
            "user_agent": "QuantumShield Client v1.0",
            "content_type": "application/octet-stream"
        },
        "tls_payload": {
            "encrypted_payload": tx.encrypted_payload_hex,
            "signature": tx.signature_hex,
            "client_signing_key": session.client_signing_public_pem
        }
    }
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TRANSACTION_SENT",
        message="Encrypted payload and signature packet transmitted across the Internet to Bank B Gateway.",
        data=packet_data
    )
    
    return StandardResponse(
        success=True,
        status="TRANSACTION_SENT",
        message="Transaction packet transmitted successfully.",
        data=packet_data
    )

@router.post("/verify-signature", response_model=StandardResponse)
async def verify_signature(payload: VerifySignatureRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    tx = db.query(Transaction).filter(Transaction.session_id == payload.session_id).first()
    if not tx or not tx.signature_hex or not session.client_signing_public_pem:
        raise HTTPException(status_code=400, detail="Signature or signing public key missing")
        
    session.status = "VERIFYING_SIGNATURE"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="SIGNATURE_VERIFY_STARTED",
        message="Bank B Gateway: Verifying ECDSA digital signature..."
    )
    await asyncio.sleep(0.3)
    
    # Verify the signature
    is_valid = CryptoService.verify_signature(
        payload=tx.integrity_hash_hex,
        signature_hex=tx.signature_hex,
        public_key_pem=session.client_signing_public_pem
    )
    
    if not is_valid:
        session.status = "SIGNATURE_INVALID"
        tx.status = "FAILED"
        db.commit()
        await manager.send_json(
            session_id=payload.session_id,
            event_type="SIGNATURE_FAILED",
            message="ECDSA digital signature verification failed. Packets may have been altered in transit."
        )
        raise HTTPException(status_code=400, detail="ECDSA Signature validation failed")
        
    session.status = "SIGNATURE_VERIFIED"
    tx.status = "VERIFIED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="SIGNATURE_VERIFIED",
        message="ECDSA digital signature verified successfully. Identity and integrity confirmed.",
        data={
            "signature_status": "VALID",
            "public_key": session.client_signing_public_pem,
            "hash_verified": tx.integrity_hash_hex
        }
    )
    
    return StandardResponse(
        success=True,
        status="SIGNATURE_VERIFIED",
        message="Signature verified successfully."
    )

@router.post("/decrypt-transaction", response_model=StandardResponse)
async def decrypt_transaction(payload: DecryptTransactionRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    tx = db.query(Transaction).filter(Transaction.session_id == payload.session_id).first()
    if not tx or not tx.encrypted_payload_hex or not session.session_key_hex:
        raise HTTPException(status_code=400, detail="Encryption session context not found")
        
    session.status = "DECRYPTING"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="DECRYPTION_STARTED",
        message="Bank B Gateway: Decrypting payload with session AES key..."
    )
    await asyncio.sleep(0.3)
    
    aes_key = bytes.fromhex(session.session_key_hex)
    try:
        plaintext = CryptoService.decrypt_aes_gcm(
            ciphertext_hex=tx.encrypted_payload_hex,
            key_bytes=aes_key,
            nonce_hex=tx.nonce_hex,
            tag_hex=tx.tag_hex
        )
        
        session.status = "TRANSACTION_DECRYPTED"
        tx.status = "DECRYPTED"
        db.commit()
        
        await manager.send_json(
            session_id=payload.session_id,
            event_type="TRANSACTION_DECRYPTED",
            message="Payload successfully decrypted. Plaintext transaction variables recovered.",
            data={
                "plaintext": plaintext,
                "key": session.session_key_hex,
                "nonce": tx.nonce_hex,
                "tag": tx.tag_hex
            }
        )
        
        return StandardResponse(
            success=True,
            status="TRANSACTION_DECRYPTED",
            message="Transaction decrypted successfully.",
            data={"plaintext": plaintext}
        )
    except Exception as e:
        session.status = "DECRYPTION_FAILED"
        db.commit()
        
        await manager.send_json(
            session_id=payload.session_id,
            event_type="DECRYPTION_FAILED",
            message=f"AES-GCM decryption failed: {str(e)}"
        )
        raise HTTPException(status_code=400, detail="Decryption failed")

@router.post("/settlement", response_model=StandardResponse)
async def settlement(payload: SettlementRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    tx = db.query(Transaction).filter(Transaction.session_id == payload.session_id).first()
    if not tx or tx.status != "DECRYPTED":
        raise HTTPException(status_code=400, detail="Transaction not decrypted or verified")
        
    session.status = "SETTLING"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="SETTLEMENT_STARTED",
        message="Interbank Settlement Engine: Checking balances and moving funds..."
    )
    await asyncio.sleep(0.3)
    
    # Perform actual ledger balance transfer
    sender = db.query(Account).filter(Account.account_number == tx.sender_account).first()
    receiver = db.query(Account).filter(Account.account_number == tx.receiver_account).first()
    
    if not sender or not receiver:
        session.status = "SETTLEMENT_FAILED"
        db.commit()
        await manager.send_json(
            session_id=payload.session_id,
            event_type="SETTLEMENT_FAILED",
            message="Settlement failed: Sender or Receiver account not found."
        )
        raise HTTPException(status_code=400, detail="Sender or receiver account not found")
        
    if sender.balance < tx.amount:
        session.status = "SETTLEMENT_FAILED"
        db.commit()
        await manager.send_json(
            session_id=payload.session_id,
            event_type="SETTLEMENT_FAILED",
            message="Settlement failed: Insufficient funds in sender account."
        )
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    # Execute transfer
    sender.balance -= tx.amount
    receiver.balance += tx.amount
    
    session.status = "TRANSACTION_SETTLED"
    tx.status = "SETTLED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TRANSACTION_SETTLED",
        message="Settlement completed. Double-entry ledger balances updated successfully.",
        data={
            "sender_account": sender.account_number,
            "sender_new_balance": sender.balance,
            "receiver_account": receiver.account_number,
            "receiver_new_balance": receiver.balance,
            "amount_transferred": tx.amount
        }
    )
    
    return StandardResponse(
        success=True,
        status="TRANSACTION_SETTLED",
        message="Settlement completed successfully."
    )

@router.post("/confirmation", response_model=StandardResponse)
async def confirmation(payload: ConfirmationRequest, db: Session = Depends(get_db)):
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    tx = db.query(Transaction).filter(Transaction.session_id == payload.session_id).first()
    if not tx or tx.status != "SETTLED":
        raise HTTPException(status_code=400, detail="Transaction not settled")
        
    session.status = "COMPLETED"
    tx.status = "CONFIRMED"
    db.commit()
    
    await manager.send_json(
        session_id=payload.session_id,
        event_type="TRANSACTION_SUCCESS",
        message="Core Banking: Transaction confirmation receipt generated. Pipeline complete.",
        data={
            "transaction_id": tx.id,
            "sender": tx.sender_account,
            "receiver": tx.receiver_account,
            "amount": tx.amount,
            "status": "SUCCESS"
        }
    )
    
    return StandardResponse(
        success=True,
        status="COMPLETED",
        message="Transaction complete and confirmed.",
        data={
            "receipt": {
                "transaction_id": tx.id,
                "amount": tx.amount,
                "sender": tx.sender_account,
                "receiver": tx.receiver_account,
                "timestamp": tx.created_at.isoformat()
            }
        }
    )
