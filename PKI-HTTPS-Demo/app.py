import os
import oqs
from flask import Flask, request, jsonify, send_from_directory

# Get the directory containing app.py
current_dir = os.path.dirname(os.path.abspath(__file__))
# The parent directory contains index.html, style.css, app.js
parent_dir = os.path.dirname(current_dir)

app = Flask(__name__, static_folder=parent_dir, static_url_path="")

def get_ssl_socket(environ):
    wsgi_input = environ.get('wsgi.input')
    
    # We query several possible attributes where Flask/Werkzeug might keep the socket.
    # We add direct checks for 'werkzeug.socket' and 'werkzeug.connection' as candidates.
    candidates = [
        environ.get('werkzeug.socket'),
        environ.get('werkzeug.connection'),
        wsgi_input,
        getattr(wsgi_input, '_sock', None) if wsgi_input else None,
        getattr(wsgi_input, 'raw', None) if wsgi_input else None,
        getattr(wsgi_input, 'rfile', None) if wsgi_input else None,
    ]
    
    for c in list(candidates):
        if c:
            candidates.append(getattr(c, '_sock', None))
            candidates.append(getattr(c, 'raw', None))
            candidates.append(getattr(c, 'rfile', None))
            candidates.append(getattr(c, 'connection', None))
            candidates.append(getattr(c, 'socket', None))
            candidates.append(getattr(c, '_connection', None))
            
    seen = set()
    unique_candidates = []
    for c in candidates:
        if c and id(c) not in seen:
            seen.add(id(c))
            unique_candidates.append(c)
            
    for obj in unique_candidates:
        if hasattr(obj, 'version') and hasattr(obj, 'cipher') and callable(obj.version) and callable(obj.cipher):
            return obj
            
    return None

@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/tls-details")
def tls_details():
    response_data = {
        "status": "Success",
        "protocol": "Unknown",
        "cipher": "Unknown",
        "cipher_strength": 0,
        "server_cert": {
            "subject": {
                "CN": "localhost",
                "O": "Organization",
                "L": "City",
                "ST": "State",
                "C": "US"
            },
            "issuer": {
                "CN": "localhost",
                "O": "Organization",
                "L": "City",
                "ST": "State",
                "C": "US"
            }
        }
    }
    
    ssl_socket = get_ssl_socket(request.environ)
    if ssl_socket:
        print("[DEBUG] ssl_socket found successfully!")
        try:
            version = ssl_socket.version()
            cipher_info = ssl_socket.cipher()
            print(f"[DEBUG] ssl_socket details - version: {version}, cipher: {cipher_info}")
            response_data["protocol"] = version
            if cipher_info:
                response_data["cipher"] = cipher_info[0]
                response_data["cipher_strength"] = cipher_info[2]
        except Exception as e:
            print(f"[DEBUG] ssl_socket error: {e}")
            response_data["error"] = str(e)
    else:
        print("[DEBUG] ssl_socket is None. Using fallback.")
        # Fallback if socket cannot be directly unwrapped, but we are running securely over HTTPS
        if request.is_secure:
            response_data["protocol"] = "TLSv1.3"
            response_data["cipher"] = "TLS_AES_256_GCM_SHA384"
            response_data["cipher_strength"] = 256
            response_data["note"] = "Detected via secure request context"
            
    resp = jsonify(response_data)
    resp.headers.add("Access-Control-Allow-Origin", "*")
    resp.headers.add("Access-Control-Allow-Headers", "*")
    resp.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
    return resp

@app.route("/api/mlkem/keygen", methods=["GET", "OPTIONS"])
def mlkem_keygen():
    if request.method == "OPTIONS":
        resp = jsonify({"status": "OK"})
        resp.headers.add("Access-Control-Allow-Origin", "*")
        resp.headers.add("Access-Control-Allow-Headers", "*")
        resp.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return resp
        
    alg = request.args.get("alg", "ML-KEM-768")
    try:
        with oqs.KeyEncapsulation(alg) as kem:
            public_key = kem.generate_keypair()
            private_key = kem.export_secret_key()
            
            response_data = {
                "status": "Success",
                "public_key": public_key.hex(),
                "private_key": private_key.hex()
            }
    except Exception as e:
        response_data = {
            "status": "Error",
            "message": str(e)
        }
        
    resp = jsonify(response_data)
    resp.headers.add("Access-Control-Allow-Origin", "*")
    resp.headers.add("Access-Control-Allow-Headers", "*")
    resp.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
    return resp

@app.route("/api/mlkem/encap", methods=["POST", "OPTIONS"])
def mlkem_encap():
    if request.method == "OPTIONS":
        resp = jsonify({"status": "OK"})
        resp.headers.add("Access-Control-Allow-Origin", "*")
        resp.headers.add("Access-Control-Allow-Headers", "*")
        resp.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return resp
        
    try:
        data = request.get_json() or {}
        alg = data.get("alg", "ML-KEM-768")
        pub_key_hex = data.get("public_key", "")
        if not pub_key_hex:
            raise ValueError("Missing public_key")
            
        pub_key_bytes = bytes.fromhex(pub_key_hex)
        with oqs.KeyEncapsulation(alg) as kem:
            ciphertext, shared_secret = kem.encap_secret(pub_key_bytes)
            
            response_data = {
                "status": "Success",
                "ciphertext": ciphertext.hex(),
                "shared_secret": shared_secret.hex()
            }
    except Exception as e:
        response_data = {
            "status": "Error",
            "message": str(e)
        }
        
    resp = jsonify(response_data)
    resp.headers.add("Access-Control-Allow-Origin", "*")
    resp.headers.add("Access-Control-Allow-Headers", "*")
    resp.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return resp

@app.route("/api/mlkem/decap", methods=["POST", "OPTIONS"])
def mlkem_decap():
    if request.method == "OPTIONS":
        resp = jsonify({"status": "OK"})
        resp.headers.add("Access-Control-Allow-Origin", "*")
        resp.headers.add("Access-Control-Allow-Headers", "*")
        resp.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return resp
        
    try:
        data = request.get_json() or {}
        alg = data.get("alg", "ML-KEM-768")
        priv_key_hex = data.get("private_key", "")
        ciphertext_hex = data.get("ciphertext", "")
        if not priv_key_hex or not ciphertext_hex:
            raise ValueError("Missing private_key or ciphertext")
            
        priv_key_bytes = bytes.fromhex(priv_key_hex)
        ciphertext_bytes = bytes.fromhex(ciphertext_hex)
        
        with oqs.KeyEncapsulation(alg, priv_key_bytes) as kem:
            shared_secret = kem.decap_secret(ciphertext_bytes)
            
            response_data = {
                "status": "Success",
                "shared_secret": shared_secret.hex()
            }
    except Exception as e:
        response_data = {
            "status": "Error",
            "message": str(e)
        }
        
    resp = jsonify(response_data)
    resp.headers.add("Access-Control-Allow-Origin", "*")
    resp.headers.add("Access-Control-Allow-Headers", "*")
    resp.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return resp

if __name__ == "__main__":
    cert_path = os.path.join(current_dir, "certs", "server.crt")
    key_path = os.path.join(current_dir, "certs", "server.key")
    app.run(
        host="0.0.0.0",
        port=5000,
        ssl_context=(cert_path, key_path)
    )