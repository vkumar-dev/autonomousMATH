#!/usr/bin/env python3
"""Discover a public, non-gated, llama.cpp-compatible GGUF model.

Follows RESEARCH.md: no Hugging Face token, no Ollama, no hardcoded model id.
Hard filters first, then a weighted score over task fit, recency, downloads,
and CPU-friendly size. Writes selected-model.json.
"""

from __future__ import annotations

import json
import math
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = ROOT / "selected-model.json"

MIN_PARAMS = os.environ.get("MODEL_MIN_PARAMS", "3B")
MAX_PARAMS = os.environ.get("MODEL_MAX_PARAMS", "7B")
MAX_FILE_BYTES = int(os.environ.get("MODEL_MAX_BYTES", str(4_800_000_000)))
CANDIDATE_LIMIT = int(os.environ.get("MODEL_CANDIDATE_LIMIT", "24"))

SEARCHES = ("instruct", "reasoning", "math", "coder")
TASK_KEYWORDS = (
    "instruct",
    "chat",
    "reason",
    "thinking",
    "math",
    "code",
    "coder",
    "agent",
    "conversational",
)
SKIP_NAME_BITS = (
    "embed",
    "embedding",
    "whisper",
    "clip",
    "mmproj",
    "rerank",
    "reward-model",
    "classifier",
    "tts",
    "asr",
)
KNOWN_PACKAGERS = (
    "bartowski",
    "unsloth",
    "mradermacher",
    "qwen",
    "microsoft",
    "google",
    "meta-llama",
    "huggingfacetb",
    "lmstudio-community",
    "thebloke",
    "ggml-org",
)
QUANT_PREF = [
    "Q4_K_M",
    "Q4_K_S",
    "Q4_K_L",
    "Q5_K_M",
    "IQ4_XS",
    "Q4_0",
    "Q5_K_S",
    "Q3_K_M",
    "Q6_K",
    "Q5_0",
    "Q3_K_S",
]
SKIP_FILE_BITS = ("mmproj", "encoder", "draft", "embed", "projector", "speculative")


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def run_hf(args: list[str]) -> Any:
    env = os.environ.copy()
    env.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
    # Public/non-gated discovery must not send a token.
    env.pop("HF_TOKEN", None)
    env.pop("HUGGING_FACE_HUB_TOKEN", None)
    cmd = ["hf", *args]
    result = subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"hf {' '.join(args)} failed ({result.returncode}): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )
    text = result.stdout.strip()
    if not text:
        return []
    return json.loads(text)


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def model_blob(model: dict[str, Any]) -> str:
    tags = model.get("tags") or []
    if not isinstance(tags, list):
        tags = [str(tags)]
    return " ".join(
        [
            str(model.get("id") or ""),
            str(model.get("pipeline_tag") or ""),
            " ".join(str(t) for t in tags),
        ]
    ).lower()


def is_skipped_model(model: dict[str, Any]) -> bool:
    if model.get("gated") not in (False, None, "false", "False"):
        return True
    ident = str(model.get("id") or "").lower()
    blob = model_blob(model)
    if any(bit in ident or bit in blob for bit in SKIP_NAME_BITS):
        return True
    return False


def discover_candidates() -> list[dict[str, Any]]:
    queries: list[list[str]] = [
        [
            "models",
            "list",
            "--no-gated",
            "--apps",
            "llama.cpp",
            "--num-parameters",
            f"min:{MIN_PARAMS},max:{MAX_PARAMS}",
            "--sort",
            "created_at",
            "--limit",
            str(CANDIDATE_LIMIT),
            "--format",
            "json",
            "--expand",
            "downloads,likes,tags,createdAt,gated,gguf,pipeline_tag,lastModified,trendingScore",
        ],
        [
            "models",
            "list",
            "--no-gated",
            "--apps",
            "llama.cpp",
            "--num-parameters",
            f"min:{MIN_PARAMS},max:{MAX_PARAMS}",
            "--sort",
            "downloads",
            "--limit",
            str(CANDIDATE_LIMIT),
            "--format",
            "json",
            "--expand",
            "downloads,likes,tags,createdAt,gated,gguf,pipeline_tag,lastModified,trendingScore",
        ],
    ]
    for term in SEARCHES:
        queries.append(
            [
                "models",
                "list",
                "--search",
                term,
                "--no-gated",
                "--apps",
                "llama.cpp",
                "--num-parameters",
                f"min:{MIN_PARAMS},max:{MAX_PARAMS}",
                "--sort",
                "created_at",
                "--limit",
                str(CANDIDATE_LIMIT),
                "--format",
                "json",
                "--expand",
                "downloads,likes,tags,createdAt,gated,gguf,pipeline_tag,lastModified,trendingScore",
            ]
        )

    by_id: dict[str, dict[str, Any]] = {}
    for args in queries:
        try:
            rows = run_hf(args)
        except Exception as exc:
            log(f"Discovery query failed ({args[args.index('--sort') + 1] if '--sort' in args else 'search'}): {exc}")
            continue
        if not isinstance(rows, list):
            continue
        for model in rows:
            if not isinstance(model, dict) or not model.get("id"):
                continue
            if is_skipped_model(model):
                continue
            by_id[model["id"]] = model
    return list(by_id.values())


def task_score(model: dict[str, Any]) -> float:
    blob = model_blob(model)
    hits = sum(1 for key in TASK_KEYWORDS if key in blob)
    return min(1.0, hits / 3.0)


