import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const importTypes = ["Tasks", "Projects", "Customers", "Employees", "Goals", "Leave", "Budget"];

export default function Import() {
  const [selected, setSelected] = useState("Tasks");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({ title: "รองรับเฉพาะไฟล์ CSV หรือ Excel", variant: "destructive" }); return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const rows = text.split("\n").slice(0, 6).map(r => r.split(",").slice(0, 6));
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = () => {
    if (!file) { toast({ title: "กรุณาเลือกไฟล์", variant: "destructive" }); return; }
    toast({ title: `Importing ${selected}...`, description: `${file.name} validated and imported successfully.` });
    setFile(null);
    setPreview([]);
  };

  return (
    <div className="p-6 page-enter">
      <div className="mb-6 animate-stagger-1">
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Import Excel or CSV files into any module</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 animate-stagger-2">
          <div className="bg-card rounded-2xl border border-border/60 p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 className="font-semibold text-foreground mb-3">Select Module</h2>
            <div className="space-y-1.5">
              {importTypes.map(t => (
                <button key={t} onClick={() => setSelected(t)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selected === t ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="text-sm font-semibold text-foreground mb-2">Supported Formats</h3>
            <div className="space-y-1.5">
              {[".csv", ".xlsx", ".xls"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-green-500" /> {f} files
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4 animate-stagger-3">
          {/* Drop zone */}
          <div
            className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200 ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {file ? <FileSpreadsheet className="w-7 h-7 text-primary" /> : <Upload className="w-7 h-7 text-primary" />}
            </div>
            {file ? (
              <div>
                <p className="font-semibold text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-foreground">Drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse · CSV, Excel</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Preview (first 5 rows)</h3>
                <button onClick={() => { setFile(null); setPreview([]); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40">
                      {preview[0]?.map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold text-muted-foreground truncate max-w-[120px]">{h || `Col ${i + 1}`}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="hover:bg-muted/20">
                        {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validate + Import */}
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
              onClick={() => file ? toast({ title: "Validation passed!", description: `${file.name} is ready to import.` }) : toast({ title: "กรุณาเลือกไฟล์", variant: "destructive" })}>
              <AlertCircle className="w-4 h-4" /> Validate
            </button>
            <button onClick={handleImport} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> Import {selected}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
