"""
LACUNEX AI — File Extraction Route
Extracts text from uploaded files (PDF, DOCX, XLSX, TXT) instantly in memory.
No file is persisted on the server to ensure maximum privacy.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import io

router = APIRouter(prefix="/api/files", tags=["Files"])

@router.post("/extract")
async def extract_file_text(file: UploadFile = File(...)):
    """
    Reads an uploaded file in-memory and extracts its raw text.
    Returns: { "filename": str, "content": str, "type": str }
    """
    try:
        content = ""
        file_bytes = await file.read()
        filename = file.filename.lower()

        # 1. Handle PDF
        if filename.endswith(".pdf") or file.content_type == "application/pdf":
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            text_chunks = []
            for page in pdf_reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_chunks.append(extracted)
            content = "\n".join(text_chunks)
            file_type = "pdf"

        # 2. Handle DOCX
        elif filename.endswith(".docx") or file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            content = "\n".join([para.text for para in doc.paragraphs])
            file_type = "docx"

        # 3. Handle XLSX (Excel)
        elif filename.endswith(".xlsx") or file.content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            text_chunks = []
            for sheet in wb.worksheets:
                text_chunks.append(f"--- Sheet: {sheet.title} ---")
                for row in sheet.iter_rows(values_only=True):
                    row_text = "\t".join([str(cell) for cell in row if cell is not None])
                    if row_text.strip():
                        text_chunks.append(row_text)
            content = "\n".join(text_chunks)
            file_type = "xlsx"

        # 4. Handle TXT / Markdown / CSV
        elif filename.endswith(".txt") or filename.endswith(".md") or filename.endswith(".csv") or "text" in file.content_type:
            content = file_bytes.decode('utf-8', errors='replace')
            file_type = "text"
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, Word, Excel, or Text files.")

        # Clean zero-width characters or excess whitespace
        if content:
            content = content.replace("\x00", "").strip()

        if not content:
             raise HTTPException(status_code=400, detail="Could not extract text from this file (it may be an image-only PDF).")

        return {"filename": file.filename, "content": content, "type": file_type}

    except Exception as e:
        print(f"[FileExtractor] Error extracting {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract file: {str(e)}")
