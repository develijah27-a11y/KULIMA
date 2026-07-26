export type VerificationLevel = 'none' | 'grey' | 'green' | 'blue' | 'gold';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export const BADGE_CONFIG = {
  none:  { label: 'Not Verified',    color: '#B45309', bg: '#FEF3C7', border: '#F59E0B', description: 'Verify your phone number to get started' },
  grey:  { label: 'Phone Verified',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', description: 'Phone number confirmed on signup' },
  green: { label: 'ID Verified',     color: '#059669', bg: '#D1FAE5', border: '#A7F3D0', description: 'National ID verified by AgriNova' },
  blue:  { label: 'KYC Verified',    color: '#0284C7', bg: 'var(--color-sky-bg)', border: '#BFDBFE', description: 'Full identity and business verified' },
  gold:  { label: 'Enterprise',      color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', description: 'Enterprise-grade verification complete' },
} as const;

export const LEVEL_ORDER: VerificationLevel[] = ['grey', 'green', 'blue', 'gold'];

// What a user could upgrade to next, from wherever they currently are.
// 'gold' has no entry — it's the max tier, nothing further to offer.
export const NEXT_LEVEL: Partial<Record<VerificationLevel, 'green' | 'blue' | 'gold'>> = {
  none: 'green', grey: 'green', green: 'blue', blue: 'gold',
};

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
      base.push({ key: 'driving_permit', label: 'Driving Permit',        accept: 'image/*,application/pdf' });
      base.push({ key: 'vehicle_reg',    label: 'Vehicle Registration (logbook)', accept: 'image/*,application/pdf' });
      base.push({ key: 'insurance_cert', label: 'Insurance Certificate', accept: 'image/*,application/pdf' });
      base.push({ key: 'vehicle_photo',  label: 'Photo of vehicle (plate visible)', accept: 'image/*' });
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

type LevelDetail = { title: string; description: string; benefits: string[]; time: string };

export const LEVEL_DETAILS: Record<'green' | 'blue' | 'gold', LevelDetail> = {
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

// Role-specific framing of each level — same underlying requirements and
// review times as LEVEL_DETAILS, but the title/description/benefits speak to
// what that particular role actually gets, since "export access" means
// nothing to a driver and "unlock paid jobs" means nothing to a buyer.
const ROLE_LEVEL_DETAILS: Partial<Record<string, Record<'green' | 'blue' | 'gold', Omit<LevelDetail, 'time'>>>> = {
  farmer: {
    green: { title: 'Verified Farmer', description: 'Confirm your identity with your National ID.', benefits: ['Green badge on your listings', 'Buyers see you first', 'Higher search ranking'] },
    blue:  { title: 'Trusted Seller',  description: 'Add a selfie so buyers know the ID is really you.', benefits: ['Escrow-protected sales', 'Eligible for AgriNova loans', 'Access to bulk & export buyers'] },
    gold:  { title: 'Enterprise Farmer', description: 'For cooperatives and large-scale farming operations.', benefits: ['Gold badge', 'Priority payouts', 'Dedicated account manager'] },
  },
  buyer: {
    green: { title: 'Verified Buyer', description: 'Confirm your National ID to start ordering.', benefits: ['Green badge builds farmer trust', 'Faster order approval', 'Access to more listings'] },
    blue:  { title: 'Trusted Buyer',  description: 'Add a selfie and your business registration.', benefits: ['Escrow-protected purchases', 'Bulk sourcing & group listings', 'Credit terms with select farmers'] },
    gold:  { title: 'Enterprise Buyer', description: 'For large-scale procurement and export buyers.', benefits: ['Gold badge', 'Bulk deal access', 'Dedicated account manager'] },
  },
  transporter: {
    green: { title: 'Verified Driver', description: 'Confirm your National ID to start browsing jobs.', benefits: ['Green badge on your profile', 'Appear in driver search', 'Start building your delivery history'] },
    blue:  { title: 'Trusted Driver',  description: 'Add your driving permit, logbook, insurance, and a vehicle photo.', benefits: ['Unlock paid delivery jobs', 'Higher priority job matching', 'Escrow-protected fare payouts'] },
    gold:  { title: 'Fleet Partner', description: 'For transporters running multiple vehicles or contract routes.', benefits: ['Gold badge', 'Bulk contract routes', 'Dedicated dispatch support'] },
  },
  supplier: {
    green: { title: 'Verified Supplier', description: 'Confirm your National ID to start listing inputs.', benefits: ['Green badge on your catalogue', 'Farmers see you first', 'Higher search ranking'] },
    blue:  { title: 'Trusted Supplier',  description: 'Add a selfie and your business registration.', benefits: ['Escrow-protected input sales', 'Featured in supplier search', 'Eligible for flash deals'] },
    gold:  { title: 'Enterprise Supplier', description: 'For agro-dealers and large input distributors.', benefits: ['Gold badge', 'Bulk order access', 'Dedicated account manager'] },
  },
  pathologist: {
    green: { title: 'Verified Pathologist', description: 'Confirm your National ID to start advising farmers.', benefits: ['Green badge on your profile', 'Appear in farmer search', 'Start building your case history'] },
    blue:  { title: 'Certified Pathologist', description: 'Add a selfie and your professional qualifications.', benefits: ['Get matched to paid consultations', 'Unlock higher consultation fees', 'Featured in farmer search'] },
    gold:  { title: 'Senior Pathologist', description: 'For pathologists with an established track record.', benefits: ['Gold badge', 'Priority case assignment', 'Dedicated support'] },
  },
  offtaker: {
    green: { title: 'Verified Offtaker', description: 'Confirm your National ID to start sourcing.', benefits: ['Green badge builds farmer trust', 'Faster contract approval', 'Access to more group listings'] },
    blue:  { title: 'Trusted Offtaker',  description: 'Add a selfie to unlock contract farming deals.', benefits: ['Sign escrow-backed contracts', 'Access to bulk/group harvests', 'Priority on new listings'] },
    gold:  { title: 'Enterprise Offtaker', description: 'For large-scale contract farming and export operations.', benefits: ['Gold badge', 'Bulk contract access', 'Dedicated account manager'] },
  },
};

export function getLevelDetails(level: 'green' | 'blue' | 'gold', role: string): LevelDetail {
  const roleCopy = ROLE_LEVEL_DETAILS[role]?.[level];
  return roleCopy ? { ...roleCopy, time: LEVEL_DETAILS[level].time } : LEVEL_DETAILS[level];
}
