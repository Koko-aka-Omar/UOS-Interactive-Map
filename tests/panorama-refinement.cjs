const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
(async()=>{
  const {createPanoramaRefinement}=await import(pathToFileURL(path.join(__dirname,'../M7A_GitHub_Website_Full_Resolution/m7a-building/tour-refinement.js')));
  let current='a',view={},request,signal;const applied=[],disposed=[],errors=[];
  const refinement=createPanoramaRefinement({delay:0,
    load:(i,s)=>{signal=s;request=deferred();return request.promise;},
    isCurrent:(i,v)=>i===current&&v===view,
    apply:(i,v,replacement)=>applied.push(replacement),dispose:r=>disposed.push(r),onError:e=>errors.push(e)
  });
  refinement.queue('a',view);await tick();request.resolve('full-a');await tick();
  assert.deepEqual(applied,['full-a']);assert.deepEqual(disposed,[]);
  // Navigation aborts the transfer; late decode completion must free its image.
  refinement.queue('a',view);await tick();const stale=request;refinement.cancel();assert(signal.aborted);
  current='b';view={};stale.resolve('obsolete-a');await tick();
  assert.deepEqual(applied,['full-a']);assert.deepEqual(disposed,['obsolete-a']);
  // A newer view with the same index also makes an old refinement obsolete.
  refinement.queue('b',view);await tick();view={};request.resolve('old-b');await tick();
  assert.deepEqual(disposed,['obsolete-a','old-b']);
  // Failure keeps the usable preview in place, and a later retry can succeed.
  refinement.queue('b',view);await tick();request.reject(new Error('offline'));await tick();
  assert.equal(errors.length,1);assert.deepEqual(applied,['full-a']);
  refinement.queue('b',view);await tick();request.resolve('full-b');await tick();
  assert.deepEqual(applied,['full-a','full-b']);
  // Cancellation before the timer fires starts no download.
  const previous=request;refinement.queue('b',view);refinement.cancel();await tick();assert.equal(request,previous);
  console.log('PASS refinement, cancellation, stale decode disposal, same-scene replacement, failure and retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
