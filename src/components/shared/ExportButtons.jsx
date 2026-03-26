import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

function convertToCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]).filter(k => k !== '__v');
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ data, filename = 'export' }) {
  const exportCSV = () => {
    const csv = convertToCSV(data);
    downloadFile(csv, `${filename}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs h-9">
        <Download className="w-3.5 h-3.5 mr-1.5" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportJSON} className="text-xs h-9">
        <Download className="w-3.5 h-3.5 mr-1.5" />
        JSON
      </Button>
    </div>
  );
}