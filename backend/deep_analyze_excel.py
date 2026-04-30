import zipfile
import xml.etree.ElementTree as ET

def get_shared_strings(z):
    try:
        ss_xml = z.read('xl/sharedStrings.xml')
        root = ET.fromstring(ss_xml)
        return [t.text for t in root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
    except:
        return []

def get_sheet_sample_rows(z, target_path, shared_strings, num_rows=5):
    try:
        # target_path might be absolute within the zip (starting with /xl/) or relative to xl/
        path = f"xl/{target_path}" if not target_path.startswith('xl/') else target_path
        sheet_xml = z.read(path)
        root = ET.fromstring(sheet_xml)
        
        sample_rows = []
        row_count = 0
        for row in root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            if row_count < num_rows:
                current_row_data = []
                for cell in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    v_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    if v_elem is not None:
                        t = cell.attrib.get('t')
                        val = v_elem.text
                        if t == 's': # Shared string
                            idx = int(val)
                            current_row_data.append(shared_strings[idx] if idx < len(shared_strings) else f"ERR_IDX_{idx}")
                        else:
                            current_row_data.append(val)
                    else:
                        current_row_data.append('') # Append empty string for empty cells
                sample_rows.append(current_row_data)
                row_count += 1
            else:
                break # Stop after collecting num_rows
        return sample_rows
    except Exception as e:
        return [[f"Error: {e}"]]

def analyze_full_excel(file_path):
    results = {}
    with zipfile.ZipFile(file_path, 'r') as z:
        shared_strings = get_shared_strings(z)
        
        # 1. Get relationships
        rels_xml = z.read('xl/_rels/workbook.xml.rels')
        rels_root = ET.fromstring(rels_xml)
        rel_map = {}
        for rel in rels_root.iter('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rel_map[rel.attrib.get('Id')] = rel.attrib.get('Target')
            
        # 2. Map sheet names
        wb_xml = z.read('xl/workbook.xml')
        wb_root = ET.fromstring(wb_xml)
        
        for sheet in wb_root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
            name = sheet.attrib.get('name')
            rId = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            target = rel_map.get(rId)
            if target:
                results[name] = get_sheet_sample_rows(z, target, shared_strings, num_rows=5)
            
    return results

if __name__ == "__main__":
    xlsx_path = r"D:\M-FIles\Risk and Compliance v2 AAW Report.xlsx"
    analysis = analyze_full_excel(xlsx_path)
    
    with open("deep_excel_analysis.txt", "w", encoding="utf-8") as f:
        for sheet, rows_data in analysis.items():
            f.write(f"SHEET: {sheet}\n")
            if rows_data:
                f.write(f"HEADERS: {', '.join(filter(None, rows_data[0]))}\n") # Assuming first row is headers
                f.write("SAMPLE DATA (first 5 rows):\n")
                for i, row in enumerate(rows_data):
                    f.write(f"  Row {i+1}: {', '.join(filter(None, row))}\n")
            else:
                f.write("  No data found.\n")
            f.write("-" * 40 + "\n")
    print("Export successful.")
