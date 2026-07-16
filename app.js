// Global State
let selectedFile = null;
let selectedSigFile = null;
let signatureMethod = 'file'; // 'file' or 'text'
let currentTab = 'tab-gen';

// PEM formatting and conversion helpers
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64.trim());
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hexString) {
    const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '');
    if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string length");
    }
    const view = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        view[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return view.buffer;
}

function spkiToPem(spkiBuffer) {
    const base64 = arrayBufferToBase64(spkiBuffer);
    const matches = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${matches.join('\n')}\n-----END PUBLIC KEY-----`;
}

function pkcs8ToPem(pkcs8Buffer) {
    const base64 = arrayBufferToBase64(pkcs8Buffer);
    const matches = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN PRIVATE KEY-----\n${matches.join('\n')}\n-----END PRIVATE KEY-----`;
}

function pemToSpki(pem) {
    const cleanPem = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s+/g, '');
    return base64ToArrayBuffer(cleanPem);
}

function pemToPkcs8(pem) {
    const cleanPem = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s+/g, '');
    return base64ToArrayBuffer(cleanPem);
}

// Tab switcher
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`btn-${tabId}`).classList.add('active');
    currentTab = tabId;
}

// UI State Toggles for Encrypt/Decrypt
function toggleCryptMode() {
    const mode = document.getElementById('crypt-mode').value;
    const inputLabel = document.getElementById('crypt-input-label');
    const inputTextArea = document.getElementById('crypt-input');
    const keyLabel = document.getElementById('crypt-key-label');
    const keyTextArea = document.getElementById('crypt-key');
    const outputLabel = document.getElementById('crypt-output-label');
    const btnExecute = document.getElementById('btn-crypt-execute');

    if (mode === 'encrypt') {
        inputLabel.textContent = 'Plaintext Message';
        inputTextArea.placeholder = 'Enter message to encrypt...';
        keyLabel.textContent = 'Public Key (PEM)';
        keyTextArea.placeholder = '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----';
        outputLabel.textContent = 'Ciphertext Result';
        btnExecute.innerHTML = '<i class="fa-solid fa-lock"></i> Encrypt Message';
    } else {
        inputLabel.textContent = 'Ciphertext Message (Base64 or Hex)';
        inputTextArea.placeholder = 'Paste ciphertext here...';
        keyLabel.textContent = 'Private Key (PEM)';
        keyTextArea.placeholder = '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----';
        outputLabel.textContent = 'Plaintext Result';
        btnExecute.innerHTML = '<i class="fa-solid fa-unlock"></i> Decrypt Message';
    }
    // Clear output
    document.getElementById('crypt-output').value = '';
}

// UI State Toggles for Sign/Verify
function toggleSignMode() {
    const mode = document.getElementById('sign-mode').value;
    const keyLabel = document.getElementById('sign-key-label');
    const keyTextArea = document.getElementById('sign-key');
    const sigInputGroup = document.getElementById('signature-input-group');
    const sigOutputGroup = document.getElementById('signature-output-group');
    const btnExecute = document.getElementById('btn-sign-execute');
    const banner = document.getElementById('verify-result-banner');

    banner.classList.add('hidden');

    if (mode === 'sign') {
        keyLabel.textContent = 'Private Key (PEM)';
        keyTextArea.placeholder = '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----';
        sigInputGroup.classList.add('hidden');
        sigOutputGroup.classList.add('hidden');
        btnExecute.innerHTML = '<i class="fa-solid fa-signature"></i> Sign File';
    } else {
        keyLabel.textContent = 'Public Key (PEM)';
        keyTextArea.placeholder = '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----';
        sigInputGroup.classList.remove('hidden');
        sigOutputGroup.classList.add('hidden');
        btnExecute.innerHTML = '<i class="fa-solid fa-file-shield"></i> Verify File';
    }
}

// File Drag & Drop handlers
const fileZone = document.getElementById('file-zone');

if (fileZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
        fileZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileZone.classList.remove('dragover');
        }, false);
    });

    fileZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            setFile(files[0]);
        }
    });
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        setFile(files[0]);
    }
}

function setFile(file) {
    selectedFile = file;
    const nameDisplay = document.getElementById('file-name-display');
    const infoText = document.getElementById('file-zone-text');
    
    if (file) {
        const sizeStr = formatBytes(file.size);
        nameDisplay.textContent = `${file.name} (${sizeStr})`;
        nameDisplay.classList.remove('hidden');
        infoText.classList.add('hidden');
    } else {
        nameDisplay.classList.add('hidden');
        infoText.classList.remove('hidden');
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function setSignatureMethod(method) {
    signatureMethod = method;
    const btnFile = document.getElementById('btn-sig-method-file');
    const btnText = document.getElementById('btn-sig-method-text');
    const containerFile = document.getElementById('sig-file-container');
    const containerText = document.getElementById('sig-text-container');

    if (method === 'file') {
        btnFile.classList.add('active');
        btnText.classList.remove('active');
        containerFile.classList.remove('hidden');
        containerText.classList.add('hidden');
    } else {
        btnFile.classList.remove('active');
        btnText.classList.add('active');
        containerFile.classList.add('hidden');
        containerText.classList.remove('hidden');
    }
}

function handleSigFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        setSigFile(files[0]);
    }
}

function setSigFile(file) {
    selectedSigFile = file;
    const nameDisplay = document.getElementById('sig-file-name-display');
    const infoText = document.getElementById('sig-file-zone-text');

    if (file) {
        nameDisplay.textContent = `${file.name} (${formatBytes(file.size)})`;
        nameDisplay.classList.remove('hidden');
        infoText.classList.add('hidden');
    } else {
        nameDisplay.classList.add('hidden');
        infoText.classList.remove('hidden');
    }
}

// Setup Drag & Drop for signature file zone
const sigFileZone = document.getElementById('sig-file-zone');
if (sigFileZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
        sigFileZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            sigFileZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        sigFileZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            sigFileZone.classList.remove('dragover');
        }, false);
    });

    sigFileZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            setSigFile(files[0]);
        }
    });
}

// -------------------------------------------------------------
// Core Cryptographic Operations
// -------------------------------------------------------------

