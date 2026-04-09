import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.export_service import generate_document_pdf, generate_document_xlsx

SAMPLE_DOC = {
    "type": "document",
    "title": "Bug Hunt",
    "table_of_contents": [],
    "sections": [
        {
            "heading": "Failure Case",
            "level": 1,
            "type": "content",
            "content": "This is a <br> bad test.",
            "tables": [
                {
                    "headers": ["Entity", "Time"],
                    "rows": [
                        ["10,000 years (Google)<br>2.5 days (IBM)", "Testing"]
                    ]
                }
            ],
            "subsections": []
        }
    ],
    "metadata": {}
}

def main():
    out_dir = os.path.join(os.path.dirname(__file__), "test_output")
    os.makedirs(out_dir, exist_ok=True)
    
    print("Testing PDF...")
    try:
        pdf_bytes = generate_document_pdf(SAMPLE_DOC)
        with open(os.path.join(out_dir, "test_br.pdf"), "wb") as f:
            f.write(pdf_bytes)
        print("PDF Success")
    except Exception as e:
        print(f"PDF Error: {e}")
        import traceback; traceback.print_exc()

    print("Testing XLSX...")
    try:
        xlsx_bytes = generate_document_xlsx(SAMPLE_DOC)
        with open(os.path.join(out_dir, "test_br.xlsx"), "wb") as f:
            f.write(xlsx_bytes)
        print("XLSX Success")
    except Exception as e:
        print(f"XLSX Error: {e}")
        import traceback; traceback.print_exc()

if __name__ == "__main__":
    main()
