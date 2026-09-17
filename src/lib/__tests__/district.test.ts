import { normalizeDistrict, areDistrictsEqual, getProfileDistrict } from '../district';

describe('District Matching Utilities', () => {
  it('normalizes district casing and spaces', () => {
    expect(normalizeDistrict('Kampala')).toBe('kampala');
    expect(normalizeDistrict('  kampala  ')).toBe('kampala');
    expect(normalizeDistrict('KAMPALA')).toBe('kampala');
  });

  it('strips common administrative suffixes', () => {
    expect(normalizeDistrict('Kampala District')).toBe('kampala');
    expect(normalizeDistrict('Mbarara City')).toBe('mbarara');
    expect(normalizeDistrict('Wakiso Municipality')).toBe('wakiso');
  });

  it('matches matching districts across different cases and formats', () => {
    expect(areDistrictsEqual('Kampala', 'kampala')).toBe(true);
    expect(areDistrictsEqual('Kampala District', 'kampala')).toBe(true);
    expect(areDistrictsEqual('  Mbarara  ', 'Mbarara City')).toBe(true);
  });

  it('distinguishes different districts', () => {
    expect(areDistrictsEqual('Kampala', 'Masaka')).toBe(false);
    expect(areDistrictsEqual('Wakiso', 'Gulu')).toBe(false);
  });

  it('extracts district from profile location or district property', () => {
    expect(getProfileDistrict({ location: 'Kampala' })).toBe('Kampala');
    expect(getProfileDistrict({ district: 'Wakiso' })).toBe('Wakiso');
    expect(getProfileDistrict({ location: null, district: 'Jinja' })).toBe('Jinja');
    expect(getProfileDistrict(null)).toBe('');
  });
});
