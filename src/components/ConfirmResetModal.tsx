import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ConfirmResetModalProps {
  open: boolean;
  scenarioLabel: string;
  appliedActionsCount: number;
  totalFlightsCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  open,
  scenarioLabel,
  appliedActionsCount,
  totalFlightsCount,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-dialog-title"
    >
      <div className="w-full max-w-md rounded-md bg-[#151B22] border border-[#28313B] overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 bg-[#10151B] border-b border-[#28313B]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#F2A93B] shrink-0" />
            <div>
              <h2 id="reset-dialog-title" className="text-sm font-semibold text-[#E8EDF2]">
                Reset Active Disruption?
              </h2>
              <p className="text-xs text-[#8B98A7] mt-0.5">
                Return the Indian schedule to nominal baseline operations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-[#8B98A7] hover:text-[#E8EDF2] transition-colors"
            aria-label="Cancel reset"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2.5 text-xs sm:text-sm text-[#8B98A7] leading-relaxed">
          <p>
            This clears the active scenario (
            <span className="font-semibold text-[#E8EDF2]">{scenarioLabel}</span>)
            {appliedActionsCount > 0
              ? ` and removes ${appliedActionsCount} applied recovery ${
                  appliedActionsCount === 1 ? 'decision' : 'decisions'
                }`
              : ''}
            .
          </p>
          <p className="text-xs text-[#647282]">
            All {totalFlightsCount} flights, tail rotations, and connecting passenger waves revert to scheduled times.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-[#10151B] border-t border-[#28313B]">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[36px] px-4 py-1.5 rounded text-xs font-medium text-[#E8EDF2] bg-[#151B22] hover:bg-[#1A222B] border border-[#28313B] transition-colors"
          >
            Keep Scenario
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[36px] flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold text-[#0B0E12] bg-[#F2A93B] hover:bg-[#F5BA5C] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Network</span>
          </button>
        </div>
      </div>
    </div>
  );
};
