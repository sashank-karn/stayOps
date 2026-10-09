"""Shared code used across backend, agents, and tooling.

Keeping configuration, the LLM client factory, and common schemas here means the
FastAPI service and the LangGraph agents read from a single source of truth.
"""
