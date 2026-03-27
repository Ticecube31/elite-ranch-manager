import React, { useState, useMemo } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, getWeek } from 'date-fns';
import jsPDF from 'jspdf';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';
const GREEN_BG = '#F1F8F1';

export default function CalvingSeasonReports({ animals = [], seasons = [], pastures = [], selectedSeasonId, onBack }) {
  const [pickedSeasonId, setPickedSeasonId] = useState(selectedSeasonId);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  const selectedSeason = seasons.find(s => s.id === pickedSeasonId);

  // Get all calves in season
  const calfList = useMemo(() => {
    return animals.filter(a => 
      ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type) &&
      a.calving_season_id === pickedSeasonId
    );
  }, [animals, pickedSeasonId]);

  // Apply date range filter
  const filteredCalves = useMemo(() => {
    if (!dateRangeStart && !dateRangeEnd) return calfList;
    return calfList.filter(c => {
      if (!c.date_of_birth) return false;
      const d = new Date(c.date_of_birth);
      const start = dateRangeStart ? new Date(dateRangeStart) : new Date('2000-01-01');
      const end = dateRangeEnd ? new Date(dateRangeEnd) : new Date('2100-12-31');
      return d >= start && d <= end;
    });
  }, [calfList, dateRangeStart, dateRangeEnd]);

  // Calculate twins: mothers with 2+ calves in this season
  const twinCount = useMemo(() => {
    const motherCounts = {};
    calfList.forEach(c => {
      if (c.mother_id) {
        motherCounts[c.mother_id] = (motherCounts[c.mother_id] || 0) + 1;
      }
    });
    let count = 0;
    Object.values(motherCounts).forEach(cnt => {
      if (cnt >= 2) count += cnt; // Count all calves from multi-calf mothers
    });
    return count;
  }, [calfList]);

  // Summary stats
  const totalCalves = filteredCalves.length;
  const survived = filteredCalves.filter(c => c.status === 'Alive').length;
  const died = filteredCalves.filter(c => c.status === 'Died').length;

  // Sex breakdown
  const maleCount = filteredCalves.filter(c => c.sex === 'Male').length;
  const femaleCount = filteredCalves.filter(c => c.sex === 'Female').length;
  const sexData = [
    { name: 'Male', count: maleCount },
    { name: 'Female', count: femaleCount }
  ];

  // Weekly breakdown
  const weeklyData = useMemo(() => {
    const weekMap = {};
    filteredCalves.forEach(c => {
      if (c.date_of_birth) {
        const d = new Date(c.date_of_birth);
        const week = getWeek(d);
        const year = d.getFullYear();
        const key = `Week ${week}`;
        weekMap[key] = (weekMap[key] || 0) + 1;
      }
    });
    return Object.entries(weekMap).map(([key, count]) => ({ week: key, count })).sort();
  }, [filteredCalves]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const monthMap = {};
    filteredCalves.forEach(c => {
      if (c.date_of_birth) {
        const d = new Date(c.date_of_birth);
        const month = format(d, 'MMM');
        monthMap[month] = (monthMap[month] || 0) + 1;
      }
    });
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthOrder
      .filter(m => monthMap[m])
      .map(m => ({ month: m, count: monthMap[m] }));
  }, [filteredCalves]);

  // Location breakdown
  const locationData = useMemo(() => {
    const locMap = {};
    filteredCalves.forEach(c => {
      const locName = c.pasture_id 
        ? (pastures.find(p => p.id === c.pasture_id)?.pasture_name || 'Unknown')
        : 'Unknown Location';
      if (!locMap[locName]) {
        locMap[locName] = { alive: 0, died: 0 };
      }
      if (c.status === 'Alive') {
        locMap[locName].alive++;
      } else if (c.status === 'Died') {
        locMap[locName].died++;
      }
    });
    return Object.entries(locMap).map(([name, { alive, died }]) => ({
      location: name,
      alive,
      died,
      total: alive + died
    })).sort((a, b) => b.total - a.total);
  }, [filteredCalves, pastures]);

  const seasonLabel = selectedSeason 
    ? (selectedSeason.label || `Calving Season ${selectedSeason.year}`)
    : 'Select Season';

  // Excel export
  const handleExportExcel = () => {
    const headers = ['Calf #', 'Mother #', 'Sex', 'Date Tagged', 'Week', 'Month', 'Location', 'Status', 'Twin Flag'];
    const rows = filteredCalves.map(c => {
      const d = c.date_of_birth ? new Date(c.date_of_birth) : null;
      const week = d ? `Week ${getWeek(d)}` : '';
      const month = d ? format(d, 'MMM') : '';
      const locName = c.pasture_id 
        ? (pastures.find(p => p.id === c.pasture_id)?.pasture_name || 'Unknown')
        : 'Unknown';
      const isTwin = calfList.filter(x => x.mother_id === c.mother_id && x.mother_id).length > 1 ? 'Yes' : 'No';
      return [
        c.tag_number,
        c.mother_animal_number || '',
        c.sex,
        c.date_of_birth || '',
        week,
        month,
        locName,
        c.status,
        isTwin
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calving-report-${pickedSeasonId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 10;

    doc.setFontSize(20);
    doc.text(`${seasonLabel}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFontSize(12);
    doc.text('Season Summary', 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Total Calves Born: ${totalCalves}`, 10, y);
    y += 6;
    doc.text(`Survived: ${survived}   Died: ${died}`, 10, y);
    y += 6;
    doc.text(`Twins Detected: ${twinCount}`, 10, y);
    y += 12;

    doc.setFontSize(12);
    doc.text('Breakdown by Sex', 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Male Calves: ${maleCount}   Female Calves: ${femaleCount}`, 10, y);
    y += 12;

    doc.setFontSize(12);
    doc.text('Breakdown by Week', 10, y);
    y += 8;
    doc.setFontSize(9);
    weeklyData.forEach(w => {
      doc.text(`${w.week}: ${w.count}`, 10, y);
      y += 5;
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 10;
      }
    });
    y += 4;

    doc.setFontSize(12);
    doc.text('Breakdown by Month', 10, y);
    y += 8;
    doc.setFontSize(9);
    monthlyData.forEach(m => {
      doc.text(`${m.month}: ${m.count}`, 10, y);
      y += 5;
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 10;
      }
    });
    y += 4;

    doc.setFontSize(12);
    doc.text('Breakdown by Location', 10, y);
    y += 8;
    doc.setFontSize(9);
    locationData.forEach(loc => {
      doc.text(`${loc.location}: ${loc.total} (${loc.alive} survived, ${loc.died} died)`, 10, y);
      y += 5;
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 10;
      }
    });

    doc.save(`calving-report-${pickedSeasonId}.pdf`);
  };

  if (totalCalves === 0 && dateRangeStart === '' && dateRangeEnd === '') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: GREEN_BG }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200" style={{ background: GREEN_DARK }}>
          <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Calfing Season Reports</h1>
          <div className="w-10" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <div>
            <p className="text-4xl mb-3">📊</p>
            <p className="font-bold text-gray-700 text-lg">No calves in this season yet</p>
            <p className="text-gray-400 mt-2">Go add some calves!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-32" style={{ background: GREEN_BG }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200" style={{ background: GREEN_DARK }}>
        <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-heading font-black text-white text-lg">Calfing Season Reports</h1>
        <select
          value={pickedSeasonId || ''}
          onChange={e => { setPickedSeasonId(e.target.value); setDateRangeStart(''); setDateRangeEnd(''); }}
          className="text-white text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          {seasons.map(s => (
            <option key={s.id} value={s.id} style={{ background: '#2E7D32', color: 'white' }}>
              {s.label || `Calving Season ${s.year}`}
            </option>
          ))}
        </select>
      </div>



      {/* Date Range Picker */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-sm font-bold text-gray-700">Date Range</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={dateRangeStart}
            onChange={e => setDateRangeStart(e.target.value)}
            className="h-12 px-3 rounded-xl border-2 border-gray-200 text-sm font-medium focus:border-green-400 focus:outline-none"
          />
          <input
            type="date"
            value={dateRangeEnd}
            onChange={e => setDateRangeEnd(e.target.value)}
            className="h-12 px-3 rounded-xl border-2 border-gray-200 text-sm font-medium focus:border-green-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Reports Cards */}
      <div className="px-5 py-6 space-y-6">

        {/* 1. Season Summary Card */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ background: '#E8F5E9' }}>
            <p className="font-heading font-bold text-lg text-gray-800">Season Summary</p>
          </div>
          <div className="px-6 py-8 space-y-6">
            <div>
              <p className="text-sm text-gray-500 font-semibold mb-1">Total Calves Born</p>
              <p className="font-heading font-black text-5xl" style={{ color: GREEN_DARK }}>{totalCalves}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-semibold mb-1">Survived</p>
                <p className="font-heading font-black text-4xl text-green-600">{survived}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold mb-1">Died</p>
                <p className="font-heading font-black text-4xl text-red-600">{died}</p>
              </div>
            </div>
            <div className="pt-4 border-t-2 border-green-100">
              <p className="font-heading font-black text-4xl mb-2" style={{ color: GREEN_DARK }}>{twinCount}</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Twins are automatically counted when the same mother has 2 or more calves in this exact calving season
              </p>
            </div>
          </div>
        </div>

        {/* 2. Breakdown by Sex Card */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ background: '#E8F5E9' }}>
            <p className="font-heading font-bold text-lg text-gray-800">Breakdown by Sex</p>
          </div>
          <div className="px-6 py-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-2xl p-5 text-center">
                <p className="text-sm text-gray-500 font-semibold mb-2">Male Calves</p>
                <p className="font-heading font-black text-4xl text-blue-600">{maleCount}</p>
              </div>
              <div className="bg-pink-50 rounded-2xl p-5 text-center">
                <p className="text-sm text-gray-500 font-semibold mb-2">Female Calves</p>
                <p className="font-heading font-black text-4xl text-pink-600">{femaleCount}</p>
              </div>
            </div>
            {totalCalves > 0 && (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={sexData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={GREEN} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 3. Breakdown by Time Card */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ background: '#E8F5E9' }}>
            <p className="font-heading font-bold text-lg text-gray-800">Breakdown by Time</p>
          </div>
          <div className="px-6 py-8 space-y-8">
            {weeklyData.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-4">By Week</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={GREEN} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {monthlyData.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-4">By Month</p>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={GREEN} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* 4. Breakdown by Location Card */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4" style={{ background: '#E8F5E9' }}>
            <p className="font-heading font-bold text-lg text-gray-800">Breakdown by Location</p>
          </div>
          <div className="px-6 py-8">
            {locationData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No location data available</p>
            ) : (
              <div className="space-y-3">
                {locationData.map((loc, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-gray-800">{loc.location}</p>
                      <p className="font-bold" style={{ color: GREEN_DARK }}>{loc.total} calves</p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600">✓ {loc.alive} survived</span>
                      <span className="text-red-600">✕ {loc.died} died</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 space-y-3 bg-white border-t border-green-100 safe-bottom">
        <button
          onClick={handleExportExcel}
          className="w-full h-14 rounded-2xl font-heading font-black text-base text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
        >
          <Download className="w-5 h-5" /> Download Excel Report
        </button>
        <button
          onClick={handleExportPDF}
          className="w-full h-14 rounded-2xl font-heading font-black text-base text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
        >
          <Download className="w-5 h-5" /> Download PDF Summary
        </button>
      </div>

    </div>
  );
}