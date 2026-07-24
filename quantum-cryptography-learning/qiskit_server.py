import os
import random
from flask import Flask, request, jsonify, send_from_directory
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

# Get the directory containing qiskit_server.py
current_dir = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=current_dir, static_url_path="")

@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")

# Manual CORS implementation
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

def measure_in_basis(sv, basis):
    """
    Measures the given 1-qubit Statevector in the specified basis.
    Returns (measured_bit, collapsed_statevector).
    """
    if basis == '+':
        # Measure in rectilinear basis (computational basis)
        outcome, collapsed_sv = sv.measure()
        bit = int(outcome)
        return bit, collapsed_sv
    else: # 'x' basis
        # Rotate to rectilinear basis by applying H gate
        temp_qc = QuantumCircuit(1)
        temp_qc.initialize(sv.data)
        temp_qc.h(0)
        sv_rotated = Statevector.from_instruction(temp_qc)
        
        # Measure in rotated basis
        outcome, collapsed_rotated = sv_rotated.measure()
        bit = int(outcome)
        
        # Rotate back to diagonal basis by applying H gate
        temp_qc2 = QuantumCircuit(1)
        temp_qc2.initialize(collapsed_rotated.data)
        temp_qc2.h(0)
        sv_back = Statevector.from_instruction(temp_qc2)
        
        return bit, sv_back

def get_angle(basis, bit):
    """Returns the physical polarization angle in degrees."""
    if basis == '+':
        return 0 if bit == 0 else 90
    else: # 'x'
        return 45 if bit == 0 else 135

@app.route('/api/m1/simulate', methods=['POST', 'OPTIONS'])
def m1_simulate():
    if request.method == 'OPTIONS':
        return jsonify({})
        
    data = request.json or {}
    gates = data.get('gates', [])
    measure = data.get('measure', False)
    
    # Construct Qiskit Circuit
    qc = QuantumCircuit(1)
    for gate in gates:
        if gate == 'X':
            qc.x(0)
        elif gate == 'H':
            qc.h(0)
        # 'I' gate doesn't change anything, so we skip it to be robust
            
    sv = Statevector.from_instruction(qc)
    
    if measure:
        outcome, collapsed_sv = sv.measure()
        result = {
            "alpha": {"r": float(collapsed_sv.data[0].real), "i": float(collapsed_sv.data[0].imag)},
            "beta": {"r": float(collapsed_sv.data[1].real), "i": float(collapsed_sv.data[1].imag)},
            "measuredValue": int(outcome),
            "measured": True
        }
    else:
        result = {
            "alpha": {"r": float(sv.data[0].real), "i": float(sv.data[0].imag)},
            "beta": {"r": float(sv.data[1].real), "i": float(sv.data[1].imag)},
            "measuredValue": None,
            "measured": False
        }
    return jsonify(result)

@app.route('/api/transmit', methods=['POST', 'OPTIONS'])
def transmit():
    if request.method == 'OPTIONS':
        return jsonify({})
        
    data = request.json or {}
    alice_bit = data.get('alice_bit', 0)
    alice_basis = data.get('alice_basis', '+')
    bob_basis = data.get('bob_basis', '+')
    eve_active = data.get('eve_active', False)
    eve_basis = data.get('eve_basis', '+')
    
    # 1. Alice prepares photon state
    qc = QuantumCircuit(1)
    if alice_bit == 1:
        qc.x(0)
    if alice_basis == 'x':
        qc.h(0)
        
    sv_alice = Statevector.from_instruction(qc)
    alice_angle = get_angle(alice_basis, alice_bit)
    
    # 2. Eve intercepts (optional)
    eve_bit = None
    eve_angle = None
    sv_to_bob = sv_alice
    
    if eve_active:
        eve_bit, sv_after_eve = measure_in_basis(sv_alice, eve_basis)
        eve_angle = get_angle(eve_basis, eve_bit)
        sv_to_bob = sv_after_eve
        
    # 3. Bob measures
    bob_bit, sv_after_bob = measure_in_basis(sv_to_bob, bob_basis)
    bob_angle = get_angle(bob_basis, bob_bit)
    
    return jsonify({
        "alice_bit": alice_bit,
        "alice_basis": alice_basis,
        "alice_angle": alice_angle,
        "eve_active": eve_active,
        "eve_basis": eve_basis,
        "eve_bit": eve_bit,
        "eve_angle": eve_angle,
        "bob_basis": bob_basis,
        "bob_bit": bob_bit,
        "bob_angle": bob_angle
    })

@app.route('/api/protocol', methods=['POST', 'OPTIONS'])
def protocol():
    if request.method == 'OPTIONS':
        return jsonify({})
        
    data = request.json or {}
    eve_present = data.get('eve_present', False)
    count = data.get('count', 20)
    
    results = []
    for _ in range(count):
        alice_bit = random.choice([0, 1])
        alice_basis = random.choice(['+', 'x'])
        bob_basis = random.choice(['+', 'x'])
        eve_basis = random.choice(['+', 'x'])
        
        # 1. Alice prepares
        qc = QuantumCircuit(1)
        if alice_bit == 1:
            qc.x(0)
        if alice_basis == 'x':
            qc.h(0)
        sv = Statevector.from_instruction(qc)
        
        # 2. Eve intercepts
        eve_bit = None
        if eve_present:
            eve_bit, sv = measure_in_basis(sv, eve_basis)
            
        # 3. Bob measures
        bob_bit, _ = measure_in_basis(sv, bob_basis)
        
        # Sifting check
        matched = (alice_basis == bob_basis)
        sifted_bit = bob_bit if matched else None
        is_error = matched and (alice_bit != bob_bit)
        
        results.append({
            "alice_bit": alice_bit,
            "alice_basis": alice_basis,
            "bob_basis": bob_basis,
            "bob_bit": bob_bit,
            "eve_basis": eve_basis if eve_present else None,
            "eve_bit": eve_bit if eve_present else None,
            "matched": matched,
            "sifted_bit": sifted_bit,
            "is_error": is_error
        })
        
    return jsonify(results)

if __name__ == '__main__':
    print("Qiskit Simulation backend running on http://localhost:5001")
    app.run(port=5001)
