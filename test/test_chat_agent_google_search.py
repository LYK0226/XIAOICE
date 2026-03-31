"""Smoke tests for coordinator tool wiring with official ADK google_search."""

import os
import sys


sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.agent import chat_agent


def _has_retrieve_knowledge(tools):
    return any(getattr(tool, '__name__', '') == 'retrieve_knowledge' for tool in tools)


def _has_google_search(tools):
    return any(tool is chat_agent.google_search for tool in tools)


def test_coordinator_tools_include_google_search_when_enabled(monkeypatch):
    """Coordinator should expose official google_search when toggle is enabled."""
    monkeypatch.setenv('GOOGLE_SEARCH_ENABLED', 'true')

    manager = chat_agent.ChatAgentManager()
    tools = manager._build_coordinator_tools()

    assert _has_retrieve_knowledge(tools)
    assert _has_google_search(tools)


def test_coordinator_tools_exclude_google_search_when_disabled(monkeypatch):
    """Coordinator should keep RAG tool while removing google_search when disabled."""
    monkeypatch.setenv('GOOGLE_SEARCH_ENABLED', 'false')

    manager = chat_agent.ChatAgentManager()
    tools = manager._build_coordinator_tools()

    assert _has_retrieve_knowledge(tools)
    assert not _has_google_search(tools)
