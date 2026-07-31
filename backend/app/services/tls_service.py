import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

class TlsService:
    @staticmethod
    def generate_handshake_certificates(domain_name: str = "api.quantumtrustbank.com") -> tuple[str, str]:
        """
        Simulates a TLS 1.3 server certificate generation signed by a simulated Root CA.
        Returns a tuple of (server_cert_pem, ca_cert_pem).
        """
        # 1. Generate Root CA Private Key & Certificate
        ca_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        ca_name = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "New York"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "New York City"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "QuantumShield Root Authority Inc."),
            x509.NameAttribute(NameOID.COMMON_NAME, "QuantumShield CA Root G1"),
        ])
        
        now = datetime.datetime.now(datetime.timezone.utc)
        ca_cert = (
            x509.CertificateBuilder()
            .subject_name(ca_name)
            .issuer_name(ca_name)
            .public_key(ca_private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1))
            .not_valid_after(now + datetime.timedelta(days=365))
            .add_extension(
                x509.BasicConstraints(ca=True, path_length=None), critical=True
            )
            .sign(ca_private_key, hashes.SHA256())
        )
        
        # 2. Generate Server Private Key & Certificate signed by Root CA
        server_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        server_name = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "New York"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Quantum Trust Bank"),
            x509.NameAttribute(NameOID.COMMON_NAME, domain_name),
        ])
        
        server_cert = (
            x509.CertificateBuilder()
            .subject_name(server_name)
            .issuer_name(ca_name)
            .public_key(server_private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(seconds=60)) # Valid slightly in the past
            .not_valid_after(now + datetime.timedelta(days=90))     # 90-day certificates are standard now
            .add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName(domain_name),
                    x509.DNSName("localhost")
                ]),
                critical=False,
            )
            .sign(ca_private_key, hashes.SHA256())
        )
        
        # Serialize certs to PEM
        ca_pem = ca_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
        server_pem = server_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
        
        return server_pem, ca_pem
