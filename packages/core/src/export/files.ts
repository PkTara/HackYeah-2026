/** One entry point for the screen: the exact file for a reader and format. */
import { buildDocument } from './document';
import { toJson, toMeasurementsCsv, toSessionsCsv } from './data';
import { renderHtml, renderMarkdown, renderText } from './render';
import type {
  AudienceId,
  ExportChoices,
  ExportSnapshot,
  FileKind,
} from './types';

export type ExportFile = Readonly<{
  /** Audience, mode and date only. Never typed text or a name. */
  name: string;
  mimeType: string;
  text: string;
}>;

const EXT: Readonly<Record<FileKind, string>> = {
  text: 'txt',
  markdown: 'md',
  html: 'html',
  csv: 'csv',
  measurementsCsv: 'csv',
  json: 'json',
};

const MIME: Readonly<Record<FileKind, string>> = {
  text: 'text/plain',
  markdown: 'text/markdown',
  html: 'text/html',
  csv: 'text/csv',
  measurementsCsv: 'text/csv',
  json: 'application/json',
};

/** What the format chips call each kind. */
export const FILE_LABEL: Readonly<Record<FileKind, string>> = {
  text: 'Message text',
  markdown: 'Markdown',
  html: 'Printable page',
  csv: 'Sessions CSV',
  measurementsCsv: 'Measurements CSV',
  json: 'JSON',
};

export function exportFile(
  audience: AudienceId,
  kind: FileKind,
  s: ExportSnapshot,
  choices: ExportChoices = {},
): ExportFile {
  const suffix = kind === 'measurementsCsv' ? '-measurements' : '';
  const name = `climbing-monkey-${audience}-${s.mode}-${s.generatedOn}${suffix}.${EXT[kind]}`;
  const text =
    kind === 'json'
      ? toJson(s)
      : kind === 'csv'
      ? toSessionsCsv(s)
      : kind === 'measurementsCsv'
      ? toMeasurementsCsv(s)
      : kind === 'markdown'
      ? renderMarkdown(buildDocument(audience, s, choices))
      : kind === 'html'
      ? renderHtml(buildDocument(audience, s, choices))
      : renderText(buildDocument(audience, s, choices));
  return { name, mimeType: MIME[kind], text };
}
