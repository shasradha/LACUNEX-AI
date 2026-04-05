"""
LACUNEX AI — Web & Image Search Service
Privacy-focused search powered by DuckDuckGo (ddgs package).
No API keys required. No tracking. Fast results.

IMPORTANT: This uses the NEW 'ddgs' package, NOT the deprecated 'duckduckgo-search'.
"""

import asyncio
import re
from typing import List


async def search_web(query: str, max_results: int = 15) -> List[dict]:
    """
    Search the web for text results.
    Returns a list of {title, url, snippet} dicts.
    """
    try:
        from ddgs import DDGS

        def _search():
            with DDGS(timeout=8) as ddgs:
                results = []
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
                return results

        return await asyncio.wait_for(asyncio.to_thread(_search), timeout=10.0)
    except asyncio.TimeoutError:
        print(f"[SearchService] Web search timed out for query: {query}")
        return []
    except Exception as e:
        print(f"[SearchService] Web search failed: {e}")
        return []


async def search_images(query: str, max_results: int = 8) -> List[dict]:
    """
    Search for images using the ddgs package.
    Returns a list of {title, url, thumbnail, source, source_url} dicts.
    """
    # Clean conversational filler so DuckDuckGo actually finds images
    clean_query = re.sub(
        r"(?i)\b(show|find|fine|search|get|see|fetch|display|look)(?:\s+me)?(?:\s+some)?(?:\s+cool)?\s+",
        "", query
    )
    # Strip "pictures of", "images of", "photos of" etc.
    clean_query = re.sub(
        r"(?i)\b(?:pictures?|images?|photos?)\s+of\b", "", clean_query
    ).strip()

    # Fallback to the original query if cleaning stripped everything
    if len(clean_query) < 2:
        clean_query = query

    print(f"[SearchService] 🔍 Image search starting | Original: '{query}' | Cleaned: '{clean_query}'")

    try:
        from ddgs import DDGS

        def _search():
            with DDGS(timeout=8) as ddgs:
                raw_results = list(ddgs.images(
                    clean_query,
                    region="wt-wt",
                    safesearch="moderate",
                    max_results=max_results
                ))

                print(f"[SearchService] 📸 DuckDuckGo returned {len(raw_results)} raw image results")

                results = []
                for r in raw_results:
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

                print(f"[SearchService] ✅ Returning {len(results)} valid images to frontend")
                return results

        result = await asyncio.wait_for(asyncio.to_thread(_search), timeout=10.0)
        return result
    except asyncio.TimeoutError:
        print(f"[SearchService] ⏰ Image search timed out for: {clean_query}")
        return []
    except Exception as e:
        print(f"[SearchService] ❌ Image search FAILED: {type(e).__name__}: {e}")
        return []


async def search_all(query: str, image_search: bool = False) -> dict:
    """
    Run web + image search in parallel for maximum speed.
    Returns {web_results: [...], image_results: [...]}.
    """
    print(f"[SearchService] search_all called | image_search={image_search} | query='{query[:60]}'")

    web_task = asyncio.create_task(search_web(query, max_results=15))

    if image_search:
        image_task = asyncio.create_task(search_images(query, max_results=8))
        web_results, image_results = await asyncio.gather(
            web_task, image_task, return_exceptions=True
        )
    else:
        web_results = await web_task
        image_results = []

    final_web = web_results if isinstance(web_results, list) else []
    final_images = image_results if isinstance(image_results, list) else []

    print(f"[SearchService] 🏁 search_all done | web={len(final_web)} | images={len(final_images)}")

    return {
        "web_results": final_web,
        "image_results": final_images,
    }


def format_text_context(web_results: list) -> str:
    """
    Format web text results into a clean context block for the AI.
    Images are handled separately by the frontend gallery component.
    """
    if not web_results:
        return "No web results found."

    lines = ["### 🌐 Live Web Results (Use these to answer accurately, cite sources):"]
    for i, r in enumerate(web_results, 1):
        lines.append(f"[{i}] **{r['title']}**")
        lines.append(f"    Source: {r['url']}")
        lines.append(f"    Snippet: {r['snippet']}")
        lines.append("")
    return "\n".join(lines)
