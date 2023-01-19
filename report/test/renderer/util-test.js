/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import assert from 'assert/strict';

import {Util} from '../../renderer/util.js';
import {I18n} from '../../renderer/i18n.js';
import {readJson} from '../../../core/test/test-utils.js';

const sampleResult = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('util helpers', () => {
  beforeEach(() => {
    Util.i18n = new I18n('en', {...Util.UIStrings});
  });

  afterEach(() => {
    Util.i18n = undefined;
  });

  it('calculates a score ratings', () => {
    assert.equal(Util.calculateRating(0.0), 'fail');
    assert.equal(Util.calculateRating(0.10), 'fail');
    assert.equal(Util.calculateRating(0.45), 'fail');
    assert.equal(Util.calculateRating(0.5), 'average');
    assert.equal(Util.calculateRating(0.75), 'average');
    assert.equal(Util.calculateRating(0.80), 'average');
    assert.equal(Util.calculateRating(0.90), 'pass');
    assert.equal(Util.calculateRating(1.00), 'pass');
  });

  it('builds device emulation string', () => {
    const get = settings => Util.getEmulationDescriptions(settings).deviceEmulation;
    /* eslint-disable max-len */
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: false, mobile: true}}), 'Emulated Moto G4');
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: true, mobile: true}}), 'No emulation');
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: true, mobile: true}, channel: 'devtools'}), 'Emulated Moto G4');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: false, mobile: false}}), 'Emulated Desktop');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: true, mobile: false}}), 'No emulation');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: true, mobile: true}, channel: 'devtools'}), 'Emulated Desktop');
    /* eslint-enable max-len */
  });

  it('builds throttling strings when provided', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'provided',
      screenEmulation: {disabled: true},
    });
    assert.equal(descriptions.cpuThrottling, 'Provided by environment');
    assert.equal(descriptions.networkThrottling, 'Provided by environment');
    assert.equal(descriptions.screenEmulation, undefined);
  });

  it('builds throttling strings when devtools', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'devtools',
      throttling: {
        cpuSlowdownMultiplier: 4.5,
        requestLatencyMs: 565,
        downloadThroughputKbps: 1400.00000000001,
        uploadThroughputKbps: 600,
      },
      screenEmulation: {disabled: true},
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '565\xa0ms HTTP RTT, 1,400\xa0kb/s down, 600\xa0kb/s up (DevTools)');
    assert.equal(descriptions.cpuThrottling, '4.5x slowdown (DevTools)');
  });

  it('builds throttling strings when simulate', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'simulate',
      throttling: {
        cpuSlowdownMultiplier: 2,
        rttMs: 150,
        throughputKbps: 1600,
      },
      screenEmulation: {width: 100, height: 100, deviceScaleFactor: 2},
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '150\xa0ms TCP RTT, 1,600\xa0kb/s throughput (Simulated)');
    assert.equal(descriptions.cpuThrottling, '2x slowdown (Simulated)');
    assert.equal(descriptions.screenEmulation, '100x100, DPR 2');
  });

  describe('#prepareReportResult', () => {
    describe('backward compatibility', () => {
      it('corrects underscored `notApplicable` scoreDisplayMode', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Remove entity classification to be able to compare to sample_v2 results.
        delete clonedSampleResult.entityClassification;

        let notApplicableCount = 0;
        Object.values(clonedSampleResult.audits).forEach(audit => {
          if (audit.scoreDisplayMode === 'notApplicable') {
            notApplicableCount++;
            audit.scoreDisplayMode = 'not_applicable';
          }
        });

        assert.ok(notApplicableCount > 20); // Make sure something's being tested.

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);

        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects undefined auditDetails.type to `debugdata`', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Remove entity classification to be able to compare to sample_v2 results.
        delete clonedSampleResult.entityClassification;

        // Delete debugdata details types.
        let undefinedCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'debugdata') {
            undefinedCount++;
            delete audit.details.type;
          }
        }
        assert.ok(undefinedCount > 4); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects `diagnostic` auditDetails.type to `debugdata`', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Remove entity classification to be able to compare to sample_v2 results.
        delete clonedSampleResult.entityClassification;

        // Change debugdata details types.
        let diagnosticCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'debugdata') {
            diagnosticCount++;
            audit.details.type = 'diagnostic';
          }
        }
        assert.ok(diagnosticCount > 4); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects screenshots in the `filmstrip` auditDetails.type', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Remove entity classification to be able to compare to sample_v2 results.
        delete clonedSampleResult.entityClassification;

        // Strip filmstrip screenshots of data URL prefix.
        let filmstripCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'filmstrip') {
            filmstripCount++;
            for (const screenshot of audit.details.items) {
              screenshot.data = screenshot.data.slice('data:image/jpeg;base64,'.length);
            }
          }
        }
        assert.ok(filmstripCount > 0); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('moves full-page-screenshot audit', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        clonedSampleResult.audits['full-page-screenshot'] = {
          details: {
            type: 'full-page-screenshot',
            ...sampleResult.fullPageScreenshot,
          },
        };
        delete clonedSampleResult.fullPageScreenshot;
        // Remove entity classification to be able to compare to sample_v2 results.
        delete clonedSampleResult.entityClassification;

        assert.ok(clonedSampleResult.audits['full-page-screenshot'].details.nodes); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
        assert.deepStrictEqual(preparedResult.fullPageScreenshot, sampleResult.fullPageScreenshot);
      });

      it('corrects performance category without hidden group', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        clonedSampleResult.lighthouseVersion = '8.6.0';
        delete clonedSampleResult.categoryGroups['hidden'];
        for (const auditRef of clonedSampleResult.categories['performance'].auditRefs) {
          if (auditRef.group === 'hidden') {
            delete auditRef.group;
          } else if (!auditRef.group) {
            auditRef.group = 'diagnostics';
          }
        }
        assert.notDeepStrictEqual(clonedSampleResult.categories, sampleResult.categories);
        assert.notDeepStrictEqual(clonedSampleResult.categoryGroups, sampleResult.categoryGroups);

        // Original audit results should be restored.
        const clonedPreparedResult = Util.prepareReportResult(clonedSampleResult);
        const preparedResult = Util.prepareReportResult(sampleResult);
        assert.deepStrictEqual(clonedPreparedResult.categories, preparedResult.categories);
        assert.deepStrictEqual(clonedPreparedResult.categoryGroups, preparedResult.categoryGroups);
      });

      it('converts old opportunity table column headings to consolidated table headings', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Remove entity classification to be able to compare to sample_v2 results.
        delete clonedSampleResult.entityClassification;

        const auditsWithTableDetails = Object.values(clonedSampleResult.audits)
          .filter(audit => audit.details?.type === 'table');
        assert.notEqual(auditsWithTableDetails.length, 0);
        for (const audit of auditsWithTableDetails) {
          for (const heading of audit.details.headings) {
            heading.itemType = heading.valueType;
            heading.text = heading.label;
            delete heading.valueType;
            delete heading.label;

            if (heading.subItemsHeading) {
              heading.subItemsHeading.itemType = heading.subItemsHeading.valueType;
              // @ts-expect-error
              delete heading.subItemsHeading.valueType;
            }
          }
        }

        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(sampleResult.audits, preparedResult.audits);
      });
    });

    it('appends stack pack descriptions to auditRefs', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));
      const iconDataURL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      clonedSampleResult.stackPacks = [{
        id: 'snackpack',
        title: 'SnackPack',
        iconDataURL,
        descriptions: {
          'unused-css-rules': 'Consider using snacks in packs.',
        },
      }];
      const preparedResult = Util.prepareReportResult(clonedSampleResult);

      const perfAuditRefs = preparedResult.categories.performance.auditRefs;
      const unusedCssRef = perfAuditRefs.find(ref => ref.id === 'unused-css-rules');
      assert.deepStrictEqual(unusedCssRef.stackPacks, [{
        title: 'SnackPack',
        iconDataURL,
        description: 'Consider using snacks in packs.',
      }]);

      // No stack pack on audit wth no stack pack.
      const interactiveRef = perfAuditRefs.find(ref => ref.id === 'interactive');
      assert.strictEqual(interactiveRef.stackPacks, undefined);
    });

    it('identifies entities on items of tables with urls', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

      const auditsWithTableDetails = Object.values(clonedSampleResult.audits)
        .filter(audit => audit.details?.type === 'table');
      assert.notEqual(auditsWithTableDetails.length, 0);

      // collect audit names that might have urls
      const auditsThatDontHaveUrls = ['bf-cache', 'font-size']; // no urls in data-set
      const auditsWithUrls = auditsWithTableDetails.filter(audit => {
        if (auditsThatDontHaveUrls.includes(audit.id)) return false;
        const urlFields = ['url', 'source-location'];
        return audit.details.headings.some(heading =>
          urlFields.includes(heading.valueType) ||
          urlFields.includes(heading.subItemsHeading?.valueType)
        );
      }).map(audit => audit.id);
      assert.notEqual(auditsWithUrls.length, 0);

      const preparedResult = Util.prepareReportResult(clonedSampleResult);

      // ensure each audit that had urls detected to have marked entities.
      for (const id of auditsWithUrls) {
        const foundEntities = preparedResult.audits[id].details.items.some(item => item.entity);
        if (!foundEntities) console.log(id);
        assert.equal(foundEntities, true);
      }
    });
  });

  describe('getTld', () => {
    it('returns the correct tld', () => {
      assert.equal(Util.getTld('example.com'), '.com');
      assert.equal(Util.getTld('example.co.uk'), '.co.uk');
      assert.equal(Util.getTld('example.com.br'), '.com.br');
      assert.equal(Util.getTld('example.tokyo.jp'), '.jp');
    });
  });

  describe('getRootDomain', () => {
    it('returns the correct rootDomain from a string', () => {
      assert.equal(Util.getRootDomain('https://www.example.com/index.html'), 'example.com');
      assert.equal(Util.getRootDomain('https://example.com'), 'example.com');
      assert.equal(Util.getRootDomain('https://www.example.co.uk'), 'example.co.uk');
      assert.equal(Util.getRootDomain('https://example.com.br/app/'), 'example.com.br');
      assert.equal(Util.getRootDomain('https://example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getRootDomain('https://sub.example.com'), 'example.com');
      assert.equal(Util.getRootDomain('https://sub.example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getRootDomain('http://localhost'), 'localhost');
      assert.equal(Util.getRootDomain('http://localhost:8080'), 'localhost');
    });

    it('returns the correct rootDomain from an URL object', () => {
      assert.equal(Util.getRootDomain(new URL('https://www.example.com/index.html')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://example.com')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://www.example.co.uk')), 'example.co.uk');
      assert.equal(Util.getRootDomain(new URL('https://example.com.br/app/')), 'example.com.br');
      assert.equal(Util.getRootDomain(new URL('https://example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getRootDomain(new URL('https://sub.example.com')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://sub.example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getRootDomain(new URL('http://localhost')), 'localhost');
      assert.equal(Util.getRootDomain(new URL('http://localhost:8080')), 'localhost');
    });
  });

  describe('#splitMarkdownCodeSpans', () => {
    it('handles strings with no backticks in them', () => {
      expect(Util.splitMarkdownCodeSpans('regular text')).toEqual([
        {isCode: false, text: 'regular text'},
      ]);
    });

    it('does not split on a single backtick', () => {
      expect(Util.splitMarkdownCodeSpans('regular `text')).toEqual([
        {isCode: false, text: 'regular `text'},
      ]);
    });

    it('splits on backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular `code` text')).toEqual([
        {isCode: false, text: 'regular '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' text'},
      ]);
    });

    it('splits on backticked code at the beginning of the string', () => {
      expect(Util.splitMarkdownCodeSpans('`start code` regular text')).toEqual([
        {isCode: true, text: 'start code'},
        {isCode: false, text: ' regular text'},
      ]);
    });

    it('splits on backticked code at the end of the string', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `end code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'end code'},
      ]);
    });

    it('does not split on a single backtick after split out backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `code` and more `text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' and more `text'},
      ]);
    });

    it('splits on two instances of backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `code` more text `and more code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' more text '},
        {isCode: true, text: 'and more code'},
      ]);
    });

    it('splits on two directly adjacent instances of backticked code', () => {
      // eslint-disable-next-line max-len
      expect(Util.splitMarkdownCodeSpans('regular text `first code``second code` end text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
        {isCode: false, text: ' end text'},
      ]);
    });

    it('handles text only within backticks', () => {
      expect(Util.splitMarkdownCodeSpans('`first code``second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
      ]);
    });

    it('splits on two instances of backticked code separated by only a space', () => {
      // eslint-disable-next-line max-len
      expect(Util.splitMarkdownCodeSpans('`first code` `second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: false, text: ' '},
        {isCode: true, text: 'second code'},
      ]);
    });
  });

  describe('#splitMarkdownLink', () => {
    it('handles strings with no links in them', () => {
      expect(Util.splitMarkdownLink('some text')).toEqual([
        {isLink: false, text: 'some text'},
      ]);
    });

    it('does not split on an incomplete markdown link', () => {
      expect(Util.splitMarkdownLink('some [not link text](text')).toEqual([
        {isLink: false, text: 'some [not link text](text'},
      ]);
    });

    it('splits on a markdown link', () => {
      expect(Util.splitMarkdownLink('some [link text](https://example.com) text')).toEqual([
        {isLink: false, text: 'some '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' text'},
      ]);
    });

    it('splits on an http markdown link', () => {
      expect(Util.splitMarkdownLink('you should [totally click here](http://never-mitm.com) now')).toEqual([
        {isLink: false, text: 'you should '},
        {isLink: true, text: 'totally click here', linkHref: 'http://never-mitm.com'},
        {isLink: false, text: ' now'},
      ]);
    });

    it('does not split on a non-http/https link', () => {
      expect(Util.splitMarkdownLink('some [link text](ftp://example.com) text')).toEqual([
        {isLink: false, text: 'some [link text](ftp://example.com) text'},
      ]);
    });

    it('does not split on a malformed markdown link', () => {
      expect(Util.splitMarkdownLink('some [link ]text](https://example.com')).toEqual([
        {isLink: false, text: 'some [link ]text](https://example.com'},
      ]);

      expect(Util.splitMarkdownLink('some [link text] (https://example.com')).toEqual([
        {isLink: false, text: 'some [link text] (https://example.com'},
      ]);
    });

    it('does not split on empty link text', () => {
      expect(Util.splitMarkdownLink('some [](https://example.com) empty link')).toEqual([
        {isLink: false, text: 'some [](https://example.com) empty link'},
      ]);
    });

    it('splits on a markdown link at the beginning of a string', () => {
      expect(Util.splitMarkdownLink('[link text](https://example.com) end text')).toEqual([
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' end text'},
      ]);
    });

    it('splits on a markdown link at the end of a string', () => {
      expect(Util.splitMarkdownLink('start text [link text](https://example.com)')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string consisting only of a markdown link', () => {
      expect(Util.splitMarkdownLink(`[I'm only a link](https://example.com)`)).toEqual([
        {isLink: true, text: `I'm only a link`, linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string starting and ending with a markdown link', () => {
      expect(Util.splitMarkdownLink('[first link](https://first.com) other text [second link](https://second.com)')).toEqual([
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: false, text: ' other text '},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
      ]);
    });

    it('handles a string with adjacent markdown links', () => {
      expect(Util.splitMarkdownLink('start text [first link](https://first.com)[second link](https://second.com) and scene')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
        {isLink: false, text: ' and scene'},
      ]);
    });
  });

  describe('#shouldDisplayAsFraction', () => {
    it('returns true for timespan and snapshot', () => {
      expect(Util.shouldDisplayAsFraction('navigation')).toEqual(false);
      expect(Util.shouldDisplayAsFraction('timespan')).toEqual(true);
      expect(Util.shouldDisplayAsFraction('snapshot')).toEqual(true);
      expect(Util.shouldDisplayAsFraction(undefined)).toEqual(false);
    });
  });

  describe('#calculateCategoryFraction', () => {
    it('returns passed audits and total audits', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 3, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 2, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 0, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'binary'}, group: 'metrics'},
        ],
      };
      const fraction = Util.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 4,
        numPassed: 3,
        numInformative: 0,
        totalWeight: 6,
      });
    });

    it('ignores manual audits, N/A audits, and hidden audits', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'hidden'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'manual'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'notApplicable'}, group: 'metrics'},
        ],
      };
      const fraction = Util.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 1,
        numPassed: 1,
        numInformative: 0,
        totalWeight: 1,
      });
    });

    it('tracks informative audits separately', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 0, result: {score: 1, scoreDisplayMode: 'informative'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'informative'}, group: 'metrics'},
        ],
      };
      const fraction = Util.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 2,
        numPassed: 2,
        numInformative: 2,
        totalWeight: 2,
      });
    });
  });
});
