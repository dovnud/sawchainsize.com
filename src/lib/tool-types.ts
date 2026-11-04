/** JSON shape embedded on the tool pages. Built only from content collections. */

export type ToolChain = { brand: string; partNo: string; role: 'oem' | 'equivalent' };
export type ToolReport = { publisher: string; typeLabel: string; pitch: string | null; gauge: number | null; dl: number | null };
export type ToolSource = { id: string; publisher: string; title: string; url?: string; typeLabel: string; retrieved: string };
export type ToolBarShop = { length: number; chain: ToolShop; bar: ToolShop };
export type ToolBar = {
  lengths: number[];
  label: string;
  pitch: string | null;
  gauge: number | null;
  dl: number | null;
  status: 'ok' | 'verify' | 'conflict';
  file: string | null;
  /** File size as printed on the saw page, including a sources-differ note. */
  fileText: string;
  /** Bar part number already parsed from the row note. Null when the note does not store one. */
  barPart: string | null;
  note: string;
  gaugeNote?: string;
  dlRange: [number, number] | null;
  chains: ToolChain[];
  reported: ToolReport[];
  sources: ToolSource[];
  /** Empty unless the row is a single verified loop. Chain link is repeated per length; bar link is per length. */
  shops: ToolBarShop[];
};
export type ToolModel = {
  id: string;
  name: string;
  brand: string;
  url: string;
  emailUrl: string;
  lastVerified: string;
  bars: ToolBar[];
};
export type ToolBrand = { id: string; label: string; models: string[] };
export type ToolPart = {
  brand: string;
  partNo: string;
  role: 'oem' | 'equivalent';
  saws: { id: string; name: string; url: string; lengths: number[] }[];
};
export type ToolShop = { href: string; kind: 'product' | 'search'; label: string; why: string };
export type ToolSpecSaw = { id: string; name: string; url: string; lengths: number[]; labels: string[] };
export type ToolSpec = {
  key: string;
  pitch: string;
  gauge: number;
  dl: number;
  pitchLabel: string;
  gaugeLabel: string;
  file: string;
  chainUrl: string | null;
  codes: { oregon: string; stihl: string; husqvarna: string; carlton: string } | null;
  shop: ToolShop | null;
  parts: ToolPart[];
  saws: ToolSpecSaw[];
};
export type ToolData = {
  brands: ToolBrand[];
  models: Record<string, ToolModel>;
  specs: ToolSpec[];
  chainPages: string[];
};

/** Permanent path for the replacement chain and bar matcher. */
export const MATCHER_PATH = '/tools/replacement-chain-bar-matcher/';
