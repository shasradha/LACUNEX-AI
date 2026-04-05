"""
LACUNEX AI — Elite Website Scraper Service
Safe, fast, and privacy-focused website text extraction.
Features: Timeouts, size limits, and aggressive cleaning.
"""

import asyncio
import re
import time
import httpx
from typing import Optional, Dict

# In-memory cache for recent scrapes (URL -> {text, expiry})
_SCRAPE_CACHE: Dict[str, dict] = {}
_CACHE_TTL = 300  # 5 minutes


async def fetch_url_content(url: str) -> Optional[str]:
    """
    Fetch and clean text content from a specific URL.
    Returns cleaned text or None if failed.
    """
    # 1. Check cache
    now = time.time()
    if url in _SCRAPE_CACHE:
        cache_item = _SCRAPE_CACHE[url]
        if now < cache_item["expiry"]:
            return cache_item["text"]
        else:
            del _SCRAPE_CACHE[url]

    # 2. Perform Fetch
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            
            # Check content size (max 256KB to prevent memory issues)
            if len(response.content) > 256000:
                print(f"[Scraper] Content too large: {url}")
                return "Error: Website content too large to process safely."

            if response.status_code == 403 or response.status_code == 401:
                return "Error: Access denied (this site may be blocked by Cloudflare or require login)."
            
            if not response.is_success:
                return f"Error: Request failed with status {response.status_code}."

            # ── Elite Text Extraction ────────────────────────────────────────
            html = response.text
            
            # Strip scripts and styles
            html = re.sub(r"<(script|style|nav|header|footer|aside|iframe).*?>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
            
            # Extract basic metadata
            title_match = re.search(r"<title>(.*?)</title>", html, re.I)
            title = title_match.group(1) if title_match else "No Title"
            
            meta_desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html, re.I)
            meta_desc = meta_desc_match.group(1) if meta_desc_match else ""

            # Standard HTML stripping (keep only text inside body tags if possible)
            body_match = re.search(r"<body.*?>(.*?)</body>", html, re.DOTALL | re.IGNORECASE)
            content_html = body_match.group(1) if body_match else html

            # Final tag removal
            clean_text = re.sub(r"<.*?>", " ", content_html)
            
            # Collapse whitespace
            clean_text = re.sub(r"\s+", " ", clean_text).strip()
            
            # Cap length to ~1200 words (roughly 6000-8000 chars)
            max_chars = 8000
            if len(clean_text) > max_chars:
                clean_text = clean_text[:max_chars] + "... [Text truncated for efficiency]"

            # Combine metadata
            final_content = f"SITE: {url}\nTITLE: {title}\nDESCRIPTION: {meta_desc}\n\nCONTENT:\n{clean_text}"
            
            # 3. Save to cache
            _SCRAPE_CACHE[url] = {
                "text": final_content,
                "expiry": now + _CACHE_TTL
            }
            
            return final_content

    except Exception as e:
        print(f"[Scraper] Error fetching {url}: {e}")
        return f"Error: Could not retrieve content from {url} ({str(e)})."
