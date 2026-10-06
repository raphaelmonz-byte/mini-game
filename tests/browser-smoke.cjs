// Optional UI regressions. Requires Playwright and Chromium; the game itself has no dependencies.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.join(__dirname, '..');
const port = 9876;
const server = spawn('python3', ['-m','http.server', String(port), '--bind','127.0.0.1'], { cwd:root, stdio:'ignore' });
const url = `http://127.0.0.1:${port}`;

(async () => {
  let browser;
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(url)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox'] });
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport:mobile ? {width:390,height:844} : {width:1440,height:1000}, hasTouch:mobile, isMobile:mobile });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Only expose state to arrange a neighboring enemy scenario; all gestures run through the UI.
      await page.route('**/game.js*', route => {
        const code = fs.readFileSync(path.join(root,'game.js'),'utf8').replace('  resetState();\n  requestAnimationFrame(frame);', '  resetState();\n  globalThis.testState = state;\n  globalThis.testRefresh = refreshAll;\n  requestAnimationFrame(frame);');
        return route.fulfill({ contentType:'application/javascript', body:code });
      });
      await page.clock.install();
      await page.goto(url);
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      assert.equal(await page.locator('#buildVersion').textContent(), 'Version 0.4.0');
      assert.equal(await page.locator('input[name=ability]').count(),3);
      await page.selectOption('#difficulty','hard');
      assert.equal(await page.locator('.special-icon').evaluateAll(nodes => nodes.filter(n => n.textContent).length),7);
      await page.locator('#overlayRestart').click();
      const tap = async id => mobile ? page.locator(`[data-id=${id}] .region-label-bg`).tap() : page.locator(`[data-id=${id}] .region-label-bg`).click();
      await tap('r1');
      assert((await page.locator('[data-id=r1]').getAttribute('class')).includes('selected'));
      await tap('r2');
      assert.equal(await page.locator('.legion-dot[fill="#159747"]').count(),1);
      await page.evaluate(() => { testState.regions.get('r5').owner='enemy'; testRefresh(); });
      const a=await page.locator('[data-id=r1] .region-label-bg').boundingBox();
      const b=await page.locator('[data-id=r5] .region-label-bg').boundingBox();
      const start={x:a.x+a.width/2,y:a.y+a.height/2}, end={x:b.x+b.width/2,y:b.y+b.height/2};
      if (mobile) {
        const session=await context.newCDPSession(page);
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
        for(let i=1;i<=10;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/10,y:start.y+(end.y-start.y)*i/10}]});
        assert(await page.locator('#dragArrow').isVisible());
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await session.detach();
      } else {
        await page.mouse.move(start.x,start.y); await page.mouse.down();
        await page.mouse.move(end.x,end.y,{steps:10});
        assert(await page.locator('#dragArrow').isVisible());
        await page.mouse.up();
      }
      assert.equal(await page.locator('.legion-dot[fill="#159747"]').count(),2);
      assert(await page.locator('#dragArrow').isHidden());
      await page.locator('#abilityBtn').click(); await tap('r1');
      assert.equal(await page.locator('[data-id=r1] .region-capacity').textContent(),'Kap. 39');
      assert((await page.locator('#abilityBtn').textContent()).includes('60 s'));
      await tap('r1'); await tap('r8');
      assert.equal(await page.locator('.legion-dot[fill="#159747"]').count(),3);
      assert.deepEqual(errors,[]);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({path:`/tmp/territory-${mobile ? 'touch' : 'desktop'}-0.4.png`});
      console.log(`${mobile ? 'Touch' : 'Mouse'}: neutral tap/click, hostile drag, distant hostile attack, arrow, ability, version, difficulty and layout passed.`);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode=1; });
