# Running a local LLM endpoint for Unilink

This document shows simple options to run an open-source LLM locally (or on a private server) and point the app at it.

1) Recommended: Text Generation Inference (TGI) — Docker (GPU)

Prereqs:
- Docker + NVIDIA Container Toolkit (if using GPU)
- HF token with access to the model (if model is gated)

Run (example):

```bash
export HF_TOKEN="<your_hf_token>"
docker run --gpus all --rm -it \
  -p 8080:8080 \
  -e HUGGINGFACE_HUB_API_TOKEN="$HF_TOKEN" \
  -e MODEL_ID="meta-llama/Llama-3.1-8B-Instruct" \
  ghcr.io/huggingface/text-generation-inference:latest
```

Then set in your `.env`:

```
HF_ROUTER_URL="http://localhost:8080/v1"
HF_MODEL_ID="meta-llama/Llama-3.1-8B-Instruct"
HF_API_KEY="<your_hf_token>"
```

Test with curl:

```bash
curl -X POST "$HF_ROUTER_URL/chat/completions" \
  -H "Authorization: Bearer $HF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"'"$HF_MODEL_ID"'","messages":[{"role":"user","content":"Say hello in one sentence."}] }'
```

2) vLLM — high-performance server (GPU)

vLLM provides high throughput. See the vLLM docs for docker usage. Point your `HF_ROUTER_URL` to the vLLM REST endpoint.

3) CPU-only / edge: llama.cpp or text-generation-webui

- Use `llama.cpp` / `.gguf` for CPU-friendly quantized models. Good for small models (<= 3B) or heavily-quantized 7B.
- Use `text-generation-webui` or `oobabooga` to get a friendly UI + HTTP API wrapper.

Example (llama.cpp):

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
# then run with a .gguf model
./main -m /path/to/model.gguf -p "Hello" -n 128
```

Notes
- Some HF models are gated and require accepting a license or using a specific account to download weights.
- After starting a local endpoint, set `HF_ROUTER_URL` in `.env` and restart your dev server. `src/app/lib/hf.ts` will prefer `HF_ROUTER_URL` automatically.

If you want, I can also add a small npm script or docker-compose file to the repo to simplify starting a local TGI instance (if you have GPU resources available).
