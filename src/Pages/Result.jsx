import React, { useState, useEffect, useCallback, useContext } from 'react';
import { LuBookText, LuTrophy, LuAward, LuStar, LuTrendingUp, LuDownload, LuRefreshCw, LuAlertCircle } from 'react-icons/lu';
import { SelectedStudentContext } from '../contexts/SelectedStudentContext';
import {
  getResultSummary,
  getSubjectResults,
  getGradeSummary,
  getTermProgress,
  getAssessmentBreakdown,
} from '../services/results.services';
import axios from 'axios';
import { API_BASE_URL } from '../services/auth.services';

// ─── Constants ───────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  'A+': { bg: 'bg-green-500', text: 'text-white' },
  'A':  { bg: 'bg-green-400', text: 'text-white' },
  'B+': { bg: 'bg-blue-500',  text: 'text-white' },
  'B':  { bg: 'bg-blue-400',  text: 'text-white' },
  'C+': { bg: 'bg-yellow-500', text: 'text-white' },
  'C':  { bg: 'bg-yellow-400', text: 'text-white' },
  'D+': { bg: 'bg-orange-500', text: 'text-white' },
  'D':  { bg: 'bg-orange-400', text: 'text-white' },
  'E':  { bg: 'bg-red-400',   text: 'text-white' },
  'F':  { bg: 'bg-red-600',   text: 'text-white' },
};

const GRADE_LEGEND = [
  { grade: 'A+', range: '90–100', label: 'Excellent' },
  { grade: 'A',  range: '80–89',  label: 'Very Good' },
  { grade: 'B+', range: '75–79',  label: 'Good' },
  { grade: 'B',  range: '70–74',  label: 'Above Average' },
  { grade: 'C+', range: '65–69',  label: 'Average' },
  { grade: 'C',  range: '60–64',  label: 'Below Average' },
  { grade: 'D+', range: '55–59',  label: 'Fair' },
  { grade: 'D',  range: '50–54',  label: 'Poor' },
  { grade: 'E',  range: '45–49',  label: 'Very Poor' },
  { grade: 'F',  range: '0–44',   label: 'Fail' },
];

const TABS = ['Subject Results', 'Grade Summary', 'Term Progress', 'Assessment Breakdown'];

