"""Safe LLM Client with Gemini support, structured fallbacks, and explicit source attribution."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from shared.config import get_settings

logger = logging.getLogger(__name__)


def call_llm_with_attribution(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 1000,
) -> Tuple[str, str, bool]:
    """
    Execute LLM call via configured provider (Gemini or OpenAI).
    Returns (response_text, model_source, is_fallback).

    Never crashes if credentials are missing or API fails.
    Explicitly labels whether the result was produced by an external model
    or by deterministic local heuristic fallback.
    """
    settings = get_settings()

    # Check if active provider credentials are present
    if settings.has_llm_key():
        try:
            from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
            from shared.llm.provider import get_llm

            model_name = settings.llm_model
            llm = get_llm(temperature=temperature)

            messages = []
            if system_prompt:
                from langchain_core.messages import SystemMessage, HumanMessage
                messages.append(SystemMessage(content=system_prompt))
                messages.append(HumanMessage(content=prompt))
            else:
                from langchain_core.messages import HumanMessage
                messages.append(HumanMessage(content=prompt))

            executor = ThreadPoolExecutor(max_workers=1)
            try:
                future = executor.submit(llm.invoke, messages)
                res = future.result(timeout=3.0)
            finally:
                executor.shutdown(wait=False, cancel_futures=True)

            content = res.content if hasattr(res, "content") else str(res)
            model_label = f"{settings.llm_provider}:{model_name}"
            return str(content).strip(), model_label, False
        except Exception as e:
            logger.warning("[LLM Client] Live model call failed (%s); reverting to fallback", e)



    # Deterministic local fallback with clean heuristics
    fallback_text = _generate_heuristic_response(prompt, system_prompt)
    return fallback_text, "deterministic_local_fallback", True


def _generate_heuristic_response(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Deterministic fallback engine when external AI provider is offline or unconfigured."""
    if "Findings:" in prompt:
        findings_part = prompt.split("Findings:", 1)[1].strip()
        if findings_part:
            return findings_part

    p_lower = prompt.lower()

    if any(w in p_lower for w in ["move out", "vacate", "checkout"]):
        return (
            "Move-out notice processed: Active tenancy verified. "
            "Ledger audited with deposit reconciliation and turnover maintenance ticket generated. "
            "Pipeline leads screened for immediate re-listing."
        )
    elif any(w in p_lower for w in ["leak", "plumb", "ac", "wifi", "repair", "maintenance"]):
        return (
            "Maintenance request analyzed: Classified priority based on category. "
            "Recommended dispatching an accredited local vendor from the StayOps contractor directory. "
            "High-value repairs (>₹2,000) flagged for manager approval."
        )
    elif any(w in p_lower for w in ["rent", "due", "overdue", "balance", "deposit"]):
        return (
            "Financial status evaluated: Audited collection rates against monthly billing schedules. "
            "Recommended sending automated payment reminders with UPI / NetBanking collection links."
        )
    elif any(w in p_lower for w in ["lead", "visit", "tour", "book"]):
        return (
            "Lead inquiry matched: Available inventory scanned against sharing tier and budget preferences. "
            "Property visit tour proposed with calendar confirmation."
        )

    return (
        f"Operational evaluation completed: The request was audited against StayOps PG policies, "
        f"safety compliance rules, and standard operating procedures."
    )

