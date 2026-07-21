# VirtualPC Data Science Wiki

A concise knowledge base for using VirtualPC agents on data-science work. It covers the standard workflow, essential Python libraries, common pitfalls and copy-pasteable examples.

> **Audience:** agent developers, analysts and anyone who wants the VirtualPC workforce to build, evaluate or explain data-science pipelines.

---

## 1. The DS workflow — CRISP-DM light

| Phase | Question | Typical agent owner |
|-------|----------|---------------------|
| **Business understanding** | What decision are we supporting? | CEO Fill, Croesus |
| **Data understanding** | What do we have, what is missing, what is dirty? | Analyst, Governor |
| **Preparation** | Clean, encode, split | Analyst, Pixel |
| **Modeling** | Train + validate models | Analyst, Atlas |
| **Evaluation** | Metrics, fairness, interpretability | Athena, Analyst |
| **Deployment** | API endpoint, dashboard, retrain loop | Kai, Zip, Pixel |

---

## 2. Essential libraries

| Library | Use case | Install |
|---------|----------|---------|
| `pandas` | Tables, joins, group-by, CSV/Parquet I/O | `pip install pandas` |
| `numpy` | Numerical arrays and linear algebra | `pip install numpy` |
| `matplotlib` / `seaborn` | Static charts and statistical plots | `pip install matplotlib seaborn` |
| `scikit-learn` | Classification, regression, clustering, metrics, pipelines | `pip install scikit-learn` |
| `xgboost` / `lightgbm` | Gradient boosted trees for tabular data | `pip install xgboost lightgbm` |
| `jupyter` | Interactive notebooks | `pip install jupyterlab` |

VirtualPC expects these in the environment that runs the `Analyst` and `Atlas` agents. Pin versions in `requirements-ds.txt`.

---

## 3. 10-minute starter pipeline

See `examples/data-science/starter.py` for a runnable version of the snippet below.

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix

# 1. Load
url = "https://raw.githubusercontent.com/datasciencedoc/data/main/titanic_sample.csv"
df = pd.read_csv(url)

# 2. Quick profile
print(df.info())
print(df.describe(include='all').T.head())

# 3. Minimal cleaning
features = ['Pclass', 'Sex', 'Age', 'Fare']
df['Sex'] = df['Sex'].map({'male': 0, 'female': 1})
df['Age'] = df['Age'].fillna(df['Age'].median())
df['Fare'] = df['Fare'].fillna(df['Fare'].median())

X = df[features]
y = df['Survived']

# 4. Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 5. Model pipeline
pipe = Pipeline([
    ('scale', StandardScaler()),
    ('clf', LogisticRegression(max_iter=1000))
])

pipe.fit(X_train, y_train)

# 6. Evaluate
y_pred = pipe.predict(X_test)
print(classification_report(y_test, y_pred))
print(confusion_matrix(y_test, y_pred))
```

---

## 4. Key concepts

### Train / validation / test split
- **Training set** — what the model learns from.
- **Validation set** — used during tuning (hyper-parameters, early stopping).
- **Test set** — used exactly once to report final performance.

Rule of thumb: 70/15/15 or 80/10/10. Always stratify on the target for classification.

### Overfitting vs underfitting
- **Overfitting** — great on training data, poor on new data. Fix: more data, simpler model, regularisation, cross-validation.
- **Underfitting** — poor on both. Fix: richer features, more complex model, longer training.

### Metrics cheat sheet

| Problem type | Primary metric | When to use |
|--------------|----------------|-------------|
| Binary classification | ROC-AUC, F1 | Imbalanced classes |
| Multi-class | accuracy, F1 macro | Balanced classes |
| Regression | RMSE, MAE | Continuous target |
| Ranking | NDCG, MAP | Search/recommendations |

### Pipelines are mandatory
Use `sklearn.pipeline.Pipeline` so preprocessing is fitted only on training data and applied identically at inference time. This prevents data leakage.

---

## 5. Common pitfalls

1. **Data leakage** — never fit preprocessing on the full dataset before splitting.
2. **Target leakage** — do not include features that would not be available at prediction time.
3. **Imbalanced classes** — accuracy can lie; use F1, precision/recall or class weights.
4. **Categorical high cardinality** — one-hot encoding 10 000 ZIP codes explodes memory; use target encoding or embeddings.
5. **Ignoring missingness mechanism** — `fillna(0)` can hide informative missing values.

---

## 6. Agent responsibilities for DS tasks

| Agent | DS responsibility |
|-------|-------------------|
| **Analyst** | Exploratory data analysis, feature reports, metric dashboards |
| **Governor** | Data lineage, schema registry, licence tracking for datasets |
| **Atlas** | Simulation realism, synthetic data generation, AR/VR metrics |
| **Athena** | Reviews model code for leakage, reproducibility and standards |
| **Pixel** | Builds Streamlit/Next.js dashboards to surface insights |
| **Kai** | Designs ML-serving API and model-update strategy |

---

## 7. Example prompts for agents

- **Analyst:** *“Profile the CSV at data/sales.csv, list the top 3 drivers of churn and produce a bar chart.”*
- **Governor:** *“Register this dataset in the governance registry with owner=Analyst, licence=CC-BY-4.0 and lineage URL.”*
- **Atlas:** *“Generate 1 000 synthetic user sessions that preserve the marginal distributions in data/sessions.parquet.”*
- **Athena:** *“Review examples/data-science/starter.py for data leakage and missing stratification.”*

---

## 8. Further reading

- `examples/data-science/starter.py` — runnable Titanic baseline
- `docs/AGENT-MODEL-ROSTER.md` — which local models the Analyst/Atlas agents use
- `docs/LINEAGE-EXAMPLES.md` — concrete lineage, schemas and business glossary for data pipelines
- `public/lineage.html` — visual explanation of traceability and anti-blackbox governance
- `docs/API-ENDPOINTS.md` — how to expose a model via the VirtualPC API
- Scikit-learn docs: https://scikit-learn.org/stable/
- Pandas docs: https://pandas.pydata.org/docs/
