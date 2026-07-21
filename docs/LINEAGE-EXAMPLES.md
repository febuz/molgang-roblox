# Concrete lineage & data governance voorbeelden

Dit document laat zien hoe VirtualPC de angst voor "blackbox agenten" wegneemt. We gebruiken een **customer-churn pipeline** als concrete casus: brondata, tussenstappen, modellen, predictions, dashboard en de bijbehorende business glossary.

> **Belangrijkste boodschap:** elk artifact heeft een eigenaar, een schema, een transformatie-script, een lineage-beschrijving en een koppeling aan business-termen. Je kunt elk dashboard-getal terugrekenen naar de bron.

---

## 1. Bestanden

| Bestand | Doel |
|---------|------|
| `examples/lineage/churn-governance.json` | Volledig governance-register voor de pipeline. |
| `examples/lineage/business-glossary.yaml` | Business-glossary met definities, eigenaren en berekeningen. |
| `examples/lineage/schemas/*.json` | JSON Schema's voor bron-, feature-, model- en output-artifacten. |
| `examples/lineage/transforms/*.py` | Python-scripts die de transformaties uitvoeren. |

---

## 2. Pipeline-overzicht

```
raw_customers.csv        ──►  clean_customers.parquet  ──►  features.parquet
                                  (Analyst)                    (Analyst)

raw_subscriptions (DB)   ──►                              ──►  churn_model_v1.pkl
                                                                 (Analyst)
                                                                    │
                                                                    ▼
                                                         churn_predictions.parquet
                                                                    │
                                                                    ▼
                                                         churn_dashboard.html (Pixel)
```

Daarnaast genereert **Atlas** synthetische klanten voor stress-tests.

---

## 3. Business glossary

| Term | Eigenaar | Definitie | Gematerialiseerd in |
|------|----------|-----------|---------------------|
| `active_user` | Analyst | Klant met minstens één betaling in de laatste 90 dagen. | `features` |
| `churn` | Analyst | Eerder actieve klant zonder betaling in de laatste 90 dagen. | `churn_predictions` |
| `risk_score` | Analyst | Kans (0–1) dat een klant binnen 30 dagen churned. | `churn_model_v1`, `churn_predictions` |
| `clv` | Croesus | Geschatte totale omzet per klant in EUR. | `churn_predictions` |
| `pii` | Governor | Data die een natuurlijk persoon kan identificeren. | `raw_customers`, `clean_customers` |

De volledige YAML staat in `examples/lineage/business-glossary.yaml`.

---

## 4. Data modellen

### 4.1 Brondata

`raw_customers.csv` (CRM extract):

| Kolom | Type | Opmerking |
|-------|------|-----------|
| `customer_id` | string | Unieke identifier |
| `name` | string | PII |
| `email` | string | PII |
| `signup_date` | date | |
| `country` | string | ISO-3166-1 alpha-2 |

`raw_subscriptions` (billing database):

| Kolom | Type | Opmerking |
|-------|------|-----------|
| `subscription_id` | string | |
| `customer_id` | string | FK naar klant |
| `plan` | string | |
| `start_date` | date | |
| `end_date` | date | |
| `amount` | decimal | |
| `status` | string | |

### 4.2 Features

`features.parquet` (model-input, geen PII):

| Kolom | Type | Afkomstig van |
|-------|------|---------------|
| `customer_id` | string | clean_customers |
| `tenure_days` | integer | signup_date |
| `total_spend` | decimal | raw_subscriptions |
| `num_support_tickets` | integer | raw_subscriptions |
| `last_payment_days_ago` | integer | raw_subscriptions |
| `is_active` | boolean | business glossary term `active_user` |

### 4.3 Modelkaart

`churn_model_v1.pkl`:

| Eigenschap | Waarde |
|------------|--------|
| Type | binary-classification |
| Framework | scikit-learn |
| Pipeline | StandardScaler + LogisticRegression |
| Training data | `features.parquet` |
| Stratified split | ja |
| Reviewer | Athena |

### 4.4 Predictions

`churn_predictions.parquet`:

