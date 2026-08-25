import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, Minus, Square } from 'lucide-react';
import { useTransaction } from '../context/TransactionContext';

interface EveTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  eveEnabled: boolean;
  qubits: number;
}

export const EveTerminalModal: React.FC<EveTerminalModalProps> = ({ isOpen, onClose, eveEnabled }) => {
  const { logs } = useTransaction();
  const [terminalLogs, setTerminalLogs] = useState<{ id: number; text: string; color: string }[]>([]);
  
  // Window state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Set sensible initial position once when opened
  useEffect(() => {
    if (isOpen && position.x === 0 && position.y === 0) {
      setPosition({
        x: Math.max(0, (window.innerWidth - 600) / 2),
        y: Math.max(0, window.innerHeight * 0.1)
      });
    }
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMaximized) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isMaximized) return;
    
    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;
    
    // Viewport clamping
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 40;
    
    newX = Math.max(-500, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const addLog = (text: string, color: string = 'text-green-400') => {
    const timestamp = new Date().toISOString().substring(11, 19);
    setTerminalLogs(prev => [...prev, { id: nextId.current++, text: `[${timestamp}] ${text}`, color }]);
  };

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (isOpen) {
      setTerminalLogs([]);
      addLog('[SYSTEM] Initializing Eve monitor...', 'text-slate-400');
      if (eveEnabled) {
         addLog('[EVE] Target:\nBANK-A → BANK-B', 'text-yellow-400');
         addLog('[EVE] Intercepting BB84 quantum channel...', 'text-rose-400');
      } else {
         addLog('[EVE] Channel monitor active. No interception requested.', 'text-slate-400');
      }
    }
  }, [isOpen, eveEnabled]);

  // Sync with global transaction logs
  useEffect(() => {
    if (!isOpen || logs.length === 0) return;
    const latestLog = logs[logs.length - 1];
    
    let color = 'text-slate-300';
    let text = '';
    
    switch (latestLog.event) {
      case 'EVE_INTERCEPTION': {
        const intercepted = latestLog.data?.intercepted_qubits || 128;
        const more = intercepted > 5 ? intercepted - 5 : 0;
        color = 'text-rose-400';
        text = `[EVE] Intercepting BB84 quantum channel...\n[EVE] Qubit #001 intercepted\n[EVE] Qubit #002 intercepted\n[EVE] Qubit #003 intercepted\n[EVE] Qubit #004 intercepted\n[EVE] Qubit #005 intercepted\n[EVE] ... and ${more} more qubits intercepted\n[EVE] Interception complete`;
        break;
      }
      default:
        // Ignore non-BB84/Eve events to keep terminal focused
        return;
    }
    
    addLog(text, color);
    
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed z-50 flex flex-col bg-black border border-slate-700 rounded-xl shadow-2xl overflow-hidden ${
        isMaximized ? 'inset-2 w-auto h-auto' : 'w-[600px] max-w-[90vw]'
      }`}
      style={
        isMaximized 
          ? {} 
          : { 
              left: 0,
              top: 0,
              transform: `translate(${position.x}px, ${position.y}px)`, 
              height: isMinimized ? 'auto' : '500px'
            }
      }
    >
      {/* Header */}
      <div 
        className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 cursor-move select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2 text-rose-400">
          <Terminal className="h-5 w-5" />
          <h3 className="font-bold text-sm tracking-wider uppercase font-mono">
            Eve Demonstration Terminal
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-white transition cursor-pointer"
            title="Minimize"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); setIsMinimized(false); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-white transition cursor-pointer"
            title="Maximize"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-400 hover:text-rose-400 transition cursor-pointer ml-1"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      {!isMinimized && (
        <div className="p-4 flex-1 bg-black text-[13px] font-mono leading-relaxed overflow-y-auto custom-scrollbar">
          {terminalLogs.map((log) => (
            <div key={log.id} className={`${log.color} whitespace-pre-wrap mb-1 break-words`}>
              {log.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
