/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

// External
/// <reference path="./../node_modules/@types/jasmine/index.d.ts" />
/// <reference path="./../node_modules/@types/jasmine-jquery/index.d.ts" />

// Testrunner
/// <reference path="./../node_modules/webdriver-client-test-runner/src/webdriver-client-test-runner/typedefs/exports.d.ts" />

let config = require('../configuration/embedded-reports-urls.config.json');
let platformsConfig = require('../configuration/platforms.config.js');
let webDriverIO = require("webdriverio");

let debugMode: boolean = process.argv.indexOf("--debug") !== -1;

module powerbi.extensibility.visual.test.imageComparisonP2W {

    const dafaultExistTimeout: number = 25000,
        dafaultExistIFrameTimeout: number = dafaultExistTimeout - 5000,
        defaultPause: number = 5000,
        defaultElement: string = "div.visual",
        defaultFrameElement: string = "iframe div",
        defaultSnapshotElement: string = "div.visualContainerHost",
        pagePaginationElements: string = ".logoBar .navigation-wrapper > a";

    async function paginatePages(loop: () => void): Promise<any> {
        try {
            let paginationLinkEl: WebdriverIO.Element[] =
                (await browser.elements(pagePaginationElements)).value;
            let paginationIconEl: WebdriverIO.RawResult<WebdriverIO.Element> =
                await browser.elementIdElement(paginationLinkEl[2].ELEMENT, `i`);

            let classedOfPaginationEl: WebdriverIO.RawResult<string> =
                await browser.elementIdAttribute(paginationIconEl.value.ELEMENT, `class`);

            if (classedOfPaginationEl.value.indexOf(`inactive`) !== -1 ||
                classedOfPaginationEl.value.indexOf("pbi-glyph-chevronrightmedium") === -1) {
                return;
            }

            await browser
                .elementIdClick(paginationLinkEl[2].ELEMENT);

            await loop();
        } catch (err) {
            throw new Error(err);
        }
    }

    async function awaitElements(
        element: any,
        existTimeout: number): Promise<any> {
        existTimeout = existTimeout || dafaultExistTimeout;
        try {
            if (element && element.await) {
                if (Object.prototype.toString.call(element.await) !== `[object Array]`) {
                    element.await = [element.await];
                }

                await element.await.forEach(async awaitItem => {
                    awaitItem = awaitItem || defaultElement;
                    await browser.waitForExist(awaitItem, existTimeout);
                });
            }

            if (!element || (element && (!element.await || element.frame))) {
                await browser.waitForExist(defaultElement, existTimeout);
            }
        } catch(err) {
            throw new Error(err);
        }
    }

    // iFrames processing

    async function checkIFrames(
        element: any,
        existTimeout: number): Promise<any> {
        if (!element ||
            (element && !element.frame)) {
            return;
        }

        if (Object.prototype.toString.call(element.frame) !== `[object Array]`) {
            element.frame = [element.frame];
        }

        try {
            await element.frame.forEach(async frameItem => {
                await browser.waitForExist(`${frameItem.parentElement} iframe`, dafaultExistIFrameTimeout);
                let iFrameEl: WebdriverIO.Element[] =
                    (await browser.elements(`${frameItem.parentElement} iframe`)).value;

                await asyncWaitingOfElementsInFrames(iFrameEl, 0, frameItem.childElement, existTimeout)
            });
        } catch(err) {
            throw new Error(err);
        }
    }

    async function asyncWaitingOfElementsInFrames(
        frames: any[],
        index: number,
        elementForSearch: string,
        existTimeout: number): Promise<any> {
        elementForSearch = elementForSearch || defaultFrameElement;
        existTimeout = existTimeout || dafaultExistTimeout;

        await browser.frame(frames[index]);
        await browser.waitForExist(elementForSearch, existTimeout);
        await browser.frameParent();

        if (frames.length - 1 === index) {
            return;
        } else {
            await asyncWaitingOfElementsInFrames(frames, ++index, elementForSearch, existTimeout);
        }
    }

    async function takeScreenshot(
        element: string,
        pause: number,
        page: number): Promise<any> {
        try {
            await browser
                .pause(pause)
                .assertAreaScreenshotMatch({
                    name: `report_page-${page}`,
                    ignore: `antialiasing`,
                    elem: element
                });
        } catch(err) {
            throw new Error(err);
        }
    }

    for (let platform of Object.keys(config)) {
        let configData: any = config[platform];
        browser = webDriverIO.remote({
            host: 'localhost',
            port: 4444,
            desiredCapabilities: {
                browserName: 'chromium',
                chromeOptions: {
                    args: platformsConfig[platform].userAgent.map(item => {
                        return item.header + (item.value ? `=${item.value}` : ``);
                    })
                }
            }
        });

        describe(platform, () => {
            beforeEach(done => {
                browser.setViewportSize(platformsConfig[platform].viewport, true)
                    .then(done);
            });

            configData.forEach(item => {
                it(item.name || "Name wasn't specified", (done) => {
                    const isUrl: boolean = /^https\:\/\/(app|dxt|msit|powerbi-df)\.(powerbi|analysis-df\.windows)\.(com|net)\/view/.test(item.url);
                    let page: number = 0;

                    expect(isUrl).toBe(true);

                    browser
                        .timeouts("script", 60000)
                        .timeouts("implicit", 60000)
                        .timeouts("page load", 60000);

                    let urlPromise: any = browser.url(item.url);
                    (async function loop() {
                        let element: any = item.element || null;
                        if (element &&
                            Object.prototype.toString.call(item.element) === `[object Array]`) {
                            element = element[page];
                        }

                        const pause: number = item.pause || defaultPause;
                        const screenshotElement: string = (element && element.snapshot) || defaultSnapshotElement;

                        try {
                            await urlPromise;
                            await awaitElements(element, item.existTimeout);
                            await checkIFrames(element, item.existTimeout);
                            await takeScreenshot(screenshotElement, pause, ++page);
                            await paginatePages(loop);
                        } catch(err) {
                            if (debugMode) {
                                console.error(err.message);
                            }
                        }

                        browser.call(done);
                    })();
                });
            });
        });
    }
}