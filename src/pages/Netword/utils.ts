import type { INetworkRequest } from "./types";

const escapeShellValue = (value: string) => value.replace(/'/g, `'\"'\"'`);

const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  return typeof value === "string" ? value : JSON.stringify(value);
};

export const buildCurlCommand = (payload: INetworkRequest) => {
  const headerSegments = Object.entries(payload.headers ?? {}).map(
    ([key, value]) => `-H '${escapeShellValue(`${key}: ${value}`)}'`,
  );

  const requestBody = stringifyValue(payload.body ?? payload.data);
  const dataSegment = requestBody ? [`--data-raw '${escapeShellValue(requestBody)}'`] : [];

  return [
    "curl",
    `-X ${payload.method.toUpperCase()}`,
    ...headerSegments,
    ...dataSegment,
    `'${escapeShellValue(payload.url)}'`,
  ].join(" ");
};
