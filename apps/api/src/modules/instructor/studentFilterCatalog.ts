/** PDF-exact Students directory filter catalogs (HCC MySIS). */

export type FilterGroup = {
  label: string;
  /** Selectable options. Disabled visual headings go in `headings`. */
  options: string[];
  /** Non-selectable labels rendered as disabled options before following options. */
  sections?: Array<{ heading: string; options: string[] }>;
};

export type FilterMenu = {
  all: string;
  flat?: string[];
  groups?: FilterGroup[];
  /** Extra leading options after `all` (e.g. "All Programs" duplicate under All). */
  leading?: string[];
};

export const CAMPUS_MENU: FilterMenu = {
  all: "All Campuses",
  flat: [
    "#110 Heritage College- Surrey",
    "Heritage Community College - Distance",
    "Heritage Community College - Victoria",
  ],
};

export const PROGRAM_MENU: FilterMenu = {
  all: "All Programs",
  leading: ["All"],
  groups: [
    {
      label: "ACCOUNTING/PAYROLL",
      options: [
        "CAPA: Certificate in Accounting and Payroll Administrator",
        "DAP: Diploma in Accounting and Payroll administrator",
      ],
    },
    {
      label: "BUSINESS",
      options: [
        "BTT: Bank Teller Training",
        "COA: Certificate Office Administration",
        "CSMS: Corporate Sales Management Strategies Certificate",
        "DIB: Diploma in International Business",
        "DMM: Digital Marketing Management",
        "HRA: Human Resources Administration",
        "MA: Marketing Administration",
        "OA: Office Administration",
        "RSMS: Retail Sales Management Strategies Certificate",
      ],
    },
    {
      label: "COMPUTER SCIENCE",
      options: ["NSA: Network Support Administrator", "NST: Network Support Technician"],
    },
    {
      label: "EARLY CHILDHOOD EDUCATOR ASSISTANT",
      options: [
        "ECEA (Option 2): Child Growth Development Part I & II + Interpersonal Communication",
        "ECEA option1: Child Growth Development part 1 & 2",
      ],
    },
    {
      label: "HEALTH SCIENCE",
      options: [
        "ACSW: Addictions Community Support Worker",
        "HCA: Health Care Assistant",
        "HCA: Interpersonal Communication (HCA-3)",
        "MOA: Medical Office Assistant",
        "SSSW: Social Services Support Worker",
      ],
    },
  ],
};

export const PATHWAY_MENU: FilterMenu = {
  all: "All Pathways",
  flat: ["No Pathways"],
};

export const SCHEDULE_MENU: FilterMenu = {
  all: "All Schedules",
  leading: ["All"],
  groups: [
    {
      label: "ACCOUNTING/PAYROLL",
      options: [],
      sections: [
        {
          heading: "Certificate in Accounting and Payroll Administrator",
          options: ["Sep. 7, 2021 - Feb. 14, 2022", "Nov. 8, 2021 - Apr. 7, 2022"],
        },
        {
          heading: "Diploma in Accounting and Payroll administrator",
          options: [
            "Aug. 12, 2020 - Mar. 19, 2021",
            "Jun. 14, 2021 - Mar. 4, 2022",
            "Continuous",
            "Nov. 6, 2023 - Jul. 29, 2024",
            "Dec. 4, 2023 - Aug. 22, 2024",
            "DAP: Continuous",
            "DAP: Dec. 4, 2024 - Sep. 24, 2025",
            "Jan 2026: Jan. 5, 2026 - Sep. 28, 2026",
            "DAP-SEP26: Sep. 8, 2026 - May. 25, 2027",
          ],
        },
      ],
    },
    {
      label: "BUSINESS",
      options: [],
      sections: [
        {
          heading: "Certificate Office Administration",
          options: ["Aug. 30, 2021 - Feb. 4, 2022", "Oct. 25, 2021 - Feb. 20, 2022"],
        },
        {
          heading: "Corporate Sales Management Strategies Certificate",
          options: ["Jul. 6, 2020 - Aug. 31, 2020", "Sep. 1, 2020 - Sep. 19, 2020"],
        },
        {
          heading: "Digital Marketing Management",
          options: [
            "Jan. 10, 2022 - Aug. 15, 2022",
            "May 2, 2023 - Dec. 8, 2023",
            "Sep. 8, 2025 - May. 22, 2026",
          ],
        },
      ],
    },
    {
      label: "HEALTH SCIENCE",
      options: [],
      sections: [
        {
          heading: "Addictions Community Support Worker",
          options: [
            "Jan. 5, 2026 - Sep. 28, 2026",
            "Sep. 8, 2026 - May. 25, 2027",
            "Continuous",
          ],
        },
        {
          heading: "Diploma in International Business",
          options: ["Jan. 5, 2026 - Sep. 28, 2026", "May 1, 2026 - Dec. 15, 2026"],
        },
      ],
    },
  ],
};

