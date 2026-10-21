import { useState } from "react";
import { useScrapeProperty } from "@/hooks/useProperties";
import { Loader2, Plus } from "lucide-react";
import BrowserImport from "./BrowserImport";

export default function PropertyImport() {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"browser" | "url">("browser");
  const scrape = useScrapeProperty();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const result = await scrape.mutateAsync(url.trim());
    if (result.success && result.zillow_ok) {
      setUrl("");
      setOpen(false);
    }
    // If zillow failed but polaris succeeded, keep dialog open so user sees the warning
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        Add House
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" aria-label="Add a House" className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">Add a House</h2>
        <p className="text-sm text-gray-500 mb-4">
          Import from a listing open in your browser, or try a URL lookup.
        </p>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("browser")} className={`rounded-lg px-3 py-2 text-sm ${mode === "browser" ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>Browser import</button>
          <button onClick={() => setMode("url")} className={`rounded-lg px-3 py-2 text-sm ${mode === "url" ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>URL lookup</button>
        </div>
        {mode === "browser" ? <><BrowserImport /><button onClick={() => setOpen(false)} className="mt-4 text-sm text-gray-500">Cancel</button></> : (

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            placeholder="https://www.zillow.com/homedetails/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={scrape.isPending}
            autoFocus
          />

          {scrape.isError && (
            <p className="text-sm text-red-600">
              Something went wrong. Please try again.
            </p>
          )}

          {scrape.data && !scrape.data.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-800">Could not save property</p>
              <p className="text-red-700">{scrape.data.message}</p>
            </div>
          )}

          {scrape.data?.success && !scrape.data.zillow_ok && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Saved with partial data</p>
              <p className="text-yellow-700">{scrape.data.message}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setOpen(false); scrape.reset(); setUrl(""); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={scrape.isPending}
            >
              {scrape.data?.success ? "Done" : "Cancel"}
            </button>
            {!scrape.data?.success && (
              <button
                type="submit"
                disabled={scrape.isPending || !url.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {scrape.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Scraping…
                  </>
                ) : (
                  "Import Property"
                )}
              </button>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
