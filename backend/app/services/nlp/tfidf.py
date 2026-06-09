from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

from app.services.nlp.preprocessor import tokenize_sentences, clean_text


def summarize_tfidf(text: str, ratio: float = 0.3) -> str:
    """
    Extractive summarization using TF-IDF sentence scoring.
    Sentences are ranked by their average TF-IDF score across all terms.
    """
    cleaned = clean_text(text)
    sentences = tokenize_sentences(cleaned)

    if len(sentences) <= 2:
        return cleaned

    n_sentences = max(1, round(len(sentences) * ratio))

    try:
        vectorizer = TfidfVectorizer(stop_words="english", min_df=1)
        tfidf_matrix = vectorizer.fit_transform(sentences)
    except ValueError:
        # Fallback: all sentences are stop words or empty
        return " ".join(sentences[:n_sentences])

    # Score each sentence by its mean TF-IDF value
    scores = np.array(tfidf_matrix.mean(axis=1)).flatten()

    # Rank sentences but preserve original order
    ranked_indices = np.argsort(scores)[::-1][:n_sentences]
    selected_indices = sorted(ranked_indices)

    return " ".join(sentences[i] for i in selected_indices)
