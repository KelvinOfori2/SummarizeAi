import re
import nltk
from typing import List

# Ensure required NLTK data is present
def _ensure_nltk_data():
    for pkg in ["punkt", "punkt_tab", "stopwords"]:
        try:
            nltk.download(pkg, quiet=True)
        except Exception:
            pass

_ensure_nltk_data()

from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize

STOPWORDS_EN = set(stopwords.words("english"))


def clean_text(text: str) -> str:
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def tokenize_sentences(text: str) -> List[str]:
    sentences = sent_tokenize(text)
    return [s.strip() for s in sentences if len(s.strip()) > 30]


def tokenize_words(text: str) -> List[str]:
    tokens = word_tokenize(text.lower())
    return [t for t in tokens if t.isalnum()]


def remove_stopwords(tokens: List[str]) -> List[str]:
    return [t for t in tokens if t not in STOPWORDS_EN]


def count_words(text: str) -> int:
    return len(text.split())


def preprocess(text: str) -> dict:
    cleaned = clean_text(text)
    sentences = tokenize_sentences(cleaned)
    words = tokenize_words(cleaned)
    filtered_words = remove_stopwords(words)
    return {
        "cleaned_text": cleaned,
        "sentences": sentences,
        "words": words,
        "filtered_words": filtered_words,
        "sentence_count": len(sentences),
        "word_count": len(words),
    }
