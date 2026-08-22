import React, { useState } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { Send, ShieldCheck } from 'lucide-react';

export const TransferForm: React.FC = () => {
  const { setScreenA: setScreen, initiateTransfer, balanceA: balance } = useTransaction();
  
  // Beneficiary details
  const [beneficiary, setBeneficiary] = useState('987654321');
  const [amount, setAmount] = useState('100');
  const [description, setDescription] = useState('Family Transfer');
  const [passcode, setPasscode] = useState('password123');
  const [authorized, setAuthorized] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setValidationError("Please enter a valid positive transfer amount.");
      return;
    }
    
    if (amountVal > balance) {
      setValidationError(`Insufficient balance. Maximum available is $${balance.toLocaleString()}.`);
      return;
    }
    
    if (passcode !== 'password123') {
      setValidationError("Incorrect security passcode.");
      return;
    }

    if (!authorized) {
      setValidationError("You must authorize the transaction from this registered device.");
      return;
    }

    // Initiate backend background coordinator execution
    initiateTransfer(amountVal, description);
  };

  return (
    <div className="w-full p-4 select-none">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-xl mx-auto font-sans">
        
        <div className="flex items-center space-x-2.5 mb-6 text-[#98144D]">
          <ShieldCheck className="h-6 w-6" />
          <h3 className="font-bold text-base text-slate-800 tracking-tight">Security Checkpoint</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Beneficiary Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider md:w-1/3">Beneficiary</label>
            <select
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="md:w-2/3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 focus:border-[#98144D] font-medium transition duration-200"
            >
              <option value="987654321">Bob (HDFC Bank ...987654321)</option>
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider md:w-1/3">Amount</label>
            <div className="md:w-2/3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 focus:border-[#98144D] font-bold transition duration-200"
                  placeholder="0.00"
                  min="1"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Available balance: ${balance.toLocaleString()}</p>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider md:w-1/3">Memo / Reference</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="md:w-2/3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 focus:border-[#98144D] font-medium transition duration-200"
              placeholder="Description"
            />
          </div>

          {/* Transaction Passcode */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider md:w-1/3">Passcode</label>
            <div className="md:w-2/3">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 focus:border-[#98144D] font-medium transition duration-200"
                placeholder="********"
              />
              <p className="text-[9px] text-slate-400 mt-1 font-medium">Demo passcode: `password123`</p>
            </div>
          </div>

          {/* Authorization Checkbox */}
          <label className="flex items-start space-x-3 pt-2 text-xs text-slate-600 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="rounded border-slate-300 text-[#98144D] focus:ring-[#98144D]/20 mt-0.5"
            />
            <span>I authorize this fund transfer from this registered device.</span>
          </label>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl font-medium">
              {validationError}
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex space-x-4">
            <button
              type="button"
              onClick={() => setScreen('DASHBOARD')}
              className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl transition duration-200 text-center text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#98144D] hover:bg-[#700d36] active:bg-[#500925] text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition duration-200 text-center flex items-center justify-center gap-1.5 text-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Initiate Transfer
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default TransferForm;