def recency_score(model: dict[str, Any]) -> float:
    stamp = parse_dt(model.get("created_at") or model.get("last_modified"))
    if stamp is None:
        return 0.2
    age_days = max(0.0, (datetime.now(timezone.utc) - stamp).total_seconds() / 86400.0)
    # 1.0 if brand new, ~0.5 at 180 days, near 0 after ~2 years.
    return math.exp(-age_days / 180.0)


def popularity_score(model: dict[str, Any]) -> float:
    downloads = float(model.get("downloads") or 0)
    likes = float(model.get("likes") or 0)
    trending = float(model.get("trending_score") or 0)
    download_part = math.log1p(downloads) / math.log1p(500_000)
    like_part = math.log1p(likes) / math.log1p(250)
    trend_part = min(1.0, trending / 50.0) if trending else 0.0
    return max(0.0, min(1.0, 0.6 * download_part + 0.3 * like_part + 0.1 * trend_part))


def packager_bonus(model: dict[str, Any]) -> float:
    ident = str(model.get("id") or "").lower()
    org = ident.split("/", 1)[0]
    return 1.0 if org in KNOWN_PACKAGERS else 0.0


def size_score(model: dict[str, Any]) -> float:
    gguf = model.get("gguf") or {}
    size = 0
    if isinstance(gguf, dict):
        size = int(gguf.get("totalFileSize") or gguf.get("total") or 0)
    if size <= 0:
        return 0.5
    # Prefer ~2–3.5GB Q4 3B–4B files on GitHub-hosted CPU runners.
    gb = size / 1e9
    if gb <= 0.8:
        return 0.4
    if gb <= 3.5:
        return 1.0
    if gb <= 5.0:
        return 0.6
    return 0.2


def score_model(model: dict[str, Any]) -> float:
    # RESEARCH.md suggested mix, tuned for CPU GitHub Actions.
    return (
        0.30 * task_score(model)
        + 0.20 * (0.6 * packager_bonus(model) + 0.4 * popularity_score(model))
        + 0.15 * popularity_score(model)
        + 0.15 * recency_score(model)
        + 0.10 * size_score(model)
        + 0.10 * (1.0 if "instruct" in model_blob(model) else 0.4)
    )


def list_gguf_files(model_id: str) -> list[dict[str, Any]]:
    rows = run_hf(["models", "list", model_id, "--format", "json"])
    if not isinstance(rows, list):
        return []
    files = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        path = str(row.get("path") or "")
        if not path.lower().endswith(".gguf"):
            continue
        lower = path.lower()
        if any(bit in lower for bit in SKIP_FILE_BITS):
            continue
        size = int(row.get("size") or 0)
        lfs = row.get("lfs") or {}
        if isinstance(lfs, dict) and lfs.get("size"):
            size = int(lfs["size"])
        if size <= 0 or size > MAX_FILE_BYTES:
            continue
        files.append({"path": path, "size": size})
    return files


def quant_rank(filename: str) -> int:
    name = filename.upper()
    for index, quant in enumerate(QUANT_PREF):
        if re.search(rf"(?:^|[-_.]){re.escape(quant)}(?:[-_.]|$)", name):
            return index
    return len(QUANT_PREF) + 5


def pick_gguf(files: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not files:
        return None
    ranked = sorted(files, key=lambda item: (quant_rank(item["path"]), item["size"]))
    return ranked[0]


def detect_quant(filename: str) -> str:
    name = filename.upper()
    for quant in QUANT_PREF:
        if quant in name:
            return quant
    match = re.search(r"(Q[2-8][_A-Z0-9]+|IQ[2-8][_A-Z0-9]+)", name)
    return match.group(1) if match else "unknown"


def resolve() -> dict[str, Any]:
    log("Discovering public non-gated llama.cpp models on Hugging Face…")
    candidates = discover_candidates()
    if not candidates:
        raise RuntimeError("No public non-gated llama.cpp models matched the filters.")

    scored = sorted(candidates, key=score_model, reverse=True)
    log(f"Ranked {len(scored)} candidate repos. Probing GGUF files…")

    errors: list[str] = []
    for model in scored[:40]:
        model_id = model["id"]
        try:
            files = list_gguf_files(model_id)
        except Exception as exc:
            errors.append(f"{model_id}: {exc}")
            continue
        chosen = pick_gguf(files)
        if not chosen:
            continue
        selection = {
            "model": model_id,
            "filename": chosen["path"],
            "quantization": detect_quant(chosen["path"]),
            "size_bytes": chosen["size"],
            "parameters": f"{MIN_PARAMS}-{MAX_PARAMS}",
            "created": model.get("created_at") or model.get("last_modified"),
            "downloads": model.get("downloads") or 0,
            "likes": model.get("likes") or 0,
            "gated": False,
            "score": round(score_model(model), 4),
            "pipeline_tag": model.get("pipeline_tag"),
            "runtime": "llama.cpp",
        }
        log(
            f"Selected {model_id} / {chosen['path']} "
            f"({selection['quantization']}, {chosen['size'] / 1e9:.2f} GB, score={selection['score']})"
        )
        return selection

    detail = "; ".join(errors[:5])
    raise RuntimeError(
        "No candidate repo had a CPU-sized GGUF quantization. "
        + (detail or "All listed files were missing or too large.")
    )


def main() -> int:
    try:
        selection = resolve()
    except Exception as exc:
        log(f"Model resolver failed: {exc}")
        return 1
    OUTPUT_PATH.write_text(json.dumps(selection, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(selection, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
