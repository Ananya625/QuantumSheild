import React, { useState } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';

export const TransferForm: React.FC = () => {
  const { setScreen, initiateTransfer, balance } = useTransaction();
  
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
    initiateTransfer(beneficiary, amountVal, description);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans select-none">
      {/* Header Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shadow-sm">
        <button
          onClick={() => setScreen('DASHBOARD')}
          className="text-slate-500 hover:text-slate-800 p-2 hover:bg-slate-50 rounded-xl transition duration-200 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-extrabold text-lg tracking-tight text-slate-900">Initiate Local Bank Transfer</span>
      </nav>

      {/* Main Form Area */}
      <div className="flex-1 max-w-xl mx-auto w-full px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          
          <div className="flex items-center space-x-2.5 mb-6 text-blue-600">
            <ShieldCheck className="h-6 w-6" />
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Security Checkpoint</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Beneficiary Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Beneficiary</label>
              <select
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition duration-200"
              >
                <option value="987654321">Bob (Account: ...987654321)</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transfer Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition duration-200"
                  placeholder="0.00"
                  min="1"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Available balance: ${balance.toLocaleString()}</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Memo / Reference</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition duration-200"
                placeholder="Description"
              />
            </div>

            {/* Transaction Passcode */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transaction Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition duration-200"
                placeholder="********"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">For demo purposes, use `password123`</p>
            </div>

            {/* Authorization Checkbox */}
            <label className="flex items-start space-x-3 pt-2 text-xs text-slate-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 mt-0.5"
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
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl transition duration-200 text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-200 text-center flex items-center justify-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                Initiate Transfer
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
export default TransferForm;
