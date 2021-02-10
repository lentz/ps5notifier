async function login(browser) {
  console.log('Logging into Target');

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36');

  await page.goto('https://www.target.com');
  const userMenu = await page.waitForSelector('#account');
  await userMenu.click();

  const signIn = await page.waitForSelector('#accountNav-signIn a', { visible: true });
  await page.waitForTimeout(1000);
  await Promise.all([page.waitForNavigation(), signIn.click()]);

  await page.type('#username', process.env.TARGET_USER);
  await page.type('#password', process.env.TARGET_PASS);
  await Promise.all([page.waitForNavigation(), page.click('#login')]);
}

async function buy(page, forPat) {
  console.log('BUYING FROM TARGET');

  const shipItButton = await page.waitForXPath('//button[@data-test="shipItButton"]');
  await shipItButton.click();

  const declineCoverage = await page.$x('//button[@data-test="espModalContent-declineCoverageButton"]');
  if (declineCoverage && declineCoverage.length) {
    await declineCoverage[0].click();
  }

  const checkoutBtn = await page.waitForXPath('//button[@data-test="addToCartModalViewCartCheckout"]');
  await checkoutBtn.click();

  const readyBtn = await page.waitForXPath('//button[@data-test="checkout-button"]');
  await readyBtn.click();

  const placeOrderBtn = await page.waitForXPath('//button[@data-test="placeOrderButton"]');

  // TODO Fix
  if (forPat) {
    const editAddressLink = await page.waitForXPath('//a[@data-test="edit-shipping-button"]');
    await editAddressLink.click();

    await page.waitForXPath('//span[text() = "Patrick Riegler"]');

    const addressRadios = await page.$x('//input[@name="addressSelection"]');
    await addressRadios[1].click();

    const saveBtn = await page.waitForXPath('//button[@data-test="save-and-continue-button"]');
    await saveBtn.click();
  }

  const confirmCard = await page.$('#creditCardInput-cardNumber');
  if (confirmCard) {
    await page.type('#creditCardInput-cardNumber', process.env.CC_NUMBER);
    const confirmBtn = await page.waitForXPath('//button[@data-test="verify-card-button"]');
    await confirmBtn.click();

    await page.waitForSelector('#creditCardInput-cvv');
    await page.type('#creditCardInput-cvv', process.env.CC_CODE);

    const saveBtn = await page.waitForXPath('//button[@data-test="save-and-continue-button"]');
    await saveBtn.click();
  }

  await placeOrderBtn.click();
}

module.exports = { buy, login };
