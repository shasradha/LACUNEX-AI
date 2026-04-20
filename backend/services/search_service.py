"""
LACUNEX AI — Web & Image Search Service v6.0
Privacy-focused search powered by DuckDuckGo (ddgs package).
Enhanced with multi-query strategy, news endpoint, result deduplication,
and timeliness scoring for superior real-time data accuracy.

IMPORTANT: This uses the NEW 'ddgs' package, NOT the deprecated 'duckduckgo-search'.
"""

import asyncio
import re
import os
import aiohttp
from typing import List
from datetime import date, timedelta


async def search_web(query: str, max_results: int = 20) -> List[dict]:
    """
    Search the web for text results with smart date enrichment.
    Returns a list of {title, url, snippet} dicts.
    """
    TODAY = date.today()
    TODAY_STR = TODAY.strftime("%d %B %Y")
    TODAY_SHORT = TODAY.strftime("%B %Y")
    YEAR = TODAY.year

    orig_query = query.lower()
    final_query = query

    # Sports/Scores/News — force today's date
    if any(k in orig_query for k in [
        'ipl', 'cricket', 'football', 'fifa', 'score', 'match',
        'news', 'update', 'today', 'yesterday', 'nba', 'tennis',
        'premier league', 'world cup', 'live', 'playing', 'schedule',
        'standings', 'ranking', 'result', 'won', 'lost'
    ]):
        final_query = f"{query} {TODAY_STR}"
    # Latest/Recent
    elif any(k in orig_query for k in ['latest', 'recent', 'this month', 'this week']):
        final_query = f"{query} {TODAY_SHORT}"
    # General current
    elif any(k in orig_query for k in ['2025', '2026', 'current', 'now']):
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

        def _search_news():
            """Search DuckDuckGo News for time-sensitive queries."""
            try:
                with DDGS(timeout=8) as ddgs:
                    results = []
                    for r in ddgs.news(query, max_results=8):
                        results.append({
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "snippet": r.get("body", ""),
                        })
                    return results
            except Exception:
                return []

        # Determine if this is a time-sensitive query
        is_time_sensitive = any(k in orig_query for k in [
            'today', 'yesterday', 'score', 'match', 'live', 'news',
            'ipl', 'cricket', 'football', 'nba', 'weather', 'stock',
            'schedule', 'result', 'won', 'playing', 'standings'
        ])

        if is_time_sensitive:
            # Multi-query strategy: search web + news in parallel
            try:
                web_task = asyncio.to_thread(_search, "api")
                news_task = asyncio.to_thread(_search_news)
                web_results, news_results = await asyncio.wait_for(
                    asyncio.gather(web_task, news_task, return_exceptions=True),
                    timeout=12.0
                )
                
                web_results = web_results if isinstance(web_results, list) else []
                news_results = news_results if isinstance(news_results, list) else []
                
                # Merge and deduplicate by URL
                seen_urls = set()
                merged = []
                
                # Prioritize news results (more recent)
                for r in news_results:
                    url = r.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        merged.append(r)
                
                for r in web_results:
                    url = r.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        merged.append(r)
                
                # Timeliness scoring: boost results mentioning today's date or year
                today_patterns = [
                    TODAY_STR.lower(),
                    TODAY.strftime("%d/%m/%Y"),
                    TODAY.strftime("%Y-%m-%d"),
                    str(YEAR),
                    TODAY.strftime("%B %d"),
                ]
                
                def timeliness_score(result):
                    snippet = (result.get("snippet", "") + " " + result.get("title", "")).lower()
                    score = 0
                    for pat in today_patterns:
                        if pat.lower() in snippet:
                            score += 1
                    return score
                
                merged.sort(key=timeliness_score, reverse=True)
                return merged[:max_results]
                
            except Exception as e:
                print(f"[SearchService] Multi-query failed ({e}), falling back to single search")
        
        # Standard single search
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

    web_task = asyncio.create_task(search_web(query, max_results=20))

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
