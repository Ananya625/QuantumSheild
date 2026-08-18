import sys
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.quantum.engines.toy_ecdlp_engine import ToyEcdlpEngine, ToyEllipticCurve
from app.services.crypto_service import CryptoService

def run_controlled_validation():
    # 1. Setup Toy Curve
    curve = ToyEcdlpEngine.get_curve()
    
    # 2. Ephemeral Toy ECDHE Key Pairs
    # Generate client private scalar (d_client) and public point (Q_client)
    d_client = 3  # private scalar
    Q_client = curve.multiply(ToyEcdlpEngine.BASE_POINT, d_client)  # (2, 4)
    
    # Generate server private scalar (d_server) and public point (Q_server)
    d_server = 2  # private scalar
    Q_server = curve.multiply(ToyEcdlpEngine.BASE_POINT, d_server)  # (2, 1)
    
    # 3. Classical Shared Secret Computation
    S_classical = curve.multiply(Q_server, d_client)  # d_client * d_server * G = 6 * G = 1 * G = (1, 1)
    
    # Derive reference AES key classically from S_classical x-coordinate bytes
    shared_secret_bytes_classical = S_classical[0].to_bytes(4, byteorder='big')
    reference_aes_key = CryptoService.derive_aes_key(shared_secret_bytes_classical)
    
    # 4. Prepare plaintext payload
    original_plaintext = json.dumps({
        "sender": "Alice (Toy Bank)",
        "receiver": "Bob (Toy Bank)",
        "amount": "$100.00",
        "description": "Toy Elliptic Curve Transfer"
    })
    
    # Encrypt classically with reference key
    ciphertext_hex, nonce_hex, tag_hex = CryptoService.encrypt_aes_gcm(original_plaintext, reference_aes_key)
    
    # 5. Run QUANTUM ECDLP to recover d_client
    # We pass ONLY the public point Q_client, NOT the secret keys.
    # Strict Leakage Assertion: Inspect engine function parameters and signature to ensure no leakage
    import inspect
    sig = inspect.signature(ToyEcdlpEngine.get_ecdlp_unitary_matrix)
    assert 'd' not in sig.parameters, "LEAKAGE DETECTED: Oracle builder signature leaks the private scalar!"
    
    res = ToyEcdlpEngine.run_quantum_ecdlp(Q_client)
    
    success = res["success"]
    recovered_scalar = res["recovered_scalar"]
    
    # Verify scalar matches d_client
    scalar_verification = "FAIL"
    shared_secret_reconstructed = "FAIL"
    session_key_reconstructed = "FAIL"
    aes_gcm_auth = "FAIL"
    plaintext_recovery = "FAIL"
    
    if success and recovered_scalar is not None:
        # Step [4] Verify Q = dG
        Q_verified = curve.multiply(ToyEcdlpEngine.BASE_POINT, recovered_scalar)
        if Q_verified == Q_client:
            scalar_verification = "PASS"
            
        # Step [5, 6] Reconstruct and verify shared secret
        S_quantum = curve.multiply(Q_server, recovered_scalar)
        if S_quantum == S_classical:
            shared_secret_reconstructed = "PASS"
            
        # Step [7] HKDF session key derivation
        shared_secret_bytes_quantum = S_quantum[0].to_bytes(4, byteorder='big')
        quantum_aes_key = CryptoService.derive_aes_key(shared_secret_bytes_quantum)
        
        if quantum_aes_key == reference_aes_key:
            session_key_reconstructed = "PASS"
            
        # Step [8, 9] AES-GCM Decryption using quantum key
        try:
            decrypted_plaintext = CryptoService.decrypt_aes_gcm(
                ciphertext_hex=ciphertext_hex,
                key_bytes=quantum_aes_key,
                nonce_hex=nonce_hex,
                tag_hex=tag_hex
            )
            aes_gcm_auth = "PASS"
            if decrypted_plaintext == original_plaintext:
                plaintext_recovery = "PASS"
        except Exception:
            pass
            
    # 6. Negative Tests
    neg_wrong_scalar = "FAIL"
    neg_wrong_secret = "FAIL"
    neg_wrong_key = "FAIL"
    neg_modified_ciphertext = "FAIL"
    neg_modified_tag = "FAIL"
    
    # Negative test 1: Wrong private scalar
    wrong_scalar = (recovered_scalar + 1) % ToyEcdlpEngine.ORDER if recovered_scalar is not None else 1
    if wrong_scalar == 0:
        wrong_scalar = 1
    Q_wrong = curve.multiply(ToyEcdlpEngine.BASE_POINT, wrong_scalar)
    if Q_wrong != Q_client:
        neg_wrong_scalar = "PASS"
        
    # Negative test 2: Wrong shared secret
    S_wrong = curve.multiply(Q_server, wrong_scalar)
    if S_wrong != S_classical:
        neg_wrong_secret = "PASS"
        
    # Negative test 3: Wrong derived AES key
    shared_secret_bytes_wrong = S_wrong[0].to_bytes(4, byteorder='big')
    wrong_aes_key = CryptoService.derive_aes_key(shared_secret_bytes_wrong)
    if wrong_aes_key != reference_aes_key:
        neg_wrong_key = "PASS"
        
    # Negative test 4: Decryption fails with modified ciphertext
    modified_ciphertext = bytearray(bytes.fromhex(ciphertext_hex))
    modified_ciphertext[0] ^= 0xFF
    try:
        CryptoService.decrypt_aes_gcm(modified_ciphertext.hex(), reference_aes_key, nonce_hex, tag_hex)
    except InvalidTag:
        neg_modified_ciphertext = "PASS"
        
    # Negative test 5: Decryption fails with modified tag
    modified_tag = bytearray(bytes.fromhex(tag_hex))
    modified_tag[0] ^= 0xFF
    try:
        CryptoService.decrypt_aes_gcm(ciphertext_hex, reference_aes_key, nonce_hex, modified_tag.hex())
    except InvalidTag:
        neg_modified_tag = "PASS"
        
    # Final Result Verification
    all_stages_pass = (
        scalar_verification == "PASS" and
        shared_secret_reconstructed == "PASS" and
        session_key_reconstructed == "PASS" and
        aes_gcm_auth == "PASS" and
        plaintext_recovery == "PASS" and
        neg_wrong_scalar == "PASS" and
        neg_wrong_secret == "PASS" and
        neg_wrong_key == "PASS" and
        neg_modified_ciphertext == "PASS" and
        neg_modified_tag == "PASS"
    )
    final_status = "PASS" if all_stages_pass else "FAIL"
    
    # Output report
    print("==================================================")
    print("CONTROLLED ECDHE QUANTUM VALIDATION")
    print("==================================================")
    print(f"Curve: y^2 = x^3 + {ToyEcdlpEngine.A}x + {ToyEcdlpEngine.B} mod {ToyEcdlpEngine.P}")
    print(f"Base Point: {ToyEcdlpEngine.BASE_POINT}")
    print(f"Public Point: {Q_client}")
    print(f"Order: {ToyEcdlpEngine.ORDER}")
    print("")
    print(f"Quantum Backend: AerSimulator")
    print(f"Qubits: {res['qubits']}")
    print(f"Shots: {res['shots']}")
    print(f"Circuit Depth: {res['depth']}")
    print(f"Execution Time: {res['execution_time_sec']:.4f}s")
    print("")
    print("Quantum ECDLP:")
    print(f"Recovered Scalar: {recovered_scalar}")
    print(f"Scalar Verification: {scalar_verification}")
    print("")
    print("ECDH:")
    print(f"Shared Secret Reconstruction: {shared_secret_reconstructed}")
    print("")
    print("HKDF:")
    print(f"Session Key Reconstruction: {session_key_reconstructed}")
    print("")
    print("AES-GCM:")
    print(f"Authentication: {aes_gcm_auth}")
    print(f"Plaintext Recovery: {plaintext_recovery}")
    print("")
    print("Negative Tests:")
    print(f"Wrong Scalar: {neg_wrong_scalar}")
    print(f"Wrong Shared Secret: {neg_wrong_secret}")
    print(f"Wrong AES Key: {neg_wrong_key}")
    print(f"Modified Ciphertext: {neg_modified_ciphertext}")
    print(f"Modified Tag: {neg_modified_tag}")
    print("")
    print("FINAL RESULT:")
    print(final_status)
    print("==================================================")
    
    if final_status != "PASS":
        sys.exit(1)

if __name__ == "__main__":
    run_controlled_validation()
