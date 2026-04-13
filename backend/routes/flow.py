"""
LACUNEX Flow Engine — Robust Pipeline Executor v2.0
═══════════════════════════════════════════════════
Topological sort → sequential node execution → error-aware AI calls.
"""

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services.ai_router import ai_router
from services.search_service import search_all, format_text_context

router = APIRouter(prefix="/api", tags=["Flow"])


class FlowExecuteRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    initial_input: str


def build_graph(nodes, edges):
    graph = {node['id']: {'data': node, 'edges': [], 'in_degree': 0} for node in nodes}
    for edge in edges:
        if edge['source'] in graph and edge['target'] in graph:
            graph[edge['source']]['edges'].append(edge['target'])
            graph[edge['target']]['in_degree'] += 1
    return graph


def topological_sort(graph):
    q = [node_id for node_id, node in graph.items() if node['in_degree'] == 0]
    order = []
    while q:
        curr = q.pop(0)
        order.append(curr)
        for neighbor in graph[curr]['edges']:
            graph[neighbor]['in_degree'] -= 1
            if graph[neighbor]['in_degree'] == 0:
                q.append(neighbor)
    return order


class AICallError(Exception):
    """Raised when the AI router fails to produce any content."""
    pass


async def call_ai(prompt: str, timeout_seconds: int = 90) -> str:
    """
    Call the AI router with full error handling.
    - Catches error chunks from the router (all-providers-exhausted)
    - Enforces a hard timeout so the flow never hangs indefinitely
    - Raises AICallError on failure so the pipeline can report it per-node
    """
    full_output = ""
    error_message = ""

    async def _stream():
        nonlocal full_output, error_message
        async for chunk in ai_router.stream_chat(
            message=prompt,
            history=[],
            mode="normal",
            provider="groq",
            model="llama-3.3-70b-versatile"
        ):
            chunk_type = chunk.get("type", "")
            if chunk_type == "token":
                full_output += chunk.get("content", "")
            elif chunk_type == "error":
                error_message = chunk.get("content", "AI provider error")
            elif chunk_type == "done":
                if chunk.get("answer") and not full_output:
                    full_output = chunk["answer"]

    try:
        await asyncio.wait_for(_stream(), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise AICallError(f"AI call timed out after {timeout_seconds}s. All providers may be at capacity.")

    if error_message and not full_output:
        raise AICallError(error_message)

    if not full_output.strip():
        raise AICallError("AI returned empty response. All providers may be rate-limited.")

    return full_output


@router.post("/flow/execute")
async def execute_flow(req: FlowExecuteRequest):
    """
    Topological sort then execute each node.
    Pass output of node N as input to node N+1.
    Tracks per-node status (done/error) for the frontend.
    """
    nodes = req.nodes
    edges = req.edges
    initial_input = req.initial_input

    graph = build_graph(nodes, edges)
    order = topological_sort(graph)

    results = {}
    node_statuses = {}  # node_id -> "done" | "error"
    node_errors = {}    # node_id -> error message
    current_input = initial_input
    pipeline_error = False

    def get_node(nid):
        for n in nodes:
            if n['id'] == nid:
                return n
        return None

    for node_id in order:
        node = get_node(node_id)
        if not node:
            continue

        node_type = node.get('type')
        data = node.get('data', {})

        try:
            if node_type == 'text_input' or (node_type == 'lacunexNode' and data.get('type') == 'text_input'):
                current_input = data.get('text', initial_input)

            elif node_type == 'lacunexNode' and data.get('type') == 'generate_notes':
                current_input = await call_ai(
                    f"Generate comprehensive academic notes perfectly formatted in Markdown on this topic:\n{current_input}"
                )

            elif node_type == 'lacunexNode' and data.get('type') == 'write_code':
                current_input = await call_ai(
                    f"Write complete, working, robust and elegant code for this request:\n{current_input}"
                )

            elif node_type == 'lacunexNode' and data.get('type') == 'web_search':
                search_data = await search_all(current_input)
                web_results = search_data.get('web_results', [])
                formatted = format_text_context(web_results)
                if not formatted.strip():
                    current_input = f"[Web search returned no results for: '{current_input}']"
                else:
                    current_input = f"Search Results for '{current_input}':\n\n{formatted}"

            elif node_type == 'lacunexNode' and data.get('type') == 'summarize':
                current_input = await call_ai(
                    f"Summarize this concisely but keep the most critical data:\n{current_input}"
                )

            elif node_type == 'lacunexNode' and data.get('type') == 'translate':
                lang = data.get('language', 'Hindi')
                current_input = await call_ai(
                    f"Translate the following text to {lang}. Return ONLY the translated text, nothing else:\n{current_input}"
                )

            elif node_type == 'lacunexNode' and data.get('type') == 'quiz_generator':
                current_input = await call_ai(
                    f"Generate a 10-question multiple choice quiz with answers from this text:\n{current_input}"
                )

            elif node_type == 'lacunexNode' and data.get('type') == 'explain_code':
                current_input = await call_ai(
                    f"Explain this code in detail, covering logic, structure, and purpose:\n{current_input}"
                )

            elif node_type == 'lacunexNode' and data.get('type') == 'show_in_chat':
                results['final_output'] = current_input

            elif node_type == 'lacunexNode' and data.get('type') == 'download_pdf':
                results['pdf_content'] = current_input
                results['should_download'] = True

            results[node_id] = current_input
            node_statuses[node_id] = "done"

        except AICallError as e:
            error_msg = str(e)
            print(f"[Flow] Node {node_id} ({data.get('type', 'unknown')}) FAILED: {error_msg}")
            results[node_id] = f"[ERROR] {error_msg}"
            node_statuses[node_id] = "error"
            node_errors[node_id] = error_msg
            pipeline_error = True
            # Don't break — mark remaining downstream nodes as skipped
            # but stop feeding data forward
            current_input = f"[Previous node failed: {error_msg}]"

        except Exception as e:
            error_msg = str(e)
            print(f"[Flow] Node {node_id} unexpected error: {error_msg}")
            results[node_id] = f"[ERROR] {error_msg}"
            node_statuses[node_id] = "error"
            node_errors[node_id] = error_msg
            pipeline_error = True
            current_input = f"[Previous node failed: {error_msg}]"

    return {
        "results": results,
        "final": current_input,
        "node_statuses": node_statuses,
        "node_errors": node_errors,
        "pipeline_error": pipeline_error,
    }
