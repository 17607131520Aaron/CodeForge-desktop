import type { INetworkRequest } from "./types";

const escapeShellValue = (value: string) => value.replace(/'/g, `'\"'\"'`);

const canParseJsonString = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  );
};

export const normalizeJsonLikeValue = (value: unknown): unknown => {
  if (typeof value !== "string" || !canParseJsonString(value)) {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const extractQueryParamsFromUrl = (url?: string) => {
  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);
    const entries = Array.from(parsedUrl.searchParams.entries());

    if (entries.length === 0) {
      return undefined;
    }

    const queryParams: Record<string, string | string[]> = {};

    for (const [key, value] of entries) {
      const currentValue = queryParams[key];

      if (currentValue === undefined) {
        queryParams[key] = value;
        continue;
      }

      queryParams[key] = Array.isArray(currentValue) ? [...currentValue, value] : [currentValue, value];
    }

    return queryParams;
  } catch {
    return undefined;
  }
};

export const stringifyDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  const normalizedValue = normalizeJsonLikeValue(value);

  return typeof normalizedValue === "string" ? normalizedValue : JSON.stringify(normalizedValue, null, 2);
};

export const buildCurlCommand = (payload: INetworkRequest) => {
  const headerSegments = Object.entries(payload.headers ?? {}).map(
    ([key, value]) => `-H '${escapeShellValue(`${key}: ${value}`)}'`,
  );

  const requestBody = stringifyDisplayValue(payload.body ?? payload.data);
  const dataSegment = requestBody ? [`--data-raw '${escapeShellValue(requestBody)}'`] : [];

  return [
    "curl",
    `-X ${payload.method.toUpperCase()}`,
    ...headerSegments,
    ...dataSegment,
    `'${escapeShellValue(payload.url)}'`,
  ].join(" ");
};
