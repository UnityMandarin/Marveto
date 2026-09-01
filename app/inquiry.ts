export interface Inquiry {
  name: string;
  email: string;
  company: string;
  preferredPackage: string;
  brief: string;
}

export type InquiryErrors = Partial<Record<keyof Inquiry, string>>;

export function validateInquiry(inquiry: Inquiry): InquiryErrors {
  const errors: InquiryErrors = {};
  if (!inquiry.name.trim()) errors.name = 'Tell us your name.';
  if (!/^\S+@\S+\.\S+$/.test(inquiry.email.trim())) errors.email = 'Enter a valid email.';
  if (!inquiry.preferredPackage) errors.preferredPackage = 'Choose a preferred package.';
  if (inquiry.brief.trim().length < 20) errors.brief = 'Give us at least a sentence about the project.';
  return errors;
}

export function formatInquiry(inquiry: Inquiry): string {
  return [
    'MARVETO — NEW PROJECT INQUIRY',
    '',
    `Name: ${inquiry.name.trim()}`,
    `Email: ${inquiry.email.trim()}`,
    `Company: ${inquiry.company.trim() || 'Not provided'}`,
    `Preferred package: ${inquiry.preferredPackage}`,
    '',
    'Project:',
    inquiry.brief.trim(),
  ].join('\n');
}

export interface PackageSelectionResult {
  inquiry: Inquiry;
  automaticBrief: string;
}

export function applyPackageSelection(
  inquiry: Inquiry,
  preferredPackage: string,
  nextAutomaticBrief: string,
  previousAutomaticBrief = '',
): PackageSelectionResult {
  const briefIsAutomatic = !inquiry.brief.trim() || inquiry.brief === previousAutomaticBrief;
  return {
    inquiry: {
      ...inquiry,
      preferredPackage,
      brief: briefIsAutomatic ? nextAutomaticBrief : inquiry.brief,
    },
    automaticBrief: briefIsAutomatic ? nextAutomaticBrief : previousAutomaticBrief,
  };
}

export function buildMailto(contactEmail: string, inquiry: Inquiry): string {
  const subject = `New project inquiry — ${inquiry.company.trim() || inquiry.name.trim()}`;
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formatInquiry(inquiry))}`;
}
