import React from 'react';
import { useTransaction } from '../context/TransactionContext';
import { Network, Terminal, Eye } from 'lucide-react';

// Generates Wireshark-style hex dump representation of a hex string
function generateHexDump(hex: string): string {
  if (!hex) return 'Waiting for packet transmission...';
  
  let result = '';
  const bytes = hex.match(/.{1,2}/g) || [];
  
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    
    // Address offset column (4-digit hex)
    const addr = i.toString(16).padStart(4, '0');
    
    // Hexadecimal values formatted in two columns of 8 bytes
    const col1 = chunk.slice(0, 8).join(' ');
    const col2 = chunk.slice(8, 16).join(' ');
    const hexPart = `${col1.padEnd(23, ' ')}  ${col2.padEnd(23, ' ')}`;
    
    // Printable ASCII column
    const asciiPart = chunk.map(b => {
      const charCode = parseInt(b, 16);
      return (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
    }).join('');
    
    result += `${addr}  ${hexPart}  |${asciiPart}|\n`;
  }
  return result;
}

export const PacketInspector: React.FC = () => {
  const { crypto, pipelineStatus } = useTransaction();
  const packet = crypto.packetData;

  const showWaiting = !packet || ['PENDING', 'AUTHENTICATING', 'TLS_HANDSHAKE', 'TLS_ESTABLISHED', 'KEY_EXCHANGE', 'DERIVING_KEY', 'ENCRYPTING', 'SIGNING'].includes(pipelineStatus);
  const isQuantum = crypto.securityMode === 'quantumshield';

  return (
    <div className="flex flex-col h-full p-6 bg-white min-h-0 select-none">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-slate-800 tracking-tight">Decoded TCP Frame Header</h4>
          <p className="text-[10px] text-slate-500">HTTP/TLS packet captures intercepted at public gateway interfaces.</p>
        </div>
        <Network className="h-4.5 w-4.5 text-blue-600" />
      </div>

      {showWaiting ? (
        <div className="flex-1 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex flex-col items-center justify-center p-8 text-center">
          <Eye className="h-8 w-8 text-slate-300 animate-pulse mb-3" />
          <h4 className="font-semibold text-xs text-slate-600">No Captured Packets</h4>
          <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
            Initiate a secure transfer to capture and inspect the raw binary TLS transaction frame.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Packet IP Details */}
          <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono select-all">
            <div>
              <span className="text-slate-400 font-semibold mr-1">SRC:</span>
              <span className="text-slate-700 font-bold">{packet.network_frame.source_ip}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold mr-1">DST:</span>
              <span className="text-slate-700 font-bold">{packet.network_frame.dest_ip}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold mr-1">PROTOCOL:</span>
              <span className="text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[10px]">
                {isQuantum ? "TCP / PQC / HTTPS" : packet.network_frame.protocol}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold mr-1">LENGTH:</span>
              <span className="text-slate-700 font-bold">{packet.network_frame.length} Bytes</span>
            </div>
          </div>

          {/* Decoded HTTP headers */}
          <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px]">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-1.5 text-slate-700 font-bold">
              <Terminal className="h-3.5 w-3.5" />
              <span>HTTP/1.1 REST Protocol Headers</span>
            </div>
            <div className="p-4 space-y-1.5 font-mono bg-white text-slate-600 select-all leading-relaxed">
              <div className="flex"><span className="w-28 text-slate-400 font-semibold">Request:</span> <span className="text-blue-700 font-bold">{packet.http_header.method} {packet.http_header.path}</span></div>
              <div className="flex"><span className="w-28 text-slate-400 font-semibold">Host Header:</span> <span className="text-slate-700 font-medium">{packet.http_header.host}</span></div>
              <div className="flex"><span className="w-28 text-slate-400 font-semibold">User Agent:</span> <span className="text-slate-700">{packet.http_header.user_agent}</span></div>
              <div className="flex"><span className="w-28 text-slate-400 font-semibold">Content-Type:</span> <span className="text-slate-700">{packet.http_header.content_type}</span></div>
              <div className="flex items-start">
                <span className="w-28 text-slate-400 font-semibold shrink-0">Authorization:</span> 
                <span className="text-emerald-700 font-semibold truncate max-w-[280px]" title={isQuantum ? "ML-DSA Verification Token" : "ECDSA Verification Token"}>
                  {isQuantum ? 'ML-DSA-Signature' : 'ECDSA-Signature'} {packet.tls_payload.signature?.substring(0, 16)}...
                </span>
              </div>
            </div>
          </div>

          {/* Hex Dump Code block */}
          <div className="flex-1 min-h-0 flex flex-col border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-700 font-bold select-none">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                <span>Hex Encrypted Payload Dump</span>
              </div>
              <span className="text-[9px] text-slate-400 font-semibold uppercase">
                {isQuantum ? "AES-256 (Kyber-Keyed) Ciphertext" : "AES-256-GCM Ciphertext"}
              </span>
            </div>
            
            <pre className="flex-1 p-4 bg-slate-900 text-slate-100 font-mono text-[10px] leading-4 overflow-y-auto whitespace-pre select-all select-text custom-scrollbar">
              {generateHexDump(packet.tls_payload.encrypted_payload)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
export default PacketInspector;
