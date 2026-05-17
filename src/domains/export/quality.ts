export interface ExportQualityPreset {
  scale: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const EXPORT_QUALITY_PRESETS: ExportQualityPreset[] = [
  {
    scale: 1,
    label: '轻量',
    shortLabel: '轻量 1x',
    description: '适合快速预览，导出速度最快，文件体积较小。',
  },
  {
    scale: 2,
    label: '清晰',
    shortLabel: '清晰 2x',
    description: '推荐用于日常文档，清晰度与导出速度较平衡。',
  },
  {
    scale: 3,
    label: '高清',
    shortLabel: '高清 3x',
    description: '适合正式交付，图表和文字更清楚，导出时间会增加。',
  },
  {
    scale: 4,
    label: '极致',
    shortLabel: '极致 4x',
    description: '按最高质量导出，可能持续数分钟；如果系统承载不了会失败并生成诊断。',
  },
];

export function getExportQualityPreset(scale: number | undefined) {
  return EXPORT_QUALITY_PRESETS.find((preset) => preset.scale === scale)
    ?? EXPORT_QUALITY_PRESETS[1];
}

export function normalizeExportQualityScale(scale: unknown, fallback = 2) {
  const value = typeof scale === 'number' && Number.isFinite(scale) ? scale : fallback;
  const rounded = Number.isFinite(value) ? Math.round(value) : 2;
  return Math.min(4, Math.max(1, rounded));
}
