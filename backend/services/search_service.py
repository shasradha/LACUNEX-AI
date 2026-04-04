"""
LACUNEX AI — Web & Image Search Service
Privacy-focused search powered by DuckDuckGo.
No API keys required. No tracking. Fast results.
"""

import asyncio
from typing import List, Optional
from functools import lru_cache


async def search_web(query: str, max_results: int = 5) -> List[dict]:
    """
    Search the web for text results.
    Returns a list of {title, url, snippet} dicts.
    """
    try:
        from duckduckgo_search import DDGS

        def _search():
            with DDGS() as ddgs:
                results = []
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
                return results

        return await asyncio.to_thread(_search)
    except Exception as e:
        print(f"[SearchService] Web search failed: {e}")
        return []


async def search_images(query: str, max_results: int = 4) -> List[dict]:
    """
    Search for images.
    Returns a list of {title, url, thumbnail, source} dicts.
    """
    try:
        from duckduckgo_search import DDGS

        def _search():
            with DDGS() as ddgs:
                results = []
                for r in ddgs.images(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("image", ""),
                        "thumbnail": r.get("thumbnail", ""),
                        "source": r.get("source", ""),
                    })
                return results

        return await asyncio.to_thread(_search)
    except Exception as e:
        print(f"[SearchService] Image search failed: {e}")
        return []


async def search_all(query: str) -> dict:
    """
    Run web + image search in parallel for maximum speed.
    Returns {web_results: [...], image_results: [...]}.
    """
    web_task = asyncio.create_task(search_web(query, max_results=5))
    image_task = asyncio.create_task(search_images(query, max_results=4))

    web_results, image_results = await asyncio.gather(
        web_task, image_task, return_exceptions=True
    )

    return {
        "web_results": web_results if isinstance(web_results, list) else [],
        "image_results": image_results if isinstance(image_results, list) else [],
    }


def format_search_context(search_data: dict) -> str:
    """
    Format search results into a clean context block
    that the AI can use to answer the user's question.
    """
    lines = []

    web = search_data.get("web_results", [])
    images = search_data.get("image_results", [])

    if web:
        lines.append("### 🌐 Live Web Results:")
        for i, r in enumerate(web, 1):
            lines.append(f"{i}. **{r['title']}**")
            lines.append(f"   URL: {r['url']}")
            lines.append(f"   > {r['snippet']}")
            lines.append("")

    if images:
        lines.append("### 🖼️ Related Images Found:")
        for i, img in enumerate(images, 1):
            lines.append(f"{i}. [{img['title']}]({img['url']})")
        lines.append("")

    if not web and not images:
        lines.append("No search results were found for this query.")

    return "\n".join(lines)
