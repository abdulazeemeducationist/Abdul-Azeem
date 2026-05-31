import { useState, useRef, useCallback } from "react";
import { ChevronRight, Upload, Download, CheckCircle2, XCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "@/lib/auth";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let inQuote = false;
  let field = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuote && next === '"') { field += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      row.push(field); field = "";
    } else if ((ch === '\n' || (ch === '\r' && next === '\n')) && !inQuote) {
      if (ch === '\r') i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else if (ch === '\r' && !inQuote) {
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(f => f.trim()));
}

const HEADERS = [
  "topicId", "questionType", "questionText",
  "optionA", "optionB", "optionC", "optionD",
  "correctAnswers", "explanation", "difficulty", "marks",
  "numericAnswer", "numericUnit", "tolerance", "allowedDecimalPrecision",
  "dropdownOptions", "dropdownCorrectAnswer",
];

const TEMPLATE_CSV = `topicId,questionType,questionText,optionA,optionB,optionC,optionD,correctAnswers,explanation,difficulty,marks,numericAnswer,numericUnit,tolerance,allowedDecimalPrecision,dropdownOptions,dropdownCorrectAnswer
1,single,"What is 2 + 2?","1","2","4","5",C,"2 + 2 = 4 by basic arithmetic.",easy,1,,,,,,
1,multiple,"Which of the following are even numbers?","2","3","4","7","A,C","2 and 4 are even numbers.",easy,2,,,,,,
1,fill_blank,"Enter the value of π to 2 decimal places.",,,,,,"π ≈ 3.14",medium,1,3.14,,0.005,2,,
1,dropdown,"Which of these is a current asset?",,,,,,"Cash is a current asset — it is short-term and liquid.",medium,1,,,,,,"Cash|Land|Building|Goodwill","Cash"
`;

type RowStatus = "valid" | "error";

interface ParsedRow {
  line: number;
  topicId: number;
  questionType: string;
  questionText: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswers: string[];
  explanation: string;
  difficulty: string;
  marks: number;
  numericAnswer?: number;
  numericUnit?: string;
  tolerance?: number;
  allowedDecimalPrecision?: number;
  dropdownOptions?: string;
  dropdownCorrectAnswer?: string;
  status: RowStatus;
  errors: string[];
}

