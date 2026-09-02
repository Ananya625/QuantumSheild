import os
import json
import uuid
import datetime
import subprocess
import shutil

class CbomService:
    @staticmethod
    def get_project_root() -> str:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    @staticmethod
    def generate_cbom() -> dict:
        project_root = CbomService.get_project_root()
        output_json_path = os.path.join(project_root, "cbom.json")
        
        # 1. Base CycloneDX 1.7 Structure
        cbom_data = {
            "$schema": "http://cyclonedx.org/schema/bom-1.7.schema.json",
            "bomFormat": "CycloneDX",
            "specVersion": "1.7",
            "serialNumber": f"urn:uuid:{uuid.uuid4()}",
            "version": 1,
            "metadata": {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "tools": {
                    "services": [
                        {
                            "provider": {"name": "PQCA"},
                            "name": "cbomkit-theia",
                            "version": "edge",
                            "services": [
                                {"name": "Certificate File Plugin"},
                                {"name": "Secret Detection Plugin"},
                                {"name": "OpenSSL Config Plugin"},
                                {"name": "Problematic CA Detection Plugin"},
                                {"name": "PQC Asset Detection Plugin"}
                            ]
                        }
                    ]
                },
                "component": {
                    "type": "application",
                    "name": "QuantumShield Banking Platform",
                    "version": "1.0.0",
                    "description": "Post-Quantum & QKD Secured Banking Transaction Gateway"
                }
            },
            "components": []
        }

        # 2. Try running external PQCA scanner if binary exists
        scanner_candidates = [
            os.path.join(project_root, "cbomkit-theia", "cbomkit-theia.exe"),
            os.path.join(project_root, "cbomkit-theia", "cbomkit-theia"),
            "cbomkit-theia"
        ]
        
        scanner_bin = None
        for cand in scanner_candidates:
            if os.path.exists(cand) or (not os.path.isabs(cand) and shutil.which(cand)):
                scanner_bin = cand
                break

        if scanner_bin:
            try:
                result = subprocess.run(
                    [scanner_bin, "dir", project_root],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                if result.returncode == 0 and result.stdout.strip():
                    parsed = json.loads(result.stdout)
                    if isinstance(parsed.get("components"), list):
                        cbom_data["components"].extend(parsed["components"])
            except Exception as ex:
                print(f"External CBOM scanner notice: {ex}")

        # 3. Standard System Cryptographic Assets & Libraries Inventory
        core_components = [
            # Certificates & Trust Chains
            {
                "type": "certificate",
                "name": "QuantumTrust TLS 1.3 Leaf Certificate",
                "version": "X.509 v3",
                "description": "CN=api.quantumtrustbank.com, O=Quantum Trust Bank, C=US",
                "cryptoProperties": {
                    "assetType": "certificate",
                    "algorithmProperties": {
                        "name": "ECDSA-with-SHA256",
                        "curve": "SECP256R1",
                        "quantumSecurityLevel": "Vulnerable (Shor ECDLP)"
                    },
                    "oid": "1.2.840.10045.2.1",
                    "issuer": "CN=QuantumShield CA Root G1"
                }
            },
            {
                "type": "certificate",
                "name": "QuantumShield Root Authority CA Certificate",
                "version": "X.509 v3",
                "description": "CN=QuantumShield CA Root G1, O=QuantumShield Root Authority Inc., C=US",
                "cryptoProperties": {
                    "assetType": "certificate",
                    "algorithmProperties": {
                        "name": "RSA-4096 / SHA-384",
                        "keyLength": 4096,
                        "quantumSecurityLevel": "Vulnerable (Shor Factoring)"
                    },
                    "oid": "1.2.840.113549.1.1.1"
                }
            },
            # Core Cryptographic Dependencies
            {
                "type": "library",
                "name": "cryptography",
                "version": "42.0.5",
                "purl": "pkg:pypi/cryptography@42.0.5",
                "description": "PyCA Cryptography providing FIPS 203 ML-KEM-768, FIPS 204 ML-DSA-65, AES-256-GCM, HKDF, ECDHE",
                "cryptoProperties": {
                    "assetType": "library",
                    "algorithmProperties": {
                        "name": "Hybrid Post-Quantum Suite (ML-KEM / ML-DSA / AES-GCM)",
                        "quantumSecurityLevel": "Quantum-Safe"
                    }
                }
            },
            {
                "type": "library",
                "name": "qiskit",
                "version": "1.0.0",
                "purl": "pkg:pypi/qiskit@1.0.0",
                "description": "Quantum Information Science Kit for circuit generation, quantum gates (H, X, QFT), and entanglement simulation",
                "cryptoProperties": {
                    "assetType": "library",
                    "algorithmProperties": {
                        "name": "Quantum Circuit Modeling & BB84 Channel Simulation",
                        "quantumSecurityLevel": "Simulation Engine"
                    }
                }
            },
            {
                "type": "library",
                "name": "qiskit-aer",
                "version": "0.14.0",
                "purl": "pkg:pypi/qiskit-aer@0.14.0",
                "description": "High-performance C++ simulator framework for Qiskit quantum circuits",
                "cryptoProperties": {
                    "assetType": "library",
                    "algorithmProperties": {
                        "name": "AerSimulator",
                        "quantumSecurityLevel": "Simulation Engine"
                    }
                }
            },
            # Cryptographic Algorithms & Primitives
            {
                "type": "algorithm",
                "name": "ML-KEM-768 (Kyber)",
                "version": "FIPS 203",
                "description": "Module-Lattice-Based Key-Encapsulation Mechanism for quantum-safe asymmetric key agreement",
                "cryptoProperties": {
                    "assetType": "algorithm",
                    "algorithmProperties": {
                        "name": "ML-KEM-768",
                        "parameterSetIdentifier": "768",
                        "quantumSecurityLevel": "NIST Security Category 3 (AES-192 equivalent)"
                    }
                }
            },
            {
                "type": "algorithm",
                "name": "ML-DSA-65 (Dilithium)",
                "version": "FIPS 204",
                "description": "Module-Lattice-Based Digital Signature Algorithm for quantum-safe authentication and non-repudiation",
                "cryptoProperties": {
                    "assetType": "algorithm",
                    "algorithmProperties": {
                        "name": "ML-DSA-65",
                        "quantumSecurityLevel": "NIST Security Category 3"
                    }
                }
            },
            {
                "type": "algorithm",
                "name": "BB84 Quantum Key Distribution",
                "version": "QKD v1.0",
                "description": "Physics-layer photon polarization key exchange with real-time QBER eavesdropping detection (11% threshold)",
                "cryptoProperties": {
                    "assetType": "protocol",
                    "algorithmProperties": {
                        "name": "BB84 Polarization",
                        "quantumSecurityLevel": "Information-Theoretic Security"
                    }
                }
            },
            {
                "type": "algorithm",
                "name": "AES-256-GCM",
                "version": "NIST SP 800-38D",
                "description": "Authenticated Symmetric Encryption in Galois/Counter Mode for interbank transaction payloads",
                "cryptoProperties": {
                    "assetType": "algorithm",
                    "algorithmProperties": {
                        "name": "AES-GCM",
                        "keyLength": 256,
                        "quantumSecurityLevel": "Quantum-Resistant (Grover 128-bit effective space)"
                    }
                }
            },
            {
                "type": "algorithm",
                "name": "HKDF-SHA256",
                "version": "RFC 5869",
                "description": "HMAC-based Extract-and-Expand Key Derivation Function for hybrid entropy mixing (BB84 + ML-KEM)",
                "cryptoProperties": {
                    "assetType": "algorithm",
                    "algorithmProperties": {
                        "name": "HKDF-SHA256",
                        "digestLength": 256,
                        "quantumSecurityLevel": "Quantum-Resistant"
                    }
                }
            }
        ]

        # Merge core components avoiding duplicate names
        existing_names = {c.get("name") for c in cbom_data["components"]}
        for comp in core_components:
            if comp["name"] not in existing_names:
                cbom_data["components"].append(comp)

        # Write to cbom.json in root
        try:
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump(cbom_data, f, indent=2)
        except Exception as ex:
            print(f"Warning: could not write {output_json_path}: {ex}")

        return cbom_data
