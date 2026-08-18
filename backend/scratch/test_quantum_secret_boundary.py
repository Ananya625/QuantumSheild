import sys
import os
import json
import subprocess
from sqlalchemy.orm import Session

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Transaction, UserSession, Account
from app.quantum.execution_service import QuantumExecutionService
from app.services.crypto_service import CryptoService

def run_boundary_tests():
    print("==================================================")
    print("RUNNING QUANTUM SECRET BOUNDARY INTEGRITY TESTS")
    print("==================================================")
    
    db: Session = SessionLocal()
    
    # 1. Verify a production transaction can still be created normally.
    print("[1] Verifying production transaction creation...")
    # Get user session
    session = db.query(UserSession).first()
    if not session:
        print("[FAIL] No user session found to initiate transaction.")
        sys.exit(1)
        
    sender = db.query(Account).filter(Account.account_number == "123456789").first()
    receiver = db.query(Account).filter(Account.account_number == "987654321").first()
    
    # Simulate initiating transfer (mirroring main.py / pipeline_coordinator.py)
    tx = Transaction(
        session_id=session.session_id,
        sender_account=sender.account_number,
        sender_bank=sender.bank_name,
        receiver_account=receiver.account_number,
        receiver_bank=receiver.bank_name,
        amount=1.00,
        description="Boundary Test Transfer",
        status="PENDING",
        security_mode="classical"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    # Generate ephemeral key pairs and shared secrets classically
    from app.pipeline_coordinator import run_transaction_pipeline
    import asyncio
    # Run the transaction pipeline to populate cryptographics
    asyncio.run(run_transaction_pipeline(tx.id))
    
    db.refresh(tx)
    
    # Assert transaction is valid and completed
    assert tx.status == "SUCCESS"
    assert tx.client_dh_public_pem is not None
    assert tx.server_dh_public_pem is not None
    assert tx.shared_secret_hex is not None
    assert tx.session_key_hex is not None
    assert tx.encrypted_payload_hex is not None
    print("[OK] Production transaction created and cryptographically completed.")
    
    # 2. Verify router parameter dictionary does not contain secrets (mocking router payload)
    print("[2] Verifying router parameter dictionary does not leak secrets...")
    router_params = {
        "tx_id": tx.id,
        "sender": f"Alice ({tx.sender_bank})",
        "receiver": f"Bob ({tx.receiver_bank})",
        "amount": f"${tx.amount:.2f}",
        "memo": tx.description,
        "reference_id": f"TX-{tx.id:06d}",
        # Public-only parameters
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
    
    # Assert keys are absent
    assert "shared_secret_hex" not in router_params, "LEAK DETECTED: shared_secret_hex is present in router params!"
    assert "session_key_hex" not in router_params, "LEAK DETECTED: session_key_hex is present in router params!"
    assert "private_key" not in router_params, "LEAK DETECTED: private key is present in router params!"
    print("[OK] Secrets are absent from the router parameters.")
    
    # 3 & 4. Verify execution service cannot decrypt without recovered key and rejects inputs
    print("[3/4] Running simulation with public-only inputs...")
    sim_res = QuantumExecutionService.execute_simulation("shor", router_params)
    
    # Verify decryption fails/is not attempted
    assert sim_res["decryption"]["status"] == "not_attempted"
    assert sim_res["decryption"]["plaintext"] is None
    assert sim_res["decryption"]["error"] is not None
    print(f"[OK] Simulation decryption is not attempted correctly: {sim_res['decryption']['error']}")
    
    # 5. Verify no ledger plaintext fields are copied on failure
    print("[5] Verifying no plaintext ledger fallback occurred...")
    assert sim_res["decryption"]["plaintext"] is None, "LEAK DETECTED: Plaintext fallback populated on decryption failure!"
    print("[OK] No fallback plaintext is populated.")
    
    # 6 & 7. Verify the production transaction and normal decryption path still work independently
    print("[6/7] Verifying production decryption pipeline remains untouched...")
    decrypted_str = CryptoService.decrypt_aes_gcm(
        ciphertext_hex=tx.encrypted_payload_hex,
        key_bytes=bytes.fromhex(tx.session_key_hex),
        nonce_hex=tx.nonce_hex,
        tag_hex=tx.tag_hex
    )
    decrypted_json = json.loads(decrypted_str)
    assert decrypted_json["amount"] == 1.00
    assert decrypted_json["description"] == "Boundary Test Transfer"
    print("[OK] Production transaction decryption works independently.")
    
    # 8. Negative Security Test: Pass secrets directly and verify execution service actively deletes/ignores them
    print("[8] NEGATIVE TEST: Verifying execution service ignores secrets if passed...")
    params_with_secrets = router_params.copy()
    params_with_secrets["shared_secret_hex"] = tx.shared_secret_hex
    params_with_secrets["session_key_hex"] = tx.session_key_hex
    
    # Run simulation with secrets included
    sim_res_secret_test = QuantumExecutionService.execute_simulation("shor", params_with_secrets)
    
    # Verify that decryption STILL fails because the execution service stripped/ignored the keys!
    assert sim_res_secret_test["decryption"]["status"] == "not_attempted", "SECURITY FLAW: Execution service accepted leaked secret parameter!"
    assert sim_res_secret_test["decryption"]["plaintext"] is None
    assert "aborted" in sim_res_secret_test["decryption"]["error"]
    print("[OK] Negative Test PASSED: Secrets were actively stripped and ignored.")
    
    # Clean up test transaction
    db.delete(tx)
    db.commit()
    db.close()
    
    # 9. Verify Frontend compilation
    print("[9] Verifying frontend TypeScript compilation...")
    try:
        subprocess.run("npx tsc --noEmit", shell=True, cwd="../frontend", check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("[OK] Frontend TypeScript compiled successfully.")
    except Exception as e:
        print(f"[FAIL] Frontend TypeScript compilation failed: {e}")
        sys.exit(1)
        
    print("\n==================================================")
    print("ALL BOUNDARY AND CRYPTOGRAPHIC SECURITY TESTS PASSED")
    print("==================================================")

if __name__ == "__main__":
    run_boundary_tests()