| Kolom | Type | Opmerking |
|-------|------|-----------|
| `customer_id` | string | |
| `risk_score` | float [0,1] | business glossary term `risk_score` |
| `clv` | decimal | business glossary term `clv` |
| `prediction_date` | date | |

---

## 5. Governance-register entries

Elk artifact in `examples/lineage/churn-governance.json` volgt het `GovernanceEntry`-formaat uit `src/integrations/governance/index.ts`.

```json
{
  "id": "clean-customers",
  "name": "clean_customers.parquet",
  "kind": "shared-data",
  "owner": "Analyst",
  "source": "s3://virtualpc-data/processed/churn/clean_customers.parquet",
  "schema": "examples/lineage/schemas/clean_customers.schema.json",
  "lineage": "Produced by Analyst from raw_customers.csv. PII pseudonymised, duplicates removed, country codes normalised to ISO-3166-1. Consumed by feature-engineering step. Code: examples/lineage/transforms/clean_customers.py",
  "updatedAt": "2026-06-14T09:15:00Z",
  "license": "proprietary (company-internal)",
  "tags": ["cleaned", "pii-reduced", "intermediate"]
}
```

Belangrijke velden:

- `owner` — de agent die verantwoordelijk is.
- `source` — fysieke locatie van het artifact.
- `schema` — JSON Schema waaraan het artifact moet voldoen.
- `lineage` — menselijk leesbare provenance, inclusief code-referentie.
- `license` en `tags` — governance-metadata (PII, restricted, reviewed, etc.).

---

## 6. Review gate

Het register bevat ook een review-record:

```json
{
  "gate": "deliberation-gates",
  "reviewer": "Athena",
  "artifact": "churn_model_v1",
  "check": "data_leakage_and_stratification",
  "status": "passed",
  "timestamp": "2026-06-14T10:05:00Z"
}
```

Dit garandeert dat het model niet naar de volgende stap mag zonder controle op data leakage.

---

## 7. Traceerbaarheid in de praktijk

**Vraag:** "Waarom heeft klant #42 een risk_score van 0.87?"

**Antwoord via lineage:**

1. `churn_dashboard.html` toont `risk_score` uit `churn_predictions.parquet`.
2. `churn_predictions` is geproduceerd door `examples/lineage/transforms/predict.py` met `churn_model_v1.pkl`.
3. `churn_model_v1` is getraind op `features.parquet` door `examples/lineage/transforms/train_model.py`.
4. `features.parquet` is een join van `clean_customers.parquet` en `raw_subscriptions`.
5. `clean_customers.parquet` komt uit `raw_customers.csv` uit het CRM.
6. De definitie van `risk_score` staat in `business-glossary.yaml`.

Elke stap is controleerbaar, reproduceerbaar en gekoppeld aan een agent en een schema.

---

## 8. Anti-blackbox principes

| Principe | Hoe VirtualPC dit toepast |
|----------|---------------------------|
| **Code is gelinkt** | Elk artifact verwijst naar het transformatie-script. |
| **Schema's zijn verplicht** | Governor valideert artifacts tegen JSON Schema's. |
| **Eigenaarschap is expliciet** | Elk artifact heeft een agent-eigenaar. |
| **PII-tags volgen data** | PII-bronnen en downstream artifacten zijn expliciet gelabeld. |
| **Review gates voor modellen** | Athena controleert op leakage en reproduceerbaarheid. |
| **Business glossary bindt termen** | Termen hebben eigenaren en zijn gekoppeld aan kolommen. |

---

## 9. Uitbreiden naar je eigen pipeline

1. Kopieer `examples/lineage/churn-governance.json` naar `data/governance/<jouw-pipeline>.json`.
2. Voeg business-termen toe aan `data/glossary/<jouw-domein>.yaml`.
3. Schrijf JSON Schema's in `data/schemas/`.
4. Zorg dat elke agent-transformatie een `lineage`-veld vult met code-referentie.
5. Laat Athena reviewen voordat modellen naar productie gaan.

---

## 10. Meer informatie

- `public/lineage.html` — visuele pitch voor stakeholders
- `docs/DATA-SCIENCE-WIKI.md` — data-science workflow en libraries
- `src/integrations/governance/index.ts` — registry-interface