const ordinal = (n) => {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradeBadge({ grade }) {
  const colors = GRADE_COLORS[grade] || { bg: 'bg-gray-400', text: 'text-white' };
  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-bold min-w-[36px] ${colors.bg} ${colors.text}`}>
      {grade || '—'}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 flex-1 min-w-[140px]">
      <div className={`p-2 rounded-lg ${accent}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-base font-bold text-gray-800 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function ResultsLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-20 flex-1 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-10 bg-gray-200 rounded-lg w-96" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );
}

function EmptyResultsState({ termSelected }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <LuBookText className="text-5xl text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">No results available yet</h3>
      <p className="text-sm text-gray-400 max-w-sm">
        {termSelected
          ? "Your child's results have not been published for this term."
          : 'Select an academic year and term to view results.'}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <LuAlertCircle className="text-4xl text-red-400 mb-3" />
      <h3 className="text-base font-semibold text-gray-700 mb-1">Failed to load results</h3>
      <p className="text-sm text-gray-400 mb-4">Something went wrong. Please try again.</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white text-sm rounded-lg hover:bg-[#002244] transition"
      >
        <LuRefreshCw size={14} /> Try Again
      </button>
    </div>
  );
}

// ─── Tab: Subject Results ─────────────────────────────────────────────────────

function SubjectResultsTab({ subjects, summary }) {
  if (!subjects?.length) return <EmptyResultsState termSelected />;

  const hasWeighted = subjects.some((s) => s.testScoreRaw !== null);

  const totalRaw = subjects.reduce((acc, s) => acc + (s.cumulativeScore || 0), 0);
  const totalMax = subjects.reduce((acc, s) => acc + (s.maxScore || 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Subject</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Test Score (30%)</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Exam Score (70%)</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Total Score (100%)</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Grade</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Remark</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                <LuBookText className="text-gray-400 shrink-0" />
                {s.subjectName}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {hasWeighted && s.testScoreRaw !== null
                  ? <>{s.testScoreRaw} <span className="text-gray-400">({s.testScoreWeighted?.toFixed(2)})</span></>
                  : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {hasWeighted && s.examScoreRaw !== null
                  ? <>{s.examScoreRaw} <span className="text-gray-400">({s.examScoreWeighted?.toFixed(2)})</span></>
                  : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 font-semibold text-gray-800">{s.totalScore?.toFixed(2)}%</td>
              <td className="px-4 py-3"><GradeBadge grade={s.grade} /></td>
              <td className="px-4 py-3 text-gray-600">{s.remark}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td className="px-4 py-3 text-gray-800">Total</td>
            <td className="px-4 py-3 text-gray-500">—</td>
            <td className="px-4 py-3 text-gray-500">—</td>
            <td className="px-4 py-3 text-gray-800">
              {totalMax > 0
                ? `${totalRaw} / ${totalMax} (${((totalRaw / totalMax) * 100).toFixed(2)}%)`
                : '—'}
            </td>
            <td className="px-4 py-3"><GradeBadge grade={summary?.overallGrade} /></td>
            <td className="px-4 py-3 text-gray-600">{summary?.gradeRemark || '—'}</td>
          </tr>
        </tfoot>
      </table>
      {hasWeighted && (
        <p className="text-xs text-gray-400 mt-3 px-4 flex items-center gap-1">
          <LuAlertCircle size={12} /> Figures in brackets are weighted scores
        </p>
      )}
    </div>
  );
}

// ─── Tab: Grade Summary ───────────────────────────────────────────────────────

function GradeSummaryTab({ gradeSummary }) {
  if (!gradeSummary) return <EmptyResultsState termSelected />;

  const { distribution, strengths, improvementAreas } = gradeSummary;

  const gradeOrder = [
    { key: 'APlus', label: 'A+', color: 'bg-green-500' },
    { key: 'A',     label: 'A',  color: 'bg-green-400' },
    { key: 'BPlus', label: 'B+', color: 'bg-blue-500' },
    { key: 'B',     label: 'B',  color: 'bg-blue-400' },
    { key: 'CPlus', label: 'C+', color: 'bg-yellow-500' },
    { key: 'C',     label: 'C',  color: 'bg-yellow-400' },
    { key: 'DPlus', label: 'D+', color: 'bg-orange-500' },
    { key: 'D',     label: 'D',  color: 'bg-orange-400' },
    { key: 'E',     label: 'E',  color: 'bg-red-400' },
    { key: 'F',     label: 'F',  color: 'bg-red-600' },
  ];

  const total = Object.values(distribution || {}).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Grade Distribution</h3>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
          {gradeOrder.map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white font-bold text-sm`}>
                {distribution?.[key] || 0}
              </div>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-4 h-3 rounded-full bg-gray-100 overflow-hidden flex">
            {gradeOrder.map(({ key, color }) => {
              const count = distribution?.[key] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return pct > 0 ? (
                <div key={key} className={`${color} h-full`} style={{ width: `${pct}%` }} title={`${key}: ${count}`} />
              ) : null;
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
            <LuTrophy size={14} /> Strengths
          </h3>
          {strengths?.length > 0 ? (
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-green-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-600 opacity-60">No outstanding subjects this term.</p>
          )}
        </div>

        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
            <LuTrendingUp size={14} /> Needs Improvement
          </h3>
          {improvementAreas?.length > 0 ? (
            <ul className="space-y-1">
              {improvementAreas.map((s, i) => (
                <li key={i} className="text-sm text-orange-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-orange-600 opacity-60">No subjects need improvement.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Term Progress ───────────────────────────────────────────────────────

function TermProgressTab({ termProgress }) {
  if (!termProgress?.courseProgress?.length) return <EmptyResultsState termSelected />;

  const { courseProgress } = termProgress;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Course Performance vs Class Average</h3>
      <div className="space-y-3">
        {courseProgress.map((course, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LuBookText className="text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-800">{course.subjectName}</span>
                <GradeBadge grade={course.grade} />
              </div>
              <span className="text-sm font-bold text-gray-700">{course.percentage?.toFixed(1)}%</span>
            </div>
            <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-[#003366] rounded-full transition-all"
                style={{ width: `${Math.min(course.percentage, 100)}%` }}
              />
              {course.classAverage !== null && (
                <div
                  className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5 bg-orange-400"
                  style={{ left: `${Math.min(course.classAverage, 100)}%` }}
                  title={`Class avg: ${course.classAverage?.toFixed(1)}%`}
                />
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{course.remark}</span>
              {course.classAverage !== null && (
                <span className="text-xs text-orange-500">Class avg: {course.classAverage?.toFixed(1)}%</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded bg-[#003366]" /> Student score
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-4 bg-orange-400" /> Class average
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Assessment Breakdown ────────────────────────────────────────────────

function AssessmentBreakdownTab({ breakdown }) {
  if (!breakdown?.length) return <EmptyResultsState termSelected />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Assessment</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Subject</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Score</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Max</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">%</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Grade</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Recorded By</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-medium text-gray-800">{row.assessmentName}</td>
              <td className="px-4 py-3 text-gray-600">{row.subjectName}</td>
              <td className="px-4 py-3 text-gray-600">{row.actualScore}</td>
              <td className="px-4 py-3 text-gray-600">{row.maxScore}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{row.percentage?.toFixed(1)}%</td>
              <td className="px-4 py-3"><GradeBadge grade={row.grade} /></td>
              <td className="px-4 py-3 text-gray-500">{row.recordedBy || '—'}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {row.dateRecorded ? new Date(row.dateRecorded).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function GradeLegendCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Grade Legend</h3>
      <div className="space-y-1.5">
        {GRADE_LEGEND.map(({ grade, range, label }) => (
          <div key={grade} className="flex items-center gap-2 text-xs">
            <GradeBadge grade={grade} />
            <span className="text-gray-500 w-14">{range}</span>
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceSummaryCard({ summary, subjects }) {
  if (!summary) return null;

  const totalRaw = subjects?.reduce((acc, s) => acc + (s.cumulativeScore || 0), 0) ?? 0;
  const totalMax = subjects?.reduce((acc, s) => acc + (s.maxScore || 0), 0) ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance Summary</h3>
      <div className="space-y-2 text-sm">
        {[
          { label: 'Total Score', value: totalMax > 0 ? `${totalRaw} / ${totalMax}` : '—' },
          { label: 'Percentage', value: summary.overallAverage != null ? `${summary.overallAverage?.toFixed(2)}%` : '—' },
          { label: 'Grade', value: summary.overallGrade || '—' },
          { label: 'Class Position', value: summary.classPosition != null ? ordinal(summary.classPosition) : '—' },
          { label: 'Class Average', value: summary.classAverage != null ? `${summary.classAverage?.toFixed(2)}%` : '—' },
          { label: 'Students in Class', value: summary.totalStudents ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CSV Download ─────────────────────────────────────────────────────────────

function downloadCSV(subjects, summary) {
  if (!subjects?.length) return;
  const header = ['Subject', 'Test Score (30%)', 'Exam Score (70%)', 'Total Score (%)', 'Grade', 'Remark'];
  const rows = subjects.map((s) => [
    s.subjectName,
    s.testScoreRaw ?? '—',
    s.examScoreRaw ?? '—',
    s.totalScore?.toFixed(2) ?? '—',
    s.grade,
    s.remark,
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `results-${summary?.student?.fullName || 'student'}.csv`;
  link.click();
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function Result() {
  const { selectedStudent } = useContext(SelectedStudentContext) || {};

  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  const [summary, setSummary]       = useState(null);
  const [subjects, setSubjects]     = useState([]);
  const [gradeSummary, setGradeSummary] = useState(null);
  const [termProgress, setTermProgress] = useState(null);
  const [breakdown, setBreakdown]   = useState([]);

  const [activeTab, setActiveTab]   = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [downloading, setDownloading] = useState(false);

  const studentId = selectedStudent?.childId || selectedStudent?._id;

  // Fetch terms for this school
  useEffect(() => {
    const schoolId = localStorage.getItem('school_id');
    if (!schoolId) return;
    const token = localStorage.getItem('access_token');
    axios
      .get(`${API_BASE_URL}/academic-year-term/terms/school/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setTerms(list);
        const current = list.find((t) => t.isCurrent) || list[0];
        if (current) setSelectedTermId(current._id);
      })
      .catch(() => {});
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    const params = selectedTermId ? { termId: selectedTermId } : {};
    try {
      const [s, subj, gs, tp, bd] = await Promise.all([
        getResultSummary(studentId, params),
        getSubjectResults(studentId, params),
        getGradeSummary(studentId, params),
        getTermProgress(studentId, params),
        getAssessmentBreakdown(studentId, params),
      ]);
      setSummary(s);
      setSubjects(Array.isArray(subj) ? subj : []);
      setGradeSummary(gs);
      setTermProgress(tp);
      setBreakdown(Array.isArray(bd) ? bd : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedTermId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      downloadCSV(subjects, summary);
    } finally {
      setDownloading(false);
    }
  };

  if (!studentId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LuAlertCircle className="text-4xl text-gray-300 mb-3" />
        <p className="text-gray-500">Please select a child to view their results.</p>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Results</h1>
          <p className="text-sm text-gray-400 mt-0.5">View your child's academic performance and progress.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || !subjects.length}
          className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white text-sm font-medium rounded-lg hover:bg-[#002244] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <LuDownload size={15} />
          {downloading ? 'Downloading...' : 'Download Term Report'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={selectedTermId}
          onChange={(e) => setSelectedTermId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
        >
          <option value="">All Terms</option>
          {terms.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} {t.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>

        {summary?.student?.className && (
          <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-white">
            {summary.student.className}
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading ? (
        <ResultsLoadingSkeleton />
      ) : error ? (
        <ErrorState onRetry={fetchAllData} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="flex flex-wrap gap-3 mb-6">
            <KpiCard
              icon={<span className="text-blue-500 text-lg font-bold">%</span>}
              label="Overall Average"
              value={summary?.overallAverage != null ? `${summary.overallAverage?.toFixed(2)}%` : '—'}
              sub={summary?.gradeRemark}
              accent="bg-blue-50"
            />
            <KpiCard
              icon={<LuTrophy className="text-yellow-500" size={18} />}
              label="Class Position"
              value={summary?.classPosition != null
                ? `${ordinal(summary.classPosition)} / ${summary.totalStudents ?? '?'}`
                : '—'}
              sub={summary?.classPosition && summary?.totalStudents
                ? `Top ${((summary.classPosition / summary.totalStudents) * 100).toFixed(1)}%`
                : null}
              accent="bg-yellow-50"
            />
            <KpiCard
              icon={<LuBookText className="text-purple-500" size={18} />}
              label="Total Subjects"
              value={summary?.totalSubjects ?? '—'}
              sub="All Graded"
              accent="bg-purple-50"
            />
            <KpiCard
              icon={<LuStar className="text-orange-500" size={18} />}
              label="Highest Subject"
              value={summary?.highestSubject?.name || '—'}
              sub={summary?.highestSubject?.percentage != null
                ? `${summary.highestSubject.percentage?.toFixed(2)}%`
                : null}
              accent="bg-orange-50"
            />
            <KpiCard
              icon={<LuAward className="text-green-500" size={18} />}
              label="Assessments Completed"
              value={summary?.assessmentsCompleted != null
                ? `${summary.assessmentsCompleted} / ${summary.totalAssessments}`
                : '—'}
              sub={summary?.assessmentsCompleted === summary?.totalAssessments && summary?.totalAssessments > 0 ? '100%' : null}
              accent="bg-green-50"
            />
          </div>

          {/* Tabs + Content + Sidebar */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Main content */}
            <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {TABS.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                      activeTab === i
                        ? 'border-[#003366] text-[#003366]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-4">
                {subjects.length === 0 && !loading ? (
                  <EmptyResultsState termSelected={!!selectedTermId} />
                ) : (
                  <>
                    {activeTab === 0 && <SubjectResultsTab subjects={subjects} summary={summary} />}
                    {activeTab === 1 && <GradeSummaryTab gradeSummary={gradeSummary} />}
                    {activeTab === 2 && <TermProgressTab termProgress={termProgress} />}
                    {activeTab === 3 && <AssessmentBreakdownTab breakdown={breakdown} />}
                  </>
                )}
              </div>

              {/* Info notice */}
              <div className="px-6 py-3 border-t border-gray-50 bg-gray-50">
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <LuAlertCircle size={12} />
                  Scores are calculated based on test and exam assessment weights. For more details, click on any subject or download the full term report.
                </p>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="lg:w-64 flex flex-col gap-4">
              <GradeLegendCard />
              <PerformanceSummaryCard summary={summary} subjects={subjects} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Result;