export const PROGRAM_TERM_OPTS = [
  "3rd Term-2026: 2026-09-01 - 2026-12-31",
  "2nd Term-2026: 2026-05-01 - 2026-08-31",
  "1st Term- 2026: 2026-01-01 - 2026-04-30",
  "3rd Term-2025: 2025-09-01 - 2025-12-31",
  "2nd Term-2025: 2025-05-01 - 2025-08-31",
  "1st Term-2025: 2025-01-01 - 2025-04-30",
  "2024-03-18: 2024-03-18 - 2024-12-31",
  "2024-02-05: 2024-02-05 - 2024-12-31",
  "2024-02-05: 2024-02-05 - 2024-11-01",
  "2024-02-12: 2024-02-12 - 2024-10-11",
  "2023-12-04: 2023-12-04 - 2024-10-11",
  "2024-02-05: 2024-02-05 - 2024-10-10",
  "2024-02-05: 2024-02-05 - 2024-10-09",
  "2024-03-16: 2024-03-18 - 2024-10-06",
  "2023-11-06: 2023-11-06 - 2024-08-30",
  "2023-11-06: 2023-11-06 - 2024-05-23",
  "Bank Teller Program - September 13 to September 21: 2023-09-12 - 2023-09-23",
  "Bank Teller Program: 2022-07-24 - 2022-08-02",
  "PBMLT-HCA Cohort (Dec 2020-Sep 2021): 2020-12-14 - 2021-09-03",
  "April 2021: 2021-04-01 - 2021-04-30",
  "March 2021: 2021-03-01 - 2021-03-31",
  "February 2021: 2021-02-01 - 2021-02-28",
  "January 2021: 2021-01-01 - 2021-01-31",
];

export const PROGRAM_TERM_MENU: FilterMenu = {
  all: "All Program Terms",
  flat: PROGRAM_TERM_OPTS,
};

export const ADMISSION_TERM_MENU: FilterMenu = {
  all: "All Admission Terms",
  flat: [...PROGRAM_TERM_OPTS],
};

