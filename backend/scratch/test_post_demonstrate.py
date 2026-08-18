import sys
import os
import json
import http.client
import asyncio

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Transaction, Account, UserSession
from app.pipeline_coordinator import run_transaction_pipeline

async def perform_controlled_test():
    db = SessionLocal()
    
    # Verify account exists
    alice = db.query(Account).filter(Account.owner_name == "Alice").first()
    bob = db.query(Account).filter(Account.owner_name == "Bob").first()
    
    # Create session if needed
    session = db.query(UserSession).filter(UserSession.session_id == "trace-test-session").first()
    if not session:
        session = UserSession(session_id="trace-test-session", device_id="Trace Device", status="AUTHENTICATED")
        db.add(session)
        db.commit()

    # 1. Insert a transaction with distinctive values
    print("Inserting trace test transaction...")
    tx = Transaction(
        session_id="trace-test-session",
        sender_account=alice.account_number if alice else "123456789",
        sender_bank="JPMorgan",
        receiver_account=bob.account_number if bob else "987654321",
        receiver_bank="HDFC",
        amount=1.00,
        description="TRACE_TEST_001",
        status="PENDING",
        security_mode="classical"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    # 2. Run the production coordinator to populate keys and ciphertext
    print(f"Running pipeline for transaction ID: {tx.id}...")
    await run_transaction_pipeline(tx.id)
    db.refresh(tx)
    print(f"Transaction status: {tx.status}")
    
    # 3. Call the demonstrate API endpoint on the running server
    print("\nCalling /api/quantum/demonstrate via HTTP...")
    conn = http.client.HTTPConnection("localhost", 8000)
    headers = {'Content-Type': 'application/json'}
    payload = {"tx_id": tx.id}
    conn.request("POST", "/api/quantum/demonstrate", json.dumps(payload), headers)
    
    response = conn.getresponse()
    status = response.status
    data = response.read().decode('utf-8')
    conn.close()
    
    print(f"HTTP Status: {status}")
    print("Raw Response:")
    print(json.dumps(json.loads(data), indent=2))
    
    # Clean up test transaction
    db.delete(tx)
    db.commit()
    db.close()

if __name__ == "__main__":
    asyncio.run(perform_controlled_test())
