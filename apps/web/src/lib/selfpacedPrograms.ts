export type SelfpacedProgram = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  blurb: string;
  description: string;
  hours: number;
  chapters: number;
  priceCad: number;
  internationalCad?: number;
  image: string;
  features: string[];
};

/** Exact catalog from https://hccbconline.com/ — do not invent extra programs. */
export const SELFPACED_PROGRAMS: SelfpacedProgram[] = [
  {
    id: "office-admin",
    slug: "office-administration-diploma",
    title: "Office Administration Diploma",
    subject: "Business",
    level: "Intermediate",
    blurb:
      "As professional offices become more complex, it becomes critical for offices to employ specialists in Office Administration. Graduates of this Office Administration program will be highly organized and client-ready.",
    description:
      "As professional offices become more complex, it becomes critical for offices to employ specialists in Office Administration. Graduates of this Office Administration program will be highly organized and prepared for administrative roles across Canadian workplaces — including professional communication, scheduling, records management, Microsoft Office productivity, and customer service.",
    hours: 350,
    chapters: 12,
    priceCad: 9500,
    internationalCad: 11750,
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85",
    features: ["12 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "pharmacy-assistant",
    slug: "pharmacy-assistant",
    title: "Pharmacy Assistant",
    subject: "Pharmacy Assistant",
    level: "Beginner",
    blurb:
      "The Pharmacy Assistant Certificate Program prepares students for a rewarding career in retail, hospital, and community pharmacies. Students gain hands-on training in prescription processing, pharmacy operations, and patient service.",
    description:
      "The Pharmacy Assistant Certificate Program prepares students for a rewarding career in retail, hospital, and community pharmacies. Students gain hands-on training in prescription processing, pharmacy operations, inventory support, customer service, and professional ethics.",
    hours: 278,
    chapters: 10,
    priceCad: 7200,
    internationalCad: 8900,
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1400&q=85",
    features: ["10 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "red-seal-electrician",
    slug: "red-seal-exam-preparation-electrician",
    title: "Red Seal Exam Preparation Electrician (Construction)",
    subject: "Red Seal Exam Preparation",
    level: "Advanced",
    blurb:
      "This course is designed to help construction electricians and apprentices prepare for the Red Seal certification exam. It provides a structured approach to mastering the knowledge, skills, and strategies required for success.",
    description:
      "This course is designed to help construction electricians and apprentices prepare for the Red Seal certification exam. It provides a structured approach to mastering the knowledge, skills, and exam strategies required for the construction electrician pathway.",
    hours: 344,
    chapters: 8,
    priceCad: 3990,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1400&q=85",
    features: ["8 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "red-seal-carpentry",
    slug: "red-seal-exam-preparation-carpentry",
    title: "Red Seal Exam Preparation Carpentry",
    subject: "Red Seal Exam Preparation",
    level: "Advanced",
    blurb:
      "This course is tailored to help carpenters and apprentices successfully prepare for the Red Seal certification exam. Through targeted training, practice exams, and expert guidance, participants strengthen exam readiness.",
    description:
      "This course is tailored to help carpenters and apprentices successfully prepare for the Red Seal certification exam. Through targeted training, practice exams, and expert guidance, participants strengthen exam readiness across core carpentry competencies.",
    hours: 344,
    chapters: 6,
    priceCad: 3990,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=85",
    features: ["6 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "red-seal-plumber",
    slug: "red-seal-exam-preparation-plumber",
    title: "Red Seal Exam Preparation Plumber",
    subject: "Red Seal Trades Exam Preparation",
    level: "Advanced",
    blurb:
      "This course is designed to help journeyperson plumbers and apprentices prepare for the Red Seal certification exam. The program provides comprehensive support through focused study materials and practice.",
    description:
      "This course is designed to help journeyperson plumbers and apprentices prepare for the Red Seal certification exam. The program provides comprehensive support through focused study materials, practice exams, and exam strategy coaching.",
    hours: 320,
    chapters: 6,
    priceCad: 3990,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=85",
    features: ["6 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "red-seal-chef",
    slug: "red-seal-exam-preparation-chef",
    title: "Red Seal Exam Preparation Chef",
    subject: "Red Seal Exam Trades Preparation",
    level: "Advanced",
    blurb:
      "This course is tailored for chefs and culinary professionals preparing to achieve their Red Seal certification. The program provides comprehensive guidance on culinary theory, practical skills, and exam readiness.",
    description:
      "This course is tailored for chefs and culinary professionals preparing to achieve their Red Seal certification. The program provides comprehensive guidance on culinary theory, practical skills, and exam-focused strategies.",
    hours: 300,
    chapters: 6,
    priceCad: 3990,
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=85",
    features: ["6 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "red-seal-hvac",
    slug: "red-seal-exam-preparation-hvac",
    title: "Red Seal Exam HVAC Technician",
    subject: "Red Seal Exam Preparation",
    level: "Advanced",
    blurb:
      "This comprehensive Red Seal Exam Preparation course is designed to assist experienced HVAC technicians, apprentices, and trade qualifiers in preparing for the Red Seal HVAC and Refrigeration Mechanic exam.",
    description:
      "This comprehensive Red Seal Exam Preparation course is designed to assist experienced HVAC technicians, apprentices, and trade qualifiers in preparing for the Red Seal HVAC and Refrigeration Mechanic certification exam.",
    hours: 330,
    chapters: 6,
    priceCad: 3990,
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1400&q=85",
    features: ["6 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
  {
    id: "red-seal-machinist",
    slug: "red-seal-exam-preparation-machinist",
    title: "Red Seal Exam Preparation Machinist",
    subject: "Red Seal Trades Exam Preparation",
    level: "Advanced",
    blurb:
      "This course is specifically designed to assist machinists and apprentices in preparing for the Red Seal certification exam. It combines theoretical knowledge, practical skills, and exam-focused strategies.",
    description:
      "This course is specifically designed to assist machinists and apprentices in preparing for the Red Seal certification exam. It combines theoretical knowledge, practical skills, and exam-focused strategies for trade success.",
    hours: 310,
    chapters: 6,
    priceCad: 3990,
    image: "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=1400&q=85",
    features: ["6 chapters", "1 chapter unlocks / day", "Instructor lectures", "Premium certificate on completion"],
  },
];

export function getSelfpacedProgram(slug: string): SelfpacedProgram | undefined {
  return SELFPACED_PROGRAMS.find((p) => p.slug === slug || p.id === slug);
}

export function isKnownSelfpacedSlug(slug: string): boolean {
  return Boolean(getSelfpacedProgram(slug));
}

export function formatCad(amount: number): string {
  return `$${amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`;
}