function validateRow(raw: Record<string, string>, lineNum: number): ParsedRow {
  const errors: string[] = [];

  const topicId = parseInt(raw.topicId ?? "");
  if (!topicId || isNaN(topicId)) errors.push("topicId must be a valid number");

  const qType = (raw.questionType ?? "").trim().toLowerCase();
  const VALID_TYPES = ["single", "multiple", "fill_blank", "dropdown"];
  if (!VALID_TYPES.includes(qType)) errors.push(`questionType must be: ${VALID_TYPES.join(" | ")}`);

  const questionText = (raw.questionText ?? "").trim();
  if (!questionText) errors.push("questionText is required");

  const explanation = (raw.explanation ?? "").trim();
  if (!explanation) errors.push("explanation is required");

  const diffRaw = (raw.difficulty ?? "medium").trim().toLowerCase();
  const difficulty = ["easy", "medium", "hard"].includes(diffRaw) ? diffRaw : "medium";
  if (!["easy", "medium", "hard"].includes(diffRaw)) errors.push("difficulty must be easy, medium, or hard");

  const marks = Math.max(1, parseInt(raw.marks ?? "1") || 1);
  let correctAnswers: string[] = [];

  if (qType === "single" || qType === "multiple") {
    if (!(raw.optionA ?? "").trim() || !(raw.optionB ?? "").trim())
      errors.push("optionA and optionB are required for MCQ/MRQ types");
    correctAnswers = (raw.correctAnswers ?? "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    if (!correctAnswers.length) errors.push("correctAnswers is required (e.g. C or A,C)");
    if (qType === "single" && correctAnswers.length > 1) errors.push("Single choice must have exactly 1 correct answer");
    if (correctAnswers.some(a => !["A","B","C","D"].includes(a))) errors.push("correctAnswers must use A, B, C, or D");
  }

  let numericAnswer: number | undefined;
  if (qType === "fill_blank") {
    const na = parseFloat(raw.numericAnswer ?? "");
    if (isNaN(na)) errors.push("numericAnswer must be a number for fill_blank type");
    else numericAnswer = na;
  }

  let dropdownOptions: string | undefined;
  let dropdownCorrectAnswer: string | undefined;
  if (qType === "dropdown") {
    const opts = (raw.dropdownOptions ?? "").trim();
    const correct = (raw.dropdownCorrectAnswer ?? "").trim();
    const optList = opts.split("|").map(o => o.trim()).filter(Boolean);
    if (optList.length < 2) errors.push("dropdownOptions requires ≥2 options separated by |");
    if (!correct) errors.push("dropdownCorrectAnswer is required");
    else if (!optList.includes(correct)) errors.push("dropdownCorrectAnswer must exactly match one of the dropdownOptions");
    dropdownOptions = opts;
    dropdownCorrectAnswer = correct;
  }

  return {
    line: lineNum,
    topicId: topicId || 0,
    questionType: qType,
    questionText, explanation, difficulty, marks, correctAnswers,
    optionA: (raw.optionA ?? "").trim(),
    optionB: (raw.optionB ?? "").trim(),
    optionC: (raw.optionC ?? "").trim(),
    optionD: (raw.optionD ?? "").trim(),
    numericAnswer,
    numericUnit: (raw.numericUnit ?? "").trim() || undefined,
    tolerance: raw.tolerance ? parseFloat(raw.tolerance) : undefined,
    allowedDecimalPrecision: raw.allowedDecimalPrecision ? parseInt(raw.allowedDecimalPrecision) : undefined,
    dropdownOptions,
    dropdownCorrectAnswer,
    status: errors.length > 0 ? "error" : "valid",
    errors,
  };
}

const TYPE_BADGE: Record<string, string> = {
  single: "bg-blue-100 text-blue-700",
  multiple: "bg-purple-100 text-purple-700",
  fill_blank: "bg-amber-100 text-amber-700",
  dropdown: "bg-green-100 text-green-700",
};
const TYPE_LABEL: Record<string, string> = {
  single: "Single", multiple: "Multiple", fill_blank: "Fill Blank", dropdown: "Dropdown",
};
const DIFF_BADGE: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

export default function ImportQuestionsPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mcq_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Only .csv files are supported", variant: "destructive" }); return;
    }
    setFileName(file.name); setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const allRows = parseCSV(text);
      if (allRows.length < 2) { toast({ title: "No data rows found in CSV", variant: "destructive" }); return; }
      const headers = allRows[0].map(h => h.trim());
      const dataRows = allRows.slice(1);
      const parsed = dataRows.map((row, i) => {
        const obj: Record<string, string> = {};
        HEADERS.forEach(h => {
          const idx = headers.findIndex(header => header.toLowerCase() === h.toLowerCase());
          obj[h] = idx >= 0 ? (row[idx] ?? "") : "";
        });
        return validateRow(obj, i + 2);
      });
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  async function handleImport() {
    const valid = rows.filter(r => r.status === "valid");
    if (!valid.length) return;
    setImporting(true);
    const auth = getAuth();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;

    let success = 0, failed = 0;

    for (const row of valid) {
      try {
        const payload: Record<string, unknown> = {
          topicId: row.topicId,
          questionText: row.questionText,
          questionType: row.questionType,
          explanation: row.explanation,
          difficulty: row.difficulty,
          marks: row.marks,
          optionA: row.optionA || "",
          optionB: row.optionB || "",
          optionC: row.optionC || "",
          optionD: row.optionD || "",
          correctAnswers: row.correctAnswers,
        };
        if (row.questionType === "fill_blank") {
          payload.numericAnswer = row.numericAnswer;
          payload.numericUnit = row.numericUnit;
          payload.tolerance = row.tolerance;
          payload.allowedDecimalPrecision = row.allowedDecimalPrecision;
        }
        if (row.questionType === "dropdown") {
          payload.dropdownOptions = JSON.stringify(
            (row.dropdownOptions ?? "").split("|").map(o => o.trim()).filter(Boolean)
          );
          payload.dropdownCorrectAnswer = row.dropdownCorrectAnswer;
        }
        const res = await fetch("/api/admin/questions", { method: "POST", headers, body: JSON.stringify(payload) });
        if (res.ok) success++; else failed++;
      } catch { failed++; }
    }

    setImporting(false);
    setImportResult({ success, failed });
    if (success > 0) {
      setRows(prev => prev.map(r => r.status === "valid" ? { ...r, status: "valid" } : r));
    }
    toast({
      title: failed === 0
        ? `✓ ${success} question${success !== 1 ? "s" : ""} imported successfully`
        : `${success} imported, ${failed} failed`,
      variant: failed > 0 ? "destructive" : "default",
    });
  }

  const validCount = rows.filter(r => r.status === "valid").length;
  const errorCount = rows.filter(r => r.status === "error").length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-16">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-3">
            <span>Programs</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">Import Questions</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Import Questions</h1>
              <p className="text-sm text-slate-500 mt-1">Bulk-import questions from a CSV file across multiple question types</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4 text-blue-500" />
              Download Template
            </button>
          </div>
        </div>

        {/* Format guide */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 text-sm mb-3">Supported Question Types</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { type: "single", label: "Single Choice", hint: "optionA–D · correctAnswers: C" },
              { type: "multiple", label: "Multiple Response", hint: "optionA–D · correctAnswers: A,C" },
              { type: "fill_blank", label: "Fill in the Blank", hint: "numericAnswer: 3.14 · tolerance: 0.005 · numericUnit (optional)" },
              { type: "dropdown", label: "Dropdown", hint: "dropdownOptions: A|B|C · dropdownCorrectAnswer: B" },
            ].map(({ type, label, hint }) => (
              <div key={type} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1.5 ${TYPE_BADGE[type]}`}>{type}</span>
                <p className="font-semibold text-slate-700 text-xs">{label}</p>
                <p className="text-slate-500 mt-0.5">{hint}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            <span className="font-medium text-slate-500">topicId</span> must be the numeric ID of an existing topic in your database.
            Matching Grid questions cannot be imported via CSV — use the question form instead.
          </p>
        </div>

        {/* Upload zone */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 text-sm mb-4">Upload CSV</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-14 cursor-pointer select-none transition-colors ${
              dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/60"
            }`}
          >
            <Upload className={`w-10 h-10 transition-colors ${dragging ? "text-blue-500" : "text-slate-300"}`} />
            {fileName ? (
              <div className="text-center">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="w-4 h-4 text-blue-500" />
                  {fileName}
                </div>
                <p className="text-xs text-slate-400 mt-1">Click or drop to replace</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">Drop CSV file here or <span className="text-blue-600 underline">browse</span></p>
                <p className="text-xs text-slate-400 mt-1">.csv files only</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
          />
        </div>

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">
                  Preview — {rows.length} row{rows.length !== 1 ? "s" : ""}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-emerald-600 font-semibold">{validCount} valid</span>
                  {errorCount > 0 && <> · <span className="text-red-500 font-semibold">{errorCount} with errors</span></>}
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import {validCount} Question{validCount !== 1 ? "s" : ""}</>
                }
              </button>
            </div>

            {importResult && (
              <div className={`px-5 py-3 flex items-center gap-2 text-sm font-medium border-b ${
                importResult.failed === 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}>
                {importResult.failed === 0
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />}
                {importResult.success} imported successfully
                {importResult.failed > 0 && `, ${importResult.failed} failed — check the API server logs for details`}.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium w-10">#</th>
                    <th className="text-left px-4 py-3 font-medium w-12"></th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Topic ID</th>
                    <th className="text-left px-4 py-3 font-medium">Question</th>
                    <th className="text-left px-4 py-3 font-medium">Difficulty</th>
                    <th className="text-left px-4 py-3 font-medium">Marks</th>
                    <th className="text-left px-4 py-3 font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(row => (
                    <tr key={row.line} className={row.status === "error" ? "bg-red-50/40" : "hover:bg-slate-50/50"}>
                      <td className="px-4 py-3 text-slate-400 font-mono">{row.line}</td>
                      <td className="px-4 py-3">
                        {row.status === "valid"
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <XCircle className="w-4 h-4 text-red-500" />}
                      </td>
                      <td className="px-4 py-3">
                        {row.questionType
                          ? <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[row.questionType] ?? "bg-slate-100 text-slate-600"}`}>
                              {TYPE_LABEL[row.questionType] ?? row.questionType}
                            </span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{row.topicId || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {row.questionText
                          ? <span className="text-slate-700 line-clamp-2">{row.questionText}</span>
                          : <span className="text-slate-300 italic">empty</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[row.difficulty] ?? "bg-slate-100 text-slate-500"}`}>
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.marks}</td>
                      <td className="px-4 py-3">
                        {row.errors.length > 0
                          ? <ul className="space-y-0.5">{row.errors.map((e, i) => <li key={i} className="text-red-600">{e}</li>)}</ul>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
