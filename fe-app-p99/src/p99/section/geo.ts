export const COUNTRY_CODES: string[] =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK'.split(
    ' ',
  );

export const REGION_NAME_FALLBACKS: Record<string, string> = {
  XK: 'Kosovo',
};

const regionDisplayNamesCache: Record<string, string> = {};

function translate(key: string): string {
  if (typeof _ === 'function') {
    return _(key);
  }
  return key;
}

export function getLuciLanguage(): string {
  if (
    typeof L !== 'undefined' &&
    (L as unknown as { env?: { lang?: string } }).env?.lang
  ) {
    return `${(L as unknown as { env: { lang: string } }).env.lang}`.replace(
      '_',
      '-',
    );
  }

  if (
    typeof document !== 'undefined' &&
    document.documentElement &&
    document.documentElement.lang
  ) {
    return document.documentElement.lang;
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return 'en';
}

export function getRegionDisplayName(code?: string, language?: string): string {
  const normalizedCode = `${code || ''}`.toUpperCase();
  const lang = language || getLuciLanguage();
  const cacheKey = `${lang}:${normalizedCode}`;

  if (regionDisplayNamesCache[cacheKey]) {
    return regionDisplayNamesCache[cacheKey];
  }

  try {
    if (
      typeof Intl !== 'undefined' &&
      (Intl as unknown as { DisplayNames?: typeof Intl.DisplayNames })
        .DisplayNames
    ) {
      const displayNames = new Intl.DisplayNames([lang, 'en'], {
        type: 'region',
      });
      const displayName = displayNames.of(normalizedCode);
      if (displayName && displayName !== normalizedCode) {
        regionDisplayNamesCache[cacheKey] = displayName;
        return displayName;
      }
    }
  } catch {
    // Fall through to the static fallback.
  }

  const fallback = REGION_NAME_FALLBACKS[normalizedCode] || normalizedCode;
  regionDisplayNamesCache[cacheKey] = fallback;
  return fallback;
}

export function getCountryFlagEmoji(code?: string): string {
  const normalizedCode = `${code || ''}`.toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return '';
  }

  return String.fromCodePoint(
    ...normalizedCode
      .split('')
      .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function getCountryOptionLabel(code: string, language?: string): string {
  return `${getCountryFlagEmoji(code)} ${getRegionDisplayName(code, language)}`;
}

export function validateCountryCode(
  _section_id: string,
  value: unknown,
): true | string {
  const values = Array.isArray(value) ? value : [value];
  const normalizedValues = values
    .filter((item) => item != null && `${item}`.length > 0)
    .map((item) => `${item}`.toUpperCase());

  if (!normalizedValues.length) {
    return true;
  }

  return normalizedValues.every((item) => COUNTRY_CODES.includes(item))
    ? true
    : translate('Unknown country');
}

export interface CountryChoice {
  value: string;
  label: string;
}

export function countryChoices(): CountryChoice[] {
  return COUNTRY_CODES.map((code) => ({
    value: code,
    label: getCountryOptionLabel(code),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function serverCountryDetectionChoices(): {
  value: string;
  label: string;
}[] {
  return [
    { value: 'flag_emoji', label: translate('Flag emoji in name') },
    { value: 'country_is', label: translate('Via country.is') },
  ];
}
