import sys
import os
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.crypto_service import CryptoService
from app.database import SessionLocal
from app.models import Transaction

def test_cryptographic_pipeline():
    print("==================================================")
    print("TEST: Verifying SECP256R1 -> HKDF -> AES-GCM chain")
    print("==================================================")
    
    # 1. Generate client & server key pairs
    client_priv_pem, client_pub_pem = CryptoService.generate_ecdhe_key_pair()
    server_priv_pem, server_pub_pem = CryptoService.generate_ecdhe_key_pair()
    
    assert "BEGIN PRIVATE KEY" in client_priv_pem
    assert "BEGIN PUBLIC KEY" in client_pub_pem
    assert "BEGIN PRIVATE KEY" in server_priv_pem
    assert "BEGIN PUBLIC KEY" in server_pub_pem
    print("[OK] Ephemeral SECP256R1 key pairs generated successfully.")

    # 2. Compute shared secret
    shared_secret_client = CryptoService.compute_shared_secret(client_priv_pem, server_pub_pem)
    shared_secret_server = CryptoService.compute_shared_secret(server_priv_pem, client_pub_pem)
    
    assert shared_secret_client == shared_secret_server, "ECDH shared secret mismatch!"
    print(f"[OK] ECDH shared secret matches: {shared_secret_client.hex()[:16]}... (Length: {len(shared_secret_client)} bytes)")

    # 3. Derive symmetric key via HKDF
    aes_key_client = CryptoService.derive_aes_key(shared_secret_client)
    aes_key_server = CryptoService.derive_aes_key(shared_secret_server)
    
    assert aes_key_client == aes_key_server, "HKDF derived key mismatch!"
    assert len(aes_key_client) == 32, f"Key length must be 32 bytes (256-bit), got {len(aes_key_client)}"
    print(f"[OK] HKDF derived session key matches: {aes_key_client.hex()[:16]}...")

    # 4. Perform AES-GCM encryption
    original_plaintext = json.dumps({
        "sender_account": "123456789",
        "receiver_account": "987654321",
        "amount": 250.00,
        "description": "Integrity Test Transfer"
    })
    
    ciphertext_hex, nonce_hex, tag_hex = CryptoService.encrypt_aes_gcm(original_plaintext, aes_key_client)
    print(f"[OK] Payload encrypted. Ciphertext: {ciphertext_hex[:16]}... Nonce: {nonce_hex} Tag: {tag_hex}")

    # 5. Perform AES-GCM decryption and verify correctness
    recovered_plaintext = CryptoService.decrypt_aes_gcm(
        ciphertext_hex=ciphertext_hex,
        key_bytes=aes_key_server,
        nonce_hex=nonce_hex,
        tag_hex=tag_hex
    )
    
    assert recovered_plaintext == original_plaintext, "Decrypted plaintext does not match original!"
    print("[OK] Decrypted plaintext matches original payload exactly.")

    # 6. Verify parameter perturbations cause decryption failures
    print("\nVerifying robustness to parameter modifications:")
    
    # Test 6a: Corrupted Key
    corrupted_key = bytearray(aes_key_server)
    corrupted_key[0] ^= 0xFF
    try:
        CryptoService.decrypt_aes_gcm(ciphertext_hex, bytes(corrupted_key), nonce_hex, tag_hex)
        raise AssertionError("Decryption succeeded with a corrupted key!")
    except InvalidTag:
        print("  [OK] Corrupted key successfully caused InvalidTag exception.")

    # Test 6b: Corrupted Nonce
    corrupted_nonce = bytearray(bytes.fromhex(nonce_hex))
    corrupted_nonce[0] ^= 0xFF
    try:
        CryptoService.decrypt_aes_gcm(ciphertext_hex, aes_key_server, corrupted_nonce.hex(), tag_hex)
        raise AssertionError("Decryption succeeded with a corrupted nonce!")
    except InvalidTag:
        print("  [OK] Corrupted nonce successfully caused InvalidTag exception.")

    # Test 6c: Corrupted Tag
    corrupted_tag = bytearray(bytes.fromhex(tag_hex))
    corrupted_tag[0] ^= 0xFF
    try:
        CryptoService.decrypt_aes_gcm(ciphertext_hex, aes_key_server, nonce_hex, corrupted_tag.hex())
        raise AssertionError("Decryption succeeded with a corrupted tag!")
    except InvalidTag:
        print("  [OK] Corrupted tag successfully caused InvalidTag exception.")

    # Test 6d: Corrupted Ciphertext
    corrupted_ciphertext = bytearray(bytes.fromhex(ciphertext_hex))
    corrupted_ciphertext[0] ^= 0xFF
    try:
        CryptoService.decrypt_aes_gcm(corrupted_ciphertext.hex(), aes_key_server, nonce_hex, tag_hex)
        raise AssertionError("Decryption succeeded with corrupted ciphertext!")
    except InvalidTag:
        print("  [OK] Corrupted ciphertext successfully caused InvalidTag exception.")

def verify_database_records():
    print("\n==================================================")
    print("TEST: Verifying consistency of DB transaction logs")
    print("==================================================")
    
    db = SessionLocal()
    try:
        # Fetch the most recent completed classical transaction
        tx = db.query(Transaction).filter(
            Transaction.security_mode == "classical",
            Transaction.status != "PENDING"
        ).order_by(Transaction.id.desc()).first()
        
        if not tx:
            print("[!] No completed classical transaction logs found in DB to verify. Skipping.")
            return
            
        print(f"Verifying Transaction ID: {tx.id}")
        print(f"  Sender: {tx.sender_account} | Receiver: {tx.receiver_account} | Amount: ${tx.amount:.2f}")
        
        # Verify columns exist
        assert tx.client_dh_public_pem is not None, "Missing client_dh_public_pem!"
        assert tx.server_dh_public_pem is not None, "Missing server_dh_public_pem!"
        assert tx.shared_secret_hex is not None, "Missing shared_secret_hex!"
        assert tx.session_key_hex is not None, "Missing session_key_hex!"
        assert tx.encrypted_payload_hex is not None, "Missing encrypted_payload_hex!"
        assert tx.nonce_hex is not None, "Missing nonce_hex!"
        assert tx.tag_hex is not None, "Missing tag_hex!"
        
        # Re-derive session key from DB shared secret
        db_shared_secret = bytes.fromhex(tx.shared_secret_hex)
        derived_session_key = CryptoService.derive_aes_key(db_shared_secret)
        
        assert derived_session_key.hex() == tx.session_key_hex, "DB stored session key is NOT derived from stored shared secret!"
        print("[OK] DB session key matches derived key from stored shared secret.")
        
        # Attempt to decrypt DB ciphertext with the DB session key
        decrypted_db = CryptoService.decrypt_aes_gcm(
            ciphertext_hex=tx.encrypted_payload_hex,
            key_bytes=derived_session_key,
            nonce_hex=tx.nonce_hex,
            tag_hex=tx.tag_hex
        )
        
        tx_dict = json.loads(decrypted_db)
        assert tx_dict["sender_account"] == tx.sender_account, "Decrypted sender mismatch!"
        assert tx_dict["receiver_account"] == tx.receiver_account, "Decrypted receiver mismatch!"
        assert float(tx_dict["amount"]) == tx.amount, "Decrypted amount mismatch!"
        print("[OK] Decrypted DB ciphertext matches ledger record fields exactly.")
        print("[OK] DB Cryptographic consistency verified.")
        
    except Exception as e:
        print(f"[ERROR] DB verification failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_cryptographic_pipeline()
    verify_database_records()
    print("\nAll cryptographic integrity tests passed successfully!")
