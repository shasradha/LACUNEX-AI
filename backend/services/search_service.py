"""
LACUNEX AI — Web & Image Search Service
Privacy-focused search powered by DuckDuckGo.
No API keys required. No tracking. Fast results.
"""

import asyncio
from typing import List


async def search_web(query: str, max_results: int = 5) -> List[dict]:
    """
    Search the web for text results.
    Returns a list of {title, url, snippet} dicts.
    """
    try:
        from duckduckgo_search import DDGS

        def _search():
            # DDGS initialization with a specific timeout to prevent hanging on Render
            with DDGS(timeout=10) as ddgs:
                results = []
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
                return results

        # Wait at most 12 seconds for the thread to complete (margin for setup)
        return await asyncio.wait_for(asyncio.to_thread(_search), timeout=12.0)
    except asyncio.TimeoutError:
        print(f"[SearchService] Web search timed out for query: {query}")
        return []
    except Exception as e:
        print(f"[SearchService] Web search failed: {e}")
        return []


async def search_images(query: str, max_results: int = 6) -> List[dict]:
    """
    Search for images.
    Returns a list of {title, url, thumbnail, source} dicts.
    """
    import re
    # Clean conversational filler so DuckDuckGo actually finds images
    clean_query = re.sub(
        r"(?i)\b(show|find|search|get)(?:\s+me)?(?:\s+some)?\s+(?:cool\s+)?", "", query
    )
    # Strip "pictures of", "images of", "photos of" etc. 
    # But do NOT strip "wallpapers" because the user usually wants that exact format.
    clean_query = re.sub(
        r"(?i)\b(?:pictures?|images?|photos?)\s+of\b", "", clean_query
    ).strip()

    # Fallback to the original query if cleaning stripped everything
    if len(clean_query) < 2:
        clean_query = query

    try:
        from duckduckgo_search import DDGS

        def _search():
            # Use the latest recommended initialization pattern
            with DDGS(timeout=10) as ddgs:
                results = []
                # region='wt-wt' is worldwide. safesearch='off' to get better wallpapers
                # but we'll stick to 'moderate' for default safety.
                for r in ddgs.images(
                    clean_query, 
                    region="wt-wt", 
                    safesearch="moderate", 
                    max_results=max_results
                ):
                    image_url = r.get("image", "")
                    if not image_url or not image_url.startswith("http"):
                        continue
                        
                    results.append({
                        "title": r.get("title", ""),
                        "url": image_url,
                        "thumbnail": r.get("thumbnail", image_url),
                        "source": r.get("source", "Web"),
                        "source_url": r.get("url", ""),
                    })
                return results

        print(f"[SearchService] Finding images for: {clean_query}")
        return await asyncio.wait_for(asyncio.to_thread(_search), timeout=12.0)
    except asyncio.TimeoutError:
        print(f"[SearchService] Image search timed out for query: {clean_query}")
        return []
    except Exception as e:
        print(f"[SearchService] Image search failed: {e}")
        return []



async def search_all(query: str, image_search: bool = False) -> dict:
    """
    Run web + image search in parallel for maximum speed.
    Returns {web_results: [...], image_results: [...]}.
    """
    web_task = asyncio.create_task(search_web(query, max_results=5))

    if image_search:
        image_task = asyncio.create_task(search_images(query, max_results=6))
        web_results, image_results = await asyncio.gather(
            web_task, image_task, return_exceptions=True
        )
    else:
        web_results = await web_task
        image_results = []

    return {
        "web_results": web_results if isinstance(web_results, list) else [],
        "image_results": image_results if isinstance(image_results, list) else [],
    }


def format_text_context(web_results: list) -> str:
    """
    Format web text results into a clean context block for the AI.
    Images are handled separately by the frontend gallery component.
    """
    if not web_results:
        return "No web results found."

    lines = ["### 🌐 Live Web Results (use these to answer accurately, cite sources):"]
    for i, r in enumerate(web_results, 1):
        lines.append(f"{i}. **{r['title']}**")
        lines.append(f"   Source: [{r['url']}]({r['url']})")
        lines.append(f"   > {r['snippet']}")
        lines.append("")
    return "\n".join(lines)
