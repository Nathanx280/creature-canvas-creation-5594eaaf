import { Sparkles, Wand2 } from "lucide-react";
import {
  QualityOptions, DitherAlgo, ColorMapMode, DEFAULT_QUALITY,
} from "@/lib/quality";

interface Props {
  value: QualityOptions;
  onChange: (next: QualityOptions) => void;
}

const ALGOS: { value: DitherAlgo; label: string; hint: string }[] = [
  { value: "floyd",    label: "Floyd-Steinberg", hint: "Balanced (default)" },
  { value: "atkinson", label: "Atkinson",        hint: "Soft, classic Mac look" },
  { value: "jarvis",   label: "Jarvis",          hint: "Smoother gradients" },
  { value: "stucki",   label: "Stucki",          hint: "Sharper than Jarvis" },
  { value: "sierra",   label: "Sierra",          hint: "Detail-preserving" },
  { value: "burkes",   label: "Burkes",          hint: "Fast, crisp" },
  { value: "bayer4",   label: "Bayer 4×4",       hint: "Clean ordered pattern" },
  { value: "bayer8",   label: "Bayer 8×8",       hint: "Fine ordered pattern" },
  { value: "none",     label: "None",            hint: "Flat — banding" },
];

const MAPS: { value: ColorMapMode; label: string; hint: string }[] = [
  { value: "weighted", label: "Weighted",   hint: "Default — perceptual approximation" },
  { value: "lab",      label: "Perceptual", hint: "CIE Lab — most accurate, slower" },
  { value: "rgb",      label: "RGB",        hint: "Pure euclidean RGB" },
];

const Slider = ({
  label, value, min, max, step = 1, onChange, suffix = "",
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}{suffix}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary h-1"
    />
  </div>
);

const DetailControls = ({ value, onChange }: Props) => {
  const set = <K extends keyof QualityOptions>(k: K, v: QualityOptions[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="glass p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Detail & Quality
        </h3>
        <button
          onClick={() => onChange(DEFAULT_QUALITY)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Dither Algorithm</span>
        <div className="flex flex-wrap gap-1">
          {ALGOS.map((a) => (
            <button
              key={a.value}
              title={a.hint}
              onClick={() => set("ditherAlgo", a.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                value.ditherAlgo === a.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Color Mapping</span>
        <div className="flex flex-wrap gap-1">
          {MAPS.map((m) => (
            <button
              key={m.value}
              title={m.hint}
              onClick={() => set("colorMap", m.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                value.colorMap === m.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Slider label="Dither Strength" value={value.ditherStrength}
          min={0} max={100} onChange={(v) => set("ditherStrength", v)} suffix="%" />
        <Slider label="Pre-Sharpen" value={value.preSharpen}
          min={0} max={100} onChange={(v) => set("preSharpen", v)} suffix="%" />
        <Slider label="Edge Preserve" value={value.edgePreserve}
          min={0} max={100} onChange={(v) => set("edgePreserve", v)} suffix="%" />
        <label className="flex items-center gap-2 text-xs select-none cursor-pointer">
          <input
            type="checkbox" checked={value.serpentine}
            onChange={(e) => set("serpentine", e.target.checked)}
            className="accent-primary"
          />
          Serpentine scan (reduces dither artifacts)
        </label>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
        <Wand2 className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
        For maximum in-game detail try <b>Stucki + Perceptual</b> with <b>Pre-Sharpen 30–50%</b>
        and <b>Edge Preserve 40%</b>. For pixel-art / logos use <b>Bayer 8×8</b> with sharpen 0.
      </p>
    </div>
  );
};

export default DetailControls;
