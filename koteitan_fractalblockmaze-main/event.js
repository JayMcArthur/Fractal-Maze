/*----------------------------------
  event.js
  GUI event control. queueing the 
  events and process in serial order.
  See Appendix for detail.
----------------------------------*/
//events ----------------------
//variables
var eventQueue = [];  //eventQueue[i] = <MouseEvent>
var eventsMax  = 100; 
var lastEvent;       
//mouse events
var isDragging = false;
var isMouseOver = false;
var isShiftKey = false;
var mouseDownPos = [-1,-1];
var mousePos     = [-1,-1];
var mouseUpPos   = [-1,-1];
var mouseButton  = -1;
var isKeyTyping;
//init
var initEvent = function(can){
  eventQueue = [];
  can.ontouchstart = addTouchEvent;
  can.ontouchmove  = addTouchEvent;
  can.ontouchend   = addTouchEvent;
  can.onmousedown  = addEvent;
  can.onmousemove  = addEvent;
  can.onmouseup    = addEvent;
  can.onmouseout   = addEvent;
  can.onmousewheel = addEvent;
  can.oncontextmenu = function(e){e.preventDefault();}
//  window.onkeydown       = addEvent;
};
// addEvent(Event e)
var addEvent = function(e){
  if(e.type=="mousewheel"){
    var a=1;
  }
  if(eventQueue.length < eventsMax && e!=undefined){
    eventQueue.push(e);
    lastEvent = e;//for debug
  }
  if(e.type!="keydown" || e.type=="mousewheel"){
    if(!isKeyTyping && isMouseOver){
      if(e.preventDefault) e.preventDefault();
      e.returnValue = false;
    }
  }
};
var addTouchEvent = function(){
  event.preventDefault();
  eventQueue.push(event);
}
// process in game loop
var procEvent = function(){
  while(eventQueue.length>0){
    var e = eventQueue.shift(); // <MouseEvent>
    switch(e.type){
      case "mousedown": // mouse down ---------
        mouseDownPos = removeClientOffset(e);
        mousePos     = mouseDownPos.clone();
        isShiftKey   = e.shiftKey;
        mouseButton  = e.button;
        handleMouseDown();
        isDragging = true;
      break;
      case "mousemove":   // mouse move ---------
        isMouseOver = true;
        mousePos = removeClientOffset(e);
        if(isDragging){
          handleMouseDragging();
        }
      break;
      case "mouseup":   // mouse up ---------
      case "mouseout":   // mouse out ---------
        isMouseOver = false;
        if(isDragging){
          mousePos   = removeClientOffset(e);
          mouseUpPos = mousePos.clone();
          isDragging = false;
          handleMouseUp();
        }
      break;
      case "touchstart": // mouse down ---------
        e.x = e.touches[0].clientX;
        e.y = e.touches[0].clientY;
        mouseDownPos = removeClientOffset(e);
        mousePos     = mouseDownPos.clone();
        handleMouseDown();
        isDragging = true;
      break;
      case "touchmove": // dragging ---------
        e.x = e.touches[0].clientX;
        e.y = e.touches[0].clientY;
        mousePos   = removeClientOffset(e);
        if(isDragging){
          handleMouseDragging();
        }
      break;
      case "touchend":   // mouse up ---------
        mouseUpPos = mousePos.clone();
          /* copied last mousePos 
           because e with touchend event doesn't
           have member e.touches */
        handleMouseUp();
        isDragging = false;
      break;
      case "keydown":   // mouse up ---------
      if(!isKeyTyping) handleKeyDown(e);
      break;
      case "wheel":
      if(isMouseOver){
        mouseTarget = parseInt(e.target.id.substr(-1));
        mouseWheel = [e.wheelDeltaX, e.wheelDeltaY];
        mousePos   = removeClientOffset(e);
        handleMouseWheel();
      }
      break;
      default:
      break;
    }
  }
};
var removeClientOffset = function(e){
  if(e.target.getBoundingClientRect){
    var rect = e.target.getBoundingClientRect();
    return [e.x-rect.left, e.y-rect.top];
  }
  return [e.x, e.y];
};
/*--------------------------------------------------------
  Appendix:

    Usage:

      Using event.js, user can easily add the mouse/touch events doing below:
      (1) Include event.js in HTML.
      (2) Call initEvent(can) before your game loop begins. 
          The parameter can is your canvas object.
      (3) Call procEvent() in your game loop.
      (4) Write handlers you like.
      That's all!

    Handlers references:

      Handler functions:
        handleMouseDown()     = Getting mouse button pressing. (or tap)
        handleMouseUp()       = Getting mouse button releasing (or exit to outside of GUI).
        handleMouseDragging() = Getting mouse dragging between press and release. (or swipe)
        handleMouseMove()     = Getting mouse moving without press.
        handleKeyDown()       = Getting key down
        handleMouseWheel()    = Getting mouse wheel motion.
      variables:
        mouseDownPos[d] = mouse position in d th dimension (d=0 is x, d=1 is y)
        mousePos[d]     = mouse position (handleMouse{Dragging, Mode, Wheel})
        mouseWheel[d]   = mouse wheel rotation mount in d th dimension. unit is unknown.

    How it works in details:
      (1) initEvent() adds event listeners of your canvas.
      (2) When an event occurs, the event listener addEvent() or addTouchEvent() is
          called from another process.
      (3) The event listeners add the event into eventQueue and quit this process.
      (4) procEvent() in your game loop is watching eventQueue and call a proper handler.
      (5) Your handler works.
      That's all!

 */













