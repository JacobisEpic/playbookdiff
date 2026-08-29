declare module "eslint" {
  export class SourceCode {
    static readonly VisitorKeys: Record<string, readonly string[]>;
  }

  export namespace SourceCode {
    type VisitorKeys = Record<string, readonly string[]>;
  }
}
