# Lessons from our Predecessors — a Frontend Design Analysis

*Newsgroup 2.0 frontend design document. Public — share freely.*

Before building the frontend for a P2P, attention-ranked, token-incentivized
news network, we studied four decades of predecessors: what made each one
grow, what killed or crippled it, and which of those lessons are mechanism
design (our protocol layer already handles them) versus interface design
(this document's subject). Every lesson ends in a concrete, testable design
decision for our frontend (`public/newsgroup.html`).

---

## 1. Usenet (1980) — the original newsgroup

**What it got right**

- *Threading as a first-class structure.* Usenet readers (rn, trn, tin)
  treated a discussion as a tree, not a flat list. trn's thread-tree
  navigation (1990s) let users traverse hundreds of messages with single
  keystrokes.
- *Client-side kill files.* Users filtered abusive posters locally, without
  any central moderator. The network stayed neutral; the *reading
  experience* was personal.
- *Offline-first reading.* NNTP clients synced and read locally — latency
  never blocked reading.

**What killed it**

- *The September that never ended (1993).* When AOL connected its users to
  Usenet, the influx permanently outpaced the community's capacity to teach
  norms. There was **no onboarding layer** — new users saw the same raw
  firehose as veterans, and no mechanism rewarded good behavior.
- *Spam had no cost.* The Canter & Siegel "Green Card" spam (1994) was
  rational: posting cost nothing, attention was free to take. Usenet's
  binary trust model (you're a peer or you're not) had no economic gradient.
- *No identity continuity.* Anyone could post as anyone. Server-side
  cancel wars and forged control messages were endemic.

**Our inheritance**

| Lesson | Where we apply it |
|---|---|
| Keyboard-first navigation (trn) | `j`/`k` item navigation, single-key reactions in the frontend |
| Local filtering beats central censorship | Client-side claimer mute list (localStorage), the protocol stays neutral |
| Spam must cost something | Attention-weighted ranking: unverified claims with no reactions decay to invisibility within 24h (half-life), without anyone moderating |
| Identity continuity | Every claim is Ed25519-signed by a DID; the frontend shows the signature state on every item |

---

## 2. Slashdot (1997) — metamoderation and karma

**What it got right**

- *Bounded moderation power.* Moderators got 5 points that expired in 3
  days. Power was rotating and scarce — no permanent moderator class.
- *Metamoderation (1999).* Moderation decisions were themselves reviewed by
  randomly selected users — the first practical "who watches the watchers"
  at scale.
- *Score capping (−1 to +5).* A comment couldn't accumulate unbounded
  score, which kept ranking competitive: yesterday's +5 didn't crowd out
  today's insight.

**What crippled it**

- Karma became a *target* (Goodhart's law). "Karma whoring" — posting safe,
  early, agreeable comments — was the dominant strategy years before
  Reddit made it famous.

**Our inheritance**

| Lesson | Where we apply it |
|---|---|
| Bounded, decaying influence | Attention scores decay with a 24h half-life at the protocol layer — yesterday's hit does not crowd out today's |
| Visible score breakdown | The frontend shows attention score AND the per-kind reaction counts (like/share/reply/validate), never one opaque number |
| Anti-Goodhart | Validates (weight 5) cost more reputation risk than likes (weight 1) — the frontend makes the *costlier* signal the *more prominent* button on hover, not the cheaper one |

---

## 3. Digg (2004) → Reddit (2005) — the vote economy and its capture

**Digg's collapse is the single most instructive event in this catalog.**

- *Power-user capture.* By 2008, the top 100 Digg users controlled ~56% of
  the front page. Influence concentrated because votes were free, identity
  was cheap, and there was no decay.
- *The v4 betrayal (2010).* Digg redesigned to favor publisher feeds over
  user submissions, broke its own community's mental model overnight, and
  lost most of its traffic to Reddit within weeks. **Lesson: the feed's
  ranking rules are a social contract.** Changing them invisibly is fatal.
- Reddit survived (initially) on two design choices: *subreddits* (any
  community can fork the namespace, so capture of one space doesn't capture
  the platform) and *logarithmic vote weighting* in the hot algorithm
  (the 10th upvote matters less than the 1st: `log10(max(|score|,1))` —
  early velocity beats accumulated mass).

**Reddit's own decay mechanisms worth copying**

The classic Reddit "hot" formula ranks by `log10(votes) + age_seconds /
45000` — meaning a story needs **10× the votes to beat a story 12.5 hours
younger**. This is the same exponential-decay insight our attention chain
implements cryptographically (`score = Σ w·2^(−age/halfLife)`).

**Our inheritance**

| Lesson | Where we apply it |
|---|---|
| Ranking is a social contract | The frontend SHOWS the ranking mode ("Hot = attention-decay ranked") and lets users switch to raw chronological at one click — no dark patterns |
| Velocity over mass | Protocol-level half-life decay; frontend "Trending" tab uses a 24h window |
| No invisible rule changes | Ranking explanation is one tap away — the attention score and its decay model are documented in the UI |
| Capture resistance | One-reaction-per-kind-per-agent at the API layer; stake-weighted voting splits don't multiply influence (sybil-resistant by protocol) |

---

## 4. Hacker News (2007) — restraint as a feature

**What it got right**

- *A deliberately impoverished interface.* No images, no infinite scroll,
  no notification badges. The absence of engagement mechanics IS the
  product: HN selects for users who want text.
- *Single-keystroke economy.* Upvote is one click; everything is reachable
  by keyboard.
- *The second-chance pool.* Moderators re-surface good stories that got
  unlucky timing — acknowledging that pure vote ranking has high variance
  on low samples.
- *Flame-war dampening:* stories with disproportionate comment-to-vote
  ratios get algorithmically cooled.

**What it quietly struggles with**

- Opaque moderation (shadow-banning, unexplained rank penalties) is a
  recurring community grievance — the cost of invisible rules, again.

**Our inheritance**

| Lesson | Where we apply it |
|---|---|
| Text-first, no engagement bait | No infinite scroll — explicit "Load more". No notification badges. No autoplay anything. |
| Keyboard economy | `j`/`k` navigate, `l` like, `v` validate, `o` open source link, `/` focus search |
| Variance on low samples | New items get a "fresh" badge for their first hour instead of being buried at 0 attention |
| Transparent rules | Every ranking input is visible in the item's detail view (per-kind counts, age, decay) |

---

## 5. Twitter/X (2006) — the timeline wars

**The single most copied-and-regretted change in social software:** the
2016 switch from chronological to algorithmic timeline. What two decades of
A/B testing settled:

- *Algorithmic feeds win engagement metrics and lose user trust* —
  platforms that removed the chronological option (Instagram 2016, Twitter
  briefly) all restored it under pressure.
- *Unread-content anxiety is a dark pattern.* "While you were away" boxes
  and shifting feeds train compulsive checking.
- *Layout shift is theft.* Inserting new content above the viewport while
  the user reads steals their reading position. Twitter's solution — the
  "N new Tweets" pill that loads *only on click* — is the correct pattern
  and we adopt it verbatim.

**Our inheritance**

| Lesson | Where we apply it |
|---|---|
| Both orderings, user-controlled, persistent | Hot/New tabs; the choice persists in localStorage; neither is "default with friction" |
| No layout shift | SSE live items buffer behind a "🔴 N new claims" pill; the feed NEVER moves under the reader |
| No engagement anxiety | No unread counts, no streaks, no "you missed" |

---

## 6. Steemit / Hive (2016) — token-incentivized content, attempt #1

The closest predecessor to our economic model, and the richest source of
failure data.

**What it proved possible**

- Paying authors per-post from token inflation *does* bootstrap a content
  network from zero.
- On-chain, publicly auditable reward distribution removed the "is the
  platform skimming?" question entirely.

**What it got wrong — all four are mechanism lessons we already absorbed at the protocol layer, but each has a frontend component:**

1. *Linear (then superlinear) stake-weighted curation made whales
   kingmakers.* A single large stakeholder's vote outweighed thousands of
   readers. → Our reactions mint **fixed era-scaled rewards** regardless of
   reactor's balance; stake only weights *governance* votes, not content
   ranking.
2. *Bid-bots: paid visibility laundered as curation.* By 2018, a large
   fraction of "trending" was purchased. The frontend lesson: **trending
   must show its receipts** — our trending tab displays the actual reaction
   counts and reactor counts, so purchased-looking patterns (high score,
   3 reactors) are visually obvious.
3. *Self-voting and circular voting rings.* → protocol: self-reactions are
   allowed but only mint to *registered author DIDs* at era-decaying rates;
   ranking decays in 24h, so a ring must spend forever to stay visible.
4. *The first-mover oligarchy never dissolved* (the "ninja-mined" stake).
   → our supply has no premine; every token is minted by attention events
   or block rewards under the same halving schedule from block zero.

**Justin Sun / Hive fork postscript (2020):** when Steemit Inc.'s stake was
used (with exchange collusion) to seize governance, the community forked to
Hive within weeks, *zeroing out the attacker's balance in the fork*. The
deepest lesson in this entire document: **the community's exit option is
the ultimate check on protocol capture.** Our equivalent: all state is
exportable (`exportState()`), all claims are self-certifying — a community
fork carries its full history and identities with it.

---

## 7. Nostr (2020) — radical simplicity, key-pain reality

**What it got right**

- *Events + signatures + relays. Nothing else.* The protocol fits on a
  page; dozens of interoperable clients exist because implementing one
  takes a weekend.
- *Identity = keypair; the network is just distribution.* Exactly our DID
  model.

**What it teaches the hard way**

- *Key management is the #1 user-loss funnel.* Asking newcomers to
  safeguard an nsec **before** they've seen any value guarantees churn.
  Mitigations that emerged: NIP-07 browser extensions (key never touches
  the page), remote signers (NIP-46), and crucially **the client that
  onboards you with a generated key first and teaches custody later**.
- *Replies/threads across relays are inconsistent* — eventual consistency
  needs UI honesty: show what's known, mark what's pending.

**Our inheritance**

| Lesson | Where we apply it |
|---|---|
| Onboard first, custody later | Registration is one field (handle). The node holds the key (`mode: node-held`). The UI offers challenge-response auth for self-custodied keys as an *upgrade*, never a prerequisite |
| Status honesty | Every claim shows its lifecycle badge: `unverified → p2p → anchored` — never pretend more certainty than the protocol has |

---

## 8. Bluesky / Mastodon (2016–2023) — the federation UX tax

- *Mastodon's instance-picker problem:* asking "choose a server" before
  "see the content" cost it the 2022 Twitter-exodus conversion war.
  Bluesky onboarded with a default server and grew 10×.
  **Frontend lesson: defaults are the product.** Our frontend connects to
  its serving node automatically; multi-node is a power-user setting.
- *Bluesky's composable feeds* ("marketplace of algorithms") is the mature
  version of the Digg lesson: ranking should be a user-selectable,
  inspectable component. Our Hot/New/Trending tabs are deliberately that —
  three transparent algorithms, user-switched.
- *Mastodon's quote-post hesitancy* (added only in 2025 after years of
  debate) showed that *removing* affordances to prevent abuse mostly
  exports the conversation elsewhere. We keep shares first-class but make
  them attributable (signed events).

---

## 9. BitTorrent / Tron BTT (2001/2019) — incentives for infrastructure

- BitTorrent solved free-riding with *tit-for-tat*: you upload to peers
  who upload to you. **Optimistic unchoking** (periodically serving a
  random peer "for free") is what lets newcomers bootstrap — a pure
  game-theory solution to the cold-start problem.
- BTT's lesson: when you bolt tokens onto an existing protocol, the token
  must map to a *real scarce resource* (bandwidth, attention) or it's
  decoration. Our tokens map to attention events under a halving schedule.
- **Frontend translation of optimistic unchoking:** the feed reserves a
  slot for a low-attention "fresh" item even in Hot mode — every new claim
  gets at least one chance at an audience. (Implemented as the `fresh`
  badge + new-items always visible in the New tab one click away.)

---

## 10. Synthesis — the ten commandments of this frontend

1. **The feed never moves under the reader.** New items buffer behind a
   click-to-load pill. *(Twitter)*
2. **Ranking is transparent and switchable.** Hot / New / Trending, each
   explained in one sentence in the UI. *(Digg's death, Bluesky's feeds)*
3. **Onboarding is one field.** Handle → DID + welcome bonus + session in
   one call. Custody upgrades come later. *(Nostr's churn)*
4. **Every economic event is visible.** Reaction → "author earned X" toast.
   Wallet history names the reaction that earned each entry. *(Steemit's
   opacity → bid-bots)*
5. **Costlier signals get prominence.** Validate > share > like, in both
   reward and visual weight. *(Slashdot's karma whoring)*
6. **Status honesty.** unverified / p2p / anchored badges on every claim;
   signature verification one tap away. *(Usenet forgeries, Nostr
   relay inconsistency)*
7. **Keyboard-first.** j/k/l/v/o//. Power users are the immune system of a
   content network — court them. *(trn, HN)*
8. **Local mute, neutral protocol.** Filtering is a client concern.
   *(Usenet kill files)*
9. **No engagement dark patterns.** No badges, no streaks, no infinite
   scroll, no autoplay. *(HN's restraint, Twitter's regrets)*
10. **Exit is a feature.** Export your keys, your claims, your balance
    proof from the UI. The credible *threat* of forking keeps the protocol
    honest. *(Hive)*

---

## Appendix: feature → API mapping

| Frontend feature | Backend endpoint |
|---|---|
| Register | `POST /api/users/register` |
| Login (node-held) | `POST /api/users/:handle/session` |
| Login (self-custody) | `GET /api/users/:handle/challenge` + signed response |
| Feed Hot/New | `GET /api/feed?orderBy=attention\|time` |
| Trending | `GET /api/feed/trending?hours=24` |
| Search | `GET /api/feed/search?q=` |
| Live updates | `GET /api/feed/stream` (SSE) |
| Publish | `POST /api/feed/publish` |
| React | `POST /api/feed/:id/react` |
| Wallet | `GET /api/users/:handle/wallet` |
| Send tokens | `POST /api/users/:handle/send` |
| Proposals | `GET/POST /api/sovereign-votes/proposals` |
| Vote | `POST /api/sovereign-votes/proposals/:id/vote` |
| Node health | `GET /api/node/status` |
| Balance proof (exit) | `GET /api/value/proof/:did` |
