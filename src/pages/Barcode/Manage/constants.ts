export type CodeType = "QRCODE" | "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39";
export interface IGeneratedCode {
  id: string;
  value: string;
  type: CodeType;
}

export type CaoliaoQrErrorCorrection = "L" | "M" | "Q" | "H";
export type CaoliaoQrSettings = {
  size: string; // e.g. "400x400"
  errorCorrection: CaoliaoQrErrorCorrection;
  border: number; // quiet zone / border in QR "modules"
  version?: number; // QR version (may be ignored by API)
};

export const CODE_TYPES: Array<{ label: string; value: CodeType }> = [
  { label: "二维码（QR Code）", value: "QRCODE" },
  { label: "条形码 - CODE128（通用，支持字母+数字）", value: "CODE128" },
  { label: "条形码 - EAN-13（13位数字）", value: "EAN13" },
  { label: "条形码 - EAN-8（8位数字）", value: "EAN8" },
  { label: "条形码 - UPC-A（12位数字）", value: "UPC" },
  { label: "条形码 - Code39（字母+数字，常见一维码）", value: "CODE39" },
];

export const CAOLIAO_QR_CREATE_URL = "https://api.2dcode.biz/v1/create-qr-code";
