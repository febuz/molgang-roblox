import {
  renderTemplate,
  validateParams,
  bumpVersion,
  SavedQuery,
  ParamDef,
} from '../../src/query-builder';

/**
 * Unit tests for the saved-query builder pure logic: template rendering,
 * parameter validation, and version history.
 */

const defs: ParamDef[] = [
  { name: 'species', required: true },
  { name: 'temp', default: '298' },
];

describe('renderTemplate', () => {
  it('substitutes params and applies defaults', () => {
    const r = renderTemplate('fugacity of {{species}} at {{temp}}K', { species: 'CO2' }, defs);
    expect(r.rendered).toBe('fugacity of CO2 at 298K');
    expect(r.missing).toEqual([]);
  });
  it('reports missing params with no value or default', () => {
    const r = renderTemplate('{{species}} {{pressure}}', {}, defs);
    expect(r.missing).toContain('species');
    expect(r.missing).toContain('pressure');
  });
  it('handles whitespace inside braces', () => {
    expect(renderTemplate('{{ species }}', { species: 'Ar' }).rendered).toBe('Ar');
  });
});

describe('validateParams', () => {
  it('passes when required params are present', () => {
    expect(validateParams(defs, { species: 'CO2' }).ok).toBe(true);
  });
  it('fails on a missing required param', () => {
    const v = validateParams(defs, {});
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toMatch(/species/);
  });
  it('rejects unknown params', () => {
    const v = validateParams(defs, { species: 'CO2', bogus: '1' });
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toMatch(/unknown param: bogus/);
  });
});

describe('bumpVersion', () => {
  const base: SavedQuery = {
    id: 'q1', name: 'Fugacity', target: 'wiki', template: 'fugacity of {{species}}',
    params: defs, version: 1, author: 'Kimi', tags: ['qchem'],
    createdAt: 't0', updatedAt: 't0', history: [],
  };
  it('increments version and pushes the prior template into history', () => {
    const v2 = bumpVersion(base, { template: 'fugacity coefficient of {{species}}' }, 't1');
    expect(v2.version).toBe(2);
    expect(v2.template).toContain('coefficient');
    expect(v2.history).toHaveLength(1);
    expect(v2.history[0]).toMatchObject({ version: 1, template: 'fugacity of {{species}}' });
  });
  it('keeps a full history across multiple bumps', () => {
    const v2 = bumpVersion(base, { template: 'a' }, 't1');
    const v3 = bumpVersion(v2, { template: 'b' }, 't2');
    expect(v3.version).toBe(3);
    expect(v3.history.map(h => h.version)).toEqual([1, 2]);
  });
});
