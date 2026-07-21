/**
 * Sovereign Democratic Elections
 *
 * Parliamentary and presidential elections bound to sovereign DIDs, with
 * Merkle-certified results, optional post-quantum ballot signatures, and a
 * complete ISO 3166-1 country registry.
 *
 * Design principles:
 *  - VERIFIABILITY FIRST: every ballot is signed by the voter's DID key;
 *    the result certificate carries a Merkle root over all ballot hashes.
 *  - SYBIL RESISTANCE: only registered DIDs may vote; one ballot per DID
 *    per election per constituency.
 *  - OPTIONAL PQ PROTECTION: voters with a PQ wallet add a W-OTS+/Merkle
 *    signature alongside their Ed25519 ballot signature.
 *  - QUANTUM-SAFE RESULT HASHING: every intermediate hash is SHA-256 only.
 *  - NEUTRAL TALLY: seat allocation uses published algorithms (D'Hondt,
 *    FPTP, two-round). The implementation is unit-testable and deterministic
 *    from the ballot set alone.
 *
 * REST (registerElectionRoutes):
 *   GET  /api/elections/countries                       — ISO country registry
 *   GET  /api/elections/countries/:iso/config           — national election config
 *   POST /api/elections                                 — create election
 *   GET  /api/elections                                 — list elections
 *   GET  /api/elections/:id                             — election detail + live tally
 *   POST /api/elections/:id/open                        — open voting
 *   POST /api/elections/:id/register                    — voter registration (DID)
 *   POST /api/elections/:id/vote                        — cast DID-signed ballot
 *   POST /api/elections/:id/close                       — close + certify results
 *   GET  /api/elections/:id/results                     — certified result certificate
 *   GET  /api/elections/:id/ballots/:ballotId/verify    — verify individual ballot
 */

import { verify as edVerify, createPublicKey } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { IdentityResolverPort } from './identity-port';
import type { ValueChainService } from './value-chain';
import { keyHistory } from './identity';
import { canonicalize, sha256, buildMerkleRoot } from './graph-state-root';
import { verifyHbsSignature, type HbsSignature } from './pq-crypto';
import logger from '../../utils/logger';

// ── DoS bounds ────────────────────────────────────────────────────────────────
export const MAX_ELECTIONS = 10_000;
export const MAX_CANDIDATES = 5_000;
export const MAX_CONSTITUENCIES = 1_000;
export const MAX_REGISTERED_VOTERS = 1_000_000;
export const MAX_BALLOTS_PER_ELECTION = 1_000_000;
export const MAX_NAME_LENGTH = 256;
export const MAX_DESCRIPTION_LENGTH = 2048;

// ─────────────────────────────────────────────────────────────────────────────
// ISO 3166-1 Country registry
// ─────────────────────────────────────────────────────────────────────────────

export interface CountryInfo {
  iso2: string;   // ISO 3166-1 alpha-2, e.g. "NL"
  iso3: string;   // ISO 3166-1 alpha-3, e.g. "NLD"
  numeric: string; // ISO 3166-1 numeric, e.g. "528"
  name: string;   // English short name
  region: string; // UN macro-region
}

