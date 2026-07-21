# Molgang ↔ VirtualPC integratie — onderzoek

> Status: onderzoek afgerond. Nog niet geïmplementeerd.
> Doel: VirtualPC-agents laten spelen op `https://5mart.ml/molgang` en onderzoeken welke LLM-modellen vanaf PHP / TransIP shared hosting bruikbaar zijn.

## 1. Wat is Molgang vandaag?

Repo: `github.com/knitweb/molgang`  
Live doel: `https://5mart.ml/molgang`

Molgang is een **peer-to-peer scheikunde-leerspel** op de Knitweb. De PHP-port (`php/`) is bewust gemaakt voor **shared hosting** (TransIP / 5mart.ml): geen langlopend proces, alleen PHP 8 + MySQL.

Belangrijke API-routes (JSON, machine-playable):

| Methode | Route | Wat het doet |
|---|---|---|
| POST | `/api/join` | nieuwe speler + wallet + faucet |
| POST | `/api/sit` | plaatsnemen aan een tafel |
| POST | `/api/propose` | term/knit voorstellen |
| POST | `/api/vote` | stemmen op een voorstel |
| GET  | `/api/state?sid=...` | volledige staat van de bar |
| GET  | `/api/web` | geweven web (knopen + links) |
| GET  | `/api/graph?...` | graph-explorer data |
| POST/GET | `/api/presence` | desktop ↔ browser awareness |
| POST/GET | `/api/relay/*` | signed HTTP relay voor P2P nodes |
| POST/GET | `/api/onboard/*` | wallet-signed QR onboarding |

De frontend (`php/public/app.js`) gebruikt dezelfde routes, dus bots kunnen precies dezelfde acties doen als menselijke spelers.

## 2. VirtualPC integratiepunten

VirtualPC heeft een **MCP-tool registry** (`src/integrations/mcp/registry.ts`) met:

- `callTool(agentName, toolName, args)` — voert een tool uit met ACL-check.
- HTTP endpoints:
  - `GET  /api/mcp/tools?agent=...` — tools waar een agent bij mag.
  - `POST /api/mcp/call` — voer een tool uit.

Elke agent in `src/agent-registry.ts` heeft een `tools` array (ACL). Nieuwe tools worden geregistreerd in `src/integrations/mcp/registry.ts`.

### Optie A — VirtualPC agent belt Molgang REST rechtstreeks

Eenvoudigste patroon: voeg `molgang.*` tools toe aan VirtualPC die HTTP doen naar `https://5mart.ml/molgang/api/*`.

Voorbeeld-tools:

- `molgang.join(name, avatar)` → `POST /api/join`
- `molgang.sit(sid, table)` → `POST /api/sit`
- `molgang.propose(sid, term)` → `POST /api/propose`
- `molgang.vote(sid, pid, verdict)` → `POST /api/vote`
- `molgang.state(sid)` → `GET /api/state`
- `molgang.web()` → `GET /api/web`

Agents kunnen dan via de VirtualPC API of task engine het spel besturen. Werkt zelfs als VirtualPC achter NAT zit, want het doet **uitgaande HTTPS** naar 5mart.ml.

### Optie B — Molgang PHP belt een LLM / VirtualPC

Als je AI in de PHP-kant zelf wilt (bijv. een NPC die termen bedenkt), moet PHP een HTTP-request doen naar een extern model. Op shared hosting kan dat **niet** lokaal; je hebt drie opties:

1. **Cloud API rechtstreeks vanuit PHP** — Z.AI, OpenAI, Anthropic, etc.
2. **VirtualPC LiteLLM gateway** — alleen als die publiek bereikbaar is.
3. **Een andere server/VPS** waar je zelf een model draait.

### Optie C — Bidirectioneel via de bestaande Knitweb relay

