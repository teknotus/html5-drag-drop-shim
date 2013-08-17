var DragAndDrop = function(configObject){
  // set defaults
  this.config = {
    dragAttribute: 'draggable',
    eventPrefix: '',
    pointerEventsHack: false
  };
  if(typeof configObject !== 'undefined'){
  for (var key in configObject) {
    if (configObject.hasOwnProperty(key)) {
      this.config[key] = configObject[key];
    }
  }
  }
  this.dragging = false;
  this.nodes = [];
  this.dataTransfer;
};
DragAndDrop.prototype.DataTransfer = function(){
    this.types = [];
    this.data = {};
    this.element;
    this.dragImage = {};
    this.dropEffect = 'none';
    this.effectAllowed = 'uninitialized';
    this.effectAllowedMask = 7;
  };
DragAndDrop.prototype.DataTransfer.prototype = {
  setData: function(type, value){
    this.types.push(type);
    this.data[type] = value;
  },
  getData: function(type){
    return this.data[type];
  },
  clearData: function(){
    this.types.length = 0;
    for (var key in this.data) delete this.data[key];
  },
  addElement: function(element){
    this.element = element;
  },
  setDragImage: function(image,x,y){
    console.log('setting drag image');
    if(typeof this.dragImage.clone !== 'undefined'){
      document.removeChild(this.dragImage.clone);
    }
    var clone = this.cloneWithStyle(image);
    document.body.appendChild(clone);
    clone.style.position = "absolute";
    clone.style['z-index'] = 5000;
    clone.style.top = '0px';
    clone.style.left = '0px';
    clone.style.overflow = 'hidden';
    clone.style['pointer-events'] = 'none';
    this.dragImage = {
      image: image,
      clone: clone,
      cloneOrigRect: clone.getBoundingClientRect(),
      x: x,
      y: y
    };
  },
  setDragImagePos: function(clientX,clientY){
    var cloneOrigWidth = this.dragImage.cloneOrigRect.width;
    var X = clientX - this.dragImage.x;
    var Y = clientY - this.dragImage.y;
    var clone = this.dragImage.clone;
    // if dragged item extends to right of screen trim it to fit
    var overflow = (X + cloneOrigWidth) - window.innerWidth;
    if(overflow > 0){
      clone.style.width = (cloneOrigWidth - overflow) + 'px';
    } else {
      clone.style.width = cloneOrigWidth + 'px';
    }
    var transform = 'translate(' + X + 'px, ' + Y + 'px)';
    clone.style['-webkit-transform'] = transform;
    clone.style['-moz-transform'] = transform;
    clone.style['-ie-transform'] = transform;
    clone.style['-o-transform'] = transform;
    clone.style['transform'] = transform;
  },
  set effectAllowed(value){
    if(/copy|move|link|copyLink|copyMove|linkMove|all|none/.test(value)){
      this._effectAllowed = value;
      if(value === 'none'){ //bitmask
        this.effectAllowedMask = 0;
      } else if(value === 'copy'){
        this.effectAllowedMask = 1;
      } else if(value === 'move'){
        this.effectAllowedMask = 2;
      } else if(value === 'link'){
        this.effectAllowedMask = 4;
      } else if(value === 'copyLink'){
        this.effectAllowedMask = 5;
      } else if(value === 'copyMove'){
        this.effectAllowedMask = 3;
      } else if(value === 'linkMove'){
        this.effectAllowedMask = 6;
      } else if(value === 'all'){
        this.effectAllowedMask = 7;
      }
    } else {
      this._effectAllowed = 'none';
    }
  },
  set dropEffect(value){
    var effect;
    if(/copy|move|link|none/.test(value)){
      if(value === 'none'){
        this._dropEffect = 'none';
      } else if( value === 'copy' ){
        effect = 1;
      } else if(value === 'move'){
        effect = 2;
      } else if(value === 'link'){
        effect = 4;
      }
      if(effect & this.effectAllowedMask){ //bitwise &
        this._dropEffect = value;
      } else {
        this._dropEffect = 'none';
      }
    } else {
      this._dropEffect = 'none';
    }
  },
  copyStyle: function(original,copy){
    var originalStyle = window.getComputedStyle(original);
    var bodyStyle = window.getComputedStyle(document.body);
    var key;
    for(var l = originalStyle.length,i = 0; i < l ; i++){
      key = originalStyle[i];
      if(originalStyle[key] != bodyStyle[key] || key == 'outline'){
        // only copy styles not inherited from the body
        copy.style[key] = originalStyle[key];
        copy.style['pointer-events'] = 'none';
      }
    };
  },
  cloneWithStyle: function(nodeOrig){
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
        if(currentNode.nodeName === 'IMG'){
          newNode.src = currentNode.src;
        } else if(currentNode.nodeName === 'CANVAS'){
          newNode.width = currentNode.width;
          newNode.height = currentNode.height;
          newNode.getContext('2d').drawImage(currentNode,0,0);
        }
        this.copyStyle(currentNode,newNode);
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
};
DragAndDrop.prototype.findElementNodes = function(node){
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
DragAndDrop.prototype.findDraggableNodes = function(node){
  // could do this with xpath
  // './/ancestor-or-self::*[@draggable="true"]'
  var draggable = this.config.dragAttribute;
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
DragAndDrop.prototype.touchStartCallback = function(e){
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
  var dnodes = this.findDraggableNodes(target);
  var dcount = dnodes.length;
//  console.log('draggable_nodes count: ' + dcount);
  if(dcount){
    e.preventDefault();
    this.dragging = true;
    var dragNode = dnodes[0];
    this.dragNode = dragNode;
    this.nodes = this.findElementNodes(target);

    var dragStartEvent = document.createEvent("Event");
    dragStartEvent.initEvent(this.config.eventPrefix + "dragstart", true, true);
    var dataTransfer = new this.DataTransfer();
    dragStartEvent.dataTransfer = this.dataTransfer = dataTransfer;
    var dragStartCanceled = !dragNode.dispatchEvent(dragStartEvent);
    if(typeof dataTransfer.dragImage.clone === 'undefined'){
      var rect = dragNode.getBoundingClientRect();
      var offsetY = clientY - rect.top;
      var offsetX = clientX - rect.left;
      dataTransfer.setDragImage(dnodes[0],offsetX,offsetY);
    }
    if(typeof dataTransfer.element === 'undefined'){
      dataTransfer.element = dragNode;
    }
    dataTransfer.setDragImagePos(clientX,clientY);
  }
}
DragAndDrop.prototype.touchEndCallback = function(e){
  console.log("mouseup or touchend");
  this.dragging = false;
  document.body.removeChild(this.dataTransfer.dragImage.clone);
  var dropElement = this.dropElement;
  if(dropElement !== null){
    var dropEvent = document.createEvent("Event");
    dropEvent.initEvent(this.config.eventPrefix + "drop", true, true);
    dropEvent.dataTransfer = this.dataTransfer;
    dropEvent.clientX = this.moveData.clientX;
    dropEvent.clientY = this.moveData.clientY;
    dropElement.dispatchEvent(dropEvent);
  } else {
    console.log('invalid drop target');
  }
  var oldNodes = this.nodes;
  for(var on = oldNodes.length -1 ; on >= 0 ; on--){
    var dragLeaveEvent = document.createEvent("Event");
    dragLeaveEvent.initEvent(s.config.eventPrefix + "dragleave", true, true);
    oldNodes[on].dispatchEvent(dragLeaveEvent);
  }
  var dragEndEvent = document.createEvent("Event");
  dragEndEvent.initEvent(this.config.eventPrefix + "dragend", true, true);
  dragEndEvent.screenX = this.moveData.screenX;
  dragEndEvent.screenY = this.moveData.screenY;
  this.dataTransfer.element.dispatchEvent(dragEndEvent);
}
DragAndDrop.prototype.touchMoveCallback = function(e){
  if(this.dragging){
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
    this.moveData = moveData;
    // hack for browsers where pointer-events: none
    // does not apply to elementFromPoint
    // hide drag image to locate element under it.
    // then reveal it before browser redraw
    // causes flickering on ipad, so off by default
    if(this.config.pointerEventsHack){
      var display = this.dataTransfer.dragImage.clone.style.display;
      this.dataTransfer.dragImage.clone.style.display = 'none';
    }
    var element = document.elementFromPoint(moveData.clientX,moveData.clientY);
    if(this.config.pointerEventsHack){
      this.dataTransfer.dragImage.clone.style.display = display;
    }
    this.dropElement = element;
    if(element !== null){
      var dragOverEvent = document.createEvent("Event");
      dragOverEvent.initEvent(this.config.eventPrefix + "dragover", true, true);
      dragOverEvent.dataTransfer = this.dataTransfer;
      var dragOverCanceled = !element.dispatchEvent(dragOverEvent);
    }
    var oldNodes = this.nodes;
    var newNodes;
    if(element === null){
      newNodes = [];
    } else {
      newNodes = this.findElementNodes(element);
    }
    var elCount = (oldNodes.length < newNodes.length) ?
      oldNodes.length : newNodes.length;
    var i = 0;
    for( ; i < elCount && oldNodes[i] === newNodes[i] ; i++){}
    for(var on = oldNodes.length -1 ; on >= i ; on--){
      var dragLeaveEvent = document.createEvent("Event");
      dragLeaveEvent.initEvent(this.config.eventPrefix + "dragleave",
        true, true);
      oldNodes[on].dispatchEvent(dragLeaveEvent);
    }
    for(var nn = newNodes.length ; i < nn ; i++){
      var dragEnterEvent = document.createEvent("Event");
      dragEnterEvent.initEvent(this.config.eventPrefix + "dragenter",
        true, true);
      newNodes[i].dispatchEvent(dragEnterEvent);
    }
    this.nodes = newNodes;
    this.dataTransfer.setDragImagePos(moveData.clientX,moveData.clientY);
  }
}
DragAndDrop.prototype.addTouchListeners = function(){
  document.addEventListener('touchstart',
    this.touchStartCallback.bind(this), true);
  document.addEventListener('touchend',
    this.touchEndCallback.bind(this), true);
  document.addEventListener('touchmove',
    this.touchMoveCallback.bind(this), true);
}
DragAndDrop.prototype.addMouseListeners = function(){
  document.addEventListener('mousedown',
    this.touchStartCallback.bind(this), true);
  document.addEventListener('mouseup',
    this.touchEndCallback.bind(this), true);
  document.addEventListener('mousemove',
    this.touchMoveCallback.bind(this), true);
}
DragAndDrop.prototype.addListeners = function(){
  this.addTouchListeners();
  this.addMouseListeners();
}

console.log("adding drag drop event listeners");
var dnd_config = {
  dragAttribute: 'dragger',
  pointerEventsHack: false,
};
var dnd = new DragAndDrop(dnd_config);
dnd.addListeners();
