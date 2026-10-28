"""Cyberbullying Detection System - Flask application.

Pages:  /  (analyse a message)   /batch  (analyse a CSV)   /about  (model + pipeline)
API:    POST /api/analyze   POST /api/batch   GET /api/model-info   GET /api/health
"""
import csv
import io
import os
import re
import string

import joblib
import numpy as np
from flask import Flask, jsonify, render_template, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024  # 2 MB upload limit

MAX_TEXT_CHARS = 2000
MAX_BATCH_ROWS = 2000

# ------------------------------------------------------------------ artifacts
model = joblib.load(os.path.join(MODEL_DIR, "cyberbullying_model.pkl"))
vectorizer = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
CLASSES = [str(c) for c in model.classes_]
# Flexible non-cyberbullying class detection
NONE_NAME = next((c for c in ("none", "not_cyberbullying", "neither", "0", "clean") if c in CLASSES), CLASSES[0])
NONE_IDX = CLASSES.index(NONE_NAME)
FEATURES = vectorizer.get_feature_names_out()

# ------------------------------------------------------------------ stopwords
try:
    from nltk.corpus import stopwords
    STOPWORDS = set(stopwords.words("english"))
except Exception:
    try:
        import nltk
        nltk.download("stopwords", quiet=True)
        from nltk.corpus import stopwords
        STOPWORDS = set(stopwords.words("english"))
    except Exception:  # offline fallback: NLTK's English list
        STOPWORDS = set("""i me my myself we our ours ourselves you you're you've you'll you'd your
        yours yourself yourselves he him his himself she she's her hers herself it it's its itself they
        them their theirs themselves what which who whom this that that'll these those am is are was were
        be been being have has had having do does did doing a an the and but if or because as until while
        of at by for with about against between into through during before after above below to from up
        down in out on off over under again further then once here there when where why how all any both
        each few more most other some such no nor not only own same so than too very s t can will just
        don don't should should've now d ll m o re ve y ain aren aren't couldn couldn't didn didn't doesn
        doesn't hadn hadn't hasn hasn't haven haven't isn isn't ma mightn mightn't mustn mustn't needn
        needn't shan shan't shouldn shouldn't wasn wasn't weren weren't won won't wouldn wouldn't""".split())

URL_RE = re.compile(r"http\S+|www\.\S+")
MENTION_RE = re.compile(r"@\w+")
NUMBER_RE = re.compile(r"\d+")
PUNCT_TABLE = str.maketrans("", "", string.punctuation)


# ------------------------------------------------------------------ core logic
def preprocess(text: str) -> str:
    """Same cleaning as training: lowercase, URLs, @mentions, punctuation, numbers, stopwords."""
    text = text.lower()
    text = URL_RE.sub(" ", text)
    text = MENTION_RE.sub(" ", text)
    text = text.translate(PUNCT_TABLE)
    text = NUMBER_RE.sub(" ", text)
    return " ".join(t for t in text.split() if t not in STOPWORDS)


def get_scores(X):
    """Return decision scores or class probabilities across any model type."""
    if hasattr(model, "decision_function"):
        s = model.decision_function(X)
        if len(CLASSES) == 2 and s.ndim == 1:
            # Binary decision function returns 1D distance; map to 2D
            s = np.column_stack([-s, s])
        return s
    elif hasattr(model, "predict_proba"):
        return model.predict_proba(X)
    else:
        preds = model.predict(X)
        one_hot = np.zeros((len(preds), len(CLASSES)))
        for i, p in enumerate(preds):
            p_str = str(p)
            if p_str in CLASSES:
                one_hot[i, CLASSES.index(p_str)] = 1.0
        return one_hot


def softmax(scores):
    if hasattr(model, "predict_proba") and not hasattr(model, "decision_function"):
        s = np.array(scores, dtype=float)
        total = s.sum()
        return s / total if total > 0 else s
    e = np.exp(scores - scores.max())
    return e / e.sum()


def decide(scores):
    """Return (predicted_class_index, flagged) from one row of decision scores.
    Equivalent to model.predict(): the highest-scoring class wins."""
    idx = int(np.argmax(scores))
    return idx, idx != NONE_IDX


def explain(raw, X, class_idx):
    """Split the original text into segments with a 0-1 weight showing how strongly each
    word pushed the model toward `class_idx`."""
    contrib = {}
    row = X.tocoo()
    has_coef = hasattr(model, "coef_")
    for col, val in zip(row.col, row.data):
        parts = FEATURES[col].split()
        if has_coef:
            coef_matrix = model.coef_
            if coef_matrix.shape[0] == 1 and len(CLASSES) == 2:
                # Binary linear model has 1 row of coefficients
                c_val = coef_matrix[0, col] if class_idx == 1 else -coef_matrix[0, col]
            elif class_idx < coef_matrix.shape[0]:
                c_val = coef_matrix[class_idx, col]
            else:
                c_val = 1.0
            share = val * c_val / len(parts)
        else:
            share = val / len(parts)
        for p in parts:
            contrib[p] = contrib.get(p, 0.0) + share
    top = max([v for v in contrib.values() if v > 0], default=0.0)

    segments = []
    for seg in re.findall(r"\s+|\S+", raw):
        w = 0.0
        if not seg.isspace() and top > 0:
            w = max(0.0, contrib.get(preprocess(seg), 0.0)) / top
        segments.append({"t": seg, "w": round(w, 2)})
    terms = sorted(((k, v) for k, v in contrib.items() if v > 0), key=lambda kv: -kv[1])[:5]
    return segments, [t for t, _ in terms]


