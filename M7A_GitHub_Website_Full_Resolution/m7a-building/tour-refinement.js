// Full-resolution refinement never blocks travel or commits to an obsolete view.
export function createPanoramaRefinement({load,apply,dispose,isCurrent,onError=()=>{},delay=250}) {
  let timer=null,controller=null;
  function cancel() {
    clearTimeout(timer);timer=null;
    controller?.abort();controller=null;
  }
  function queue(index,view) {
    cancel();
    const request=new AbortController();controller=request;
    timer=setTimeout(async()=>{
      timer=null;let replacement=null;
      try {
        if(request.signal.aborted||!isCurrent(index,view))return;
        replacement=await load(index,request.signal);
        if(request.signal.aborted||!isCurrent(index,view))return;
        apply(index,view,replacement);replacement=null;
      } catch(error) {
        if(!request.signal.aborted)onError(error);
      } finally {
        if(replacement)dispose(replacement);
        if(controller===request)controller=null;
      }
    },delay);
  }
  return {queue,cancel};
}
