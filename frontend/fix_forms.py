import os
import glob

forms_dir = "D:/M-FIles/incident-management/frontend/src/pages/forms"
files = glob.glob(os.path.join(forms_dir, "*Form.tsx"))

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix the syntax error in the form style
    content = content.replace(
        "gap:'2rem'}}, pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1}>",
        "gap:'2rem', pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1}}>"
    )
    
    # If CargoForm was accidentally caught with this, it might not have the double brace issue, but let's just run it
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed", filepath)
