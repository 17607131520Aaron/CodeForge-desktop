import type { CodeType } from "./constants";

export const getRandomAlphaNum = (length: number): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export const getRandomDigits = (length: number): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};

export const generateUpcA = (): string => {
  // 11 位随机数字 + 1 位校验位
  const base = getRandomDigits(11);
  const digits = base.split("").map((d) => Number(d));

  // 位置从 1 开始：奇数位 * 3，偶数位 * 1
  let sumOdd = 0;
  let sumEven = 0;
  digits.forEach((d, index) => {
    const pos = index + 1;
    if (pos % 2 === 1) {
      sumOdd += d;
    } else {
      sumEven += d;
    }
  });

  const total = sumOdd * 3 + sumEven;
  const checkDigit = (10 - (total % 10)) % 10;

  return `${base}${checkDigit}`;
};

export const generateEan13 = (): string => {
  // 12 位随机数字 + 1 位校验位
  const base = getRandomDigits(12);
  const digits = base.split("").map((d) => Number(d));

  let sumOdd = 0;
  let sumEven = 0;
  digits.forEach((d, index) => {
    const pos = index + 1;
    if (pos % 2 === 0) {
      // 偶数位 * 3
      sumEven += d;
    } else {
      sumOdd += d;
    }
  });

  const total = sumOdd + sumEven * 3;
  const checkDigit = (10 - (total % 10)) % 10;

  return `${base}${checkDigit}`;
};

export const generateEan8 = (): string => {
  // 7 位随机数字 + 1 位校验位
  const base = getRandomDigits(7);
  const digits = base.split("").map((d) => Number(d));

  let sumOdd = 0;
  let sumEven = 0;
  digits.forEach((d, index) => {
    const pos = index + 1;
    if (pos % 2 === 1) {
      // 奇数位 * 3
      sumOdd += d;
    } else {
      sumEven += d;
    }
  });

  const total = sumOdd * 3 + sumEven;
  const checkDigit = (10 - (total % 10)) % 10;

  return `${base}${checkDigit}`;
};

export const generateRandomValueByType = (type: CodeType): string => {
  switch (type) {
    case "EAN13":
      return generateEan13();
    case "EAN8":
      return generateEan8();
    case "UPC":
      return generateUpcA();
    case "CODE39":
      return getRandomAlphaNum(10);
    case "CODE128":
    default:
      return getRandomAlphaNum(12);
  }
};

export const validateValueByType = (type: CodeType, rawValue: string): string | null => {
  const value = rawValue.trim();

  if (!value) {
    return "内容不能为空";
  }

  switch (type) {
    case "EAN13":
      if (!/^\d{13}$/.test(value)) {
        return "EAN-13 条码必须是 13 位数字";
      }
      return null;
    case "EAN8":
      if (!/^\d{8}$/.test(value)) {
        return "EAN-8 条码必须是 8 位数字";
      }
      return null;
    case "UPC":
      if (!/^\d{12}$/.test(value)) {
        return "UPC-A 条码必须是 12 位数字";
      }
      return null;
    case "CODE39":
      if (!/^[0-9A-Z.$/+% -]+$/.test(value)) {
        return "Code39 仅支持大写字母、数字及 - . 空格 $ / + % 等字符";
      }
      return null;
    case "CODE128":
    case "QRCODE":
    default:
      if (value.length > 256) {
        return "内容过长，请控制在 256 个字符以内";
      }
      return null;
  }
};

let codeIdSeed = 0;

export const generateCodeId = (): string => {
  codeIdSeed += 1;
  return `code-${Date.now()}-${codeIdSeed}-${Math.random().toString(36).slice(2, 8)}`;
};
