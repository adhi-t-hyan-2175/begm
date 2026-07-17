import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { calculatePayout } from '../utils/payout';

const BetCardModal = ({
  isOpen,
  game,
  selection,
  onClose,
  onConfirm,
  defaultAmount = 10,
  minAmount = 5,
  maxAmount = 5000,
  step = 5,
  feePercent = 2,
  showNumberSelector = true
}) => {
  const { balance } = useWallet();
  const [contractAmount, setContractAmount] = useState(defaultAmount);
  const [selectionNumber, setSelectionNumber] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setContractAmount(defaultAmount);
      setSelectionNumber(1);
    }
  }, [isOpen, defaultAmount, selection]);

  if (!isOpen) return null;

  const { fee, winningAmount: potentialReturn } = calculatePayout(selection, contractAmount, feePercent);

  const contractOptions = [10, 100, 1000, 10000];

  const adjustSelectionNumber = (value) => {
    setSelectionNumber((prev) => Math.max(0, Math.min(9, prev + value)));
  };

  const title = String(selection).match(/^\d+$/)
    ? `Pick ${selection}`
    : `Join ${selection}`;

  const getButtonColor = () => {
    const s = String(selection).toLowerCase();
    if (s.includes('green') || s.includes('5 hits')) return '#48b85c';
    if (s.includes('red') || s.includes('large')) return '#e0413c';
    if (s.includes('violet')) return '#7c4ab8';
    if (s.includes('small') || s.includes('2 hits') || s.includes('blue')) return '#0ea5e9';
    if (s.includes('tie') || s === '7' || s.includes('yellow')) return '#e8b84d';
    if (s.includes('3 hits') || s.includes('pink')) return '#e87fb0';
    return '#0095ff';
  };

  return (
    <div className="bet-modal-backdrop" onClick={onClose}>
      <div className="bet-card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bet-card-close" onClick={onClose} aria-label="Close bet card">
          <X size={20} />
        </button>

        <div className="bet-card-header">
          <div>
            <div className="bet-card-subtitle">{game}</div>
            <div className="bet-card-title">{title}</div>
          </div>
        </div>

        <div className="bet-card-balance-row">
          <div className="bet-card-balance-value">₹{contractAmount.toFixed(2)}</div>
          <button type="button" className="recharge-button">Recharge</button>
        </div>

        <div className="bet-card-section">
          <div className="bet-card-section-label">Contract Money</div>
          <div className="contract-options">
            {contractOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`contract-button ${contractAmount === option ? 'active' : ''}`}
                onClick={() => setContractAmount(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {showNumberSelector && (
          <div className="bet-card-section">
            <div className="bet-card-section-label">Number</div>
            <div className="number-selector">
              <button type="button" className="number-button" onClick={() => adjustSelectionNumber(-5)}>-5</button>
              <button type="button" className="number-button" onClick={() => adjustSelectionNumber(-1)}>-1</button>
              <div className="number-value">{selectionNumber}</div>
              <button type="button" className="number-button" onClick={() => adjustSelectionNumber(1)}>+1</button>
              <button type="button" className="number-button" onClick={() => adjustSelectionNumber(5)}>+5</button>
            </div>
          </div>
        )}

        <div className="bet-card-note">Total contract money is {contractAmount}</div>

        <div className="bet-card-stats">
          <div>
            <div className="bet-card-stat-label">Fee</div>
            <div className="bet-card-stat-value">₹{fee}</div>
          </div>
          <div>
            <div className="bet-card-stat-label">Return</div>
            <div className="bet-card-stat-value">₹{potentialReturn}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(selection, contractAmount)}
          className="bet-card-confirm"
          style={{ background: getButtonColor() }}
        >
          Confirm
        </button>

        <div className="bet-card-footer">Balance ₹{balance.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default BetCardModal;
