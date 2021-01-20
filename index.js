const sgMail = require('@sendgrid/mail');
const puppeteer = require('puppeteer');

const costco = require('./costco');
const target = require('./target');

require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const stores = [
  // {
  //   delay: 0,
  //   name: 'Costco Disc',
  //   url: 'https://www.costco.com/sony-playstation-5-gaming-console-bundle.product.100691489.html',
  //   xpath: '//img[@title="Out of Stock"]',
  // },
  {
    delay: 0,
    name: 'Bestbuy Disc',
    url: 'https://www.bestbuy.com/site/sony-playstation-5-console/6426149.p?skuId=6426149',
    xpath: '//button[text()="Add to Cart"][@data-sku-id="6426149"]',
  },
  {
    delay: 0,
    name: 'Bestbuy Digital',
    url: 'https://www.bestbuy.com/site/sony-playstation-5-digital-edition-console/6430161.p?skuId=6430161',
    xpath: '//button[text()="Add to Cart"][@data-sku-id="6430161"]',
  },
  {
    delay: 0,
    name: 'Target Disc',
    url: 'https://www.target.com/p/playstation-5-console/-/A-81114595',
    xpath: '//button[text()="Pick it up" or text()="Ship it"]',
  },
  {
    delay: 0,
    name: 'Target Digital',
    url: 'https://www.target.com/p/playstation-5-digital-edition-console/-/A-81114596',
    xpath: '//button[text()="Pick it up" or text()="Ship it"]',
  },
  {
    delay: 0,
    name: 'Amazon Disc',
    url: 'https://www.amazon.com/dp/B08FC5L3RG',
    xpath: '//input[@value="Add to Cart"]',
  },
  {
    delay: 0,
    name: 'Amazon Digital',
    url: 'https://www.amazon.com/dp/B08FC6MR62',
    xpath: '//input[@value="Add to Cart"]',
  },
  {
    delay: 0,
    name: 'GameStop Disc',
    url: 'https://www.gamestop.com/video-games/playstation-5/consoles/products/playstation-5/B225169X.html',
    xpath: '//button[text()="Add to Cart"]',
  },
  {
    delay: 0,
    name: 'GameStop Digital',
    url: 'https://www.gamestop.com/video-games/playstation-5/consoles/products/playstation-5-digital-edition/B225171P.html',
    xpath: '//button[text()="Add to Cart"]',
  },
];

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
    headless: false,
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');

  // await costco.login(page);
  await target.login(page);

  while(true) {
    for (const store of stores) {
      if (store.delay < Date.now()) {
        try {
          console.log('Checking', store.name);
          await page.goto(store.url, { waitUntil: 'domcontentloaded' });
          const inStock = await page.waitForXPath(store.xpath, { timeout: 10000, visible: true });

          console.log('IN STOCK AT', store.name);

          const screenshot = await page.screenshot({ encoding: 'base64' });

          if (/Target/.test(store.name)) {
            try {
              await target.buy(page, false);
            } catch (err) {
              console.error('Error buying from Target:', err.message);
            }
          }

          await sgMail.send({
            attachments: [{
              filename: 'screenshot.png',
              type: 'image/png',
              content_id: 'screenshot',
              content: screenshot,
              disposition: 'inline',
            }],
            from: 'PS5 Notifier <fantasynotify@mailinator.com>',
            html: `${store.url}<br /><br /><img src="cid:screenshot" />`,
            subject: `PS5 in stock at ${store.name}`,
            to: process.env.EMAILS.split(','),
          });

          store.delay = Date.now() + (1000 * 60 * 60);
        } catch (err) {
          if (!/waiting for XPath/i.test(err.message)) {
            console.log('Error checking stock:', err);
          }
        }
      }
    }

    console.log('Sleeping', new Date().toLocaleString());
    await page.waitForTimeout(30000);
  }
})().catch((err) => console.error(err));