Molgang heeft al een signed HTTP relay (`/api/relay/*`). VirtualPC zou zich kunnen onboarden als een knitweb node en berichten uitwisselen via 5mart.nl. Dat is robuuster voor P2P, maar complexer dan optie A. Aanbevolen als je uiteindelijk écht peer-to-peer wilt; niet nodig voor “agents spelen Molgang”.

## 3. Welke modellen kunnen via PHP / TransIP?

### Shared-hosting harde grenzen

- **Geen langlopende processen** → je kunt geen LM Studio / Ollama / vLLM draaien.
- **Geen inbound TCP** → je kunt geen model-server hosten die van buiten bereikbaar is (de perimeter firewall blokkeert inkomend).
- **Outbound HTTPS (cURL) is meestal wel toegestaan** op shared hosting, maar niet gegarandeerd. TransIP documenteert dit niet expliciet; je moet het testen.

### Conclusie: enkel cloud-modellen via cURL

Als outbound HTTPS werkt, kan PHP deze endpoints aanroepen:

| Provider | Endpoint | Model voorbeeld | Kosten |
|---|---|---|---|
| **Z.AI Coding Plan** (jouw abonnement) | `https://api.z.ai/api/coding/paas/v4` | `glm-5.2`, `glm-4.6v` | al betaald via abonnement |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-5.5` | pay-as-you-go |
| Anthropic | `https://api.anthropic.com/v1` | `claude-sonnet-4-6` | pay-as-you-go |
| Groq / OpenRouter / etc. | eigen base URL | diverse | pay-as-you-go |

### Z.AI in PHP

Voorbeeld (placeholder, geen echte key):

```php
<?php
function zai_chat(string $prompt, string $apiKey): string {
    $ch = curl_init('https://api.z.ai/api/coding/paas/v4/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'glm-5.2',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'max_tokens' => 512,
        ]),
        CURLOPT_TIMEOUT => 60,
    ]);
    $resp = curl_exec($ch);
    if ($resp === false) {
        throw new Exception('Z.AI cURL error: ' . curl_error($ch));
    }
    curl_close($ch);
    $data = json_decode($resp, true);
    return $data['choices'][0]['message']['content'] ?? '';
}
```

**Let op:** gebruik **altijd** het `/api/coding/paas/v4` endpoint voor een Coding Plan. Het standaard `api.z.ai/api/paas/v4` endpoint is pay-as-you-go en geeft error `1113` als daar geen saldo staat.

### TransIP-test

Upload een klein PHP-probe-bestand (geen API-key nodig, test alleen netwerk):

```php
<?php
$ch = curl_init('https://api.z.ai/');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$resp = curl_exec($ch);
echo $resp === false ? 'FAIL: ' . curl_error($ch) : 'OK: HTTP bereikbaar';
```

Als dit `OK` geeft, kun je cloud LLM’s vanaf TransIP gebruiken.

## 4. Aanbevolen eerste implementatie

1. **VirtualPC kant:**
   - Voeg `molgang.*` tools toe aan `src/integrations/mcp/registry.ts`.
   - Maak een nieuwe agent `Molgang-Player` (of geef `Vice` / `Tester-RB-*` de tools).
   - Configureer de base URL via env var `MOLGANG_URL=https://5mart.ml/molgang`.

2. **Optioneel — Molgang NPC kant:**
   - Voeg aan `php/src/` een kleine `Npc.php` toe die Z.AI aanroept via cURL.
   - Sla `ZAI_API_KEY` op in `php/config.php` (gitignored), nooit in de repo.
   - Test eerst met de netwerk-probe hierboven.

3. **Security:**
   - Geen API-keys in git.
   - Geen private keys van knitweb wallets in logs.
   - Rate-limit LLM-calls en monitor kosten.

## 5. Open vragen

- Werkt outbound HTTPS vanaf de TransIP/5mart.ml shared host? (test met probe)
- Wil je dat VirtualPC **speelt** (optie A) of dat Molgang zelf AI-NPC’s krijgt (optie B)?
- Moet VirtualPC publiek bereikbaar zijn, of gebruiken we de bestaande relay (optie C)?