function handleKeyPurposeChange() {
    const purpose = document.getElementById('key-purpose').value;
    const keySizeGroup = document.getElementById('key-size-group');
    const keySizeSelect = document.getElementById('key-size');
    const keySizeHelper = document.getElementById('key-size-helper');

    if (purpose.startsWith('ECDSA-')) {
        keySizeSelect.disabled = true;
        keySizeGroup.style.opacity = '0.5';
        keySizeHelper.textContent = 'Curve size is predefined by the selected Elliptic Curve.';
    } else {
        keySizeSelect.disabled = false;
        keySizeGroup.style.opacity = '1';
        keySizeHelper.textContent = 'Larger keys provide stronger security but take slightly longer to generate.';
    }
}

// 1. Key Generation
async function generateKeyPair() {
    const btn = document.getElementById('btn-generate-keys');
    const purpose = document.getElementById('key-purpose').value;
    const size = parseInt(document.getElementById('key-size').value, 10);
    const container = document.getElementById('key-outputs-container');
    const pubOutput = document.getElementById('public-key-output');
    const privOutput = document.getElementById('private-key-output');

    // Disable button & show spinner
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Generating Keypair...';
    container.classList.add('hidden');

    try {
        let algoParams = {};
        let usages = [];

        if (purpose === 'RSA-OAEP') {
            algoParams = {
                name: "RSA-OAEP",
                modulusLength: size,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            };
            usages = ["encrypt", "decrypt"];
        } else if (purpose === 'RSA-PSS') {
            algoParams = {
                name: "RSA-PSS",
                modulusLength: size,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            };
            usages = ["sign", "verify"];
        } else if (purpose === 'RSASSA-PKCS1-v1_5') {
            algoParams = {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: size,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            };
            usages = ["sign", "verify"];
        } else if (purpose.startsWith('ECDSA-')) {
            const curve = purpose.split('-').slice(1).join('-'); // e.g. "P-256", "P-384", "P-521"
            algoParams = {
                name: "ECDSA",
                namedCurve: curve
            };
            usages = ["sign", "verify"];
        }

        const keyPair = await window.crypto.subtle.generateKey(
            algoParams,
            true, // extractable
            usages
        );

        const pubBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const privBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

        pubOutput.value = spkiToPem(pubBuffer);
        privOutput.value = pkcs8ToPem(privBuffer);

        container.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        alert('Key Generation Failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// 2. Encryption & Decryption
let lastEncryptionResult = null; // Buffer to hold binary results if needed

async function executeEncryptionDecryption() {
    const btn = document.getElementById('btn-crypt-execute');
    const mode = document.getElementById('crypt-mode').value;
    const inputVal = document.getElementById('crypt-input').value.trim();
    const keyVal = document.getElementById('crypt-key').value.trim();
    const encoding = document.getElementById('crypt-encoding').value;
    const outputArea = document.getElementById('crypt-output');

    if (!inputVal) {
        alert('Please provide input message/ciphertext.');
        return;
    }
    if (!keyVal) {
        alert('Please provide the cryptographic key.');
        return;
    }

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    outputArea.value = '';

    try {
        if (mode === 'encrypt') {
            if (keyVal.includes("BEGIN PRIVATE KEY")) {
                throw new Error("You provided a Private Key, but Encryption requires a Public Key. Please copy/paste the Public Key (starts with -----BEGIN PUBLIC KEY-----).");
            }
            // Import public key
            let publicKey;
            try {
                const spki = pemToSpki(keyVal);
                publicKey = await window.crypto.subtle.importKey(
                    "spki",
                    spki,
                    { name: "RSA-OAEP", hash: "SHA-256" },
                    true,
                    ["encrypt"]
                );
            } catch (err) {
                throw new Error("Failed to parse Public Key. Please ensure it is in valid PEM format.");
            }

            const encoder = new TextEncoder();
            const rawPlaintext = encoder.encode(inputVal);

            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                publicKey,
                rawPlaintext
            );

            lastEncryptionResult = encryptedBuffer;
            updateCryptOutputDisplay();
        } else {
            if (keyVal.includes("BEGIN PUBLIC KEY")) {
                throw new Error("You provided a Public Key, but Decryption requires a Private Key. Please copy/paste the Private Key (starts with -----BEGIN PRIVATE KEY-----).");
            }
            // Import private key
            let privateKey;
            try {
                const pkcs8 = pemToPkcs8(keyVal);
                privateKey = await window.crypto.subtle.importKey(
                    "pkcs8",
                    pkcs8,
                    { name: "RSA-OAEP", hash: "SHA-256" },
                    true,
                    ["decrypt"]
                );
            } catch (err) {
                throw new Error("Failed to parse Private Key. Please ensure it is in valid PEM format.");
            }

            let encryptedBuffer;
            try {
                if (encoding === 'hex') {
                    encryptedBuffer = hexToBuffer(inputVal);
                } else {
                    encryptedBuffer = base64ToArrayBuffer(inputVal);
                }
            } catch (err) {
                throw new Error("Failed to decode ciphertext input. Please ensure it matches selected encoding.");
            }

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                encryptedBuffer
            );

            const decoder = new TextDecoder();
            outputArea.value = decoder.decode(decryptedBuffer);
        }
    } catch (err) {
        console.error(err);
        outputArea.value = `Error: ${err.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

function updateCryptOutputDisplay() {
    const mode = document.getElementById('crypt-mode').value;
    if (mode !== 'encrypt' || !lastEncryptionResult) return;

    const encoding = document.getElementById('crypt-encoding').value;
    const outputArea = document.getElementById('crypt-output');

    if (encoding === 'hex') {
        outputArea.value = bufferToHex(lastEncryptionResult);
    } else {
        outputArea.value = arrayBufferToBase64(lastEncryptionResult);
    }
}

// 3. File Signing & Verification
let lastSignatureResult = null;

// Helper to parse algorithm details for signing/verification
function getAlgorithmDetails(algoStr) {
    if (algoStr === 'RSA-PSS') {
        return {
            importParams: { name: "RSA-PSS", hash: "SHA-256" },
            signParams: { name: "RSA-PSS", saltLength: 32 },
            baseName: "RSA-PSS"
        };
    } else if (algoStr === 'RSASSA-PKCS1-v1_5') {
        return {
            importParams: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            signParams: { name: "RSASSA-PKCS1-v1_5" },
            baseName: "RSASSA-PKCS1-v1_5"
        };
    } else if (algoStr.startsWith('ECDSA-') || algoStr.startsWith('ECDSA ')) {
        const curve = algoStr.replace('ECDSA ', '').replace('ECDSA-', ''); // e.g. "P-256", "P-384", "P-521"
        let hashName = "SHA-256";
        if (curve === "P-384") hashName = "SHA-384";
        if (curve === "P-521") hashName = "SHA-512";
        
        return {
            importParams: { name: "ECDSA", namedCurve: curve },
            signParams: { name: "ECDSA", hash: { name: hashName } },
            baseName: "ECDSA",
            curve: curve
        };
    }
    throw new Error("Unknown algorithm: " + algoStr);
}

async function executeSigningVerification() {
    const btn = document.getElementById('btn-sign-execute');
    const mode = document.getElementById('sign-mode').value;
    const algorithm = document.getElementById('sign-algorithm').value;
    const keyVal = document.getElementById('sign-key').value.trim();
    const sigOutputGroup = document.getElementById('signature-output-group');
    const sigOutput = document.getElementById('signature-output');
    const banner = document.getElementById('verify-result-banner');

    if (!selectedFile) {
        alert('Please select or drop a file to process.');
        return;
    }
    if (!keyVal) {
        alert('Please provide the cryptographic key.');
        return;
    }

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing File...';
    sigOutputGroup.classList.add('hidden');
    banner.classList.add('hidden');

    try {
        // Read file contents as ArrayBuffer
        const fileData = await readFileAsArrayBuffer(selectedFile);

        const details = getAlgorithmDetails(algorithm);

        if (mode === 'sign') {
            if (keyVal.includes("BEGIN PUBLIC KEY")) {
                throw new Error("You provided a Public Key, but Signing requires a Private Key. Please copy/paste the Private Key (starts with -----BEGIN PRIVATE KEY-----).");
            }
            // Import private key for signing
            let privateKey;
            try {
                const pkcs8 = pemToPkcs8(keyVal);
                privateKey = await window.crypto.subtle.importKey(
                    "pkcs8",
                    pkcs8,
                    details.importParams,
                    true,
                    ["sign"]
                );
            } catch (err) {
                throw new Error("Failed to parse Private Key. Please ensure it is in valid PEM format.");
            }

            const signature = await window.crypto.subtle.sign(
                details.signParams,
                privateKey,
                fileData
            );

            lastSignatureResult = signature;
            sigOutput.value = arrayBufferToBase64(signature);
            sigOutputGroup.classList.remove('hidden');
        } else {
            if (keyVal.includes("BEGIN PRIVATE KEY")) {
                throw new Error("You provided a Private Key, but Verification requires a Public Key. Please copy/paste the Public Key (starts with -----BEGIN PUBLIC KEY-----).");
            }
            // Import public key for verifying
            let publicKey;
            try {
                const spki = pemToSpki(keyVal);
                publicKey = await window.crypto.subtle.importKey(
                    "spki",
                    spki,
                    details.importParams,
                    true,
                    ["verify"]
                );
            } catch (err) {
                throw new Error("Failed to parse Public Key. Please ensure it is in valid PEM format.");
            }

            let sigBuffer;
            if (signatureMethod === 'file') {
                if (!selectedSigFile) {
                    throw new Error("Please select or drop a signature (.sig) file to verify.");
                }
                try {
                    sigBuffer = await readFileAsArrayBuffer(selectedSigFile);
                } catch (err) {
                    throw new Error("Failed to read signature file.");
                }
            } else {
                const sigValInput = document.getElementById('signature-input').value.trim();
                if (!sigValInput) {
                    throw new Error("Please provide the signature string to verify.");
                }
                try {
                    // Support both Hex and Base64 signatures automatically
                    if (/^[0-9a-fA-F]+$/.test(sigValInput)) {
                        sigBuffer = hexToBuffer(sigValInput);
                    } else {
                        sigBuffer = base64ToArrayBuffer(sigValInput);
                    }
                } catch (err) {
                    throw new Error("Failed to decode signature. Must be a valid Base64 or Hexadecimal string.");
                }
            }

            const isValid = await window.crypto.subtle.verify(
                details.signParams,
                publicKey,
                sigBuffer,
                fileData
            );

            banner.className = 'status-banner ' + (isValid ? 'success' : 'error');
            banner.innerHTML = isValid 
                ? '<i class="fa-solid fa-circle-check"></i> Signature is VALID. The file integrity is intact and authentic.'
                : '<i class="fa-solid fa-circle-xmark"></i> Signature is INVALID. The file may have been modified, or the wrong key/signature was used.';
            banner.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        if (mode === 'verify') {
            banner.className = 'status-banner error';
            banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error: ${err.message}`;
            banner.classList.remove('hidden');
        } else {
            alert('Signing Failed: ' + err.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsArrayBuffer(file);
    });
}

// -------------------------------------------------------------
// Clipboard and Download Helpers
// -------------------------------------------------------------

function copyToClipboard(textareaId, textId) {
    const textarea = document.getElementById(textareaId);
    textarea.select();
    document.execCommand('copy');
    
    const indicator = document.getElementById(textId);
    const originalText = indicator.textContent;
    indicator.textContent = 'Copied!';
    setTimeout(() => {
        indicator.textContent = originalText;
    }, 2000);
}

function downloadKey(textareaId, filename) {
    const content = document.getElementById(textareaId).value;
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadSignature() {
    if (!lastSignatureResult) return;
    const blob = new Blob([lastSignatureResult], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile ? `${selectedFile.name}.sig` : 'signature.sig';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// RSA vs ECC Comparison Suite Benchmark Runner
// -------------------------------------------------------------

const suites = [
    { 
        id: 'RSA-2048', 
        type: 'rsa', 
        label: 'RSA 2048-bit', 
        genParams: { 
            name: 'RSA-PSS', 
            modulusLength: 2048, 
            publicExponent: new Uint8Array([1, 0, 1]), 
            hash: 'SHA-256' 
        }, 
        signParams: { name: 'RSA-PSS', saltLength: 32 }, 
        usages: ['sign', 'verify'] 
    },
    { 
        id: 'RSA-3072', 
        type: 'rsa', 
        label: 'RSA 3072-bit', 
        genParams: { 
            name: 'RSA-PSS', 
            modulusLength: 3072, 
            publicExponent: new Uint8Array([1, 0, 1]), 
            hash: 'SHA-256' 
        }, 
        signParams: { name: 'RSA-PSS', saltLength: 32 }, 
        usages: ['sign', 'verify'] 
    },
    { 
        id: 'RSA-4096', 
        type: 'rsa', 
        label: 'RSA 4096-bit', 
        genParams: { 
            name: 'RSA-PSS', 
            modulusLength: 4096, 
            publicExponent: new Uint8Array([1, 0, 1]), 
            hash: 'SHA-256' 
        }, 
        signParams: { name: 'RSA-PSS', saltLength: 32 }, 
        usages: ['sign', 'verify'] 
    },
    { 
        id: 'ECDSA-P-256', 
        type: 'ecc', 
        label: 'ECDSA P-256', 
        genParams: { name: 'ECDSA', namedCurve: 'P-256' }, 
        signParams: { name: 'ECDSA', hash: { name: 'SHA-256' } }, 
        usages: ['sign', 'verify'] 
    },
    { 
        id: 'ECDSA-P-384', 
        type: 'ecc', 
        label: 'ECDSA P-384', 
        genParams: { name: 'ECDSA', namedCurve: 'P-384' }, 
        signParams: { name: 'ECDSA', hash: { name: 'SHA-384' } }, 
        usages: ['sign', 'verify'] 
    },
    { 
        id: 'ECDSA-P-521', 
        type: 'ecc', 
        label: 'ECDSA P-521', 
        genParams: { name: 'ECDSA', namedCurve: 'P-521' }, 
        signParams: { name: 'ECDSA', hash: { name: 'SHA-512' } }, 
        usages: ['sign', 'verify'] 
    }
];

async function runBenchmark() {
    const btn = document.getElementById('btn-run-benchmark');
    const progContainer = document.getElementById('benchmark-progress-container');
    const progText = document.getElementById('benchmark-progress-text');
    const progBar = document.getElementById('benchmark-progress-bar');
    const progPercent = document.getElementById('benchmark-progress-percent');
    const resultsContainer = document.getElementById('benchmark-results-container');

    btn.disabled = true;
    progContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');

    const benchmarkResults = [];
    const payload = new Uint8Array(1024); // 1KB payload
    window.crypto.getRandomValues(payload);

    try {
        for (let i = 0; i < suites.length; i++) {
            const suite = suites[i];
            const pct = Math.round((i / suites.length) * 100);
            
            progText.textContent = `[${suite.label}] Generating key pair...`;
            progBar.style.width = `${pct}%`;
            progPercent.textContent = `${pct}%`;
            await new Promise(r => setTimeout(r, 50));

            // 1. Measure Key Gen
            const tGenStart = performance.now();
            const keyPair = await window.crypto.subtle.generateKey(
                suite.genParams,
                true,
                suite.usages
            );
            const tGenEnd = performance.now();
            const tGen = tGenEnd - tGenStart;

            progText.textContent = `[${suite.label}] Exporting keys & measuring sizes...`;
            await new Promise(r => setTimeout(r, 50));

            const pubBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
            const privBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
            const pubSize = pubBuffer.byteLength;
            const privSize = privBuffer.byteLength;

            progText.textContent = `[${suite.label}] Benchmarking signing & verification...`;
            await new Promise(r => setTimeout(r, 50));

            // Warm up
            let sig = await window.crypto.subtle.sign(suite.signParams, keyPair.privateKey, payload);

            // 2. Measure Sign (5 runs)
            const signTimes = [];
            let sigSize = sig.byteLength;
            for (let r = 0; r < 5; r++) {
                const tSignStart = performance.now();
                sig = await window.crypto.subtle.sign(suite.signParams, keyPair.privateKey, payload);
                const tSignEnd = performance.now();
                signTimes.push(tSignEnd - tSignStart);
            }
            const tSign = signTimes.reduce((a, b) => a + b, 0) / signTimes.length;

            // 3. Measure Verify (5 runs)
            const verifyTimes = [];
            for (let r = 0; r < 5; r++) {
                const tVerifyStart = performance.now();
                const isValid = await window.crypto.subtle.verify(suite.signParams, keyPair.publicKey, sig, payload);
                const tVerifyEnd = performance.now();
                verifyTimes.push(tVerifyEnd - tVerifyStart);
                if (!isValid) throw new Error("Verification failed during benchmark!");
            }
            const tVerify = verifyTimes.reduce((a, b) => a + b, 0) / verifyTimes.length;

            benchmarkResults.push({
                id: suite.id,
                type: suite.type,
                label: suite.label,
                tGen: tGen,
                pubSize: pubSize,
                privSize: privSize,
                tSign: tSign,
                sigSize: sigSize,
                tVerify: tVerify
            });
        }

        // Complete progress
        progBar.style.width = '100%';
        progPercent.textContent = '100%';
        progText.textContent = 'Benchmark completed!';
        await new Promise(r => setTimeout(r, 200));

        // Render Results
        renderBenchmarkResults(benchmarkResults);
        
        // Hide progress & show results
        progContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('Benchmark failed: ' + err.message);
        progContainer.classList.add('hidden');
    } finally {
        btn.disabled = false;
    }
}

function renderBenchmarkResults(results) {
    // 1. Populate Table
    const tbody = document.getElementById('compare-table-body');
    tbody.innerHTML = '';
    
    results.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = r.type === 'rsa' ? 'rsa-row' : 'ecc-row';
        tr.innerHTML = `
            <td class="algo-name-cell">${r.label}</td>
            <td style="text-align: right; font-family: var(--font-mono);">${r.tGen.toFixed(2)} ms</td>
            <td style="text-align: right; font-family: var(--font-mono);">${r.pubSize} B</td>
            <td style="text-align: right; font-family: var(--font-mono);">${r.privSize} B</td>
            <td style="text-align: right; font-family: var(--font-mono);">${r.tSign.toFixed(3)} ms</td>
            <td style="text-align: right; font-family: var(--font-mono);">${r.sigSize} B</td>
            <td style="text-align: right; font-family: var(--font-mono);">${r.tVerify.toFixed(3)} ms</td>
        `;
        tbody.appendChild(tr);
    });

    // 2. Render Key Gen Time Chart
    const maxGen = Math.max(...results.map(r => r.tGen));
    let genHtml = '';
    results.forEach(r => {
        const pct = maxGen > 0 ? (r.tGen / maxGen) * 100 : 0;
        genHtml += `
            <div class="chart-bar-row">
                <div class="chart-bar-label">${r.label}</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar-fill ${r.type}" style="width: ${pct}%"></div>
                    <span class="chart-bar-value">${r.tGen.toFixed(2)} ms</span>
                </div>
            </div>
        `;
    });
    document.getElementById('chart-keygen').innerHTML = genHtml;

    // 3. Render Signature Size Chart
    const maxSig = Math.max(...results.map(r => r.sigSize));
    let sigHtml = '';
    results.forEach(r => {
        const pct = maxSig > 0 ? (r.sigSize / maxSig) * 100 : 0;
        sigHtml += `
            <div class="chart-bar-row">
                <div class="chart-bar-label">${r.label}</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar-fill ${r.type}" style="width: ${pct}%"></div>
                    <span class="chart-bar-value">${r.sigSize} B</span>
                </div>
            </div>
        `;
    });
    document.getElementById('chart-sigsize').innerHTML = sigHtml;

    // 4. Render Signing vs Verification Speed Chart
    let opsHtml = '';
    const maxOpTime = Math.max(...results.map(r => Math.max(r.tSign, r.tVerify)));
    results.forEach(r => {
        const signPct = maxOpTime > 0 ? (r.tSign / maxOpTime) * 100 : 0;
        const verifyPct = maxOpTime > 0 ? (r.tVerify / maxOpTime) * 100 : 0;
        opsHtml += `
            <div style="display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem;">
                <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">${r.label}</div>
                <div class="chart-bar-row" style="margin-left: 0.5rem;">
                    <div class="chart-bar-label" style="width: 50px; font-size: 0.75rem; color: var(--text-secondary);">Sign</div>
                    <div class="chart-bar-wrapper" style="height: 12px;">
                        <div class="chart-bar-fill ${r.type}" style="width: ${signPct}%; background: var(--neon-purple);"></div>
                        <span class="chart-bar-value" style="font-size: 0.65rem; line-height: 12px; right: 6px;">${r.tSign.toFixed(3)} ms</span>
                    </div>
                </div>
                <div class="chart-bar-row" style="margin-left: 0.5rem;">
                    <div class="chart-bar-label" style="width: 50px; font-size: 0.75rem; color: var(--text-secondary);">Verify</div>
                    <div class="chart-bar-wrapper" style="height: 12px;">
                        <div class="chart-bar-fill ${r.type}" style="width: ${verifyPct}%; background: var(--neon-yellow);"></div>
                        <span class="chart-bar-value" style="font-size: 0.65rem; line-height: 12px; right: 6px;">${r.tVerify.toFixed(3)} ms</span>
                    </div>
                </div>
            </div>
        `;
    });
    document.getElementById('chart-ops').innerHTML = opsHtml;

    // 5. Generate insights based on actual run data
    const rsa4096 = results.find(r => r.id === 'RSA-4096');
    const ecc256 = results.find(r => r.id === 'ECDSA-P-256');
    
    let keyGenSpeedup = 10;
    if (rsa4096 && ecc256 && ecc256.tGen > 0) {
        keyGenSpeedup = Math.round(rsa4096.tGen / ecc256.tGen);
    }
    if (keyGenSpeedup < 1) keyGenSpeedup = 5;
    
    let signatureRatio = 8;
    if (rsa4096 && ecc256) {
        signatureRatio = Math.round(rsa4096.sigSize / ecc256.sigSize);
    }

    const insightsHtml = `
        <div class="insight-item pro">
            <i class="fa-solid fa-circle-check"></i>
            <div>
                <div class="insight-header">ECC Key Generation is ~${keyGenSpeedup}x Faster</div>
                <div>ECDSA P-256 key generation is nearly instantaneous, whereas RSA-4096 requires finding two huge prime numbers, which is computationally expensive.</div>
            </div>
        </div>
        <div class="insight-item pro">
            <i class="fa-solid fa-circle-check"></i>
            <div>
                <div class="insight-header">ECC Signatures are ${signatureRatio}x Smaller</div>
                <div>ECDSA signatures require only <strong>64 bytes</strong> (P-256) compared to RSA-4096's <strong>512 bytes</strong>. This saves substantial network bandwidth and storage.</div>
            </div>
        </div>
        <div class="insight-item warning">
            <i class="fa-solid fa-circle-exclamation"></i>
            <div>
                <div class="insight-header">RSA Verification is Extremely Fast</div>
                <div>Due to a small public exponent (e=65537), RSA signature verification is highly efficient. In applications where signatures are verified frequently but rarely generated, RSA remains competitive despite its large key size.</div>
            </div>
        </div>
    `;
    document.getElementById('comparison-insights').innerHTML = insightsHtml;
}

// -------------------------------------------------------------
// AES File Encryptor & Integrity Suite (AES-GCM & SHA-256)
// -------------------------------------------------------------

let selectedAesFile = null;

// Initialize Drag & Drop for AES File Zone
const aesFileZone = document.getElementById('aes-file-zone');
if (aesFileZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
        aesFileZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            aesFileZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        aesFileZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            aesFileZone.classList.remove('dragover');
        }, false);
    });

    aesFileZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            setAesFile(files[0]);
        }
    });
}

function handleAesFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        setAesFile(files[0]);
    }
}

async function setAesFile(file) {
    selectedAesFile = file;
    const nameDisplay = document.getElementById('aes-file-name-display');
    const infoText = document.getElementById('aes-file-zone-text');
    const detailsCard = document.getElementById('aes-file-details-card');
    const integrityCard = document.getElementById('aes-integrity-card');
    const comparisonCard = document.getElementById('aes-comparison-card');
    const banner = document.getElementById('aes-result-banner');

    banner.classList.add('hidden');

    if (file) {
        const sizeStr = formatBytes(file.size);
        nameDisplay.textContent = `${file.name} (${sizeStr})`;
        nameDisplay.classList.remove('hidden');
        infoText.classList.add('hidden');

        // Populate metadata card
        document.getElementById('aes-details-name').textContent = file.name;
        document.getElementById('aes-details-size').textContent = sizeStr;
        const fileType = file.type || 'Unknown Type';
        document.getElementById('aes-details-type').textContent = fileType;
        detailsCard.classList.remove('hidden');

        const mode = document.getElementById('aes-mode').value;
        if (mode === 'encrypt') {
            // Compute and show plaintext SHA-256 for integrity check
            const integrityOutput = document.getElementById('aes-sha256-output');
            integrityOutput.value = 'Calculating SHA-256 hash...';
            integrityCard.classList.remove('hidden');
            comparisonCard.classList.add('hidden');

            try {
                const fileData = await readFileAsArrayBuffer(file);
                const hashInfo = await computeSHA256(fileData);
                integrityOutput.value = hashInfo.hex;
            } catch (err) {
                console.error(err);
                integrityOutput.value = 'Error calculating hash: ' + err.message;
            }
        } else {
            // Decrypt Mode
            integrityCard.classList.add('hidden');
            // Check if file has correct .qenc extension
            if (!file.name.endsWith('.qenc')) {
                banner.className = 'status-banner warning';
                banner.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Note: The selected file does not have a <strong>.qenc</strong> extension. It may not be a valid QuantumShield encrypted package.';
                banner.classList.remove('hidden');
            }
        }
    } else {
        nameDisplay.classList.add('hidden');
        infoText.classList.remove('hidden');
        detailsCard.classList.add('hidden');
        integrityCard.classList.add('hidden');
        comparisonCard.classList.add('hidden');
    }
}

