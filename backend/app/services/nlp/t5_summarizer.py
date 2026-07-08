"""
Abstractive summarizer: LexRank → T5 pipeline.

Flow:
  1. Use LexRank (extractive) to compress input to ~40% of original words
  2. Feed compressed text into T5 for true abstractive rewriting
  3. Auto-load fine-tuned model from app/models/t5-finetuned/ if present,
     otherwise fall back to pretrained t5-small.
"""
import os

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer

_model     = None
_tokenizer = None
_model_path = None

FINETUNED_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml_models", "t5-finetuned")
FINETUNED_PATH = os.path.normpath(FINETUNED_PATH)


def _resolve_model_path() -> str:
    """Return fine-tuned checkpoint if available, otherwise pretrained."""
    if os.path.isdir(FINETUNED_PATH) and os.path.isfile(
        os.path.join(FINETUNED_PATH, "config.json")
    ):
        return FINETUNED_PATH
    return "t5-small"


def get_model_and_tokenizer():
    global _model, _tokenizer, _model_path
    from transformers import T5ForConditionalGeneration, T5Tokenizer

    current_path = _resolve_model_path()

    # Reload if the model source has changed (e.g. fine-tune finished mid-session)
    if _model is None or current_path != _model_path:
        source = "fine-tuned" if current_path != "t5-small" else "pretrained t5-small"
        print(f"[T5] Loading {source} from: {current_path}")
        _tokenizer  = T5Tokenizer.from_pretrained(current_path, legacy=False)
        _model      = T5ForConditionalGeneration.from_pretrained(current_path)
        _model.eval()
        _model_path = current_path

    return _model, _tokenizer


# ── LexRank pre-compression ────────────────────────────────────────────────────

def _lexrank_compress(text: str, keep_ratio: float = 0.40) -> str:
    """
    Use LexRank to select the most important sentences (keep_ratio of total).
    Returns a shorter version of the document for T5 to rewrite.
    """
    try:
        parser  = PlaintextParser.from_string(text, Tokenizer("english"))
        summary = LexRankSummarizer()
        n_sents = max(3, int(len(parser.document.sentences) * keep_ratio))
        selected = summary(parser.document, n_sents)
        compressed = " ".join(str(s) for s in selected)
        return compressed if compressed.strip() else text
    except Exception:
        return text  # fallback: use original


# ── Chunk + generate ───────────────────────────────────────────────────────────

def _chunk(text: str, max_words: int = 300) -> list:
    words = text.split()
    return [" ".join(words[i: i + max_words]) for i in range(0, len(words), max_words)]


def _generate_chunk(model, tokenizer, chunk: str, ratio: float) -> str:
    n_words = len(chunk.split())
    max_len = min(int(n_words * ratio * 1.6) + 10, int(n_words * 0.85))
    min_len = max(10, int(n_words * ratio * 0.6))
    if max_len <= min_len:
        max_len = min_len + 8

    inputs = tokenizer(
        "summarize: " + chunk,
        return_tensors="pt", max_length=512, truncation=True,
    )
    ids = model.generate(
        inputs.input_ids,
        max_length=max_len,
        min_length=min_len,
        num_beams=4,
        length_penalty=2.0,
        early_stopping=True,
        no_repeat_ngram_size=3,
    )
    return tokenizer.decode(ids[0], skip_special_tokens=True)


# ── Public API ─────────────────────────────────────────────────────────────────

def summarize_t5(text: str, ratio: float) -> str:
    if not text.strip():
        return ""

    model, tokenizer = get_model_and_tokenizer()

    # Step 1: LexRank pre-compression (keep 40% of sentences)
    # For short texts skip pre-compression
    word_count = len(text.split())
    if word_count > 400:
        compressed = _lexrank_compress(text, keep_ratio=0.40)
    else:
        compressed = text

    # Step 2: Chunk compressed text and run T5 on each chunk
    chunks    = _chunk(compressed, max_words=300)
    summaries = []

    for chunk in chunks:
        if len(chunk.split()) < 15 and len(chunks) > 1:
            continue
        try:
            summaries.append(_generate_chunk(model, tokenizer, chunk, ratio))
        except Exception as e:
            print(f"[T5] chunk error: {e}")

    final = " ".join(summaries).strip()

    # Step 3: If the joined result is still too long, do one recursive pass
    if len(final.split()) > word_count * ratio * 1.5 and len(chunks) > 1:
        final = summarize_t5(final, ratio)

    return final or "Could not generate summary."
