import os
import re

forms_dir = "D:/M-FIles/incident-management/frontend/src/pages/forms"
files = ["FinanceForm.tsx", "HRForm.tsx", "ITForm.tsx", "NCRForm.tsx", "RiskForm.tsx", "WHSForm.tsx"]

for filename in files:
    filepath = os.path.join(forms_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Update Props
    content = re.sub(
        r"interface Props \{.*?\}",
        "interface Props { onSubmit?: (d: any)=>void; onCancel?: ()=>void; loading?: boolean; initialData?: any; readOnly?: boolean; }",
        content,
        flags=re.DOTALL
    )
    
    # 2. Update component signature
    component_name = filename.replace(".tsx", "")
    content = re.sub(
        rf"export default function {component_name}\(.*?\)\s*{{",
        f"export default function {component_name}({{ onSubmit, onCancel, loading, initialData, readOnly }}: Props) {{",
        content
    )
    
    # 3. Update useState and mapping
    state_replacement = """  const [f, setF] = useState<any>(() => {
    if (initialData) {
      return {
        ...initialData,
        incident_ref: initialData.incident_number_str || initialData.incident_id || `INC-${initialData.id}`,
        incident_id: initialData.incident_number_str || initialData.incident_id || `INC-${initialData.id}`,
        ncr_ref: initialData.incident_number_str || initialData.incident_id || `INC-${initialData.id}`,
        date_of_incident: initialData.date_of_incident || initialData.date || '',
        date_reported: initialData.date_reported || initialData.date || today(),
        date_logged: initialData.date_logged || initialData.date || today(),
        reported_by: initialData.reported_by || initialData.logged_by || initialData.creator_id || 'System User',
        logged_by: initialData.logged_by || initialData.reported_by || initialData.creator_id || 'System User',
        employee_name: initialData.employee_name || initialData.customer_name || '',
        business_unit: initialData.business_unit || '',
        branch_department: initialData.branch_department || '',
        incident_type: initialData.incident_type || initialData.type || '',
        description: initialData.description || initialData.short_description || '',
        short_description: initialData.short_description || initialData.description || '',
        location_of_incident: initialData.location_of_incident || initialData.location || '',
        system_job_number: initialData.system_job_number || initialData.job_number || '',
      };
    }
    return {"""
    content = content.replace("  const [f, setF] = useState({", state_replacement)
    
    # Fix the closing bracket of useState
    content = content.replace("  });\n  const upd", "  };\n  });\n  const upd")
    content = content.replace("  });\n\n  const upd", "  };\n  });\n\n  const upd")
    
    # Fix `upd` function signature
    content = content.replace("const upd = (k:string,v:any) => setF(p=>({...p,[k]:v}));", "const upd = (k:string,v:any) => setF((p:any)=>({...p,[k]:v}));")

    # 4. Wrap form in fieldset and handle readOnly
    content = re.sub(
        r"<form.*?onSubmit=\{.*?\}.*?>",
        lambda m: m.group(0)[:-1] + ", pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.95 : 1}>\n      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>",
        content,
        count=1
    )
    
    # 5. Hide buttons if readOnly
    content = re.sub(
        r"(<div style=\{\{display:'flex',justifyContent:'flex-end',gap:'1rem'\}\}>)",
        r"{!readOnly && (\n      \1",
        content
    )
    content = content.replace("</button>\n      </div>\n    </form>", "</button>\n      </div>\n      )}\n      </fieldset>\n    </form>")
    
    # Also avoid `e.preventDefault()` error if onSubmit is undefined
    content = content.replace("onSubmit({", "if (onSubmit) onSubmit({")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filename}")
