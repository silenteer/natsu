import { SUBJECT_PATTERN } from '../index';

it('Validate subject', async () => {
  expect(SUBJECT_PATTERN.test('.api')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('*.api')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('$api')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('>.api')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('api.')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('api.>')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('api.*')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('abc-xyz')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('abc_xyz.*')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('abc..xyz')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('abc.01.02.03.04.05.06.07.08.09.10')).toBeFalsy();
  expect(SUBJECT_PATTERN.test('abc.01.02.03.04.05.06.07.08.09')).toBeTruthy();
});
