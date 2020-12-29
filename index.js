const sgMail = require('@sendgrid/mail');
const puppeteer = require('puppeteer');

require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function checkStock(store, url, xpath, page) {
  try {
    console.log('Checking', store);
    await page.goto(url);
    const inStock = await page.waitForXPath(xpath, { visible: true });
  } catch (err) {
    if (/Navigation timeout/i.test(err.message)) {
      console.log('Navigation timeout');
    } else {
      console.log(err.stack);
      console.log('IN STOCK AT', store);
      const screenshot = await page.screenshot({ encoding: 'base64' });
      await page.browser().close();

      await sgMail.send({
        attachments: [{
          filename: 'screenshot.png',
          type: 'image/png',
          content_id: 'screenshot',
          content: screenshot,
          disposition: 'inline',
        }],
        from: 'PS5 Notifier <fantasynotify@mailinator.com>',
        html: `${url}<br /><br /><img src="cid:screenshot" />`,
        subject: `PS5 in stock at ${store}`,
        to: process.env.EMAIL.split(','),
      });

      process.exit();
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({ defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');

  while(true) {
    await checkStock(
      'Costco',
      'https://www.costco.com/sony-playstation-5-gaming-console-bundle.product.100691489.html',
      '//img[@title="Out of Stock"]',
      page,
    );

    await checkStock(
      'Bestbuy',
      'https://www.bestbuy.com/site/sony-playstation-5-console/6426149.p?skuId=6426149',
      '//button[text() = "Sold Out"]',
      page,
    );

    await checkStock(
      'Target',
      'https://www.target.com/p/playstation-5-console/-/A-81114595',
      '//div[@data-test="outOfStockNearbyMessage"]',
      page,
    );

    await checkStock(
      'Amazon',
      'https://www.amazon.com/dp/B08FC5L3RG/ref=olp_product_details/145-5336814-9080741',
      '//div[@id="outOfStock"]',
      page,
    );

    await page.waitForTimeout(30000);
  }
})().catch((err) => console.error(err));
