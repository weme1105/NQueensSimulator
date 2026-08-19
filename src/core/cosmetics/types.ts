export type CosmeticId = string;
export type TitleId = string;

export type CrownKind = 'honor' | 'premium';
export type CosmeticKind = 'crown' | 'theme' | 'reveal-effect';

export interface CrownDefinition {
  id: CosmeticId;
  kind: CrownKind;
  displayName: string;
  assetKey: string;
}

export interface ThemeDefinition {
  id: CosmeticId;
  displayName: string;
  assetKey: string;
}

export interface RevealEffectDefinition {
  id: CosmeticId;
  displayName: string;
  effectKey: string;
}

export interface CosmeticOwnership {
  cosmeticId: CosmeticId;
  acquiredAt: string;
  source: 'store' | 'challenge' | 'season' | 'ranking' | 'achievement' | 'event';
}

export interface CosmeticLoadout {
  crownId?: CosmeticId;
  themeId?: CosmeticId;
  revealEffectId?: CosmeticId;
  titleId?: TitleId;
}

/** Cosmetics are presentation-only and must never alter solving/scoring capability. */
export interface CosmeticCollection {
  owned: CosmeticOwnership[];
  titles: TitleId[];
  equipped: CosmeticLoadout;
}
