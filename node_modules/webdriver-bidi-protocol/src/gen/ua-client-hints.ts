export type UserAgentClientHintsCommand =
  Emulation.SetClientHintsOverrideCommand;
export namespace Emulation {
  export type SetClientHintsOverrideCommand = {
    method: 'emulation.setClientHintsOverride';
    params: {
      clientHints: Emulation.ClientHintsMetadata | null;
      contexts?: [string, ...string[]];
      userContexts?: [string, ...string[]];
    };
  };
}
export namespace Emulation {
  export type ClientHintsMetadata = {
    brands?: [...Emulation.BrandVersion[]];
    fullVersionList?: [...Emulation.BrandVersion[]];
    platform?: string;
    platformVersion?: string;
    architecture?: string;
    model?: string;
    mobile?: boolean;
    bitness?: string;
    wow64?: boolean;
    formFactors?: [...string[]];
  };
}
export namespace Emulation {
  export type BrandVersion = {
    brand: string;
    version: string;
  };
}
export namespace Emulation {
  export type SetClientHintsOverrideResult = Record<string, never>;
}
