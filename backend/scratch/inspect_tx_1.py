import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Transaction

db = SessionLocal()
tx = db.query(Transaction).filter(Transaction.id == 1).first()
print(f"TX 1 client public key:\n{tx.client_dh_public_pem}")
db.close()
