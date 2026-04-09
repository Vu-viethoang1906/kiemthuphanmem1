import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, ClipboardList, Copy, FileSpreadsheet, FileText } from 'lucide-react';
import { fetchMyBoards } from '../../api/boardApi';
import { exportReport, downloadExportFile, ExportReportParams } from '../../api/exportApi';

interface Board {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
}

const isValidObjectId = (value?: string) => /^[a-f\d]{24}$/i.test(String(value || '').trim());

const reportTypeLabel: Record<ExportReportParams['report_type'], string> = {
  dashboard: 'Dashboard Overview',
  velocity: 'Velocity & Throughput',
  leaderboard: 'Leaderboard Performance',
  center_comparison: 'Center Comparison',
};

const parseEmails = (value: string) =>
  value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const ShareReports: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [reportType, setReportType] = useState<ExportReportParams['report_type']>('dashboard');
  const [format, setFormat] = useState<ExportReportParams['format']>('pdf');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const boardsRes = await fetchMyBoards({ limit: 200 });
        let list: any[] = [];
        if (Array.isArray(boardsRes?.data)) list = boardsRes.data;
        else if (Array.isArray((boardsRes as any)?.data?.data)) list = (boardsRes as any).data.data;
        else if (Array.isArray((boardsRes as any)?.boards)) list = (boardsRes as any).boards;
        else if (Array.isArray(boardsRes as any)) list = boardsRes as any;

        const validBoards = list
          .filter((b) => b && (b._id || b.id))
          .map((b) => ({ ...b, _id: String(b._id || b.id || '') }))
          .filter((b) => isValidObjectId(b._id));
        setBoards(validBoards);
        if (validBoards.length > 0) setSelectedBoardId(validBoards[0]._id || '');

        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to load boards');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedBoardId && boards.length > 0) {
      const fallbackId = String(boards[0]._id || boards[0].id || '');
      if (isValidObjectId(fallbackId)) {
        setSelectedBoardId(fallbackId);
      }
    }
  }, [boards, selectedBoardId]);

  const selectedBoardName = useMemo(() => {
    const board = boards.find((b) => (b._id || b.id) === selectedBoardId);
    return board?.title || board?.name || 'Unknown Board';
  }, [boards, selectedBoardId]);

  const summaryText = useMemo(() => {
    return [
      'REPORT SUMMARY',
      '',
      `Board: ${selectedBoardName}`,
      `Report type: ${reportTypeLabel[reportType]}`,
      `Date range: ${startDate || 'N/A'} -> ${endDate || 'N/A'}`,
      `Generated at: ${new Date().toLocaleString('vi-VN')}`,
    ].join('\n');
  }, [selectedBoardName, reportType, startDate, endDate]);

  const hasInvalidDateRange = !!startDate && !!endDate && startDate > endDate;

  const doExport = async () => {
    if (!selectedBoardId) {
      toast.error('Please select a board');
      return;
    }
    if (!isValidObjectId(selectedBoardId)) {
      toast.error('Selected board is invalid. Please reselect board.');
      return;
    }
    if (hasInvalidDateRange) {
      toast.error('Start date must be before end date');
      return;
    }

    setExporting(true);
    try {
      const params: ExportReportParams = {
        report_type: reportType,
        format,
        board_id: selectedBoardId,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const res = await exportReport(params);
      if (!res?.success || !res?.data?.filename) {
        toast.error(res?.message || 'Export failed');
        return;
      }

      const blob = await downloadExportFile(res.data.filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = res.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format.toUpperCase()} report`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to export report');
    } finally {
      setExporting(false);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('Summary copied');
    } catch {
      toast.error('Cannot copy summary');
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600 dark:text-slate-300">Loading report workspace...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Share Reports Studio</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Generate and export clear reports quickly in PDF or Excel format.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Report Setup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Board</label>
              <select
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              >
                <option value="">Select board...</option>
                {boards.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.title || b.name || 'Untitled Board'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ExportReportParams['report_type'])}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              >
                <option value="dashboard">{reportTypeLabel.dashboard}</option>
                <option value="velocity">{reportTypeLabel.velocity}</option>
                <option value="leaderboard">{reportTypeLabel.leaderboard}</option>
                <option value="center_comparison">{reportTypeLabel.center_comparison}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Attachment Format</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormat('pdf')}
                className={`px-3 py-2 rounded-lg text-sm border ${format === 'pdf' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}
              >
                PDF
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`px-3 py-2 rounded-lg text-sm border ${format === 'excel' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300'}`}
              >
                Excel
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Current Package</h3>
          <div className="text-sm text-gray-700 dark:text-slate-300 space-y-2">
            <p><span className="font-semibold">Board:</span> {selectedBoardName}</p>
            <p><span className="font-semibold">Type:</span> {reportTypeLabel[reportType]}</p>
            <p><span className="font-semibold">Date:</span> {startDate || '-'} {'->'} {endDate || '-'}</p>
            <p><span className="font-semibold">Format:</span> {format.toUpperCase()}</p>
          </div>
          {hasInvalidDateRange && (
            <p className="text-xs text-red-600">Start date must be before end date.</p>
          )}
        </section>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={doExport}
            disabled={exporting}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            {format === 'pdf' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Report
          </button>
          <button
            onClick={copySummary}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-semibold flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareReports;

