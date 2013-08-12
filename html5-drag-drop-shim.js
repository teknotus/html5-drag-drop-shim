console.log("adding drag drop event listeners");

function DataTransfer() {
  this.data = {};
};
DataTransfer.prototype.setData = function(type, value){
  this.data[type] = value;
  console.log('value of type: ' + type + ' set');
};
DataTransfer.prototype.getData = function(type){
  return this.data[type];
};

var drag_and_drop = {
  dragging: false,
  nodes: [],
  dataTransfer: new DataTransfer()
};
findElementNodes = function(node){
  var body = document.body;
  var nodes = [];
  while(node != document) {
    nodes.push(node);
    try {
      node = node.parentNode;
    } catch (e) {
      console.log('error type: ' + e.name);
      node = document;
    }// finally {
//      node = body;
  //  }
  }
  return nodes.reverse();
};
findDraggableNodes = function(node){
  var draggable = 'dragger';
  var body = document.body;
  var draggable_nodes = [];
  while(node != body) {
    if(node.hasAttribute(draggable)){
      var draggable_value = node.attributes[draggable].value;
      if(draggable_value == true
        || draggable_value == 'true'
        || draggable_value == ""){
          draggable_nodes.push(node);
      }
    }
    node = node.parentNode;
    }
    return draggable_nodes;
};
copyStyle = function(original,copy){
  var originalStyle = window.getComputedStyle(original);
  var bodyStyle = window.getComputedStyle(document.body);
  var key;
  for(var l = originalStyle.length,i = 0; i < l ; i++){
    key = originalStyle[i];
    if(originalStyle[key] != bodyStyle[key] || key == 'outline'){
      // only copy styles not inherited from the body
      copy.style[key] = originalStyle[key];
    }
  };
}
cloneWithStyle = function(nodeOrig){
  var copyRoot = document.createElement('div');
  var treeWalker = document.createTreeWalker(
    nodeOrig, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
  var node = treeWalker;
  var currentNode,newNode;
  var copyNode = copyRoot;
  var appendType = 'child';
  var explode = 5000;
  while(explode > 0){
    explode--;
    currentNode = treeWalker.currentNode;
    if(currentNode.nodeType == 1){
      newNode = document.createElement(currentNode.nodeName);
      copyStyle(currentNode,newNode);
    }else if(currentNode.nodeType == 3){
      newNode = document.createTextNode(currentNode.nodeValue);
    }
    if(appendType === 'child'){
      copyNode.appendChild(newNode);
    } else if(appendType === 'sibling'){
      copyNode.parentNode.appendChild(newNode);
    }
    copyNode = newNode;
    if(node.firstChild()){
      appendType = 'child';
    } else {
      while(!node.nextSibling()){
        if(node.currentNode == node.root){
          return copyRoot;
        }
        node.parentNode();
        copyNode = copyNode.parentNode;
      }
      appendType = 'sibling';
    }
  }
}
touchStartCallback = function(e){
  var target,clientX,clientY;
  if(e.type == 'mousedown'){
    console.log("mousedown");
    target = e.target;
    clientX = e.clientX;
    clientY = e.clientY;
  } else if(e.type == 'touchstart'){
    if(e.touches.length > 1){
      return;
    } else {
      target = e.touches[0].target;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
  }
  var dnodes = findDraggableNodes(target);
  var dcount = dnodes.length;
//  console.log('draggable_nodes count: ' + dcount);
  if(dcount){
    e.preventDefault();
    drag_and_drop.dragging = true;
    drag_and_drop.dragNode = dnodes[0];
    drag_and_drop.nodes = findElementNodes(target);
    var dcopy = cloneWithStyle(dnodes[0]);
    var rect = dnodes[0].getBoundingClientRect();
    var offsetY = clientY - rect.top;
    var offsetX = clientX - rect.left;
    drag_and_drop['rect'] = rect;
    drag_and_drop['offset'] = { X: offsetX, Y: offsetY };
    document.body.appendChild(dcopy);
    dcopy.style.position = "absolute";
    dcopy.style['z-index'] = 5000;
    dcopy.style.top = '0px';
    dcopy.style.left = '0px';
    dcopy.style.overflow = 'hidden';
    var X = clientX - offsetX;
    var Y = clientY - offsetY;
    dcopy.style['-webkit-transform'] = 'translate(' + X + 'px, ' + Y + 'px)';
    dcopy.style['pointer-events'] = 'none';
    drag_and_drop.dcopy = dcopy;
    var copyOrigRect = dcopy.getBoundingClientRect();
    drag_and_drop['copyOrigRect'] = copyOrigRect;

    var dragStartEvent = document.createEvent("Event");
    dragStartEvent.initEvent("dragstart", true, true);
    dragStartEvent.dataTransfer = drag_and_drop.dataTransfer;
    var dragStartCanceled = !dnodes[0].dispatchEvent(dragStartEvent);
  }
}
touchEndCallback = function(e){
  console.log("mouseup");
  drag_and_drop.dragging = false;
  document.body.removeChild(drag_and_drop.dcopy);
  var dragEndEvent = document.createEvent("Event");
  dragEndEvent.initEvent("dragend", true, true);
  dragEndEvent.screenX = drag_and_drop.moveData.screenX;
  dragEndEvent.screenY = drag_and_drop.moveData.screenY;
  drag_and_drop.dragNode.dispatchEvent(dragEndEvent);
}
touchMoveCallback = function(e){
  if(drag_and_drop.dragging){
    console.log('dragging');
    var moveData = {}
    if(e.type == 'mousemove'){
      //console.log('mousemove');
      moveData.clientX = e.clientX;
      moveData.clientY = e.clientY;
      moveData.screenX = e.screenX;
      moveData.screenY = e.screenY;
    } else if(e.type == 'touchmove'){
      if(e.touches.length > 1){
        return;
      } else {
        //console.log('touchmove');
        moveData.clientX = e.touches[0].clientX;
        moveData.clientY = e.touches[0].clientY;
        moveData.screenX = e.touches[0].screenX;
        moveData.screenY = e.touches[0].screenY;
      }
    }
    drag_and_drop.moveData = moveData;
    var element = document.elementFromPoint(moveData.clientX,moveData.clientY);
    if(element !== null){
      var dragOverEvent = document.createEvent("Event");
      dragOverEvent.initEvent("dragover", true, true);
      dragOverEvent.dataTransfer = {};
      var dragOverCanceled = !element.dispatchEvent(dragOverEvent);
    }
    var oldNodes = drag_and_drop.nodes;
    var newNodes;
    if(element === null){
      newNodes = [];
    } else {
      newNodes = findElementNodes(element);
    }
    var elCount = (oldNodes.length < newNodes.length) ?
      oldNodes.length : newNodes.length;
    var i = 0;
    for( ; i < elCount && oldNodes[i] === newNodes[i] ; i++){}
    for(var on = oldNodes.length -1 ; on >= i ; on--){
      var dragLeaveEvent = document.createEvent("Event");
      dragLeaveEvent.initEvent("dragleave", true, true);
      oldNodes[on].dispatchEvent(dragLeaveEvent);
    }
    for(var nn = newNodes.length ; i < nn ; i++){
      var dragEnterEvent = document.createEvent("Event");
      dragEnterEvent.initEvent("dragenter", true, true);
      newNodes[i].dispatchEvent(dragEnterEvent);
    }
    drag_and_drop.nodes = newNodes;
    var dcopy = drag_and_drop.dcopy;
    var offset = drag_and_drop.offset;
    var copyOrigWidth = drag_and_drop.copyOrigRect.width;
    var X = moveData.clientX - offset.X;
    var Y = moveData.clientY - offset.Y;
    // if dragged item extends to right of screen trim it to fit
    var overflow = (X + copyOrigWidth) - window.innerWidth;
    if(overflow > 0){
      dcopy.style.width = (copyOrigWidth - overflow) + 'px';
    } else {
      dcopy.style.width = copyOrigWidth + 'px';
    }
    dcopy.style['-webkit-transform'] = 'translate(' + X + 'px, ' + Y + 'px)';
  }
}
document.addEventListener('mousedown', touchStartCallback, true);
document.addEventListener('touchstart', touchStartCallback, true);
document.addEventListener('mouseup', touchEndCallback, true);
document.addEventListener('touchend', touchEndCallback, true);
document.addEventListener('mousemove', touchMoveCallback, true);
document.addEventListener('touchmove', touchMoveCallback, true);

