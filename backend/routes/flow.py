from fastapi import APIRouter
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
    # standard Kahn's
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

async def call_ai(prompt: str) -> str:
    # A generic helper to call the AI for the flow nodes
    full_output = ""
    async for chunk in ai_router.stream_chat(
        message=prompt,
        history=[],
        mode="max_output",
        provider="groq",
        model="llama-3.3-70b-versatile"
    ):
        if chunk.get("type") == "token":
            full_output += chunk.get("content", "")
        if chunk.get("type") == "done" and chunk.get("answer"):
            if not full_output:
                full_output = chunk["answer"]
    return full_output

@router.post("/flow/execute")
async def execute_flow(req: FlowExecuteRequest):
    """
    Topological sort then execute each node.
    Pass output of node N as input to node N+1.
    """
    nodes = req.nodes
    edges = req.edges
    initial_input = req.initial_input
    
    # Build adjacency map from edges
    graph = build_graph(nodes, edges)
    order = topological_sort(graph)
    
    results = {}
    current_input = initial_input
    
    def get_node(nid):
        for n in nodes:
            if n['id'] == nid:
                return n
        return None
    
    for node_id in order:
        node = get_node(node_id)
        if not node: continue
            
        node_type = node.get('type')
        data = node.get('data', {})
        
        if node_type == 'text_input' or node_type == 'lacunexNode' and data.get('type') == 'text_input':
            current_input = data.get('text', initial_input)
            
        elif node_type == 'lacunexNode' and data.get('type') == 'generate_notes':
            result = await call_ai(
                f"Generate comprehensive academic notes perfectly formatted in Markdown on this topic:\n{current_input}"
            )
            current_input = result
            
        elif node_type == 'lacunexNode' and data.get('type') == 'write_code':
            result = await call_ai(
                f"Write complete, working, robust and elegant code for this request:\n{current_input}"
            )
            current_input = result
            
        elif node_type == 'lacunexNode' and data.get('type') == 'web_search':
            search_data = await search_all(current_input)
            web_results = search_data.get('web_results', [])
            formatted = format_text_context(web_results)
            current_input = f"Search Results for '{current_input}':\n\n{formatted}"
            
        elif node_type == 'lacunexNode' and data.get('type') == 'summarize':
            result = await call_ai(
                f"Summarize this concisely but keep the most critical data:\n{current_input}"
            )
            current_input = result
            
        elif node_type == 'lacunexNode' and data.get('type') == 'translate':
            lang = data.get('language', 'Hindi')
            result = await call_ai(
                f"Translate the following text to {lang}. Return ONLY the translated text, nothing else:\n{current_input}"
            )
            current_input = result
            
        elif node_type == 'lacunexNode' and data.get('type') == 'quiz_generator':
            result = await call_ai(
                f"Generate a 10-question multiple choice quiz with answers from this text:\n{current_input}"
            )
            current_input = result
            
        elif node_type == 'lacunexNode' and data.get('type') == 'show_in_chat':
            results['final_output'] = current_input
            
        elif node_type == 'lacunexNode' and data.get('type') == 'download_pdf':
            results['pdf_content'] = current_input
            results['should_download'] = True
            
        results[node_id] = current_input
    
    return {"results": results, "final": current_input}
