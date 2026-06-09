from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.luhn import LuhnSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words

from app.services.nlp.preprocessor import tokenize_sentences, clean_text


def summarize_luhn(text: str, ratio: float = 0.3) -> str:
    """
    Luhn summarizer — heuristic-based approach. Scores sentences by
    the frequency of significant words and their clustering.
    """
    cleaned = clean_text(text)
    sentences = tokenize_sentences(cleaned)

    if len(sentences) <= 2:
        return cleaned

    n_sentences = max(1, round(len(sentences) * ratio))

    try:
        parser = PlaintextParser.from_string(cleaned, Tokenizer("english"))
        stemmer = Stemmer("english")
        summarizer = LuhnSummarizer(stemmer)
        summarizer.stop_words = get_stop_words("english")

        result = summarizer(parser.document, n_sentences)
        summary_sentences = [str(sentence) for sentence in result]

        if not summary_sentences:
            return " ".join(sentences[:n_sentences])

        return " ".join(summary_sentences)
    except Exception:
        return " ".join(sentences[:n_sentences])
