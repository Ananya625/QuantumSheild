import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Transaction

db = SessionLocal()
tx = db.query(Transaction).order_by(Transaction.id.desc()).first()
if tx:
    print(f"Transaction ID: {tx.id}")
    print(f"Status: {tx.status}")
    print(f"Amount: {tx.amount}")
    print(f"Sender: {tx.sender_account}")
    print(f"Receiver: {tx.receiver_account}")
    print(f"Security Mode: {tx.security_mode}")
    print(f"DH Client Public: {tx.client_dh_public_pem}")
    print(f"DH Server Public: {tx.server_dh_public_pem}")
    print(f"Shared Secret: {tx.shared_secret_hex}")
    print(f"Session Key: {tx.session_key_hex}")
    print(f"Ciphertext: {tx.encrypted_payload_hex}")
    print(f"Signature: {tx.signature_hex}")
    print(f"Elapsed Time: {tx.elapsed_time}")
else:
    print("No transactions found.")
db.close()
