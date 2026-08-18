import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Account

db = SessionLocal()
alice = db.query(Account).filter(Account.owner_name == "Alice").first()
bob = db.query(Account).filter(Account.owner_name == "Bob").first()

if alice and bob:
    alice.balance = 5000.0
    bob.balance = 1000.0
    db.commit()
    print("Successfully reset balances:")
    print(f"  Alice: {alice.balance}")
    print(f"  Bob: {bob.balance}")
else:
    print("Could not find Alice or Bob account.")
db.close()
