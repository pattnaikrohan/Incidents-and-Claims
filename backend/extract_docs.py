import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def read_odt(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            content = z.read('content.xml')
            root = ET.fromstring(content)
            # Find all text:p elements
            text = []
            for p in root.iter('{urn:oasis:names:tc:opendocument:xmlns:text:1.0}p'):
                text.append(''.join(p.itertext()))
            return "\n".join(text)
    except Exception as e:
        return f"Error reading ODT: {e}"

def read_xlsx_structure(file_path):
    # If openpyxl is not available, we can't easily read it without installing.
    # But we can try to list the sheets if it's a zip.
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            # Excel files are also zips. xl/workbook.xml contains sheet names.
            workbook = z.read('xl/workbook.xml')
            root = ET.fromstring(workbook)
            sheets = []
            for sheet in root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
                sheets.append(sheet.attrib.get('name'))
            return f"Sheets: {', '.join(sheets)}"
    except Exception as e:
        return f"Error reading XLSX structure: {e}"

if __name__ == "__main__":
    odt_path = r"D:\M-FIles\Statement of Work - Incidents & Claims Solution.odt"
    xlsx_path = r"D:\M-FIles\Risk and Compliance v2 AAW Report.xlsx"
    
    output_filename = "output.txt"
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write("--- ODT CONTENT ---\n")
        f.write(read_odt(odt_path) + "\n")
        f.write("\n--- XLSX STRUCTURE ---\n")
        f.write(read_xlsx_structure(xlsx_path) + "\n")
