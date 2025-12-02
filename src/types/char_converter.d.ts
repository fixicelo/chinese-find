declare module "char_converter" {
  type ConverterMode = "v2s" | "v2t";
  type DataSource = "online" | "offline";
  type OutputMode = "one2one" | "one2many";

  export default class CharConverter {
    constructor(mode: ConverterMode, source?: DataSource);
    loaded?: Promise<unknown>;
    setMode(mode: OutputMode): void;
    convert(text: string): Promise<string>;
  }
}
