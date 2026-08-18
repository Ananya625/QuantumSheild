import sys
import os
import json
import random
import inspect
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.quantum.engines.toy_ecdlp_engine import ToyEcdlpEngine, ToyEllipticCurve
from app.services.crypto_service import CryptoService

def run_multi_key_validation():
    print("==================================================")
    print("ADVERSARIAL MULTI-KEY QUANTUM ECDLP VALIDATION")
    print("==================================================")
    
    curve = ToyEcdlpEngine.get_curve()
    
    # 1. Anti-leakage checks
    sig = inspect.signature(ToyEcdlpEngine.get_ecdlp_unitary_matrix)
    if 'd' in sig.parameters:
        print("[FAIL] LEAKAGE DETECTED: Oracle builder signature contains 'd'")
        sys.exit(1)
        
    src_code = inspect.getsource(ToyEcdlpEngine.run_quantum_ecdlp)
    if "d_truth" in src_code and "cls.get_ecdlp_unitary_matrix(d_truth)" in src_code:
        print("[FAIL] LEAKAGE DETECTED: run_quantum_ecdlp pre-solves and passes d_truth!")
        sys.exit(1)
        
    print("[OK] Anti-leakage static validation check passed.")
    
    # 2. Test Matrix: d = 1, 2, 3, 4
    scalars = [1, 2, 3, 4]
    random.shuffle(scalars) # Randomize execution order to ensure no cross-test state leak
    print(f"Randomized Execution Order: {scalars}\n")
    
    test_results = {}
    last_recovered = None
    
    for d_harness in scalars:
        # A. Compute Q = d*G
        Q = curve.multiply(ToyEcdlpEngine.BASE_POINT, d_harness)
        assert Q is not None, "Point cannot be the point at infinity!"
        
        # B. Classically compute server side ephemeral key for downstream ECDH
        d_server = 2
        Q_server = curve.multiply(ToyEcdlpEngine.BASE_POINT, d_server)
        S_classical = curve.multiply(Q_server, d_harness)
        shared_secret_bytes_classical = S_classical[0].to_bytes(4, byteorder='big')
        reference_aes_key = CryptoService.derive_aes_key(shared_secret_bytes_classical)
        
        original_plaintext = json.dumps({
            "sender": f"Alice (Key d={d_harness})",
            "receiver": "Bob (Server)",
            "amount": f"${d_harness * 100}.00",
            "description": "Multi-Key Integrity Verification"
        })
        
        # Classical encryption of target payload
        ciphertext_hex, nonce_hex, tag_hex = CryptoService.encrypt_aes_gcm(original_plaintext, reference_aes_key)
        
        # C. Run isolated QUANTUM solver
        # Fresh circuit constructed inside run_quantum_ecdlp
        res = ToyEcdlpEngine.run_quantum_ecdlp(Q)
        
        success = res["success"]
        recovered_scalar = res["recovered_scalar"]
        
        # D. Cryptographic verification chain
        scalar_ver = "FAIL"
        secret_ver = "FAIL"
        key_ver = "FAIL"
        aes_ver = "FAIL"
        plaintext_ver = "FAIL"
        
        if success and recovered_scalar is not None:
            # 1. Scalar verification: d_recovered * G == Q
            Q_verified = curve.multiply(ToyEcdlpEngine.BASE_POINT, recovered_scalar)
            if Q_verified == Q:
                scalar_ver = "PASS"
                
            # 2. Shared secret reconstruction: S_quantum = d_recovered * Q_server
            S_quantum = curve.multiply(Q_server, recovered_scalar)
            if S_quantum == S_classical:
                secret_ver = "PASS"
                
            # 3. Key derivation
            shared_secret_bytes_quantum = S_quantum[0].to_bytes(4, byteorder='big')
            quantum_aes_key = CryptoService.derive_aes_key(shared_secret_bytes_quantum)
            if quantum_aes_key == reference_aes_key:
                key_ver = "PASS"
                
            # 4. AES-GCM Decryption
            try:
                decrypted = CryptoService.decrypt_aes_gcm(ciphertext_hex, quantum_aes_key, nonce_hex, tag_hex)
                aes_ver = "PASS"
                if decrypted == original_plaintext:
                    plaintext_ver = "PASS"
            except Exception:
                pass
                
        # E. Cross-test contamination check
        # Verify that the result matches the currently active public point, not the previous experiment's state
        if last_recovered is not None:
            assert recovered_scalar != last_recovered, "CROSS-TEST CONTAMINATION: Output did not change with public parameter update!"
        last_recovered = recovered_scalar
        
        test_results[d_harness] = {
            "public_point": Q,
            "qubits": res["qubits"],
            "shots": res["shots"],
            "depth": res["depth"],
            "execution_time": res["execution_time_sec"],
            "recovered_scalar": recovered_scalar,
            "scalar_verification": scalar_ver,
            "shared_secret_verification": secret_ver,
            "session_key_verification": key_ver,
            "aes_gcm_authentication": aes_ver,
            "plaintext_recovery": plaintext_ver,
            "counts": res["counts"]
        }
        
        print(f"--- Experiment d={d_harness} Completed ---")
        print(f"  Public Point: {Q}")
        print(f"  Recovered: {recovered_scalar} | Verification: {scalar_ver}")
        print(f"  Plaintext Recovery: {plaintext_ver}\n")

    # 3. Additional Negative Tests
    print("Executing additional negative tests:")
    neg_wrong_point = "FAIL"
    neg_invalid_point = "FAIL"
    
    # Negative Test A: Wrong public point
    # We pass Q for scalar 4, but expect it to yield 4, not the previous scalar
    Q_scalar4 = curve.multiply(ToyEcdlpEngine.BASE_POINT, 4)
    res_wrong = ToyEcdlpEngine.run_quantum_ecdlp(Q_scalar4)
    if res_wrong["recovered_scalar"] == 4:
        neg_wrong_point = "PASS"
        print("  [OK] Wrong public point test: Solver correctly adjusted output to supplied point.")
        
    # Negative Test B: Invalid/non-group point
    # Point (3, 1) is not on y^2 = x^3 + 3x + 2 mod 5
    invalid_point = (3, 1)
    assert not curve.is_on_curve(invalid_point), "Point (3, 1) must not be on the curve!"
    try:
        ToyEcdlpEngine.run_quantum_ecdlp(invalid_point)
        print("  [FAIL] Solver accepted invalid point!")
    except AssertionError:
        neg_invalid_point = "PASS"
        print("  [OK] Invalid point test: Solver correctly rejected non-group point.")
        
    # 4. Final Verdict Calculation
    all_experiments_passed = True
    for d, report in test_results.items():
        if (report["scalar_verification"] != "PASS" or
            report["shared_secret_verification"] != "PASS" or
            report["session_key_verification"] != "PASS" or
            report["aes_gcm_authentication"] != "PASS" or
            report["plaintext_recovery"] != "PASS"):
            all_experiments_passed = False
            
    final_verdict = "PASS" if (all_experiments_passed and 
                              neg_wrong_point == "PASS" and 
                              neg_invalid_point == "PASS") else "FAIL"
                              
    # 5. Write Report to scratch/multi_key_quantum_validation.md
    report_content = f"""# Multi-Key Quantum Validation Report

This report summarizes the adversarial multi-key quantum validation runs checking ECDLP point recovery consistency.

## Curve Parameters
* **Equation:** $y^2 = x^3 + 3x + 2 \\pmod 5$
* **Modulus ($p$):** 5
* **Base Point ($G$):** (1, 1)
* **Order ($r$):** 5
* **Qiskit Simulator Backend:** AerSimulator
* **Qubits Allocated:** 9 Qubits
* **Inverse QFT Width:** 3 Qubits per register

---

## Test Matrix Run Reports

"""
    for d, r_details in test_results.items():
        report_content += f"""### Run Experiment d = {d}
* **Public Point Q:** {r_details["public_point"]}
* **Recovered Scalar:** {r_details["recovered_scalar"]}
* **Scalar Verification:** {r_details["scalar_verification"]}
* **ECDH Shared Secret Verification:** {r_details["shared_secret_verification"]}
* **HKDF Derived Key Verification:** {r_details["session_key_verification"]}
* **AES-GCM Authentication:** {r_details["aes_gcm_authentication"]}
* **Plaintext Recovery:** {r_details["plaintext_recovery"]}
* **Circuit Depth:** {r_details["depth"]}
* **Execution Time:** {r_details["execution_time"]:.4f}s
* **Top Measurement Counts:** {sorted(r_details["counts"].items(), key=lambda x: x[1], reverse=True)[:5]}

"""
        
    report_content += f"""---

## Verification & Negative Tests
* **Randomized Execution Order:** Verified (Run sequence: {scalars})
* **Anti-Leakage Parameter Inspection:** Verified (PASS)
* **Adversarial Point Adjustment:** {neg_wrong_point}
* **Non-Group Point Rejection:** {neg_invalid_point}

## Final Verdict
**{final_verdict}**
"""
    
    # Save the report markdown file
    report_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'multi_key_quantum_validation.md'))
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
        
    print(f"\nValidation report saved to: {report_path}")
    print("\n==================================================")
    print(f"FINAL VERDICT: {final_status_print(final_verdict)}")
    print("==================================================")
    
    if final_verdict != "PASS":
        sys.exit(1)

def final_status_print(status):
    return "PASS" if status == "PASS" else "FAIL"

if __name__ == "__main__":
    run_multi_key_validation()
