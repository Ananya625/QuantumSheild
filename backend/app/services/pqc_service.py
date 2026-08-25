import random
import hashlib
from cryptography.hazmat.primitives.asymmetric import mlkem, mldsa
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import PublicFormat, Encoding
from app.quantum.eavesdrop_service import EavesdropService

class PqcService:
    @staticmethod
    def simulate_bb84(num_bits: int = 256, noise_rate: float = 0.02, eavesdrop: bool = False) -> dict:
        """
        Simulates the BB84 QKD protocol between Alice and Bob:
        1. Alice generates random bits and random bases (+ or x).
        2. Bob generates random measurement bases.
        3. Bob measures Alice's qubits (introducing noise_rate bit flips on mismatch/noise).
        4. Reconcile matching bases.
        5. Calculate exact QBER (Quantum Bit Error Rate).
        6. Perform error correction (reconcile Bob's key to Alice's).
        7. Privacy amplification (SHA-256 hash).
        """
        # Alice's random bits (0 or 1)
        alice_bits = [random.randint(0, 1) for _ in range(num_bits)]
        # Alice's bases: '+' (rectilinear) or 'x' (diagonal)
        alice_bases = [random.choice(['+', 'x']) for _ in range(num_bits)]
        
        # Bob's bases
        bob_bases = [random.choice(['+', 'x']) for _ in range(num_bits)]
        
        # If eavesdropping is enabled, Eve intercepts the qubits before Bob
        if eavesdrop:
            transmitted_bits = EavesdropService.intercept_qubits(alice_bits, alice_bases, num_bits)
        else:
            transmitted_bits = alice_bits
            
        # Bob measures Alice's bits
        bob_measured = []
        for i in range(num_bits):
            if alice_bases[i] == bob_bases[i]:
                # Correct basis: Bob gets Alice's bit, but noise might flip it
                bit = transmitted_bits[i]
                if random.random() < noise_rate:
                    bit = 1 - bit # Flip bit due to channel noise
                bob_measured.append(bit)
            else:
                # Mismatched basis: Bob gets a random bit
                bob_measured.append(random.randint(0, 1))
                
        # Basis reconciliation
        matching_indices = [i for i in range(num_bits) if alice_bases[i] == bob_bases[i]]
        
        alice_reconciled = [alice_bits[i] for i in matching_indices]
        bob_reconciled = [bob_measured[i] for i in matching_indices]
        
        # Calculate QBER (Quantum Bit Error Rate) on matching bases
        total_matched = len(matching_indices)
        errors = sum(1 for i in range(total_matched) if alice_reconciled[i] != bob_reconciled[i])
        qber = (errors / total_matched) if total_matched > 0 else 0.0
        
        # Error correction: Bob corrects his mismatched bits to match Alice's
        # (Simulating Cascade/LDPC error correction, yielding Alice's exact key)
        corrected_bits = list(alice_reconciled) # Bob corrects his bits to match Alice
        
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
