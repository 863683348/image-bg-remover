"use client";
import { useState, useRef, useCallback, useEffect } from "react";
function useRefreshIcons() {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).lucide)
      (window as any).lucide.createIcons();
  });
}
const PRESET_COLORS = [
  { value: "checker", label: "Transparent", style: { backgroundImage: "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)", backgroundSize: "12px 12px", backgroundPosition: "0 0, 6px 6px" } },
  { value: "#ffffff", label: "White", style: { background: "#fff" } },
  { value: "#000000", label: "Black", style: { background: "#000" } },
  { value: "#ff6b6b", label: "Red", style: { background: "#ff6b6b" } },
  { value: "#4ecdc4", label: "Teal", style: { background: "#4ecdc4" } },
  { value: "#45b7d1", label: "Blue", style: { background: "#45b7d1" } },
] as const;
export default function Home() {
  useRefreshIcons();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("checker");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please select an image file (JPG, PNG, or WebP)."); return; }
    if (f.size > 25 * 1024 * 1024) { setError("Image too large. Maximum size is 25 MB."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) { URL.revokeObjectURL(resultUrl); setResultUrl(null); }
    setError(null); setResultBlob(null); setBgColor("checker"); setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, [previewUrl, resultUrl]);

  const removeBackground = useCallback(async () => {
    if (!file || isProcessing) return;
    setIsProcessing(true); setError(null);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/remove-bg", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Unknown error" })); throw new Error(err.detail || err.error || "Failed"); }
      const blob = await res.blob();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob)); setResultBlob(blob);
    } catch (err) { setError(err instanceof Error ? err.message : "An unexpected error occurred"); }
    finally { setIsProcessing(false); }
  }, [file, isProcessing, resultUrl]);

  const downloadResult = useCallback(() => {
    if (!resultBlob) return;
    if (bgColor === "checker") {
      const a = document.createElement("a"); a.href = URL.createObjectURL(resultBlob); a.download = "removed-background.png";
      a.click(); URL.revokeObjectURL(a.href);
    } else {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!; ctx.fillStyle = bgColor; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
        c.toBlob((bl) => { if (!bl) return; const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "removed-background.png"; a.click(); URL.revokeObjectURL(a.href); }, "image/png");
      };
      img.src = URL.createObjectURL(resultBlob);
    }
  }, [resultBlob, bgColor]);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null); setPreviewUrl(null); setResultUrl(null); setResultBlob(null);
    setError(null); setIsProcessing(false); setBgColor("checker");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl, resultUrl]);
  return (
    <div className="min-h-screen bg-bg-main">
      <header className="sticky top-0 z-50 bg-surface border-b border-border">
        <div className="max-w-[900px] mx-auto px-6 py-3.5 flex items-center gap-2">
          <i data-lucide="wand-sparkles" className="text-accent" style={{width:20,height:20}}/>
          <span className="font-semibold text-base">Background Remover</span>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-10 flex flex-col items-center gap-6">
        {!file ? (
          <section className="w-full">
            <div ref={dragRef} onClick={()=>fileInputRef.current?.click()}
              onDragOver={e=>{e.preventDefault();dragRef.current?.classList.add("drag-over")}}
              onDragLeave={()=>dragRef.current?.classList.remove("drag-over")}
              onDrop={e=>{e.preventDefault();dragRef.current?.classList.remove("drag-over");const f=e.dataTransfer.files[0];if(f)handleFile(f)}}
              className="w-full min-h-[320px] max-md:min-h-[220px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer bg-surface px-10 py-10 max-md:px-7 max-md:py-7 transition-colors duration-200 hover:border-accent hover:bg-accent-light">
              <i data-lucide="image-up" className="text-text-secondary" style={{width:40,height:40}}/>
              <p className="text-lg font-medium">Drop image here</p>
              <p className="text-sm text-text-secondary">or click to browse &middot; JPG, PNG, WebP</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
          </section>
        ) : (
          <div className="w-full flex flex-col gap-5">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center max-md:grid-cols-1 max-md:gap-3">
              <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-text-secondary bg-bg-main border-b border-border">
                  <i data-lucide="image" style={{width:14,height:14}}/><span>Original</span>
                </div>
                <div className="flex items-center justify-center min-h-[300px] max-md:min-h-[220px] overflow-hidden">
                  {previewUrl&&<img src={previewUrl} alt="Original" className="max-w-full max-h-[420px] block"/>}
                </div>
              </div>
              <div className="text-text-secondary max-md:hidden"><i data-lucide="arrow-right" style={{width:24,height:24}}/></div>
              <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-text-secondary bg-bg-main border-b border-border">
                  <i data-lucide="sparkles" style={{width:14,height:14}}/><span>Result</span>
                </div>
                <div className={"w-full min-h-[300px] max-md:min-h-[220px] flex items-center justify-center relative"+(bgColor==="checker"?" checkerboard":"")}
                  style={bgColor!=="checker"?{background:bgColor}:undefined}>
                  {resultUrl
                    ? <img src={resultUrl} alt="Result" className="max-w-full max-h-[420px] block relative z-10"/>
                    : <div className="flex flex-col items-center gap-2 text-text-secondary p-10">
                        <i data-lucide="wand-sparkles" style={{width:32,height:32}}/>
                        <p className="text-sm">Click to process</p>
                      </div>
                  }
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={removeBackground} disabled={isProcessing||!!resultUrl}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <i data-lucide="wand-sparkles" style={{width:15,height:15}}/>Remove Background
              </button>
              <button onClick={()=>fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-bg-main text-gray-900 border border-border hover:bg-border transition-colors">
                <i data-lucide="rotate-ccw" style={{width:15,height:15}}/>Change Image
              </button>
            </div>

            {resultUrl&&(
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex items-center gap-2.5 max-md:flex-col max-md:items-start">
                  <span className="text-xs text-text-secondary">Background</span>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    {PRESET_COLORS.map(c=>(
                      <button key={c.value} title={c.label} onClick={()=>setBgColor(c.value)}
                        className={"w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0"+(bgColor===c.value?" border-accent":" border-transparent")}
                        style={c.style as React.CSSProperties}/>
                    ))}
                    <button title="Custom color" onClick={()=>colorInputRef.current?.click()}
                      className="w-7 h-7 rounded-full border-2 border-border bg-bg-main flex items-center justify-center text-text-secondary transition-transform hover:scale-110 flex-shrink-0">
                      <i data-lucide="palette" style={{width:13,height:13}}/>
                    </button>
                    <input ref={colorInputRef} type="color" className="hidden" onChange={e=>setBgColor(e.target.value)}/>
                  </div>
                </div>
                <div className="flex gap-2 max-md:w-full">
                  <button onClick={downloadResult}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium bg-success text-white hover:bg-success-hover transition-colors max-md:flex-1">
                    <i data-lucide="download" style={{width:15,height:15}}/>Download PNG
                  </button>
                  <button onClick={reset}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-bg-main text-gray-900 border border-border hover:bg-border transition-colors max-md:flex-1">
                    <i data-lucide="trash-2" style={{width:15,height:15}}/>New Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {isProcessing&&(
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-text-secondary text-sm">
            <div className="w-9 h-9 border-3 border-border border-t-accent rounded-full animate-spin-custom"/>
            <p>Removing background...</p>
          </div>
        </div>
      )}

      {error&&(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] max-w-[480px] bg-danger-bg border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm shadow-lg">
          <i data-lucide="circle-alert" style={{width:15,height:15,flexShrink:0}}/>
          <span className="flex-1">{error}</span>
          <button onClick={()=>setError(null)} className="flex-shrink-0 p-0.5 hover:opacity-70">
            <i data-lucide="x" style={{width:13,height:13}}/>
          </button>
        </div>
      )}
    </div>
  );
}
