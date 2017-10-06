var Screen = function(dom_el_id, resolution, color_depth, pixelSize) {
	this.width = resolution[0];
	this.height = resolution[1];
	this.pixelSize = pixelSize;
	this.dom_el_id = dom_el_id;
	this.color_depth = color_depth;
	
	this.pixels = new Array();

	this.backColor = "#ccc";
	this.frontColor = "#404040";

	var thisScreen = this;

	this.init = function() {

		document.getElementById(this.dom_el_id).innerHTML = "";

		thisScreen._oPixelCtr = document.createElement("div");
		thisScreen._oPixelCtr.style.position = "absolute";
		thisScreen._oPixelCtr.style.width = thisScreen.width * thisScreen.pixelSize;
		thisScreen._oPixelCtr.style.height = thisScreen.height * thisScreen.pixelSize;
		thisScreen._oPixelCtr.style.left = 0;
		thisScreen._oPixelCtr.style.top = 0;

		document.getElementById(this.dom_el_id).appendChild(this._oPixelCtr);

		thisScreen.pixels = new Array();
		for (var x=0;x<thisScreen.width;x++) {
			thisScreen.pixels[x] = new Array();
			var col = thisScreen.pixels[x];
			var l = x * thisScreen.pixelSize;
			for (var y=0;y<thisScreen.height;y++) {
				var p = document.createElement("span")
				col[y] = p;
				var s = p.style;
				s.position = "absolute";
				s.overflow = "hidden";
				s.color = thisScreen.backColor;
				s.backgroundColor = thisScreen.backColor;
				s.left = l;
				s.top = y * thisScreen.pixelSize;
				s.width = thisScreen.pixelSize;
				s.height = thisScreen.pixelSize;
				s.fontFamily = "terminal";
				//s.fontWeight = "bold";
				s.fontSize = "8px";
				p.innerHTML = "0";
				p.onselectstart = function(){return false;}
				thisScreen._oPixelCtr.appendChild(p);
			}
		}
	}

	this.clear = function() {
		for (var x=0;x<thisScreen.pixels.length;x++) {
			var col = thisScreen.pixels[x];
			for (var y=0;y<col.length;y++) {
				var c = col[y];
				c.innerHTML = '0';
				c.style.color = thisScreen.backColor;
				c.style.backgroundColor = thisScreen.backColor;
			}
		}
	}

	this.xorPixel = function(x, y) {
		var px = x;
		var py = y;

		var p = thisScreen.getPixel(px,py);

		if (p) {
			if (p.innerHTML == '0') {
				p.style.color = thisScreen.frontColor;
				p.style.backgroundColor = thisScreen.frontColor;
				p.innerHTML = '1';
				return 1;
			} else {
				p.style.color = thisScreen.backColor;
				p.style.backgroundColor = thisScreen.backColor;
				p.innerHTML = '0';
			}
		}
	}

	this.getPixel = function(x, y) {
		while (x > thisScreen.width-1) x -= thisScreen.width;
		while (x < 0) x += thisScreen.width;

		while (y > thisScreen.height-1) y -= thisScreen.height;
		while (y < 0) y += thisScreen.height;

		if (!thisScreen.pixels[x]) {
			console.log("ERR: Tried to get invalid pixel x:" + x + " y:" + y + "\r\n");
			return;
		}

		if (!thisScreen.pixels[x][y]) {
			console.log("ERR: Tried to get invalid pixel x:" + x + " y:" + y + "\r\n");
			return;
		}

		var p = thisScreen.pixels[x][y];
		return p;
	}
};