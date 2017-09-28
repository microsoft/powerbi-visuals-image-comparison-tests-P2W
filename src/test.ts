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

module powerbi.extensibility.visual.test.imageComparisonP2W {

    const dafaultExistTimeout = 20000,
        pause = 3000,
        defaultElement = "div.visual",
        defaultFrameElement = "iframe div",
        defaultSnapshotElement = "div.visualContainerHost",
        pagePaginationElements = ".logoBar .navigation-wrapper > a";

    function paginatePages(
        loop: () => void,
        done: () => void): void {
        let pagePaginationSelElements: any[] = [];

        this
            .elements(pagePaginationElements)
            .then((res) => {
                pagePaginationSelElements = res.value;
                return browser.elementIdElement(pagePaginationSelElements[2].ELEMENT, "i");
            })
            .then((res) =>
                browser.elementIdAttribute(res.value.ELEMENT, `class`))
            .then((res) => {
                if (res.value.indexOf(`inactive`) === -1 &&
                    res.value.indexOf("pbi-glyph-chevronrightmedium") !== -1) {
                    browser
                        .elementIdClick(pagePaginationSelElements[2].ELEMENT);

                    loop();
                } else {
                    browser
                        .call(done);
                }
            });
    }

    function getElementsPromises(
        element: any,
        existTimeout: number): Promise<any>[] {
        let elementPromises: Promise<any>[] = [];

        if (element && element.await) {
            if (Object.prototype.toString.call(element.await) !== `[object Array]`) {
                element.await = [element.await];
            }

            element.await.forEach(awaitItem => {
                elementPromises.push(
                    this.waitForExist(
                        awaitItem || defaultElement,
                        existTimeout || dafaultExistTimeout
                    )
                );
            });
        }

        if (!element ||
            (element && (!element.await || element.frame))) {
            elementPromises.push(
                this.waitForExist(
                    defaultElement,
                    existTimeout || dafaultExistTimeout
                )
            );
        }

        return elementPromises;
    }

    // iFrames processing

    function checkIFrames(
        element: any,
        existTimeout: number): Promise<any> {
        return new Promise(resolve => {
            if (!element ||
                (element && !element.frame)) {
                return resolve();
            }

            if (Object.prototype.toString.call(element.frame) !== `[object Array]`) {
                element.frame = [element.frame];
            }

            element.frame.forEach((frameItem) => {
                browser
                    .elements(`${frameItem.parentElement} iframe`)
                    .then(res => asyncWaitingOfElementsInFrames(res.value, 0, frameItem.childElement, existTimeout))
                    .then(resolve);
            });
        });
    }

    function asyncWaitingOfElementsInFrames(
        frames: any[],
        index: number,
        elementForSearch: string,
        existTimeout: number): Promise<any> {
        return new Promise(resolve => {
            browser
                .frame(frames[index])
                .then(() => browser
                    .waitForExist(
                        elementForSearch || defaultFrameElement,
                        existTimeout || dafaultExistTimeout
                    )
                    .frameParent()
                )
                .then(() => {
                    if (frames.length - 1 === index) {
                        return resolve();
                    } else {
                        asyncWaitingOfElementsInFrames(frames, ++index, elementForSearch, existTimeout)
                            .then(resolve);
                    }
                });
            });
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
            beforeEach(() => {
                browser.setViewportSize(platformsConfig[platform].viewport, true);
            });

            configData.forEach(item => {
                it(item.name || "Name wasn't specified", (done) => {
                    const isUrl = /^https\:\/\/(app|dxt|msit|powerbi-df)\.(powerbi|analysis-df\.windows)\.(com|net)\/view/.test(item.url);
                    let page = 0;

                    expect(isUrl).toBe(true);

                    browser
                        .timeouts("script", 60000)
                        .timeouts("implicit", 60000)
                        .timeouts("page load", 60000);

                    let urlPromise: any = browser.url(item.url);

                    (function loop() {
                        let element: any = item.element || null;
                        if (element &&
                            Object.prototype.toString.call(item.element) === `[object Array]`) {
                            element = element[page];
                        }

                        Promise.all(getElementsPromises.apply(urlPromise, [element, item.existTimeout]))
                            .then(() => checkIFrames(element, item.existTimeout))
                            .then(() => {
                                let clientContext = browser
                                    .pause(item.pause || pause)
                                    .assertAreaScreenshotMatch({
                                        name: `report_page-${++page}`,
                                        ignore: `antialiasing`,
                                        elem: (element && element.snapshot) || defaultSnapshotElement
                                    });

                                paginatePages.apply(clientContext, [loop, done]);
                            });
                    }());
                });
            });
        });
    }
}