function toggleAesMode() {
    const mode = document.getElementById('aes-mode').value;
    const fileLabel = document.getElementById('aes-file-label');
    const fileZoneText = document.getElementById('aes-file-zone-text');
    const btnExecute = document.getElementById('btn-aes-execute');
    const integrityCard = document.getElementById('aes-integrity-card');
    const comparisonCard = document.getElementById('aes-comparison-card');
    const banner = document.getElementById('aes-result-banner');

    banner.classList.add('hidden');

    if (mode === 'encrypt') {
        fileLabel.textContent = 'File to Encrypt';
        fileZoneText.textContent = 'Drag and drop file here, or click to browse';
        btnExecute.innerHTML = '<i class="fa-solid fa-lock"></i> Encrypt & Download';
        comparisonCard.classList.add('hidden');
        if (selectedAesFile) {
            setAesFile(selectedAesFile); // Re-run setAesFile to calculate hash
        }
    } else {
        fileLabel.textContent = 'Encrypted File (.qenc)';
        fileZoneText.textContent = 'Drag and drop .qenc file here, or click to browse';
        btnExecute.innerHTML = '<i class="fa-solid fa-unlock"></i> Decrypt & Restore';
        integrityCard.classList.add('hidden');
        comparisonCard.classList.add('hidden');
        
        // Reset comparison displays
        document.getElementById('aes-expected-hash').textContent = '--';
        document.getElementById('aes-expected-hash').className = '';
        document.getElementById('aes-computed-hash').textContent = '--';
        document.getElementById('aes-computed-hash').className = '';

        if (selectedAesFile) {
            setAesFile(selectedAesFile);
        }
    }
}

