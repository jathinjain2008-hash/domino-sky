import React, { useState } from 'react';
import { AirlineDataset } from '../types/aviation';
import { DEMO_DATASET, validateAirlineDataset } from '../data/demoDataset';
import { CheckCircle2, Download, RotateCcw, Upload, X } from 'lucide-react';

interface DatasetModalProps {
  dataset: AirlineDataset;
  onClose: () => void;
  onLoadDataset: (newDataset: AirlineDataset) => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  dataset,
  onClose,
  onLoadDataset,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningList, setWarningList] = useState<string[]>([]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dataset.metadata.isDemo ? 'domino-sky-india-demo-dataset.json' : 'domino-sky-dataset.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setJsonText(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyJson = () => {
    setErrorMsg(null);
    setWarningList([]);
    try {
      const parsed = JSON.parse(jsonText) as AirlineDataset;
      if (!parsed.metadata) {
        parsed.metadata = {
          label: 'Official / Custom Airline Dataset',
          isDemo: false,
          version: '1.0.0',
          source: 'Imported JSON payload',
          notes: '',
        };
      }
      const validation = validateAirlineDataset(parsed);
      if (!validation.valid) {
        setErrorMsg(validation.errors.join(' '));
        return;
      }
      setWarningList(validation.warnings);
      onLoadDataset(parsed);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid JSON format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-2xl rounded-md bg-[#151B22] border border-[#28313B] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#10151B] border-b border-[#28313B]">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EDF2]">
              Schedule Dataset Schema &amp; Official JSON Import
            </h2>
            <p className="text-xs text-[#8B98A7] mt-0.5">
              Inspect built-in DEMO DATA or load an official competition JSON payload into the simulation engine.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#8B98A7] hover:text-[#E8EDF2] hover:bg-[#151B22] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="rounded border border-[#28313B] bg-[#10151B] p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#5EC8D8]">{dataset.metadata.label}</span>
              <span className="font-mono text-[#8B98A7]">{dataset.metadata.version}</span>
            </div>
            <p className="text-[#8B98A7] leading-relaxed">{dataset.metadata.notes}</p>
            <div className="pt-2 flex flex-wrap gap-4 font-mono text-[#E8EDF2] tabular-nums">
              <span>Airports: {dataset.airports.length}</span>
              <span>Flights: {dataset.flights.length}</span>
              <span>Aircraft: {dataset.aircraft.length}</span>
              <span>Crew: {dataset.crew.length}</span>
              <span>Connections: {dataset.connections.length}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium text-[#E8EDF2] bg-[#10151B] hover:bg-[#1A222B] border border-[#28313B] transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#5EC8D8]" />
              <span>Export Current JSON</span>
            </button>

            <label className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium text-[#E8EDF2] bg-[#10151B] hover:bg-[#1A222B] border border-[#28313B] cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5 text-[#5EC8D8]" />
              <span>Upload JSON File</span>
              <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
            </label>

            {!dataset.metadata.isDemo && (
              <button
                type="button"
                onClick={() => {
                  onLoadDataset(DEMO_DATASET);
                  onClose();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium text-[#F2A93B] bg-[#211A10] hover:bg-[#2B2214] border border-[#523B1B] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore India DEMO DATA</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#8B98A7]">
              Paste Official Dataset JSON (optional)
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={7}
              placeholder='{"metadata": {...}, "airports": [...], "aircraft": [...], "crew": [...], "flights": [...], "connections": [...]}'
              className="w-full rounded bg-[#0B0E12] border border-[#28313B] p-3 font-mono text-xs text-[#E8EDF2] placeholder:text-[#647282] focus:outline-none focus:border-[#5EC8D8]"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded bg-[#221215] border border-[#6E2D2D] text-xs text-[#E05D5D]">
              {errorMsg}
            </div>
          )}

          {warningList.length > 0 && (
            <div className="p-3 rounded bg-[#211A10] border border-[#523B1B] text-xs text-[#F2A93B] space-y-1">
              {warningList.slice(0, 4).map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-[#28313B] bg-[#10151B]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-[#8B98A7] hover:text-[#E8EDF2]"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!jsonText.trim()}
            onClick={handleApplyJson}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#0B0E12] bg-[#5EC8D8] hover:bg-[#76D4E2] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Validate &amp; Load</span>
          </button>
        </div>
      </div>
    </div>
  );
};
