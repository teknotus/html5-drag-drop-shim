var DragAndDrop = function(configObject){
  // set defaults
  this.config = {
    draggableAttribute: 'draggable',
    dropzoneAttribute: 'dropzone',
    eventPrefix: '',
    pointerEventsHack: false,
    cancelAnimation: true,
    cancelAnimationDuration: 0.4 // seconds
  };
  if(typeof configObject !== 'undefined'){
    for (var key in configObject) {
      if (configObject.hasOwnProperty(key)) {
        this.config[key] = configObject[key];
      }
    }
  }
  var pEffectAllowed,effectAllowedMask,pDropEffect,dataRead,dataWrite;
  var pTypes = [];
  var pData = {};
  var dragImage = {};
  var setDragEndElement = function(element){
    this.dragEndElement = element;
  }.bind(this);
  var copyStyle = function(original,copy){
    var originalStyle = window.getComputedStyle(original);
    var bodyStyle = window.getComputedStyle(document.body);
    var key;
    for(var l = originalStyle.length,i = 0; i < l ; i++){
      key = originalStyle[i];
      if(originalStyle[key] != bodyStyle[key] || key == 'outline'){
        // only copy styles not inherited from the body
        copy.style[key] = originalStyle[key];
      }
    }
    copy.style['pointer-events'] = 'none';
  };
  var cloneWithStyle = function(nodeOrig){
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
  var pAllowedOperation = function(value){
    var effect = 0;
    if(/^(copy|move|link|none)$/.test(value)){
      if( value === 'copy' ){
        effect = 1;
      } else if(value === 'move'){
        effect = 2;
      } else if(value === 'link'){
        effect = 4;
      }
      return effect & effectAllowedMask; //bitwise &
    } else {
      return false;
    }
  };
  this.allowedOperation = function(value){
    return pAllowedOperation(value);
  }
  this.resetDataTransfer = function(){
    pEffectAllowed = 'uninitialized';
    pEffectAllowedMask = 7;
    pDropEffect = 'none';
    this.dragEndElement = undefined;
    for (var key in dragImage) delete dragImage[key];
    pTypes.length = 0;
    for (var key in pData) delete pData[key];
    dataRead = dataWrite = true;
  }.bind(this);
  this.setDragImagePos = function(clientX,clientY){
    var cloneOrigWidth = dragImage.cloneOrigRect.width;
    var X = clientX - dragImage.x;
    var Y = clientY - dragImage.y;
    var clone = dragImage.clone;
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
  };
  this.getDragImage = function(){return dragImage};
  this.setDataRead = function(){dataRead = true;};
  this.setDataWrite = function(){dataWrite = true;};
  this.setDataReadWrite = function(){dataRead = dataWrite = true;};
  this.setDataProtected = function(){dataRead = dataWrite = false;};
  this.resetDataTransfer();
  this.dragging = false;
  this.nodes = [];
  this.dataTransfer;
  this.dragOverCanceled;
  this.validDropTarget;
  this.touchIdentifier;
  this.dragInit = false;
  this.newDataTransfer = function(){
    return new DataTransfer();
  };
  var DataTransfer = function(){}
  DataTransfer.prototype = {
    addElement: function(element){
      setDragEndElement(element);
    },
    clearData: function(type){
      if(dataWrite && (typeof(type) !== 'undefined')){
        pTypes.splice(pTypes.indexOf(type),1);
        delete pData[type];
      } else if(dataWrite) {
        pTypes.length = 0;
        for (var key in pData) delete pData[key];
      }
    },
    getData: function(type){
      if(dataRead){
        return pData[type.toLowerCase()];
      } else {
        return undefined;
      }
    },
    setData: function(type, value){
      if(dataWrite){
        type = type.toLowerCase(); // supposed to be only ascii lowercase
        pTypes.push(type);
        pData[type] = value;
      }
    },
    setDragImage: function(image,x,y){
      console.log('setting drag image');
      if(typeof dragImage.clone !== 'undefined'){
        document.removeChild(dragImage.clone);
      }
      var clone = cloneWithStyle(image);
      document.body.appendChild(clone);
      clone.style.position = "absolute";
      clone.style['z-index'] = 5000;
      clone.style.top = '0px';
      clone.style.left = '0px';
      clone.style.overflow = 'hidden';
      clone.style['pointer-events'] = 'none';
      dragImage = {
        image: image,
        clone: clone,
        cloneOrigRect: clone.getBoundingClientRect(),
        x: x,
        y: y
      };
    },
  };
  Object.defineProperty(DataTransfer.prototype, 'dropEffect',{
    set: function(value){
      if(pAllowedOperation(value)){
        pDropEffect = value;
      } else {
        pDropEffect = 'none';
      }
    },
    get: function(){return pDropEffect;},
    enumerable: true,
    configurable: false
  });
  Object.defineProperty(DataTransfer.prototype, 'effectAllowed',{
    set: function(value){
      if(/^(copy|move|link|copyLink|copyMove|linkMove|all|none)$/.test(value)){
        pEffectAllowed = value;
        if(value === 'none'){ //bitmask
          effectAllowedMask = 0;
        } else if(value === 'copy'){
          effectAllowedMask = 1;
        } else if(value === 'move'){
          effectAllowedMask = 2;
        } else if(value === 'link'){
          effectAllowedMask = 4;
        } else if(value === 'copyLink'){
          effectAllowedMask = 5;
        } else if(value === 'copyMove'){
          effectAllowedMask = 3;
        } else if(value === 'linkMove'){
          effectAllowedMask = 6;
        } else if(value === 'all'){
          effectAllowedMask = 7;
        }
      } else {
        pEffectAllowed = 'none';
      }
    },
    get: function(){return pEffectAllowed;},
    enumerable: true,
    configurable: false,
  });
  Object.defineProperty(DataTransfer.prototype, 'files',{
    get: function(){return [];},
    enumerable: true,
    configurable: false
  });
  Object.defineProperty(DataTransfer.prototype, 'types',{
    get: function(){return pTypes.slice(0);},
    enumerable: true,
    configurable: false
  });
  Object.freeze(DataTransfer);
};
DragAndDrop.prototype.createSvgDocument = function(){
  var docType = document.implementation.createDocumentType('svg',
    '-//W3C//DTD SVG 1.1//EN',
    'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd');
  var svgDoc = document.implementation.createDocument(
    'http://www.w3.org/2000/svg', 'svg', docType);
  return svgDoc;
}
DragAndDrop.prototype.createSvgDataUrl = function(node){
  var xSerializer = new XMLSerializer();
  var svgString = xSerializer.serializeToString(node);
  var svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
  var dataUrl = self.URL.createObjectURL(svgBlob);
  return dataUrl;
}
DragAndDrop.prototype.cloneWithStyle = function(nodeOrig){
  var copyStyle = function(original,copy){
    var originalStyle = window.getComputedStyle(original);
    var bodyStyle = window.getComputedStyle(document.body);
    var key;
    for(var l = originalStyle.length,i = 0; i < l ; i++){
      key = originalStyle[i];
      copy.style[key] = originalStyle[key];
    }
    copy.style['pointer-events'] = 'none';
  };
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
      if(currentNode.nodeName === 'CANVAS'){
        newNode.width = currentNode.width;
        newNode.height = currentNode.height;
        newNode.getContext('2d').drawImage(currentNode,0,0);
      }
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
};
DragAndDrop.prototype.createImageFromElement = function(el){
  var svgimg = DragAndDrop.prototype.createSvgDocument();
  var clone = DragAndDrop.prototype.cloneWithStyle(el);
  var foreignOb = svgimg.createElement("foreignObject");
  foreignOb.appendChild(clone);
  svgimg.documentElement.appendChild(foreignOb);
  var rect = el.getBoundingClientRect();
  svgimg.documentElement.width = rect.width;
  svgimg.documentElement.height = rect.height;
  svgimg.documentElement.viewBox = "0 0 " + rect.width + " " + rect.height;
  var svgurl = this.createSvgDataUrl(svgimg);
  var imgclone = document.createElement('img');
  imgclone.src = svgurl;
  imgclone.width = rect.width;
  imgclone.height = rect.height;
  return imgclone;
}
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
    }
  }
  return nodes.reverse();
};
DragAndDrop.prototype.findDraggableNodes = function(node){
  var draggable = this.config.draggableAttribute;
  var xSelector = './/ancestor-or-self::*[@' + draggable + '="true" or @'
    + draggable + '=""]';
  var dn = document.evaluate(xSelector,node, null, XPathResult.ANY_TYPE, null);
  var cn,draggable_nodes = [];
  while(cn = dn.iterateNext())
    draggable_nodes.push(cn);
  return draggable_nodes;
};
DragAndDrop.prototype.findDropzoneNode = function(node){
  var dropzone = this.config.dropzoneAttribute;
  var xSelector = './/ancestor-or-self::*[@' + dropzone + ']';
  var dz = document.evaluate(xSelector,node, null, XPathResult.ANY_TYPE, null);
  var dzNode;
  var types = this.dataTransfer.types;
  while(dzNode = dz.iterateNext()){
    var value = dzNode.getAttribute(dropzone);
    var parts = value.toLowerCase().split(/\s/);
    var operation = parts[0];
    if(this.allowedOperation(operation)){
      for(var l = parts.length, i = 1 ; i < l ; i++){
        var kindType = parts[i].split(':');
        var kind = kindType[0];
        var type = kindType[1];
        if(kind === 'string' && (types.indexOf(type) > -1)){
          this.dataTransfer.dropEffect = operation;
          return dzNode;
        } else if(kind === 'file'){
          console.log('dropzone file support unimplemented');
        }
      }
    }
  }
};
DragAndDrop.prototype.touchStartCallback = function(e){
  if(this.dragging){
    this.dropEffect = 'none';
    this.dragEnd();
  }
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
      this.touchIdentifier = e.touches[0].identifier;
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
    this.dragNode = dnodes[0];
    this.nodes = this.findElementNodes(target);
    this.dragInit = true;
  }
};
DragAndDrop.prototype.dragStart = function(){
    this.dragging = true;
    var dragNode = this.dragNode;
    var moveData = this.moveData;
    var dragStartEvent = document.createEvent("Event");
    dragStartEvent.initEvent(this.config.eventPrefix + "dragstart", true, true);
    var dataTransfer = this.newDataTransfer();
    dragStartEvent.dataTransfer = this.dataTransfer = dataTransfer;
    var dragStartCanceled = !dragNode.dispatchEvent(dragStartEvent);
    if(typeof this.getDragImage().clone === 'undefined'){
      var rect = dragNode.getBoundingClientRect();
      var offsetY = moveData.clientY - rect.top;
      var offsetX = moveData.clientX - rect.left;
      dataTransfer.setDragImage(dragNode,offsetX,offsetY);
    }
    if(typeof this.dragEndElement === 'undefined'){
      this.dragEndElement = dragNode;
    }
    this.setDragImagePos(this.clientX,this.clientY);
    this.setDataProtected();
  };
