# Cyberbullying Detection System

A Flask web application that uses Machine Learning and NLP to detect cyberbullying in social media text. It classifies a message as **Non-Cyberbullying** or **Cyberbullying** (racism or sexism) and highlights the words that drove the result.

## Features
- **Analyse page:** paste a message, get the verdict, per-category scores and a marked-up copy of the message showing which words pushed the model hardest
- **Batch page:** upload a CSV (up to 2,000 rows), filter flagged rows, download the results as CSV
- **About page:** pipeline, model details and limitations
- **REST API:** `/api/analyze`, `/api/batch`, `/api/model-info`, `/api/health`
- Recent checks saved in the browser, responsive layout, light and dark mode, keyboard accessible
- Unit tests for the backend

## Project Structure
```
Cyberbullying_Detection/
├── app.py                    # Flask app: preprocessing, prediction, explanation, API
├── requirements.txt
├── README.md
├── models/
│   ├── cyberbullying_model.pkl   # Trained LinearSVC (classes: none, racism, sexism)
│   └── tfidf_vectorizer.pkl      # Fitted TF-IDF vectorizer
├── templates/
│   ├── base.html             # Shared layout and navigation
│   ├── index.html            # Analyse page
│   ├── batch.html            # CSV upload page
│   └── about.html            # Pipeline and limitations
├── static/
│   ├── style.css
│   ├── app.js                # Front-end logic (fetch, rendering, history, CSV download)
│   └── sample_batch.csv      # Example file for the batch page
└── tests/
    └── test_app.py
```

## Pipeline
1. Clean text: lowercase, remove URLs, @mentions, punctuation, numbers and stopwords (NLTK)
2. TF-IDF features (unigrams and bigrams, up to 10,000 features)
3. LinearSVC predicts `none`, `racism` or `sexism`
4. Explanation: each word's TF-IDF value multiplied by the model coefficient for the winning class

## Installation
Requires Python 3.9+.

```bash
cd Cyberbullying_Detection
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python -c "import nltk; nltk.download('stopwords')"
```

## Run

### Windows (One-Click)
Double-click `run.bat` (or run `.\run.bat` in the terminal). It automatically activates the virtual environment, launches the browser at `http://127.0.0.1:5000`, and starts the server.

### Manual
```bash
python app.py
```
Open http://127.0.0.1:5000

## Run the tests
```bash
python -m unittest discover -s tests
```

## API
```bash
curl -X POST http://127.0.0.1:5000/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"text": "your message here"}'
```
Response fields: `flagged`, `label`, `category`, `confidence`, `scores`, `segments` (word weights), `key_terms`, `cleaned`.

Batch: `POST /api/batch` with a multipart `file` field. The text column is `text`, `tweet`, `message`, `comment` or `content`, otherwise the first column.

## Notes and Limitations
- `scikit-learn==1.6.1` is pinned because the model files were saved with that version.
- The model only learned racism and sexism. Other abuse, such as general insults, can be labelled Non-Cyberbullying.
- LinearSVC has no probabilities. The confidence shown is a softmax of the decision scores, so treat it as approximate.
- Fonts load from Google Fonts when online and fall back to system fonts when offline.
- Results should support, not replace, human moderation.
