export enum Menu {
  ConvertPage,
  SearchSelection,
}

export type MenuId =
  | "convert-page-to-traditional"
  | "convert-page-to-simplified"
  | "search-selection";

export enum Target {
  Traditional = "traditional",
  Simplified = "simplified",
}
