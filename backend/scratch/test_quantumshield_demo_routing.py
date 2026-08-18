import sys
import os
import asyncio
from sqlalchemy.orm import Session

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal, Base, engine
from app.models import Transaction, Account, UserSession
from app.pipeline_coordinator import run_transaction_pipeline
from app.quantum.threat_demo_service import ToyQuantumThreatDemoService

def create_mock_context(db: Session):
    # Ensure Alice & Bob accounts exist
    alice = db.query(Account).filter(Account.owner_name == "Alice").first()
    if not alice:
        alice = Account(account_number="123456789", owner_name="Alice", bank_name="JPMorgan", balance=5000.0)
        db.add(alice)
    else:
        alice.balance = 5000.0
        
    bob = db.query(Account).filter(Account.owner_name == "Bob").first()
    if not bob:
        bob = Account(account_number="987654321", owner_name="Bob", bank_name="HDFC", balance=1000.0)
        db.add(bob)
        
    session = db.query(UserSession).filter(UserSession.session_id == "demo-routing-test-session").first()
    if not session:
        session = UserSession(session_id="demo-routing-test-session", device_id="Test Device", status="AUTHENTICATED")
        db.add(session)
        
    db.commit()

async def run_tests_async():
    print("==================================================")
    print("RUNNING DUAL-ARCHITECTURE DEMO ROUTING VALIDATION")
    print("==================================================")
    
    db: Session = SessionLocal()
    create_mock_context(db)
    
    initial_tx_count = db.query(Transaction).count()
    
    # --------------------------------------------------
    # TEST 1: Current Banking Transaction uses P-256
    # --------------------------------------------------
    print("\n[TEST 1] Initiating Current Banking transaction...")
    tx_classical = Transaction(
        session_id="demo-routing-test-session",
        sender_account="123456789",
        sender_bank="JPMorgan",
        receiver_account="987654321",
        receiver_bank="HDFC",
        amount=100.00,
        description="Classical test wire",
        status="PENDING",
        security_mode="classical"
    )
    db.add(tx_classical)
    db.commit()
    db.refresh(tx_classical)
    
    await run_transaction_pipeline(tx_classical.id)
    db.refresh(tx_classical)
    
    assert tx_classical.status == "SUCCESS"
    assert tx_classical.client_dh_public_pem is not None
    assert tx_classical.server_dh_public_pem is not None
    assert tx_classical.shared_secret_hex is not None
    # Verify no ML-KEM parameters were populated
    assert tx_classical.mlkem_public_key_pem is None
    assert tx_classical.mlkem_ciphertext_hex is None
    print("[OK] Current Banking uses SECP256R1/ECDHE and avoids ML-KEM.")

    # --------------------------------------------------
    # TEST 2: QuantumShield Transaction uses PQC/hybrid path
    # --------------------------------------------------
    print("\n[TEST 2] Initiating QuantumShield transaction...")
    tx_qs = Transaction(
        session_id="demo-routing-test-session",
        sender_account="123456789",
        sender_bank="JPMorgan",
        receiver_account="987654321",
        receiver_bank="HDFC",
        amount=150.00,
        description="QS test wire",
        status="PENDING",
        security_mode="quantumshield"
    )
    db.add(tx_qs)
    db.commit()
    db.refresh(tx_qs)
    
    await run_transaction_pipeline(tx_qs.id)
    db.refresh(tx_qs)
    
    assert tx_qs.status == "SUCCESS"
    assert tx_qs.mlkem_public_key_pem is not None
    assert tx_qs.mlkem_ciphertext_hex is not None
    assert tx_qs.mlkem_secret_hex is not None
    assert tx_qs.bb84_reconciled_key_hex is not None
    print("[OK] QuantumShield uses ML-KEM/hybrid path.")

    # --------------------------------------------------
    # TEST 3: Captured Material Contain No Private Keys/Secrets
    # --------------------------------------------------
    print("\n[TEST 3] Verifying captured material boundary...")
    # Simulate what's visible to attacker
    captured_classical = {
        "client_dh_public_pem": tx_classical.client_dh_public_pem,
        "server_dh_public_pem": tx_classical.server_dh_public_pem,
        "encrypted_payload_hex": tx_classical.encrypted_payload_hex,
        "nonce_hex": tx_classical.nonce_hex,
        "tag_hex": tx_classical.tag_hex
    }
    for key, val in captured_classical.items():
        assert val is not None, f"Captured classical field {key} is missing!"
    
    # Assert private fields are excluded
    assert "private" not in str(captured_classical).lower()
    assert tx_classical.shared_secret_hex not in captured_classical.values()
    assert tx_classical.session_key_hex not in captured_classical.values()
    print("[OK] Attacker-captured classical material excludes private scalar, shared secret, and session key.")

    captured_qs = {
        "mlkem_public_key_pem": tx_qs.mlkem_public_key_pem,
        "mlkem_ciphertext_hex": tx_qs.mlkem_ciphertext_hex,
        "encrypted_payload_hex": tx_qs.encrypted_payload_hex,
        "nonce_hex": tx_qs.nonce_hex,
        "tag_hex": tx_qs.tag_hex
    }
    for key, val in captured_qs.items():
        assert val is not None, f"Captured QS field {key} is missing!"
        
    # Assert private fields are excluded
    assert tx_qs.mlkem_secret_hex not in captured_qs.values()
    assert tx_qs.session_key_hex not in captured_qs.values()
    print("[OK] Attacker-captured QS material excludes ML-KEM shared secret and derived session key.")

    # --------------------------------------------------
    # TEST 4-7: Algorithm Detection, Shor Routing, Rejection
    # --------------------------------------------------
    print("\n[TEST 4-7] Running threat analysis routing checks...")
    
    # Execute threat demo against Current Banking transaction
    demo_classical = ToyQuantumThreatDemoService.execute_demonstration(tx_id=tx_classical.id, db=db)
    assert demo_classical["success"] is True
    assert demo_classical["demo_type"] == "ephemeral_toy_ecdlp"
    assert "SECP256R1 detected" in [l["message"] for l in demo_classical["logs"]]
    assert demo_classical["decryption"]["plaintext_recovered"] is True
    print("[OK] Current Banking threat analysis routes to ECDLP solver and decrypts toy payload.")

    # Execute threat demo against QuantumShield transaction
    demo_qs = ToyQuantumThreatDemoService.execute_demonstration(tx_id=tx_qs.id, db=db)
    assert demo_qs["success"] is True
    assert demo_qs["demo_type"] == "quantumshield_mlkem_check"
    
    # Verify log messages
    log_messages = [l["message"] for l in demo_qs["logs"]]
    assert "ML-KEM detected" in log_messages
    assert "Shor attack rejected" in log_messages
    assert "No discrete-log target available" in log_messages
    assert "Quantum-resistant result confirmed" in log_messages
    
    # Verify result structure
    assert demo_qs["attack"]["algorithm"] == "ML-KEM"
    assert demo_qs["attack"]["attack_applicability"] == "NOT APPLICABLE"
    assert demo_qs["attack"]["key_recovery"] == "FAILED"
    assert demo_qs["attack"]["status"] == "QUANTUM-RESISTANT"
    assert demo_qs["decryption"]["plaintext"] is None
    print("[OK] QuantumShield threat analysis detects ML-KEM, rejects Shor, and reports resistant status.")

    # --------------------------------------------------
    # TEST 8: Database Ledger Integrity
    # --------------------------------------------------
    print("\n[TEST 8] Verifying ledger database integrity...")
    post_test_tx_count = db.query(Transaction).count()
    # Running execute_demonstration should not create any new transaction records
    assert post_test_tx_count == initial_tx_count + 2, "New transaction records were created by running threat analyzer!"
    print("[OK] Database ledger integrity preserved. No transaction records modified or inserted by demonstration.")

    # --------------------------------------------------
    # TEST 9: Existing Isolated Demonstration Still Works
    # --------------------------------------------------
    print("\n[TEST 9] Verifying legacy isolated demonstration compatibility...")
    demo_isolated = ToyQuantumThreatDemoService.execute_demonstration()
    assert demo_isolated["success"] is True
    assert demo_isolated["demo_type"] == "ephemeral_toy_ecdlp"
    assert len(demo_isolated["logs"]) > 0
    assert demo_isolated["decryption"]["plaintext_recovered"] is True
    print("[OK] Isolated fallback threat demonstration continues to function normally.")

    # Clean up test database records
    db.delete(tx_classical)
    db.delete(tx_qs)
    db.commit()
    db.close()
    
    print("\n==================================================")
    print("ALL DUAL-ARCHITECTURE DEMO ROUTING TESTS PASSED")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests_async())
