import random
import hashlib
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from cryptography.hazmat.primitives.asymmetric import mlkem, mldsa
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import PublicFormat, Encoding
from app.quantum.eavesdrop_service import EavesdropService

class PqcService:
    @staticmethod
    def simulate_bb84(num_bits: int = 256, noise_rate: float = 0.02, eavesdrop: bool = False) -> dict:
        """
        Simulates the BB84 QKD protocol between Alice and Bob using Qiskit quantum circuits:
        1. Alice generates random bits and random bases (+ or x).
        2. Qiskit QuantumCircuit prepares Alice's quantum states via X and H gates.
        3. If eavesdropping is enabled, Eve measures and collapses the quantum states.
        4. Bob applies basis measurement rotations (H gate for x basis) and measures.
        5. Qiskit AerSimulator executes the circuit and extracts Bob's classical measurements.
        6. Basis reconciliation (sifting matching bases).
        7. Calculate exact QBER (Quantum Bit Error Rate).
        8. Error correction and Privacy Amplification (SHA-256).
        """
        # 1. Alice's random bits (0 or 1) and random bases ('+' rectilinear or 'x' diagonal)
        alice_bits = [random.randint(0, 1) for _ in range(num_bits)]
        alice_bases = [random.choice(['+', 'x']) for _ in range(num_bits)]
        bob_bases = [random.choice(['+', 'x']) for _ in range(num_bits)]
        
        # 2. Build Qiskit Quantum Circuit
        qc = QuantumCircuit(num_bits, num_bits)
        
        # --- Stage A: Alice prepares photon polarization states ---
        for i in range(num_bits):
            if alice_bits[i] == 1:
                qc.x(i)  # Flip |0> to |1>
            if alice_bases[i] == 'x':
                qc.h(i)  # Apply Hadamard to prepare |+> or |->
                
        # --- Stage B: Eve Eavesdropping (Quantum State Collapse) ---
        if eavesdrop:
            for i in range(num_bits):
                eve_basis = random.choice(['+', 'x'])
                if eve_basis == 'x':
                    qc.h(i)
                qc.measure(i, i)  # Collapses the quantum state
                if eve_basis == 'x':
                    qc.h(i)  # Send forward to Bob
                    
        # --- Stage C: Bob Measures in Chosen Bases ---
        for i in range(num_bits):
            if bob_bases[i] == 'x':
                qc.h(i)  # Rotate to measure diagonal basis
            qc.measure(i, i)
            
        # --- Stage D: Run Circuit Simulation on Qiskit Aer ---
        simulator = AerSimulator()
        job = simulator.run(qc, shots=1, memory=True)
        result = job.result()
        raw_memory = result.get_memory()[0]
        # Qiskit stores bitstring in reverse order (qubit 0 is LSB)
        bob_measured = [int(b) for b in reversed(raw_memory)]
        
        # Apply simulated physical fiber channel noise
        if noise_rate > 0:
            for i in range(num_bits):
                if random.random() < noise_rate:
                    bob_measured[i] = 1 - bob_measured[i]
                    
        # --- Stage E: Basis Reconciliation (Sifting) ---
        matching_indices = [i for i in range(num_bits) if alice_bases[i] == bob_bases[i]]
        
        alice_reconciled = [alice_bits[i] for i in matching_indices]
        bob_reconciled = [bob_measured[i] for i in matching_indices]
        
        # Calculate QBER (Quantum Bit Error Rate) on matching bases
        total_matched = len(matching_indices)
        errors = sum(1 for i in range(total_matched) if alice_reconciled[i] != bob_reconciled[i])
        qber = (errors / total_matched) if total_matched > 0 else 0.0
        
        # Error correction: Bob corrects his mismatched bits to match Alice's
        corrected_bits = list(alice_reconciled)
        
        # Privacy Amplification: Hash the corrected bits to get a shared secret
        bit_string = "".join(str(b) for b in corrected_bits)
        bb84_secret_bytes = hashlib.sha256(bit_string.encode('utf-8')).digest()
        
        return {
            "alice_bits": "".join(str(b) for b in alice_bits),
            "alice_bases": "".join(alice_bases),
            "bob_bases": "".join(bob_bases),
            "matching_indices": ",".join(str(idx) for idx in matching_indices),
            "qber": qber * 100, # Percentage
            "bb84_secret_hex": bb84_secret_bytes.hex()
        }


    @staticmethod
    def generate_mlkem_exchange() -> dict:
        """
        Generates ML-KEM-768 key exchange parameters:
        1. Generate server (receiver) private/public key.
        2. Client (sender) encapsulates with server public key.
        3. Server decapsulates with private key.
        """
        # Server side
        priv_kem = mlkem.MLKEM768PrivateKey.generate()
        pub_kem = priv_kem.public_key()
        
        # Client side encapsulates
        mlkem_secret, ciphertext = pub_kem.encapsulate()
        
        # Server decapsulates to verify
        decapped_secret = priv_kem.decapsulate(ciphertext)
        assert mlkem_secret == decapped_secret, "ML-KEM decapsulation mismatch"
        
        # Serialize public key to raw bytes for display
        pub_bytes = pub_kem.public_bytes(
            encoding=Encoding.Raw,
            format=PublicFormat.Raw
        )
        
        return {
            "mlkem_public_key_pem": pub_bytes.hex().upper(), # Store as hex string representation
            "mlkem_ciphertext_hex": ciphertext.hex().upper(),
            "mlkem_secret_hex": mlkem_secret.hex().upper()
        }

    @staticmethod
    def sign_mldsa(message_bytes: bytes) -> dict:
        """
        Generates ML-DSA-65 digital signature:
        1. Generate private key.
        2. Sign message.
        3. Verify signature.
        """
        priv_dsa = mldsa.MLDSA65PrivateKey.generate()
        pub_dsa = priv_dsa.public_key()
        
        signature = priv_dsa.sign(message_bytes)
        
        # Verify
        pub_dsa.verify(signature, message_bytes)
        
        pub_bytes = pub_dsa.public_bytes(
            encoding=Encoding.Raw,
            format=PublicFormat.Raw
        )
        
        return {
            "mldsa_public_key_pem": pub_bytes.hex().upper(),
            "mldsa_signature_hex": signature.hex().upper()
        }

    @staticmethod
    def derive_hybrid_key(bb84_secret_hex: str, mlkem_secret_hex: str) -> str:
        """
        Derives the final session key using HKDF on the combined BB84 and ML-KEM secrets.
        """
        bb84_bytes = bytes.fromhex(bb84_secret_hex)
        mlkem_bytes = bytes.fromhex(mlkem_secret_hex)
        
        combined_entropy = bb84_bytes + mlkem_bytes
        
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b"quantumshield-hybrid"
        )
        session_key = hkdf.derive(combined_entropy)
        return session_key.hex().upper()
