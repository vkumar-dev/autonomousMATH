#!/usr/bin/env python3
"""Download the selected public GGUF and run local llama.cpp inference.

No Ollama. No API key. Uses Hugging Face Hub for the file and llama-cpp-python
(or llama-cli if present) for generation.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_FILE = ROOT / "selected-model.json"
DEFAULT_MODEL_DIR = Path(os.environ.get("LLAMA_MODEL_DIR", ROOT / ".models"))


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def load_selection() -> dict:
    if not MODEL_FILE.exists():
        raise FileNotFoundError("selected-model.json missing. Run model_resolver.py first.")
    return json.loads(MODEL_FILE.read_text(encoding="utf-8"))


def download_gguf(selection: dict, dest_dir: Path) -> Path:
    from huggingface_hub import hf_hub_download

    dest_dir.mkdir(parents=True, exist_ok=True)
    log(f"Downloading {selection['model']} / {selection['filename']} (public, no token)…")
    path = hf_hub_download(
        repo_id=selection["model"],
        filename=selection["filename"],
        local_dir=str(dest_dir),
        local_dir_use_symlinks=False,
        token=False,
    )
    return Path(path)


def generate_with_llama_cpp(
    model_path: Path,
    prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    from llama_cpp import Llama

    n_threads = int(os.environ.get("LLAMA_THREADS", os.cpu_count() or 4))
    n_ctx = int(os.environ.get("LLAMA_CTX", "8192"))
    log(f"Loading GGUF with llama-cpp-python ({model_path.name}, ctx={n_ctx}, threads={n_threads})")
    llm = Llama(
        model_path=str(model_path),
        n_ctx=n_ctx,
        n_threads=n_threads,
        n_gpu_layers=0,
        verbose=False,
    )

    system = (
        "You write original mathematical essays in HTML. "
        "Follow the user's format exactly. Return only the HTML article."
    )
    try:
        result = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            top_p=0.9,
            max_tokens=max_tokens,
        )
        content = result["choices"][0]["message"]["content"]
        if content and content.strip():
            return content
    except Exception as exc:
        log(f"Chat completion unavailable ({exc}); falling back to raw completion.")

    wrapped = f"{system}\n\n{prompt}\n"
    result = llm(
        wrapped,
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=0.9,
        echo=False,
    )
    return result["choices"][0]["text"]


def generate_with_llama_cli(
    model_path: Path,
    prompt: str,
    max_tokens: int,
    temperature: float,
) -> str:
    binary = os.environ.get("LLAMA_CLI", "llama-cli")
    n_threads = str(os.environ.get("LLAMA_THREADS", os.cpu_count() or 4))
    n_ctx = os.environ.get("LLAMA_CTX", "8192")
    log(f"Running {binary} on {model_path.name}")
    cmd = [
        binary,
        "-m",
        str(model_path),
        "-n",
        str(max_tokens),
        "-c",
        n_ctx,
        "-t",
        n_threads,
        "--temp",
        str(temperature),
        "-p",
        prompt,
        "--simple-io",
        "-no-cnv",
    ]
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{binary} failed")
    return result.stdout


def read_prompt(args: argparse.Namespace) -> str:
    if args.prompt_file:
        return Path(args.prompt_file).read_text(encoding="utf-8")
    if args.prompt:
        return args.prompt
    return sys.stdin.read()


def main() -> int:
    parser = argparse.ArgumentParser(description="Local Hugging Face GGUF inference")
    parser.add_argument("--prompt", help="Prompt text")
    parser.add_argument("--prompt-file", help="Path to a prompt file")
    parser.add_argument("--max-tokens", type=int, default=int(os.environ.get("LLAMA_MAX_TOKENS", "3072")))
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    args = parser.parse_args()

    prompt = read_prompt(args).strip()
    if not prompt:
        log("Empty prompt.")
        return 1

    try:
        selection = load_selection()
        model_path = download_gguf(selection, Path(args.model_dir))
        try:
            content = generate_with_llama_cpp(
                model_path, prompt, args.max_tokens, args.temperature
            )
        except ImportError:
            log("llama-cpp-python not installed; trying llama-cli")
            content = generate_with_llama_cli(
                model_path, prompt, args.max_tokens, args.temperature
            )
    except Exception as exc:
        log(f"Inference failed: {exc}")
        return 1

    if not content or not content.strip():
        log("Empty model output.")
        return 1

    sys.stdout.write(content)
    if not content.endswith("\n"):
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
