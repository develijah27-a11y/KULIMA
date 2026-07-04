export type VerificationLevel = 'grey' | 'green' | 'blue' | 'gold';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export const BADGE_CONFIG = {
  grey:  { label: 'Phone Verified',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', description: 'Phone number confirmed on signup' },
  green: { label: 'ID Verified',     color: '#059669', bg: '#D1FAE5', border: '#A7F3D0', description: 'National ID verified by AgriNova' },
  blue:  { label: 'KYC Verified',    color: '#0284C7', bg: 'var(--color-sky-bg)', border: '#BFDBFE', description: 'Full identity and business verified' },
  gold:  { label: 'Enterprise',      color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', description: 'Enterprise-grade verification complete' },
} as const;

export const LEVEL_ORDER: VerificationLevel[] = ['grey', 'green', 'blue', 'gold'];

export function canUpgradeTo(current: VerificationLevel, target: 'green' | 'blue' | 'gold'): boolean {
  return LEVEL_ORDER.indexOf(current) < LEVEL_ORDER.indexOf(target);
}

export function getTrustColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#D97706';
  if (score >= 40) return 'var(--color-primary)';
  return '#E63946';
}

export function getTrustLabel(score: number): string {
  if (score >= 80) return 'Highly Trusted';
  if (score >= 60) return 'Trusted';
  if (score >= 40) return 'Building Trust';
  return 'New User';
}

interface DocRequirement {
  key: string;
  label: string;
  accept: string;
}

export function getRequiredDocs(level: 'green' | 'blue' | 'gold', role: string): DocRequirement[] {
  if (level === 'green') {
    return [{ key: 'national_id', label: 'National ID (front)', accept: 'image/*,application/pdf' }];
  }
  if (level === 'blue') {
    const base: DocRequirement[] = [
      { key: 'national_id', label: 'National ID (front)', accept: 'image/*,application/pdf' },
      { key: 'selfie',      label: 'Selfie with ID',      accept: 'image/*' },
    ];
    if (role === 'buyer' || role === 'supplier')
      base.push({ key: 'business_reg', label: 'Business Registration', accept: 'image/*,application/pdf' });
    if (role === 'transporter') {
      base.push({ key: 'driving_permit', label: 'Driving Permit',     accept: 'image/*,application/pdf' });
      base.push({ key: 'vehicle_reg',    label: 'Vehicle Registration', accept: 'image/*,application/pdf' });
    }
    if (role === 'pathologist')
      base.push({ key: 'qualifications', label: 'Professional Qualifications', accept: 'image/*,application/pdf' });
    return base;
  }
  // gold - enterprise
  return [
    { key: 'national_id',   label: 'National ID (front)',     accept: 'image/*,application/pdf' },
    { key: 'selfie',        label: 'Selfie with ID',           accept: 'image/*' },
    { key: 'business_reg',  label: 'Business Registration',   accept: 'image/*,application/pdf' },
  ];
}

export const LEVEL_DETAILS: Record<'green' | 'blue' | 'gold', {
  title: string; description: string; benefits: string[]; time: string;
}> = {
  green: {
    title: 'ID Verified',
    description: 'Upload your National ID to get a green badge.',
    benefits: ['Higher buyer trust', 'Access to more listings', 'Priority in search results'],
    time: '1-2 business days',
  },
  blue: {
    title: 'KYC Verified',
    description: 'Full identity verification including selfie and business documents.',
    benefits: ['Maximum trust badge', 'Escrow-eligible deals', 'Loan applications', 'Export access'],
    time: '2-3 business days',
  },
  gold: {
    title: 'Enterprise',
    description: 'Enterprise-level verification for large-scale agricultural businesses.',
    benefits: ['Gold badge', 'Bulk deal access', 'API access', 'Dedicated account manager'],
    time: '3-5 business days',
  },
};