/** Scrollable nationality list — starts with PDF-visible countries, then remainder A–Z. */
export const NATIONALITY_OPTS = [
  "Afghanistan",
  "Aland Islands",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Antarctica",
  "Antigua And Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia",
  "Bosnia And Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei Darussalam",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Korea, Republic of",
  "Kuwait",
  "Kyrgyzstan",
  "Lao People's Democratic Republic",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Lithuania",
  "Luxembourg",
  "Macao",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russian Federation",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Syrian Arab Republic",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Trinidad And Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Viet Nam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

export const NATIONALITY_MENU: FilterMenu = {
  all: "All Nationalities",
  flat: NATIONALITY_OPTS,
};

export const STATUS_FILTER_OPTS = [
  "New Inquiry",
  "Approved Application",
  "Pre-enrolment Application",
  "CLOA",
  "LOA",
  "Cancelled/ Did not proceed",
  "Follow Up",
  "In-active Leads",
  "Duplicate profiles",
  "Declined Application",
  "Registered Student",
  "Active Student",
  "On-Hold",
  "Leave of Absence",
  "Graduated",
  "Incomplete",
  "Withdrawn Students",
  "Dismissed",
  "Refused Visa",
  "File not Logged (Offshore student)",
  "Prospective Student (Marketing team)",
];

export const STATUS_MENU: FilterMenu = {
  all: "All Statuses",
  flat: STATUS_FILTER_OPTS,
};

export const AGENT_OPTS = [
  "-, Stepwise Immigration",
  "-, Absolute Immigration",
  "-, Rohit",
  "-, Broad Star Immigration",
  "-, Direct",
  "Prowest Immigration, Rajesh",
  "Ahluwalia, Deepika",
  "Anoop, Anoop",
  "Arpit- Assist Immigration, Mr",
  "Babbar, Vishal",
  "Batra, Akshay",
  "Bhatti-Lions Immigration Inc, Mukesh",
  "Chadda, Dhruv- Canmark Immigration",
  "Chawla-Goodlife Immigration Services Inc., Deepak",
  "Edu Services, Ravens",
  "Goyal, Shubham",
  "Gurpreet Kaur-Pacific Ways Immigration Consultancy, Ms",
  "Gurpreet Singh- Centura Immigration, Mr.",
  "Harmanpreet Singh- Hudson Immigration, Mr",
  "Hassan, Shihar",
  "Kapoor, Neha",
  "Malhotra, Rohan",
  "Mehta, Priya",
  "Sandhu, Jaspreet",
  "Sharma, Ankit",
];

export const AGENT_MENU: FilterMenu = {
  all: "All Agents",
  flat: AGENT_OPTS,
};

export const ADVISOR_OPTS = [
  "Amit Bhaskar",
  "Jatinder Dhesi",
  "Simranjeet Kaur",
  "Nilesh Lal",
  "Muskan Muskan",
  "Shivani Sharma",
];

export const ADVISOR_MENU: FilterMenu = {
  all: "All Advisors",
  flat: ADVISOR_OPTS,
};

export const PER_PAGE_OPTS = ["10", "25", "50", "100"];

/** Flatten selectable option values from a menu (excludes all/leading-only "All"). */
export function selectableValues(menu: FilterMenu): string[] {
  const out: string[] = [];
  if (menu.flat) out.push(...menu.flat);
  for (const g of menu.groups || []) {
    out.push(...g.options);
    for (const s of g.sections || []) out.push(...s.options);
  }
  return out;
}

export function programCodeFromOption(option: string): string {
  const idx = option.indexOf(":");
  if (idx > 0) return option.slice(0, idx).trim();
  return option.trim();
}

export function advisorDisplayFromFilter(name: string): string {
  // Filter: "Muskan Muskan" / "Shivani Sharma" → table: "Muskan, Muskan" / "Sharma, Shivani"
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const family = parts[parts.length - 1]!;
    const given = parts.slice(0, -1).join(" ");
    return `${family}, ${given}`;
  }
  return name;
}

export function advisorFilterFromDisplay(display: string): string {
  // "Muskan, Muskan" → "Muskan Muskan"; "Sharma, Shivani" → "Shivani Sharma"
  if (!display.includes(",")) return display.trim();
  const [a, b] = display.split(",").map((x) => x.trim());
  if (/^(muskan)$/i.test(a || "") && /^(muskan)$/i.test(b || "")) return "Muskan Muskan";
  if (/^(sharma)$/i.test(a || "") && /^(shivani)$/i.test(b || "")) return "Shivani Sharma";
  // family, given → given family
  return `${b} ${a}`.trim();
}

export function serializeFilterMenu(menu: FilterMenu) {
  return {
    all: menu.all,
    leading: menu.leading || [],
    flat: menu.flat || [],
    groups: (menu.groups || []).map((g) => ({
      label: g.label,
      options: g.options,
      sections: (g.sections || []).map((s) => ({ heading: s.heading, options: s.options })),
    })),
  };
}
