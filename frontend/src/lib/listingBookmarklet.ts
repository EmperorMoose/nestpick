// This function is serialized into a bookmark URL and runs only when clicked by the user.
function captureListing() {
  if (!/(^|\.)zillow\.com$/.test(location.hostname) || !location.pathname.includes('/homedetails/')) {
    alert('Open a Zillow house listing first.'); return;
  }
  const id = location.pathname.match(/\/(\d+)_zpid/)?.[1];
  let property: any = null;
  const seen = new Set<any>();
  function walk(value: any, depth = 0) {
    if (!value || depth > 18 || property) return;
    if (typeof value === 'string') {
      if (value.length < 5000000 && /^[\s]*[\[{]/.test(value)) {
        try { walk(JSON.parse(value), depth + 1); } catch { /* Not JSON. */ }
      }
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (value.zpid && (!id || String(value.zpid) === id) && value.address?.streetAddress && ('price' in value || 'livingArea' in value)) {
      property = value; return;
    }
    for (const child of Object.values(value)) walk(child, depth + 1);
  }
  for (const script of document.querySelectorAll('script[type="application/json"], script#__NEXT_DATA__')) {
    try { walk(JSON.parse(script.textContent || '{}')); } catch { /* Ignore unrelated scripts. */ }
  }
  const p = property || {};
  const a = p.address || {};
  const text = document.body.innerText;
  const number = (v: any) => { const n = Number(String(v ?? '').replace(/[$,]/g, '')); return v != null && v !== '' && Number.isFinite(n) ? n : undefined; };
  const heading = document.querySelector('h1')?.textContent?.trim();
  const address = a.streetAddress || heading;
  if (!address || /access.*denied|press.*hold/i.test(text.slice(0, 500))) {
    alert('Listing data is not available. Complete the human check and let the house page load, then try again.'); return;
  }
  const images: string[] = [];
  for (const image of p.responsivePhotos || p.photos || []) {
    const url = typeof image === 'string' ? image : image.url || image.mixedSources?.jpeg?.[0]?.url;
    if (url && /^https?:\/\//.test(url)) images.push(url);
  }
  if (!images.length) for (const image of document.querySelectorAll('img')) {
    if (image.currentSrc.includes('photos.zillowstatic.com') && image.naturalWidth >= 300) images.push(image.currentSrc);
  }
  const data = {
    address, city: a.city, state: a.state, zip: a.zipcode,
    zillow_url: location.origin + location.pathname,
    list_price: number(p.price ?? p.listPrice ?? text.match(/\$([\d,]+)/)?.[1]),
    bedrooms: number(p.bedrooms ?? text.match(/([\d.]+)\s*(?:beds|bd)\b/i)?.[1]),
    bathrooms: number(p.bathrooms ?? text.match(/([\d.]+)\s*(?:baths|ba)\b/i)?.[1]),
    living_area: number(p.livingArea ?? text.match(/([\d,]+)\s*sqft\b/i)?.[1]),
    year_built: number(p.yearBuilt), hoa_fee: number(p.monthlyHoaFee),
    description: typeof p.description === 'string' ? p.description : undefined,
    home_status: p.homeStatus, lat: number(p.latitude), lng: number(p.longitude),
    photos: Array.from(new Set(images)).slice(0, 20),
  };
  const payload = JSON.stringify(data, null, 2);
  function showCopyBox() {
    const box = document.createElement('dialog');
    box.style.cssText = 'padding:24px;border:1px solid #ccc;border-radius:12px;max-width:600px;width:90%;';
    const title = document.createElement('p'); title.textContent = 'Copy this listing data, then paste it in Nestpick → Add House → Browser import.';
    const area = document.createElement('textarea'); area.value = payload; area.style.cssText = 'width:100%;height:240px;';
    const close = document.createElement('button'); close.textContent = 'Close'; close.onclick = () => box.remove();
    box.append(title, area, close); document.body.append(box); box.showModal(); area.select();
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(payload).then(() => alert('Listing copied! Paste it in Nestpick → Add House → Browser import. Review the details before saving.'), showCopyBox);
  } else showCopyBox();
}
export const listingBookmarklet = 'javascript:' + encodeURIComponent('(' + captureListing.toString() + ')();');
