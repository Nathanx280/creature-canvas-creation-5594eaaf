import { Move, Maximize, RotateCw, FlipHorizontal2, FlipVertical2, RotateCcw, Crop, Grid3x3, Square, FlipHorizontal } from "lucide-react";
import { ImageTransform, FitMode, SpreadMode, DEFAULT_TRANSFORM } from "@/lib/pnt-converter";

interface Props {
  value: ImageTransform;
  onChange: (next: ImageTransform) => void;
}

const FITS: { value: FitMode; label: string }[] = [
  { value: "contain", label: "Contain" },
  { value: "cover", label: "Cover" },
  { value: "stretch", label: "Stretch" },
];

const SPREADS: { value: SpreadMode; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: "single", label: "Single", icon: <Square className="w-3 h-3" />, hint: "One image — may look blotchy on creatures/humans" },
  { value: "tile", label: "Tile", icon: <Grid3x3 className="w-3 h-3" />, hint: "Repeat across all UV islands for even body coverage" },
  { value: "mirror", label: "Mirror", icon: <FlipHorizontal className="w-3 h-3" />, hint: "Tile with mirroring — seamless edges, even coverage" },
];

const Slider = ({
  label, icon, min, max, step, value, onChange, suffix, format,
}: {
  label: string; icon: React.ReactNode;
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; suffix?: string; format?: (v: number) => string;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}{label}
      </span>
      <span className="tabular-nums text-foreground">
        {format ? format(value) : value}{suffix ?? ""}
      </span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-primary h-1"
    />
  </div>
);

const ImageTransformControls = ({ value, onChange }: Props) => {
  const set = <K extends keyof ImageTransform>(k: K, v: ImageTransform[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="glass p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Crop className="w-4 h-4 text-primary" /> Position & Crop on Target
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => set("flipX", !value.flipX)}
            className={`btn-ghost !p-1.5 ${value.flipX ? "!bg-primary/20 !text-primary" : ""}`}
            title="Flip horizontal"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => set("flipY", !value.flipY)}
            className={`btn-ghost !p-1.5 ${value.flipY ? "!bg-primary/20 !text-primary" : ""}`}
            title="Flip vertical"
          >
            <FlipVertical2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => set("rotation", value.rotation - 90)}
            className="btn-ghost !p-1.5"
            title="Rotate -90°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => set("rotation", value.rotation + 90)}
            className="btn-ghost !p-1.5"
            title="Rotate +90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChange(DEFAULT_TRANSFORM)}
            className="btn-ghost text-xs ml-1"
            title="Reset transform"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Fit</span>
        {FITS.map((f) => (
          <button
            key={f.value}
            onClick={() => set("fit", f.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              value.fit === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">Spread</span>
          {SPREADS.map((s) => {
            const active = (value.spread ?? "single") === s.value;
            return (
              <button
                key={s.value}
                onClick={() => set("spread", s.value)}
                title={s.hint}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {s.icon}{s.label}
              </button>
            );
          })}
        </div>
        {(value.spread ?? "single") !== "single" && (
          <Slider
            label="Tile Count" icon={<Grid3x3 className="w-3 h-3" />}
            min={1} max={8} step={1}
            value={value.tile ?? 3}
            onChange={(v) => set("tile", Math.round(v))}
            suffix="×"
          />
        )}
        <p className="text-[10px] text-muted-foreground leading-snug">
          ARK creature & human textures split the body into many UV islands. Use
          <b> Tile</b> or <b>Mirror</b> so your image colors land evenly on every body part
          (arms, torso, legs) instead of clumping into one area.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Slider
          label="Offset X" icon={<Move className="w-3 h-3" />}
          min={-1} max={1} step={0.01}
          value={value.offsetX}
          onChange={(v) => set("offsetX", v)}
          format={(v) => `${Math.round(v * 100)}`} suffix="%"
        />
        <Slider
          label="Offset Y" icon={<Move className="w-3 h-3 rotate-90" />}
          min={-1} max={1} step={0.01}
          value={value.offsetY}
          onChange={(v) => set("offsetY", v)}
          format={(v) => `${Math.round(v * 100)}`} suffix="%"
        />
        <Slider
          label="Scale" icon={<Maximize className="w-3 h-3" />}
          min={0.1} max={4} step={0.01}
          value={value.scale}
          onChange={(v) => set("scale", v)}
          format={(v) => `${Math.round(v * 100)}`} suffix="%"
        />
        <Slider
          label="Rotation" icon={<RotateCw className="w-3 h-3" />}
          min={-180} max={180} step={1}
          value={value.rotation}
          onChange={(v) => set("rotation", v)}
          suffix="°"
        />
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Move and resize your image inside the target canvas. <b>Contain</b> keeps the
        full image visible (with padding). <b>Cover</b> fills the canvas (may crop edges).
        <b> Stretch</b> ignores aspect ratio. Combine with offset, scale, and rotation
        to position over a specific paint region of the creature/item.
      </p>
    </div>
  );
};

export default ImageTransformControls;
