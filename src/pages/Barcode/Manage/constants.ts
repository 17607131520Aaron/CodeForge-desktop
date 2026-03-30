export type CodeType = "QRCODE" | "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39";
export interface IGeneratedCode {
  id: string;
  value: string;
  type: CodeType;
}

export const CODE_TYPES: Array<{ label: string; value: CodeType }> = [
  { label: "二维码（QR Code）", value: "QRCODE" },
  { label: "条形码 - CODE128（通用，支持字母+数字）", value: "CODE128" },
  { label: "条形码 - EAN-13（13位数字）", value: "EAN13" },
  { label: "条形码 - EAN-8（8位数字）", value: "EAN8" },
  { label: "条形码 - UPC-A（12位数字）", value: "UPC" },
  { label: "条形码 - Code39（字母+数字，常见一维码）", value: "CODE39" },
];
