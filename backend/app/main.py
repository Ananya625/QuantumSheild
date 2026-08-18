import uuid
import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .database import engine, Base, get_db
from .models import Account, UserSession, Transaction
from .websocket import manager
from .schemas import LoginRequest, LoginResponse, TransferRequest, StandardResponse
from .pipeline_coordinator import run_transaction_pipeline

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="QuantumShield - Security Pipeline PoC", version="1.0.0")

# Enable CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .quantum.router import router as quantum_router
app.include_router(quantum_router)

def seed_database():
    db = next(get_db())
    try:
        # 1. Seed Accounts
        alice = db.query(Account).filter(Account.owner_name == "Alice").first()
        if not alice:
            alice = Account(
                account_number="123456789",
                owner_name="Alice",
                bank_name="JPMorgan",
                balance=5000.00
            )
            db.add(alice)
        else:
            alice.balance = 5000.00
            
        bob = db.query(Account).filter(Account.owner_name == "Bob").first()
        if not bob:
            bob = Account(
                account_number="987654321",
                owner_name="Bob",
                bank_name="HDFC",
                balance=1000.00
            )
            db.add(bob)
        else:
            bob.balance = 1000.00
        db.commit()
        db.refresh(alice)
        db.refresh(bob)
        
        # 2. Seed past transactions history for realistic dashboard log
        tx_count = db.query(Transaction).count()
        if tx_count == 0:
            # Create a mock session
            mock_session = UserSession(
                session_id="mock-history-session",
                device_id="MacBook Pro (Authorized)",
                status="COMPLETED"
            )
            db.add(mock_session)
            db.commit()
            
            # Historical transaction: Alice paid Bob $50
            past_tx1 = Transaction(
                session_id="mock-history-session",
                sender_account="123456789",
                sender_bank="JPMorgan",
                receiver_account="987654321",
                receiver_bank="HDFC",
                amount=50.00,
                description="Dinner reimbursement",
                status="SUCCESS",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
            )
            db.add(past_tx1)
            
            # Historical transaction: Alice received payroll $3000
            # (Represented as a mock external transfer from Employer)
            past_tx2 = Transaction(
                session_id="mock-history-session",
                sender_account="999888777", # Mock employer account
                sender_bank="Employer Bank",
                receiver_account="123456789", # Alice
                receiver_bank="JPMorgan",
                amount=3000.00,
                description="Monthly Salary Credit",
                status="SUCCESS",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=5)
            )
            db.add(past_tx2)
            db.commit()
            
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

seed_database()

@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Check for predefined Alice/Bob accounts
    user = db.query(Account).filter(Account.owner_name == payload.username).first()
    if not user or payload.password != "password123":
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    session_id = str(uuid.uuid4())
    db_session = UserSession(
        session_id=session_id,
        device_id="Registered Device",
        status="AUTHENTICATED"
    )
    db.add(db_session)
    db.commit()
    
    return LoginResponse(
        session_id=session_id,
        username=payload.username,
        status="AUTHENTICATED"
    )

@app.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(Account).all()
    return [{"account_number": a.account_number, "owner_name": a.owner_name, "bank_name": a.bank_name, "balance": a.balance} for a in accounts]

@app.get("/api/transaction/history/{account_number}")
def get_transaction_history(account_number: str, db: Session = Depends(get_db)):
    """Fetches completed transfers involving this account."""
    txs = db.query(Transaction).filter(
        (Transaction.sender_account == account_number) | 
        (Transaction.receiver_account == account_number)
    ).order_by(Transaction.created_at.desc()).all()
    
    res = []
    for t in txs:
        # Determine if it's debit or credit relative to this account
        is_credit = t.receiver_account == account_number
        other_party = "Employer Corp" if t.sender_account == "999888777" else ("Bob" if is_credit else "Bob")
        
        # Simple name mapping for visual portal
        if t.sender_account == "123456789" and not is_credit:
            other_party = "Bob (...321)"
        elif t.receiver_account == "123456789" and is_credit:
            other_party = "Bob (...321)"
        elif t.sender_account == "987654321" and not is_credit:
            other_party = "Alice (...789)"
        elif t.receiver_account == "987654321" and is_credit:
            other_party = "Alice (...789)"
            
        res.append({
            "id": t.id,
            "date": t.created_at.strftime("%Y-%m-%d %H:%M"),
            "description": t.description or "Fund Transfer",
            "amount": t.amount,
            "type": "CREDIT" if is_credit else "DEBIT",
            "other_party": other_party,
            "status": t.status
        })
    return res

