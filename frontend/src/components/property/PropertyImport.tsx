import { useState } from "react";
import { useScrapeProperty } from "@/hooks/useProperties";
import { Loader2, Plus } from "lucide-react";

export default function PropertyImport() {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const scrape = useScrapeProperty();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const result = await scrape.mutateAsync(url.trim());
    if (result.success) {
      setUrl("");
      setOpen(false);
    }
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
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
        <h2 className="text-lg font-semibold mb-1">Add a House</h2>
        <p className="text-sm text-gray-500 mb-4">
          Paste a Zillow listing URL — we'll scrape property data and neighborhood stats automatically.
        </p>

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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Partial data only</p>
              <p className="text-yellow-700">{scrape.data.message}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setOpen(false); scrape.reset(); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={scrape.isPending}
            >
              Cancel
            </button>
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
          </div>
        </form>
      </div>
    </div>
  );
}
