import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String, unique=True, index=True, nullable=False)
    owner_name = Column(String, nullable=False)
    bank_name = Column(String, default="Bank A", nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    session_id = Column(String, primary_key=True, index=True)
    device_id = Column(String, nullable=True)
    status = Column(String, default="INIT")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_active = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    transactions = relationship("Transaction", back_populates="session")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("user_sessions.session_id"), nullable=False)
    sender_account = Column(String, nullable=False)
    sender_bank = Column(String, nullable=True)
    receiver_account = Column(String, nullable=False)
    receiver_bank = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    elapsed_time = Column(Float, nullable=True)
    
    # TLS 1.3 details
    tls_cert_pem = Column(Text, nullable=True)
    tls_ca_cert_pem = Column(Text, nullable=True)
    
    # ECDHE details
    client_dh_public_pem = Column(Text, nullable=True)
    server_dh_public_pem = Column(Text, nullable=True)
    shared_secret_hex = Column(Text, nullable=True)
    
    # HKDF details
    session_key_hex = Column(Text, nullable=True)
    
    # AES-GCM encryption details
    encrypted_payload_hex = Column(Text, nullable=True)
    nonce_hex = Column(Text, nullable=True)
    tag_hex = Column(Text, nullable=True)
    
    # SHA-256 integrity hash
    integrity_hash_hex = Column(Text, nullable=True)
    
    # ECDSA digital signature details
    client_signing_public_pem = Column(Text, nullable=True)
    signature_hex = Column(Text, nullable=True)
    
    # Phase II - PQC details
    security_mode = Column(String, default="classical", nullable=False)
    bb84_alice_bits = Column(Text, nullable=True)
    bb84_alice_bases = Column(Text, nullable=True)
    bb84_bob_bases = Column(Text, nullable=True)
    bb84_qber = Column(Float, nullable=True)
    bb84_reconciled_key_hex = Column(Text, nullable=True)
    mlkem_public_key_pem = Column(Text, nullable=True)
    mlkem_ciphertext_hex = Column(Text, nullable=True)
    mlkem_secret_hex = Column(Text, nullable=True)
    mldsa_public_key_pem = Column(Text, nullable=True)
    mldsa_signature_hex = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    session = relationship("UserSession", back_populates="transactions")
