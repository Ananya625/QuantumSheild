import asyncio
import json
import time
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Transaction, Account
from .services.crypto_service import CryptoService
from .services.tls_service import TlsService
from .services.pqc_service import PqcService
from .websocket import manager

async def run_transaction_pipeline(transaction_id: int):
    """
    Asynchronously runs the entire bank security transaction pipeline in the background.
    Executes actual cryptographic operations and DB commits step-by-step, streaming
    the state changes to the WebSocket.
    """
    db: Session = SessionLocal()
    start_time = time.time()
    try:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if not tx:
            print(f"Pipeline Coordinator: Transaction ID {transaction_id} not found.")
            return
            
        session_id = tx.session_id
        
        # Helper utility to commit state and stream events
        async def update_status(status_name: str, message: str, event_type: str, data: dict = None, sleep_time: float = 1.0):
            # Update DB (Source of truth)
            tx.status = status_name
            db.commit()
            db.refresh(tx)
            
            # Broadcast websocket event
            await manager.send_json(
                session_id=session_id,
                event_type=event_type,
                message=message,
                data=data or {}
            )
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

        # ==========================================
        # STAGE 1: AUTHENTICATION
        # ==========================================
        await update_status(
            status_name="AUTHENTICATING",
            message="Secure Gateway: Checking credentials and authorized device configuration...",
            event_type="AUTH_VERIFYING",
            sleep_time=0.8
        )
        
        sender = db.query(Account).filter(Account.account_number == tx.sender_account).first()
        receiver = db.query(Account).filter(Account.account_number == tx.receiver_account).first()
        
        if not sender or not receiver:
            await update_status(
                status_name="FAILED",
                message="Aborted: Sender or Receiver account not found in ledger.",
                event_type="PIPELINE_FAILED",
                sleep_time=0
            )
            return
            
        if sender.balance < tx.amount:
            await update_status(
                status_name="FAILED",
                message=f"Aborted: Insufficient account balance. Requested: ${tx.amount:.2f}, Available: ${sender.balance:.2f}.",
                event_type="PIPELINE_FAILED",
                sleep_time=0
            )
            return
            
        await update_status(
            status_name="AUTH_SUCCESS",
            message="Secure Gateway: Account access granted, authorized device handshake verified.",
            event_type="AUTH_SUCCESS",
            sleep_time=0.6
        )

        # ==========================================
        # STAGE 2: TLS HANDSHAKE
        # ==========================================
        await update_status(
            status_name="TLS_HANDSHAKE",
            message="TLS Handshake: Initiating Client Hello (TLS 1.3, SECP256R1, AES-256-GCM)...",
            event_type="TLS_STARTED",
            sleep_time=0.6
        )
        
        server_cert, ca_cert = TlsService.generate_handshake_certificates()
        tx.tls_cert_pem = server_cert
        tx.tls_ca_cert_pem = ca_cert
        db.commit()
        
        await manager.send_json(
            session_id=session_id,
            event_type="TLS_CERT_EXCHANGED",
            message="TLS Handshake: Server leaf certificate and Root CA certificate chain received.",
            data={
                "server_cert": server_cert,
                "ca_cert": ca_cert,
                "certificate_info": {
                    "subject": "CN=api.quantumtrustbank.com, O=Quantum Trust Bank, C=US",
                    "issuer": "CN=QuantumShield CA Root G1, O=QuantumShield Root Authority Inc., C=US"
                }
            }
        )
        await asyncio.sleep(0.8)
        
        await update_status(
            status_name="TLS_ESTABLISHED",
            message="TLS Handshake: Secure transport layer session established.",
            event_type="TLS_ESTABLISHED",
            sleep_time=0.6
        )

        # ==========================================
        # STAGE 3: KEY EXCHANGE (ECDHE or PQC BB84 + ML-KEM)
        # ==========================================
        if tx.security_mode == "quantumshield":
            await update_status(
                status_name="KEY_EXCHANGE",
                message="QuantumShield: Running BB84 QKD Qubits simulation and basis reconciliation...",
                event_type="ECDHE_STARTED",
                sleep_time=0.6
            )
            
            # Run BB84 qubit reconciliation
            bb84_res = PqcService.simulate_bb84(num_bits=256, noise_rate=0.015)
            tx.bb84_alice_bits = bb84_res["alice_bits"]
            tx.bb84_alice_bases = bb84_res["alice_bases"]
            tx.bb84_bob_bases = bb84_res["bob_bases"]
            tx.bb84_qber = bb84_res["qber"]
            tx.bb84_reconciled_key_hex = bb84_res["bb84_secret_hex"]
            
            # Run ML-KEM-768 encapsulation
            mlkem_res = PqcService.generate_mlkem_exchange()
            tx.mlkem_public_key_pem = mlkem_res["mlkem_public_key_pem"]
            tx.mlkem_ciphertext_hex = mlkem_res["mlkem_ciphertext_hex"]
            tx.mlkem_secret_hex = mlkem_res["mlkem_secret_hex"]
            
            # Derive session key immediately
            aes_key_hex = PqcService.derive_hybrid_key(bb84_res["bb84_secret_hex"], mlkem_res["mlkem_secret_hex"])
            tx.session_key_hex = aes_key_hex
            db.commit()
            
            await manager.send_json(
                session_id=session_id,
                event_type="ECDHE_COMPLETED",
                message=f"QuantumShield: BB84 QKD reconciled with QBER {bb84_res['qber']:.2f}%. ML-KEM-768 key encapsulated successfully.",
                data={
                    "client_public_key": mlkem_res["mlkem_public_key_pem"][:128] + "...",
                    "server_public_key": "ML-KEM-768 KEYPAIR",
                    "shared_secret": aes_key_hex
                }
            )
        else:
            await update_status(
                status_name="KEY_EXCHANGE",
                message="ECDHE: Client generating ephemeral SECP256R1 keypair and sending public key...",
                event_type="ECDHE_STARTED",
                sleep_time=0.6
            )
            
            # Simulate browser ECDHE generation and server ECDHE generation
            client_priv_pem, client_pub_pem = CryptoService.generate_ecdhe_key_pair()
            server_priv_pem, server_pub_pem = CryptoService.generate_ecdhe_key_pair()
            
            tx.client_dh_public_pem = client_pub_pem
            tx.server_dh_public_pem = server_pub_pem
            
            # Calculate shared secret
            shared_secret = CryptoService.compute_shared_secret(server_priv_pem, client_pub_pem)
            tx.shared_secret_hex = shared_secret.hex()
            db.commit()
            
            await manager.send_json(
                session_id=session_id,
                event_type="ECDHE_COMPLETED",
                message="ECDHE: Shared secret generated successfully on both client and server.",
                data={
                    "client_public_key": client_pub_pem,
                    "server_public_key": server_pub_pem,
                    "shared_secret": shared_secret.hex()
                }
            )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 4: KEY DERIVATION (HKDF)
        # ==========================================
        if tx.security_mode == "quantumshield":
            await update_status(
                status_name="DERIVE_KEY",
                message="HKDF: Deriving hybrid key using BB84 secret + ML-KEM secret...",
                event_type="HKDF_STARTED",
                sleep_time=0.6
            )
            aes_key = bytes.fromhex(tx.session_key_hex)
            
            await manager.send_json(
                session_id=session_id,
                event_type="HKDF_COMPLETED",
                message="HKDF: Derived 256-bit hybrid symmetric session key.",
                data={
                    "derived_session_key": tx.session_key_hex,
                    "hkdf_salt": "BB84 + ML-KEM-768 Entropy",
                    "hkdf_info": "quantumshield-hybrid"
                }
            )
        else:
            await update_status(
                status_name="DERIVE_KEY",
                message="HKDF: Deriving symmetric session key material using SHA-256 HMAC derivation...",
                event_type="HKDF_STARTED",
                sleep_time=0.6
            )
            shared_secret = bytes.fromhex(tx.shared_secret_hex)
            aes_key = CryptoService.derive_aes_key(shared_secret)
            tx.session_key_hex = aes_key.hex()
            db.commit()
            
            await manager.send_json(
                session_id=session_id,
                event_type="HKDF_COMPLETED",
                message="HKDF: Derived 256-bit symmetric session key.",
                data={
                    "derived_session_key": aes_key.hex(),
                    "hkdf_salt": "quantumshield-tls-salt-2026",
                    "hkdf_info": "quantumshield-aes-gcm-key-encryption"
                }
            )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 5: ENCRYPTION & HASHING (AES-GCM)
        # ==========================================
        await update_status(
            status_name="ENCRYPT_TX",
            message="AES-256-GCM: Preparing plaintext payload and hashing for integrity...",
            event_type="ENCRYPT_STARTED",
            sleep_time=0.6
        )
        
        tx_dict = {
            "sender_account": tx.sender_account,
            "receiver_account": tx.receiver_account,
            "amount": tx.amount,
            "description": tx.description
        }
        plaintext = json.dumps(tx_dict)
        
        # SHA-256 Hash
        tx_hash = CryptoService.sha256_hash(plaintext)
        tx.integrity_hash_hex = tx_hash
        
        # AES-GCM Encrypt
        ciphertext_hex, nonce_hex, tag_hex = CryptoService.encrypt_aes_gcm(plaintext, aes_key)
        tx.encrypted_payload_hex = ciphertext_hex
        tx.nonce_hex = nonce_hex
        tx.tag_hex = tag_hex
        db.commit()
        
        await manager.send_json(
            session_id=session_id,
            event_type="SHA256_HASHED",
            message="SHA-256: Generated payload integrity digest hash.",
            data={
                "plaintext": plaintext,
                "hash": tx_hash
            }
        )
        await asyncio.sleep(0.8)
        
        await manager.send_json(
            session_id=session_id,
            event_type="AES_ENCRYPTED",
            message="AES-256-GCM: Encrypted payload into ciphertext.",
            data={
                "plaintext": plaintext,
                "ciphertext": ciphertext_hex,
                "nonce": nonce_hex,
                "tag": tag_hex,
                "key": aes_key.hex()
            }
        )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 6: DIGITAL SIGNATURE (ECDSA or ML-DSA)
        # ==========================================
        if tx.security_mode == "quantumshield":
            await update_status(
                status_name="DIGITAL_SIGN",
                message="ML-DSA-65: Signing transaction hash with client's private Dilithium key...",
                event_type="ECDSA_STARTED",
                sleep_time=0.6
            )
            mldsa_res = PqcService.sign_mldsa(tx_hash.encode('utf-8'))
            tx.mldsa_public_key_pem = mldsa_res["mldsa_public_key_pem"]
            tx.mldsa_signature_hex = mldsa_res["mldsa_signature_hex"]
            tx.client_signing_public_pem = mldsa_res["mldsa_public_key_pem"]
            tx.signature_hex = mldsa_res["mldsa_signature_hex"]
            db.commit()
            
            sig_hex = mldsa_res["mldsa_signature_hex"]
            await manager.send_json(
                session_id=session_id,
                event_type="ECDSA_COMPLETED",
                message="ML-DSA-65: Dilithium digital signature generated successfully.",
                data={
                    "signature": sig_hex,
                    "r": sig_hex[:256],
                    "s": sig_hex[256:512],
                    "public_key": mldsa_res["mldsa_public_key_pem"]
                }
            )
        else:
            await update_status(
                status_name="DIGITAL_SIGN",
                message="ECDSA: Signing transaction hash with client's private signing key...",
                event_type="ECDSA_STARTED",
                sleep_time=0.6
            )
            
            sign_priv_pem, sign_pub_pem = CryptoService.generate_ecdsa_key_pair()
            tx.client_signing_public_pem = sign_pub_pem
            
            signature_hex = CryptoService.sign_payload(tx_hash, sign_priv_pem)
            tx.signature_hex = signature_hex
            db.commit()
            
            sig_len = len(signature_hex)
            r_comp = signature_hex[:sig_len//2]
            s_comp = signature_hex[sig_len//2:]
            
            await manager.send_json(
                session_id=session_id,
                event_type="ECDSA_COMPLETED",
                message="ECDSA: Digital signature successfully generated.",
                data={
                    "signature": signature_hex,
                    "r": r_comp,
                    "s": s_comp,
                    "public_key": sign_pub_pem
                }
            )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 7: PACKET TRANSMISSION
        # ==========================================
        packet_data = {
            "network_frame": {
                "source_ip": "192.168.1.45",
                "dest_ip": "10.0.8.12",
                "protocol": "TCP / TLS 1.3 / HTTPS",
                "length": 1024 + len(ciphertext_hex) // 2
            },
            "http_header": {
                "method": "POST",
                "path": "/api/gateway/incoming-transfer",
                "host": "api.bankb-gateway.com",
                "user_agent": "QuantumShield Client v1.0",
                "content_type": "application/octet-stream"
            },
            "tls_payload": {
                "encrypted_payload": ciphertext_hex,
                "signature": tx.signature_hex,
                "client_signing_key": tx.client_signing_public_pem
            }
        }
        
        await update_status(
            status_name="SEND_TX",
            message="TCP/IP: Routing packet frames across the internet gateway to Bank B...",
            event_type="TRANSACTION_SENT",
            data=packet_data,
            sleep_time=0.8
        )

        # ==========================================
        # STAGE 8: SIGNATURE VERIFICATION
        # ==========================================
        if tx.security_mode == "quantumshield":
            await update_status(
                status_name="VERIFY_SIGNATURE",
                message="HDFC Gateway: Verifying ML-DSA-65 signature of incoming packet...",
                event_type="SIGNATURE_VERIFY_STARTED",
                sleep_time=0.6
            )
            
            try:
                from cryptography.hazmat.primitives.asymmetric import mldsa
                pub_dsa = mldsa.MLDSA65PublicKey.from_public_bytes(bytes.fromhex(tx.mldsa_public_key_pem))
                pub_dsa.verify(bytes.fromhex(tx.mldsa_signature_hex), tx_hash.encode('utf-8'))
                is_valid = True
            except Exception as ex:
                print(f"ML-DSA verify exception: {ex}")
                is_valid = False
                
            if not is_valid:
                await update_status(
                    status_name="FAILED",
                    message="HDFC Gateway: ML-DSA signature verification failed. Packet dropped.",
                    event_type="PIPELINE_FAILED",
                    sleep_time=0
                )
                return
                
            await manager.send_json(
                session_id=session_id,
                event_type="SIGNATURE_VERIFIED",
                message="HDFC Gateway: ML-DSA-65 signature verified successfully. Authenticity confirmed.",
                data={
                    "signature_status": "VALID",
                    "public_key": tx.mldsa_public_key_pem,
                    "hash_verified": tx_hash
                }
            )
        else:
            await update_status(
                status_name="VERIFY_SIGNATURE",
                message="HDFC Gateway: Verifying ECDSA signature of incoming transaction packet...",
                event_type="SIGNATURE_VERIFY_STARTED",
                sleep_time=0.6
            )
            
            is_valid = CryptoService.verify_signature(tx_hash, tx.signature_hex, tx.client_signing_public_pem)
            if not is_valid:
                await update_status(
                    status_name="FAILED",
                    message="HDFC Gateway: Digital signature verification failed. Packet dropped.",
                    event_type="PIPELINE_FAILED",
                    sleep_time=0
                )
                return
                
            await manager.send_json(
                session_id=session_id,
                event_type="SIGNATURE_VERIFIED",
                message="HDFC Gateway: ECDSA signature verified successfully. Authenticity and integrity confirmed.",
                data={
                    "signature_status": "VALID",
                    "public_key": tx.client_signing_public_pem,
                    "hash_verified": tx_hash
                }
            )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 9: DECRYPTION
        # ==========================================
        await update_status(
            status_name="DECRYPT_TX",
            message="Bank B Gateway: Decrypting payload with session key...",
            event_type="DECRYPTION_STARTED",
            sleep_time=0.6
        )
        
        decrypted = CryptoService.decrypt_aes_gcm(ciphertext_hex, aes_key, nonce_hex, tag_hex)
        
        await manager.send_json(
            session_id=session_id,
            event_type="TRANSACTION_DECRYPTED",
            message="Bank B Gateway: Payload decrypted. Plaintext transaction variables recovered.",
            data={
                "plaintext": decrypted,
                "key": aes_key.hex(),
                "nonce": nonce_hex,
                "tag": tag_hex
            }
        )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 10: SETTLEMENT
        # ==========================================
        await update_status(
            status_name="SETTLEMENT",
            message="Ledger Settlement: Deduced transaction value and executing SQL transfer updates...",
            event_type="SETTLEMENT_STARTED",
            sleep_time=0.6
        )
        
        # Deduct / Add balances in SQLite
        sender.balance -= tx.amount
        receiver.balance += tx.amount
        tx.status = "SETTLED"
        db.commit()
        
        await manager.send_json(
            session_id=session_id,
            event_type="TRANSACTION_SETTLED",
            message="Ledger Settlement: Balances committed to inter-bank databases successfully.",
            data={
                "sender_account": sender.account_number,
                "sender_new_balance": sender.balance,
                "receiver_account": receiver.account_number,
                "receiver_new_balance": receiver.balance,
                "amount_transferred": tx.amount
            }
        )
        await asyncio.sleep(0.8)

        # ==========================================
        # STAGE 11: COMPLETE & CONFIRM
        # ==========================================
        elapsed = time.time() - start_time
        tx.elapsed_time = elapsed
        
        await update_status(
            status_name="SUCCESS",
            message="Core Banking: Receipt generated. Transaction completed successfully.",
            event_type="TRANSACTION_SUCCESS",
            data={
                "transaction_id": tx.id,
                "sender": tx.sender_account,
                "receiver": tx.receiver_account,
                "amount": tx.amount,
                "status": "SUCCESS",
                "elapsed_time": elapsed
            },
            sleep_time=0
        )
        
    except Exception as e:
        print(f"Error in pipeline coordinator: {e}")
        try:
            elapsed = time.time() - start_time
            tx.status = "FAILED"
            tx.elapsed_time = elapsed
            db.commit()
            await manager.send_json(
                session_id=session_id,
                event_type="PIPELINE_FAILED",
                message=f"System aborted: Processing error - {str(e)}",
                data={"elapsed_time": elapsed}
            )
        except Exception:
            pass
    finally:
        db.close()
