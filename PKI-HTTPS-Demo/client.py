import ssl
import urllib.request
import socket
from pprint import pprint

def establish_secure_connection():
    port = 5000
    # We use localhost to match standard certificate CN naming conventions
    url = f"https://localhost:{port}/"
    
    print(f"[*] Establishing TLS connection to {url}...")
    
    # 1. Create an SSL context that trusts our self-signed certificate
    # This ensures we perform strict verification of the server's certificate,
    # but trust it explicitly as a custom certificate authority.
    context = ssl.create_default_context(cafile="certs/server.crt")
    
    # We will establish a socket connection and wrap it in the SSL Context
    # to perform a handshake and programmatically retrieve TLS parameters.
    try:
        # Create a standard TCP socket
        raw_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        raw_sock.settimeout(5.0)
        
        # Wrap socket using the SSL Context
        ssl_sock = context.wrap_socket(raw_sock, server_hostname="localhost")
        
        print(f"[*] Connecting to server socket on port {port}...")
        ssl_sock.connect(("localhost", port))
        
        # Connection succeeded! The handshake is done.
        print("\n[+] TLS Handshake Successful!")
        
        # 2. Extract and print connection parameters
        cipher = ssl_sock.cipher()
        version = ssl_sock.version()
        cert = ssl_sock.getpeercert()
        
        print("=" * 60)
        print("                   TLS CONNECTION DETAILS")
        print("=" * 60)
        print(f"  TLS Protocol Version : {version}")
        print(f"  Negotiated Cipher    : {cipher[0]}")
        print(f"  Cipher Strength (bits): {cipher[2]}")
        print("  Server Certificate Subject:")
        pprint(cert.get('subject'))
        print("  Server Certificate Issuer:")
        pprint(cert.get('issuer'))
        print("=" * 60)
        
        # Close the socket
        ssl_sock.close()
        
    except Exception as e:
        print(f"[-] Socket TLS Handshake failed: {e}")
        print("[*] Retrying with hostname check disabled...")
        # Retry with check_hostname = False but verifying certificate signature
        try:
            raw_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            raw_sock.settimeout(5.0)
            
            # Create context with CA trust but bypass domain hostname check (e.g. if IP is used)
            context_bypass = ssl.create_default_context(cafile="certs/server.crt")
            context_bypass.check_hostname = False
            
            ssl_sock = context_bypass.wrap_socket(raw_sock)
            ssl_sock.connect(("127.0.0.1", port))
            
            print("\n[+] TLS Handshake Successful (Hostname verification bypassed)!")
            cipher = ssl_sock.cipher()
            version = ssl_sock.version()
            
            print("=" * 60)
            print("                   TLS CONNECTION DETAILS (Bypassed Domain Check)")
            print("=" * 60)
            print(f"  TLS Protocol Version : {version}")
            print(f"  Negotiated Cipher    : {cipher[0]}")
            print(f"  Cipher Strength (bits): {cipher[2]}")
            print("=" * 60)
            ssl_sock.close()
        except Exception as ex:
            print(f"[-] Bypassed TLS Handshake also failed: {ex}")
            return

    # 3. Make HTTP request over HTTPS using urllib
    print("\n[*] Making HTTPS GET request...")
    try:
        req = urllib.request.Request(url)
        # Verify using our custom trusted CA certificate context
        with urllib.request.urlopen(req, context=context) as response:
            html = response.read().decode('utf-8')
            print("[+] Server Response:")
            print("-" * 40)
            print(html.strip())
            print("-" * 40)
    except Exception as e:
        print(f"[-] HTTPS request failed: {e}")

if __name__ == "__main__":
    establish_secure_connection()
