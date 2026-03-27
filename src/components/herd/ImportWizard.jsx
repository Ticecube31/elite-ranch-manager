import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logTagHistory } from '@/lib/tagHistoryLogger';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';

const APP_FIELDS = [
  { key: 'tag_number', label: 'Tag # (Animal Number)', required: true },
  { key: 'sex', label: 'Sex', required: true },
  { key: 'animal_type', label: 'Animal Type', required: true },
  { key: 'mother_animal_number', label: 'Mother Tag #', required: false },
  { key: 'date_of_birth', label: 'Date of Birth / Date Tagged', required: false },
  { key: 'status', label: 'Status (Alive/Sold/Died/Missing)', required: false },
  { key: 'pasture_id', label: 'Location / Pasture', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

// Smart column matching
function smartMatchColumns(headers) {
  const matches = {};
  const headerLower = headers.map(h => h.toLowerCase());
  
  const patterns = {
    tag_number: ['tag', 'tag #', 'tag#', 'animal #', 'animal#', 'number', 'ear tag', 'id'],
    sex: ['sex', 'male/female', 'm/f'],
    animal_type: ['type', 'animal type', 'breed', 'class'],
    mother_animal_number: ['mother', 'mother tag', 'mother #', 'dam', 'dam tag'],
    date_of_birth: ['date', 'dob', 'birth date', 'birth', 'date of birth', 'tagged', 'tag date', 'date tagged'],
    status: ['status', 'alive', 'sold'],
    pasture_id: ['pasture', 'location', 'field', 'pen', 'paddock'],
    notes: ['notes', 'remarks', 'comments'],
  };
  
  headerLower.forEach((h, idx) => {
    for (const [field, patterns_list] of Object.entries(patterns)) {
      if (patterns_list.some(p => h.includes(p))) {
        if (!Object.values(matches).includes(field)) {
          matches[idx] = field;
        }
      }
    }
  });
  
  return matches;
}

// Parse CSV
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
  return { headers, rows };
}

// Step 1: Upload File
function StepUpload({ onContinue }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.(csv|xlsx?)$/i)) {
      toast.error('Only CSV and Excel files supported');
      return;
    }
    setUploading(true);
    setFile(f);
    const text = await f.text();
    setUploading(false);
    onContinue(f.name, text);
  };

  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-wide mb-2">Step 1 of 3</p>
        <h2 className="font-heading font-black text-2xl" style={{ color: PURPLE_DARK }}>Upload File</h2>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-purple-200 p-8 text-center">
        <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: PURPLE }} />
        <p className="text-gray-600 text-sm mb-1">Choose Excel or CSV File</p>
        <p className="text-gray-400 text-xs mb-6">Upload your existing spreadsheet to bring in animals or other data</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-14 px-8 rounded-xl text-white font-bold text-base shadow-md mb-3"
          style={{ background: uploading ? '#ccc' : `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
        >
          {uploading ? 'Reading file...' : 'Choose Excel or CSV File'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />
        {file && (
          <p className="text-xs text-green-600 font-bold mt-3">✓ {file.name} selected</p>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">Supported formats: CSV, Excel (.xlsx, .xls)</p>
    </div>
  );
}

// Step 2: Preview
function StepPreview({ fileName, rows, headers, onContinue }) {
  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-wide mb-2">Step 2 of 3</p>
        <h2 className="font-heading font-black text-2xl" style={{ color: PURPLE_DARK }}>Preview Data</h2>
        <p className="text-xs text-gray-500 mt-1">{fileName} • {rows.length} rows total</p>
      </div>

      <div className="rounded-2xl border border-purple-100 overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead style={{ background: PURPLE_LIGHT }}>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-bold text-gray-700 whitespace-nowrap text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map((h, j) => (
                  <td key={j} className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap max-w-[120px] truncate">
                    {row[h] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-gray-500">
        Showing first {previewRows.length} of {rows.length} rows
      </p>

      <button
        onClick={onContinue}
        className="w-full h-14 rounded-xl text-white font-bold text-base shadow-md"
        style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
      >
        Looks Good — Continue
      </button>
    </div>
  );
}

// Step 3: Column Mapping
function StepMapping({ headers, rows, onImport, importing }) {
  const [mapping, setMapping] = useState(() => smartMatchColumns(headers));

  const handleMapChange = (colIdx, fieldKey) => {
    setMapping(prev => ({ ...prev, [colIdx]: fieldKey || '' }));
  };

  const requiredFields = APP_FIELDS.filter(f => f.required).map(f => f.key);
  const mappedRequired = Object.values(mapping);
  const allRequiredMapped = requiredFields.every(rf => mappedRequired.includes(rf));

  const handleImportClick = () => {
    if (!allRequiredMapped) {
      toast.error('Please map all required fields');
      return;
    }
    onImport(mapping, rows, headers);
  };

  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-wide mb-2">Step 3 of 3</p>
        <h2 className="font-heading font-black text-2xl" style={{ color: PURPLE_DARK }}>Match Your Columns</h2>
        <p className="text-xs text-gray-500 mt-1">Tell us which app field each column represents</p>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {headers.map((header, colIdx) => (
          <div key={colIdx} className="rounded-xl p-4 border border-purple-100" style={{ background: PURPLE_LIGHT }}>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{header}</p>
            <select
              value={mapping[colIdx] || ''}
              onChange={e => handleMapChange(colIdx, e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-purple-200 text-sm font-semibold"
            >
              <option value="">— Don't import —</option>
              {APP_FIELDS.map(field => (
                <option key={field.key} value={field.key}>
                  {field.label} {field.required ? ' *' : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ background: '#FFF8E1' }}>
        <p className="text-xs font-bold text-gray-600">
          * = Required field • Make sure all required fields are mapped
        </p>
      </div>

      <button
        onClick={handleImportClick}
        disabled={importing || !allRequiredMapped}
        className="w-full h-14 rounded-xl text-white font-bold text-base shadow-md flex items-center justify-center gap-2"
        style={{
          background: importing || !allRequiredMapped ? '#ccc' : `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`
        }}
      >
        {importing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Importing...
          </>
        ) : (
          <>
            <ChevronRight className="w-5 h-5" /> Import Data
          </>
        )}
      </button>
    </div>
  );
}

// Success Screen
function StepSuccess({ count, onClose, onViewSpreadsheet }) {
  return (
    <div className="space-y-6 py-10 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="w-16 h-16" style={{ color: '#2E7D32' }} />
      </div>
      <div>
        <h2 className="font-heading font-black text-2xl mb-2" style={{ color: PURPLE_DARK }}>
          Import Complete!
        </h2>
        <p className="text-gray-600 text-base font-semibold">
          {count} rows imported successfully
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={onViewSpreadsheet}
          className="w-full h-14 rounded-xl text-white font-bold text-base shadow-md"
          style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
        >
          View in Spreadsheet
        </button>
        <button
          onClick={onClose}
          className="w-full h-14 rounded-xl border-2 border-purple-200 font-bold text-base"
          style={{ color: PURPLE_DARK }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Error Screen
function StepError({ error, onBack }) {
  return (
    <div className="space-y-6 py-10 text-center">
      <div className="flex justify-center">
        <AlertCircle className="w-16 h-16 text-red-500" />
      </div>
      <div>
        <h2 className="font-heading font-black text-2xl mb-2" style={{ color: PURPLE_DARK }}>
          Import Failed
        </h2>
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
      <button
        onClick={onBack}
        className="w-full h-14 rounded-xl border-2 border-purple-200 font-bold text-base"
        style={{ color: PURPLE_DARK }}
      >
        Try Again
      </button>
    </div>
  );
}

// Main Wizard
export default function ImportWizard({ onClose, onSuccess }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'mapping' | 'success' | 'error'
  const [fileData, setFileData] = useState({ name: '', headers: [], rows: [] });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const currentUser = null; // Will be fetched in parent

  const importMutation = useMutation({
    mutationFn: async (data) => {
      const { mapping, rows, headers, animals, seasons } = data;
      let successCount = 0;

      for (const row of rows) {
        try {
          const newRecord = {};
          headers.forEach((h, i) => {
            const fieldKey = mapping[i];
            if (fieldKey) {
              newRecord[fieldKey] = row[h] || '';
            }
          });

          // Validate required fields
          if (!newRecord.tag_number || !newRecord.sex || !newRecord.animal_type) continue;

          // Check for duplicate
          if (animals.find(a => a.tag_number === newRecord.tag_number)) continue;

          // Auto-derive birth year and season
          if (newRecord.date_of_birth) {
            const year = new Date(newRecord.date_of_birth).getFullYear();
            newRecord.birth_year = year;
            const season = seasons.find(s => s.year === year);
            if (season) newRecord.calving_season_id = season.id;
          }

          // Create animal
          await base44.entities.Animals.create({
            ...newRecord,
            status: newRecord.status || 'Alive',
            is_archived: false,
          });
          successCount++;
        } catch (e) {
          // Skip failed rows
        }
      }

      return successCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      setStep('success');
      onSuccess?.(count);
    },
    onError: (err) => {
      setError(err.message || 'Import failed');
      setStep('error');
    },
  });

  const handleUploadContinue = (name, text) => {
    try {
      const { headers, rows } = parseCSV(text);
      if (rows.length === 0) {
        setError('No data rows found');
        setStep('error');
        return;
      }
      setFileData({ name, headers, rows });
      setStep('preview');
    } catch (e) {
      setError('Failed to parse file: ' + e.message);
      setStep('error');
    }
  };

  const handleImport = async (mapping, rows, headers) => {
    const animals = await base44.entities.Animals.list();
    const seasons = await base44.entities.CalvingSeasons.list();
    importMutation.mutate({ mapping, rows, headers, animals, seasons });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-0">
      <div className="bg-white rounded-t-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 shrink-0">
          <h1 className="font-heading font-black text-lg" style={{ color: PURPLE_DARK }}>
            Import Animals
          </h1>
          <button onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-gray-100">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {step === 'upload' && <StepUpload onContinue={handleUploadContinue} />}
          {step === 'preview' && (
            <StepPreview
              fileName={fileData.name}
              headers={fileData.headers}
              rows={fileData.rows}
              onContinue={() => setStep('mapping')}
            />
          )}
          {step === 'mapping' && (
            <StepMapping
              headers={fileData.headers}
              rows={fileData.rows}
              onImport={handleImport}
              importing={importMutation.isPending}
            />
          )}
          {step === 'success' && (
            <StepSuccess
              count={importMutation.data || 0}
              onClose={onClose}
              onViewSpreadsheet={() => {
                onClose();
                onSuccess?.();
              }}
            />
          )}
          {step === 'error' && <StepError error={error} onBack={() => setStep('upload')} />}
        </div>
      </div>
    </div>
  );
}