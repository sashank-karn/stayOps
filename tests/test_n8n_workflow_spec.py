"""Automated verification tests for StayOps n8n workflow specification."""
import json
import os
import pytest

WORKFLOW_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "stayops_n8n_workflow.json")


def test_n8n_workflow_file_exists():
    assert os.path.exists(WORKFLOW_PATH), f"Workflow file missing at {WORKFLOW_PATH}"


def test_n8n_workflow_valid_json_schema():
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate top-level keys required by n8n
    assert "name" in data
    assert "nodes" in data
    assert "connections" in data
    assert isinstance(data["nodes"], list)
    assert len(data["nodes"]) >= 5

    # Check for Webhook, Schedule, and HTTP Request nodes
    node_types = [n.get("type") for n in data["nodes"]]
    assert "n8n-nodes-base.webhook" in node_types
    assert "n8n-nodes-base.scheduleTrigger" in node_types
    assert "n8n-nodes-base.httpRequest" in node_types
    assert "n8n-nodes-base.respondToWebhook" in node_types

    # Ensure connections map accurately to existing nodes
    node_names = {n.get("name") for n in data["nodes"]}
    for source_node, conn_data in data["connections"].items():
        assert source_node in node_names, f"Connection source '{source_node}' does not exist in nodes"
        for output_group in conn_data.get("main", []):
            for target in output_group:
                assert target.get("node") in node_names, f"Connection target '{target.get('node')}' missing"


def test_n8n_workflow_contains_all_seven_agents():
    """Verify that all 7 specialized agents in StayOps multi-agent architecture are represented."""
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    node_names = " ".join([n.get("name", "") for n in data["nodes"]])

    expected_agents = [
        "Lead and Leasing Agent",
        "Tenant Support Agent",
        "Maintenance and Vendor Agent",
        "Rent and Collections Agent",
        "Vacancy and Revenue Recovery Agent",
        "Orchestrator Agent",
        "Monitoring and Facilitator Agent",
    ]

    for agent in expected_agents:
        # Check standard naming or abbreviations present in node titles
        simplified = agent.split()[0]
        assert simplified in node_names, f"Expected agent '{agent}' missing from n8n nodes"