DragAndDrop.prototype.touchEndCallback = function(e){
  this.dragInit = false;
  console.log("mouseup or touchend");
  if(this.dragging){
    var dropElement = this.dropElement;
    if(dropElement !== null && this.validDropTarget){
      this.setDataRead();
      var dropEvent = document.createEvent("Event");
      dropEvent.initEvent(this.config.eventPrefix + "drop", true, true);
      dropEvent.dataTransfer = this.dataTransfer;
      dropEvent.clientX = this.moveData.clientX;
      dropEvent.clientY = this.moveData.clientY;
      dropEvent.screenX = this.moveData.screenX;
      dropEvent.screenY = this.moveData.screenY;
      dropElement.dispatchEvent(dropEvent);
    } else {
      console.log('invalid drop target');
      this.dataTransfer.dropEffect = 'none';
    }
    var oldNodes = this.nodes;
    for(var on = oldNodes.length -1 ; on >= 0 ; on--){
      var dragLeaveEvent = document.createEvent("Event");
      dragLeaveEvent.initEvent(this.config.eventPrefix + "dragleave",
        true, true);
      oldNodes[on].dispatchEvent(dragLeaveEvent);
    }
    this.dragEnd();
  }
}
DragAndDrop.prototype.dragEnd = function(){
  this.dragging = false;
  if(this.dataTransfer.dropEffect == 'none'){
    // Drop canceled
    if(this.config.cancelAnimation){
      this.cancelAnimation();
    } else {
      var clone = this.getDragImage().clone;
      clone.parentElement.removeChild(clone);
    }
  } else {
    document.body.removeChild(this.getDragImage().clone);
  }
  var dragEndEvent = document.createEvent("Event");
  dragEndEvent.initEvent(this.config.eventPrefix + "dragend", true, true);
  dragEndEvent.dataTransfer = this.dataTransfer;
  dragEndEvent.clientX = this.moveData.clientX;
  dragEndEvent.clientY = this.moveData.clientY;
  dragEndEvent.screenX = this.moveData.screenX;
  dragEndEvent.screenY = this.moveData.screenY;
  this.dragEndElement.dispatchEvent(dragEndEvent);
  //cleanup
  this.resetDataTransfer();
}
DragAndDrop.prototype.cancelAnimation = function(){
  // Animate dragImage back to starting point then remove it from DOM
  var clone = this.getDragImage().clone;
  var style = clone.style;
  var rect = this.dragNode.getBoundingClientRect();
  var transform = 'translate(' + rect.left + 'px,' + rect.top + 'px)';
  var duration = this.config.cancelAnimationDuration;
  var durationString = duration + 's';
  // failsafe in case transition is interupted
  var timeoutId = window.setTimeout(function(){
    console.log('transitionend callback failed');
    clone.parentElement.removeChild(clone);
  }, duration * 1000 + 25);
  style['transition-property'] = 'transform';
  style['transition-duration'] = durationString;
  style['transform'] = transform;
  style['-webkit-transform'] = transform;
  style['-webkit-transition-property'] = 'transform';
  style['-webkit-transition-duration'] = durationString;
  style['-moz-transition-property'] = 'transform';
  style['-moz-transition-duration'] = durationString;
  style['-moz-transform'] = transform;
  style['-ms-transform'] = transform;
  style['-ms-transition-property'] = 'transform';
  style['-ms-transition-duration'] = durationString;
  style['-o-transform'] = transform;
  style['-o-transition-property'] = 'transform';
  style['-o-transition-duration'] = durationString;
  var transitionEndCallback = function(e){
    var element = e.srcElement;
    if(clone === element){
      window.clearTimeout(timeoutId);
      element.parentElement.removeChild(element);
    }
  };
  clone.addEventListener('transitionend',
    transitionEndCallback, false);
  clone.addEventListener('webkitTransitionEnd',
    transitionEndCallback, false);
  clone.addEventListener('MSTransitionEnd',
    transitionEndCallback, false);
  clone.addEventListener('oTransitionEnd',
    transitionEndCallback, false);
  clone.addEventListener('otransitionend',
    transitionEndCallback, false);
}
DragAndDrop.prototype.touchMoveCallback = function(e){
  if(this.dragging || this.dragInit){
    //console.log('dragging');
    var moveData = {cancel: false};
    if(e.type == 'mousemove'){
      //console.log('mousemove');
      moveData.clientX = e.clientX;
      moveData.clientY = e.clientY;
      moveData.screenX = e.screenX;
      moveData.screenY = e.screenY;
    } else if(e.type == 'touchmove'){
      if(e.touches.length > 1){
        moveData.cancel = true;
      } else {
        //console.log('touchmove');
        if(this.touchIdentifier !== e.touches[0].identifier){
          moveData.cancel = true;
        }
        moveData.clientX = e.touches[0].clientX;
        moveData.clientY = e.touches[0].clientY;
        moveData.screenX = e.touches[0].screenX;
        moveData.screenY = e.touches[0].screenY;
      }
    }
    this.moveData = moveData;
  }
  if(this.dragInit){
    this.dragStart();
    this.dragInit = false;
  }
  if(this.dragging){
    if(moveData.cancel){
      this.dropEffect = 'none';
      this.dragEnd();
      return;
    }
    // hack for browsers where pointer-events: none
    // does not apply to elementFromPoint
    // hide drag image to locate element under it.
    // then reveal it before browser redraw
    // causes flickering on ipad, so off by default
    var clone = this.getDragImage().clone;
    if(this.config.pointerEventsHack){
      var display = clone.style.display;
      clone.style.display = 'none';
    }
    var element = document.elementFromPoint(moveData.clientX,moveData.clientY);
    if(this.config.pointerEventsHack){
      clone.style.display = display;
    }
    this.dropElement = element;
    if(element !== null){
      var dragOverEvent = document.createEvent("Event");
      dragOverEvent.initEvent(this.config.eventPrefix + "dragover", true, true);
      dragOverEvent.dataTransfer = this.dataTransfer;
      dragOverEvent.clientX = this.moveData.clientX;
      dragOverEvent.clientY = this.moveData.clientY;
      dragOverEvent.screenX = this.moveData.screenX;
      dragOverEvent.screenY = this.moveData.screenY;
      this.validDropTarget = this.dragOverCanceled =
        !element.dispatchEvent(dragOverEvent);
      if(!this.dragOverCanceled){
        var dropzone = this.findDropzoneNode(element);
        if(dropzone){
          this.dropElement = dropzone;
          this.validDropTarget = true;
        }
      }
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
    this.setDragImagePos(moveData.clientX,moveData.clientY);
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
  draggableAttribute: 'dragger',
  dropzoneAttribute: 'dropzone',
  pointerEventsHack: false,
};
var dnd = new DragAndDrop(dnd_config);
dnd.addListeners();
//   function dropzoneTest(e, element) { console.log('dropzone: '
//     + e.dataTransfer.getData('application/json'));}
//   function dragover(e){e.stopPropagation();e.preventDefault();e.dataTransfer.effectAllowed='none';return false;}
//setTimeout(function(){
//document.getElementById('dztest1').addEventListener('dragstart', dragover,true);
//document.getElementById('dztest2').addEventListener('drop', dropzoneTest, false);
//}, 10000);
