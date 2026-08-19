# Economy and Store Specification

Status legend: **DECIDED** = agreed product rule; **TBD** = intentionally unresolved.

## DECIDED — Currency
The game's general-purpose currency is **Queen Coin (QC)**.

UI may display balances such as `1,280 QC`, while application/core business logic must depend on an abstract Wallet/currency model rather than hard-coding payment-platform behavior.

## DECIDED — Wallet
Wallet is an abstract application boundary. It must support future acquisition sources without coupling game logic to Apple, Google, Web, or a particular payment provider.

QC can be used to purchase:
- assist consumables;
- purchasable cosmetic crowns;
- board/background themes;
- crown reveal effects;
- other approved cosmetic content.

Exact earning rates, prices, bundles and real-money purchase strategy remain TBD.

## DECIDED — Assist consumables
Initial consumable products:
- `solve-step` — 推演一步
- `solve-next-queen` — 推演到下一個皇后

Both can be offered by the store and are tracked in player inventory.

## DECIDED — Daily sign-in reward
Daily sign-in rewards require an authenticated account. Anonymous players can play and save local progress, but authentication provides the incentive/benefit of daily rewards.

Current agreed daily reward quantity:
- 推演一步 ×3
- 推演到下一個皇后 ×1

The reward is granted into the same inventory used by store purchases.

## DECIDED — Local First + authentication
- Anonymous players start without registration friction.
- Local progress remains available before login.
- On authentication, existing progress is associated with the account.
- Daily sign-in and global leaderboard participation are account benefits.

## TBD
- QC earning sources and amounts.
- QC prices for each product.
- Whether QC itself is purchasable for real money and, if so, platform-specific purchase rules.
- Store bundles, promotions and economy balancing.
