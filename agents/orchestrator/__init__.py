"""Orchestrator Agent (Phase 10).

The central coordinator. Receives user/system requests, understands the task, decides
which agent(s) are required, passes context between them, maintains task state,
coordinates multi-step workflows, combines outputs, decides when a workflow is complete,
and escalates to a human when required. A real coordination component — not a hard-coded
if/else router.
"""
AGENT_NAME = "orchestrator"