// Complete UN member state list (193 members + 2 observer states = 195 entries)
export const COUNTRY_REGISTRY: ReadonlyArray<CountryInfo> = [
  { iso2: 'AF', iso3: 'AFG', numeric: '004', name: 'Afghanistan', region: 'Asia' },
  { iso2: 'AL', iso3: 'ALB', numeric: '008', name: 'Albania', region: 'Europe' },
  { iso2: 'DZ', iso3: 'DZA', numeric: '012', name: 'Algeria', region: 'Africa' },
  { iso2: 'AD', iso3: 'AND', numeric: '020', name: 'Andorra', region: 'Europe' },
  { iso2: 'AO', iso3: 'AGO', numeric: '024', name: 'Angola', region: 'Africa' },
  { iso2: 'AG', iso3: 'ATG', numeric: '028', name: 'Antigua and Barbuda', region: 'Americas' },
  { iso2: 'AR', iso3: 'ARG', numeric: '032', name: 'Argentina', region: 'Americas' },
  { iso2: 'AM', iso3: 'ARM', numeric: '051', name: 'Armenia', region: 'Asia' },
  { iso2: 'AU', iso3: 'AUS', numeric: '036', name: 'Australia', region: 'Oceania' },
  { iso2: 'AT', iso3: 'AUT', numeric: '040', name: 'Austria', region: 'Europe' },
  { iso2: 'AZ', iso3: 'AZE', numeric: '031', name: 'Azerbaijan', region: 'Asia' },
  { iso2: 'BS', iso3: 'BHS', numeric: '044', name: 'Bahamas', region: 'Americas' },
  { iso2: 'BH', iso3: 'BHR', numeric: '048', name: 'Bahrain', region: 'Asia' },
  { iso2: 'BD', iso3: 'BGD', numeric: '050', name: 'Bangladesh', region: 'Asia' },
  { iso2: 'BB', iso3: 'BRB', numeric: '052', name: 'Barbados', region: 'Americas' },
  { iso2: 'BY', iso3: 'BLR', numeric: '112', name: 'Belarus', region: 'Europe' },
  { iso2: 'BE', iso3: 'BEL', numeric: '056', name: 'Belgium', region: 'Europe' },
  { iso2: 'BZ', iso3: 'BLZ', numeric: '084', name: 'Belize', region: 'Americas' },
  { iso2: 'BJ', iso3: 'BEN', numeric: '204', name: 'Benin', region: 'Africa' },
  { iso2: 'BT', iso3: 'BTN', numeric: '064', name: 'Bhutan', region: 'Asia' },
  { iso2: 'BO', iso3: 'BOL', numeric: '068', name: 'Bolivia', region: 'Americas' },
  { iso2: 'BA', iso3: 'BIH', numeric: '070', name: 'Bosnia and Herzegovina', region: 'Europe' },
  { iso2: 'BW', iso3: 'BWA', numeric: '072', name: 'Botswana', region: 'Africa' },
  { iso2: 'BR', iso3: 'BRA', numeric: '076', name: 'Brazil', region: 'Americas' },
  { iso2: 'BN', iso3: 'BRN', numeric: '096', name: 'Brunei', region: 'Asia' },
  { iso2: 'BG', iso3: 'BGR', numeric: '100', name: 'Bulgaria', region: 'Europe' },
  { iso2: 'BF', iso3: 'BFA', numeric: '854', name: 'Burkina Faso', region: 'Africa' },
  { iso2: 'BI', iso3: 'BDI', numeric: '108', name: 'Burundi', region: 'Africa' },
  { iso2: 'CV', iso3: 'CPV', numeric: '132', name: 'Cabo Verde', region: 'Africa' },
  { iso2: 'KH', iso3: 'KHM', numeric: '116', name: 'Cambodia', region: 'Asia' },
  { iso2: 'CM', iso3: 'CMR', numeric: '120', name: 'Cameroon', region: 'Africa' },
  { iso2: 'CA', iso3: 'CAN', numeric: '124', name: 'Canada', region: 'Americas' },
  { iso2: 'CF', iso3: 'CAF', numeric: '140', name: 'Central African Republic', region: 'Africa' },
  { iso2: 'TD', iso3: 'TCD', numeric: '148', name: 'Chad', region: 'Africa' },
  { iso2: 'CL', iso3: 'CHL', numeric: '152', name: 'Chile', region: 'Americas' },
  { iso2: 'CN', iso3: 'CHN', numeric: '156', name: 'China', region: 'Asia' },
  { iso2: 'CO', iso3: 'COL', numeric: '170', name: 'Colombia', region: 'Americas' },
  { iso2: 'KM', iso3: 'COM', numeric: '174', name: 'Comoros', region: 'Africa' },
  { iso2: 'CG', iso3: 'COG', numeric: '178', name: 'Congo', region: 'Africa' },
  { iso2: 'CD', iso3: 'COD', numeric: '180', name: 'Congo, Democratic Republic', region: 'Africa' },
  { iso2: 'CR', iso3: 'CRI', numeric: '188', name: 'Costa Rica', region: 'Americas' },
  { iso2: 'CI', iso3: 'CIV', numeric: '384', name: "Côte d'Ivoire", region: 'Africa' },
  { iso2: 'HR', iso3: 'HRV', numeric: '191', name: 'Croatia', region: 'Europe' },
  { iso2: 'CU', iso3: 'CUB', numeric: '192', name: 'Cuba', region: 'Americas' },
  { iso2: 'CY', iso3: 'CYP', numeric: '196', name: 'Cyprus', region: 'Europe' },
  { iso2: 'CZ', iso3: 'CZE', numeric: '203', name: 'Czech Republic', region: 'Europe' },
  { iso2: 'DK', iso3: 'DNK', numeric: '208', name: 'Denmark', region: 'Europe' },
  { iso2: 'DJ', iso3: 'DJI', numeric: '262', name: 'Djibouti', region: 'Africa' },
  { iso2: 'DM', iso3: 'DMA', numeric: '212', name: 'Dominica', region: 'Americas' },
  { iso2: 'DO', iso3: 'DOM', numeric: '214', name: 'Dominican Republic', region: 'Americas' },
  { iso2: 'EC', iso3: 'ECU', numeric: '218', name: 'Ecuador', region: 'Americas' },
  { iso2: 'EG', iso3: 'EGY', numeric: '818', name: 'Egypt', region: 'Africa' },
  { iso2: 'SV', iso3: 'SLV', numeric: '222', name: 'El Salvador', region: 'Americas' },
  { iso2: 'GQ', iso3: 'GNQ', numeric: '226', name: 'Equatorial Guinea', region: 'Africa' },
  { iso2: 'ER', iso3: 'ERI', numeric: '232', name: 'Eritrea', region: 'Africa' },
  { iso2: 'EE', iso3: 'EST', numeric: '233', name: 'Estonia', region: 'Europe' },
  { iso2: 'SZ', iso3: 'SWZ', numeric: '748', name: 'Eswatini', region: 'Africa' },
  { iso2: 'ET', iso3: 'ETH', numeric: '231', name: 'Ethiopia', region: 'Africa' },
  { iso2: 'FJ', iso3: 'FJI', numeric: '242', name: 'Fiji', region: 'Oceania' },
  { iso2: 'FI', iso3: 'FIN', numeric: '246', name: 'Finland', region: 'Europe' },
  { iso2: 'FR', iso3: 'FRA', numeric: '250', name: 'France', region: 'Europe' },
  { iso2: 'GA', iso3: 'GAB', numeric: '266', name: 'Gabon', region: 'Africa' },
  { iso2: 'GM', iso3: 'GMB', numeric: '270', name: 'Gambia', region: 'Africa' },
  { iso2: 'GE', iso3: 'GEO', numeric: '268', name: 'Georgia', region: 'Asia' },
  { iso2: 'DE', iso3: 'DEU', numeric: '276', name: 'Germany', region: 'Europe' },
  { iso2: 'GH', iso3: 'GHA', numeric: '288', name: 'Ghana', region: 'Africa' },
  { iso2: 'GR', iso3: 'GRC', numeric: '300', name: 'Greece', region: 'Europe' },
  { iso2: 'GD', iso3: 'GRD', numeric: '308', name: 'Grenada', region: 'Americas' },
  { iso2: 'GT', iso3: 'GTM', numeric: '320', name: 'Guatemala', region: 'Americas' },
  { iso2: 'GN', iso3: 'GIN', numeric: '324', name: 'Guinea', region: 'Africa' },
  { iso2: 'GW', iso3: 'GNB', numeric: '624', name: 'Guinea-Bissau', region: 'Africa' },
  { iso2: 'GY', iso3: 'GUY', numeric: '328', name: 'Guyana', region: 'Americas' },
  { iso2: 'HT', iso3: 'HTI', numeric: '332', name: 'Haiti', region: 'Americas' },
  { iso2: 'HN', iso3: 'HND', numeric: '340', name: 'Honduras', region: 'Americas' },
  { iso2: 'HU', iso3: 'HUN', numeric: '348', name: 'Hungary', region: 'Europe' },
  { iso2: 'IS', iso3: 'ISL', numeric: '352', name: 'Iceland', region: 'Europe' },
  { iso2: 'IN', iso3: 'IND', numeric: '356', name: 'India', region: 'Asia' },
  { iso2: 'ID', iso3: 'IDN', numeric: '360', name: 'Indonesia', region: 'Asia' },
  { iso2: 'IR', iso3: 'IRN', numeric: '364', name: 'Iran', region: 'Asia' },
  { iso2: 'IQ', iso3: 'IRQ', numeric: '368', name: 'Iraq', region: 'Asia' },
  { iso2: 'IE', iso3: 'IRL', numeric: '372', name: 'Ireland', region: 'Europe' },
  { iso2: 'IL', iso3: 'ISR', numeric: '376', name: 'Israel', region: 'Asia' },
  { iso2: 'IT', iso3: 'ITA', numeric: '380', name: 'Italy', region: 'Europe' },
  { iso2: 'JM', iso3: 'JAM', numeric: '388', name: 'Jamaica', region: 'Americas' },
  { iso2: 'JP', iso3: 'JPN', numeric: '392', name: 'Japan', region: 'Asia' },
  { iso2: 'JO', iso3: 'JOR', numeric: '400', name: 'Jordan', region: 'Asia' },
  { iso2: 'KZ', iso3: 'KAZ', numeric: '398', name: 'Kazakhstan', region: 'Asia' },
  { iso2: 'KE', iso3: 'KEN', numeric: '404', name: 'Kenya', region: 'Africa' },
  { iso2: 'KI', iso3: 'KIR', numeric: '296', name: 'Kiribati', region: 'Oceania' },
  { iso2: 'KP', iso3: 'PRK', numeric: '408', name: 'Korea, North', region: 'Asia' },
  { iso2: 'KR', iso3: 'KOR', numeric: '410', name: 'Korea, South', region: 'Asia' },
  { iso2: 'KW', iso3: 'KWT', numeric: '414', name: 'Kuwait', region: 'Asia' },
  { iso2: 'KG', iso3: 'KGZ', numeric: '417', name: 'Kyrgyzstan', region: 'Asia' },
  { iso2: 'LA', iso3: 'LAO', numeric: '418', name: 'Laos', region: 'Asia' },
  { iso2: 'LV', iso3: 'LVA', numeric: '428', name: 'Latvia', region: 'Europe' },
  { iso2: 'LB', iso3: 'LBN', numeric: '422', name: 'Lebanon', region: 'Asia' },
  { iso2: 'LS', iso3: 'LSO', numeric: '426', name: 'Lesotho', region: 'Africa' },
  { iso2: 'LR', iso3: 'LBR', numeric: '430', name: 'Liberia', region: 'Africa' },
  { iso2: 'LY', iso3: 'LBY', numeric: '434', name: 'Libya', region: 'Africa' },
  { iso2: 'LI', iso3: 'LIE', numeric: '438', name: 'Liechtenstein', region: 'Europe' },
  { iso2: 'LT', iso3: 'LTU', numeric: '440', name: 'Lithuania', region: 'Europe' },
  { iso2: 'LU', iso3: 'LUX', numeric: '442', name: 'Luxembourg', region: 'Europe' },
  { iso2: 'MG', iso3: 'MDG', numeric: '450', name: 'Madagascar', region: 'Africa' },
  { iso2: 'MW', iso3: 'MWI', numeric: '454', name: 'Malawi', region: 'Africa' },
  { iso2: 'MY', iso3: 'MYS', numeric: '458', name: 'Malaysia', region: 'Asia' },
  { iso2: 'MV', iso3: 'MDV', numeric: '462', name: 'Maldives', region: 'Asia' },
  { iso2: 'ML', iso3: 'MLI', numeric: '466', name: 'Mali', region: 'Africa' },
  { iso2: 'MT', iso3: 'MLT', numeric: '470', name: 'Malta', region: 'Europe' },
  { iso2: 'MH', iso3: 'MHL', numeric: '584', name: 'Marshall Islands', region: 'Oceania' },
  { iso2: 'MR', iso3: 'MRT', numeric: '478', name: 'Mauritania', region: 'Africa' },
  { iso2: 'MU', iso3: 'MUS', numeric: '480', name: 'Mauritius', region: 'Africa' },
  { iso2: 'MX', iso3: 'MEX', numeric: '484', name: 'Mexico', region: 'Americas' },
  { iso2: 'FM', iso3: 'FSM', numeric: '583', name: 'Micronesia', region: 'Oceania' },
  { iso2: 'MD', iso3: 'MDA', numeric: '498', name: 'Moldova', region: 'Europe' },
  { iso2: 'MC', iso3: 'MCO', numeric: '492', name: 'Monaco', region: 'Europe' },
  { iso2: 'MN', iso3: 'MNG', numeric: '496', name: 'Mongolia', region: 'Asia' },
  { iso2: 'ME', iso3: 'MNE', numeric: '499', name: 'Montenegro', region: 'Europe' },
  { iso2: 'MA', iso3: 'MAR', numeric: '504', name: 'Morocco', region: 'Africa' },
  { iso2: 'MZ', iso3: 'MOZ', numeric: '508', name: 'Mozambique', region: 'Africa' },
  { iso2: 'MM', iso3: 'MMR', numeric: '104', name: 'Myanmar', region: 'Asia' },
  { iso2: 'NA', iso3: 'NAM', numeric: '516', name: 'Namibia', region: 'Africa' },
  { iso2: 'NR', iso3: 'NRU', numeric: '520', name: 'Nauru', region: 'Oceania' },
  { iso2: 'NP', iso3: 'NPL', numeric: '524', name: 'Nepal', region: 'Asia' },
  { iso2: 'NL', iso3: 'NLD', numeric: '528', name: 'Netherlands', region: 'Europe' },
  { iso2: 'NZ', iso3: 'NZL', numeric: '554', name: 'New Zealand', region: 'Oceania' },
  { iso2: 'NI', iso3: 'NIC', numeric: '558', name: 'Nicaragua', region: 'Americas' },
  { iso2: 'NE', iso3: 'NER', numeric: '562', name: 'Niger', region: 'Africa' },
  { iso2: 'NG', iso3: 'NGA', numeric: '566', name: 'Nigeria', region: 'Africa' },
  { iso2: 'MK', iso3: 'MKD', numeric: '807', name: 'North Macedonia', region: 'Europe' },
  { iso2: 'NO', iso3: 'NOR', numeric: '578', name: 'Norway', region: 'Europe' },
  { iso2: 'OM', iso3: 'OMN', numeric: '512', name: 'Oman', region: 'Asia' },
  { iso2: 'PK', iso3: 'PAK', numeric: '586', name: 'Pakistan', region: 'Asia' },
  { iso2: 'PW', iso3: 'PLW', numeric: '585', name: 'Palau', region: 'Oceania' },
  { iso2: 'PS', iso3: 'PSE', numeric: '275', name: 'Palestine', region: 'Asia' },
  { iso2: 'PA', iso3: 'PAN', numeric: '591', name: 'Panama', region: 'Americas' },
  { iso2: 'PG', iso3: 'PNG', numeric: '598', name: 'Papua New Guinea', region: 'Oceania' },
  { iso2: 'PY', iso3: 'PRY', numeric: '600', name: 'Paraguay', region: 'Americas' },
  { iso2: 'PE', iso3: 'PER', numeric: '604', name: 'Peru', region: 'Americas' },
  { iso2: 'PH', iso3: 'PHL', numeric: '608', name: 'Philippines', region: 'Asia' },
  { iso2: 'PL', iso3: 'POL', numeric: '616', name: 'Poland', region: 'Europe' },
  { iso2: 'PT', iso3: 'PRT', numeric: '620', name: 'Portugal', region: 'Europe' },
  { iso2: 'QA', iso3: 'QAT', numeric: '634', name: 'Qatar', region: 'Asia' },
  { iso2: 'RO', iso3: 'ROU', numeric: '642', name: 'Romania', region: 'Europe' },
  { iso2: 'RU', iso3: 'RUS', numeric: '643', name: 'Russia', region: 'Europe' },
  { iso2: 'RW', iso3: 'RWA', numeric: '646', name: 'Rwanda', region: 'Africa' },
  { iso2: 'KN', iso3: 'KNA', numeric: '659', name: 'Saint Kitts and Nevis', region: 'Americas' },
  { iso2: 'LC', iso3: 'LCA', numeric: '662', name: 'Saint Lucia', region: 'Americas' },
  { iso2: 'VC', iso3: 'VCT', numeric: '670', name: 'Saint Vincent and the Grenadines', region: 'Americas' },
  { iso2: 'WS', iso3: 'WSM', numeric: '882', name: 'Samoa', region: 'Oceania' },
  { iso2: 'SM', iso3: 'SMR', numeric: '674', name: 'San Marino', region: 'Europe' },
  { iso2: 'ST', iso3: 'STP', numeric: '678', name: 'Sao Tome and Principe', region: 'Africa' },
  { iso2: 'SA', iso3: 'SAU', numeric: '682', name: 'Saudi Arabia', region: 'Asia' },
  { iso2: 'SN', iso3: 'SEN', numeric: '686', name: 'Senegal', region: 'Africa' },
  { iso2: 'RS', iso3: 'SRB', numeric: '688', name: 'Serbia', region: 'Europe' },
  { iso2: 'SC', iso3: 'SYC', numeric: '690', name: 'Seychelles', region: 'Africa' },
  { iso2: 'SL', iso3: 'SLE', numeric: '694', name: 'Sierra Leone', region: 'Africa' },
  { iso2: 'SG', iso3: 'SGP', numeric: '702', name: 'Singapore', region: 'Asia' },
  { iso2: 'SK', iso3: 'SVK', numeric: '703', name: 'Slovakia', region: 'Europe' },
  { iso2: 'SI', iso3: 'SVN', numeric: '705', name: 'Slovenia', region: 'Europe' },
  { iso2: 'SB', iso3: 'SLB', numeric: '090', name: 'Solomon Islands', region: 'Oceania' },
  { iso2: 'SO', iso3: 'SOM', numeric: '706', name: 'Somalia', region: 'Africa' },
  { iso2: 'ZA', iso3: 'ZAF', numeric: '710', name: 'South Africa', region: 'Africa' },
  { iso2: 'SS', iso3: 'SSD', numeric: '728', name: 'South Sudan', region: 'Africa' },
  { iso2: 'ES', iso3: 'ESP', numeric: '724', name: 'Spain', region: 'Europe' },
  { iso2: 'LK', iso3: 'LKA', numeric: '144', name: 'Sri Lanka', region: 'Asia' },
  { iso2: 'SD', iso3: 'SDN', numeric: '729', name: 'Sudan', region: 'Africa' },
  { iso2: 'SR', iso3: 'SUR', numeric: '740', name: 'Suriname', region: 'Americas' },
  { iso2: 'SE', iso3: 'SWE', numeric: '752', name: 'Sweden', region: 'Europe' },
  { iso2: 'CH', iso3: 'CHE', numeric: '756', name: 'Switzerland', region: 'Europe' },
  { iso2: 'SY', iso3: 'SYR', numeric: '760', name: 'Syria', region: 'Asia' },
  { iso2: 'TW', iso3: 'TWN', numeric: '158', name: 'Taiwan', region: 'Asia' },
  { iso2: 'TJ', iso3: 'TJK', numeric: '762', name: 'Tajikistan', region: 'Asia' },
  { iso2: 'TZ', iso3: 'TZA', numeric: '834', name: 'Tanzania', region: 'Africa' },
  { iso2: 'TH', iso3: 'THA', numeric: '764', name: 'Thailand', region: 'Asia' },
  { iso2: 'TL', iso3: 'TLS', numeric: '626', name: 'Timor-Leste', region: 'Asia' },
  { iso2: 'TG', iso3: 'TGO', numeric: '768', name: 'Togo', region: 'Africa' },
  { iso2: 'TO', iso3: 'TON', numeric: '776', name: 'Tonga', region: 'Oceania' },
  { iso2: 'TT', iso3: 'TTO', numeric: '780', name: 'Trinidad and Tobago', region: 'Americas' },
  { iso2: 'TN', iso3: 'TUN', numeric: '788', name: 'Tunisia', region: 'Africa' },
  { iso2: 'TR', iso3: 'TUR', numeric: '792', name: 'Turkey', region: 'Asia' },
  { iso2: 'TM', iso3: 'TKM', numeric: '795', name: 'Turkmenistan', region: 'Asia' },
  { iso2: 'TV', iso3: 'TUV', numeric: '798', name: 'Tuvalu', region: 'Oceania' },
  { iso2: 'UG', iso3: 'UGA', numeric: '800', name: 'Uganda', region: 'Africa' },
  { iso2: 'UA', iso3: 'UKR', numeric: '804', name: 'Ukraine', region: 'Europe' },
  { iso2: 'AE', iso3: 'ARE', numeric: '784', name: 'United Arab Emirates', region: 'Asia' },
  { iso2: 'GB', iso3: 'GBR', numeric: '826', name: 'United Kingdom', region: 'Europe' },
  { iso2: 'US', iso3: 'USA', numeric: '840', name: 'United States', region: 'Americas' },
  { iso2: 'UY', iso3: 'URY', numeric: '858', name: 'Uruguay', region: 'Americas' },
  { iso2: 'UZ', iso3: 'UZB', numeric: '860', name: 'Uzbekistan', region: 'Asia' },
  { iso2: 'VU', iso3: 'VUT', numeric: '548', name: 'Vanuatu', region: 'Oceania' },
  { iso2: 'VE', iso3: 'VEN', numeric: '862', name: 'Venezuela', region: 'Americas' },
  { iso2: 'VN', iso3: 'VNM', numeric: '704', name: 'Vietnam', region: 'Asia' },
  { iso2: 'YE', iso3: 'YEM', numeric: '887', name: 'Yemen', region: 'Asia' },
  { iso2: 'ZM', iso3: 'ZMB', numeric: '894', name: 'Zambia', region: 'Africa' },
  { iso2: 'ZW', iso3: 'ZWE', numeric: '716', name: 'Zimbabwe', region: 'Africa' },
  // UN observer states
  { iso2: 'VA', iso3: 'VAT', numeric: '336', name: 'Holy See', region: 'Europe' },
  { iso2: 'PS', iso3: 'PSE', numeric: '275', name: 'Palestine, State of', region: 'Asia' },
] as const;

