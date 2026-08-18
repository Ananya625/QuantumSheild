import sys
import os
import json
import asyncio
import inspect
from sqlalchemy.orm import Session

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Transaction, UserSession, Account
from app.quantum.execution_service import QuantumExecutionService
from app.quantum.engines.shor_engine import ShorEngine
from app.services.crypto_service import CryptoService

def run_p256_boundary_tests():
    print("==================================================")
    print("RUNNING P-256 QUANTUM RESOURCE BOUNDARY TESTS")
    print("==================================================")
    
    db: Session = SessionLocal()
    
    # Setup fresh transaction
    session = db.query(UserSession).first()
    if not session:
        print("[FAIL] User session not found.")
        sys.exit(1)
        
    sender = db.query(Account).filter(Account.account_number == "123456789").first()
    receiver = db.query(Account).filter(Account.account_number == "987654321").first()
    
    # [TEST 13] Production transaction creation still works normally.
    print("[TEST 13/14] Creating production SECP256R1 transaction...")
    tx = Transaction(
        session_id=session.session_id,
        sender_account=sender.account_number,
        sender_bank=sender.bank_name,
        receiver_account=receiver.account_number,
        receiver_bank=receiver.bank_name,
        amount=1.00,
        description="Resource Boundary Test",
        status="PENDING",
        security_mode="classical"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    # Run pipeline to generate SECP256R1 parameters
    from app.pipeline_coordinator import run_transaction_pipeline
    asyncio.run(run_transaction_pipeline(tx.id))
    
    db.refresh(tx)
    
    # [TEST 14] Production transaction encryption still uses SECP256R1 + AES-256-GCM.
    assert tx.status == "SUCCESS"
    assert tx.client_dh_public_pem is not None
    assert tx.server_dh_public_pem is not None
    assert tx.shared_secret_hex is not None
    assert tx.session_key_hex is not None
    assert tx.encrypted_payload_hex is not None
    print("[OK] Production transaction created and uses SECP256R1 + AES-256-GCM.")
    
    # Setup public-only parameters for the router
    router_params = {
        "tx_id": tx.id,
        "sender": f"Alice ({tx.sender_bank})",
        "receiver": f"Bob ({tx.receiver_bank})",
        "amount": f"${tx.amount:.2f}",
        "memo": tx.description,
        "reference_id": f"TX-{tx.id:06d}",
        "tls_cert_pem": tx.tls_cert_pem,
        "tls_ca_cert_pem": tx.tls_ca_cert_pem,
        "client_dh_public_pem": tx.client_dh_public_pem,
        "server_dh_public_pem": tx.server_dh_public_pem,
        "encrypted_payload_hex": tx.encrypted_payload_hex,
        "nonce_hex": tx.nonce_hex,
        "tag_hex": tx.tag_hex,
        "integrity_hash_hex": tx.integrity_hash_hex,
        "client_signing_public_pem": tx.client_signing_public_pem,
        "signature_hex": tx.signature_hex,
        "security_mode": tx.security_mode
    }
    
    # [TEST 1] Real SECP256R1 public key is recognized correctly.
    print("[TEST 1] Testing public key curve identification...")
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    pub_key = serialization.load_pem_public_key(tx.client_dh_public_pem.encode('utf-8'))
    assert isinstance(pub_key, ec.EllipticCurvePublicKey)
    assert pub_key.curve.name == "secp256r1"
    print("[OK] SECP256R1 public key verified.")
    
    # Mocking ShorEngine run to spy if it is called
    original_run_shor = ShorEngine.run_shor
    shor_called = False
    def spy_run_shor(N, a):
        nonlocal shor_called
        shor_called = True
        return original_run_shor(N, a)
    ShorEngine.run_shor = spy_run_shor
    
    # Run the simulation
    # [TEST 2] P-256 attack routes to resource boundary.
    print("[TEST 2] Running simulation on P-256 transaction...")
    res = QuantumExecutionService.execute_simulation("shor", router_params)
    
    # [TEST 4] Shor N=15 is NOT called.
    print("[TEST 4] Verifying Shor N=15 engine was NOT called...")
    assert not shor_called, "SECURITY FLAW: ShorEngine.run_shor was executed for P-256!"
    print("[OK] Shor N=15 was bypassed successfully.")
    
    # Restore ShorEngine
    ShorEngine.run_shor = original_run_shor
    
    # [TEST 10] attack status is resource_limited.
    print("[TEST 10] Verifying attack status...")
    assert res["metadata"]["status"] == "resource_limited"
    assert res["resource_estimation"]["estimated_logical_qubits"] == 2304
    print("[OK] Attack status is resource_limited.")
    
    # [TEST 11] key recovery status is not_attempted.
    print("[TEST 11] Verifying key recovery status...")
    assert "NOT_ATTEMPTED" in res["key_recovery"]["ecdhe_private_key"]
    assert res["key_recovery"]["shared_secret"] == "NOT_ATTEMPTED"
    assert res["key_recovery"]["session_key"] == "NOT_ATTEMPTED"
    print("[OK] Key recovery status is NOT_ATTEMPTED.")
    
    # [TEST 12] decryption status is not_attempted.
    print("[TEST 12] Verifying decryption status...")
    assert res["decryption"]["status"] == "not_attempted"
    # [TEST 9] plaintext is None.
    assert res["decryption"]["plaintext"] is None
    print("[OK] Decryption status is not_attempted, plaintext is None.")
    
    # [TEST 9] DELIBERATE MALICIOUS INJECTION (Negative test against secret leakage)
    # [TEST 5/6/7/8] Verifying secrets are ignored and GCM decryption is not bypassed
    print("[TEST 5/6/7/8] NEGATIVE TEST: Injecting malicious secrets directly...")
    malicious_params = router_params.copy()
    malicious_params["shared_secret_hex"] = tx.shared_secret_hex
    malicious_params["session_key_hex"] = tx.session_key_hex
    malicious_params["private_key"] = "COMPROMISED"
    malicious_params["private_scalar"] = 3
    
    res_malicious = QuantumExecutionService.execute_simulation("shor", malicious_params)
    
    # Ensure they are ignored and status remains not_attempted/plaintext is None
    assert res_malicious["metadata"]["status"] == "resource_limited"
    assert "NOT_ATTEMPTED" in res_malicious["key_recovery"]["ecdhe_private_key"]
    assert res_malicious["decryption"]["status"] == "not_attempted"
    assert res_malicious["decryption"]["plaintext"] is None
    print("[OK] Negative Test PASSED: Secrets ignored; no decryption occurred.")
    
    # [TEST 15] Existing crypto integrity tests still pass
    print("[TEST 15] Verifying existing crypto integrity...")
    decrypted_str = CryptoService.decrypt_aes_gcm(
        ciphertext_hex=tx.encrypted_payload_hex,
        key_bytes=bytes.fromhex(tx.session_key_hex),
        nonce_hex=tx.nonce_hex,
        tag_hex=tx.tag_hex
    )
    decrypted_json = json.loads(decrypted_str)
    assert decrypted_json["amount"] == 1.00
    assert decrypted_json["description"] == "Resource Boundary Test"
    print("[OK] Production decryption pipeline functions normally.")
    
    # Cleanup
    db.delete(tx)
    db.commit()
    db.close()
    
    print("\n==================================================")
    print("ALL P-256 QUANTUM RESOURCE BOUNDARY TESTS PASSED")
    print("==================================================")

if __name__ == "__main__":
    run_p256_boundary_tests()
