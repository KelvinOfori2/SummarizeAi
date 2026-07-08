!pip install transformers
!pip install sentencepiece
!git clone https://github.com/huggingface/transformers

import numpy as np 
import pandas as pd 
import nltk
from transformers import PegasusForConditionalGeneration, PegasusTokenizer
from transformers import AutoTokenizer
import torch

from google.colab import drive
drive.mount('/content/gdrive')

# ========================================

path = '/content/drive/MyDrive/train.csv'
trainning_df = pd.read_csv(path, engine='python', error_bad_lines=False)

# ========================================

MAX_LEN = 512
SUMMARY_LEN = 150
TRAINNING_SIZE = 5000

trainning_df = trainning_df.iloc[0:TRAINNING_SIZE,:].copy()

trainning_article_ls = list(trainning_df['article'])
trainning_highlight_ls = list(trainning_df['highlights'])

del trainning_df

# ========================================

df = pd.DataFrame(columns=['target_text','source_text'])
df['target_text'] = trainning_highlight_ls
df['source_text'] = ['summarize: '+item for item in trainning_article_ls]

# ========================================

model_name = "google/pegasus-xsum"
device = "cuda" if torch.cuda.is_available() else "cpu"
#tokenizer = PegasusTokenizer.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = PegasusForConditionalGeneration.from_pretrained(model_name).to(device)
batch = tokenizer(df['source_text'], truncation=True, padding="longest", return_tensors="pt").to(device)
translated = model.generate(**batch)
tgt_text = tokenizer.batch_decode(translated, skip_special_tokens=True)
assert (tgt_text == df['target_text'])