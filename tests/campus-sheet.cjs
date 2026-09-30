const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const {sheetHeights,settleSheet}=await import(pathToFileURL(path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building/campus-sheet.js')).href);
  const normal=sheetHeights(700,98,0);
  assert.deepEqual(normal,{peek:120,half:350,expanded:595});
  assert.equal(settleSheet(130,0,normal),'peek');assert.equal(settleSheet(320,0,normal),'half');assert.equal(settleSheet(610,0,normal),'expanded');
  assert.equal(settleSheet(400,1.5,normal),'expanded');assert.equal(settleSheet(300,-1.5,normal),'peek');
  for(const available of [80,140,180,300,620])for(const header of [90,140,180]){
    const heights=sheetHeights(available,header,58);
    assert(heights.peek<=heights.half&&heights.half<=heights.expanded&&heights.expanded<=available);
    assert.equal(settleSheet(-1000,0,heights),'peek');
  }
  assert.equal(sheetHeights(700,126,58).peek,184,'Long titles and sticky action fit Peek');
  const detail=sheetHeights(636,145,58,460);
  assert.equal(detail.peek,203,'Photo space must not inflate the collapsed card');
  assert.equal(detail.half,460,'Details leave room for a photo below the complete header');
  assert.equal(sheetHeights(240,145,58,460).half,204,'Keyboard-sized viewports cap the preferred detail height');
  console.log('PASS semantic sheet heights, small/keyboard viewports, header/action sizing and velocity settling');
})().catch(error=>{console.error(error);process.exitCode=1;});
