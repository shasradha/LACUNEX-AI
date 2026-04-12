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
    from datetime import date
    TODAY = date.today()
    TODAY_STR = TODAY.strftime("%d %B %Y")
    TODAY_SHORT = TODAY.strftime("%B %Y")
    YEAR = TODAY.year

    orig_query = query.lower()
    final_query = query
    # Sports/Scores/News
    if any(k in orig_query for k in ['ipl', 'cricket', 'football', 'fifa', 'score', 'match', 'news', 'update', 'today', 'yesterday']):
        final_query = f"{query} {TODAY_STR}"
    # Latest/Recent
    elif any(k in orig_query for k in ['latest', 'recent', 'this month']):
        final_query = f"{query} {TODAY_SHORT}"
    # General current
    elif any(k in orig_query for k in ['2025', '2026', 'current']):
        final_query = f"{query} {YEAR}"

    try:
        from ddgs import DDGS

        def _search(backend="api"):
            with DDGS(timeout=8) as ddgs:
                results = []
                for r in ddgs.text(final_query, backend=backend, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
                return results

        try:
            return await asyncio.wait_for(asyncio.to_thread(_search, "api"), timeout=10.0)
        except (asyncio.TimeoutError, Exception) as e:
            print(f"[SearchService] Default search failed ({e}). Retrying with html fallback...")
            try:
                return await asyncio.wait_for(asyncio.to_thread(_search, "html"), timeout=12.0)
            except Exception as fallback_e:
                print(f"[SearchService] Fallback search also failed: {fallback_e}")
                return []
    except Exception as e:
        print(f"[SearchService] Web search failed completely: {e}")
        return []

import os
import aiohttp

async def search_images(query: str, max_results: int = 8) -> List[dict]:
    """
    Search for images using the fallback chain:
    1. Unsplash
    2. Pixabay
    3. Pexels
    4. DuckDuckGo (Fallback)
    Returns a list of {title, url, thumbnail, source, source_url} dicts.
    """
    # Clean conversational filler so search APIs actually find images
    clean_query = re.sub(
        r"(?i)\b(show|find|fine|search|get|see|fetch|display|look|suggest|recommend|give|send)(?:\s+me)?(?:\s+some)?(?:\s+cool)?(?:\s+best)?\s+",
        "", query
    )
    clean_query = re.sub(r"(?i)\b(?:pictures?|images?|photos?)\s+(?:of|for|about)\b", "", clean_query).strip()
    if len(clean_query) < 2:
        clean_query = query

    print(f"[SearchService] 📸 Target query: '{clean_query}'")

    unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY")
    pixabay_key = os.getenv("PIXABAY_API_KEY")
    pexels_key = os.getenv("PEXELS_KEY")

    results = []

    async with aiohttp.ClientSession() as session:
        # Phase 1: Unsplash
        if unsplash_key and len(results) == 0:
            try:
                async with session.get(
                    "https://api.unsplash.com/search/photos",
                    params={"query": clean_query, "per_page": max_results, "client_id": unsplash_key},
                    timeout=5,
                ) as res:
                    if res.status == 200:
                        data = await res.json()
                        for item in data.get("results", []):
                            results.append({
                                "title": item.get("description") or item.get("alt_description", "Unsplash Image"),
                                "url": item["urls"]["regular"],
                                "thumbnail": item["urls"]["small"],
                                "source": "Unsplash",
                                "source_url": item["links"]["html"]
                            })
            except Exception as e:
                print(f"[SearchService] Unsplash failed: {e}")

        # Phase 2: Pixabay
        if pixabay_key and len(results) == 0:
            try:
                async with session.get(
                    "https://pixabay.com/api/",
                    params={"key": pixabay_key, "q": clean_query, "per_page": max_results + 2},
                    timeout=5,
                ) as res:
                    if res.status == 200:
                        data = await res.json()
                        for item in data.get("hits", [])[:max_results]:
                            results.append({
                                "title": item.get("tags", "Pixabay Image"),
                                "url": item["largeImageURL"],
                                "thumbnail": item["previewURL"],
                                "source": "Pixabay",
                                "source_url": item["pageURL"]
                            })
            except Exception as e:
                print(f"[SearchService] Pixabay failed: {e}")

        # Phase 3: Pexels
        if pexels_key and len(results) == 0:
            try:
                async with session.get(
                    "https://api.pexels.com/v1/search",
                    headers={"Authorization": pexels_key},
                    params={"query": clean_query, "per_page": max_results},
                    timeout=5,
                ) as res:
                    if res.status == 200:
                        data = await res.json()
                        for item in data.get("photos", []):
                            results.append({
                                "title": item.get("alt", "Pexels Image"),
                                "url": item["src"]["large"],
                                "thumbnail": item["src"]["medium"],
                                "source": "Pexels",
                                "source_url": item["url"]
                            })
            except Exception as e:
                print(f"[SearchService] Pexels failed: {e}")

    # Phase 4: DuckDuckGo Fallback
    if len(results) == 0:
        print("[SearchService] 🦆 Falling back to DuckDuckGo Images")
        try:
            from ddgs import DDGS
            def _ddgs_search():
                with DDGS(timeout=8) as ddgs:
                    raw_results = list(ddgs.images(clean_query, safesearch="moderate", max_results=max_results))
                    ddgs_res = []
                    for r in raw_results:
                        if r.get("image", "").startswith("http"):
                            ddgs_res.append({
                                "title": r.get("title", ""),
                                "url": r.get("image", ""),
                                "thumbnail": r.get("thumbnail", r.get("image", "")),
                                "source": r.get("source", "Web"),
                                "source_url": r.get("url", ""),
                            })
                    return ddgs_res

            results = await asyncio.wait_for(asyncio.to_thread(_ddgs_search), timeout=10.0)
        except Exception as e:
            print(f"[SearchService] DDGS Fallback failed: {e}")

    print(f"[SearchService] ✅ Returning {len(results)} image results")
    return results


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
