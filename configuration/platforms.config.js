module.exports = {
    Desktop: {
        viewport: {
            width: 1024,
            height: 768
        },
        userAgent: [{
            header: 'user-agent',
            value: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
        }]
    },
    Mobile: {
        viewport: {
            width: 640,
            height: 1136
        },
        userAgent: [{
            header: 'use-mobile-user-agent'
        }, {
            header: 'user-agent',
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3'
        }]
    }
};
