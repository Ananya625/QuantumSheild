import random

class EavesdropService:
    @staticmethod
    def intercept_qubits(alice_bits: list, alice_bases: list, num_bits: int) -> list:
        """
        Simulates an eavesdropper (Eve) intercepting Alice's qubits in transit.
        Eve must guess the basis for each qubit. If she guesses incorrectly,
        the qubit collapses into a random state in her chosen basis.
        When Bob later receives this collapsed qubit and measures it in the 
        correct (Alice's) basis, he will get a random result 50% of the time,
        leading to an average 25% Quantum Bit Error Rate (QBER).
        
        Returns:
            list: The collapsed bits that will be sent to Bob.
        """
        intercepted_bits = []
        for i in range(num_bits):
            # Eve chooses a random basis
            eve_basis = random.choice(['+', 'x'])
            
            if eve_basis == alice_bases[i]:
                # Eve guessed right, she measures the correct bit without disturbing it
                # (relative to Alice's original state).
                intercepted_bits.append(alice_bits[i])
            else:
                # Eve guessed wrong. The qubit state collapses into her basis,
                # effectively destroying Alice's original state information.
                # Eve measures a random bit, and the qubit forwarded to Bob 
                # is now randomized relative to Alice's original basis.
                intercepted_bits.append(random.randint(0, 1))
                
        return intercepted_bits
