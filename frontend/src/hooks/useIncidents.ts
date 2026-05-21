import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_STATUSES } from '../utils/incidentConstants';

export function useIncidents(pollingInterval = 2000) {
  const [incidents, setIncidents] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('pa_incidents_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('pa_incidents_cache');
    } catch {
      return true;
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLatestFromPA = useCallback(async () => {
    try {
      console.log('--- Polling Parallel Digital Twin Flows (v2.1) ---');

      const STANDARD_FLOW_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/c0d6a89ac13e49fb9e84b993721d6b4e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Y2-4H9wder7Ea3MoWPW_gMSWPWyL4a9uHsiTbJ1TDFw';
      const NCR_FLOW_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/0045b29424d14bec952421cf0ef7b051/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=n-bzHfDvrFFtQmiKjB0c9xngFKJqJU7sRqtU5DoM4Pg';
      const COR_POLLING_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9024d22093174eb39dac78207b4cda85/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=heqXTA7X3BXTrv1hL29NB6_UOLzek3DMeWeNpsofToQ';
      const CLAIMS_POLLING_URL = 'https://default9a3bb30112fd4106a7f7563f72cfdf.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3bc5af8e02904409b61b7b389f73a591/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Z0sD7CY2GhZLzteUBjeoiHFQiJYFb0PWbA4W6OkDXBU';

      const [stdRes, ncrRes, corRes, claimsRes] = await Promise.all([
        fetch(STANDARD_FLOW_URL),
        fetch(NCR_FLOW_URL),
        fetch(COR_POLLING_URL),
        fetch(CLAIMS_POLLING_URL)
      ]);

      const safeParse = async (res: Response) => {
        if (!res.ok) return {};
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : {};
        } catch (e) {
          console.warn('Failed to parse JSON from response:', text);
          return {};
        }
      };

      const payloads = await Promise.all([
        safeParse(stdRes),
        safeParse(ncrRes),
        safeParse(corRes),
        safeParse(claimsRes)
      ]);

      const getCount = (p: any, key: string) => {
        if (!p) return 0;
        if (Array.isArray(p[key])) return p[key].length;
        if (Array.isArray(p.body)) return p.body.length;
        if (Array.isArray(p)) return p.length;
        return 0;
      };

      console.log('Standard Payload Categories:', Object.keys(payloads[0]));
      console.log('NCR Records Count:', getCount(payloads[1], 'ncr_incidents'));
      console.log('CoR Records Count:', getCount(payloads[2], 'cor_incidents'));
      const getClaimsCount = (p: any) => {
        if (!p) return 0;
        let count = 0;
        const keys = ['cargo_equipment_incidents', 'human_resources_incidents', 'workplace_health_safety_incidents', 'it_security_incidents', 'risk_compliance_incidents', 'finance_incidents'];
        keys.forEach(k => {
          if (Array.isArray(p[k])) count += p[k].length;
        });
        return count;
      };

      console.log('Claims Records Count:', getClaimsCount(payloads[3]), '| Raw Keys:', Object.keys(payloads[3] || {}));

      const mergedMap = new Map<string, any>();

      const mapRawToClean = (raw: any) => {
        const clean: any = {};
        Object.keys(raw).forEach(key => {
          const lowerKey = key.toLowerCase();
          let cleanKey = lowerKey;

          if (lowerKey.startsWith('cr991_')) {
            cleanKey = lowerKey.replace('cr991_', '');
          }

          if (
            cleanKey === 'incidentid' || cleanKey === 'incident_id' ||
            cleanKey === 'incidentnumber' || cleanKey === 'incident_number' ||
            cleanKey === 'incidentref' || cleanKey === 'incident_ref' ||
            cleanKey === 'referencenumber' || cleanKey === 'reference_number' ||
            cleanKey === 'name' || cleanKey === 'ref' || cleanKey === 'number' ||
            cleanKey === 'hrid' || cleanKey === 'hr_id' ||
            cleanKey === 'whsid' || cleanKey === 'whs_id' ||
            cleanKey === 'itid' || cleanKey === 'it_id' ||
            cleanKey === 'ncr_ref' || cleanKey === 'ncrref' ||
            cleanKey === 'ncr_number' || cleanKey === 'ncrnumber'
          ) cleanKey = 'incident_number_str';

          if (cleanKey === 'shortdescription') cleanKey = 'short_description';
          if (cleanKey === 'dateofincident') cleanKey = 'date_of_incident';
          if (cleanKey === 'datelogged') cleanKey = 'date_logged';
          if (cleanKey === 'loggedby') cleanKey = 'logged_by';
          if (cleanKey === 'businessunit') cleanKey = 'business_unit';
          if (cleanKey === 'branchdepartment') cleanKey = 'branch_department';
          if (cleanKey === 'incidenttype') cleanKey = 'incident_type';
          if (cleanKey === 'rootcause') cleanKey = 'root_cause';
          if (cleanKey === 'correctiveaction') cleanKey = 'corrective_action';
          if (cleanKey === 'systemjobnumber') cleanKey = 'system_job_number';
          if (cleanKey === 'incidentsummary') cleanKey = 'incident_summary';
          if (cleanKey === 'locationofincident') cleanKey = 'location_of_incident';
          if (cleanKey === 'cargodescription') cleanKey = 'cargo_description';
          if (cleanKey === 'cargovalue') cleanKey = 'cargo_value';
          if (cleanKey === 'containernumbers') cleanKey = 'container_numbers';
          if (cleanKey === 'originagent') cleanKey = 'origin_agent';
          if (cleanKey === 'destinationagent') cleanKey = 'destination_agent';
          if (cleanKey === 'shippinglineairline') cleanKey = 'carrier';
          if (cleanKey === 'scopeofwork') cleanKey = 'scope_of_work';
          if (cleanKey === 'roleperformed') cleanKey = 'role_performed';
          if (cleanKey === 'claimestimate') cleanKey = 'claim_estimate';
          if (cleanKey === 'intenttoclaim') cleanKey = 'intent_to_claim';
          if (cleanKey === 'attachments' || cleanKey === 'files' || cleanKey === 'evidence') cleanKey = 'attachments';

          // Liability & Risk fields
          if (cleanKey.includes('responsible') || cleanKey.includes('atfaultparty')) cleanKey = 'responsible_party';
          if (cleanKey.includes('claimissued') || cleanKey.includes('formalclaim')) cleanKey = 'formal_claim_issued';
          if (cleanKey.includes('insurernotified')) cleanKey = 'insurer_notified';
          if (cleanKey.includes('risklevel')) cleanKey = 'risk_level';
          if (cleanKey.includes('escalation')) cleanKey = 'management_escalation';
          if (cleanKey.includes('incidentstatus')) cleanKey = 'status';
          if (cleanKey === 'cor') cleanKey = 'cor_required';
          if (cleanKey === 'chro') cleanKey = 'chro_notified';
          if (cleanKey === 'workerscompclaim') cleanKey = 'workers_comp_claim';

          // Claims fields mappings
          if (cleanKey === 'claimreferencenumber') cleanKey = 'claim_reference';
          if (cleanKey === 'dateofclaim') cleanKey = 'claim_date';
          if (cleanKey === 'claimant') cleanKey = 'claimant';
          if (cleanKey === 'timebar') cleanKey = 'claim_time_bar';
          if (cleanKey === 'claimtype') cleanKey = 'claim_type';
          if (cleanKey === 'claimdirection') cleanKey = 'claim_direction';
          if (cleanKey === 'claimamount') cleanKey = 'claim_amount';
          if (cleanKey === 'paidamount') cleanKey = 'paid_amount';
          if (cleanKey === 'insurancepaidamount') cleanKey = 'insurance_paid';
          if (cleanKey === 'deductible') cleanKey = 'deductible';
          if (cleanKey === 'recoveryamount') cleanKey = 'recovery_amount';
          if (cleanKey === 'outstandingbalance') cleanKey = 'outstanding_balance';
          if (cleanKey === 'writeoffrequired') cleanKey = 'writeoff_required';
          if (cleanKey === 'writeoffamount') cleanKey = 'writeoff_amount';
          if (cleanKey === 'writeoffapprovedby') cleanKey = 'writeoff_approved_by';
          if (cleanKey === 'writeoffdate') cleanKey = 'writeoff_date';
          if (cleanKey === 'claimstate') cleanKey = 'claim_state';
          if (cleanKey === 'claimstatus') cleanKey = 'claim_status';

          // Catch FormattedValue labels and prioritize them
          const isFormatted = lowerKey.includes('@odata.community.display.v1.formattedvalue');
          const targetKey = isFormatted ? cleanKey.split('@')[0] : cleanKey;

          let val = raw[key];

          // Status Standardisation: Map 'Open - New' or 'Open' to 'Open - Incident Logged'
          if (targetKey === 'status' && val) {
            const s = String(val).toLowerCase();
            if (s === 'open' || s === 'open - new') {
              val = 'Open - Incident Logged';
            }
          }

          // Prioritize formatted values; only set raw value if formatted isn't already there
          if (isFormatted || clean[targetKey] === undefined) {
            clean[targetKey] = val;
          }
        });
        Object.keys(raw).forEach(key => {
          if (key.includes('@OData.Community.Display.V1.FormattedValue')) {
            const baseKey = key.split('@')[0].replace('cr991_', '');
            clean[baseKey + '_formatted'] = raw[key];
            if (baseKey === 'businessunit') clean.business_unit = raw[key];
            if (baseKey === 'branchdepartment') clean.branch_department = raw[key];
            if (baseKey === 'incidentstatus') clean.status = raw[key];
            if (baseKey === 'incidenttype') clean.incident_type = raw[key];
            if (baseKey === 'claimstatus') clean.claim_status = raw[key];
            if (baseKey === 'claimtype') clean.claim_type = raw[key];
            if (baseKey === 'claimdirection') clean.claim_direction = raw[key];
            if (baseKey === 'writeoffrequired') clean.writeoff_required = raw[key];
          }
        });
        return clean;
      };

      const addOrMerge = (obj: any, raw?: any) => {
        if (!obj.id) return;
        const id = String(obj.id);
        const autoMapped = raw ? mapRawToClean(raw) : {};
        const finalObj = { ...autoMapped, ...obj };

        if (mergedMap.has(id)) {
          const existing = mergedMap.get(id);
          const merged = { ...existing };
          Object.keys(finalObj).forEach(key => {
            const newVal = finalObj[key];
            const isClaimOrCompliance = key.startsWith('claim_') || key.startsWith('writeoff_') || key === 'insurer_notified' || key === 'cor_required';
            if (newVal && newVal !== 'N/A' && newVal !== 'No description' && newVal !== '' && (newVal !== 'No' || isClaimOrCompliance)) {
              merged[key] = newVal;
            }
          });
          mergedMap.set(id, merged);
        } else {
          mergedMap.set(id, finalObj);
        }
      };

      payloads.forEach(payload => {
        if (!payload) return;

        // ── CARGO & EQUIPMENT ─────────────────────────────────
        if (Array.isArray(payload.cargo_equipment_incidents)) {
          payload.cargo_equipment_incidents.forEach((raw: any) => {
            addOrMerge({
              id: raw.cr991_cargoequipmentincidentid || raw.id,
              category: 'cargo',
              incident_number_str: raw.cr991_incidentid,
              type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || 'Cargo & Equipment',
              location: raw.cr991_locationofincident || 'N/A',
              branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || '').split(' ')[0],
              status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || DEFAULT_STATUSES.cargo,
              value: raw.cr991_incidentclaimestimate || raw.cr991_cargovalue || 'Pending',
              description: raw.cr991_shortdescription || raw.cr991_cargodescription || 'No description',
              job_number: raw.cr991_systemjobnumber || 'N/A',
              customer_name: raw.cr991_customer || 'N/A',
              formal_claim_issued: raw.cr991_formalclaimissued || raw["cr991_formalclaimissued@OData.Community.Display.V1.FormattedValue"] || 'No',
              cor_required: (raw["cr991_cor@OData.Community.Display.V1.FormattedValue"] === 'Yes' || raw.cr991_cor === true || raw.cr991_cor === 1 || raw.cr991_cor === 'Yes') ? 'Yes' : 'No',
              insurer_notified: (raw.cr991_insurernotified === 'Yes' || raw.cr991_insurernotified === true || raw.cr991_insurernotified === 1 || raw["cr991_insurernotified@OData.Community.Display.V1.FormattedValue"] === 'Yes') ? 'Yes' : 'No',
              management_escalation: (raw.cr991_managementescalation === 'Yes' || raw.cr991_managementescalation === '1' || raw.cr991_managementescalation === 1 || raw.cr991_managementescalation === true || raw["cr991_managementescalation@OData.Community.Display.V1.FormattedValue"] === 'Yes') ? 'Yes' : 'No',
              created_at: raw.createdon,
              short_description: raw.cr991_shortdescription || '',
              date_of_incident: raw.cr991_dateofincident || '',
              date_logged: raw.cr991_datelogged || '',
              logged_by: raw.cr991_loggedby || '',
              mode: raw.cr991_mode || '',
              system_job_number: raw.cr991_systemjobnumber || '',
              mbl_mawb_issued: raw["cr991_mblmawbissued@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              mbl_mawb_number: raw.cr991_mblmawbnumber || '',
              hbl_hawb_issued: raw["cr991_hblhawbissued@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              hbl_hawb_number: raw.cr991_hblhawbnumber || '',
              customer: raw.cr991_customer || '',
              container_numbers: raw.cr991_containernumbers || '',
              origin: raw.cr991_origin || '',
              destination: raw.cr991_destination || '',
              cargo_description: raw.cr991_cargodescription || '',
              cargo_value: raw.cr991_cargovalue || '',
              location_of_incident: raw.cr991_locationofincident || '',
              origin_agent: raw.cr991_originagent || '',
              destination_agent: raw.cr991_destinationagent || '',
              carrier: raw.cr991_shippinglineairline || '',
              coloader: raw.cr991_coloader || '',
              transport_company: raw.cr991_transportcompany || '',
              scope_of_work: raw.cr991_scopeofwork || '',
              role_performed: raw.cr991_roleperformed || '',
              incident_types: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] ? [raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"].trim()] : [],
              claim_types: raw["cr991_intenttoclaim@OData.Community.Display.V1.FormattedValue"] ? raw["cr991_intenttoclaim@OData.Community.Display.V1.FormattedValue"] : '',
              corrective_actions: raw["cr991_immediatecorrectiveaction@OData.Community.Display.V1.FormattedValue"] ? [raw["cr991_immediatecorrectiveaction@OData.Community.Display.V1.FormattedValue"].trim()] : [],
              claim_estimate: raw.cr991_incidentclaimestimate || '',
              incident_summary: raw.cr991_incidentsummary || raw.cr991_cargodescription || '',
              root_cause: raw.cr991_rootcause || '',
              // CoR fields
              cor: raw["cr991_cor@OData.Community.Display.V1.FormattedValue"] === 'Yes' ? 'Yes' : 'No',
              cor_type: raw.cr991_cortype || '',
              company_role: raw.cr991_companysrole || '',
              cor_risk_level: raw.cr991_corrisklevel || 'Low',
              cor_status: raw["cr991_corincidentstatus@OData.Community.Display.V1.FormattedValue"] || 'Open',
              cor_assessment: raw.cr991_corassessment || '',
              cor_corrective_action: raw.cr991_corcorrectiveaction || '',
              cor_action_implemented: raw.cr991_corcaimplemented || 'No',
            }, raw);
          });
        }

        // ── HUMAN RESOURCES ───────────────────────────────────
        if (Array.isArray(payload.human_resources_incidents)) {
          payload.human_resources_incidents.forEach((raw: any) => {
            const clean = mapRawToClean(raw);
            const foundFriendlyId = Object.values(clean).find(v => typeof v === 'string' && v.startsWith('HR-')) as string;

            addOrMerge({
              id: clean.humanresourcesincidentid || raw.id,
              category: 'hr',
              incident_number_str: clean.incident_number_str || foundFriendlyId || `HR-${(clean.humanresourcesincidentid || raw.id || '').substring(0, 8).toUpperCase()}`,
              type: clean.incident_type || 'Human Resources',
              location: clean.location_of_incident || 'N/A',
              branch_department: clean.branch_department || 'N/A',
              business_unit: clean.business_unit || 'N/A',
              date: (clean.datelogged_formatted || clean.date_logged || '').split(' ')[0],
              status: clean.status || 'Open - Incident Logged',
              description: clean.short_description || clean.incident_summary || 'No description',
              employee_involved: clean.employee || clean.employeeinvolved || 'N/A',
              formal_claim_issued: clean.formal_claim_issued || 'No',
              cor_required: clean.cor_required || 'No',
              management_escalation: clean.management_escalation || 'No',
              responsible_party: clean.responsible_party || '',
              risk_level: clean.risk_level || '',
              created_at: raw.createdon,
              date_of_incident: raw.cr991_dateofincident || '',
              date_logged: raw.cr991_datelogged || '',
              logged_by: raw.cr991_loggedby || '',
              employee_name: raw.cr991_employee || raw.cr991_employeeinvolved || '',
              incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
              witnesses: raw.cr991_witnesses || '',
              immediate_action: raw.cr991_immediateaction || '',
              investigation_required: raw["cr991_investigationrequired@OData.Community.Display.V1.FormattedValue"] || '',
              investigation_outcome: raw.cr991_investigationoutcome || '',
              corrective_action: raw.cr991_correctiveaction || '',
              legal_counsel_engaged: raw["cr991_legalcounselengaged@OData.Community.Display.V1.FormattedValue"] || '',
              close_out_date: raw.cr991_closeoutdate || '',
              notes: raw.cr991_notes || '',
              incident_summary: raw.cr991_incidentsummary || '',
              root_cause: raw.cr991_rootcause || '',
            }, raw);
          });
        }

        // ── WH&S ──────────────────────────────────────────────
        if (Array.isArray(payload.workplace_health_safety_incidents)) {
          payload.workplace_health_safety_incidents.forEach((raw: any) => {
            const clean = mapRawToClean(raw);
            const foundFriendlyId = Object.values(clean).find(v => typeof v === 'string' && v.startsWith('WHS-')) as string;

            addOrMerge({
              id: clean.workplacehealthsafetyincidentid || raw.id,
              category: 'whs',
              incident_number_str: clean.incident_number_str || foundFriendlyId || `WHS-${(clean.workplacehealthsafetyincidentid || raw.id || '').substring(0, 8).toUpperCase()}`,
              type: clean.incident_type || 'WH&S Incident',
              location: clean.location_of_incident || 'N/A',
              branch_department: clean.branch_department || 'N/A',
              business_unit: clean.business_unit || 'N/A',
              date: (clean.datelogged_formatted || clean.date_logged || '').split(' ')[0],
              status: clean.status || 'Open - Incident Logged',
              description: clean.short_description || clean.incident_summary || 'No description',
              formal_claim_issued: clean.formal_claim_issued || 'No',
              cor_required: clean.cor_required || 'No',
              management_escalation: clean.management_escalation || 'No',
              responsible_party: clean.responsible_party || '',
              risk_level: clean.risk_level || '',
              created_at: raw.createdon,
              date_of_incident: raw.cr991_dateofincident || '',
              date_logged: raw.cr991_datelogged || '',
              logged_by: raw.cr991_loggedby || '',
              persons_involved: raw.cr991_personsinvolved || '',
              incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
              injury_details: raw.cr991_injurydetails || '',
              medical_treatment_required: raw["cr991_medicaltreatmentrequired@OData.Community.Display.V1.FormattedValue"] || '',
              lost_time_injury: raw["cr991_losttimeinjury@OData.Community.Display.V1.FormattedValue"] || '',
              notifiable_safework: raw["cr991_notifiablesafework@OData.Community.Display.V1.FormattedValue"] || '',
              date_notified_regulator: raw.cr991_datenotifiedregulator || '',
              root_cause: raw.cr991_rootcause || '',
              corrective_action: raw.cr991_correctiveaction || '',
              corrective_action_owner: raw.cr991_correctiveactionowner || '',
              corrective_action_due_date: raw.cr991_correctiveactionduedate || '',
              chro_cro_notified: raw["cr991_chro_cronotified@OData.Community.Display.V1.FormattedValue"] || '',
              workers_comp_claim: raw["cr991_workerscompclaim@OData.Community.Display.V1.FormattedValue"] || '',
            }, raw);
          });
        }

        // ── IT & SECURITY ─────────────────────────────────────
        if (Array.isArray(payload.it_security_incidents)) {
          payload.it_security_incidents.forEach((raw: any) => {
            const clean = mapRawToClean(raw);
            const foundFriendlyId = Object.values(clean).find(v => typeof v === 'string' && v.startsWith('IT-')) as string;

            addOrMerge({
              id: clean.itsecurityincidentid || raw.id,
              category: 'it',
              incident_number_str: clean.incident_number_str || foundFriendlyId || `IT-${(clean.itsecurityincidentid || raw.id || '').substring(0, 8).toUpperCase()}`,
              type: clean.incident_type || 'IT & Security',
              location: clean.location_of_incident || 'N/A',
              branch_department: clean.branch_department || 'N/A',
              business_unit: clean.business_unit || 'N/A',
              date: (clean.datelogged_formatted || clean.date_logged || '').split(' ')[0],
              status: clean.status || 'Open - Incident Logged',
              description: clean.short_description || clean.incident_summary || 'No description',
              system_affected: clean.system || clean.systemaffected || 'N/A',
              formal_claim_issued: clean.formal_claim_issued || 'No',
              cor_required: clean.cor_required || 'No',
              management_escalation: clean.management_escalation || 'No',
              created_at: raw.createdon,
              date_of_incident: raw.cr991_dateofincident || '',
              date_logged: raw.cr991_datelogged || '',
              logged_by: raw.cr991_loggedby || '',
              incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
              number_of_users_affected: raw.cr991_numberofusersaffected || '',
              data_breach: raw["cr991_databreach@OData.Community.Display.V1.FormattedValue"] || '',
              data_type_compromised: raw.cr991_datatypecompromised || '',
              notifiable_data_breach: raw["cr991_notifiabledatabreach@OData.Community.Display.V1.FormattedValue"] || '',
              it_support_ticket_ref: raw.cr991_itsupportticketref || '',
              root_cause: raw.cr991_rootcause || '',
              system_restored: raw["cr991_systemrestored@OData.Community.Display.V1.FormattedValue"] || '',
            }, raw);
          });
        }

        // ── RISK & COMPLIANCE ─────────────────────────────────
        if (Array.isArray(payload.risk_compliance_incidents)) {
          payload.risk_compliance_incidents.forEach((raw: any) => {
            const clean = mapRawToClean(raw);
            const foundFriendlyId = Object.values(clean).find(v => typeof v === 'string' && (v.startsWith('RC-') || v.startsWith('RCI-'))) as string;

            addOrMerge({
              id: clean.riskcomplianceincidentid || raw.id,
              category: 'risk',
              incident_number_str: clean.incident_number_str || foundFriendlyId || `RC-${(clean.riskcomplianceincidentid || raw.id || '').substring(0, 8).toUpperCase()}`,
              type: clean.incident_type || 'Risk & Compliance',
              location: clean.location_of_incident || 'N/A',
              branch_department: clean.branch_department || 'N/A',
              business_unit: clean.business_unit || 'N/A',
              date: (clean.datelogged_formatted || clean.date_logged || '').split(' ')[0],
              status: clean.status || 'Open - Incident Logged',
              description: clean.short_description || clean.incident_summary || 'No description',
              regulatory_body: clean.regulatorybody || 'N/A',
              formal_claim_issued: clean.formal_claim_issued || 'No',
              cor_required: clean.cor_required || 'No',
              management_escalation: clean.management_escalation || 'No',
              created_at: raw.createdon,
              date_of_incident: raw.cr991_dateofincident || '',
              date_logged: raw.cr991_datelogged || '',
              logged_by: raw.cr991_loggedby || '',
              incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
              legislation_policy_breached: raw.cr991_legislationpolicybreached || '',
              financial_penalty_estimate: raw.cr991_financialpenaltyestimate || '',
              regulator_notified: raw["cr991_regulatornotified@OData.Community.Display.V1.FormattedValue"] || '',
              date_regulator_notified: raw.cr991_dateregulatornotified || '',
              remediation_plan: raw.cr991_remediationplan || '',
              board_notified: raw["cr991_boardnotified@OData.Community.Display.V1.FormattedValue"] || '',
            }, raw);
          });
        }

        // ── FINANCE ───────────────────────────────────────────
        if (Array.isArray(payload.finance_incidents)) {
          payload.finance_incidents.forEach((raw: any) => {
            const clean = mapRawToClean(raw);
            const foundFriendlyId = Object.values(clean).find(v => typeof v === 'string' && v.startsWith('FIN-')) as string;

            addOrMerge({
              id: clean.financeincidentid || raw.id,
              category: 'finance',
              incident_number_str: clean.incident_number_str || foundFriendlyId || `FIN-${(clean.financeincidentid || raw.id || '').substring(0, 8).toUpperCase()}`,
              type: clean.incident_type || 'Finance',
              location: clean.location_of_incident || 'N/A',
              branch_department: clean.branch_department || 'N/A',
              business_unit: clean.business_unit || 'N/A',
              date: (clean.datelogged_formatted || clean.date_logged || '').split(' ')[0],
              status: clean.status || 'Open - Incident Logged',
              description: clean.short_description || clean.incident_summary || 'No description',
              transaction_ref: clean.transactionref || 'N/A',
              formal_claim_issued: clean.formal_claim_issued || 'No',
              cor_required: clean.cor_required || 'No',
              management_escalation: clean.management_escalation || 'No',
              created_at: raw.createdon,
              date_of_incident: raw.cr991_dateofincident || '',
              date_logged: raw.cr991_datelogged || '',
              logged_by: raw.cr991_loggedby || '',
              incident_type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || '',
              financial_impact_aud: raw.cr991_financialimpactaud || '',
              vendor_customer_name: raw.cr991_vendorcustomername || '',
              police_notified: raw["cr991_policenotified@OData.Community.Display.V1.FormattedValue"] || '',
              bank_notified: raw["cr991_banknotified@OData.Community.Display.V1.FormattedValue"] || '',
              recovery_possible: raw["cr991_recoverypossible@OData.Community.Display.V1.FormattedValue"] || '',
              control_failure_identified: raw.cr991_controlfailureidentified || '',
            }, raw);
          });
        }

        // ── NCR ───────────────────────────────────────────
        if (Array.isArray(payload.ncr_incidents)) {
          payload.ncr_incidents.forEach((raw: any) => {
            const clean = mapRawToClean(raw);
            const foundFriendlyId = Object.values(clean).find(v => typeof v === 'string' && v.startsWith('NCR-')) as string;

            addOrMerge({
              id: clean.ncrincidentid || raw.id,
              category: 'ncr',
              incident_number_str: clean.incident_number_str || foundFriendlyId || `NCR-${(clean.ncrincidentid || raw.id || '').substring(0, 8).toUpperCase()}`,
              type: clean.incident_type || 'NCR',
              location: clean.location_of_incident || 'N/A',
              branch_department: clean.branch_department || 'N/A',
              business_unit: clean.business_unit || 'N/A',
              date: (clean.datelogged_formatted || clean.date_logged || '').split(' ')[0],
              status: clean.status || 'Open - Incident Logged',
              description: clean.short_description || clean.incident_summary || 'No description',
              formal_claim_issued: clean.formal_claim_issued || 'No',
              cor_required: clean.cor_required || 'No',
              management_escalation: clean.management_escalation || 'No',
              created_at: raw.createdon,
              nc_type: raw["cr991_nctype@OData.Community.Display.V1.FormattedValue"] || '',
              root_cause: raw.cr991_rootcause || '',
              preventative_action: raw.cr991_preventativeaction || '',
            }, raw);
          });
        }

        // ── BACKWARDS COMPATIBILITY ─
        if (Array.isArray(payload) && !(payload as any).cargo_equipment_incidents) {
          payload.forEach((raw: any) => {
            addOrMerge({
              id: raw.cr991_cargoequipmentincidentid || raw.id,
              category: 'cargo',
              incident_number_str: raw.cr991_incidentid || raw.incident_number_str,
              type: raw["cr991_incidenttype@OData.Community.Display.V1.FormattedValue"] || raw.type || 'Cargo & Equipment',
              location: raw.cr991_locationofincident || raw.location || 'N/A',
              branch_department: raw["cr991_branchdepartment@OData.Community.Display.V1.FormattedValue"] || raw.branch_department || 'N/A',
              business_unit: raw["cr991_businessunit@OData.Community.Display.V1.FormattedValue"] || raw.business_unit || 'N/A',
              date: (raw["overriddencreatedon@OData.Community.Display.V1.FormattedValue"] || raw.cr991_datelogged || raw.date || '').split(' ')[0],
              status: raw["cr991_incidentstatus@OData.Community.Display.V1.FormattedValue"] || raw.status || 'Open',
              value: raw.cr991_incidentclaimestimate || raw.cr991_cargovalue || 'Pending',
              description: raw.cr991_shortdescription || raw.description || 'No description',
              job_number: raw.cr991_systemjobnumber || raw.job_number || 'N/A',
              customer_name: raw.cr991_customer || 'N/A',
              formal_claim_issued: raw.cr991_formalclaimissued || 'No',
              cor_required: raw.cr991_cor || 'No',
              management_escalation: raw.cr991_managementescalation || 'No',
              created_at: raw.createdon,
            }, raw);
          });
        }
        // ── NCR RECORDS (Enhanced Mapping) ───────────────────
        const ncrArray = Array.isArray(payload.ncr_incidents) ? payload.ncr_incidents : (Array.isArray(payload.body) ? payload.body : (Array.isArray(payload) ? payload : []));
        ncrArray.forEach((raw: any) => {
          // Check for NCR ID or Number
          if (raw.cr991_nonconformancereportsid || raw.cr991_number?.startsWith('NCR')) {
            addOrMerge({
              id: raw.cr991_nonconformancereportsid || raw.id,
              category: 'ncr',
              incident_number_str: raw.cr991_number || raw.cr991_incidentid,
              type: 'Non-Conformance Report',
              location: raw["cr991_branch@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              branch_department: raw["cr991_branch@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              business_unit: raw["cr991_businessunitbu@OData.Community.Display.V1.FormattedValue"] || 'N/A',
              date: raw.cr991_datecreated || (raw.createdon || '').split('T')[0],
              status: (raw["statuscode@OData.Community.Display.V1.FormattedValue"] === 'Active' || !raw["statuscode@OData.Community.Display.V1.FormattedValue"]) ? 'Open' : raw["statuscode@OData.Community.Display.V1.FormattedValue"],
              description: raw.cr991_descriptionofnc || 'No description',
              ncr_at_fault_party: raw.cr991_atfaultparty || 'N/A',
              ncr_identified_by: raw.cr991_identifiedby || 'N/A',
              ncr_identification: raw.cr991_identificationofnc || 'N/A',
              ncr_level: raw.cr991_levelofnonconformity || 'N/A',
              ncr_containment: raw.cr991_immediatecontainmentaction || 'N/A',
              ncr_reference: raw.cr991_relatedrecordreference || 'N/A',
              created_at: raw.createdon,
            }, raw);
          }
        });

        // ── CoR RECORDS (Enhanced Mapping) ───────────────────
        const corArray = Array.isArray(payload.cor_incidents) ? payload.cor_incidents : (Array.isArray(payload.body) ? payload.body : (Array.isArray(payload) ? payload : []));
        corArray.forEach((raw: any) => {
          // Check for CoR specific ID or common pattern
          if (raw.cr991_corincidentid || raw.cr991_number?.startsWith('COR') || (raw.id && !raw.cr991_nonconformancereportsid)) {
            addOrMerge({
              id: raw.cr991_corincidentid || raw.id,
              category: 'cor',
              cor: 'Yes',
              cor_required: 'Yes',
              incident_number_str: raw.cr991_incidentid || raw.cr991_number,
              type: 'Chain of Responsibility',
              location: raw.cr991_location || 'N/A',
              branch_department: raw.cr991_branch || 'N/A',
              date: (raw.cr991_datelogged || raw.createdon || '').split('T')[0],
              status: raw["cr991_status@OData.Community.Display.V1.FormattedValue"] || 'Open',
              cor_risk_level: raw["cr991_risklevel@OData.Community.Display.V1.FormattedValue"] || 'Low',
              cor_assessment: raw.cr991_assessment || '',
              cor_corrective_action: raw.cr991_correctiveaction || '',
              cor_action_implemented: raw["cr991_actionimplemented@OData.Community.Display.V1.FormattedValue"] || 'No',
              created_at: raw.createdon,
            }, raw);
          }
        });

        // ── CLAIMS RECORDS (Enhanced Mapping) ────────────────
        const claimsArray = Array.isArray(payload.claims_incidents) ? payload.claims_incidents : (Array.isArray(payload.body) ? payload.body : (Array.isArray(payload) ? payload : []));
        claimsArray.forEach((raw: any) => {
          // If it has cargo-specific fields or claim fields, map it to cargo category
          if (raw.cr991_cargoequipmentincidentid || raw.cr991_claimreferencenumber) {
            addOrMerge({
              id: raw.cr991_cargoequipmentincidentid || raw.id,
              category: 'cargo',
              incident_number_str: raw.cr991_incidentid,
              // Claims fields
              claim_reference: raw.cr991_claimreferencenumber || '',
              claim_date: raw.cr991_dateofclaim || '',
              claimant: raw.cr991_claimant || '',
              claim_time_bar: raw.cr991_timebar || '',
              claim_type: raw["cr991_claimtype@OData.Community.Display.V1.FormattedValue"] || raw.cr991_claimtype || '',
              claim_direction: raw["cr991_claimdirection@OData.Community.Display.V1.FormattedValue"] || raw.cr991_claimdirection || '',
              claim_amount: raw.cr991_claimamount || '',
              paid_amount: raw.cr991_paidamount || '',
              insurance_paid: raw.cr991_insurancepaidamount || '',
              deductible: raw.cr991_deductible || '',
              recovery_amount: raw.cr991_recoveryamount || '',
              outstanding_balance: raw.cr991_outstandingbalance || '',
              writeoff_required: raw["cr991_writeoffrequired@OData.Community.Display.V1.FormattedValue"] || raw.cr991_writeoffrequired || 'No',
              writeoff_amount: raw.cr991_writeoffamount || '',
              writeoff_approved_by: raw.cr991_writeoffapprovedby || '',
              writeoff_date: raw.cr991_writeoffdate || '',
              claim_state: raw.cr991_claimstate || '',
              claim_status: raw["cr991_claimstatus@OData.Community.Display.V1.FormattedValue"] || raw.cr991_claimstatus || 'Open',
              created_at: raw.createdon,
            }, raw);
          }
        });
      });

      const updatedIncidents = Array.from(mergedMap.values());
      setIncidents(updatedIncidents);
      try {
        localStorage.setItem('pa_incidents_cache', JSON.stringify(updatedIncidents));
      } catch (e) {
        console.warn('Failed to save incidents to cache:', e);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch from Power Automate:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestFromPA();
  }, [fetchLatestFromPA]);

  useEffect(() => {
    if (pollingInterval > 0) {
      const interval = setInterval(fetchLatestFromPA, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchLatestFromPA, pollingInterval]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLatestFromPA();
    setIsRefreshing(false);
  };

  return { incidents, loading, isRefreshing, handleManualRefresh };
}