def analyse(raw):
    cleaned = preprocess(raw)
    if not cleaned:
        return {"error": "Nothing to analyse after cleaning. Add some words beyond links, mentions or numbers."}
    X = vectorizer.transform([cleaned])
    scores = get_scores(X)[0]
    idx, flagged = decide(scores)
    probs = softmax(scores)
    segments, terms = explain(raw, X, idx)
    return {
        "flagged": flagged,
        "label": "Cyberbullying" if flagged else "Non-Cyberbullying",
        "category": CLASSES[idx] if flagged else None,
        "confidence": round(float(probs[idx]) * 100, 1),
        "scores": {c: round(float(p) * 100, 1) for c, p in zip(CLASSES, probs)},
        "segments": segments,
        "key_terms": terms,
        "cleaned": cleaned,
    }


# ------------------------------------------------------------------ pages
@app.route("/")
def index():
    return render_template("index.html", page="analyse")


@app.route("/batch")
def batch():
    return render_template("batch.html", page="batch", max_rows=MAX_BATCH_ROWS)


@app.route("/about")
def about():
    info = {
        "model": type(model).__name__,
        "classes": CLASSES,
        "features": len(FEATURES),
        "ngram": vectorizer.ngram_range,
    }
    return render_template("about.html", page="about", info=info)


CATEGORY_NAMES = {
    "gender_sexism": "Sexism / Gender",
    "gender": "Sexism / Gender",
    "sexism": "Sexism",
    "racism_ethnicity": "Racism / Ethnicity",
    "ethnicity": "Racism / Ethnicity",
    "racism": "Racism",
    "religion": "Religious Bullying",
    "age": "Age-Based Bullying",
    "offensive_language": "Offensive Language",
    "hate_speech": "Hate Speech",
    "other_cyberbullying": "Other Cyberbullying",
    "not_cyberbullying": "Non-Cyberbullying",
    "none": "Non-Cyberbullying",
    "neither": "Non-Cyberbullying",
    "0": "Non-Cyberbullying",
    "1": "Cyberbullying",
}


def format_category_label(name: str) -> str:
    """Format category identifier to readable label."""
    return CATEGORY_NAMES.get(name, name.replace("_", " ").title())


# ------------------------------------------------------------------ API
@app.post("/api/analyze")
def api_analyze():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Enter some text to analyse."}), 400
    if len(text) > MAX_TEXT_CHARS:
        return jsonify({"error": f"Text is too long. Keep it under {MAX_TEXT_CHARS} characters."}), 400
    result = analyse(text)
    return (jsonify(result), 422) if "error" in result else jsonify(result)


@app.post("/api/batch")
def api_batch():
    upload = request.files.get("file")
    if not upload or not upload.filename:
        return jsonify({"error": "Choose a CSV file to upload."}), 400
    try:
        stream = io.StringIO(upload.read().decode("utf-8-sig"))
        reader = csv.reader(stream)
        header = next(reader)
    except (UnicodeDecodeError, StopIteration):
        return jsonify({"error": "Could not read the file. Upload a UTF-8 CSV with a header row."}), 400

    names = [h.strip().lower() for h in header]
    col = next((names.index(n) for n in ("text", "tweet", "message", "comment", "content") if n in names), 0)

    texts = []
    for row in reader:
        if len(row) > col and row[col].strip():
            texts.append(row[col].strip()[:MAX_TEXT_CHARS])
        if len(texts) >= MAX_BATCH_ROWS:
            break
    if not texts:
        return jsonify({"error": "No text found in the file. Put messages in a column named 'text'."}), 400

    cleaned = [preprocess(t) for t in texts]
    scores = get_scores(vectorizer.transform(cleaned))
    rows, counts = [], {c: 0 for c in CLASSES}
    for i, (t, c, s) in enumerate(zip(texts, cleaned, scores), start=1):
        idx, flagged = decide(s)
        counts[CLASSES[idx]] += 1
        rows.append({
            "row": i, "text": t,
            "label": "Cyberbullying" if flagged else "Non-Cyberbullying",
            "category": CLASSES[idx] if flagged else "",
            "confidence": round(float(softmax(s)[idx]) * 100, 1),
        })
    flagged_total = len(rows) - counts.get(NONE_NAME, 0)
    return jsonify({"rows": rows, "total": len(rows), "flagged": flagged_total,
                    "counts": counts, "column": header[col], "truncated": len(rows) >= MAX_BATCH_ROWS})


@app.get("/api/model-info")
def api_model_info():
    return jsonify({"model": type(model).__name__, "classes": CLASSES,
                    "features": len(FEATURES), "ngram_range": list(vectorizer.ngram_range)})


@app.get("/api/health")
def api_health():
    return jsonify({"status": "ok"})


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": "File is too large. The limit is 2 MB."}), 413


if __name__ == "__main__":
    app.run(debug=True)