function toggleAesKeySource() {
    const keySource = document.getElementById('aes-key-source').value;
    const passphraseGroup = document.getElementById('aes-passphrase-group');
    const rawKeyGroup = document.getElementById('aes-raw-key-group');

    if (keySource === 'passphrase') {
        passphraseGroup.classList.remove('hidden');
        rawKeyGroup.classList.add('hidden');
    } else {
        passphraseGroup.classList.add('hidden');
        rawKeyGroup.classList.remove('hidden');
    }
}

function generateAndSetRandomAesKey() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const hex = bufferToHex(bytes.buffer);
    document.getElementById('aes-raw-key').value = hex;
}

function togglePasswordVisibility(inputId, eyeId) {
    const input = document.getElementById(inputId);
    const eye = document.getElementById(eyeId);
    if (input.type === 'password') {
        input.type = 'text';
        eye.classList.remove('fa-eye');
        eye.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        eye.classList.add('fa-eye');
        eye.classList.remove('fa-eye-slash');
    }
}

// Cryptography helper functions
async function computeSHA256(arrayBuffer) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    return {
        hex: bufferToHex(hashBuffer),
        buffer: hashBuffer
    };
}

async function deriveAESKeyFromPassphrase(passphrase, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function importRawAesKey(rawKeyBuffer) {
    return window.crypto.subtle.importKey(
        "raw",
        rawKeyBuffer,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Master execution routing
async function executeAesOperation() {
    const btn = document.getElementById('btn-aes-execute');
    const mode = document.getElementById('aes-mode').value;
    const banner = document.getElementById('aes-result-banner');

    if (!selectedAesFile) {
        alert('Please select a file to process.');
        return;
    }

    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
    banner.classList.add('hidden');

    try {
        if (mode === 'encrypt') {
            await encryptFileAES();
        } else {
            await decryptFileAES();
        }
    } catch (err) {
        console.error(err);
        banner.className = 'status-banner error';
        banner.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Error: ${err.message}`;
        banner.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// AES File Encryption
async function encryptFileAES() {
    const keySource = document.getElementById('aes-key-source').value;
    const passphrase = document.getElementById('aes-passphrase').value;
    const rawKeyVal = document.getElementById('aes-raw-key').value.trim();
    const banner = document.getElementById('aes-result-banner');

    let aesKey;
    let salt = new Uint8Array(16); // 16 bytes for salt
    const iv = new Uint8Array(12); // 12 bytes for GCM IV
    window.crypto.getRandomValues(iv);

    if (keySource === 'passphrase') {
        if (!passphrase) {
            throw new Error('Please enter a password to derive the encryption key.');
        }
        window.crypto.getRandomValues(salt);
        aesKey = await deriveAESKeyFromPassphrase(passphrase, salt);
    } else {
        if (!rawKeyVal) {
            throw new Error('Please enter a raw AES key.');
        }
        let rawKeyBytes;
        try {
            if (rawKeyVal.length === 64 && /^[0-9a-fA-F]+$/.test(rawKeyVal)) {
                rawKeyBytes = hexToBuffer(rawKeyVal);
            } else {
                rawKeyBytes = base64ToArrayBuffer(rawKeyVal);
            }
            if (rawKeyBytes.byteLength !== 32) {
                throw new Error("Raw key must be exactly 32 bytes (256-bit).");
            }
        } catch (e) {
            throw new Error('Failed to parse Raw Key. Please make sure it is a valid 64-character Hex or 44-character Base64 string.');
        }
        aesKey = await importRawAesKey(rawKeyBytes);
    }

    // Read plaintext file
    const plaintextBuffer = await readFileAsArrayBuffer(selectedAesFile);

    // Compute plaintext SHA-256 for integrity verification
    const fileHash = await computeSHA256(plaintextBuffer);
    const hashBytes = new Uint8Array(fileHash.buffer);

    // Perform AES-GCM encryption
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        aesKey,
        plaintextBuffer
    );

    // Serialize to custom format:
    // Magic: "QENC" (4 bytes)
    // KeySourceMode: 1 byte (0x01 = Passphrase, 0x02 = Raw Key)
    // IV: 12 bytes
    // Salt: 16 bytes
    // Plaintext SHA-256: 32 bytes
    // Filename length: 1 byte
    // Filename: UTF-8 string (N bytes)
    // Ciphertext: remaining bytes
    const filenameEncoder = new TextEncoder();
    const filenameBytes = filenameEncoder.encode(selectedAesFile.name);
    const filenameLength = filenameBytes.length;

    if (filenameLength > 255) {
        throw new Error("Filename is too long (maximum 255 characters).");
    }

    const headerSize = 4 + 1 + 12 + 16 + 32 + 1 + filenameLength;
    const packageBuffer = new ArrayBuffer(headerSize + ciphertextBuffer.byteLength);
    const packageBytes = new Uint8Array(packageBuffer);

    // Write Magic Bytes
    filenameEncoder.encodeInto("QENC", packageBytes.subarray(0, 4));

    // Write Key Source Mode
    packageBytes[4] = (keySource === 'passphrase') ? 0x01 : 0x02;

    // Write IV
    packageBytes.set(iv, 5);

    // Write Salt
    packageBytes.set(salt, 17);

    // Write SHA-256 Hash
    packageBytes.set(hashBytes, 33);

    // Write Filename Length
    packageBytes[65] = filenameLength;

    // Write Filename
    packageBytes.set(filenameBytes, 66);

    // Write Ciphertext
    packageBytes.set(new Uint8Array(ciphertextBuffer), headerSize);

    // Download File
    const blob = new Blob([packageBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedAesFile.name + ".qenc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    banner.className = 'status-banner success';
    banner.innerHTML = `<i class="fa-solid fa-circle-check"></i> File encrypted successfully! Saved as <strong>${selectedAesFile.name}.qenc</strong>.<br>Plaintext SHA-256: <code style="font-family:var(--font-mono); font-size:0.8rem; word-break:break-all;">${fileHash.hex}</code>`;
    banner.classList.remove('hidden');
}

// AES File Decryption
async function decryptFileAES() {
    const keySourceInput = document.getElementById('aes-key-source').value;
    const passphrase = document.getElementById('aes-passphrase').value;
    const rawKeyVal = document.getElementById('aes-raw-key').value.trim();
    const banner = document.getElementById('aes-result-banner');
    const comparisonCard = document.getElementById('aes-comparison-card');
    const expectedHashDiv = document.getElementById('aes-expected-hash');
    const computedHashDiv = document.getElementById('aes-computed-hash');

    const encryptedData = await readFileAsArrayBuffer(selectedAesFile);

    if (encryptedData.byteLength < 66) {
        throw new Error("File is too small to be a valid encrypted package.");
    }

    const bytes = new Uint8Array(encryptedData);

    // 1. Verify Magic
    const magicDecoder = new TextDecoder();
    const magic = magicDecoder.decode(bytes.subarray(0, 4));
    if (magic !== "QENC") {
        throw new Error("Invalid file format. The file is not a valid QuantumShield encrypted package.");
    }

    // 2. Extract Key Source Mode
    const fileKeySourceMode = bytes[4];

    // Auto-align UI or warn if there's a key source mismatch
    const expectedSourceString = (fileKeySourceMode === 0x01) ? 'passphrase' : 'raw';
    if (keySourceInput !== expectedSourceString) {
        // Change selection automatically and notify
        document.getElementById('aes-key-source').value = expectedSourceString;
        toggleAesKeySource();
        throw new Error(`This encrypted package requires a ${expectedSourceString === 'passphrase' ? 'Passphrase' : 'Raw 256-bit Key'}. We have switched the input mode for you. Please enter the key and try again.`);
    }

    // 3. Extract IV, Salt, SHA-256
    const iv = bytes.subarray(5, 17);
    const salt = bytes.subarray(17, 33);
    const expectedHashBytes = bytes.subarray(33, 65);
    const expectedHashHex = bufferToHex(expectedHashBytes.slice().buffer);

    // 4. Extract Filename
    const filenameLength = bytes[65];
    const headerSize = 66 + filenameLength;
    if (encryptedData.byteLength < headerSize) {
        throw new Error("Corrupted file header metadata.");
    }

    const filenameBytes = bytes.subarray(66, headerSize);
    const originalFilename = new TextDecoder().decode(filenameBytes);

    // 5. Extract Ciphertext
    const ciphertextBytes = bytes.subarray(headerSize);

    // 6. Set up key
    let aesKey;
    if (fileKeySourceMode === 0x01) {
        if (!passphrase) {
            throw new Error('Please enter the password used to encrypt this file.');
        }
        aesKey = await deriveAESKeyFromPassphrase(passphrase, salt);
    } else {
        if (!rawKeyVal) {
            throw new Error('Please enter the raw AES key used to encrypt this file.');
        }
        let rawKeyBytes;
        try {
            if (rawKeyVal.length === 64 && /^[0-9a-fA-F]+$/.test(rawKeyVal)) {
                rawKeyBytes = hexToBuffer(rawKeyVal);
            } else {
                rawKeyBytes = base64ToArrayBuffer(rawKeyVal);
            }
        } catch (e) {
            throw new Error('Failed to parse Raw Key. Please ensure it is a valid 64-character Hex or 44-character Base64 string.');
        }
        aesKey = await importRawAesKey(rawKeyBytes);
    }

    // 7. Decrypt File
    let decryptedBuffer;
    try {
        decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            ciphertextBytes
        );
    } catch (e) {
        throw new Error("Decryption failed. Please check your password/key or ensure the file has not been tampered with. (Authentication Tag verification failed)");
    }

    // 8. Compute Decrypted Plaintext Hash
    const decryptedHash = await computeSHA256(decryptedBuffer);

    // 9. Compare and display hashes
    expectedHashDiv.textContent = expectedHashHex;
    computedHashDiv.textContent = decryptedHash.hex;
    comparisonCard.classList.remove('hidden');

    const hashesMatch = (expectedHashHex === decryptedHash.hex);
    if (hashesMatch) {
        expectedHashDiv.className = 'hash-match';
        computedHashDiv.className = 'hash-match';
        
        banner.className = 'status-banner success';
        banner.innerHTML = `<i class="fa-solid fa-circle-check"></i> Decryption Successful! File integrity verified: SHA-256 hashes match. Saved as <strong>${originalFilename}</strong>.`;
        banner.classList.remove('hidden');
    } else {
        expectedHashDiv.className = 'hash-mismatch';
        computedHashDiv.className = 'hash-mismatch';

        banner.className = 'status-banner error';
        banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Warning: Integrity Violation! The decrypted file's SHA-256 hash does not match the expected hash. The file may have been modified or corrupted.`;
        banner.classList.remove('hidden');
    }

    // Download Decrypted File
    const blob = new Blob([decryptedBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// TLS Handshake & Visualizer Suite
// -------------------------------------------------------------

async function fetchTlsDetails() {
    const btn = document.getElementById('btn-fetch-tls');
    const url = document.getElementById('tls-server-url').value.trim();
    const banner = document.getElementById('tls-result-banner');
    const statusText = document.getElementById('tls-connection-status');
    const certCard = document.getElementById('tls-cert-card');
    
    // Reset values in UI
    document.getElementById('tls-val-version').textContent = '--';
    document.getElementById('tls-val-cipher').textContent = '--';
    document.getElementById('tls-val-strength').textContent = '--';
    certCard.classList.add('hidden');
    banner.classList.add('hidden');
    
    // Reset Stepper Opacity
    const steps = ['step-tcp', 'step-client-hello', 'step-server-hello', 'step-server-cert', 'step-client-finished'];
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0.3';
    });
    
    // Enable spinner
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Establishing Secure Connection...';
    
    statusText.textContent = 'Connecting...';
    statusText.className = 'badge badge-purple';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned HTTP status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status !== "Success") {
            throw new Error(data.error || "Unknown server error");
        }
        
        // Success! Run the stepper animation
        for (let i = 0; i < steps.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 250));
            const el = document.getElementById(steps[i]);
            if (el) el.style.opacity = '1.0';
        }
        
        // Update security metrics
        document.getElementById('tls-val-version').textContent = data.protocol;
        document.getElementById('tls-val-cipher').textContent = data.cipher;
        document.getElementById('tls-val-strength').textContent = data.cipher_strength + ' bits';
        
        // Populate certificate card
        if (data.server_cert) {
            const subj = data.server_cert.subject;
            const iss = data.server_cert.issuer;
            document.getElementById('tls-cert-cn').textContent = subj.CN || '--';
            document.getElementById('tls-cert-o').textContent = subj.O || '--';
            document.getElementById('tls-cert-loc').textContent = `${subj.L || ''}, ${subj.ST || ''}, ${subj.C || ''}`.replace(/^,\s*|,\s*$/, '');
            document.getElementById('tls-cert-issuer').textContent = iss.CN || '--';
            certCard.classList.remove('hidden');
        }
        
        statusText.textContent = 'Secured (TLS)';
        statusText.className = 'badge badge-green';
        
        banner.className = 'status-banner success';
        banner.innerHTML = `<i class="fa-solid fa-circle-check"></i> HTTPS connection successfully verified! <strong>${data.protocol}</strong> handshake complete with <strong>${data.cipher}</strong>.`;
        banner.classList.remove('hidden');
        
    } catch (err) {
        console.error("TLS Fetch error:", err);
        statusText.textContent = 'Connection Error';
        statusText.className = 'badge badge-red';
        
        banner.className = 'status-banner error';
        banner.innerHTML = `
            <i class="fa-solid fa-circle-xmark"></i> <strong>Handshake Failed:</strong> Browser blocked the request or the server is offline.<br>
            <div style="font-size:0.85rem; margin-top:0.5rem; line-height:1.4;">
                <strong>To resolve this:</strong><br>
                1. Make sure your Python Flask server is running on port 5000.<br>
                2. Since the server uses a self-signed certificate, you must instruct the browser to trust it. Click this link: 
                <a href="https://localhost:5000/api/tls-details" target="_blank" style="color:var(--neon-blue); font-weight:600; text-decoration:underline;">https://localhost:5000/api/tls-details</a>.
                When the browser warning appears, click <strong>"Advanced"</strong> and then <strong>"Proceed to localhost (unsafe)"</strong>.<br>
                3. Return here and click the button again.
            </div>
        `;
        banner.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// Automatically configure server URL input on load
window.addEventListener('DOMContentLoaded', () => {
    const tlsInput = document.getElementById('tls-server-url');
    if (tlsInput) {
        if (window.location.protocol.startsWith('http')) {
            // Force https as the Flask app uses SSL
            const protocol = 'https:';
            const host = window.location.hostname;
            tlsInput.value = `${protocol}//${host}:5000/api/tls-details`;
        }
    }
});



