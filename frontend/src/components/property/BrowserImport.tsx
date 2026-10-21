import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { propertiesApi } from "@/lib/api";
import { listingBookmarklet } from "@/lib/listingBookmarklet";

export default function BrowserImport() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  let preview: Record<string, unknown> | null = null;
  try { const parsed = JSON.parse(text); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) preview = parsed; } catch { /* Show validation on save. */ }
  async function save() {
    setError(""); setSaving(true);
    try {
      const data = JSON.parse(text);
      if (!data || typeof data.address !== 'string' || !data.address.trim() || typeof data.zillow_url !== 'string') throw new Error('Paste the complete listing data copied by the bookmarklet.');
      const result = await propertiesApi.importBrowser(data);
      await qc.invalidateQueries({ queryKey: ['properties'] });
      await qc.invalidateQueries({ queryKey: ['property', result.id] });
      await qc.invalidateQueries({ queryKey: ['comparison-matrix'] });
      navigate('/property/' + result.id);
    } catch (e) {
      setError(e instanceof SyntaxError ? 'This is not valid listing JSON. Copy it again using the bookmarklet.' : e instanceof Error && !('response' in e) ? e.message : 'Could not save. Check the address, Zillow URL, and numeric fields in the copied data.');
    } finally { setSaving(false); }
  }
  return <div className="space-y-3">
    <p className="text-sm text-gray-600">Drag <a ref={(el) => el?.setAttribute('href', listingBookmarklet)} className="inline-block rounded bg-blue-100 px-2 py-1 text-blue-700 font-medium cursor-grab" onClick={(e) => e.preventDefault()}>Save to Nestpick</a> to your browser’s bookmarks bar.</p>
    <p className="text-xs text-gray-500">Open a Zillow house in that browser, complete any human check, and click the bookmark. Return here and paste the copied data. If dragging is unavailable, copy the bookmark address below and save it as a bookmark’s URL.</p>
    <details className="text-xs text-gray-500"><summary className="cursor-pointer">Manual bookmark setup</summary><textarea aria-label="Bookmark URL" readOnly value={listingBookmarklet} className="mt-2 w-full border rounded p-2 h-20" onFocus={(e) => e.target.select()} /></details>
    <label className="block text-sm font-medium text-gray-700">Copied listing data<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'{"address": "...", "zillow_url": "https://www.zillow.com/homedetails/..."}'} className="mt-1 w-full h-40 rounded-lg border border-gray-300 p-3 text-xs font-mono" /></label>
    {preview && <div className="rounded-lg bg-blue-50 p-3 text-sm text-gray-700"><p className="font-medium">Review before saving</p><p>{String(preview.address ?? 'Missing address')}</p><p>Price: {String(preview.list_price ?? 'Unavailable')} · Beds: {String(preview.bedrooms ?? 'Unavailable')} · Baths: {String(preview.bathrooms ?? 'Unavailable')}</p><p>Area: {String(preview.living_area ?? 'Unavailable')} sqft · Photos: {Array.isArray(preview.photos) ? preview.photos.length : 0}</p></div>}
    <p className="text-xs text-gray-500">Saving updates a matching Zillow listing and preserves your ratings and offer. Only captured fields update. This imports the loaded page once; it does not refresh automatically.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button type="button" onClick={save} disabled={saving || !text.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save listing'}</button>
  </div>;
}
