export type UserAgentClientHintsCommand =
  Emulation.SetClientHintsOverrideCommand;
export declare namespace Emulation {
  type SetClientHintsOverrideCommand = {
    method: 'emulation.setClientHintsOverride';
    params: {
      clientHints: Emulation.ClientHintsMetadata | null;
      contexts?: [string, ...string[]];
      userContexts?: [string, ...string[]];
    };
  };
}
export declare namespace Emulation {
  type ClientHintsMetadata = {
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
export declare namespace Emulation {
  type BrandVersion = {
    brand: string;
    version: string;
  };
}
export declare namespace Emulation {
  type SetClientHintsOverrideResult = Record<string, never>;
}
