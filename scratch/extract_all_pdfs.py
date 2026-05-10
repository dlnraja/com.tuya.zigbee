import os
import sys
import pypdf

# Safe console output for Windows with emojis
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

pdf_dir = "reference pdf"
out_dir = "tmp/extracted_text"
os.makedirs(out_dir, exist_ok=True)

files = os.listdir(pdf_dir)
print(f"Found {len(files)} files in '{pdf_dir}'")

for filename in files:
    if not filename.endswith(".pdf"):
        continue
    # Skip duplicates to save processing time
    if any(suffix in filename for suffix in ["(1).pdf", "(2).pdf", "(3).pdf"]):
        print(f"Skipping duplicate: {filename.encode('ascii', 'ignore').decode('ascii')}")
        continue
        
    pdf_path = os.path.join(pdf_dir, filename)
    txt_filename = filename.replace(".pdf", ".txt")
    txt_path = os.path.join(out_dir, txt_filename)
    
    # Safe console printing by stripping/ignoring emojis if necessary
    safe_print_name = filename.encode('ascii', 'ignore').decode('ascii')
    print(f"Extracting text from: {safe_print_name}...")
    try:
        reader = pypdf.PdfReader(pdf_path)
        text_content = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text_content.append(f"--- Page {i+1} ---\n{text}\n")
        
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(text_content))
        print(f"Successfully saved: {safe_print_name.replace('.pdf', '.txt')}")
    except Exception as e:
        print(f"Error extracting {safe_print_name}: {e}")

print("🎉 PDF extraction completed!")
