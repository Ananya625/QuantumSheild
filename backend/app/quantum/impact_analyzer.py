class CryptographicImpactAnalyzer:
    @staticmethod
    def analyze_impact(algorithm: str, success: bool, quantum_result: dict) -> dict:
        """
        Maps a successful quantum computation result to its cryptographic primitive
        vulnerabilities and banking service exposures.
        
        Args:
            algorithm (str): The name of the quantum algorithm run ('shor' or 'grover').
            success (bool): Whether the quantum execution completed successfully.
            quantum_result (dict): The raw dictionary outcome of the quantum engine.
            
        Returns:
            dict: The impact assessment detailing cryptographic exposure and affected banking systems.
        """
        if not success:
            return {
                "banking_components": {},
                "primitives": [],
                "summary": "Quantum execution failed; no cryptographic impact could be verified."
            }
            
        if algorithm.lower() == "shor":
            return {
                "summary": (
                    "Asymmetric key exchange compromise and signature vulnerabilities successfully demonstrated. "
                    "By solving prime factorization and discrete logarithm mathematics, Shor's algorithm "
                    "dismantles the asymmetric primitives protecting the session key exchange and transaction signature."
                ),
                "banking_components": {
                    "login": "vulnerable",
                    "internet_banking": "vulnerable",
                    "gateway": "vulnerable",
                    "swift": "vulnerable",
                    "atm": "vulnerable",
                    "stored_transaction_payload": "vulnerable"
                },
                "primitives": [
                    {
                        "name": "ECDHE",
                        "status": "Key Exchange Compromised",
                        "reason": "Shor's algorithm solves discrete logarithms in polynomial time, exposing public parameter key exchange."
                    },
                    {
                        "name": "Session Key",
                        "status": "Session Key Recovered",
                        "reason": "Compromised key exchange parameters allow retroactive calculation of the derived symmetric session key."
                    },
                    {
                        "name": "AES-256",
                        "status": "Payload Decrypted",
                        "reason": "The encrypted payload is fully readable because the AES-256 session key was compromised via the key exchange."
                    },
                    {
                        "name": "ECDSA / RSA",
                        "status": "Signature Vulnerable",
                        "reason": "Asymmetric private key reconstruction allows forged digital signatures, compromising transaction authenticity."
                    },
                    {
                        "name": "TLS 1.3",
                        "status": "Protocol Secure / Primitives Vulnerable",
                        "reason": "TLS 1.3 protocol structure remains secure today, but its underlying public-key exchange algorithms are vulnerable."
                    }
                ]
            }
        
        return {
            "banking_components": {},
            "primitives": [],
            "summary": "Unknown or unsupported quantum algorithm; no impact map available."
        }
