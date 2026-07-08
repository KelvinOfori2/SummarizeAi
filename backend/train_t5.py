"""
Fine-tune t5-small on 8% of CNN/DailyMail dataset (~22,970 examples).
Saves checkpoint to app/models/t5-finetuned/ when done.
Run from the backend/ directory:
    .venv/bin/python train_t5.py
"""
import os, time, math, json
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import T5ForConditionalGeneration, T5Tokenizer, get_linear_schedule_with_warmup
from datasets import load_dataset

# ── Config ─────────────────────────────────────────────────────────────────────
MODEL_NAME      = "t5-small"
SAVE_PATH       = os.path.join(os.path.dirname(__file__), "..", "ml_models", "t5-finetuned")
LOG_PATH        = os.path.join(os.path.dirname(__file__), "..", "ml_models", "training_log.json")
DATASET_PCT     = 0.50          # 50 % of CNN/DailyMail (~143,556 examples)
EPOCHS          = 3
BATCH_SIZE      = 4
GRAD_ACCUM      = 4             # effective batch = 16
LR              = 3e-4
MAX_INPUT_LEN   = 512
MAX_TARGET_LEN  = 128
WARMUP_RATIO    = 0.06
SEED            = 42

torch.manual_seed(SEED)
os.makedirs(SAVE_PATH, exist_ok=True)

# ── Dataset ────────────────────────────────────────────────────────────────────
class CNNDataset(Dataset):
    def __init__(self, hf_dataset, tokenizer):
        self.data      = hf_dataset
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        article = "summarize: " + self.data[idx]["article"]
        highlight = self.data[idx]["highlights"]

        src = self.tokenizer(
            article, max_length=MAX_INPUT_LEN,
            truncation=True, padding="max_length", return_tensors="pt"
        )
        tgt = self.tokenizer(
            highlight, max_length=MAX_TARGET_LEN,
            truncation=True, padding="max_length", return_tensors="pt"
        )
        labels = tgt.input_ids.squeeze()
        labels[labels == self.tokenizer.pad_token_id] = -100   # ignore padding in loss

        return {
            "input_ids":      src.input_ids.squeeze(),
            "attention_mask": src.attention_mask.squeeze(),
            "labels":         labels,
        }

def format_time(seconds):
    h, m = divmod(int(seconds), 3600)
    m, s = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  T5-small Fine-tuning on CNN/DailyMail")
    print("=" * 60)

    # Load model & tokenizer
    print(f"\n[1/5] Loading {MODEL_NAME}...")
    tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME, legacy=False)
    model     = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
    model.train()
    print(f"      Parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Load dataset subset
    print(f"\n[2/5] Loading CNN/DailyMail ({DATASET_PCT*100:.0f}% split)...")
    raw = load_dataset("abisee/cnn_dailymail", "3.0.0", split=f"train[:{int(DATASET_PCT*100)}%]")
    val = load_dataset("abisee/cnn_dailymail", "3.0.0", split="validation[:500]")
    print(f"      Train: {len(raw):,}  |  Val: {len(val):,}")

    train_ds = CNNDataset(raw, tokenizer)
    val_ds   = CNNDataset(val, tokenizer)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=False)

    # Optimizer + scheduler
    print(f"\n[3/5] Setting up optimizer (lr={LR}, grad_accum={GRAD_ACCUM})...")
    optimizer  = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    total_steps = math.ceil(len(train_loader) / GRAD_ACCUM) * EPOCHS
    warmup_steps = int(total_steps * WARMUP_RATIO)
    scheduler  = get_linear_schedule_with_warmup(optimizer, warmup_steps, total_steps)

    # Estimate time
    secs_per_step = 0.8
    est_secs = total_steps * secs_per_step
    print(f"      Total steps: {total_steps:,}  |  Estimated time: {format_time(est_secs)}")

    # Training loop
    print(f"\n[4/5] Training for {EPOCHS} epochs...\n")
    log = {"epochs": [], "config": {"dataset_pct": DATASET_PCT, "train_examples": len(raw),
                                     "epochs": EPOCHS, "batch_size": BATCH_SIZE}}
    global_step = 0
    t_start = time.time()

    for epoch in range(EPOCHS):
        model.train()
        epoch_loss = 0.0
        n_batches  = 0
        optimizer.zero_grad()
        t_epoch = time.time()

        for i, batch in enumerate(train_loader):
            out  = model(
                input_ids=batch["input_ids"],
                attention_mask=batch["attention_mask"],
                labels=batch["labels"],
            )
            loss = out.loss / GRAD_ACCUM
            loss.backward()
            epoch_loss += out.loss.item()
            n_batches  += 1

            if (i + 1) % GRAD_ACCUM == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1

                if global_step % 50 == 0:
                    elapsed   = time.time() - t_start
                    remaining = (est_secs - elapsed)
                    avg_loss  = epoch_loss / n_batches
                    pct_done  = global_step / total_steps * 100
                    print(f"  Epoch {epoch+1}/{EPOCHS} | Step {global_step:,}/{total_steps:,} "
                          f"({pct_done:.1f}%) | loss={avg_loss:.4f} | "
                          f"elapsed={format_time(elapsed)} | eta={format_time(remaining)}")

        # Validation loss
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                out = model(input_ids=batch["input_ids"],
                            attention_mask=batch["attention_mask"],
                            labels=batch["labels"])
                val_loss += out.loss.item()
        val_loss /= len(val_loader)

        epoch_summary = {
            "epoch": epoch + 1,
            "train_loss": round(epoch_loss / n_batches, 4),
            "val_loss": round(val_loss, 4),
            "duration_s": round(time.time() - t_epoch, 1),
        }
        log["epochs"].append(epoch_summary)
        print(f"\n  ✓ Epoch {epoch+1} done | train_loss={epoch_summary['train_loss']} "
              f"| val_loss={epoch_summary['val_loss']} | {format_time(epoch_summary['duration_s'])}\n")

        # Save checkpoint after each epoch
        ckpt_path = os.path.join(SAVE_PATH, f"epoch_{epoch+1}")
        model.save_pretrained(ckpt_path)
        tokenizer.save_pretrained(ckpt_path)
        print(f"  → Checkpoint saved: {ckpt_path}\n")

    # Save final model
    print(f"[5/5] Saving final model to {SAVE_PATH}...")
    model.save_pretrained(SAVE_PATH)
    tokenizer.save_pretrained(SAVE_PATH)

    log["total_duration_s"] = round(time.time() - t_start, 1)
    log["status"] = "complete"
    with open(LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)

    print(f"\n{'='*60}")
    print(f"  Training complete in {format_time(log['total_duration_s'])}")
    print(f"  Model saved → {SAVE_PATH}")
    print(f"  Log saved   → {LOG_PATH}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
