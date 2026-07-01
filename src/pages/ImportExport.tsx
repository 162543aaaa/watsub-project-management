import { useState } from "react";
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import Import from "./Import";
import Export from "./Export";

export default function ImportExport() {
  const [tab, setTab] = useState<"import" | "export">("import");

  return (
    <div className="p-6 page-enter">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setTab("import")}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
            tab === "import"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "hover:bg-muted text-muted-foreground border border-transparent"
          }`}
        >
          <ArrowUpTrayIcon className="w-4 h-4" /> Import
        </button>
        <button
          onClick={() => setTab("export")}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
            tab === "export"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "hover:bg-muted text-muted-foreground border border-transparent"
          }`}
        >
          <ArrowDownTrayIcon className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="-mx-6 -mb-6">
        {tab === "import" ? <Import /> : <Export />}
      </div>
    </div>
  );
}