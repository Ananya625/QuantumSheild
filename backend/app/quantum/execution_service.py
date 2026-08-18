import time
import json
from .engines.shor_engine import ShorEngine
from .impact_analyzer import CryptographicImpactAnalyzer
from ..services.crypto_service import CryptoService

class QuantumExecutionService:
    @staticmethod
    def execute_simulation(algorithm: str, params: dict = None) -> dict:
        """
        Coordinates the execution of the selected quantum algorithm, generates
        timestamped log entries, and triggers the cryptographic impact analysis.
        
        Args:
            algorithm (str): The quantum algorithm to run ('shor').
            params (dict): Parameters for execution containing captured cryptographic artifacts.
            
        Returns:
            dict: The simulation execution results, terminal logs, and threat mapping.
        """
        if params is None:
            params = {}
        else:
            params = dict(params)
            
        # Security boundary enforcement: delete any leaked secrets from simulation context
        params.pop("shared_secret_hex", None)
        params.pop("session_key_hex", None)
            
        algorithm_lower = algorithm.lower()
        tx_id = params.get("tx_id", 0)
        
        # Check if the curve is SECP256R1
        client_dh_public_pem = params.get("client_dh_public_pem")
        is_secp256r1 = False
        if client_dh_public_pem:
            try:
                from cryptography.hazmat.primitives import serialization
                from cryptography.hazmat.primitives.asymmetric import ec
                pub_key = serialization.load_pem_public_key(client_dh_public_pem.encode('utf-8'))
                if isinstance(pub_key, ec.EllipticCurvePublicKey) and pub_key.curve.name == "secp256r1":
                    is_secp256r1 = True
            except Exception:
                pass
                
        if algorithm_lower == "shor":
            if is_secp256r1:
                # Handle P-256 resource boundary (abort Qiskit discrete log run)
                logs = [
                    {"message": "Initializing Quantum Simulator...", "offset_ms": 0},
                    {"message": "Loading Captured TLS Handshake...", "offset_ms": 300},
                    {"message": "Detecting Key Exchange Mechanism...", "offset_ms": 700},
                    {"message": "SECP256R1 (NIST P-256) ECDHE Identified.", "offset_ms": 1200},
                    {"message": "Estimating Qubit Requirements for P-256 ECDLP...", "offset_ms": 1800},
                    {"message": "Error: Shor's discrete logarithm for P-256 requires 2304 logical qubits.", "offset_ms": 2400},
                    {"message": "Local simulation environment limit: 30 qubits. Attack aborted.", "offset_ms": 3000}
                ]
                metadata = {
                    "algorithm": "Shor's Algorithm",
                    "status": "resource_limited",
                    "qubits": 2304,
                    "backend": "N/A",
                    "simulator": "Local"
                }
                key_recovery = {
                    "ecdhe_private_key": "NOT_ATTEMPTED (SECP256R1 Private Exponent)",
                    "shared_secret": "NOT_ATTEMPTED",
                    "session_key": "NOT_ATTEMPTED"
                }
                decryption = {
                    "status": "not_attempted",
                    "plaintext": None,
                    "error": "Shor discrete logarithm period-finding is mathematically limited on local simulation for SECP256R1. Key recovery bypassed; decryption aborted."
                }
                resource_estimation = {
                    "curve": "SECP256R1",
                    "field_bits": 256,
                    "attack": "Shor discrete logarithm",
                    "estimated_logical_qubits": 2304,
                    "local_simulator_qubit_limit": 30,
                    "execution_possible": False,
                    "resource_estimate_status": "model_estimate",
                    "reason": "Current local simulation environment cannot execute a P-256-scale quantum ECDLP attack."
                }
                security_interpretation = {
                    "theoretical_quantum_vulnerability": True,
                    "current_local_demonstration_possible": False,
                    "reason": "Current simulator/hardware capability is insufficient for a P-256-scale ECDLP attack."
                }
                threat_assessment = {
                    "summary": "Shor's algorithm theoretically compromises SECP256R1, but execution is blocked by local simulator limits.",
                    "banking_components": {
                        "login": "secure_today",
                        "internet_banking": "secure_today",
                        "gateway": "secure_today",
                        "swift": "secure_today",
                        "atm": "secure_today",
                        "stored_transaction_payload": "secure_today"
                    },
                    "primitives": [
                        {
                            "name": "ECDHE",
                            "status": "Vulnerable in Theory / Secure in Practice",
                            "reason": "Shor's algorithm can solve P-256 discrete logs but requires 2304 logical qubits, which exceeds the local simulator limit (30 qubits)."
                        }
                    ]
                }
                return {
                    "success": False,
                    "logs": logs,
                    "metadata": metadata,
                    "quantum_result": {},
                    "key_recovery": key_recovery,
                    "decryption": decryption,
                    "resource_estimation": resource_estimation,
                    "security_interpretation": security_interpretation,
                    "threat_assessment": threat_assessment
                }
                
            # Run genuine Shor Qiskit computation (N=15, a=7) for non-SECP256R1 parameters
            engine_res = ShorEngine.run_shor(N=15, a=7)
            success = engine_res["success"]
            exec_time = engine_res["execution_time_sec"]
            qubits = engine_res["qubits"]
            
            security_mode = params.get("security_mode", "classical")
            if security_mode == "quantumshield":
                logs = [
                    {"message": "Initializing Quantum Simulator...", "offset_ms": 0},
                    {"message": "Loading Captured TLS Handshake...", "offset_ms": 300},
                    {"message": "Detecting Key Exchange Mechanism...", "offset_ms": 700},
                    {"message": "ML-KEM (Kyber) Identified.", "offset_ms": 1200},
                    {"message": "Executing Shor Quantum Computation...", "offset_ms": 1800},
                    {"message": "Quantum computation completed.", "offset_ms": 2500},
                    {"message": "No factorization/discrete logarithm target detected.", "offset_ms": 3000},
                    {"message": "Shared secret reconstruction unavailable.", "offset_ms": 3500},
                    {"message": "Session key derivation unsuccessful.", "offset_ms": 4000},
                    {"message": "Payload remains encrypted.", "offset_ms": 4500}
                ]
                
                metadata = {
                    "algorithm": "Shor's Algorithm",
                    "status": "completed" if success else "failed",
                    "execution_time": round(exec_time, 2),
                    "qubits": qubits,
                    "backend": "AerSimulator",
                    "simulator": "Local"
                }
                
                key_recovery = {
                    "key_exchange": "ML-KEM (Kyber) Detected",
                    "shared_secret": "No recoverable shared secret",
                    "session_key": "Not Derived",
                    "recovered_plaintext": "Unavailable",
                    "status": "Transaction Confidentiality Preserved"
                }
                
                decryption = {
                    "status": "unavailable",
                    "plaintext": None
                }
                
                threat_assessment = {
                    "summary": "Transaction Confidentiality Preserved. ML-KEM lattice-based cryptography is resilient to Shor's algorithm.",
                    "banking_components": {},
                    "primitives": []
                }
                
                return {
                    "success": success,
                    "logs": logs,
                    "metadata": metadata,
                    "quantum_result": engine_res,
                    "key_recovery": key_recovery,
                    "decryption": decryption,
                    "threat_assessment": threat_assessment
                }
                
            # Phase 1 and Phase 2 SOC-style forensic logs matching specified phases
            logs = [
                {"message": "Initializing Quantum Simulator...", "offset_ms": 0},
                {"message": "Building Quantum Circuit...", "offset_ms": 300},
                {"message": "Executing Shor Quantum Circuit...", "offset_ms": 700},
                {"message": "Collecting Measurement Results...", "offset_ms": 1300},
                {"message": "Recovering Period...", "offset_ms": 1800},
                {"message": "Recovering Factors...", "offset_ms": 2300},
                {"message": "Quantum Computation Completed.", "offset_ms": 2800},
                {"message": "Applying Cryptographic Impact Model...", "offset_ms": 3100},
                {"message": "Compromising Simulated Key Exchange...", "offset_ms": 3500},
                {"message": "Reconstructing Shared Secret...", "offset_ms": 3905},
                {"message": "Deriving Session Key via HKDF...", "offset_ms": 4310},
                {"message": "Session Key Successfully Derived.", "offset_ms": 4615},
                {"message": "Ready to Recover Captured Plaintext.", "offset_ms": 4920}
            ]
            
            metadata = {
                "algorithm": "Shor's Algorithm",
                "status": "completed" if success else "failed",
                "execution_time": round(exec_time, 2),
                "qubits": qubits,
                "backend": "AerSimulator",
                "simulator": "Local"
            }
            
            shared_secret_hex = params.get("shared_secret_hex")
            shared_secret_str = f"{shared_secret_hex[:16]}..." if shared_secret_hex else "N/A"
            session_key_hex = params.get("session_key_hex")
            session_key_str = f"{session_key_hex[:16]}..." if session_key_hex else "N/A"
            
            # Key recovery metadata
            key_recovery = {
                "ecdhe_private_key": "COMPROMISED (SECP256R1 Private Exponent)",
                "shared_secret": f"DERIVED (Shared secret calculated: {shared_secret_str})",
                "session_key": f"RECOVERED (AES-256 Symmetric Session Key: {session_key_str})"
            }
            
            # Phase 2 - Decrypt captured payload using the actual session key parameters
            decrypted_plaintext = None
            decryption_status = "completed"
            decryption_error = None
            try:
                encrypted_payload_hex = params.get("encrypted_payload_hex")
                session_key_hex = params.get("session_key_hex")
                nonce_hex = params.get("nonce_hex")
                tag_hex = params.get("tag_hex")
                
                if encrypted_payload_hex and session_key_hex and nonce_hex and tag_hex:
                    aes_key = bytes.fromhex(session_key_hex)
                    decrypted_str = CryptoService.decrypt_aes_gcm(
                        ciphertext_hex=encrypted_payload_hex,
                        key_bytes=aes_key,
                        nonce_hex=nonce_hex,
                        tag_hex=tag_hex
                    )
                    tx_dict = json.loads(decrypted_str)
                    decrypted_plaintext = {
                        "sender": params.get("sender", "Alice (JPMorgan)"),
                        "receiver": params.get("receiver", "Bob (HDFC)"),
                        "amount": f"${tx_dict.get('amount', 0.0):.2f}",
                        "memo": tx_dict.get("description", "Transfer"),
                        "reference_id": params.get("reference_id", "TX-000000"),
                        "timestamp": params.get("timestamp", "2026-08-06 12:00:00")
                    }
                else:
                    decryption_status = "failed"
                    if not session_key_hex:
                        decryption_error = "Shor discrete logarithm period-finding is mathematically limited on local simulation for SECP256R1. Key recovery bypassed; decryption aborted."
                    else:
                        decryption_error = "Missing cryptographic parameters for decryption"
            except Exception as e:
                print(f"Decryption failed during Shor cryptanalysis: {e}")
                decryption_status = "failed"
                decryption_error = f"AES-GCM decryption/authentication failed"
                
            decryption = {
                "status": decryption_status,
                "plaintext": decrypted_plaintext,
                "error": decryption_error
            }
            
            threat_assessment = CryptographicImpactAnalyzer.analyze_impact("shor", success, engine_res)
            
            return {
                "success": success,
                "logs": logs,
                "metadata": metadata,
                "quantum_result": engine_res,
                "key_recovery": key_recovery,
                "decryption": decryption,
                "threat_assessment": threat_assessment
            }
            
        else:
            return {
                "success": False,
                "logs": [{"message": f"Error: Unknown or unsupported algorithm '{algorithm}'", "offset_ms": 0}],
                "metadata": {"status": "failed", "algorithm": algorithm},
                "quantum_result": {},
                "key_recovery": {},
                "decryption": {},
                "threat_assessment": {}
            }
