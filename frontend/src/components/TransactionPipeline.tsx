import React from 'react';
import { useTransaction } from '../context/TransactionContext';
import type { PipelineStatus } from '../context/TransactionContext';
import { 
  User, Shield, Globe, Server, CheckCircle2
} from 'lucide-react';

interface Stage {
  name: string;
  label: string;
  icon: React.ReactNode;
  statuses: PipelineStatus[];
}

interface TransactionPipelineProps {
  orientation?: 'horizontal' | 'vertical';
}

export const TransactionPipeline: React.FC<TransactionPipelineProps> = ({ orientation = 'horizontal' }) => {
  const { pipelineStatus } = useTransaction();

  // Define 5 simplified network gateway checkpoints
  const stages: Stage[] = [
    {
      name: 'Customer',
      label: 'Customer',
      icon: <User className="h-3.5 w-3.5" />,
      statuses: ['AUTHENTICATING']
    },
    {
      name: 'BankA',
      label: 'Bank A',
      icon: <Shield className="h-3.5 w-3.5" />,
      statuses: ['TLS_HANDSHAKE', 'TLS_ESTABLISHED']
    },
    {
      name: 'Internet',
      label: 'Internet',
      icon: <Globe className="h-3.5 w-3.5" />,
      statuses: ['KEY_EXCHANGE', 'DERIVING_KEY', 'ENCRYPTING', 'SIGNING', 'TRANSMITTING']
    },
    {
      name: 'BankB',
      label: 'Bank B',
      icon: <Server className="h-3.5 w-3.5" />,
      statuses: ['VERIFYING_SIGNATURE', 'DECRYPTING']
    },
    {
      name: 'Receiver',
      label: 'Receiver',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      statuses: ['SETTLING', 'COMPLETED']
    }
  ];

  const getStageState = (index: number): 'pending' | 'active' | 'completed' | 'failed' => {
    if (pipelineStatus === 'FAILED') {
      const activeIndex = stages.findIndex(s => s.statuses.includes(pipelineStatus));
      if (index === activeIndex) return 'failed';
    }
    
    const activeIndex = stages.findIndex(s => s.statuses.includes(pipelineStatus));
    
    if (pipelineStatus === 'COMPLETED') {
      return 'completed';
    }

    if (activeIndex === -1) {
      return index === 0 && pipelineStatus !== 'PENDING' ? 'active' : 'pending';
    }

    if (index < activeIndex) return 'completed';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  const isVertical = orientation === 'vertical';

  return (
    <div className={`flex select-none items-center justify-between w-full h-full ${
      isVertical ? 'flex-col py-4' : 'flex-row px-4'
    }`}>
      {stages.map((stage, idx) => {
        const state = getStageState(idx);
        
        let circleColor = 'border-slate-200 bg-white text-slate-400';
        let textColor = 'text-slate-400';
        let lineBg = 'bg-slate-200';
        
        if (state === 'completed') {
          circleColor = 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm';
          textColor = 'text-emerald-700 font-bold';
          lineBg = 'bg-emerald-500';
        } else if (state === 'active') {
          circleColor = 'border-blue-600 bg-blue-50 text-blue-600 shadow-md ring-4 ring-blue-500/10 animate-pulse';
          textColor = 'text-blue-700 font-extrabold';
          lineBg = 'bg-slate-200';
        } else if (state === 'failed') {
          circleColor = 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm animate-bounce';
          textColor = 'text-rose-700 font-bold';
          lineBg = 'bg-slate-200';
        }

        return (
          <React.Fragment key={stage.name}>
            {/* Stepper Node */}
            <div className={`flex items-center ${
              isVertical ? 'flex-col space-y-1.5' : 'flex-col space-y-1'
            }`}>
              <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${circleColor}`}>
                {state === 'completed' && stage.name !== 'Receiver' ? <CheckCircle2 className="h-4.5 w-4.5" /> : stage.icon}
              </div>
              <p className={`text-[8.5px] uppercase tracking-wider font-semibold text-center ${textColor}`}>
                {stage.label}
              </p>
            </div>

            {/* Connecting line */}
            {idx < stages.length - 1 && (
              isVertical ? (
                <div className="h-10 w-0.5 relative">
                  <div className={`absolute inset-0 transition-colors duration-500 ${lineBg}`} />
                  {state === 'completed' && (
                    <div className="absolute left-[-2px] top-0 h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  )}
                </div>
              ) : (
                <div className="flex-1 h-0.5 mx-2 relative min-w-[20px]">
                  <div className={`absolute inset-0 transition-colors duration-500 ${lineBg}`} />
                  {state === 'completed' && (
                    <div className="absolute top-[-2px] left-0 h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  )}
                </div>
              )
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
export default TransactionPipeline;