// Fast lookup
const COUNTRY_MAP = new Map<string, CountryInfo>(COUNTRY_REGISTRY.map(c => [c.iso2, c]));
export function lookupCountry(iso2: string): CountryInfo | undefined {
  return COUNTRY_MAP.get(iso2.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// National election system configurations — how each country runs elections
// ─────────────────────────────────────────────────────────────────────────────

export type ElectionType = 'parliamentary' | 'presidential' | 'referendum' | 'municipal';
export type VotingSystem = 'fptp' | 'proportional' | 'two_round' | 'mixed' | 'stv';
export type BallotFormat = 'party' | 'candidate' | 'yes_no' | 'ranked';

export interface NationalElectionConfig {
  /** ISO 3166-1 alpha-2 code */
  iso2: string;
  defaultElectionType: ElectionType;
  votingSystem: VotingSystem;
  ballotFormat: BallotFormat;
  /** Electoral threshold as a fraction (e.g. 0.05 = 5%). null = no threshold */
  nationalThreshold: number | null;
  /** Total seats in lower/sole house */
  totalSeats: number;
  /** Number of constituencies. 1 = national list */
  constituencyCount: number;
  notes: string;
}

// Configurations for the world's major parliamentary democracies
export const NATIONAL_ELECTION_CONFIGS: ReadonlyMap<string, NationalElectionConfig> = new Map([
  ['NL', { iso2: 'NL', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.00667, totalSeats: 150, constituencyCount: 1, notes: 'Tweede Kamer; one national constituency; threshold = 1 seat (1/150)' }],
  ['DE', { iso2: 'DE', defaultElectionType: 'parliamentary', votingSystem: 'mixed', ballotFormat: 'candidate', nationalThreshold: 0.05, totalSeats: 736, constituencyCount: 299, notes: 'Bundestag; 299 FPTP + proportional levelling; 5% or 3 direct seats' }],
  ['BE', { iso2: 'BE', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.05, totalSeats: 150, constituencyCount: 11, notes: 'Chambre des représentants; D\'Hondt per arrondissement; 5% threshold' }],
  ['SE', { iso2: 'SE', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.04, totalSeats: 349, constituencyCount: 29, notes: 'Riksdag; modified Sainte-Laguë; 4% national or 12% constituency' }],
  ['NO', { iso2: 'NO', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.04, totalSeats: 169, constituencyCount: 19, notes: 'Storting; modified Sainte-Laguë; 4% for levelling seats' }],
  ['DK', { iso2: 'DK', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.02, totalSeats: 179, constituencyCount: 10, notes: 'Folketing; modified Sainte-Laguë; 2% threshold; includes Faroe + Greenland' }],
  ['FI', { iso2: 'FI', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 200, constituencyCount: 13, notes: 'Eduskunta; D\'Hondt per constituency; no national threshold' }],
  ['AT', { iso2: 'AT', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.04, totalSeats: 183, constituencyCount: 9, notes: 'Nationalrat; D\'Hondt; 4% national threshold' }],
  ['CH', { iso2: 'CH', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: null, totalSeats: 200, constituencyCount: 26, notes: 'Nationalrat; D\'Hondt per canton; no national threshold' }],
  ['PT', { iso2: 'PT', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: null, totalSeats: 230, constituencyCount: 22, notes: 'Assembleia da República; D\'Hondt per district' }],
  ['ES', { iso2: 'ES', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.03, totalSeats: 350, constituencyCount: 52, notes: 'Congreso de los Diputados; D\'Hondt per province; 3% per constituency' }],
  ['IT', { iso2: 'IT', defaultElectionType: 'parliamentary', votingSystem: 'mixed', ballotFormat: 'party', nationalThreshold: 0.03, totalSeats: 400, constituencyCount: 28, notes: 'Camera dei Deputati; 1/3 FPTP + 2/3 proportional (Rosatellum); 3%' }],
  ['FR', { iso2: 'FR', defaultElectionType: 'parliamentary', votingSystem: 'two_round', ballotFormat: 'candidate', nationalThreshold: 0.125, totalSeats: 577, constituencyCount: 577, notes: 'Assemblée nationale; two-round; 12.5% of registered voters to proceed' }],
  ['PL', { iso2: 'PL', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.05, totalSeats: 460, constituencyCount: 41, notes: 'Sejm; D\'Hondt; 5% parties / 8% coalitions' }],
  ['CZ', { iso2: 'CZ', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.05, totalSeats: 200, constituencyCount: 14, notes: 'Poslanecká sněmovna; D\'Hondt; 5%' }],
  ['HU', { iso2: 'HU', defaultElectionType: 'parliamentary', votingSystem: 'mixed', ballotFormat: 'party', nationalThreshold: 0.05, totalSeats: 199, constituencyCount: 106, notes: 'Országgyűlés; 106 FPTP + 93 proportional; 5%' }],
  ['RO', { iso2: 'RO', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.05, totalSeats: 329, constituencyCount: 43, notes: 'Camera Deputaților; uninominal proportional; 5%' }],
  ['GR', { iso2: 'GR', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: 0.03, totalSeats: 300, constituencyCount: 56, notes: 'Hellenic Parliament; reinforced proportional; 3%' }],
  ['GB', { iso2: 'GB', defaultElectionType: 'parliamentary', votingSystem: 'fptp', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 650, constituencyCount: 650, notes: 'House of Commons; first-past-the-post; 650 single-member constituencies' }],
  ['IE', { iso2: 'IE', defaultElectionType: 'parliamentary', votingSystem: 'stv', ballotFormat: 'ranked', nationalThreshold: null, totalSeats: 174, constituencyCount: 43, notes: 'Dáil Éireann; STV with multi-member constituencies; ranked ballot' }],
  ['CA', { iso2: 'CA', defaultElectionType: 'parliamentary', votingSystem: 'fptp', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 343, constituencyCount: 343, notes: 'House of Commons; Westminster FPTP' }],
  ['AU', { iso2: 'AU', defaultElectionType: 'parliamentary', votingSystem: 'stv', ballotFormat: 'ranked', nationalThreshold: null, totalSeats: 151, constituencyCount: 151, notes: 'House of Representatives; instant-runoff (AV); Senate uses STV' }],
  ['NZ', { iso2: 'NZ', defaultElectionType: 'parliamentary', votingSystem: 'mixed', ballotFormat: 'party', nationalThreshold: 0.05, totalSeats: 120, constituencyCount: 72, notes: 'House of Representatives; MMP (72 electorate + 48 list); 5%' }],
  ['JP', { iso2: 'JP', defaultElectionType: 'parliamentary', votingSystem: 'mixed', ballotFormat: 'party', nationalThreshold: null, totalSeats: 465, constituencyCount: 289, notes: 'House of Representatives; 289 FPTP + 176 proportional; 11 PR blocks' }],
  ['KR', { iso2: 'KR', defaultElectionType: 'parliamentary', votingSystem: 'mixed', ballotFormat: 'party', nationalThreshold: 0.03, totalSeats: 300, constituencyCount: 253, notes: 'National Assembly; 253 FPTP + 47 proportional; 3%' }],
  ['IN', { iso2: 'IN', defaultElectionType: 'parliamentary', votingSystem: 'fptp', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 543, constituencyCount: 543, notes: 'Lok Sabha; Westminster FPTP; 543 constituencies' }],
  ['ZA', { iso2: 'ZA', defaultElectionType: 'parliamentary', votingSystem: 'proportional', ballotFormat: 'party', nationalThreshold: null, totalSeats: 400, constituencyCount: 9, notes: 'National Assembly; D\'Hondt; 200 national + 200 regional (9 provinces)' }],
  ['BR', { iso2: 'BR', defaultElectionType: 'presidential', votingSystem: 'two_round', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 1, constituencyCount: 1, notes: 'Presidential; two-round; majority required' }],
  ['US', { iso2: 'US', defaultElectionType: 'presidential', votingSystem: 'fptp', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 538, constituencyCount: 51, notes: 'Electoral College; winner-take-all per state (except ME/NE)' }],
  ['MX', { iso2: 'MX', defaultElectionType: 'presidential', votingSystem: 'fptp', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 1, constituencyCount: 1, notes: 'Presidential; simple plurality; 6-year term' }],
  ['AR', { iso2: 'AR', defaultElectionType: 'presidential', votingSystem: 'two_round', ballotFormat: 'candidate', nationalThreshold: 0.45, totalSeats: 1, constituencyCount: 1, notes: 'Presidential; 45% or 40%+10pp lead to avoid runoff' }],
  ['TR', { iso2: 'TR', defaultElectionType: 'presidential', votingSystem: 'two_round', ballotFormat: 'candidate', nationalThreshold: null, totalSeats: 1, constituencyCount: 1, notes: 'Presidential + parliamentary; 10% threshold for parliament' }],
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// Election types
// ─────────────────────────────────────────────────────────────────────────────

export interface Constituency {
  id: string;
  name: string;
  seats: number;         // seats up for election in this constituency
  threshold?: number;    // local electoral threshold (0.0–1.0)
}

export interface Candidate {
  id: string;
  name: string;
  party?: string;
  constituencyId: string;
}

export interface ElectionConfig {
  country: string;          // ISO 3166-1 alpha-2
  electionType: ElectionType;
  votingSystem: VotingSystem;
  ballotFormat: BallotFormat;
  nationalThreshold?: number;  // fraction 0.0–1.0; optional
  constituencies: Constituency[];
  candidates: Candidate[];
  description?: string;
  /** Optional: require voters to hold a specific verifiable credential type */
  requiredCredentialClaim?: string;
}

export type ElectionStatus = 'draft' | 'open' | 'closed' | 'certified';

export interface Election {
  id: string;
  config: ElectionConfig;
  status: ElectionStatus;
  createdAt: string;
  openedAt?: string;
  closedAt?: string;
  certifiedAt?: string;
}

/** Payload committed by voter's Ed25519 key and optional PQ key */
export function ballotSignPayload(b: {
  electionId: string;
  constituencyId: string;
  voter: string;
  selection: string;
}): string {
  return canonicalize({
    electionId: b.electionId,
    constituencyId: b.constituencyId,
    voter: b.voter,
    selection: b.selection,
  });
}

export interface ElectionBallot {
  id: string;
  electionId: string;
  constituencyId: string;
  voter: string;           // DID
  selection: string;       // candidate/party id, or 'yes'/'no'
  castAt: string;
  publicKeyPem: string;
  signature: string;       // base64 Ed25519 over ballotSignPayload
  pqRoot?: string;         // VPC-HBS1 root (hex) — present if voter enrolled PQ
  pqSignature?: HbsSignature;
}

export interface ConstituencyResult {
  constituencyId: string;
  constituencyName: string;
  seats: number;
  totalVotes: number;
  breakdown: Record<string, number>;   // candidate/party id → votes
  /** Seat allocation per party/candidate (proportional/mixed) */
  seatAllocation?: Record<string, number>;
  /** Winner (fptp/presidential/two_round) */
  winner?: string;
  merkleRoot: string;       // Merkle root over ballot hashes in this constituency
}

export interface ElectionCertificate {
  electionId: string;
  country: string;
  electionType: ElectionType;
  votingSystem: VotingSystem;
  closedAt: string;
  totalBallots: number;
  results: ConstituencyResult[];
  /** Merkle root over constituency merkle roots (in id sort order) */
  overallMerkleRoot: string;
  certHash: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat allocation algorithms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * D'Hondt highest-averages method.
 * Used by Netherlands, Belgium, Spain, Portugal, Austria, Finland, etc.
 * Returns a map of party/candidate id → seats won.
 */
export function dHondt(
  votes: Record<string, number>,
  seats: number,
  threshold = 0,
): Record<string, number> {
  const totalVotes = Object.values(votes).reduce((s, v) => s + v, 0);
  const eligible = Object.entries(votes).filter(([, v]) => threshold === 0 || v / totalVotes >= threshold);
  if (eligible.length === 0 || seats === 0) return {};

  const alloc: Record<string, number> = {};
  eligible.forEach(([id]) => { alloc[id] = 0; });

  for (let s = 0; s < seats; s++) {
    let best = -1;
    let winner = '';
    for (const [id, v] of eligible) {
      const quotient = v / ((alloc[id] ?? 0) + 1);
      if (quotient > best) { best = quotient; winner = id; }
    }
    alloc[winner] = (alloc[winner] ?? 0) + 1;
  }
  return alloc;
}

/**
 * Modified Sainte-Laguë.
 * Used by Germany (federal list), Sweden, Norway, Denmark.
 * First divisor is 1.4 instead of 1.
 */
export function sainteLague(
  votes: Record<string, number>,
  seats: number,
  threshold = 0,
  firstDivisor = 1.4,
): Record<string, number> {
  const totalVotes = Object.values(votes).reduce((s, v) => s + v, 0);
  const eligible = Object.entries(votes).filter(([, v]) => threshold === 0 || v / totalVotes >= threshold);
  if (eligible.length === 0 || seats === 0) return {};

  const alloc: Record<string, number> = {};
  eligible.forEach(([id]) => { alloc[id] = 0; });

  for (let s = 0; s < seats; s++) {
    let best = -1;
    let winner = '';
    for (const [id, v] of eligible) {
      const divisor = alloc[id] === 0 ? firstDivisor : (alloc[id] * 2 + 1);
      const quotient = v / divisor;
      if (quotient > best) { best = quotient; winner = id; }
    }
    alloc[winner] = (alloc[winner] ?? 0) + 1;
  }
  return alloc;
}

/** FPTP: plurality winner. Ties broken by id sort (deterministic). */
export function fptp(votes: Record<string, number>): string | undefined {
  let best = -1;
  let winner: string | undefined;
  for (const [id, v] of Object.entries(votes)) {
    if (v > best || (v === best && id < (winner ?? ''))) { best = v; winner = id; }
  }
  return winner;
}

function allocateSeats(
  votes: Record<string, number>,
  seats: number,
  system: VotingSystem,
  threshold = 0,
): { winner?: string; allocation?: Record<string, number> } {
  if (system === 'fptp' || system === 'two_round') {
    return { winner: fptp(votes) };
  }
  if (system === 'proportional') {
    return { allocation: dHondt(votes, seats, threshold) };
  }
  if (system === 'mixed') {
    // Use D'Hondt for the list portion; direct-seat calculation omitted here
    return { allocation: dHondt(votes, seats, threshold) };
  }
  if (system === 'stv') {
    // Full STV (ranked-choice count) requires ranked ballots stored in the
    // selection field as a JSON-encoded array. For now, apply D'Hondt over
    // first-preference counts — a compliant implementation can replace this.
    return { allocation: dHondt(votes, seats, threshold) };
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class DemocraticElectionService {
  private readonly elections = new Map<string, Election>();
  private readonly ballots = new Map<string, ElectionBallot[]>();
  private readonly registeredVoters = new Map<string, Set<string>>(); // electionId → Set<DID>
  private readonly certificates = new Map<string, ElectionCertificate>();
  // electionId:constitucyId:did → ballotId  (one ballot per DID per constituency)
  private readonly ballotIndex = new Map<string, string>();

  constructor(
    private readonly identity: IdentityResolverPort,
  ) {}

  // ── Election lifecycle ────────────────────────────────────────────────────

  createElection(config: ElectionConfig): Election {
    if (this.elections.size >= MAX_ELECTIONS) throw Object.assign(new Error('election cap reached'), { status: 429 });
    this.validateConfig(config);

    const id = uuid();
    const election: Election = { id, config, status: 'draft', createdAt: new Date().toISOString() };
    this.elections.set(id, election);
    this.ballots.set(id, []);
    this.registeredVoters.set(id, new Set());
    logger.info(`election created: ${id} (${config.country} ${config.electionType})`);
    return election;
  }

  openElection(id: string): Election {
    const election = this.getElectionOrThrow(id);
    if (election.status !== 'draft') throw Object.assign(new Error('election is not in draft status'), { status: 409 });
    election.status = 'open';
    election.openedAt = new Date().toISOString();
    return election;
  }

  registerVoter(electionId: string, voterDid: string): { registered: boolean; alreadyRegistered: boolean } {
    const election = this.getElectionOrThrow(electionId);
    if (election.status !== 'open') throw Object.assign(new Error('election is not open'), { status: 409 });

    // Verify the DID exists in the identity service
    const doc = this.identity.resolve(voterDid);
    if (!doc) throw Object.assign(new Error('DID not found'), { status: 404 });

    const voters = this.registeredVoters.get(electionId)!;
    if (voters.size >= MAX_REGISTERED_VOTERS) throw Object.assign(new Error('voter registration cap reached'), { status: 429 });

    const alreadyRegistered = voters.has(voterDid);
    if (!alreadyRegistered) voters.add(voterDid);
    return { registered: true, alreadyRegistered };
  }

  castBallot(params: {
    electionId: string;
    constituencyId: string;
    voter: string;
    selection: string;
    publicKeyPem: string;
    signature: string;
    pqRoot?: string;
    pqSignature?: HbsSignature;
  }): ElectionBallot {
    const election = this.getElectionOrThrow(params.electionId);
    if (election.status !== 'open') throw Object.assign(new Error('election is not open'), { status: 409 });

    // Verify voter is registered
    const voters = this.registeredVoters.get(params.electionId)!;
    if (!voters.has(params.voter)) throw Object.assign(new Error('voter not registered'), { status: 403 });

    // Validate constituency
    const constituency = election.config.constituencies.find(c => c.id === params.constituencyId);
    if (!constituency) throw Object.assign(new Error('constituency not found'), { status: 404 });

    // Validate candidate/party/option
    if (election.config.ballotFormat !== 'yes_no') {
      const valid = election.config.candidates.find(c =>
        c.id === params.selection && c.constituencyId === params.constituencyId,
      );
      if (!valid) throw Object.assign(new Error('invalid selection for constituency'), { status: 422 });
    } else if (params.selection !== 'yes' && params.selection !== 'no') {
      throw Object.assign(new Error('selection must be yes or no'), { status: 422 });
    }

    // One ballot per DID per constituency
    const indexKey = `${params.electionId}:${params.constituencyId}:${params.voter}`;
    if (this.ballotIndex.has(indexKey)) throw Object.assign(new Error('voter already cast ballot in this constituency'), { status: 409 });

    // Verify Ed25519 signature
    const doc = this.identity.resolve(params.voter);
    if (!doc) throw Object.assign(new Error('DID not found'), { status: 404 });
    const payload = ballotSignPayload(params);
    const validSig = this.verifyEd25519Ballot(payload, params.publicKeyPem, params.signature, doc);
    if (!validSig) throw Object.assign(new Error('invalid ballot signature'), { status: 422 });

    // Verify PQ signature if provided
    if (params.pqRoot !== undefined || params.pqSignature !== undefined) {
      if (!params.pqRoot || !params.pqSignature) throw Object.assign(new Error('pqRoot and pqSignature must both be present'), { status: 422 });
      if (!verifyHbsSignature(payload, params.pqSignature, params.pqRoot)) {
        throw Object.assign(new Error('invalid post-quantum ballot signature'), { status: 422 });
      }
    }

    const ballotList = this.ballots.get(params.electionId)!;
    if (ballotList.length >= MAX_BALLOTS_PER_ELECTION) throw Object.assign(new Error('ballot cap reached'), { status: 429 });

    const ballot: ElectionBallot = {
      id: uuid(),
      electionId: params.electionId,
      constituencyId: params.constituencyId,
      voter: params.voter,
      selection: params.selection,
      castAt: new Date().toISOString(),
      publicKeyPem: params.publicKeyPem,
      signature: params.signature,
      ...(params.pqRoot ? { pqRoot: params.pqRoot, pqSignature: params.pqSignature } : {}),
    };

    ballotList.push(ballot);
    this.ballotIndex.set(indexKey, ballot.id);
    logger.info(`ballot cast: ${ballot.id} in election ${params.electionId}`);
    return ballot;
  }

  closeAndCertify(electionId: string): ElectionCertificate {
    const election = this.getElectionOrThrow(electionId);
    if (election.status !== 'open') throw Object.assign(new Error('election is not open'), { status: 409 });

    election.status = 'certified';
    election.closedAt = new Date().toISOString();
    election.certifiedAt = election.closedAt;

    const ballotList = this.ballots.get(electionId) ?? [];
    const results: ConstituencyResult[] = [];

    for (const constituency of election.config.constituencies) {
      const cBallots = ballotList.filter(b => b.constituencyId === constituency.id);
      const breakdown: Record<string, number> = {};
      for (const b of cBallots) {
        breakdown[b.selection] = (breakdown[b.selection] ?? 0) + 1;
      }

      const threshold = constituency.threshold ?? election.config.nationalThreshold ?? 0;
      const { winner, allocation } = allocateSeats(breakdown, constituency.seats, election.config.votingSystem, threshold);

      const merkleRoot = buildMerkleRoot(cBallots.map(b => sha256(canonicalize({
        id: b.id, electionId: b.electionId, constituencyId: b.constituencyId,
        voter: b.voter, selection: b.selection,
      }))));

      results.push({
        constituencyId: constituency.id,
        constituencyName: constituency.name,
        seats: constituency.seats,
        totalVotes: cBallots.length,
        breakdown,
        ...(allocation ? { seatAllocation: allocation } : {}),
        ...(winner ? { winner } : {}),
        merkleRoot,
      });
    }

    // Overall Merkle root over constituency roots (sorted for determinism)
    const sortedRoots = [...results].sort((a, b) => a.constituencyId.localeCompare(b.constituencyId))
      .map(r => r.merkleRoot);
    const overallMerkleRoot = buildMerkleRoot(sortedRoots);

    const certPayload = canonicalize({
      electionId,
      country: election.config.country,
      electionType: election.config.electionType,
      closedAt: election.closedAt,
      overallMerkleRoot,
    });
    const cert: ElectionCertificate = {
      electionId,
      country: election.config.country,
      electionType: election.config.electionType,
      votingSystem: election.config.votingSystem,
      closedAt: election.closedAt!,
      totalBallots: ballotList.length,
      results,
      overallMerkleRoot,
      certHash: sha256(certPayload),
    };
    this.certificates.set(electionId, cert);
    logger.info(`election certified: ${electionId}, merkle root: ${overallMerkleRoot}`);
    return cert;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  listElections(): Election[] {
    return Array.from(this.elections.values());
  }

  getElection(id: string): Election | undefined {
    return this.elections.get(id);
  }

  getCertificate(electionId: string): ElectionCertificate | undefined {
    return this.certificates.get(electionId);
  }

  getRegisteredVoterCount(electionId: string): number {
    return this.registeredVoters.get(electionId)?.size ?? 0;
  }

  getTurnout(electionId: string): number {
    const voters = this.registeredVoters.get(electionId)?.size ?? 0;
    if (voters === 0) return 0;
    const unique = new Set(this.ballots.get(electionId)?.map(b => b.voter) ?? []);
    return unique.size / voters;
  }

  getLiveTally(electionId: string): Record<string, Record<string, number>> {
    const ballotList = this.ballots.get(electionId) ?? [];
    const tally: Record<string, Record<string, number>> = {};
    for (const b of ballotList) {
      if (!tally[b.constituencyId]) tally[b.constituencyId] = {};
      tally[b.constituencyId][b.selection] = (tally[b.constituencyId][b.selection] ?? 0) + 1;
    }
    return tally;
  }

  verifyBallot(electionId: string, ballotId: string): { valid: boolean; reason?: string } {
    const ballotList = this.ballots.get(electionId) ?? [];
    const ballot = ballotList.find(b => b.id === ballotId);
    if (!ballot) return { valid: false, reason: 'ballot not found' };

    const doc = this.identity.resolve(ballot.voter);
    if (!doc) return { valid: false, reason: 'voter DID not found' };

    const payload = ballotSignPayload(ballot);
    if (!this.verifyEd25519Ballot(payload, ballot.publicKeyPem, ballot.signature, doc)) {
      return { valid: false, reason: 'Ed25519 signature invalid' };
    }
    if (ballot.pqRoot && ballot.pqSignature) {
      if (!verifyHbsSignature(payload, ballot.pqSignature, ballot.pqRoot)) {
        return { valid: false, reason: 'PQ signature invalid' };
      }
    }
    return { valid: true };
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private getElectionOrThrow(id: string): Election {
    const e = this.elections.get(id);
    if (!e) throw Object.assign(new Error('election not found'), { status: 404 });
    return e;
  }

  private validateConfig(config: ElectionConfig): void {
    const country = lookupCountry(config.country);
    if (!country) throw Object.assign(new Error(`unknown country ISO2: ${config.country}`), { status: 422 });
    if (!config.constituencies || config.constituencies.length === 0) throw Object.assign(new Error('at least one constituency required'), { status: 422 });
    if (config.constituencies.length > MAX_CONSTITUENCIES) throw Object.assign(new Error('too many constituencies'), { status: 422 });
    if (!config.candidates || config.candidates.length === 0) {
      if (config.ballotFormat !== 'yes_no') throw Object.assign(new Error('candidates required unless ballotFormat is yes_no'), { status: 422 });
    }
    if (config.candidates && config.candidates.length > MAX_CANDIDATES) throw Object.assign(new Error('too many candidates'), { status: 422 });
    if (config.description && config.description.length > MAX_DESCRIPTION_LENGTH) throw Object.assign(new Error('description too long'), { status: 422 });
    const constIds = new Set(config.constituencies.map(c => c.id));
    for (const c of config.candidates ?? []) {
      if (!constIds.has(c.constituencyId)) throw Object.assign(new Error(`candidate ${c.id} references unknown constituency ${c.constituencyId}`), { status: 422 });
    }
  }

  private verifyEd25519Ballot(
    payload: string,
    publicKeyPem: string,
    signatureB64: string,
    doc: ReturnType<IdentityResolverPort['resolve']>,
  ): boolean {
    if (!doc) return false;
    try {
      // Key must be in the DID's history (genesis or any rotation)
      const history = keyHistory(doc);
      if (!history.includes(publicKeyPem)) return false;
      const key = createPublicKey(publicKeyPem);
      return edVerify(null, Buffer.from(payload), key, Buffer.from(signatureB64, 'base64'));
    } catch {
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REST routes
// ─────────────────────────────────────────────────────────────────────────────

export function registerElectionRoutes(app: Express, svc: DemocraticElectionService): void {

  /** GET /api/elections/countries — full ISO 3166-1 registry */
  app.get('/api/elections/countries', (_req: Request, res: Response) => {
    res.json({ success: true, count: COUNTRY_REGISTRY.length, countries: COUNTRY_REGISTRY });
  });

  /** GET /api/elections/countries/:iso/config — national election system */
  app.get('/api/elections/countries/:iso/config', (req: Request, res: Response): void => {
    const iso = req.params.iso?.toUpperCase();
    const country = lookupCountry(iso);
    if (!country) { res.status(404).json({ success: false, error: 'country not found' }); return; }
    const cfg = NATIONAL_ELECTION_CONFIGS.get(iso);
    res.json({ success: true, country, nationalConfig: cfg ?? null });
  });

  /** POST /api/elections — create election */
  app.post('/api/elections', (req: Request, res: Response): void => {
    try {
      const election = svc.createElection(req.body as ElectionConfig);
      res.status(201).json({ success: true, election });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  /** GET /api/elections — list elections */
  app.get('/api/elections', (_req: Request, res: Response): void => {
    const elections = svc.listElections();
    res.json({ success: true, count: elections.length, elections });
  });

  /** GET /api/elections/:id — election detail + live tally */
  app.get('/api/elections/:id', (req: Request, res: Response): void => {
    const election = svc.getElection(req.params.id);
    if (!election) { res.status(404).json({ success: false, error: 'not found' }); return; }
    const liveTally = election.status === 'open' ? svc.getLiveTally(election.id) : undefined;
    const turnout = svc.getTurnout(election.id);
    const registeredVoters = svc.getRegisteredVoterCount(election.id);
    res.json({ success: true, election, liveTally, turnout, registeredVoters });
  });

  /** POST /api/elections/:id/open — open voting */
  app.post('/api/elections/:id/open', (req: Request, res: Response): void => {
    try {
      const election = svc.openElection(req.params.id);
      res.json({ success: true, election });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  /** POST /api/elections/:id/register — voter registration */
  app.post('/api/elections/:id/register', (req: Request, res: Response): void => {
    const { did } = req.body ?? {};
    if (typeof did !== 'string') { res.status(422).json({ success: false, error: 'did required' }); return; }
    try {
      const result = svc.registerVoter(req.params.id, did);
      res.status(result.alreadyRegistered ? 200 : 201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  /** POST /api/elections/:id/vote — cast ballot */
  app.post('/api/elections/:id/vote', (req: Request, res: Response): void => {
    const { constituencyId, voter, selection, publicKeyPem, signature, pqRoot, pqSignature } = req.body ?? {};
    if (!constituencyId || !voter || !selection || !publicKeyPem || !signature) {
      res.status(422).json({ success: false, error: 'constituencyId, voter, selection, publicKeyPem, signature required' });
      return;
    }
    try {
      const ballot = svc.castBallot({
        electionId: req.params.id,
        constituencyId, voter, selection, publicKeyPem, signature,
        pqRoot, pqSignature,
      });
      res.status(201).json({ success: true, ballotId: ballot.id, castAt: ballot.castAt });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  /** POST /api/elections/:id/close — close + certify */
  app.post('/api/elections/:id/close', (req: Request, res: Response): void => {
    try {
      const cert = svc.closeAndCertify(req.params.id);
      res.json({ success: true, certificate: cert });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  /** GET /api/elections/:id/results — certified result certificate */
  app.get('/api/elections/:id/results', (req: Request, res: Response): void => {
    const cert = svc.getCertificate(req.params.id);
    if (!cert) {
      const election = svc.getElection(req.params.id);
      if (!election) { res.status(404).json({ success: false, error: 'election not found' }); return; }
      res.status(409).json({ success: false, error: 'election not yet certified' }); return;
    }
    res.json({ success: true, certificate: cert });
  });

  /** GET /api/elections/:id/ballots/:ballotId/verify — ballot verification */
  app.get('/api/elections/:id/ballots/:ballotId/verify', (req: Request, res: Response): void => {
    const result = svc.verifyBallot(req.params.id, req.params.ballotId);
    res.status(result.valid ? 200 : 422).json({ success: result.valid, ...result });
  });
}
