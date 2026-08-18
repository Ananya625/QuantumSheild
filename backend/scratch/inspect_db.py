import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models import Account, Transaction, UserSession

db = SessionLocal()
print("Accounts:")
for acc in db.query(Account).all():
    print(f"  Account: {acc.account_number} | Bank: {acc.bank_name} | Balance: {acc.balance}")

print("\nLast 5 Transactions:")
for tx in db.query(Transaction).order_by(Transaction.id.desc()).limit(5).all():
    print(f"  TX {tx.id}: {tx.sender_account} -> {tx.receiver_account} | Amount: {tx.amount} | Status: {tx.status}")
db.close()
