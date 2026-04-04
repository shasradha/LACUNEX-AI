import asyncio
from services.search_service import search_all
from services.intent_detector import detect_intent

async def main():
    q1 = "find me some cool neon cyberpunk wallpapers"
    q2 = "Write a highly detailed essay on quantum mechanics"
    
    print("Testing q1:", q1)
    print("Intent:", detect_intent(q1))
    # res = await search_all(q1, image_search=True)
    # print("Images found:", len(res['image_results']))

    print("\nTesting q2:", q2)
    print("Intent:", detect_intent(q2))

if __name__ == "__main__":
    asyncio.run(main())
