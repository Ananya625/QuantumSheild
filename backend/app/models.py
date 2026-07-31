import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String, unique=True, index=True, nullable=False)
    owner_name = Column(String, nullable=False)
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
    receiver_account = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    
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
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    session = relationship("UserSession", back_populates="transactions")