@app.post("/api/transaction/transfer")
def initiate_transfer(payload: TransferRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Submits a money transfer. Creates a PENDING database record and schedules the
    asynchronous pipeline task.
    """
    session = db.query(UserSession).filter(UserSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid session context.")
        
    # Check if accounts exist
    sender = db.query(Account).filter(Account.account_number == payload.sender_account).first()
    receiver = db.query(Account).filter(Account.account_number == payload.receiver_account).first()
    if not sender or not receiver:
        raise HTTPException(status_code=400, detail="Account records not found in core ledger.")
        
    # Auto-replenish Alice's balance if it's lower than the transfer amount
    if sender.owner_name == "Alice" and sender.balance < payload.amount:
        sender.balance = 5000.00
        db.commit()
        
    # Create transaction
    tx = Transaction(
        session_id=payload.session_id,
        sender_account=payload.sender_account,
        sender_bank=sender.bank_name,
        receiver_account=payload.receiver_account,
        receiver_bank=receiver.bank_name,
        amount=payload.amount,
        description=payload.description,
        status="PENDING",
        security_mode=payload.security_mode
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    # Enqueue background pipeline task
    background_tasks.add_task(run_transaction_pipeline, tx.id)
    
    return {"transaction_id": tx.id}

@app.get("/api/transaction/details/{tx_id}")
def get_transaction_details(tx_id: int, db: Session = Depends(get_db)):
    """Retrieves all computed parameters for a specific transaction."""
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
        
    return {
        "id": tx.id,
        "session_id": tx.session_id,
        "sender_account": tx.sender_account,
        "sender_bank": tx.sender_bank,
        "receiver_account": tx.receiver_account,
        "receiver_bank": tx.receiver_bank,
        "amount": tx.amount,
        "description": tx.description,
        "status": tx.status,
        "elapsed_time": tx.elapsed_time,
        "security_mode": tx.security_mode,
        "tls": {
            "tls_cert": tx.tls_cert_pem,
            "tls_ca_cert": tx.tls_ca_cert_pem,
        },
        "dh": {
            "client_dh_public": tx.client_dh_public_pem,
            "server_dh_public": tx.server_dh_public_pem,
            "shared_secret": tx.shared_secret_hex,
        },
        "session_key": tx.session_key_hex,
        "encryption": {
            "ciphertext": tx.encrypted_payload_hex,
            "nonce": tx.nonce_hex,
            "tag": tx.tag_hex,
            "hash": tx.integrity_hash_hex,
        },
        "signature": {
            "client_signing_key": tx.client_signing_public_pem,
            "signature_hex": tx.signature_hex,
        },
        "bb84": {
            "alice_bits": tx.bb84_alice_bits,
            "alice_bases": tx.bb84_alice_bases,
            "bob_bases": tx.bb84_bob_bases,
            "qber": tx.bb84_qber,
            "secret": tx.bb84_reconciled_key_hex,
        },
        "mlkem": {
            "public_key": tx.mlkem_public_key_pem,
            "ciphertext": tx.mlkem_ciphertext_hex,
            "secret": tx.mlkem_secret_hex,
        },
        "mldsa": {
            "public_key": tx.mldsa_public_key_pem,
            "signature": tx.mldsa_signature_hex,
        },
        "created_at": tx.created_at.isoformat()
    }

@app.websocket("/ws/transaction/{session_id}")
async def websocket_transaction(websocket: WebSocket, session_id: str):
    """
    Subscribes the client to live transaction progress events for their session.
    """
    await manager.connect(session_id, websocket)
    try:
        while True:
            # Keep socket open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
