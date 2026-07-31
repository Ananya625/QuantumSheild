import os
import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class CryptoService:
    @staticmethod
    def generate_ecdhe_key_pair() -> tuple[str, str]:
        """Generates an ephemeral ECDHE SECP256R1 key pair in PEM format."""
        private_key = ec.generate_private_key(ec.SECP256R1())
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')

        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        return private_pem, public_pem

    @staticmethod
    def compute_shared_secret(private_key_pem: str, opponent_public_key_pem: str) -> bytes:
        """Computes the ECDH shared secret."""
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'), 
            password=None
        )
        opponent_public_key = serialization.load_pem_public_key(
            opponent_public_key_pem.encode('utf-8')
        )
        
        if not isinstance(private_key, ec.EllipticCurvePrivateKey) or not isinstance(opponent_public_key, ec.EllipticCurvePublicKey):
            raise ValueError("Keys must be Elliptic Curve keys")
            
        shared_secret = private_key.exchange(ec.ECDH(), opponent_public_key)
        return shared_secret

    @staticmethod
    def derive_aes_key(shared_secret: bytes) -> bytes:
        """Derives a 256-bit AES key from a shared secret using HKDF with SHA-256."""
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"quantumshield-tls-salt-2026",
            info=b"quantumshield-aes-gcm-key-encryption"
        )
        return hkdf.derive(shared_secret)

    @staticmethod
    def encrypt_aes_gcm(plaintext: str, key_bytes: bytes) -> tuple[str, str, str]:
        """
        Encrypts plaintext with AES-256-GCM.
        Returns hex encoded (ciphertext, nonce, tag).
        """
        plaintext_bytes = plaintext.encode('utf-8')
        aesgcm = AESGCM(key_bytes)
        nonce = os.urandom(12)  # Standard 12-byte GCM nonce
        
        # encrypt returns ciphertext + 16-byte tag
        ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext_bytes, associated_data=None)
        
        tag = ciphertext_with_tag[-16:]
        ciphertext = ciphertext_with_tag[:-16]
        
        return ciphertext.hex(), nonce.hex(), tag.hex()

    @staticmethod
    def decrypt_aes_gcm(ciphertext_hex: str, key_bytes: bytes, nonce_hex: str, tag_hex: str) -> str:
        """Decrypts AES-256-GCM hex encoded values, returning plaintext."""
        ciphertext = bytes.fromhex(ciphertext_hex)
        nonce = bytes.fromhex(nonce_hex)
        tag = bytes.fromhex(tag_hex)
        
        aesgcm = AESGCM(key_bytes)
        ciphertext_with_tag = ciphertext + tag
        
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, associated_data=None)
        return plaintext_bytes.decode('utf-8')

    @staticmethod
    def generate_ecdsa_key_pair() -> tuple[str, str]:
        """Generates an ECDSA signing key pair in PEM format."""
        private_key = ec.generate_private_key(ec.SECP256R1())
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')

        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        return private_pem, public_pem

    @staticmethod
    def sign_payload(payload: str, private_key_pem: str) -> str:
        """Signs a payload using ECDSA private key with SHA-256."""
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None
        )
        if not isinstance(private_key, ec.EllipticCurvePrivateKey):
            raise ValueError("Key must be an Elliptic Curve private key")
            
        signature = private_key.sign(
            payload.encode('utf-8'),
            ec.ECDSA(hashes.SHA256())
        )
        return signature.hex()

    @staticmethod
    def verify_signature(payload: str, signature_hex: str, public_key_pem: str) -> bool:
        """Verifies an ECDSA signature using a public key."""
        try:
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode('utf-8')
            )
            if not isinstance(public_key, ec.EllipticCurvePublicKey):
                return False
                
            signature = bytes.fromhex(signature_hex)
            public_key.verify(
                signature,
                payload.encode('utf-8'),
                ec.ECDSA(hashes.SHA256())
            )
            return True
        except Exception:
            return False

    @staticmethod
    def sha256_hash(payload: str) -> str:
        """Computes the SHA-256 hash of a payload in hex format."""
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()
