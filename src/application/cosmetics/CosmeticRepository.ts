import type { CosmeticCollection, CosmeticId, CosmeticLoadout, TitleId } from '../../core/cosmetics/types';

export interface CosmeticRepository {
  load(): Promise<CosmeticCollection>;
  grantCosmetic(cosmeticId: CosmeticId, source: 'store' | 'challenge' | 'season' | 'ranking' | 'achievement' | 'event'): Promise<CosmeticCollection>;
  grantTitle(titleId: TitleId): Promise<CosmeticCollection>;
  equip(loadout: CosmeticLoadout): Promise<CosmeticCollection>;
}
