from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words

from app.services.nlp.preprocessor import tokenize_sentences, clean_text


def summarize_lsa(text: str, ratio: float = 0.3) -> str:
    """
    Latent Semantic Analysis summarizer via Sumy.
    Uses SVD to identify semantically important sentences.
    """
    cleaned = clean_text(text)
    sentences = tokenize_sentences(cleaned)

    if len(sentences) <= 2:
        return cleaned

    n_sentences = max(1, round(len(sentences) * ratio))

    try:
        parser = PlaintextParser.from_string(cleaned, Tokenizer("english"))
        stemmer = Stemmer("english")
        summarizer = LsaSummarizer(stemmer)
        summarizer.stop_words = get_stop_words("english")

        result = summarizer(parser.document, n_sentences)
        summary_sentences = [str(sentence) for sentence in result]

        if not summary_sentences:
            return " ".join(sentences[:n_sentences])

        return " ".join(summary_sentences)
    except Exception:
        # Fallback to first n sentences if Sumy fails
        return " ".join(sentences[:n_sentences])
